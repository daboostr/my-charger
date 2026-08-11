package dev.charger.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Registers the custom plugins used by the Android-only app:
 * SecureStore for credentials and SyncedFolder for cloud-synced history.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureStorePlugin.class);
        registerPlugin(SyncedFolderPlugin.class);
        registerPlugin(StartupSoundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
