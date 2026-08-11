/**
 * Vehicle API facade.
 *
 * Presents the native Android API used by the UI. Credentials and sessions
 * stay on the device; all Stellantis requests use CapacitorHttp.
 */

import { UconnectClient } from './uconnect-client.js';
import { nativeTransport } from './transport.js';
import { credentials, sessionStore } from './credentials.js';

let client = null;

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

// ─── Public API ──────────────────────────────────────────────────────────────

export const vehicleApi = {
  async listVehicles() {
    return getClient().listVehicles(await directSession());
  },

  async getStatus(vin) {
    return getClient().getStatus(await directSession(), vin);
  },

  async sendCommand(vin, command) {
    const pin = await credentials.get('uconnect_pin');
    if (!pin) throw new Error('Uconnect PIN is not set up');
    return getClient().sendCommand(await directSession(), vin, command, pin);
  },

  async setChargePreference(vin, level) {
    return getClient().setChargePreference(await directSession(), vin, level);
  },

  /** Verifies stored credentials by forcing a real login. */
  async verifyDirectCredentials(email, password) {
    const probe = new UconnectClient({ transport: nativeTransport(), store: sessionStore });
    await probe.fullLogin(email, password);
    return true;
  },
};
