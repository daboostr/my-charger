/**
 * History recorder.
 *
 * Extracts the few fields worth keeping from a status snapshot and appends them
 * to the synced folder. Only compact samples are stored, not raw API payloads:
 * a year of 15-minute polling stays in the low megabytes, which matters when
 * the folder is synced over a metered connection.
 *
 * Recording is intentionally best-effort. A failure to write history must never
 * break the dashboard, so every entry point swallows its errors after logging.
 */

import { historyStore, deriveTrips, deriveChargeSessions, summarize } from './history.js';

/** Pulls a flat sample out of the nested Stellantis status payload. */
export function sampleFromSnapshot(snapshot, vin) {
  if (!snapshot) return null;

  const ev = snapshot.info?.evInfo?.battery ?? {};
  const vehicle = snapshot.info?.vehicleInfo ?? {};
  const loc = snapshot.location?.attributes ?? snapshot.location ?? {};

  const odoRaw = vehicle.odometer?.odometer?.value ?? vehicle.odometer?.value ?? null;
  const socRaw = ev.stateOfCharge ?? null;

  const num = v => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const lat = num(loc.latitude);
  const lon = num(loc.longitude);

  return {
    id: `${vin}-${Date.now()}`,
    t: Date.now(),
    vin,
    odo: num(odoRaw),
    soc: num(socRaw),
    range: num(ev.distanceToEmpty?.value),
    charging: ev.chargingStatus ? /CHARGING/i.test(ev.chargingStatus) : null,
    plugged: ev.plugInStatus ?? null,
    loc: lat != null && lon != null ? { lat, lon } : null,
  };
}

/**
 * Appends a sample, skipping ones that carry no new information.
 * Returns true only when something was actually written.
 */
export async function recordSnapshot(snapshot, vin) {
  try {
    if (!(await historyStore.isReady())) return false;
    const sample = sampleFromSnapshot(snapshot, vin);
    if (!sample || (sample.odo == null && sample.soc == null)) return false;

    // Skip a write when neither odometer nor charge has moved since the last
    // sample; the vehicle sitting parked overnight shouldn't produce hundreds
    // of identical lines for the sync client to shuttle between devices.
    const recent = await historyStore.readAll('samples', { sinceMs: Date.now() - 6 * 60 * 60 * 1000 });
    const last = recent.filter(s => s.vin === vin).pop();
    if (last && last.odo === sample.odo && last.soc === sample.soc && last.charging === sample.charging) {
      return false;
    }

    await historyStore.append('samples', sample);
    return true;
  } catch (err) {
    console.warn('History recording failed:', err.message);
    return false;
  }
}

/** Reads back everything and derives the stats shown in the History screen. */
export async function loadHistory({ sinceMs, batteryKwh } = {}) {
  const samples = await historyStore.readAll('samples', { sinceMs });
  const trips = deriveTrips(samples);
  const sessions = deriveChargeSessions(samples);
  return {
    samples,
    trips,
    sessions,
    summary: summarize(trips, sessions, batteryKwh),
  };
}
