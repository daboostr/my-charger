/**
 * On-device credential + session storage.
 *
 * Replaces the four Cloudflare Worker secrets. In native mode the Uconnect
 * credentials live in Android EncryptedSharedPreferences (hardware-backed
 * Keystore) via the SecureStore plugin; on the web they fall back to
 * localStorage, which is why the web build keeps using the Worker proxy and
 * never stores Uconnect credentials at all — only the app password.
 */

const PREFIX = 'dodge_pwa_';

function nativeSecureStore() {
  const plugins = window.Capacitor?.Plugins;
  return plugins?.SecureStore || null;
}

export const credentials = {
  async get(key) {
    const secure = nativeSecureStore();
    if (secure) {
      const { value } = await secure.get({ key: PREFIX + key });
      return value ?? null;
    }
    return localStorage.getItem(PREFIX + key);
  },

  async set(key, value) {
    const secure = nativeSecureStore();
    if (secure) return secure.set({ key: PREFIX + key, value: String(value) });
    localStorage.setItem(PREFIX + key, String(value));
  },

  async remove(key) {
    const secure = nativeSecureStore();
    if (secure) return secure.remove({ key: PREFIX + key });
    localStorage.removeItem(PREFIX + key);
  },

  /** True once the Uconnect account details needed for direct mode are present. */
  async isConfigured() {
    const [email, password] = await Promise.all([this.get('uconnect_email'), this.get('uconnect_password')]);
    return !!(email && password);
  },
};

/**
 * Session cache for UconnectClient — the on-device equivalent of the
 * UCONNECT_CACHE KV namespace. AWS credentials are short-lived, so a TTL is
 * stored alongside the value and expired entries are treated as missing.
 */
export const sessionStore = {
  async get(key) {
    const raw = await credentials.get('session_' + key);
    if (!raw) return null;
    try {
      const { value, expiresAt } = JSON.parse(raw);
      if (expiresAt && Date.now() > expiresAt) {
        await credentials.remove('session_' + key);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  },

  async set(key, value, ttlSeconds) {
    await credentials.set('session_' + key, JSON.stringify({
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    }));
  },
};
