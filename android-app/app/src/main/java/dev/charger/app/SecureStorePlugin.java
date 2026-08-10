package dev.charger.app;

import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Stores Uconnect credentials in the Android Keystore-backed store.
 *
 * Backed by EncryptedSharedPreferences with an AES256-GCM master key held in
 * the Android Keystore, so the values are encrypted at rest and the key itself
 * is non-exportable (hardware-backed where the device supports it). Plain
 * localStorage would leave the vehicle password and PIN readable by anything
 * that could reach the WebView's data directory.
 */
@CapacitorPlugin(name = "SecureStore")
public class SecureStorePlugin extends Plugin {

    private SharedPreferences prefs;

    private SharedPreferences prefs() throws Exception {
        if (prefs == null) {
            MasterKey key = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();

            prefs = EncryptedSharedPreferences.create(
                getContext(),
                "charger_secure_prefs",
                key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        }
        return prefs;
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("key is required");
            return;
        }
        try {
            JSObject ret = new JSObject();
            ret.put("value", prefs().getString(key, null));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Secure read failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("key and value are required");
            return;
        }
        try {
            prefs().edit().putString(key, value).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure write failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("key is required");
            return;
        }
        try {
            prefs().edit().remove(key).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure delete failed: " + e.getMessage());
        }
    }
}
