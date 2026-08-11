/**
 * Bridge between the ES-module libraries and app.js (a classic script).
 *
 * app.js is not a module, so rather than converting the whole file this exposes
 * a single window.Charger namespace that it can call.
 */

import { vehicleApi } from './vehicle-api.js';
import { credentials } from './credentials.js';
import { historyStore, isFolderAvailable } from './history.js';
import { recordSnapshot, loadHistory } from './recorder.js';
import { isNativeAndroid } from './transport.js';

const startupSoundPlugin = window.Capacitor?.Plugins?.StartupSound;

window.Charger = {
  isNative: isNativeAndroid(),
  folderAvailable: isFolderAvailable(),
  vehicleApi,
  credentials,
  historyStore,
  recordSnapshot,
  loadHistory,
  startupSound: {
    async isEnabled() {
      if (!startupSoundPlugin) return true;
      const { enabled } = await startupSoundPlugin.isEnabled();
      return !!enabled;
    },
    async setEnabled(enabled) {
      if (startupSoundPlugin) await startupSoundPlugin.setEnabled({ enabled });
    },
  },
};

// app.js may finish loading before or after this module (modules are deferred),
// so signal readiness both ways.
window.Charger.ready = true;
window.dispatchEvent(new CustomEvent('charger-native-ready'));
