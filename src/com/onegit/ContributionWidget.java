package com.onegit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Base for the GitHub contribution heatmap widgets (2x2 and 4x4), One UI style.
 * Pulls the contribution calendar via GraphQL and renders a rounded-square
 * heatmap bitmap in a Samsung-blue scale, with today's cell ringed.
 */
public class ContributionWidget extends AppWidgetProvider {

    protected boolean big = false;

    protected int layoutId() { return R.layout.widget_contrib_small; }

    @Override
    public void onUpdate(final Context ctx, final AppWidgetManager mgr, final int[] ids) {
        for (final int id : ids) {
            final RemoteViews v = new RemoteViews(ctx.getPackageName(), layoutId());
            Intent i = new Intent(ctx, MainActivity.class);
            i.putExtra("url", "file:///android_asset/www/index.html#/home");
            v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(ctx, 11, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            mgr.updateAppWidget(id, v);
            new Thread(new Runnable() {
                @Override
                public void run() { fetch(ctx, mgr, id, v); }
            }).start();
        }
    }

    static void updateAll(Context ctx, Class<? extends ContributionWidget> cls) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(ctx);
            int[] ids = m.getAppWidgetIds(new ComponentName(ctx, cls));
            if (ids != null && ids.length > 0) {
                cls.getDeclaredConstructor().newInstance().onUpdate(ctx, m, ids);
            }
        } catch (Throwable ignored) { }
    }

    private void fetch(Context ctx, AppWidgetManager mgr, int id, RemoteViews v) {
        try {
            String token = ctx.getSharedPreferences("onegit", Context.MODE_PRIVATE).getString("token", "");
            if (token == null || token.isEmpty()) {
                v.setTextViewText(R.id.w_total, "sign in");
                mgr.updateAppWidget(id, v);
                return;
            }
            JSONObject cal = calendar(token);
            int total = cal.optInt("totalContributions", 0);
            JSONArray weeks = cal.optJSONArray("weeks");
            if (weeks == null) return;

            String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
            int cols = weeks.length();
            int[][] grid = new int[cols][7];
            int todayW = -1, todayD = -1;
            for (int w = 0; w < cols; w++) {
                JSONArray days = weeks.getJSONObject(w).optJSONArray("contributionDays");
                if (days == null) continue;
                for (int d = 0; d < days.length() && d < 7; d++) {
                    JSONObject day = days.getJSONObject(d);
                    grid[w][d] = day.optInt("contributionCount", 0);
                    if (today.equals(day.optString("date"))) { todayW = w; todayD = d; }
                }
            }

            int max = 1, best = 0;
            for (int[] col : grid) {
                for (int c : col) {
                    if (c > max) max = c;
                    if (c > best) best = c;
                }
            }

            // current streak: consecutive days with contributions ending today
            int streak = 0;
            boolean started = false, broken = false;
            for (int w = cols - 1; w >= 0 && !broken; w--) {
                for (int d = 6; d >= 0 && !broken; d--) {
                    if (w == cols - 1 && todayD >= 0 && d > todayD) continue; // skip future days
                    int c = grid[w][d];
                    if (c > 0) { streak++; started = true; }
                    else if (started) broken = true;
                }
            }

            v.setImageViewBitmap(R.id.w_heat, render(grid, max, todayW, todayD));
            v.setTextViewText(R.id.w_total, String.valueOf(total));
            if (big) {
                v.setTextViewText(R.id.w_stats, best + " best day · " + streak + " day streak · "
                        + total + " contributions this year");
            }
            mgr.updateAppWidget(id, v);
        } catch (Throwable ignored) { }
    }

    /** Samsung-blue One UI contribution palette, empty -> bright. */
    private static final int[] COLORS = {0xFF1D2228, 0xFF123E7C, 0xFF1557C0, 0xFF1B6EF3, 0xFF63A4FF};

    private static Bitmap render(int[][] grid, int max, int tw, int td) {
        int cols = Math.max(grid.length, 1);
        int cell = 16, gap = 4;
        int w = cols * (cell + gap) - gap;
        int h = 7 * (cell + gap) - gap;
        Bitmap bm = Bitmap.createBitmap(Math.max(w, 10), Math.max(h, 10), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bm);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF r = new RectF();
        for (int x = 0; x < cols; x++) {
            for (int y = 0; y < 7; y++) {
                int cnt = x < grid.length ? grid[x][y] : 0;
                int level = cnt == 0 ? 0 : Math.min(4, 1 + (cnt * 4) / Math.max(max, 1));
                p.setColor(COLORS[level]);
                r.set(x * (cell + gap), y * (cell + gap), x * (cell + gap) + cell, y * (cell + gap) + cell);
                c.drawRoundRect(r, 4.5f, 4.5f, p);
            }
        }
        // ring today's cell
        if (tw >= 0 && tw < cols && td >= 0 && td < 7) {
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(3f);
            p.setColor(0xFF63A4FF);
            r.set(tw * (cell + gap) - 2, td * (cell + gap) - 2,
                    tw * (cell + gap) + cell + 2, td * (cell + gap) + cell + 2);
            c.drawRoundRect(r, 6f, 6f, p);
            p.setStyle(Paint.Style.FILL);
        }
        return bm;
    }

    private static JSONObject calendar(String token) throws Exception {
        String q = "{\"query\":\"query{viewer{contributionsCollection{contributionCalendar"
                + "{totalContributions weeks{contributionDays{date contributionCount}}}}}}\"}";
        HttpURLConnection c = (HttpURLConnection) new URL("https://api.github.com/graphql").openConnection();
        c.setRequestMethod("POST");
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("User-Agent", "OneGit");
        c.setDoOutput(true);
        c.getOutputStream().write(q.getBytes("UTF-8"));
        InputStream in = c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] b = new byte[8192];
        int n;
        while ((n = in.read(b)) > 0) bo.write(b, 0, n);
        in.close();
        JSONObject root = new JSONObject(bo.toString("UTF-8"));
        return root.getJSONObject("data").getJSONObject("viewer")
                .getJSONObject("contributionsCollection").getJSONObject("contributionCalendar");
    }
}
