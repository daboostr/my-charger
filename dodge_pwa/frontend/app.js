// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const ICONS = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.2-2.4"/></svg>',
  precondition_on: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1M2 12h20"/></svg>',
  precondition_off: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1M2 12h20" opacity="0.4"/><path d="M5 5l14 14" /></svg>',
  horn_lights: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18v1a3 3 0 0 0 6 0v-1M5 8a7 7 0 0 1 14 0c0 4 1.5 5 1.5 7H3.5C3.5 13 5 12 5 8Z"/></svg>',
  trunk_unlock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="10" rx="2"/><path d="M3 13h18M9 9V7a3 3 0 0 1 6 0v2"/></svg>',
  refresh_location: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  deep_refresh: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/><path d="M3 3v6h6" opacity="0.5"/></svg>',
  charge_now: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
  update_data: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>',
  reset_battery_learning: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="14" rx="1.5"/><path d="M10 7V5a2 2 0 0 1 4 0v2M9 12h6M12 9v6"/></svg>',
  charging_on: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/><circle cx="19" cy="5" r="3" fill="currentColor" stroke="none"/></svg>',
  charging_off: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" opacity="0.4"/><path d="M4 4l16 16"/></svg>',
};

const COMMAND_LABELS = {
  lock: "Lock",
  unlock: "Unlock",
  precondition_on: "A/C On",
  precondition_off: "A/C Off",
  horn_lights: "Horn & Lights",
  trunk_unlock: "Trunk",
  refresh_location: "Locate",
  deep_refresh: "Deep Refresh",
  charge_now: "Charge Now",
  update_data: "Update Data",
  reset_battery_learning: "Reset Battery",
  charging_on: "Start Charging",
  charging_off: "Stop Charging",
};

// PWA command name → Uconnect API command name
const COMMAND_MAP = {
  lock:             'RDL',
  unlock:           'RDU',
  horn_lights:      'HBLF',
  precondition_on:  'ROPRECOND',
  precondition_off: 'ROPRECOND_OFF',
  charge_now:       'CNOW',
  refresh_location: 'VF',
  deep_refresh:     'DEEPREFRESH',
  update_data:      'DEEPREFRESH',
  // trunk_unlock: not currently supported by Stellantis API
};

const WIDGET_MIN_SIZE = {
  hero: { w: 2, h: 4 },
  stat: { w: 1, h: 1 },
  lock_status: { w: 1, h: 1 },
  binary_status: { w: 1, h: 1 },
  timestamp: { w: 1, h: 1 },
  select_cycle: { w: 2, h: 1 },
  tire_grid: { w: 2, h: 2 },
  location: { w: 2, h: 1 },
  command_button: { w: 1, h: 1 },
  charge_times: { w: 2, h: 1 },
};

// Default dashboard layout
const DEFAULT_LAYOUT = {
  widgets: [
    // ── Visible tiles ──
    { id: "hero",                 type: "hero",      visible: true,  x: 0, y: 0, w: 4, h: 5 },
    { id: "tire_grid",            type: "tire_grid",  label: "Tire Pressure",        visible: true,  x: 0, y: 5, w: 2, h: 2 },
    { id: "charge_times",         type: "charge_times", label: "Time to Full",       visible: true,  x: 2, y: 5, w: 2, h: 1 },
    { id: "last_location_update", type: "timestamp", field: "last_location_update", label: "Last Location Update", visible: true,  x: 2, y: 6, w: 2, h: 1 },
    { id: "odometer",             type: "stat",      field: "odometer", label: "Odometer", unit_fallback: "mi",   visible: true,  x: 0, y: 7, w: 2, h: 1 },
    { id: "location",             type: "location",  visible: true,  x: 2, y: 7, w: 2, h: 1 },
    // ── Hidden — shown in hero-right ──
    { id: "battery_12v",      type: "stat",          field: "battery_12v",      label: "12V Battery",    unit_fallback: "V",  visible: false, x: 0, y: 20, w: 2, h: 1 },
    { id: "ac_status",        type: "binary_status", field: "ac_status",        label: "A/C",            on_text: "On",  off_text: "Off", visible: false, x: 2, y: 20, w: 2, h: 1 },
    { id: "charge_speed",     type: "select_cycle",  field: "charge_speed",     label: "Charge Speed",   read_only: true, visible: false, x: 0, y: 21, w: 2, h: 1 },
    { id: "last_info_update", type: "timestamp",     field: "last_info_update", label: "Last Data Update", visible: false, x: 2, y: 21, w: 2, h: 1 },
    // ── Hidden — misc ──
    { id: "range",         type: "stat",          field: "range",        label: "Current Range", unit_fallback: "mi", visible: false, x: 0, y: 22, w: 2, h: 1 },
    { id: "plugged_in",    type: "binary_status", field: "plugged_in",   label: "Charge Port",  on_text: "Plugged In", off_text: "Unplugged", visible: false, x: 2, y: 22, w: 2, h: 1 },
    { id: "health_report", type: "timestamp",     field: "health_report", label: "Last Health Report", visible: false, x: 0, y: 23, w: 2, h: 1 },
    { id: "doors_locked",  type: "lock_status",   field: "doors_locked", label: "Doors",        visible: false, x: 2, y: 23, w: 2, h: 1 },
    { id: "ev_running",    type: "binary_status", field: "ev_running",   label: "EV Running",   on_text: "Running", off_text: "Off", visible: false, x: 0, y: 24, w: 2, h: 1 },
    { id: "stolen_status", type: "binary_status", field: "stolen_status", label: "Stolen Status", on_text: "ALERT", off_text: "OK", warn_when: "on", visible: false, x: 2, y: 24, w: 2, h: 1 },
    // ── Command buttons (visible, in order) ──
    { id: "cmd_lock",             type: "command_button", command: "lock",             visible: true,  x: 0, y: 30, w: 1, h: 1 },
    { id: "cmd_unlock",           type: "command_button", command: "unlock",           visible: true,  x: 1, y: 30, w: 1, h: 1 },
    { id: "cmd_precondition_on",  type: "command_button", command: "precondition_on",  visible: true,  x: 2, y: 30, w: 1, h: 1 },
    { id: "cmd_precondition_off", type: "command_button", command: "precondition_off", visible: true,  x: 3, y: 30, w: 1, h: 1 },
    { id: "cmd_refresh_location", type: "command_button", command: "refresh_location", visible: true,  x: 0, y: 31, w: 1, h: 1 },
    { id: "cmd_charge_now",       type: "command_button", command: "charge_now",       visible: true,  x: 1, y: 31, w: 1, h: 1 },
    { id: "cmd_update_data",      type: "command_button", command: "update_data",      visible: true,  x: 2, y: 31, w: 1, h: 1 },
    { id: "cmd_deep_refresh",     type: "command_button", command: "deep_refresh",     visible: true,  x: 3, y: 31, w: 1, h: 1 },
    // ── Command buttons (hidden) ──
    { id: "cmd_trunk_unlock",           type: "command_button", command: "trunk_unlock",           visible: false, x: 0, y: 32, w: 1, h: 1 },
    { id: "cmd_reset_battery_learning", type: "command_button", command: "reset_battery_learning", visible: false, x: 1, y: 32, w: 1, h: 1 },
    { id: "cmd_charging_on",            type: "command_button", command: "charging_on",            visible: false, x: 2, y: 32, w: 1, h: 1 },
    { id: "cmd_charging_off",           type: "command_button", command: "charging_off",           visible: false, x: 3, y: 32, w: 1, h: 1 },
  ],
};

const LAYOUT_KEY      = 'dodge_pwa_layout_v3'; // bumped: configurable hero-right + new tile layout
const VIN_KEY         = 'dodge_pwa_vin';
const VNAME_KEY       = 'dodge_pwa_vehicle_name';
const UNITS_KEY       = 'dodge_pwa_units';
const PRESSURE_KEY    = 'dodge_pwa_pressure_units';
const HERO_RIGHT_KEY  = 'dodge_pwa_hero_right';
const BATTERY_KEY     = 'dodge_pwa_battery_kwh';
const PHOTO_KEY       = 'dodge_pwa_vehicle_photo';

// Available items for the hero-right configurable column (max 5 selected).
// Excludes Tire Pressure (tile layout) and Time to Full (tile, too wide).
const HERO_RIGHT_OPTIONS = [
  { id: 'battery_12v',          label: '12V Battery',       render: (s) => { const v = num(s.battery_12v); return v != null ? `${v}V` : '--'; } },
  { id: 'ac_status',            label: 'A/C',               render: (s) => s.ac_status ? (s.ac_status.state === 'on' ? 'On' : 'Off') : '--' },
  { id: 'range',                label: 'Range',             render: (s) => { const v = num(s.range); if (v == null) return '--'; const u = s.range?.attributes?.unit_of_measurement || 'mi'; const d = (u === 'km' && getUnits() === 'imperial') ? v * 0.621371 : v; return `${Math.round(d)} mi`; } },
  { id: 'charge_speed',         label: 'Charge Speed',      render: (s) => s.charge_speed ? prettyChargeLevel(s.charge_speed.state) : '--' },
  { id: 'plugged_in',           label: 'Charge Port',       render: (s) => s.plugged_in ? (s.plugged_in.state === 'on' ? 'Plugged In' : 'Unplugged') : '--' },
  { id: 'odometer',             label: 'Odometer',          render: (s) => { const v = num(s.odometer); if (v == null) return '--'; const u = s.odometer?.attributes?.unit_of_measurement || 'mi'; const d = (u === 'km' && getUnits() === 'imperial') ? v * 0.621371 : v; return `${Math.round(d).toLocaleString()} mi`; } },
  { id: 'last_info_update',     label: 'Last Data Update',  render: (s) => (s.last_info_update?.state ? formatTimestamp(s.last_info_update.state) : null) || '--' },
  { id: 'last_location_update', label: 'Last Location',     render: (s) => (s.last_location_update?.state ? formatTimestamp(s.last_location_update.state) : null) || '--' },
  { id: 'doors_locked',         label: 'Doors',             render: (s) => !s.doors_locked ? '--' : (s.doors_locked.state === 'locked' ? 'Locked' : 'Unlocked') },
  { id: 'ev_running',           label: 'EV Running',        render: (s) => s.ev_running ? (s.ev_running.state === 'on' ? 'Running' : 'Off') : '--' },
  { id: 'health_report',        label: 'Last Health Report',render: (s) => (s.health_report?.state ? formatTimestamp(s.health_report.state) : null) || '--' },
  { id: 'stolen_status',        label: 'Stolen Status',     render: (s) => s.stolen_status ? (s.stolen_status.state === 'on' ? 'ALERT' : 'OK') : '--' },
];
const HERO_RIGHT_DEFAULTS = ['battery_12v', 'ac_status', 'range', 'charge_speed', 'last_info_update'];

function getHeroRightItems() {
  try {
    const raw = localStorage.getItem(HERO_RIGHT_KEY);
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length) return a.slice(0, 5); }
  } catch {}
  return [...HERO_RIGHT_DEFAULTS];
}

function saveHeroRightItems(ids) {
  localStorage.setItem(HERO_RIGHT_KEY, JSON.stringify(ids.slice(0, 5)));
}

function getUnits()          { return localStorage.getItem(UNITS_KEY)    || 'imperial'; }
function getPressureUnits()  { return localStorage.getItem(PRESSURE_KEY) || 'psi'; }
function getBatteryCapacity() {
  const v = parseFloat(localStorage.getItem(BATTERY_KEY));
  return Number.isFinite(v) && v > 0 ? v : null;
}

function getVehiclePhoto() {
  return localStorage.getItem(PHOTO_KEY) || null;
}

function applyVehiclePhoto() {
  const photo  = getVehiclePhoto();
  const banner = document.getElementById('vehicle-photo-banner');
  const img    = document.getElementById('vehicle-photo-img');
  if (!banner || !img) return;
  if (photo) {
    img.src = photo;
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
    img.src = '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Orientation / landscape support
// ─────────────────────────────────────────────────────────────────────────────

// In landscape we use a 6-column grid: hero takes cols 0-3 (≈67%),
// visible tiles stack in cols 4-5 (≈33%) beside it.
// The mini-stats (12V, A/C, charge speed, odometer, last update) live
// inside the hero widget itself, so they don't appear in the sidebar.
// Landscape uses 10 columns: hero occupies 4 (40%), tiles fill 6 (60%)
// split into 2 equal tile columns of w=3 each (x=4–6 and x=7–9).
const LANDSCAPE_POSITIONS = {
  hero:                 { x: 0, y: 0, w: 4, h: 5 },
  tire_grid:            { x: 4, y: 0, w: 6, h: 2 },  // full tile width
  charge_times:         { x: 4, y: 2, w: 3, h: 1 },
  last_location_update: { x: 7, y: 2, w: 3, h: 1 },
  odometer:             { x: 4, y: 3, w: 3, h: 1 },
  location:             { x: 7, y: 3, w: 3, h: 1 },
};

const orientationQuery = window.matchMedia('(orientation: landscape)');
let isLandscape = orientationQuery.matches;

orientationQuery.addEventListener('change', (e) => {
  isLandscape = e.matches;
  if (liveGrid) buildViewGrid();
});

let currentVin    = null;
let vehicleName   = 'Dodge';
let currentLayout = null;
let liveGrid      = null;
let editGrid      = null;
let lastSnapshot  = null;
let pollTimer     = null;
let lastRefresh   = null;

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

async function checkSession() {
  if (!window.Charger?.isNative) {
    showLogin('This app must be run as the Android app.');
    return;
  }
  if (await window.Charger.credentials.isConfigured()) await showApp();
  else showLogin();
}

function showLogin(message = '') {
  document.getElementById('login-error').textContent = message;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').classList.remove('visible');
}

function playLaunchSplash() {
  const splash = document.getElementById('launch-splash');
  if (!splash) return;
  window.setTimeout(() => {
    splash.classList.add('is-hidden');
    window.setTimeout(() => splash.classList.add('is-removed'), 450);
  }, 1250);
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  await initApp();
}

function doLogout() {
  stopPolling();
  localStorage.removeItem(VIN_KEY);
  localStorage.removeItem(VNAME_KEY);
  closeInfo();
  showLogin();
}

document.getElementById('logout-btn').addEventListener('click', doLogout);

// ─────────────────────────────────────────────────────────────────────────────
// App initialization
// ─────────────────────────────────────────────────────────────────────────────

async function initApp() {
  // Load VIN — check cache first so startup is instant on repeat visits
  currentVin  = localStorage.getItem(VIN_KEY)   || null;
  vehicleName = localStorage.getItem(VNAME_KEY) || 'Dodge';

  if (!currentVin) {
    try {
      const vehicles = await window.Charger.vehicleApi.listVehicles();
      if (vehicles && vehicles.length > 0) {
        currentVin  = vehicles[0].vin;
        vehicleName = vehicles[0].nickname || vehicles[0].modelDescription || 'Dodge';
        localStorage.setItem(VIN_KEY,   currentVin);
        localStorage.setItem(VNAME_KEY, vehicleName);
      }
    } catch { /* proceed anyway; fetchAndRender will show offline */ }
  }

  currentLayout = loadLayout();
  buildViewGrid();
  applyVehiclePhoto();
  startPolling();
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling (replaces SSE stream)
// ─────────────────────────────────────────────────────────────────────────────

function startPolling() {
  fetchAndRender();                              // immediate first fetch
  pollTimer = setInterval(fetchAndRender, 8000); // then every 8s
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function fetchAndRender() {
  if (!currentVin) { setStatus(false); return; }
  try {
    let data;

    data = await window.Charger.vehicleApi.getStatus(currentVin);

    const snapshot = buildSnapshot(data);
    render(snapshot);
    lastRefresh = new Date();
    setStatus(true);

    // Persist to the synced folder. Deliberately not awaited: history is a
    // side-benefit and must never slow down or break the live dashboard.
    if (window.Charger) {
      window.Charger.recordSnapshot(data, currentVin).catch(() => {});
    }
  } catch {
    setStatus(false);
  }
}

function setStatus(live) {
  document.getElementById('status-dot').classList.toggle('live', live);
  document.getElementById('status-text').textContent = live ? 'live' : 'reconnecting';
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot builder — maps the Stellantis status payload to the UI snapshot format
// ─────────────────────────────────────────────────────────────────────────────

function _sg(d, ...keys) {
  for (const k of keys) {
    if (d == null || typeof d !== 'object') return null;
    d = d[k];
  }
  return d ?? null;
}

function _ts(ms) {
  if (ms == null) return null;
  try { return new Date(ms).toISOString(); } catch { return null; }
}

function buildSnapshot(data) {
  const info     = data.info     || {};
  const status   = data.status   || {};
  const location = data.location || {};

  const vi   = _sg(info, 'vehicleInfo') || {};
  const ev   = _sg(info, 'evInfo')      || {};
  const batt = _sg(ev,   'battery')     || {};

  const s = {};

  // State of charge
  const soc = batt.stateOfCharge;
  s.state_of_charge = soc != null ? { state: soc, attributes: {} } : null;

  // Range — prefer EV distanceToEmpty, fall back to fuel
  const dte = _sg(batt, 'distanceToEmpty') || _sg(vi, 'fuel', 'distanceToEmpty') || {};
  s.range = dte.value != null
    ? { state: dte.value, attributes: { unit_of_measurement: dte.unit || 'mi' } }
    : null;

  // Odometer
  const odo = _sg(vi, 'odometer', 'odometer') || {};
  s.odometer = odo.value != null
    ? { state: odo.value, attributes: { unit_of_measurement: odo.unit || 'mi' } }
    : null;

  // 12V battery voltage
  const bv = _sg(vi, 'batteryInfo', 'batteryVoltage') || {};
  s.battery_12v = bv.value != null
    ? { state: bv.value, attributes: { unit_of_measurement: 'V' } }
    : null;

  // Charging status + plug
  s.charging_status = {
    state: batt.chargingStatus === 'CHARGING' ? 'on' : 'off',
    attributes: {},
  };
  const plug = batt.plugInStatus;
  s.plugged_in = plug != null ? { state: plug ? 'on' : 'off', attributes: {} } : null;

  // Time to full (L1 / L2 / L3)
  for (const [field, key] of [
    ['time_to_full',    'timeToFullyChargeL2'],
    ['time_to_full_l1', 'timeToFullyChargeL1'],
    ['time_to_full_l3', 'timeToFullyChargeL3'],
  ]) {
    const mins = batt[key];
    s[field] = mins != null ? { state: mins, attributes: { unit_of_measurement: 'min' } } : null;
  }

  // Doors — all LOCKED → "locked", any other → "unlocked"
  const doors     = status.doors || {};
  const doorVals  = Object.values(doors).filter(v => v && typeof v === 'object');
  s.doors_locked  = doorVals.length
    ? { state: doorVals.every(v => v.status === 'LOCKED') ? 'locked' : 'unlocked', attributes: {} }
    : null;

  // Location
  const lat = location.latitude;
  const lng = location.longitude;
  s.location = (lat != null && lng != null)
    ? { state: 'home', attributes: { latitude: lat, longitude: lng, last_updated: _ts(location.timeStamp) } }
    : null;

  // Tire pressures
  const tyreMap = {};
  for (const t of (vi.tyrePressure || [])) {
    if (t && t.type) tyreMap[t.type] = t;
  }
  for (const [pos, field] of [
    ['FL', 'tire_pressure_fl'], ['FR', 'tire_pressure_fr'],
    ['RL', 'tire_pressure_rl'], ['RR', 'tire_pressure_rr'],
  ]) {
    const t = tyreMap[pos];
    if (t) {
      const p = t.pressure || {};
      s[field]             = { state: p.value, attributes: { unit_of_measurement: p.unit || 'psi' } };
      s[`${field}_warning`] = { state: t.warning ? 'on' : 'off', attributes: {} };
    } else {
      s[field]             = null;
      s[`${field}_warning`] = null;
    }
  }

  // A/C — ignition status signals A/C active
  s.ac_status = { state: ev.ignitionStatus === 'ON' ? 'on' : 'off', attributes: {} };

  // EV motor running
  const evR = _sg(status, 'evRunning', 'status');
  s.ev_running = { state: evR === 'ON' ? 'on' : 'off', attributes: {} };

  // Not available from Stellantis API
  s.stolen_status = null;
  s.health_report = null;

  // Charge speed preference
  const chargePref = ev.chargePowerPreference;
  s.charge_speed = chargePref
    ? { state: chargePref, attributes: { options: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'] } }
    : null;

  // Timestamps
  s.last_info_update     = info.timestamp       ? { state: _ts(info.timestamp),       attributes: {} } : null;
  s.last_location_update = location.timeStamp   ? { state: _ts(location.timeStamp),   attributes: {} } : null;

  return {
    vehicle_name:       vehicleName,
    sensors:            s,
    available_commands: Object.keys(COMMAND_MAP),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout — persisted in localStorage (replaces /api/layout)
// ─────────────────────────────────────────────────────────────────────────────

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.widgets)) return mergeNewDefaults(data);
    }
  } catch { /* fall through to default */ }
  return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
}

function mergeNewDefaults(saved) {
  // Append any widgets from DEFAULT_LAYOUT that aren't in the saved layout yet,
  // so new widgets appear automatically after an app update.
  const widgets    = saved.widgets.filter(w => w.id !== 'commands');
  const existingIds = new Set(widgets.map(w => w.id));
  let nextY        = Math.max(...widgets.map(w => w.y + w.h), 0);
  for (const dw of DEFAULT_LAYOUT.widgets) {
    if (!existingIds.has(dw.id)) {
      const w = JSON.parse(JSON.stringify(dw));
      w.y = nextY;
      nextY += w.h;
      widgets.push(w);
    }
  }
  saved.widgets = widgets;
  return saved;
}

function saveLayout(data) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(data));
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard grid (GridStack-backed, driven by layout in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

function buildWidgetEl(w) {
  const item = document.createElement('div');
  item.className = 'grid-stack-item';
  item.setAttribute('gs-x', w.x);
  item.setAttribute('gs-y', w.y);
  item.setAttribute('gs-w', w.w);
  item.setAttribute('gs-h', w.h);
  item.setAttribute('gs-id', w.id);
  const min = WIDGET_MIN_SIZE[w.type] || { w: 1, h: 1 };
  item.setAttribute('gs-min-w', min.w);
  item.setAttribute('gs-min-h', min.h);

  const content = document.createElement('div');
  content.className = 'grid-stack-item-content widget-' + w.type;
  content.dataset.widgetId = w.id;

  const tpl = document.getElementById('tpl-' + w.type);
  if (tpl) content.appendChild(tpl.content.cloneNode(true));

  item.appendChild(content);
  return item;
}

function buildViewGrid() {
  if (liveGrid) { liveGrid.destroy(false); liveGrid = null; }
  const container = document.getElementById('dashboard-grid');
  container.innerHTML = '';

  const columns = isLandscape ? 10 : 4;

  currentLayout.widgets
    .filter(w => w.type !== 'command_button' && w.visible !== false)
    .filter(w => !isLandscape || w.id === 'hero' || LANDSCAPE_POSITIONS[w.id])
    .forEach(w => {
      // In landscape apply position overrides (we never persist these overrides).
      const display = (isLandscape && LANDSCAPE_POSITIONS[w.id])
        ? { ...w, ...LANDSCAPE_POSITIONS[w.id] }
        : w;
      container.appendChild(buildWidgetEl(display));
    });

  liveGrid = GridStack.init(
    { column: columns, cellHeight: 56, margin: 6, staticGrid: true, float: true },
    container
  );

  buildCommandBar(false);
  if (lastSnapshot) applySnapshotToDom(lastSnapshot);
}

// ─────────────────────────────────────────────────────────────────────────────
// Command bar — order sync (called after drag-to-reorder in edit mode)
// ─────────────────────────────────────────────────────────────────────────────

function syncCommandBarOrder() {
  const bar   = document.getElementById('command-bar');
  const inner = bar.querySelector('.command-bar-inner') || bar;
  const newOrder = [...inner.querySelectorAll('.cmd-tile-wrap')].map(w => w.dataset.widgetId);
  const byId    = Object.fromEntries(currentLayout.widgets.map(w => [w.id, w]));
  const nonCmd  = currentLayout.widgets.filter(w => w.type !== 'command_button');
  const reordered = newOrder.map(id => byId[id]).filter(Boolean);
  currentLayout.widgets = [...nonCmd, ...reordered];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixed bottom command row
// ─────────────────────────────────────────────────────────────────────────────

function buildCommandBar(editable) {
  const bar = document.getElementById('command-bar');
  bar.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'command-bar-inner';
  bar.appendChild(inner);

  currentLayout.widgets
    .filter(w => w.type === 'command_button')
    .filter(w => editable || w.visible !== false)
    .forEach(w => {
      const wrap = document.createElement('div');
      wrap.className = 'cmd-tile-wrap';
      wrap.dataset.widgetId = w.id;

      const tpl = document.getElementById('tpl-command_button');
      wrap.appendChild(tpl.content.cloneNode(true));
      wrap.classList.toggle('widget-hidden', editable && w.visible === false);

      if (editable) {
        const eyeBtn = document.createElement('button');
        eyeBtn.className = 'widget-eye-btn cmd-tile-eye';
        eyeBtn.innerHTML = eyeIcon(w.visible !== false);
        eyeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          w.visible = w.visible === false ? true : false;
          wrap.classList.toggle('widget-hidden', w.visible === false);
          eyeBtn.innerHTML = eyeIcon(w.visible !== false);
        });
        wrap.appendChild(eyeBtn);

        // Drag-to-reorder (touch + mouse)
        enableCmdTileDrag(wrap, inner);
      }

      inner.appendChild(wrap);
    });

  if (lastSnapshot) applySnapshotToDom(lastSnapshot);
}

function enableCmdTileDrag(wrap, bar) {
  // ── Mouse / pointer drag ──────────────────────────────────────────────────
  wrap.setAttribute('draggable', 'true');

  wrap.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', wrap.dataset.widgetId);
    setTimeout(() => wrap.classList.add('cmd-dragging'), 0);
  });
  wrap.addEventListener('dragend', () => {
    wrap.classList.remove('cmd-dragging');
    bar.querySelectorAll('.cmd-tile-wrap').forEach(w => w.classList.remove('cmd-drag-over'));
  });
  wrap.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    bar.querySelectorAll('.cmd-tile-wrap').forEach(w => w.classList.remove('cmd-drag-over'));
    wrap.classList.add('cmd-drag-over');
  });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('cmd-drag-over'));
  wrap.addEventListener('drop', e => {
    e.preventDefault();
    wrap.classList.remove('cmd-drag-over');
    const srcId  = e.dataTransfer.getData('text/plain');
    const srcEl  = bar.querySelector(`[data-widget-id="${srcId}"]`);
    if (srcEl && srcEl !== wrap) {
      const wraps  = [...bar.querySelectorAll('.cmd-tile-wrap')];
      const srcIdx = wraps.indexOf(srcEl);
      const dstIdx = wraps.indexOf(wrap);
      bar.insertBefore(srcEl, srcIdx < dstIdx ? wrap.nextSibling : wrap);
      syncCommandBarOrder();
    }
  });

  // ── Touch drag ────────────────────────────────────────────────────────────
  // On Android the command bar is horizontally scrollable, so a drag must not
  // start on plain touchstart or every swipe would be swallowed. Instead the
  // drag arms on a long press (and cancels if the finger moves first), which
  // matches the platform convention for touch reordering.
  const LONG_PRESS_MS = 250;
  const MOVE_CANCEL_PX = 10;

  let touchSrc = null, touchClone = null;
  let pressTimer = null, startX = 0, startY = 0, dragArmed = false;

  function clearPressTimer() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  }

  function beginTouchDrag() {
    dragArmed = true;
    touchSrc = wrap;
    wrap.classList.add('cmd-dragging');
    touchClone = wrap.cloneNode(true);
    touchClone.style.cssText = `position:fixed;pointer-events:none;opacity:0.7;z-index:200;width:${wrap.offsetWidth}px;height:${wrap.offsetHeight}px;`;
    document.body.appendChild(touchClone);
    const r = wrap.getBoundingClientRect();
    touchClone.style.left = r.left + 'px';
    touchClone.style.top  = r.top  + 'px';
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function endTouchDrag() {
    clearPressTimer();
    if (touchClone) { touchClone.remove(); touchClone = null; }
    wrap.classList.remove('cmd-dragging');
    bar.querySelectorAll('.cmd-tile-wrap').forEach(w => w.classList.remove('cmd-drag-over'));
    touchSrc = null;
    dragArmed = false;
  }

  wrap.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    dragArmed = false;
    clearPressTimer();
    pressTimer = setTimeout(beginTouchDrag, LONG_PRESS_MS);
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (!dragArmed) {
      // Finger moved before the long press completed — treat it as a scroll.
      if (Math.abs(t.clientX - startX) > MOVE_CANCEL_PX ||
          Math.abs(t.clientY - startY) > MOVE_CANCEL_PX) {
        clearPressTimer();
      }
      return;
    }
    if (!touchSrc || !touchClone) return;
    if (e.cancelable) e.preventDefault();
    touchClone.style.left = (t.clientX - wrap.offsetWidth  / 2) + 'px';
    touchClone.style.top  = (t.clientY - wrap.offsetHeight / 2) + 'px';
    // Highlight drop target
    touchClone.style.display = 'none';
    const el = document.elementFromPoint(t.clientX, t.clientY);
    touchClone.style.display = '';
    bar.querySelectorAll('.cmd-tile-wrap').forEach(w => w.classList.remove('cmd-drag-over'));
    const target = el?.closest('.cmd-tile-wrap');
    if (target && target !== touchSrc) target.classList.add('cmd-drag-over');
  }, { passive: false });

  wrap.addEventListener('touchend', e => {
    if (!dragArmed || !touchSrc || !touchClone) { endTouchDrag(); return; }
    const t = e.changedTouches[0];
    // Suppress the click that would otherwise fire the command after a drag.
    if (e.cancelable) e.preventDefault();

    touchClone.style.display = 'none';
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const target = el?.closest('.cmd-tile-wrap');
    const src = touchSrc;
    endTouchDrag();

    if (target && target !== src) {
      const wraps  = [...bar.querySelectorAll('.cmd-tile-wrap')];
      const srcIdx = wraps.indexOf(src);
      const dstIdx = wraps.indexOf(target);
      bar.insertBefore(src, srcIdx < dstIdx ? target.nextSibling : target);
      syncCommandBarOrder();
    }
  }, { passive: false });

  wrap.addEventListener('touchcancel', endTouchDrag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit-layout mode
// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('edit-layout-btn').addEventListener('click', enterEditMode);
document.getElementById('edit-done-btn').addEventListener('click', exitEditModeAndSave);

function eyeIcon(visible) {
  return visible
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.86 21.86 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>';
}

function enterEditMode() {
  document.getElementById('app').classList.add('editing');
  if (liveGrid) { liveGrid.destroy(false); liveGrid = null; }

  const container = document.getElementById('dashboard-grid');
  container.innerHTML = '';

  currentLayout.widgets
    .filter(w => w.type !== 'command_button')
    .forEach(w => {
      const el      = buildWidgetEl(w);
      const content = el.querySelector('.grid-stack-item-content');
      content.classList.toggle('widget-hidden', w.visible === false);

      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'widget-eye-btn';
      eyeBtn.innerHTML = eyeIcon(w.visible !== false);
      eyeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        w.visible = w.visible === false ? true : false;
        content.classList.toggle('widget-hidden', w.visible === false);
        eyeBtn.innerHTML = eyeIcon(w.visible !== false);
      });
      content.appendChild(eyeBtn);
      container.appendChild(el);
    });

  editGrid = GridStack.init(
    { column: 4, cellHeight: 56, margin: 6, staticGrid: false, float: true, alwaysShowResizeHandle: 'mobile' },
    container
  );

  buildCommandBar(true);
  if (lastSnapshot) applySnapshotToDom(lastSnapshot);
}

function exitEditModeAndSave() {
  if (!editGrid) return;
  const saved = editGrid.save(false); // [{x,y,w,h,id,...}]
  saved.forEach(item => {
    const w = currentLayout.widgets.find(w => w.id === item.id);
    if (w) { w.x = item.x; w.y = item.y; w.w = item.w; w.h = item.h; }
  });

  document.getElementById('app').classList.remove('editing');
  editGrid.destroy(false);
  editGrid = null;

  saveLayout(currentLayout);
  showToast('Layout saved');
  buildViewGrid();
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget renderers
// ─────────────────────────────────────────────────────────────────────────────

function num(sensor) {
  if (!sensor || sensor.state == null) return null;
  const n = parseFloat(sensor.state);
  return Number.isNaN(n) ? null : n;
}

function render(snapshot) {
  lastSnapshot = snapshot;
  applySnapshotToDom(snapshot);
}

function applySnapshotToDom(snapshot) {
  document.getElementById('vehicle-name').textContent = snapshot.vehicle_name || 'Charger';
  const s = snapshot.sensors || {};

  currentLayout.widgets.forEach(w => {
    const el = document.querySelector(`[data-widget-id="${w.id}"]`);
    if (!el) return;

    if      (w.type === 'hero')           renderHero(el, s);
    else if (w.type === 'stat')           renderStat(el, w, s);
    else if (w.type === 'lock_status')    renderLockStatus(el, w, s);
    else if (w.type === 'binary_status')  renderBinaryStatus(el, w, s);
    else if (w.type === 'timestamp')      renderTimestamp(el, w, s);
    else if (w.type === 'select_cycle')   renderSelectCycle(el, w, s);
    else if (w.type === 'tire_grid')      renderTireGrid(el, s);
    else if (w.type === 'location')       renderLocation(el, s);
    else if (w.type === 'charge_times')   renderChargeTimes(el, s);
    else if (w.type === 'command_button') renderCommandButton(el, w, snapshot.available_commands || []);
  });
}

function renderHero(root, s) {
  const soc = num(s.state_of_charge);

  // SoC percentage above battery
  const pctEl = root.querySelector('[data-role="batt-pct-val"]');
  if (pctEl) pctEl.textContent = soc != null ? Math.round(soc) : '--';

  // Battery fill height (bottom up)
  const fillEl = root.querySelector('[data-role="batt-fill"]');
  if (fillEl) fillEl.style.height = soc != null ? Math.min(Math.max(soc, 0), 100) + '%' : '0%';

  // kWh — calculated as soc% × user-configured battery capacity
  const kwhEl = root.querySelector('[data-role="batt-kwh"]');
  if (kwhEl) {
    const cap = getBatteryCapacity();
    if (soc != null && cap != null) {
      kwhEl.textContent = (soc / 100 * cap).toFixed(1) + ' kWh';
      kwhEl.style.display = '';
    } else {
      kwhEl.style.display = 'none';
    }
  }

  // Charge port + charging status — fill both portrait and landscape elements
  const charging  = s.charging_status?.state === 'on';
  const pluggedIn = s.plugged_in?.state === 'on';
  const line1Text = pluggedIn ? 'Plugged In'    : 'Unplugged';
  const line2Text = charging  ? 'Charging'      : 'Not Charging';

  // Portrait charge status (hero-left, hidden in landscape via CSS)
  const portraitStatusEl = root.querySelector('[data-role="batt-charge-status"]');
  const pLine1 = root.querySelector('[data-role="charge-line1"]');
  const pLine2 = root.querySelector('[data-role="charge-line2"]');
  if (pLine1) pLine1.textContent = line1Text;
  if (pLine2) pLine2.textContent = line2Text;
  if (portraitStatusEl) portraitStatusEl.classList.toggle('active', charging);

  // Landscape charge status (hero-right top, hidden in portrait via CSS)
  const lsStatusEl = root.querySelector('[data-role="landscape-charge-status"]');
  const lLine1 = root.querySelector('[data-role="landscape-charge-line1"]');
  const lLine2 = root.querySelector('[data-role="landscape-charge-line2"]');
  if (lLine1) lLine1.textContent = line1Text;
  if (lLine2) lLine2.textContent = line2Text;
  if (lsStatusEl) lsStatusEl.classList.toggle('active', charging);

  // Configurable hero-right items — rebuild only mini-stat items, preserve landscape-status
  const container = root.querySelector('[data-role="hero-right-items"]');
  if (container) {
    container.querySelectorAll('.hero-mini-stat').forEach(el => el.remove());
    const selectedIds = getHeroRightItems();
    selectedIds.forEach(id => {
      const opt = HERO_RIGHT_OPTIONS.find(o => o.id === id);
      if (!opt) return;
      const item = document.createElement('div');
      item.className = 'hero-mini-stat';
      item.dataset.heroItemId = id;
      const label = document.createElement('div');
      label.className = 'hero-mini-label';
      label.textContent = opt.label;
      const value = document.createElement('div');
      value.className = 'hero-mini-value';
      value.textContent = opt.render(s);
      item.appendChild(label);
      item.appendChild(value);
      container.appendChild(item);
    });
  }
}

function renderStat(root, w, s) {
  root.querySelector('[data-role="label"]').textContent = w.label || w.field;
  const sensor = s[w.field];
  const v      = num(sensor);
  const valEl  = root.querySelector('[data-role="value"]');
  if (v == null) { valEl.textContent = '--'; return; }
  let unit = sensor.attributes?.unit_of_measurement || w.unit_fallback || '';
  let displayV = v;
  if ((w.field === 'odometer' || w.field === 'range') && unit === 'km' && getUnits() === 'imperial') {
    displayV = v * 0.621371;
    unit = 'mi';
  }
  if      (w.field === 'odometer')    valEl.textContent = `${Math.round(displayV).toLocaleString()} ${unit}`.trim();
  else if (w.field === 'battery_12v') valEl.textContent = `${v}${unit}`;
  else if (w.field === 'range')       valEl.textContent = `${displayV.toFixed(1)} ${unit}`.trim();
  else                                valEl.textContent = `${displayV} ${unit}`.trim();
}

function renderLockStatus(root, w, s) {
  root.querySelector('[data-role="label"]').textContent = w.label || 'Doors';
  const sensor = s[w.field];
  const valEl  = root.querySelector('[data-role="value"]');
  if (!sensor) { valEl.textContent = '--'; valEl.classList.remove('warn'); return; }
  const locked = sensor.state === 'locked';
  valEl.textContent = locked ? 'Locked' : 'Unlocked';
  valEl.classList.toggle('warn', !locked);
}

function renderTireGrid(root, s) {
  const wheels = [
    ['fl', 'tire_pressure_fl', 'tire_pressure_fl_warning'],
    ['fr', 'tire_pressure_fr', 'tire_pressure_fr_warning'],
    ['rl', 'tire_pressure_rl', 'tire_pressure_rl_warning'],
    ['rr', 'tire_pressure_rr', 'tire_pressure_rr_warning'],
  ];
  wheels.forEach(([pos, sensorKey, warnKey]) => {
    const el = root.querySelector(`.tire-cell[data-wheel="${pos}"] .tire-psi`);
    if (!el) return;
    const sensor = s[sensorKey];
    const v      = num(sensor);
    if (v == null) { el.textContent = '--'; return; }
    const rawUnit = sensor.attributes?.unit_of_measurement || 'kPa';
    let displayPsi  = v;
    let displayUnit = rawUnit;
    if (getPressureUnits() === 'psi' && rawUnit === 'kPa') {
      displayPsi  = v * 0.145038;
      displayUnit = 'psi';
    }
    el.textContent = `${Math.round(displayPsi)} ${displayUnit}`;
    el.classList.toggle('warn', s[warnKey]?.state === 'on');
  });
}

function renderBinaryStatus(root, w, s) {
  root.querySelector('[data-role="label"]').textContent = w.label || w.field;
  const sensor = s[w.field];
  const valEl  = root.querySelector('[data-role="value"]');
  if (!sensor) { valEl.textContent = '--'; valEl.classList.remove('warn'); return; }
  const on        = sensor.state === 'on';
  valEl.textContent = on ? (w.on_text || 'On') : (w.off_text || 'Off');
  const warnState = w.warn_when === 'on' ? on : w.warn_when === 'off' ? !on : false;
  valEl.classList.toggle('warn', warnState);
}

function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now     = new Date();
  const diffMin = Math.round((now - d) / 60000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderTimestamp(root, w, s) {
  root.querySelector('[data-role="label"]').textContent = w.label || w.field;
  const valEl   = root.querySelector('[data-role="value"]');
  const sensor  = s[w.field];
  valEl.textContent = (sensor?.state ? formatTimestamp(sensor.state) : null) || '--';
}

const CHARGE_LEVEL_WORDS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7 };

function prettyChargeLevel(opt) {
  if (!opt) return '--';
  const m = opt.match(/^LEVEL_(\w+)$/i);
  if (m && CHARGE_LEVEL_WORDS[m[1].toUpperCase()]) return String(CHARGE_LEVEL_WORDS[m[1].toUpperCase()]);
  return opt.replace(/_/g, ' ');
}

function renderSelectCycle(root, w, s) {
  root.querySelector('[data-role="label"]').textContent = w.label || w.field;
  const sensor  = s[w.field];
  const valEl   = root.querySelector('[data-role="value"]');
  const prevBtn = root.querySelector('[data-role="prev"]');
  const nextBtn = root.querySelector('[data-role="next"]');

  if (w.read_only) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    valEl.textContent = sensor ? prettyChargeLevel(sensor.state) : '--';
    return;
  }

  if (!sensor) {
    valEl.textContent = '--';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const options = sensor.attributes?.options || [];
  const current = sensor.state;
  valEl.textContent = prettyChargeLevel(current);
  const idx = options.indexOf(current);

  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx === -1 || idx >= options.length - 1;

  prevBtn.onclick = () => idx > 0                              && setChargeSpeed(options[idx - 1]);
  nextBtn.onclick = () => idx >= 0 && idx < options.length - 1 && setChargeSpeed(options[idx + 1]);
}

async function setChargeSpeed(option) {
  try {
    await window.Charger.vehicleApi.setChargePreference(currentVin, option);
    showToast(`Charge speed: ${prettyChargeLevel(option)}`);
    fetchAndRender();
  } catch {
    showToast('Failed to set charge speed');
  }
}

// Apple Maps only exists on Apple platforms; Android needs a geo: URI (which
// opens the user's default map app) and everything else falls back to the
// Google Maps web URL, which works in any browser.
function mapsUrl(lat, lon) {
  const ua = navigator.userAgent || '';
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(ua);
  if (isApple) return `https://maps.apple.com/?ll=${lat},${lon}`;
  if (/Android/.test(ua)) return `geo:${lat},${lon}?q=${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function renderLocation(root, s) {
  const loc  = s.location;
  const link = root.querySelector('[data-role="link"]');
  const lat  = loc?.attributes?.latitude;
  const lon  = loc?.attributes?.longitude;
  if (lat != null && lon != null) {
    link.href = mapsUrl(lat, lon);
    root.querySelector('[data-role="updated"]').textContent = '';
  } else {
    link.removeAttribute('href');
    root.querySelector('[data-role="updated"]').textContent = 'no data';
  }
}

function formatMinutes(mins) {
  if (mins == null) return '--';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function renderChargeTimes(root, s) {
  const fields = [
    ['l1', 'time_to_full_l1'],
    ['l2', 'time_to_full'],
    ['l3', 'time_to_full_l3'],
  ];
  fields.forEach(([role, field]) => {
    const el     = root.querySelector(`[data-role="${role}"]`);
    if (!el) return;
    const sensor = s[field];
    const v      = num(sensor);
    el.textContent = v != null ? formatMinutes(v) : '--';
  });
}

function renderCommandButton(root, w, availableCommands) {
  const name = w.command;
  const btn  = root.querySelector('[data-role="btn"]');
  root.querySelector('[data-role="icon"]').innerHTML  = ICONS[name] || '';
  root.querySelector('[data-role="label"]').textContent = COMMAND_LABELS[name] || name;

  const available = availableCommands.includes(name);
  btn.classList.toggle('unavailable', !available);
  if (btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => {
    if (!btn.classList.contains('unavailable')) runCommand(name, btn);
    else showToast(`${COMMAND_LABELS[name] || name} is not available`);
  });
}

async function runCommand(name, btn) {
  const uconnectCmd = COMMAND_MAP[name];
  if (!uconnectCmd) {
    showToast(`${COMMAND_LABELS[name] || name} is not available`);
    return;
  }
  btn.classList.add('pending');
  try {
    await window.Charger.vehicleApi.sendCommand(currentVin, uconnectCmd);
    showToast(`${COMMAND_LABELS[name] || name} sent`);
  } catch {
    showToast(`Failed to send ${COMMAND_LABELS[name] || name}`);
  } finally {
    setTimeout(() => btn.classList.remove('pending'), 1200);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings screen
// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('settings-btn').addEventListener('click', openInfo);
document.getElementById('settings-close-btn').addEventListener('click', closeInfo);
document.getElementById('settings-logout-btn').addEventListener('click', doLogout);

function buildHeroRightSettings() {
  const container = document.getElementById('hero-right-settings');
  if (!container) return;
  container.innerHTML = '';

  const selected = getHeroRightItems();

  HERO_RIGHT_OPTIONS.forEach(opt => {
    const isSelected = selected.includes(opt.id);
    const atLimit    = !isSelected && selected.length >= 5;

    const label = document.createElement('label');
    label.className = 'hero-right-option' + (atLimit ? ' at-limit' : '');

    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked  = isSelected;
    cb.disabled = atLimit;

    cb.addEventListener('change', () => {
      const cur = getHeroRightItems();
      let next;
      if (cb.checked && !cur.includes(opt.id) && cur.length < 5) {
        next = [...cur, opt.id];
      } else if (!cb.checked) {
        next = cur.filter(id => id !== opt.id);
      } else {
        cb.checked = false;
        return;
      }
      saveHeroRightItems(next);
      buildHeroRightSettings();
      if (lastSnapshot) applySnapshotToDom(lastSnapshot);
    });

    label.appendChild(cb);
    label.appendChild(document.createTextNode(opt.label));
    container.appendChild(label);
  });
}

function openInfo() {
  document.getElementById('info-vehicle').textContent      = vehicleName;
  document.getElementById('info-vin').textContent          = currentVin || '--';
  document.getElementById('info-last-refresh').textContent = lastRefresh
    ? lastRefresh.toLocaleTimeString()
    : '--';

  refreshNativeSettings();

  // Populate vehicle name input
  document.getElementById('settings-vehicle-name').value = vehicleName;

  // Populate battery capacity input
  const cap = localStorage.getItem(BATTERY_KEY);
  document.getElementById('settings-battery-kwh').value = cap || '';

  // Populate photo section
  const photo       = getVehiclePhoto();
  const previewWrap = document.getElementById('settings-photo-preview-wrap');
  const previewImg  = document.getElementById('settings-photo-preview');
  const removeBtn   = document.getElementById('settings-remove-photo');
  if (photo) {
    if (previewImg)  previewImg.src           = photo;
    if (previewWrap) previewWrap.style.display = '';
    if (removeBtn)   removeBtn.style.display   = '';
  } else {
    if (previewWrap) previewWrap.style.display = 'none';
    if (removeBtn)   removeBtn.style.display   = 'none';
  }

  // Reflect current unit prefs
  const units = getUnits();
  document.querySelectorAll('#units-toggle .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === units);
  });
  const pressure = getPressureUnits();
  document.querySelectorAll('#pressure-toggle .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === pressure);
  });

  // Build hero-right settings UI
  buildHeroRightSettings();

  document.getElementById('settings-screen').classList.add('open');
}

function closeInfo() {
  document.getElementById('settings-screen').classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────────────────
// Service worker registration
// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('settings-reset-layout').addEventListener('click', () => {
  localStorage.removeItem(LAYOUT_KEY);
  currentLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  saveLayout(currentLayout);
  closeInfo();
  buildViewGrid();
  showToast('Layout reset to defaults');
});

// ─────────────────────────────────────────────────────────────────────────────
// Settings — unit toggles + vehicle name
// ─────────────────────────────────────────────────────────────────────────────

document.querySelectorAll('#units-toggle .toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    localStorage.setItem(UNITS_KEY, btn.dataset.value);
    document.querySelectorAll('#units-toggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn));
    if (lastSnapshot) applySnapshotToDom(lastSnapshot);
  });
});

document.querySelectorAll('#pressure-toggle .toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    localStorage.setItem(PRESSURE_KEY, btn.dataset.value);
    document.querySelectorAll('#pressure-toggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn));
    if (lastSnapshot) applySnapshotToDom(lastSnapshot);
  });
});

document.getElementById('settings-save-battery').addEventListener('click', () => {
  const raw = document.getElementById('settings-battery-kwh').value.trim();
  const v   = parseFloat(raw);
  if (raw === '') {
    localStorage.removeItem(BATTERY_KEY);
  } else if (Number.isFinite(v) && v > 0) {
    localStorage.setItem(BATTERY_KEY, v);
  } else {
    return; // invalid input — do nothing
  }
  if (lastSnapshot) applySnapshotToDom(lastSnapshot);
  showToast('Battery capacity saved');
});

document.getElementById('settings-choose-photo').addEventListener('click', () => {
  document.getElementById('settings-photo-input').click();
});

document.getElementById('settings-photo-input').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else                { width  = Math.round(width  * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem(PHOTO_KEY, dataUrl);
      applyVehiclePhoto();
      const previewWrap = document.getElementById('settings-photo-preview-wrap');
      const previewImg  = document.getElementById('settings-photo-preview');
      const removeBtn   = document.getElementById('settings-remove-photo');
      if (previewImg)  previewImg.src           = dataUrl;
      if (previewWrap) previewWrap.style.display = '';
      if (removeBtn)   removeBtn.style.display   = '';
      showToast('Photo saved');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = ''; // allow re-selecting the same file
});

document.getElementById('settings-remove-photo').addEventListener('click', () => {
  localStorage.removeItem(PHOTO_KEY);
  applyVehiclePhoto();
  const previewWrap = document.getElementById('settings-photo-preview-wrap');
  const previewImg  = document.getElementById('settings-photo-preview');
  const removeBtn   = document.getElementById('settings-remove-photo');
  if (previewWrap) previewWrap.style.display = 'none';
  if (previewImg)  previewImg.src            = '';
  if (removeBtn)   removeBtn.style.display   = 'none';
  showToast('Photo removed');
});

document.getElementById('settings-save-name').addEventListener('click', () => {
  const newName = document.getElementById('settings-vehicle-name').value.trim();
  if (!newName) return;
  vehicleName = newName;
  localStorage.setItem(VNAME_KEY, newName);
  document.getElementById('info-vehicle').textContent = newName;
  if (lastSnapshot) {
    lastSnapshot.vehicle_name = newName;
    applySnapshotToDom(lastSnapshot);
  }
  showToast('Vehicle name saved');
});

// ─────────────────────────────────────────────────────────────────────────────
// Native mode: credentials, synced folder, driving history
// ─────────────────────────────────────────────────────────────────────────────

async function refreshNativeSettings() {
  const wrap = document.getElementById('native-settings');
  if (!wrap || !window.Charger) return;

  wrap.style.display = '';

  const configured = await window.Charger.credentials.isConfigured();
  document.getElementById('connection-mode-value').textContent =
    configured ? 'Connected directly to Stellantis' : 'Not connected';
  document.getElementById('settings-uconnect-btn').textContent = configured ? 'Change' : 'Set up';

  const folder = await window.Charger.historyStore.folderName();
  document.getElementById('folder-status-value').textContent = folder || 'Not set';
  document.getElementById('settings-folder-btn').textContent = folder ? 'Change' : 'Choose';

  const soundEnabled = await window.Charger.startupSound.isEnabled();
  const soundBtn = document.getElementById('settings-startup-sound-btn');
  soundBtn.textContent = soundEnabled ? 'On' : 'Off';
  soundBtn.setAttribute('aria-pressed', String(soundEnabled));
}

function openUconnectSetup() {
  document.getElementById('uconnect-error').textContent = '';
  document.getElementById('uconnect-screen').classList.add('visible');
  if (!window.Charger) return;
  // Pre-fill the identifying fields, but never the password or PIN.
  window.Charger.credentials.get('uconnect_email').then(v => {
    if (v) document.getElementById('uconnect-email').value = v;
  });
}

function closeUconnectSetup() {
  document.getElementById('uconnect-screen').classList.remove('visible');
}

async function saveUconnectCredentials(e) {
  e.preventDefault();
  const email = document.getElementById('uconnect-email').value.trim();
  const password = document.getElementById('uconnect-password').value;
  const pin = document.getElementById('uconnect-pin').value.trim();
  const errorEl = document.getElementById('uconnect-error');
  const saveBtn = document.getElementById('uconnect-save');

  errorEl.textContent = '';
  saveBtn.disabled = true;
  saveBtn.textContent = 'Verifying…';

  try {
    // Verify before saving so a typo surfaces here rather than as a silently
    // broken dashboard later.
    await window.Charger.vehicleApi.verifyDirectCredentials(email, password);
    await window.Charger.credentials.set('uconnect_email', email);
    await window.Charger.credentials.set('uconnect_password', password);
    if (pin) await window.Charger.credentials.set('uconnect_pin', pin);

    showToast('Connected to your vehicle account');
    closeUconnectSetup();
    await refreshNativeSettings();

    stopPolling();
    currentVin = null;
    localStorage.removeItem(VIN_KEY);
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    await initApp();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not sign in';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Verify & Save';
  }
}

async function clearUconnectCredentials() {
  await window.Charger.credentials.remove('uconnect_email');
  await window.Charger.credentials.remove('uconnect_password');
  await window.Charger.credentials.remove('uconnect_pin');
  await window.Charger.credentials.remove('session_session');
  showToast('Credentials removed');
  closeUconnectSetup();
  await refreshNativeSettings();
}

async function chooseHistoryFolder() {
  try {
    await window.Charger.historyStore.chooseFolder();
    showToast('History folder set');
    await refreshNativeSettings();
    updateHistoryButton();
  } catch (err) {
    showToast(err.message || 'Could not set folder');
  }
}

async function updateHistoryButton() {
  const btn = document.getElementById('history-btn');
  if (!btn || !window.Charger) return;
  const ready = window.Charger.folderAvailable && await window.Charger.historyStore.isReady();
  btn.style.display = ready ? '' : 'none';
}

// ─── History screen ──────────────────────────────────────────────────────────

let historyRangeDays = 7;

function fmtDistance(km) {
  if (km == null) return '--';
  return getUnits() === 'imperial'
    ? `${(km * 0.621371).toFixed(1)} mi`
    : `${km.toFixed(1)} km`;
}

function fmtEfficiency(kmPerKwh) {
  if (kmPerKwh == null) return '--';
  return getUnits() === 'imperial'
    ? `${(kmPerKwh * 0.621371).toFixed(1)} mi/kWh`
    : `${kmPerKwh.toFixed(1)} km/kWh`;
}

function fmtDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

async function openHistory() {
  document.getElementById('history-screen').classList.add('visible');
  await renderHistory();
}

function closeHistory() {
  document.getElementById('history-screen').classList.remove('visible');
}

async function renderHistory() {
  const summaryEl = document.getElementById('history-summary');
  const tripsEl   = document.getElementById('history-trips');
  const chargesEl = document.getElementById('history-charges');

  summaryEl.innerHTML = '<div class="history-empty">Loading…</div>';
  tripsEl.innerHTML = '';
  chargesEl.innerHTML = '';

  const batteryKwh = parseFloat(localStorage.getItem(BATTERY_KEY)) || null;
  const sinceMs = historyRangeDays ? Date.now() - historyRangeDays * 86400000 : undefined;

  let data;
  try {
    data = await window.Charger.loadHistory({ sinceMs, batteryKwh });
  } catch (err) {
    summaryEl.innerHTML = `<div class="history-empty">Could not read history: ${err.message}</div>`;
    return;
  }

  const s = data.summary;
  summaryEl.innerHTML = `
    <div class="stat-card"><div class="stat-label">Distance</div><div class="stat-value">${fmtDistance(s.distanceKm)}</div></div>
    <div class="stat-card"><div class="stat-label">Trips</div><div class="stat-value">${s.tripCount}</div></div>
    <div class="stat-card"><div class="stat-label">Efficiency</div><div class="stat-value">${fmtEfficiency(s.efficiencyKmPerKwh)}</div></div>
    <div class="stat-card"><div class="stat-label">Energy added</div><div class="stat-value">${s.kwhAdded != null ? s.kwhAdded.toFixed(1) + ' kWh' : '--'}</div></div>
  `;

  if (!data.trips.length) {
    tripsEl.innerHTML = '<div class="history-empty">No trips recorded yet. History builds up while the app runs.</div>';
  } else {
    tripsEl.innerHTML = data.trips.slice().reverse().map(t => `
      <div class="history-row">
        <div class="history-row-main">
          <div class="history-row-title">${fmtDistance(t.distanceKm)}</div>
          <div class="history-row-sub">${new Date(t.start).toLocaleString()} · ${fmtDuration(t.end - t.start)}</div>
        </div>
        <div class="history-row-value">${t.startSoc != null && t.endSoc != null ? `${Math.round(t.startSoc)}% → ${Math.round(t.endSoc)}%` : ''}</div>
      </div>
    `).join('');
  }

  if (!data.sessions.length) {
    chargesEl.innerHTML = '<div class="history-empty">No charge sessions recorded yet.</div>';
  } else {
    chargesEl.innerHTML = data.sessions.slice().reverse().map(c => `
      <div class="history-row">
        <div class="history-row-main">
          <div class="history-row-title">+${Math.round(c.endSoc - c.startSoc)}%</div>
          <div class="history-row-sub">${new Date(c.start).toLocaleString()} · ${fmtDuration(c.end - c.start)}</div>
        </div>
        <div class="history-row-value">${Math.round(c.startSoc)}% → ${Math.round(c.endSoc)}%</div>
      </div>
    `).join('');
  }
}

// ─── Native wiring ───────────────────────────────────────────────────────────

function initNativeUi() {
  if (!window.Charger) return;

  document.getElementById('history-btn')?.addEventListener('click', openHistory);
  document.getElementById('history-close-btn')?.addEventListener('click', closeHistory);
  document.getElementById('settings-uconnect-btn')?.addEventListener('click', openUconnectSetup);
  document.getElementById('uconnect-close-btn')?.addEventListener('click', closeUconnectSetup);
  document.getElementById('uconnect-form')?.addEventListener('submit', saveUconnectCredentials);
  document.getElementById('uconnect-clear')?.addEventListener('click', clearUconnectCredentials);
  document.getElementById('settings-folder-btn')?.addEventListener('click', chooseHistoryFolder);
  document.getElementById('settings-startup-sound-btn')?.addEventListener('click', async () => {
    const enabled = !(await window.Charger.startupSound.isEnabled());
    await window.Charger.startupSound.setEnabled(enabled);
    await refreshNativeSettings();
  });

  document.querySelectorAll('#history-range .toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#history-range .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      historyRangeDays = parseInt(btn.dataset.days, 10);
      await renderHistory();
    });
  });

  document.getElementById('login-direct-btn')?.addEventListener('click', openUconnectSetup);

  updateHistoryButton();
  refreshNativeSettings();
  playLaunchSplash();
  checkSession();
}

if (window.Charger?.ready) {
  initNativeUi();
} else {
  window.addEventListener('charger-native-ready', initNativeUi, { once: true });
}
