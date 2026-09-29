package com.onegit;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Background poller: every ~15 minutes it fetches the user's GitHub
 * notifications (new issues, PRs, mentions, reviews, releases, CI results)
 * and posts Android system notifications for threads not seen before.
 * Deduplicated against previously notified thread ids.
 */
public class PollReceiver extends BroadcastReceiver {

    private static final long INTERVAL = 15 * 60 * 1000L;
    private static final String ACTION_POLL = "com.onegit.POLL";

    @Override
    public void onReceive(final Context ctx, Intent intent) {
        final Context c = ctx.getApplicationContext();
        new Thread(new Runnable() {
            @Override
            public void run() { check(c); }
        }).start();
    }

    /* ---------- scheduling ---------- */

    static void sync(Context ctx) {
        if (enabled(ctx)) schedule(ctx); else cancel(ctx);
    }

    static boolean enabled(Context ctx) {
        return ctx.getSharedPreferences("onegit", Context.MODE_PRIVATE).getBoolean("notify", true);
    }

    static void setEnabled(Context ctx, boolean on) {
        ctx.getSharedPreferences("onegit", Context.MODE_PRIVATE).edit().putBoolean("notify", on).apply();
        if (on) schedule(ctx); else cancel(ctx);
    }

    static void schedule(Context ctx) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent i = new Intent(ctx, PollReceiver.class);
            i.setAction(ACTION_POLL);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 21, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            am.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 60000L, INTERVAL, pi);
        } catch (Throwable ignored) { }
    }

    static void cancel(Context ctx) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent i = new Intent(ctx, PollReceiver.class);
            i.setAction(ACTION_POLL);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 21, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            am.cancel(pi);
        } catch (Throwable ignored) { }
    }

    /* ---------- the check ---------- */

    private static void check(Context ctx) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences("onegit", Context.MODE_PRIVATE);
            String token = sp.getString("token", "");
            if (token == null || token.isEmpty() || !sp.getBoolean("notify", true)) return;

            JSONArray items = new JSONArray(httpGet(
                    "https://api.github.com/notifications?per_page=25", token));

            boolean first = !sp.contains("seen_threads");
            Set<String> seen = sp.getStringSet("seen_threads", new HashSet<String>());
            Set<String> nowIds = new HashSet<>();
            List<JSONObject> fresh = new ArrayList<>();

            for (int i = 0; i < items.length(); i++) {
                JSONObject n = items.optJSONObject(i);
                if (n == null) continue;
                String id = n.optString("id", String.valueOf(i));
                nowIds.add(id);
                if (!first && !seen.contains(id) && n.optBoolean("unread", true)) fresh.add(n);
            }

            Set<String> store = new HashSet<>(nowIds);
            if (!first) {
                // keep previously seen ids that are still around, capped
                for (String s : seen) {
                    if (store.size() > 500) break;
                    store.add(s);
                }
            }
            sp.edit().putStringSet("seen_threads", store).apply();

            if (first || fresh.isEmpty()) return;

            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel("onegit", "GitHub activity",
                        NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("New issues, pull requests, mentions, releases and CI results");
                nm.createNotificationChannel(ch);
            }

            int shown = 0;
            for (JSONObject n : fresh) {
                if (shown >= 5) break;
                JSONObject repo = n.optJSONObject("repository");
                JSONObject subj = n.optJSONObject("subject");
                String title = repo != null ? repo.optString("full_name") : "GitHub";
                String text = subj != null ? subj.optString("title") : "new activity";
                String type = subj != null ? subj.optString("type") : "";
                String tid = n.optString("id", String.valueOf(System.currentTimeMillis()));

                Notification.Builder b = Build.VERSION.SDK_INT >= 26
                        ? new Notification.Builder(ctx, "onegit")
                        : new Notification.Builder(ctx);
                b.setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(text)
                        .setStyle(new Notification.BigTextStyle().bigText(type + " — " + text))
                        .setColor(0xFF1B6EF3)
                        .setAutoCancel(true);

                Intent open = new Intent(ctx, MainActivity.class);
                open.putExtra("url", "file:///android_asset/www/index.html#/notifs");
                open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                b.setContentIntent(PendingIntent.getActivity(ctx, tid.hashCode(), open,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

                try {
                    nm.notify(tid.hashCode(), b.build());
                    shown++;
                } catch (Throwable ignored) { }
            }
        } catch (Throwable ignored) { }
    }

    private static String httpGet(String u, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Accept", "application/vnd.github+json");
        c.setRequestProperty("User-Agent", "Gitly");
        InputStream in = c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] b = new byte[4096];
        int n;
        while ((n = in.read(b)) > 0) bo.write(b, 0, n);
        in.close();
        return bo.toString("UTF-8");
    }
}
