/**
 * Dodge PWA — Uconnect Proxy Worker
 *
 * Handles the full Stellantis/Uconnect authentication chain and proxies
 * vehicle data + command requests from the PWA. Keeps your credentials
 * secure (they live as Cloudflare secrets, never in code) and solves the
 * CORS problem that prevents a browser from calling Stellantis directly.
 *
 * Endpoints exposed to the PWA:
 *   GET  /                           → health check
 *   GET  /vehicles                   → list your vehicles
 *   GET  /vehicles/:vin/status       → full vehicle status (info + doors/windows + location)
 *   GET  /vehicles/:vin/location     → last known location only
 *   POST /vehicles/:vin/command      → send a command  { "command": "RDL" }
 *
 * Required Cloudflare secrets (set in Worker Settings → Variables and Secrets):
 *   UCONNECT_EMAIL    your Mopar/Dodge account email
 *   UCONNECT_PASSWORD your Mopar/Dodge account password
 *   UCONNECT_PIN      your 4-digit Uconnect remote command PIN
 *   APP_PASSWORD      password users enter in the PWA login screen
 *
 * Required KV binding (set in Worker Settings → Bindings):
 *   UCONNECT_CACHE    the KV namespace named UCONNECT_CACHE
 */

// ─── Dodge US Brand Configuration ────────────────────────────────────────────
// These values come from reverse-engineering the official Dodge mobile app.
// They are public app-level constants, not your personal credentials.

const BRAND = {
  loginApiKey:  '4_dSRvo6ZIpp8_St7BF9VHGA',
  loginUrl:     'https://login-us.dodge.com',
  tokenUrl:     'https://authz.sdpr-02.fcagcv.com/v2/cognito/identity/token',
  apiUrl:       'https://channels.sdpr-02.fcagcv.com',
  apiKey:       'OgNqp2eAv84oZvMrXPIzP8mR8a6d9bVm1aaH9LqU',
  authUrl:      'https://mfa.fcl-02.fcagcv.com',
  authToken:    'fNQO6NjR1N6W0E5A6sTzR3YY4JGbuPv48Nj9aZci',
  region:       'us-east-1',
  locale:       'en_us',
  brandCode:    'ALL',
};

// ─── Command Map ──────────────────────────────────────────────────────────────
// Maps command names (what the PWA sends) to the URL path and API version
// Stellantis expects. Sourced from hass-uconnect/py-uconnect command.py.

const COMMANDS = {
  RDL:           { name: 'RDL',           url: 'remote',       version: 'v1' }, // Lock doors
  RDU:           { name: 'RDU',           url: 'remote',       version: 'v1' }, // Unlock doors
  HBLF:          { name: 'HBLF',          url: 'remote',       version: 'v1' }, // Horn & lights flash
  ROLIGHTS:      { name: 'ROLIGHTS',      url: 'remote',       version: 'v1' }, // Lights only
  ROPRECOND:     { name: 'ROPRECOND',     url: 'remote',       version: 'v1' }, // Pre-condition on
  ROPRECOND_OFF: { name: 'ROPRECOND_OFF', url: 'remote',       version: 'v1' }, // Pre-condition off
  REON:          { name: 'REON',          url: 'remote',       version: 'v1' }, // Remote engine on
  REOFF:         { name: 'REOFF',         url: 'remote',       version: 'v1' }, // Remote engine off
  ROCOMFORTON:   { name: 'ROCOMFORTON',   url: 'remote',       version: 'v2' }, // Comfort on
  ROCOMFORTOFF:  { name: 'ROCOMFORTOFF',  url: 'remote',       version: 'v2' }, // Comfort off
  ROHVACON:      { name: 'ROHVACON',      url: 'remote',       version: 'v2' }, // HVAC on
  ROHVACOFF:     { name: 'ROHVACOFF',     url: 'remote',       version: 'v2' }, // HVAC off
  ROTRUNKUNLOCK: { name: 'ROTRUNKUNLOCK', url: 'remote',       version: 'v2' }, // Trunk unlock
  ROTRUNKLOCK:   { name: 'ROTRUNKLOCK',   url: 'remote',       version: 'v2' }, // Trunk lock
  DEEPREFRESH:   { name: 'DEEPREFRESH',   url: 'ev',           version: 'v1' }, // Force status refresh
  DEEPREFRESH2:  { name: 'DEEPREFRESH2',  url: 'ev',           version: 'v2' }, // Force status refresh v2
  CNOW:          { name: 'CNOW',          url: 'ev/chargenow', version: 'v1' }, // Charge now (EV)
  VF:            { name: 'VF',            url: 'location',     version: 'v1' }, // Vehicle finder / refresh location
};

// ─── AWS SigV4 Request Signing ────────────────────────────────────────────────
// Stellantis's API sits behind AWS API Gateway and requires every request to be
// signed with AWS Signature Version 4 using temporary AWS credentials.
// We implement this from scratch using the Web Crypto API (no npm packages needed).

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(str) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)));
}

async function hmac(keyData, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    typeof keyData === 'string' ? new TextEncoder().encode(keyData) : keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

async function buildSigningKey(secretKey, dateStamp) {
  const kDate    = await hmac('AWS4' + secretKey, dateStamp);
  const kRegion  = await hmac(kDate,    BRAND.region);
  const kService = await hmac(kRegion,  'execute-api');
  return            hmac(kService, 'aws4_request');
}

/**
 * Makes an HTTP request to the Stellantis API, signed with AWS SigV4.
 * @param {string} url          Full URL to call
 * @param {string} method       HTTP method
 * @param {object|null} body    JSON body (or null for GET)
 * @param {object} extraHeaders Additional headers (x-api-key, locale, etc.)
 * @param {object} creds        { accessKeyId, secretKey, sessionToken }
 */
async function signedFetch(url, method, body, extraHeaders, creds) {
  const { accessKeyId, secretKey, sessionToken } = creds;

  // Timestamp strings required by SigV4
  const now = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const urlObj  = new URL(url);
  const bodyStr = body ? JSON.stringify(body) : '';

  // All headers that will be included in the signature (must be lowercase keys)
  const headers = {
    'content-type':         'application/json',
    'host':                  urlObj.host,
    'x-amz-date':            amzDate,
    'x-amz-security-token':  sessionToken,
    ...Object.fromEntries(
      Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])
    ),
  };

  // SigV4 requires headers sorted alphabetically
  const sortedKeys       = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders    = sortedKeys.join(';');

  // Canonical query string (params sorted, URI-encoded)
  const canonicalQS = [...urlObj.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const payloadHash = await sha256(bodyStr);
  const canonicalReq = [
    method,
    urlObj.pathname || '/',
    canonicalQS,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credScope  = `${dateStamp}/${BRAND.region}/execute-api/aws4_request`;
  const strToSign  = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${await sha256(canonicalReq)}`;
  const sigKey     = await buildSigningKey(secretKey, dateStamp);
  const signature  = toHex(await hmac(sigKey, strToSign));
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Build final request headers — drop 'host' (fetch sets it automatically from the URL)
  const reqHeaders = { ...headers, 'authorization': authHeader };
  delete reqHeaders['host'];

  return fetch(url, {
    method,
    headers: reqHeaders,
    body: bodyStr || undefined,
  });
}

// ─── Authentication Flow ──────────────────────────────────────────────────────
// The full 5-step chain: Gigya login → JWT → Stellantis token → AWS Cognito → AWS creds
// Results are cached in KV for ~1 hour so we don't re-auth on every request.

function gigyaParams(extra) {
  // Common parameters required by every Gigya API call
  return new URLSearchParams({
    targetEnv:  'jssdk',
    loginMode:  'standard',
    sdk:        'js_latest',
    authMode:   'cookie',
    sdkBuild:   '12234',
    format:     'json',
    APIKey:      BRAND.loginApiKey,
    ...extra,
  });
}

function clientHeaders(apiKey) {
  // Headers Stellantis expects on every API call (mimics their mobile app)
  return {
    'x-clientapp-name':    'CWP',
    'x-clientapp-version': '1.0',
    'clientrequestid':      crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16),
    'x-api-key':            apiKey,
    'locale':               BRAND.locale,
    'x-originator-type':   'web',
  };
}

// Mimic the Chrome User-Agent the official Dodge app uses — Gigya rejects non-browser UAs
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fullLogin(email, password) {
  // Step 1: Bootstrap Gigya SDK — also captures session cookies we must forward
  const bootResp = await fetch(
    `${BRAND.loginUrl}/accounts.webSdkBootstrap?apiKey=${BRAND.loginApiKey}`,
    { headers: { 'User-Agent': BROWSER_UA } }
  );
  const boot = await bootResp.json();
  if (boot.statusCode !== 200) throw new Error(`Gigya bootstrap failed: ${boot.errorMessage}`);

  // Carry cookies from the bootstrap response into subsequent Gigya calls,
  // exactly like the Python requests.Session() does automatically
  const rawCookies = bootResp.headers.getSetCookie?.() ?? [];
  const cookieStr  = rawCookies.map(c => c.split(';')[0]).join('; ');
  const gigyaHeaders = {
    'User-Agent': BROWSER_UA,
    ...(cookieStr ? { 'Cookie': cookieStr } : {}),
  };

  // Step 2: Login with credentials → get UID + session token
  // Gigya expects params in the URL query string on POST (not form-encoded body)
  const loginParams = gigyaParams({
    loginID:           email,
    password,
    sessionExpiration: '300',
    include:           'profile,data,emails,subscriptions,preferences',
  });
  const loginResp = await fetch(`${BRAND.loginUrl}/accounts.login?${loginParams}`, {
    method: 'POST',
    headers: gigyaHeaders,
  });
  const loginData = await loginResp.json();
  if (loginData.statusCode !== 200) {
    throw new Error(`Gigya login failed [${loginData.errorCode}]: ${loginData.errorMessage} — ${loginData.errorDetails ?? ''}`);
  }

  const uid        = loginData.UID;
  const loginToken = loginData.sessionInfo.login_token;

  // Step 3: Exchange session token for a signed JWT
  const jwtParams = gigyaParams({
    login_token: loginToken,
    fields:      'profile.firstName,profile.lastName,profile.email,country,locale,data.disclaimerCodeGSDP',
  });
  const jwtResp = await fetch(`${BRAND.loginUrl}/accounts.getJWT?${jwtParams}`, {
    method:  'POST',
    headers: gigyaHeaders,
  });
  const jwtData = await jwtResp.json();
  if (jwtData.statusCode !== 200) throw new Error(`Gigya JWT failed: ${jwtData.errorMessage}`);

  // Step 4: Exchange Gigya JWT for a Stellantis/AWS Cognito token
  const tokenResp = await fetch(BRAND.tokenUrl, {
    method:  'POST',
    headers: { ...clientHeaders(BRAND.apiKey), 'content-type': 'application/json' },
    body:     JSON.stringify({ gigya_token: jwtData.id_token }),
  });
  const tokenData = await tokenResp.json();
  if (!tokenData.Token || !tokenData.IdentityId) {
    throw new Error(`Stellantis token exchange failed: ${JSON.stringify(tokenData)}`);
  }

  // Step 5: Trade the Cognito identity token for temporary AWS credentials
  const awsResp = await fetch('https://cognito-identity.us-east-1.amazonaws.com/', {
    method:  'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityService.GetCredentialsForIdentity',
    },
    body: JSON.stringify({
      IdentityId: tokenData.IdentityId,
      Logins:     { 'cognito-identity.amazonaws.com': tokenData.Token },
    }),
  });
  const awsData = await awsResp.json();
  if (!awsData.Credentials) {
    throw new Error(`AWS credentials failed: ${JSON.stringify(awsData)}`);
  }

  return {
    uid,
    accessKeyId:  awsData.Credentials.AccessKeyId,
    secretKey:    awsData.Credentials.SecretKey,
    sessionToken: awsData.Credentials.SessionToken,
    expiration:   awsData.Credentials.Expiration, // ISO string, typically ~1 hour from now
  };
}

async function getSession(env) {
  // Use cached credentials if they're still valid for at least 5 more minutes
  const cached = await env.UCONNECT_CACHE.get('session', { type: 'json' });
  if (cached) {
    const expiresAt = new Date(cached.expiration).getTime();
    if (expiresAt > Date.now() + 5 * 60 * 1000) return cached;
  }

  // Full re-auth and cache the result
  const session = await fullLogin(env.UCONNECT_EMAIL, env.UCONNECT_PASSWORD);
  // Cache for 58 minutes (AWS creds last ~1 hour; we leave 2 min buffer)
  await env.UCONNECT_CACHE.put('session', JSON.stringify(session), { expirationTtl: 3480 });
  return session;
}

async function getPinToken(uid, creds, pin) {
  // Commands (lock, unlock, start, etc.) require a separate PIN authentication token
  const resp = await signedFetch(
    `${BRAND.authUrl}/v1/accounts/${uid}/ignite/pin/authenticate`,
    'POST',
    { pin: btoa(pin) }, // PIN is base64-encoded per Stellantis spec
    clientHeaders(BRAND.authToken),
    creds
  );
  const data = await resp.json();
  if (!data.token) throw new Error(`PIN authentication failed: ${JSON.stringify(data)}`);
  return data.token;
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
    'Access-Control-Max-Age':       '86400',
  };
}

function jsonResp(data, status, origin) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

// ─── Main Request Handler ─────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    // Handle CORS preflight requests from the browser
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);

    try {
      // ── Health check ──────────────────────────────────────────────────────
      if (pathname === '/' && request.method === 'GET') {
        return jsonResp({ status: 'ok', service: 'Dodge Uconnect Proxy' }, 200, origin);
      }

      // ── POST /auth ────────────────────────────────────────────────────────
      // Verify the app password (stored as APP_PASSWORD Worker secret).
      // The browser sends this once on login; on success it stores the
      // password in localStorage and sends it as X-App-Password on every
      // subsequent request.
      if (pathname === '/auth' && request.method === 'POST') {
        const body = await request.json();
        if (body.password && body.password === env.APP_PASSWORD) {
          return jsonResp({ ok: true }, 200, origin);
        }
        return jsonResp({ error: 'Wrong password' }, 401, origin);
      }

      // All vehicle routes require the app password header
      const appPassword = request.headers.get('X-App-Password');
      if (!appPassword || appPassword !== env.APP_PASSWORD) {
        return jsonResp({ error: 'Unauthorized' }, 401, origin);
      }

      // All other routes require a valid Stellantis session
      const session = await getSession(env);
      const { uid } = session;
      const creds = {
        accessKeyId:  session.accessKeyId,
        secretKey:    session.secretKey,
        sessionToken: session.sessionToken,
      };

      // ── GET /vehicles ─────────────────────────────────────────────────────
      if (pathname === '/vehicles' && request.method === 'GET') {
        const resp = await signedFetch(
          `${BRAND.apiUrl}/v4/accounts/${uid}/vehicles?stage=ALL&sdp=ALL&brand=${BRAND.brandCode}`,
          'GET', null, clientHeaders(BRAND.apiKey), creds
        );
        const data = await resp.json();
        return jsonResp(data.vehicles || [], 200, origin);
      }

      // ── GET /vehicles/:vin/status ─────────────────────────────────────────
      let m = pathname.match(/^\/vehicles\/([^/]+)\/status$/);
      if (m && request.method === 'GET') {
        const vin = m[1];

        // Fetch all three status sources in parallel for speed
        const [infoResult, statusResult, locationResult] = await Promise.allSettled([
          signedFetch(
            `${BRAND.apiUrl}/v3/accounts/${uid}/vehicles/${vin}/status/`,
            'GET', null, clientHeaders(BRAND.apiKey), creds
          ),
          signedFetch(
            `${BRAND.apiUrl}/v1/accounts/${uid}/vehicles/${vin}/remote/status`,
            'GET', null, clientHeaders(BRAND.apiKey), creds
          ),
          signedFetch(
            `${BRAND.apiUrl}/v1/accounts/${uid}/vehicles/${vin}/location/lastknown`,
            'GET', null, clientHeaders(BRAND.apiKey), creds
          ),
        ]);

        return jsonResp({
          info:     infoResult.status     === 'fulfilled' ? await infoResult.value.json()     : null,
          status:   statusResult.status   === 'fulfilled' ? await statusResult.value.json()   : null,
          location: locationResult.status === 'fulfilled' ? await locationResult.value.json() : null,
        }, 200, origin);
      }

      // ── GET /vehicles/:vin/location ───────────────────────────────────────
      m = pathname.match(/^\/vehicles\/([^/]+)\/location$/);
      if (m && request.method === 'GET') {
        const vin = m[1];
        const resp = await signedFetch(
          `${BRAND.apiUrl}/v1/accounts/${uid}/vehicles/${vin}/location/lastknown`,
          'GET', null, clientHeaders(BRAND.apiKey), creds
        );
        return jsonResp(await resp.json(), 200, origin);
      }

      // ── POST /vehicles/:vin/command ───────────────────────────────────────
      m = pathname.match(/^\/vehicles\/([^/]+)\/command$/);
      if (m && request.method === 'POST') {
        const vin = m[1];
        const body = await request.json();
        const cmdName = (body.command || '').toUpperCase();
        const cmd = COMMANDS[cmdName];

        if (!cmd) {
          return jsonResp({
            error: `Unknown command: "${cmdName}"`,
            validCommands: Object.keys(COMMANDS),
          }, 400, origin);
        }

        // Authenticate the PIN for this command
        const pinToken = await getPinToken(uid, creds, env.UCONNECT_PIN);

        // Send the command to Stellantis
        const resp = await signedFetch(
          `${BRAND.apiUrl}/${cmd.version}/accounts/${uid}/vehicles/${vin}/${cmd.url}`,
          'POST',
          { command: cmd.name, pinAuth: pinToken },
          clientHeaders(BRAND.apiKey),
          creds
        );
        const data = await resp.json();
        return jsonResp(data, 200, origin);
      }

      // ── POST /vehicles/:vin/charge-preference ───────────────────────────
      // Sets the preferred charge level for the EV.
      // Body: { "level": "LEVEL_3" }  (LEVEL_1 through LEVEL_5)
      m = pathname.match(/^\/vehicles\/([^/]+)\/charge-preference$/);
      if (m && request.method === 'POST') {
        const vin = m[1];
        const body = await request.json();
        const level = body.level;
        if (!level) {
          return jsonResp({ error: 'Missing required field: level' }, 400, origin);
        }
        const resp = await signedFetch(
          `${BRAND.apiUrl}/v2/accounts/${uid}/vehicles/${vin}/ev/charge/preference/`,
          'PUT',
          { evInfo: { battery: { chargingLevel: level } } },
          clientHeaders(BRAND.apiKey),
          creds
        );
        const data = await resp.json();
        return jsonResp(data, resp.status, origin);
      }

      // ── 404 ───────────────────────────────────────────────────────────────
      return jsonResp({
        error: 'Not found',
        availableEndpoints: [
          'GET  /',
          'POST /auth                            { "password": "..." }',
          'GET  /vehicles',
          'GET  /vehicles/:vin/status',
          'GET  /vehicles/:vin/location',
          'POST /vehicles/:vin/command           { "command": "RDL" }',
          'POST /vehicles/:vin/charge-preference { "level": "LEVEL_3" }',
        ],
      }, 404, origin);

    } catch (err) {
      console.error('Worker error:', err.message);
      return jsonResp({ error: err.message }, 500, origin);
    }
  },
};
