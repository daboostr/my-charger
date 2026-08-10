/**
 * Vehicle API facade.
 *
 * Presents one interface to the UI while hiding which of two very different
 * backends is in use:
 *
 *   direct — Android app: talks straight to Stellantis over native HTTP with
 *            credentials stored on the device. No Cloudflare involved.
 *   proxy  — Web build: calls the Cloudflare Worker, because a browser tab is
 *            blocked by CORS from reaching Stellantis at all.
 *
 * Mode is chosen from the runtime rather than configured, so the same bundle
 * ships to both targets.
 */

import { UconnectClient } from './uconnect-client.js';
import { isNativeAndroid, nativeTransport } from './transport.js';
import { credentials, sessionStore } from './credentials.js';

let client = null;

export async function getMode() {
  if (isNativeAndroid() && await credentials.isConfigured()) return 'direct';
  return 'proxy';
}

function getClient() {
  if (!client) {
    client = new UconnectClient({ transport: nativeTransport(), store: sessionStore });
  }
  return client;
}

async function directSession() {
  const [email, password] = await Promise.all([
    credentials.get('uconnect_email'),
    credentials.get('uconnect_password'),
  ]);
  if (!email || !password) throw new Error('Uconnect credentials are not set up');
  return getClient().getSession(email, password);
}

// ─── Proxy-mode helpers (existing Worker REST surface) ───────────────────────

function workerUrl() {
  return (localStorage.getItem('dodge_pwa_worker_url') || '').replace(/\/$/, '');
}

async function proxyFetch(method, path, body) {
  const password = localStorage.getItem('dodge_pwa_password');
  const res = await fetch(workerUrl() + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Password': password || '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const vehicleApi = {
  async listVehicles() {
    if (await getMode() === 'direct') {
      return getClient().listVehicles(await directSession());
    }
    const res = await proxyFetch('GET', '/vehicles');
    if (!res.ok) throw new Error('Failed to list vehicles');
    return res.json();
  },

  async getStatus(vin) {
    if (await getMode() === 'direct') {
      return getClient().getStatus(await directSession(), vin);
    }
    const res = await proxyFetch('GET', `/vehicles/${vin}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async sendCommand(vin, command) {
    if (await getMode() === 'direct') {
      const pin = await credentials.get('uconnect_pin');
      if (!pin) throw new Error('Uconnect PIN is not set up');
      return getClient().sendCommand(await directSession(), vin, command, pin);
    }
    const res = await proxyFetch('POST', `/vehicles/${vin}/command`, { command });
    if (!res.ok) throw new Error('Command failed');
    return res.json();
  },

  async setChargePreference(vin, level) {
    if (await getMode() === 'direct') {
      return getClient().setChargePreference(await directSession(), vin, level);
    }
    const res = await proxyFetch('POST', `/vehicles/${vin}/charge-preference`, { level });
    if (!res.ok) throw new Error('Failed to set charge preference');
    return res.json();
  },

  /** Verifies stored credentials by forcing a real login. */
  async verifyDirectCredentials(email, password) {
    const probe = new UconnectClient({ transport: nativeTransport(), store: sessionStore });
    await probe.fullLogin(email, password);
    return true;
  },
};
