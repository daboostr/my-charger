package dev.charger.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Registers the two custom plugins that let the app run without Cloudflare:
 * SecureStore (credentials formerly held as Worker secrets) and SyncedFolder
 * (the user-chosen, cloud-synced history folder).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureStorePlugin.class);
        registerPlugin(SyncedFolderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
