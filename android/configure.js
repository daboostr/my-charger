/*
 * Fills android/twa-manifest.json with the deployed Pages host so the TWA
 * points at the real origin instead of the REPLACE_ME placeholder.
 *
 * Usage: node android/configure.js charger.pages.dev [packageId]
 *
 * Bubblewrap validates that host/iconUrl/webManifestUrl/fullScopeUrl all agree,
 * so they're rewritten together here rather than edited by hand.
 */

const fs = require('fs');
const path = require('path');

const host = (process.argv[2] || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const packageId = process.argv[3];

if (!host) {
  console.error('Usage: node android/configure.js <your-app.pages.dev> [packageId]');
  process.exit(1);
}

const manifestPath = path.join(__dirname, 'twa-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const origin = `https://${host}`;
manifest.host = host;
manifest.iconUrl = `${origin}/icons/icon-512.png`;
manifest.maskableIconUrl = `${origin}/icons/icon-512.png`;
manifest.webManifestUrl = `${origin}/manifest.json`;
manifest.fullScopeUrl = `${origin}/`;
if (packageId) manifest.packageId = packageId;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`twa-manifest.json configured for ${origin} (packageId: ${manifest.packageId})`);
console.log('Next: cd android && npx @bubblewrap/cli init --manifest twa-manifest.json && npx @bubblewrap/cli build');
