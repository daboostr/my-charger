/**
 * Uconnect client — the full Stellantis auth chain and vehicle API, extracted
 * from the original server implementation. It runs in the Capacitor Android app
 * using a native HTTP transport, which is not subject to CORS and can read
 * Set-Cookie headers.
 *
 * Native HTTP is used rather than browser fetch because the Stellantis auth
 * endpoints do not provide the CORS headers required by a WebView.
 *
 * The module is dependency-free and uses only Web Crypto.
 */

export const BRAND = {
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

export const COMMANDS = {
  RDL:           { name: 'RDL',           url: 'remote',       version: 'v1' },
  RDU:           { name: 'RDU',           url: 'remote',       version: 'v1' },
  HBLF:          { name: 'HBLF',          url: 'remote',       version: 'v1' },
  ROLIGHTS:      { name: 'ROLIGHTS',      url: 'remote',       version: 'v1' },
  ROPRECOND:     { name: 'ROPRECOND',     url: 'remote',       version: 'v1' },
  ROPRECOND_OFF: { name: 'ROPRECOND_OFF', url: 'remote',       version: 'v1' },
  REON:          { name: 'REON',          url: 'remote',       version: 'v1' },
  REOFF:         { name: 'REOFF',         url: 'remote',       version: 'v1' },
  ROCOMFORTON:   { name: 'ROCOMFORTON',   url: 'remote',       version: 'v2' },
  ROCOMFORTOFF:  { name: 'ROCOMFORTOFF',  url: 'remote',       version: 'v2' },
  ROHVACON:      { name: 'ROHVACON',      url: 'remote',       version: 'v2' },
  ROHVACOFF:     { name: 'ROHVACOFF',     url: 'remote',       version: 'v2' },
  ROTRUNKUNLOCK: { name: 'ROTRUNKUNLOCK', url: 'remote',       version: 'v2' },
  ROTRUNKLOCK:   { name: 'ROTRUNKLOCK',   url: 'remote',       version: 'v2' },
  DEEPREFRESH:   { name: 'DEEPREFRESH',   url: 'ev',           version: 'v1' },
  DEEPREFRESH2:  { name: 'DEEPREFRESH2',  url: 'ev',           version: 'v2' },
  CNOW:          { name: 'CNOW',          url: 'ev/chargenow', version: 'v1' },
  VF:            { name: 'VF',            url: 'location',     version: 'v1' },
};

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ─── AWS SigV4 ───────────────────────────────────────────────────────────────

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

function gigyaParams(extra) {
  return new URLSearchParams({
    targetEnv: 'jssdk',
    loginMode: 'standard',
    sdk:       'js_latest',
    authMode:  'cookie',
    sdkBuild:  '12234',
    format:    'json',
    APIKey:     BRAND.loginApiKey,
    ...extra,
  });
}

export function clientHeaders(apiKey) {
  return {
    'x-clientapp-name':    'CWP',
    'x-clientapp-version': '1.0',
    'clientrequestid':      crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16),
    'x-api-key':            apiKey,
    'locale':               BRAND.locale,
    'x-originator-type':   'web',
  };
}

/**
 * @param {object}   opts
 * @param {function} opts.transport  async ({ url, method, headers, body }) =>
 *                                   { status, json(), text(), cookies[] }
 * @param {object}   opts.store      { get(key), set(key, value, ttlSeconds) }
 */
export class UconnectClient {
  constructor({ transport, store }) {
    this.transport = transport;
    this.store = store;
    this.session = null;
  }

  request(url, method, body, extraHeaders) {
    return this.transport({
      url,
      method,
      headers: extraHeaders || {},
      body: body == null ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
  }

  async signedFetch(url, method, body, extraHeaders, creds) {
    const { accessKeyId, secretKey, sessionToken } = creds;

    const now = new Date();
    const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const urlObj  = new URL(url);
    const bodyStr = body ? JSON.stringify(body) : '';

    const headers = {
      'content-type':        'application/json',
      'host':                 urlObj.host,
      'x-amz-date':           amzDate,
      'x-amz-security-token': sessionToken,
      ...Object.fromEntries(Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])),
    };

    const sortedKeys       = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
    const signedHeaders    = sortedKeys.join(';');

    const canonicalQS = [...urlObj.searchParams.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const payloadHash = await sha256(bodyStr);
    const canonicalReq = [
      method, urlObj.pathname || '/', canonicalQS, canonicalHeaders, signedHeaders, payloadHash,
    ].join('\n');

    const credScope = `${dateStamp}/${BRAND.region}/execute-api/aws4_request`;
    const strToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${await sha256(canonicalReq)}`;
    const sigKey    = await buildSigningKey(secretKey, dateStamp);
    const signature = toHex(await hmac(sigKey, strToSign));

    const reqHeaders = {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
    delete reqHeaders['host'];

    return this.request(url, method, bodyStr || undefined, reqHeaders);
  }

  // ─── Auth chain ────────────────────────────────────────────────────────────

  async fullLogin(email, password) {
    // Step 1: Gigya SDK bootstrap. The Set-Cookie values it returns must be
    // replayed on the following calls; browser fetch cannot read them, which is
    // one more reason this path needs the native transport.
    const bootResp = await this.request(
      `${BRAND.loginUrl}/accounts.webSdkBootstrap?apiKey=${BRAND.loginApiKey}`,
      'GET', null, { 'User-Agent': BROWSER_UA }
    );
    const boot = await bootResp.json();
    if (boot.statusCode !== 200) throw new Error(`Gigya bootstrap failed: ${boot.errorMessage}`);

    const cookieStr = (bootResp.cookies || []).map(c => c.split(';')[0]).join('; ');
    const gigyaHeaders = {
      'User-Agent': BROWSER_UA,
      ...(cookieStr ? { Cookie: cookieStr } : {}),
    };

    // Step 2: credentials → UID + login token
    const loginParams = gigyaParams({
      loginID: email,
      password,
      sessionExpiration: '300',
      include: 'profile,data,emails,subscriptions,preferences',
    });
    const loginResp = await this.request(
      `${BRAND.loginUrl}/accounts.login?${loginParams}`, 'POST', null, gigyaHeaders
    );
    const loginData = await loginResp.json();
    if (loginData.statusCode !== 200) {
      throw new Error(`Gigya login failed [${loginData.errorCode}]: ${loginData.errorMessage} — ${loginData.errorDetails ?? ''}`);
    }

    const uid        = loginData.UID;
    const loginToken = loginData.sessionInfo.login_token;

    // Step 3: session token → signed JWT
    const jwtParams = gigyaParams({
      login_token: loginToken,
      fields: 'profile.firstName,profile.lastName,profile.email,country,locale,data.disclaimerCodeGSDP',
    });
    const jwtResp = await this.request(
      `${BRAND.loginUrl}/accounts.getJWT?${jwtParams}`, 'POST', null, gigyaHeaders
    );
    const jwtData = await jwtResp.json();
    if (jwtData.statusCode !== 200) throw new Error(`Gigya JWT failed: ${jwtData.errorMessage}`);

    // Step 4: Gigya JWT → Stellantis/Cognito token
    const tokenResp = await this.request(
      BRAND.tokenUrl, 'POST',
      { gigya_token: jwtData.id_token },
      { ...clientHeaders(BRAND.apiKey), 'content-type': 'application/json' }
    );
    const tokenData = await tokenResp.json();
    if (!tokenData.Token || !tokenData.IdentityId) {
      throw new Error(`Stellantis token exchange failed: ${JSON.stringify(tokenData)}`);
    }

    // Step 5: Cognito identity → temporary AWS credentials
    const awsResp = await this.request(
      'https://cognito-identity.us-east-1.amazonaws.com/', 'POST',
      {
        IdentityId: tokenData.IdentityId,
        Logins: { 'cognito-identity.amazonaws.com': tokenData.Token },
      },
      {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': 'AWSCognitoIdentityService.GetCredentialsForIdentity',
      }
    );
    const awsData = await awsResp.json();
    if (!awsData.Credentials) throw new Error(`AWS credentials failed: ${JSON.stringify(awsData)}`);

    return {
      uid,
      accessKeyId:  awsData.Credentials.AccessKeyId,
      secretKey:    awsData.Credentials.SecretKey,
      sessionToken: awsData.Credentials.SessionToken,
      expiration:   awsData.Credentials.Expiration,
    };
  }

  /** Cached session, refreshed when under 5 minutes of life remain. */
  async getSession(email, password) {
    const cached = this.session || await this.store.get('session');
    if (cached) {
      const expiresAt = new Date(cached.expiration).getTime();
      if (expiresAt > Date.now() + 5 * 60 * 1000) {
        this.session = cached;
        return cached;
      }
    }
    const session = await this.fullLogin(email, password);
    this.session = session;
    await this.store.set('session', session, 3480);
    return session;
  }

  creds(session) {
    return {
      accessKeyId:  session.accessKeyId,
      secretKey:    session.secretKey,
      sessionToken: session.sessionToken,
    };
  }

  // ─── Vehicle API ───────────────────────────────────────────────────────────

  async listVehicles(session) {
    const resp = await this.signedFetch(
      `${BRAND.apiUrl}/v4/accounts/${session.uid}/vehicles?stage=ALL&sdp=ALL&brand=${BRAND.brandCode}`,
      'GET', null, clientHeaders(BRAND.apiKey), this.creds(session)
    );
    const data = await resp.json();
    return data.vehicles || [];
  }

  async getStatus(session, vin) {
    const creds = this.creds(session);
    const [info, status, location] = await Promise.allSettled([
      this.signedFetch(`${BRAND.apiUrl}/v3/accounts/${session.uid}/vehicles/${vin}/status/`,
        'GET', null, clientHeaders(BRAND.apiKey), creds),
      this.signedFetch(`${BRAND.apiUrl}/v1/accounts/${session.uid}/vehicles/${vin}/remote/status`,
        'GET', null, clientHeaders(BRAND.apiKey), creds),
      this.signedFetch(`${BRAND.apiUrl}/v1/accounts/${session.uid}/vehicles/${vin}/location/lastknown`,
        'GET', null, clientHeaders(BRAND.apiKey), creds),
    ]);
    return {
      info:     info.status     === 'fulfilled' ? await info.value.json()     : null,
      status:   status.status   === 'fulfilled' ? await status.value.json()   : null,
      location: location.status === 'fulfilled' ? await location.value.json() : null,
    };
  }

  async getLocation(session, vin) {
    const resp = await this.signedFetch(
      `${BRAND.apiUrl}/v1/accounts/${session.uid}/vehicles/${vin}/location/lastknown`,
      'GET', null, clientHeaders(BRAND.apiKey), this.creds(session)
    );
    return resp.json();
  }

  async getPinToken(session, pin) {
    const resp = await this.signedFetch(
      `${BRAND.authUrl}/v1/accounts/${session.uid}/ignite/pin/authenticate`,
      'POST', { pin: btoa(pin) }, clientHeaders(BRAND.authToken), this.creds(session)
    );
    const data = await resp.json();
    if (!data.token) throw new Error(`PIN authentication failed: ${JSON.stringify(data)}`);
    return data.token;
  }

  async sendCommand(session, vin, commandName, pin) {
    const cmd = COMMANDS[(commandName || '').toUpperCase()];
    if (!cmd) {
      const err = new Error(`Unknown command: "${commandName}"`);
      err.validCommands = Object.keys(COMMANDS);
      throw err;
    }
    const pinToken = await this.getPinToken(session, pin);
    const resp = await this.signedFetch(
      `${BRAND.apiUrl}/${cmd.version}/accounts/${session.uid}/vehicles/${vin}/${cmd.url}`,
      'POST',
      { command: cmd.name, pinAuth: pinToken },
      clientHeaders(BRAND.apiKey),
      this.creds(session)
    );
    return resp.json();
  }

  async setChargePreference(session, vin, level) {
    const resp = await this.signedFetch(
      `${BRAND.apiUrl}/v2/accounts/${session.uid}/vehicles/${vin}/ev/charge/preference/`,
      'PUT',
      { evInfo: { battery: { chargingLevel: level } } },
      clientHeaders(BRAND.apiKey),
      this.creds(session)
    );
    return resp.json();
  }
}
