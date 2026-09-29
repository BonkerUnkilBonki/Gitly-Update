package com.onegit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** Home screen widget: quick launch pills into Gitly tabs. */
public class QuickWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        String base = "file:///android_asset/www/index.html";
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quick);
        set(ctx, v, R.id.w_btn_home, base + "#/home", 1);
        set(ctx, v, R.id.w_btn_repos, base + "#/repos", 2);
        set(ctx, v, R.id.w_btn_issues, base + "#/issues", 3);
        set(ctx, v, R.id.w_btn_notifs, base + "#/notifs", 4);
        for (int id : ids) mgr.updateAppWidget(id, v);
    }

    private static void set(Context ctx, RemoteViews v, int viewId, String url, int code) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.putExtra("url", url);
        v.setOnClickPendingIntent(viewId, PendingIntent.getActivity(ctx, code, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
}
