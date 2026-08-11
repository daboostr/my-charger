package dev.charger.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;

/**
 * Gives the web layer access to one user-chosen folder via Android's Storage
 * Access Framework.
 *
 * Why SAF rather than a normal app folder: the user can point this at a
 * Google Drive / Dropbox / OneDrive folder, and that provider's own app then
 * syncs the history between devices. No server, and no cloud credentials in
 * this app. Scoped storage on Android 10+ also means SAF is the only way to
 * write into a folder the app doesn't own.
 *
 * The permission is persisted with takePersistableUriPermission so it survives
 * reboots and app updates; without that the user would have to re-pick the
 * folder on every launch.
 */
@CapacitorPlugin(name = "SyncedFolder")
public class SyncedFolderPlugin extends Plugin {

    private static final String PREFS = "charger_synced_folder";
    private static final String KEY_URI = "tree_uri";
    private static final String KEY_SUBFOLDER = "subfolder";

    private String pendingSubfolder = null;

    private String savedUri() {
        return getContext()
            .getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
            .getString(KEY_URI, null);
    }

    private void saveUri(String uri, String subfolder) {
        getContext()
            .getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_URI, uri)
            .putString(KEY_SUBFOLDER, subfolder)
            .apply();
    }

    private String savedSubfolder() {
        return getContext()
            .getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
            .getString(KEY_SUBFOLDER, null);
    }

    /** Resolves the working directory, creating the subfolder on first use. */
    private DocumentFile workingDir() {
        String uri = savedUri();
        if (uri == null) return null;

        DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uri));
        if (root == null || !root.canWrite()) return null;

        String sub = savedSubfolder();
        if (sub == null || sub.isEmpty()) return root;

        DocumentFile dir = root.findFile(sub);
        if (dir == null || !dir.isDirectory()) {
            dir = root.createDirectory(sub);
        }
        return dir;
    }

    @PluginMethod
    public void pickDirectory(PluginCall call) {
        pendingSubfolder = call.getString("subfolder", "charger-history");
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "directoryPicked");
    }

    @ActivityCallback
    private void directoryPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result.getData();
        if (data == null || data.getData() == null) {
            call.reject("No folder selected");
            return;
        }

        Uri treeUri = data.getData();
        // Persist across reboots, otherwise access is lost when the process dies.
        final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
        try {
            getContext().getContentResolver().takePersistableUriPermission(treeUri, flags);
        } catch (SecurityException e) {
            call.reject("Could not keep access to that folder: " + e.getMessage());
            return;
        }

        saveUri(treeUri.toString(), pendingSubfolder);

        DocumentFile dir = workingDir();
        if (dir == null) {
            call.reject("Selected folder is not writable");
            return;
        }

        JSObject ret = new JSObject();
        ret.put("uri", treeUri.toString());
        ret.put("displayName", displayNameFor(treeUri, dir));
        call.resolve(ret);
    }

    private String displayNameFor(Uri treeUri, DocumentFile dir) {
        String name = dir.getName();
        if (name != null && !name.isEmpty()) return name;
        String last = treeUri.getLastPathSegment();
        return last == null ? treeUri.toString() : last;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        DocumentFile dir = workingDir();
        ret.put("granted", dir != null);
        if (dir != null) ret.put("displayName", dir.getName());
        call.resolve(ret);
    }

    @PluginMethod
    public void forget(PluginCall call) {
        String uri = savedUri();
        if (uri != null) {
            try {
                getContext().getContentResolver().releasePersistableUriPermission(
                    Uri.parse(uri),
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                );
            } catch (SecurityException ignored) {
                // Permission may already be gone; clearing our own record is enough.
            }
        }
        getContext()
            .getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
            .edit().clear().apply();
        call.resolve();
    }

    /**
     * Appends one line to a file, creating it when missing.
     *
     * SAF has no real "append" mode across all providers, so this opens the
     * stream in "wa" mode where supported. Cloud-backed providers that reject
     * "wa" fall back to read-modify-write, which is slower but correct.
     */
    @PluginMethod
    public void appendLine(PluginCall call) {
        String fileName = call.getString("file");
        String line = call.getString("line");
        if (fileName == null || line == null) {
            call.reject("file and line are required");
            return;
        }

        DocumentFile dir = workingDir();
        if (dir == null) {
            call.reject("No folder has been chosen");
            return;
        }

        try {
            DocumentFile file = dir.findFile(fileName);
            if (file == null) {
                file = dir.createFile("application/x-ndjson", fileName);
                if (file == null) {
                    call.reject("Could not create " + fileName);
                    return;
                }
            }

            byte[] payload = (line + "\n").getBytes(StandardCharsets.UTF_8);
            boolean appended = false;
            try (OutputStream out = getContext().getContentResolver().openOutputStream(file.getUri(), "wa")) {
                if (out != null) {
                    out.write(payload);
                    appended = true;
                }
            } catch (Exception appendUnsupported) {
                appended = false;
            }

            if (!appended) {
                String existing = readFile(file);
                try (OutputStream out = getContext().getContentResolver().openOutputStream(file.getUri(), "wt")) {
                    if (out == null) {
                        call.reject("Could not open " + fileName + " for writing");
                        return;
                    }
                    out.write(existing.getBytes(StandardCharsets.UTF_8));
                    out.write(payload);
                }
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Write failed: " + e.getMessage());
        }
    }

    private String readFile(DocumentFile file) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (InputStream in = getContext().getContentResolver().openInputStream(file.getUri())) {
            if (in == null) return "";
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
        }
        return sb.toString();
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String fileName = call.getString("file");
        if (fileName == null) {
            call.reject("file is required");
            return;
        }

        DocumentFile dir = workingDir();
        if (dir == null) {
            call.reject("No folder has been chosen");
            return;
        }

        try {
            DocumentFile file = dir.findFile(fileName);
            JSObject ret = new JSObject();
            ret.put("content", file == null ? "" : readFile(file));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Read failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listFiles(PluginCall call) {
        DocumentFile dir = workingDir();
        if (dir == null) {
            call.reject("No folder has been chosen");
            return;
        }

        JSONArray names = new JSONArray();
        for (DocumentFile f : dir.listFiles()) {
            if (f.isFile() && f.getName() != null) names.put(f.getName());
        }

        JSObject ret = new JSObject();
        ret.put("files", names);
        call.resolve(ret);
    }
}
