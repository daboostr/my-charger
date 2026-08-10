/**
 * Transports for UconnectClient.
 *
 * Capacitor Android: CapacitorHttp issues requests from the Java layer, so the
 * browser's same-origin policy never applies and Set-Cookie is readable. This
 * is what makes direct Stellantis access possible.
 *
 * This module is intentionally native-only. The Android build is the sole
 * supported client and therefore never needs browser transport.
 */

export function isNativeAndroid() {
  const cap = window.Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

/** Normalizes any transport result into the shape UconnectClient expects. */
function makeResponse(status, bodyText, cookies) {
  return {
    status,
    cookies: cookies || [],
    text: async () => bodyText,
    json: async () => {
      try {
        return JSON.parse(bodyText);
      } catch {
        throw new Error(`Expected JSON but got: ${String(bodyText).slice(0, 200)}`);
      }
    },
  };
}

/**
 * Native transport backed by CapacitorHttp.
 * Bypasses CORS entirely because the request is made by the OS, not the WebView.
 */
export function nativeTransport() {
  return async ({ url, method, headers, body }) => {
    const { CapacitorHttp } = window.Capacitor.Plugins;
    const res = await CapacitorHttp.request({
      url,
      method,
      headers,
      data: body,
      // Keep the raw string so we control JSON parsing and error messages.
      responseType: 'text',
    });

    // CapacitorHttp lowercases some header names and not others depending on
    // the Android version, so look both ways before giving up on cookies.
    const h = res.headers || {};
    const rawCookie = h['set-cookie'] ?? h['Set-Cookie'] ?? '';
    const cookies = Array.isArray(rawCookie)
      ? rawCookie
      : (rawCookie ? String(rawCookie).split(/,(?=[^;]+?=)/) : []);

    const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return makeResponse(res.status, data, cookies);
  };
}
