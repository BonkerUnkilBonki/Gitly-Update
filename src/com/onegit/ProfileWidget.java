package com.onegit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Home screen widget: your GitHub profile stats, refreshed from the API. */
public class ProfileWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(final Context ctx, final AppWidgetManager mgr, final int[] ids) {
        for (final int id : ids) {
            final RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_profile);
            v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "#/home"));
            mgr.updateAppWidget(id, v);
            new Thread(new Runnable() {
                @Override
                public void run() { fetch(ctx, mgr, id, v); }
            }).start();
        }
    }

    static void updateAll(Context ctx) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(ctx);
            int[] ids = m.getAppWidgetIds(new ComponentName(ctx, ProfileWidget.class));
            if (ids != null && ids.length > 0) new ProfileWidget().onUpdate(ctx, m, ids);
        } catch (Throwable ignored) { }
    }

    private static PendingIntent openApp(Context ctx, String hash) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.putExtra("url", "file:///android_asset/www/index.html" + hash);
        return PendingIntent.getActivity(ctx, hash.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void fetch(Context ctx, AppWidgetManager mgr, int id, RemoteViews v) {
        try {
            String token = ctx.getSharedPreferences("onegit", Context.MODE_PRIVATE).getString("token", "");
            if (token == null || token.isEmpty()) return;
            JSONObject u = new JSONObject(httpGet("https://api.github.com/user", token));
            String name = u.optString("name", "");
            if (name.isEmpty()) name = u.optString("login", "OneGit");
            v.setTextViewText(R.id.w_name, name);
            v.setTextViewText(R.id.w_login, "@" + u.optString("login", ""));
            v.setTextViewText(R.id.w_stats,
                    u.optInt("public_repos") + " repos · " + u.optInt("followers") + " followers · "
                            + u.optInt("following") + " following");
            String av = u.optString("avatar_url", "");
            if (!av.isEmpty()) {
                Bitmap b = httpImage(av);
                if (b != null) v.setImageViewBitmap(R.id.w_avatar, b);
            }
            mgr.updateAppWidget(id, v);
        } catch (Throwable ignored) { }
    }

    private static String httpGet(String u, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Accept", "application/vnd.github+json");
        c.setRequestProperty("User-Agent", "OneGit");
        InputStream in = c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] b = new byte[4096];
        int n;
        while ((n = in.read(b)) > 0) bo.write(b, 0, n);
        in.close();
        return bo.toString("UTF-8");
    }

    private static Bitmap httpImage(String u) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setRequestProperty("User-Agent", "OneGit");
            InputStream in = c.getInputStream();
            Bitmap b = BitmapFactory.decodeStream(in);
            in.close();
            return b;
        } catch (Exception e) { return null; }
    }
}
