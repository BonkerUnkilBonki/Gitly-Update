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
    private String pendingGhUrl = null;
    private static final int FILE_REQ = 77;
    private static final int FOLDER_REQ = 78;
    private static final int PICK_FILES_REQ = 79;
    private static final int ASSET_REQ = 80;
    private int folderJob = 0;

    /** One scanned upload job: picked file uris + their repo-relative paths + sizes. */
    private static class Scan {
        int job;
        final java.util.ArrayList<Uri> uris = new java.util.ArrayList<>();
        final java.util.ArrayList<String> paths = new java.util.ArrayList<>();
        final java.util.ArrayList<Long> sizes = new java.util.ArrayList<>();
    }
    private volatile Scan scan;
    private volatile String assetRepo, assetRelease;

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
            public void onPageFinished(WebView v, String u) {
                if (pendingGhUrl != null && u != null && u.startsWith("file://")) {
                    final String link = pendingGhUrl;
                    pendingGhUrl = null;
                    v.evaluateJavascript("window.openGithubUrl && window.openGithubUrl('" + link.replace("\\", "\\\\").replace("'", "\\'") + "')", null);
                }
            }
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

        String gh = ghLinkFromIntent(getIntent());
        if (gh != null) pendingGhUrl = gh;
        String url = getIntent() != null ? getIntent().getStringExtra("url") : null;
        web.loadUrl(url != null ? url : DEFAULT_URL);
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (web != null && i != null) {
            String url = i.getStringExtra("url");
            if (url != null) { web.loadUrl(url); return; }
            String gh = ghLinkFromIntent(i);
            if (gh != null) {
                web.evaluateJavascript("window.openGithubUrl && window.openGithubUrl('" + gh.replace("\\", "\\\\").replace("'", "\\'") + "')", null);
            }
        }
    }

    private static String ghLinkFromIntent(Intent i) {
        try {
            if (i == null || i.getData() == null) return null;
            Uri u = i.getData();
            String s = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
            if (!s.equals("http") && !s.equals("https")) return null;
            String h = u.getHost() == null ? "" : u.getHost().toLowerCase();
            if (h.equals("github.com") || h.equals("www.github.com") || h.equals("m.github.com") || h.equals("gist.github.com"))
                return u.toString();
        } catch (Exception ignored) { }
        return null;
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
                final Scan sc = new Scan();
                sc.job = job;
                final int[] tooBig = {0};
                final boolean[] truncated = {false};
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            walkCollect(sc, treeUri, android.provider.DocumentsContract.getTreeDocumentId(treeUri), "", tooBig, truncated);
                        } catch (Exception ignored) { }
                        scan = sc;
                        long bytes = 0;
                        for (Long s : sc.sizes) bytes += s == null ? 0 : s;
                        evalJs("window.__folderScanned && window.__folderScanned(" + job + "," + sc.uris.size()
                                + "," + bytes + "," + tooBig[0] + "," + truncated[0] + ")");
                    }
                }).start();
            } else {
                evalJs("window.__folderScanned && window.__folderScanned(" + job + ",-1,0,0,false)");
            }
            return;
        }
        if (requestCode == PICK_FILES_REQ) {
            final int job = folderJob;
            java.util.ArrayList<Uri> picked = collectPicked(data);
            if (resultCode == RESULT_OK && !picked.isEmpty()) {
                final Scan sc = new Scan();
                sc.job = job;
                for (Uri u : picked) {
                    String nm = queryName(u);
                    sc.uris.add(u);
                    sc.paths.add(nm == null || nm.isEmpty() ? ("file-" + (sc.uris.size() + 1)) : nm);
                    sc.sizes.add(querySize(u));
                }
                scan = sc;
                long bytes = 0;
                for (Long s : sc.sizes) bytes += s == null || s < 0 ? 0 : s;
                evalJs("window.__folderScanned && window.__folderScanned(" + job + "," + sc.uris.size()
                        + "," + bytes + ",0,false)");
            } else {
                evalJs("window.__folderScanned && window.__folderScanned(" + job + ",-1,0,0,false)");
            }
            return;
        }
        if (requestCode == ASSET_REQ) {
            final String repoFull = assetRepo;
            final String relId = assetRelease;
            assetRepo = null;
            assetRelease = null;
            final java.util.ArrayList<Uri> picked = resultCode == RESULT_OK ? collectPicked(data) : new java.util.ArrayList<Uri>();
            if (repoFull == null || relId == null || picked.isEmpty()) return;
            new Thread(new Runnable() {
                @Override
                public void run() {
                    String token = getSharedPreferences("onegit", MODE_PRIVATE).getString("token", "");
                    int ok = 0, fail = 0;
                    String firstErr = "";
                    for (Uri u : picked) {
                        String name = queryName(u);
                        if (name == null || name.isEmpty()) name = "file-" + (ok + fail + 1);
                        try {
                            uploadAssetStream(token, repoFull, relId, u, name);
                            ok++;
                        } catch (Exception e) {
                            fail++;
                            if (firstErr.isEmpty()) firstErr = ghErr(e);
                        }
                    }
                    final int okF = ok, failF = fail;
                    final String errF = firstErr;
                    evalJs("window.__assetDone && window.__assetDone(" + okF + "," + failF + ","
                            + org.json.JSONObject.quote(errF) + ")");
                }
            }).start();
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /* ============ native upload pipeline (folder + multi-file + assets) ============ */

    /** Runs a JS snippet on the UI thread. */
    private void evalJs(final String js) {
        web.post(new Runnable() {
            @Override
            public void run() { try { web.evaluateJavascript(js, null); } catch (Exception ignored) { } }
        });
    }

    private static String readAll(java.io.InputStream in) throws java.io.IOException {
        if (in == null) return "";
        java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
        byte[] b = new byte[16384];
        int r;
        while ((r = in.read(b)) > 0) bo.write(b, 0, r);
        try { in.close(); } catch (Exception ignored) { }
        return bo.toString("UTF-8");
    }

    /** Pulls the "message" field out of a GitHub error body, if present. */
    private static String jsonMsg(String body) {
        try {
            String m = new org.json.JSONObject(body).optString("message", "");
            if (m != null && !m.isEmpty()) return " — " + m;
        } catch (Exception ignored) { }
        return "";
    }

    private static String ghErr(Throwable e) {
        String m = e.getMessage();
        if (m == null || m.isEmpty()) m = e.getClass().getSimpleName();
        return m != null && m.length() > 200 ? m.substring(0, 200) : m;
    }

    private String queryName(Uri u) {
        try {
            android.database.Cursor c = getContentResolver().query(u, null, null, null, null);
            if (c != null) {
                try {
                    int idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0 && c.moveToFirst()) {
                        String n = c.getString(idx);
                        if (n != null && !n.isEmpty()) return n;
                    }
                } finally { c.close(); }
            }
        } catch (Exception ignored) { }
        String s = u.getLastPathSegment();
        return s == null ? null : s.replaceAll("[/\\\\]", "_");
    }

    private long querySize(Uri u) {
        try {
            android.database.Cursor c = getContentResolver().query(u, null, null, null, null);
            if (c != null) {
                try {
                    int idx = c.getColumnIndex(android.provider.OpenableColumns.SIZE);
                    if (idx >= 0 && c.moveToFirst() && !c.isNull(idx)) return c.getLong(idx);
                } finally { c.close(); }
            }
        } catch (Exception ignored) { }
        return -1;
    }

    private java.util.ArrayList<Uri> collectPicked(Intent data) {
        java.util.ArrayList<Uri> out = new java.util.ArrayList<>();
        if (data == null) return out;
        if (data.getClipData() != null) {
            for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                Uri u = data.getClipData().getItemAt(i).getUri();
                if (u != null) out.add(u);
            }
        } else if (data.getData() != null) out.add(data.getData());
        return out;
    }

    /** Collects every file under the picked tree. Each subfolder and each file is
     *  isolated: one unreadable or broken entry never stops the rest of the walk
     *  (that is what used to silently drop whole folders like res/ and src/). */
    private void walkCollect(Scan sc, Uri tree, String parentDocId, String parentPath, int[] tooBig, boolean[] truncated) {
        android.database.Cursor c;
        try {
            c = getContentResolver().query(
                    android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentDocId),
                    new String[]{ android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                            android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE,
                            android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                            android.provider.DocumentsContract.Document.COLUMN_SIZE }, null, null, null);
        } catch (Exception e) { return; }
        if (c == null) return;
        try {
            while (c.moveToNext()) {
                try {
                    String docId = c.getString(0);
                    String mime = c.getString(1);
                    String name = c.getString(2);
                    long size = c.getLong(3);
                    if (docId == null || name == null) continue;
                    if (android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                        walkCollect(sc, tree, docId, parentPath + name + "/", tooBig, truncated);
                    } else if (!truncated[0]) {
                        if (sc.uris.size() >= 2000) { truncated[0] = true; return; }
                        if (size >= 100L * 1024 * 1024) { tooBig[0]++; continue; }
                        sc.uris.add(android.provider.DocumentsContract.buildDocumentUriUsingTree(tree, docId));
                        sc.paths.add(parentPath + name);
                        sc.sizes.add(size);
                    }
                } catch (Exception ignored) { }
            }
        } finally {
            try { c.close(); } catch (Exception ignored) { }
        }
    }

    /** Small JSON request helper for api.github.com. */
    private org.json.JSONObject gh(String token, String method, String urlStr, String body) throws Exception {
        java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(urlStr).openConnection();
        try {
            c.setRequestMethod(method);
            c.setConnectTimeout(20000);
            c.setReadTimeout(120000);
            c.setRequestProperty("Authorization", "Bearer " + token);
            c.setRequestProperty("Accept", "application/vnd.github+json");
            c.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
            c.setRequestProperty("User-Agent", "Gitly");
            if (body != null) {
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                byte[] b = body.getBytes("UTF-8");
                c.setFixedLengthStreamingMode(b.length);
                java.io.OutputStream os = c.getOutputStream();
                os.write(b);
                os.close();
            }
            int code = c.getResponseCode();
            String resp = readAll(code >= 400 ? c.getErrorStream() : c.getInputStream());
            if (code < 200 || code >= 300) throw new Exception("HTTP " + code + jsonMsg(resp));
            return resp == null || resp.isEmpty() ? new org.json.JSONObject() : new org.json.JSONObject(resp);
        } finally {
            try { c.disconnect(); } catch (Exception ignored) { }
        }
    }

    /** Streams one file to the Git blobs API as base64 without ever holding the
     *  whole file (or its encoding) in memory — this is what lifts the old 10 MB cap. */
    private String createBlobStreamed(String token, String owner, String repo, Uri u) throws Exception {
        Exception last = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            java.io.InputStream in = null;
            try {
                in = getContentResolver().openInputStream(u);
                if (in == null) throw new Exception("cannot open file");
                long size = querySize(u);
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(
                        "https://api.github.com/repos/" + owner + "/" + repo + "/git/blobs").openConnection();
                try {
                    c.setRequestMethod("POST");
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(300000);
                    c.setRequestProperty("Authorization", "Bearer " + token);
                    c.setRequestProperty("Accept", "application/vnd.github+json");
                    c.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
                    c.setRequestProperty("User-Agent", "Gitly");
                    c.setRequestProperty("Content-Type", "application/json");
                    c.setDoOutput(true);
                    if (size >= 0) {
                        // {"content":"...","encoding":"base64"} -> 12 + base64 + 22 bytes
                        c.setFixedLengthStreamingMode(34 + 4L * ((size + 2) / 3));
                    } else {
                        c.setChunkedStreamingMode(512 * 1024);
                    }
                    java.io.OutputStream os = c.getOutputStream();
                    os.write("{\"content\":\"".getBytes("US-ASCII"));
                    byte[] chunk = new byte[3 * 512 * 1024];
                    int carry = 0;
                    while (true) {
                        int n = in.read(chunk, carry, chunk.length - carry);
                        if (n <= 0) break;
                        int t = carry + n;
                        int usable = (t / 3) * 3;
                        if (usable > 0) os.write(android.util.Base64.encode(chunk, 0, usable, android.util.Base64.NO_WRAP));
                        carry = t - usable;
                        if (carry > 0) System.arraycopy(chunk, usable, chunk, 0, carry);
                    }
                    if (carry > 0) os.write(android.util.Base64.encode(chunk, 0, carry, android.util.Base64.NO_WRAP));
                    os.write("\",\"encoding\":\"base64\"}".getBytes("US-ASCII"));
                    os.flush();
                    os.close();
                    int code = c.getResponseCode();
                    String resp = readAll(code >= 400 ? c.getErrorStream() : c.getInputStream());
                    if (code < 200 || code >= 300) throw new Exception("HTTP " + code + jsonMsg(resp));
                    return new org.json.JSONObject(resp).getString("sha");
                } finally {
                    try { c.disconnect(); } catch (Exception ignored) { }
                }
            } catch (Exception e) {
                last = e;
                // only retry transient I/O problems, not HTTP rejections
                if (!(e.getCause() instanceof java.io.IOException) && !(e instanceof java.io.IOException)) break;
            } finally {
                if (in != null) try { in.close(); } catch (Exception ignored) { }
            }
        }
        throw last == null ? new Exception("blob failed") : last;
    }

    private static String resultJs(int job, int ok, int fail, java.util.ArrayList<String> errors) {
        return "window.__folderResult && window.__folderResult(" + job + "," + ok + "," + fail + ","
                + new org.json.JSONArray(errors).toString() + ")";
    }

    /** True when the scanned upload contains a file at the given repo-relative path. */
    private static boolean containsPath(Scan sc, String dir, String path) {
        String prefix = dir == null || dir.isEmpty() ? "" : dir + "/";
        for (String p : sc.paths) if ((prefix + p).equals(path)) return true;
        return false;
    }

    /** Uploads a scanned set of files as ONE commit via the Git Data API,
     *  streaming every file. Files that fail are reported individually —
     *  one bad file no longer aborts the rest of the upload. */
    private void uploadScan(final int job, final Scan sc, final String owner, final String repo,
                            final String dir, final String message) {
        final String token = getSharedPreferences("onegit", MODE_PRIVATE).getString("token", "");
        final java.util.ArrayList<String> errors = new java.util.ArrayList<>();
        int ok = 0, fail = 0;
        try {
            org.json.JSONObject repoInfo = gh(token, "GET", "https://api.github.com/repos/" + owner + "/" + repo, null);
            String branch = repoInfo.optString("default_branch", "");
            if (branch == null || branch.isEmpty()) branch = "main";
            String parentSha = null, baseTree = null;
            boolean bootstrapped = false;
            try {
                org.json.JSONObject ref = gh(token, "GET", "https://api.github.com/repos/" + owner + "/" + repo
                        + "/git/ref/heads/" + branch, null);
                parentSha = ref.getJSONObject("object").getString("sha");
            } catch (Exception e) {
                // Empty repository: the Git Data API (blobs/trees/commits/refs) refuses to
                // touch it (409 "Git Repository is empty"), so create the first commit
                // through the Contents API, then chain the real upload onto it.
                bootstrapped = true;
                gh(token, "PUT", "https://api.github.com/repos/" + owner + "/" + repo + "/contents/.gitly-init",
                        new org.json.JSONObject()
                                .put("message", "Initialize repository")
                                .put("content", "Cg==")
                                .put("branch", branch).toString());
                org.json.JSONObject ref = gh(token, "GET", "https://api.github.com/repos/" + owner + "/" + repo
                        + "/git/ref/heads/" + branch, null);
                parentSha = ref.getJSONObject("object").getString("sha");
            }
            org.json.JSONObject pc = gh(token, "GET", "https://api.github.com/repos/" + owner + "/" + repo
                    + "/git/commits/" + parentSha, null);
            org.json.JSONObject t = pc.optJSONObject("tree");
            if (t != null) baseTree = t.optString("sha", null);

            org.json.JSONArray entries = new org.json.JSONArray();
            int total = sc.uris.size();
            for (int i = 0; i < total; i++) {
                String rel = (dir == null || dir.isEmpty() ? "" : dir + "/") + sc.paths.get(i);
                try {
                    String sha = createBlobStreamed(token, owner, repo, sc.uris.get(i));
                    entries.put(new org.json.JSONObject()
                            .put("path", rel)
                            .put("mode", "100644")
                            .put("type", "blob")
                            .put("sha", sha));
                    ok++;
                } catch (Exception e) {
                    fail++;
                    if (errors.size() < 8) errors.add(sc.paths.get(i) + ": " + ghErr(e));
                }
                final int done = i + 1;
                evalJs("window.__folderProgress && window.__folderProgress(" + job + "," + done + "," + total + ")");
            }
            if (ok == 0) {
                evalJs(resultJs(job, 0, fail, errors));
                return;
            }
            // If we bootstrapped an empty repo, remove the marker in the real commit,
            // unless the upload itself happens to contain a file with that name.
            if (bootstrapped && !containsPath(sc, dir, ".gitly-init")) {
                entries.put(new org.json.JSONObject()
                        .put("path", ".gitly-init")
                        .put("mode", "100644")
                        .put("type", "blob")
                        .put("sha", org.json.JSONObject.NULL));
            }
            evalJs("window.__folderStage && window.__folderStage(" + job + ","
                    + org.json.JSONObject.quote(fail > 0 ? "Committing the " + ok + " files that made it…" : "Creating commit…") + ")");
            // build the tree in chunks so no single request grows unbounded
            String treeSha = baseTree;
            for (int start = 0; start < entries.length(); start += 750) {
                org.json.JSONArray part = new org.json.JSONArray();
                for (int i = start; i < entries.length() && i < start + 750; i++) part.put(entries.get(i));
                org.json.JSONObject body = new org.json.JSONObject().put("tree", part);
                if (treeSha != null) body.put("base_tree", treeSha);
                treeSha = gh(token, "POST", "https://api.github.com/repos/" + owner + "/" + repo + "/git/trees",
                        body.toString()).getString("sha");
            }
            org.json.JSONObject commitBody = new org.json.JSONObject()
                    .put("message", message == null || message.isEmpty() ? "Upload files" : message)
                    .put("tree", treeSha);
            org.json.JSONArray parents = new org.json.JSONArray();
            if (parentSha != null) parents.put(parentSha);
            commitBody.put("parents", parents);
            String commitSha = gh(token, "POST", "https://api.github.com/repos/" + owner + "/" + repo + "/git/commits",
                    commitBody.toString()).getString("sha");
            if (parentSha != null) {
                try {
                    gh(token, "PATCH", "https://api.github.com/repos/" + owner + "/" + repo + "/git/refs/heads/" + branch,
                            new org.json.JSONObject().put("sha", commitSha).toString());
                } catch (Exception e) {
                    gh(token, "POST", "https://api.github.com/repos/" + owner + "/" + repo + "/git/refs",
                            new org.json.JSONObject().put("ref", "refs/heads/" + branch).put("sha", commitSha).toString());
                }
            } else {
                try {
                    gh(token, "POST", "https://api.github.com/repos/" + owner + "/" + repo + "/git/refs",
                            new org.json.JSONObject().put("ref", "refs/heads/" + branch).put("sha", commitSha).toString());
                } catch (Exception e) {
                    gh(token, "PATCH", "https://api.github.com/repos/" + owner + "/" + repo + "/git/refs/heads/" + branch,
                            new org.json.JSONObject().put("sha", commitSha).toString());
                }
            }
            evalJs(resultJs(job, ok, fail, errors));
        } catch (Exception e) {
            if (errors.size() < 8) errors.add(ghErr(e));
            evalJs(resultJs(job, ok, fail, errors));
        }
    }

    /** Streams one release asset straight to uploads.github.com — no base64,
     *  no memory cap, supports assets up to GitHub's 2 GB per-file limit. */
    private void uploadAssetStream(String token, String repoFull, String releaseId, Uri u, String name) throws Exception {
        String mime = null;
        try { mime = getContentResolver().getType(u); } catch (Exception ignored) { }
        if (mime == null || mime.isEmpty()) mime = "application/octet-stream";
        long size = querySize(u);
        java.io.InputStream in = getContentResolver().openInputStream(u);
        if (in == null) throw new Exception("cannot open file");
        java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(
                "https://uploads.github.com/repos/" + repoFull + "/releases/" + releaseId
                        + "/assets?name=" + java.net.URLEncoder.encode(name, "UTF-8")).openConnection();
        try {
            c.setRequestMethod("POST");
            c.setConnectTimeout(20000);
            c.setReadTimeout(600000);
            c.setRequestProperty("Authorization", "Bearer " + token);
            c.setRequestProperty("Accept", "application/vnd.github+json");
            c.setRequestProperty("User-Agent", "Gitly");
            c.setRequestProperty("Content-Type", mime);
            c.setDoOutput(true);
            if (size >= 0) c.setFixedLengthStreamingMode(size);
            else c.setChunkedStreamingMode(512 * 1024);
            java.io.OutputStream os = c.getOutputStream();
            byte[] b = new byte[256 * 1024];
            int r;
            while ((r = in.read(b)) > 0) os.write(b, 0, r);
            os.flush();
            os.close();
            int code = c.getResponseCode();
            String resp = readAll(code >= 400 ? c.getErrorStream() : c.getInputStream());
            if (code < 200 || code >= 300) throw new Exception("HTTP " + code + jsonMsg(resp));
        } finally {
            try { c.disconnect(); } catch (Exception ignored) { }
            try { in.close(); } catch (Exception ignored) { }
        }
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
     *  The folder is walked and every file is streamed to GitHub natively. */
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

    /** Opens the system multi-file picker. The picked files go through the same
     *  native single-commit pipeline as folder uploads — no base64 through the
     *  WebView, so large files work too. */
    @JavascriptInterface
    public void pickFiles() {
        folderJob++;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, PICK_FILES_REQ);
                } catch (Exception ignored) { }
            }
        });
    }

    /** Uploads a previously scanned job as one commit. Progress arrives in
     *  window.__folderProgress; the final report in window.__folderResult. */
    @JavascriptInterface
    public void uploadFolder(final int job, final String owner, final String repo,
                            final String dir, final String message) {
        final Scan sc = scan;
        if (sc == null || sc.job != job) {
            java.util.ArrayList<String> e = new java.util.ArrayList<>();
            e.add("Upload session lost — pick the folder again");
            evalJs(resultJs(job, 0, 1, e));
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() { uploadScan(job, sc, owner, repo, dir, message); }
        }).start();
    }

    /** Opens the system file picker and streams whatever you pick straight into
     *  a release as assets (up to 2 GB per file — GitHub's release limit).
     *  Reports back through window.__assetDone(ok, fail, message). */
    @JavascriptInterface
    public void pickAssets(final String repoFull, final String releaseId) {
        assetRepo = repoFull;
        assetRelease = releaseId;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, ASSET_REQ);
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
                        .setContentTitle(title == null ? "Gitly" : title)
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
                        c.setRequestProperty("User-Agent", "Gitly");
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
                req.setTitle(filename == null || filename.isEmpty() ? "Gitly download" : filename);
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
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Gitly", text));
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
