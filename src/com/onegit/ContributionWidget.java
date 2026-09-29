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
import android.graphics.Typeface;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/**
 * Base for the contribution widgets, styled after the in-app Productivity page.
 * 4x4 shows the full overview (graph + legend, Right now, This year on GitHub),
 * 4x2 shows the graph plus key stats, 2x2 is compact. Stats use the same math
 * as the Productivity page so the numbers always match the app.
 */
public class ContributionWidget extends AppWidgetProvider {

    protected boolean big = false;
    protected boolean small = false;
    protected int weeksLimit = 53;

    private static final int[] VALS = { R.id.v1, R.id.v2, R.id.v3, R.id.v4, R.id.v5, R.id.v6,
            R.id.v7, R.id.v8, R.id.v9, R.id.v10, R.id.v11, R.id.v12 };

    protected int layoutId() { return R.layout.widget_contrib_small; }

    @Override
    public void onUpdate(final Context ctx, final AppWidgetManager mgr, final int[] ids) {
        for (final int id : ids) {
            final RemoteViews v = new RemoteViews(ctx.getPackageName(), layoutId());
            Intent i = new Intent(ctx, MainActivity.class);
            i.putExtra("url", "file:///android_asset/www/index.html#/productivity");
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
            JSONObject cc = data(token);
            JSONObject cal = cc.getJSONObject("contributionCalendar");
            int total = cal.optInt("totalContributions", 0);
            JSONArray weeks = cal.optJSONArray("weeks");
            if (weeks == null) return;

            SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd");
            fmt.setTimeZone(TimeZone.getTimeZone("UTC"));
            String today = fmt.format(new Date());
            int cols = weeks.length();
            int[][] grid = new int[cols][7];
            List<Integer> flat = new ArrayList<>();
            Map<String, Integer> byDate = new HashMap<>();
            int todayW = -1, todayD = -1;
            for (int w = 0; w < cols; w++) {
                JSONArray days = weeks.getJSONObject(w).optJSONArray("contributionDays");
                if (days == null) continue;
                for (int d = 0; d < days.length() && d < 7; d++) {
                    JSONObject day = days.getJSONObject(d);
                    int cnt = day.optInt("contributionCount", 0);
                    grid[w][d] = cnt;
                    flat.add(cnt);
                    byDate.put(day.optString("date"), cnt);
                    if (today.equals(day.optString("date"))) { todayW = w; todayD = d; }
                }
            }

            // same math as the app's Productivity page
            int week = sumLast(byDate, 7), month = sumLast(byDate, 30);
            int i = flat.size() - 1;
            while (i >= 0 && flat.get(i) == 0) i--;
            int cur = 0;
            while (i >= 0 && flat.get(i) > 0) { cur++; i--; }
            int longest = 0, run = 0, busiest = 0;
            for (int c : flat) {
                if (c > 0) { run++; if (run > longest) longest = run; } else run = 0;
                if (c > busiest) busiest = c;
            }
            String avg = String.format("%.1f", flat.isEmpty() ? 0f : (float) total / flat.size());

            // slice to the visible window (small widget shows recent weeks only)
            int start = Math.max(0, cols - weeksLimit);
            int[][] g2 = new int[cols - start][7];
            for (int k = 0; k < g2.length; k++) g2[k] = grid[start + k];

            v.setImageViewBitmap(R.id.w_heat, render(ctx, g2, todayW - start, todayD, big));
            v.setTextViewText(R.id.w_total, String.valueOf(total));
            String[] vals;
            if (big) {
                vals = new String[] { String.valueOf(week), String.valueOf(month), cur + "d",
                        longest + "d", avg, String.valueOf(busiest),
                        String.valueOf(cc.optInt("totalCommitContributions")),
                        String.valueOf(cc.optInt("totalPullRequestContributions")),
                        String.valueOf(cc.optInt("totalIssueContributions")),
                        String.valueOf(cc.optInt("totalPullRequestReviewContributions")),
                        String.valueOf(cc.optInt("totalRepositoryContributions")),
                        String.valueOf(total) };
            } else if (!small) {
                vals = new String[] { String.valueOf(week), cur + "d", String.valueOf(busiest) };
            } else {
                vals = new String[0];
                v.setTextViewText(R.id.w_stats, cur + "d streak · busiest " + busiest);
            }
            for (int k = 0; k < vals.length; k++) v.setTextViewText(VALS[k], vals[k]);
            mgr.updateAppWidget(id, v);
        } catch (Throwable ignored) { }
    }

    private static int sumLast(Map<String, Integer> byDate, int n) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd");
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        int s = 0;
        for (int k = 0; k < n; k++) {
            Integer x = byDate.get(f.format(c.getTime()));
            if (x != null) s += x;
            c.add(Calendar.DATE, -1);
        }
        return s;
    }

    /** One UI contribution palette — same levels as the in-app heatmap: empty cell slightly
     *  lighter than the card background, then the Samsung blue at 40/60/80/100%. */
    private static final int[] COLORS = {0xFF262B33, 0xFF1E417A, 0xFF1D50A2, 0xFF1C5FCA, 0xFF1B6EF3};

    private static Typeface FONT;

    private static Typeface font(Context ctx) {
        if (FONT == null) {
            try { FONT = Typeface.createFromAsset(ctx.getAssets(), "www/fonts/OneGitSans.ttf"); }
            catch (Throwable t) { FONT = Typeface.DEFAULT; }
        }
        return FONT;
    }

    private static Bitmap render(Context ctx, int[][] grid, int tw, int td, boolean legend) {
        int cols = Math.max(grid.length, 1);
        int cell = 16, gap = 4;
        int w = cols * (cell + gap) - gap;
        int h = 7 * (cell + gap) - gap;
        int extra = legend ? 46 : 0;
        Bitmap bm = Bitmap.createBitmap(Math.max(w, 10), Math.max(h + extra, 10), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bm);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF r = new RectF();
        for (int x = 0; x < cols; x++) {
            for (int y = 0; y < 7; y++) {
                int cnt = x < grid.length ? grid[x][y] : 0;
                // same buckets as the app heatmap: 0 / 1-2 / 3-6 / 7-11 / 12+
                int level = cnt == 0 ? 0 : cnt < 3 ? 1 : cnt < 7 ? 2 : cnt < 12 ? 3 : 4;
                p.setColor(COLORS[level]);
                r.set(x * (cell + gap), y * (cell + gap), x * (cell + gap) + cell, y * (cell + gap) + cell);
                c.drawRoundRect(r, 4.5f, 4.5f, p);
            }
        }
        // ring today's cell
        if (tw >= 0 && tw < cols && td >= 0 && td < 7) {
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(3f);
            p.setColor(0xFF8FBAFF);
            r.set(tw * (cell + gap) - 2, td * (cell + gap) - 2,
                    tw * (cell + gap) + cell + 2, td * (cell + gap) + cell + 2);
            c.drawRoundRect(r, 6f, 6f, p);
            p.setStyle(Paint.Style.FILL);
        }
        // legend row, like the app's "Less ... More"
        if (legend) {
            Paint tp = new Paint(Paint.ANTI_ALIAS_FLAG);
            tp.setTypeface(font(ctx));
            tp.setTextSize(24f);
            tp.setColor(0xFF9A9A9A);
            c.drawText("Less", 2, h + 30, tp);
            int lx = 64;
            for (int l = 0; l < 5; l++) {
                p.setColor(COLORS[l]);
                r.set(lx, h + 14, lx + 18, h + 32);
                c.drawRoundRect(r, 4f, 4f, p);
                lx += 24;
            }
            tp.setColor(0xFF9A9A9A);
            c.drawText("More", lx + 4, h + 30, tp);
        }
        return bm;
    }

    private static JSONObject data(String token) throws Exception {
        String q = "{\"query\":\"query{viewer{contributionsCollection{totalCommitContributions"
                + " totalPullRequestContributions totalIssueContributions"
                + " totalPullRequestReviewContributions totalRepositoryContributions"
                + " contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}\"}";
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
                .getJSONObject("contributionsCollection");
    }
}
