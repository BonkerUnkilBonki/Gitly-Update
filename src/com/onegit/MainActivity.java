package com.onegit;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;

public class MainActivity extends Activity {

    private WebView web;
    private static final String DEFAULT_URL = "file:///android_asset/www/index.html";
    private ValueCallback<Uri[]> filePathCb;
    private static final int FILE_REQ = 77;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        web.setBackgroundColor(Color.parseColor("#F2F2F2"));

        // Lets the web UI restyle the Android status/navigation bars per theme
        web.addJavascriptInterface(new Native(), "OneGit");
        // Enables JS dialogs (confirm for actions like fork) and the device file
        // picker (used for uploading files to repos and release assets)
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (filePathCb != null) filePathCb.onReceiveValue(null);
                filePathCb = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(i, "Select files"), FILE_REQ);
                } catch (Exception e) {
                    filePathCb = null;
                    return false;
                }
                return true;
            }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    // External web links (github.com pages, token creation, etc.)
                    // open in the browser; the app itself stays on file:// pages.
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, u));
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                return false;
            }
        });

        setContentView(web);

        // Android 13+ requires the runtime notification permission for GitHub alerts
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1);
            } catch (Throwable ignored) { }
        }
        // arm (or disarm) the background GitHub activity poller
        PollReceiver.sync(this);

        String url = getIntent() != null ? getIntent().getStringExtra("url") : null;
        web.loadUrl(url != null ? url : DEFAULT_URL);
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (web != null && i != null) {
            String url = i.getStringExtra("url");
            if (url != null) web.loadUrl(url);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQ) {
            if (filePathCb == null) return;
            java.util.ArrayList<Uri> files = new java.util.ArrayList<>();
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                        files.add(data.getClipData().getItemAt(i).getUri());
                    }
                } else if (data.getData() != null) {
                    files.add(data.getData());
                }
            }
            filePathCb.onReceiveValue(files.toArray(new Uri[0]));
            filePathCb = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onResume() {
        super.onResume();
        ProfileWidget.updateAll(this);
        ContributionWidget.updateAll(this, ContributionSmall.class);
        ContributionWidget.updateAll(this, ContributionBig.class);
        ContributionWidget.updateAll(this, ContributionWide.class);
    }

    private class Native {
        @JavascriptInterface
        public void theme(final String barColor, final boolean lightIcons) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        int c = Color.parseColor(barColor);
                        getWindow().setStatusBarColor(c);
                        getWindow().setNavigationBarColor(c);
                        if (Build.VERSION.SDK_INT >= 23) {
                            View d = getWindow().getDecorView();
                            int f = d.getSystemUiVisibility();
                            if (lightIcons) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            else f &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            if (Build.VERSION.SDK_INT >= 26) {
                                if (lightIcons) f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                else f &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                            }
                            d.setSystemUiVisibility(f);
                        }
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        /** Stores the token so home screen widgets can call the GitHub API. */
        @JavascriptInterface
        public void saveToken(final String token) {
            try {
                getSharedPreferences("onegit", MODE_PRIVATE).edit()
                        .putString("token", token == null ? "" : token).apply();
            } catch (Exception ignored) {
            }
        }

        /** Real download to the device Downloads folder via DownloadManager. */
        @JavascriptInterface
        public void download(final String url, final String filename) {
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setTitle(filename == null || filename.isEmpty() ? "OneGit download" : filename);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setAllowedOverMetered(true);
                req.setAllowedOverRoaming(true);
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (dm != null) dm.enqueue(req);
            } catch (Exception ignored) {
            }
        }

        /** Native clipboard copy (works even where the web clipboard API does not). */
        @JavascriptInterface
        public void copy(final String text) {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("OneGit", text));
            } catch (Exception ignored) {
            }
        }

        /** Enables/disables the background GitHub activity poller. */
        @JavascriptInterface
        public void setNotifications(final boolean on) {
            PollReceiver.setEnabled(MainActivity.this, on);
        }

        /** Returns the system/wallpaper accent color (Material You) as #RRGGBB, or "". */
        @JavascriptInterface
        public String systemAccent() {
            try {
                if (Build.VERSION.SDK_INT >= 31) {
                    int[] attrs = { android.R.attr.colorAccent };
                    android.content.res.TypedArray ta = obtainStyledAttributes(
                            android.R.style.Theme_DeviceDefault_DayNight, attrs);
                    int color = ta.getColor(0, 0);
                    ta.recycle();
                    if (color != 0) {
                        return String.format("#%06X", (0xFFFFFF & color));
                    }
                }
            } catch (Throwable ignored) { }
            return "";
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
