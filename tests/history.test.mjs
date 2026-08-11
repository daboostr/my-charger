/**
 * Tests for trip/charge derivation. Run: node tests/history.test.mjs
 * Pure functions only, so no Capacitor or DOM is required.
 */

import assert from 'node:assert/strict';
import { deriveTrips, deriveChargeSessions, summarize } from '../dodge_pwa/frontend/lib/history.js';

const MIN = 60 * 1000;
const t = Date.UTC(2026, 7, 1, 8, 0, 0);
const at = m => t + m * MIN;

// ── A simple drive: odometer climbs over consecutive polls ───────────────────
{
  const samples = [
    { t: at(0),  odo: 100, soc: 80, vin: 'V' },
    { t: at(5),  odo: 105, soc: 78, vin: 'V' },
    { t: at(10), odo: 112, soc: 75, vin: 'V' },
  ];
  const trips = deriveTrips(samples);
  assert.equal(trips.length, 1, 'one continuous trip');
  assert.equal(trips[0].distanceKm, 12);
  assert.equal(trips[0].startSoc, 80);
  assert.equal(trips[0].endSoc, 75);
}

// ── Parked jitter must not create trips ─────────────────────────────────────
{
  const samples = [
    { t: at(0),  odo: 100,    soc: 80, vin: 'V' },
    { t: at(5),  odo: 100.1,  soc: 80, vin: 'V' },
    { t: at(10), odo: 100.15, soc: 80, vin: 'V' },
  ];
  assert.equal(deriveTrips(samples).length, 0, 'sub-epsilon movement ignored');
}

// ── A long parked gap splits two drives ─────────────────────────────────────
{
  const samples = [
    { t: at(0),   odo: 100, soc: 80, vin: 'V' },
    { t: at(10),  odo: 110, soc: 76, vin: 'V' },
    { t: at(200), odo: 110, soc: 76, vin: 'V' },  // parked > 15 min
    { t: at(210), odo: 125, soc: 70, vin: 'V' },
  ];
  const trips = deriveTrips(samples);
  assert.equal(trips.length, 2, 'gap splits trips');
  assert.equal(trips[0].distanceKm, 10);
  assert.equal(trips[1].distanceKm, 15);
}

// ── Odometer going backwards (vehicle swap / bad read) is discarded ─────────
{
  const samples = [
    { t: at(0),  odo: 500, soc: 80, vin: 'V' },
    { t: at(5),  odo: 100, soc: 80, vin: 'V' },
    { t: at(10), odo: 108, soc: 78, vin: 'V' },
  ];
  const trips = deriveTrips(samples);
  assert.equal(trips.length, 1, 'only the forward run counts');
  assert.equal(trips[0].distanceKm, 8);
}

// ── Charge sessions ─────────────────────────────────────────────────────────
{
  const samples = [
    { t: at(0),  soc: 40, charging: false, vin: 'V' },
    { t: at(5),  soc: 45, charging: true,  vin: 'V' },
    { t: at(10), soc: 60, charging: true,  vin: 'V' },
    { t: at(15), soc: 60, charging: false, vin: 'V' },
  ];
  const sessions = deriveChargeSessions(samples);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].startSoc, 40);
  assert.equal(sessions[0].endSoc, 60);
}

// ── Flat SoC is not a charge session ────────────────────────────────────────
{
  const samples = [
    { t: at(0), soc: 50, charging: false, vin: 'V' },
    { t: at(5), soc: 50, charging: false, vin: 'V' },
  ];
  assert.equal(deriveChargeSessions(samples).length, 0);
}

// ── Summary maths ───────────────────────────────────────────────────────────
{
  const trips = [{ distanceKm: 100, startSoc: 90, endSoc: 40 }];
  const sessions = [{ startSoc: 40, endSoc: 90 }];
  const s = summarize(trips, sessions, 100); // 100 kWh pack
  assert.equal(s.distanceKm, 100);
  assert.equal(s.kwhUsed, 50);
  assert.equal(s.kwhAdded, 50);
  assert.equal(s.efficiencyKmPerKwh, 2);
  assert.equal(s.tripCount, 1);
  assert.equal(s.chargeCount, 1);
}

// ── No battery size configured → no efficiency claim ────────────────────────
{
  const s = summarize([{ distanceKm: 10, startSoc: 50, endSoc: 40 }], [], null);
  assert.equal(s.kwhUsed, null);
  assert.equal(s.efficiencyKmPerKwh, null);
}

console.log('All history tests passed');
