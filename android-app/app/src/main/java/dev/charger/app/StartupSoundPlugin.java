package dev.charger.app;

import android.media.MediaPlayer;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plays the bundled launch sound and stores its enabled preference locally.
 */
@CapacitorPlugin(name = "StartupSound")
public class StartupSoundPlugin extends Plugin {
    private static final String PREFS = "charger_preferences";
    private static final String ENABLED = "startup_sound_enabled";
    private MediaPlayer player;

    @Override
    public void load() {
        if (isEnabled()) play();
    }

    private boolean isEnabled() {
        return getContext().getSharedPreferences(PREFS, 0).getBoolean(ENABLED, true);
    }

    private void play() {
        player = MediaPlayer.create(getContext(), R.raw.startup_sound);
        if (player == null) return;
        player.setOnCompletionListener(MediaPlayer::release);
        player.start();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        getContext().getSharedPreferences(PREFS, 0)
            .edit()
            .putBoolean(ENABLED, enabled)
            .apply();
        call.resolve();
    }
}
