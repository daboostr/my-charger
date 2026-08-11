/**
 * Driving history store.
 *
 * Records vehicle snapshots and derived trips/charge sessions into a folder the
 * user picks with Android's Storage Access Framework. Pointing that picker at a
 * Google Drive / Dropbox / OneDrive folder means their app does the syncing —
 * no server, and no cloud credentials in this codebase.
 *
 * ── File format ────────────────────────────────────────────────────────────
 * Data is JSON Lines (one JSON object per line), split per device and per UTC
 * month:
 *
 *   charger-history/
 *     samples-<deviceId>-2026-08.jsonl
 *     trips-<deviceId>-2026-08.jsonl
 *
 * Append-only JSONL with per-device filenames is deliberate: two phones writing
 * the same vehicle can never write the same file, so a cloud-sync client never
 * has to merge concurrent edits and can't produce "conflicted copy" files that
 * would silently lose data. Reads union every device's files and de-duplicate
 * by record id, so each device converges on the same view.
 */

const DIR_NAME = 'charger-history';

function plugin() {
  return window.Capacitor?.Plugins?.SyncedFolder || null;
}

export function isFolderAvailable() {
  return !!plugin();
}

/** Stable per-install id, so each device writes to its own set of files. */
export function deviceId() {
  let id = localStorage.getItem('dodge_pwa_device_id');
  if (!id) {
    id = (crypto.randomUUID?.() || String(Date.now())).slice(0, 8);
    localStorage.setItem('dodge_pwa_device_id', id);
  }
  return id;
}

function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const historyStore = {
  /** Opens the system folder picker and persists access across reboots. */
  async chooseFolder() {
    const p = plugin();
    if (!p) throw new Error('Synced folder is only available in the Android app');
    const { uri, displayName } = await p.pickDirectory({ subfolder: DIR_NAME });
    localStorage.setItem('dodge_pwa_folder_name', displayName || uri);
    return { uri, displayName };
  },

  async folderName() {
    const p = plugin();
    if (!p) return null;
    const { granted, displayName } = await p.status();
    return granted ? (displayName || localStorage.getItem('dodge_pwa_folder_name')) : null;
  },

  async isReady() {
    const p = plugin();
    if (!p) return false;
    const { granted } = await p.status();
    return !!granted;
  },

  async append(kind, record) {
    const p = plugin();
    if (!p) return false;
    if (!(await this.isReady())) return false;
    const file = `${kind}-${deviceId()}-${monthKey(record.t || Date.now())}.jsonl`;
    await p.appendLine({ file, line: JSON.stringify(record) });
    return true;
  },

  /**
   * Reads every device's files for a record kind and de-duplicates by id.
   * Corrupt trailing lines are skipped rather than thrown, because a file may
   * be read mid-sync while another device's write is still landing.
   */
  async readAll(kind, { sinceMs } = {}) {
    const p = plugin();
    if (!p || !(await this.isReady())) return [];

    const { files } = await p.listFiles();
    const matching = (files || []).filter(f => f.startsWith(kind + '-') && f.endsWith('.jsonl'));

    const seen = new Set();
    const out = [];
    for (const file of matching) {
      const { content } = await p.readFile({ file });
      for (const line of (content || '').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let rec;
        try { rec = JSON.parse(trimmed); } catch { continue; }
        if (sinceMs && rec.t < sinceMs) continue;
        const id = rec.id || `${rec.t}-${rec.vin || ''}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(rec);
      }
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  },
};

// ─── Trip & charge-session detection ─────────────────────────────────────────

const ODO_EPSILON_KM = 0.3;   // ignore GPS/odometer jitter below this
const TRIP_GAP_MS = 15 * 60 * 1000; // idle gap that closes a trip

/**
 * Turns an ordered list of snapshots into trips and charge sessions.
 *
 * The Stellantis API exposes no trip log, so trips are inferred from odometer
 * deltas between polls. Sampling is coarse, so a "trip" here means a period of
 * continuous odometer movement with no gap longer than TRIP_GAP_MS, not a
 * precise ignition-on to ignition-off cycle.
 */
export function deriveTrips(samples) {
  const trips = [];
  let cur = null;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const s = samples[i];
    if (s.odo == null || prev.odo == null) continue;

    const dist = s.odo - prev.odo;
    const gap = s.t - prev.t;

    // Odometer went backwards — a vehicle swap or bad reading; drop the trip.
    if (dist < 0) { cur = null; continue; }

    const moved = dist > ODO_EPSILON_KM;

    if (moved) {
      if (!cur || gap > TRIP_GAP_MS) {
        if (cur) trips.push(cur);
        cur = {
          id: `trip-${prev.t}`,
          vin: s.vin,
          start: prev.t,
          end: s.t,
          distanceKm: dist,
          startSoc: prev.soc ?? null,
          endSoc: s.soc ?? null,
          startLoc: prev.loc ?? null,
          endLoc: s.loc ?? null,
        };
      } else {
        cur.end = s.t;
        cur.distanceKm += dist;
        cur.endSoc = s.soc ?? cur.endSoc;
        cur.endLoc = s.loc ?? cur.endLoc;
      }
    } else if (cur && gap > TRIP_GAP_MS) {
      trips.push(cur);
      cur = null;
    }
  }
  if (cur) trips.push(cur);
  return trips;
}

/** Contiguous runs where state of charge increased while plugged in. */
export function deriveChargeSessions(samples) {
  const sessions = [];
  let cur = null;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const s = samples[i];
    if (s.soc == null || prev.soc == null) continue;

    const charging = s.charging === true || s.soc > prev.soc;
    if (charging) {
      if (!cur || (s.t - prev.t) > TRIP_GAP_MS) {
        if (cur) sessions.push(cur);
        cur = {
          id: `charge-${prev.t}`,
          vin: s.vin,
          start: prev.t,
          end: s.t,
          startSoc: prev.soc,
          endSoc: s.soc,
          loc: s.loc ?? prev.loc ?? null,
        };
      } else {
        cur.end = s.t;
        cur.endSoc = s.soc;
      }
    } else if (cur) {
      sessions.push(cur);
      cur = null;
    }
  }
  if (cur) sessions.push(cur);
  // A session that never gained charge is just noise between polls.
  return sessions.filter(s => s.endSoc > s.startSoc);
}

/**
 * Summarizes driving after the most recent completed charge session.
 * Values are kept in km and percentage points so the UI can apply unit
 * preferences and battery capacity consistently.
 */
export function summarizeSinceLastCharge(samples, batteryKwh) {
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  const sessions = deriveChargeSessions(ordered);
  const lastCharge = sessions[sessions.length - 1];
  const baseline = lastCharge ? lastCharge.end : null;
  const afterCharge = baseline == null
    ? ordered
    : ordered.filter(sample => sample.t > baseline);

  let distanceKm = 0;
  let socUsed = 0;
  for (let i = 1; i < afterCharge.length; i++) {
    const prev = afterCharge[i - 1];
    const current = afterCharge[i];
    if (prev.odo != null && current.odo != null) {
      const distance = current.odo - prev.odo;
      if (distance > ODO_EPSILON_KM) distanceKm += distance;
    }
    if (prev.soc != null && current.soc != null) {
      const used = prev.soc - current.soc;
      if (used > 0) socUsed += used;
    }
  }

  const kwhUsed = batteryKwh ? (socUsed / 100) * batteryKwh : null;
  return {
    since: baseline,
    distanceKm,
    socUsed,
    kwhUsed,
    efficiencyKmPerKwh: kwhUsed && distanceKm > 0 ? distanceKm / kwhUsed : null,
  };
}

/** Rolls trips + charge sessions into the numbers shown on the stats screen. */
export function summarize(trips, sessions, batteryKwh) {
  const distanceKm = trips.reduce((a, t) => a + t.distanceKm, 0);
  const socUsed = trips.reduce((a, t) => {
    if (t.startSoc == null || t.endSoc == null) return a;
    const d = t.startSoc - t.endSoc;
    return d > 0 ? a + d : a;
  }, 0);
  const socGained = sessions.reduce((a, s) => a + (s.endSoc - s.startSoc), 0);

  const kwhUsed = batteryKwh ? (socUsed / 100) * batteryKwh : null;
  const kwhAdded = batteryKwh ? (socGained / 100) * batteryKwh : null;

  return {
    tripCount: trips.length,
    distanceKm,
    kwhUsed,
    kwhAdded,
    chargeCount: sessions.length,
    // Only meaningful once there's enough distance for the SoC delta to matter.
    efficiencyKmPerKwh: kwhUsed && distanceKm > 1 ? distanceKm / kwhUsed : null,
  };
}
