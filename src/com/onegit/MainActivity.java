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
    private static final int FOLDER_REQ = 78;
    private int folderJob = 0;

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
        if (requestCode == FOLDER_REQ) {
            final int job = folderJob;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                final Uri treeUri = data.getData();
                try {
                    getContentResolver().takePersistableUriPermission(treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (Exception ignored) { }
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        walkTree(job, treeUri, android.provider.DocumentsContract.getTreeDocumentId(treeUri), "");
                    }
                }).start();
            } else {
                web.post(new Runnable() {
                    @Override
                    public void run() {
                        try { web.evaluateJavascript("window.__folderDone && window.__folderDone(" + job + ",0)", null); } catch (Exception ignored) { }
                    }
                });
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /** Recursively walks a picked folder and streams every file to the web layer. */
    private int walkTree(final int job, Uri tree, String parentDocId, String parentPath) {
        int sent = 0;
        try {
            android.database.Cursor c = getContentResolver().query(
                    android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentDocId),
                    new String[]{ android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                            android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE,
                            android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                            android.provider.DocumentsContract.Document.COLUMN_SIZE }, null, null, null);
            if (c != null) {
                while (c.moveToNext()) {
                    String docId = c.getString(0);
                    String mime = c.getString(1);
                    String name = c.getString(2);
                    long size = c.getLong(3);
                    if (docId == null || name == null) continue;
                    if (android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                        sent += walkTree(job, tree, docId, parentPath + name + "/");
                    } else if (sent < 200) {
                        String b64 = size > 10L * 1024 * 1024 ? null
                                : readDocB64(android.provider.DocumentsContract.buildDocumentUriUsingTree(tree, docId));
                        emitFolderFile(job, parentPath + name, mime, b64);
                        sent++;
                    }
                }
                c.close();
            }
        } catch (Exception ignored) { }
        final int s = sent;
        web.post(new Runnable() {
            @Override
            public void run() {
                try { web.evaluateJavascript("window.__folderDone && window.__folderDone(" + job + "," + s + ")", null); } catch (Exception ignored) { }
            }
        });
        return sent;
    }

    private String readDocB64(Uri uri) {
        try {
            java.io.InputStream in = getContentResolver().openInputStream(uri);
            java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
            byte[] b = new byte[65536];
            int r;
            while ((r = in.read(b)) > 0) bo.write(b, 0, r);
            in.close();
            return android.util.Base64.encodeToString(bo.toByteArray(), android.util.Base64.NO_WRAP);
        } catch (Exception e) { return null; }
    }

    private void emitFolderFile(final int job, String path, String mime, String b64) {
        final String js = "window.__folderFile && window.__folderFile(" + job + ","
                + org.json.JSONObject.quote(path) + ","
                + org.json.JSONObject.quote(mime == null ? "" : mime) + ","
                + (b64 == null ? "null" : org.json.JSONObject.quote(b64)) + ")";
        web.post(new Runnable() {
            @Override
            public void run() {
                try { web.evaluateJavascript(js, null); } catch (Exception ignored) { }
            }
        });
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
                    web.setBackgroundColor(c);
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

        /** Opens the system folder picker so a whole folder can be uploaded to a repo.
         *  Files are streamed to window.__folderFile(job, path, mime, base64). */
        @JavascriptInterface
        public void pickFolder() {
            folderJob++;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), FOLDER_REQ);
                    } catch (Exception ignored) { }
                }
            });
        }

        /** Posts a system notification, e.g. when an upload completes. */
        @JavascriptInterface
        public void notify(final String title, final String text) {
            try {
                android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                if (Build.VERSION.SDK_INT >= 26) {
                    nm.createNotificationChannel(new android.app.NotificationChannel("onegit_uploads",
                            "Uploads", android.app.NotificationManager.IMPORTANCE_DEFAULT));
                }
                android.app.Notification.Builder b = Build.VERSION.SDK_INT >= 26
                        ? new android.app.Notification.Builder(MainActivity.this, "onegit_uploads")
                        : new android.app.Notification.Builder(MainActivity.this);
                b.setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title == null ? "OneGit" : title)
                        .setContentText(text == null ? "" : text)
                        .setColor(0xFF1B6EF3)
                        .setAutoCancel(true);
                Intent open = new Intent(MainActivity.this, MainActivity.class);
                open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                b.setContentIntent(android.app.PendingIntent.getActivity(MainActivity.this, 21, open,
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE));
                nm.notify(4201, b.build());
            } catch (Exception ignored) { }
        }

        /** Uploads a release asset to uploads.github.com. The WebView cannot do this
         * directly because uploads.github.com sends no CORS headers, so this runs
         * natively. Async: calls window.__uplDone(jobId, ok, message) when finished. */
        @JavascriptInterface
        public void uploadAsset(final int jobId, final String repo, final String releaseId,
                               final String name, final String mime, final String base64) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    String msg = "OK";
                    try {
                        byte[] data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
                        String token = getSharedPreferences("onegit", MODE_PRIVATE).getString("token", "");
                        java.net.URL url = new java.net.URL("https://uploads.github.com/repos/" + repo
                                + "/releases/" + releaseId + "/assets?name="
                                + java.net.URLEncoder.encode(name, "UTF-8"));
                        java.net.HttpURLConnection c = (java.net.HttpURLConnection) url.openConnection();
                        c.setRequestMethod("POST");
                        c.setRequestProperty("Authorization", "Bearer " + token);
                        c.setRequestProperty("Accept", "application/vnd.github+json");
                        c.setRequestProperty("Content-Type",
                                (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime);
                        c.setRequestProperty("User-Agent", "OneGit");
                        c.setDoOutput(true);
                        c.setFixedLengthStreamingMode(data.length);
                        java.io.OutputStream os = c.getOutputStream();
                        os.write(data);
                        os.close();
                        int code = c.getResponseCode();
                        if (code < 200 || code >= 300) msg = "HTTP " + code;
                    } catch (Exception e) {
                        msg = e.getClass().getSimpleName();
                    }
                    final String m = msg.replaceAll("[^A-Za-z0-9 .:\\-]", " ");
                    final boolean ok = "OK".equals(msg);
                    web.post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                web.evaluateJavascript("window.__uplDone && window.__uplDone(" + jobId + "," + ok + ",'" + m + "')", null);
                            } catch (Exception ignored) { }
                        }
                    });
                }
            }).start();
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
