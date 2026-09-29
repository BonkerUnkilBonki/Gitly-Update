# OneGit — a One UI-inspired GitHub client for Android

## What's new in v2.34 — upload progress and notifications
- Uploads now show a live progress card with the current file, a
  "done / total" count and an accent progress bar (folder upload and
  Upload files)
- When an upload finishes successfully you get an Android system
  notification ("Upload complete — N files uploaded to repo")
- Cancelling the folder picker no longer leaves a stuck state

## What's new in v2.33 — fixed uploads over existing files
- Fixed "sha wasn't supplied" failures when uploading files that
  already exist in the repo: GitHub requires the current file sha to
  overwrite one. Folder upload, Upload files and Add file now check
  for an existing file first and overwrite it properly. The folder
  summary toast now also reports how many files failed

## What's new in v2.32 — upload folders to a repo
- New "Upload folder" button next to Add file / Upload files in the
  repo file browser: opens the system folder picker, walks the picked
  folder recursively and uploads every file while preserving the
  folder structure (subfolders included). Files land in the directory
  you are currently viewing. Limits: 200 files max, 10MB per file

## What's new in v2.31 — delete repository
- The Edit repository sheet now has a Danger zone with a Delete
  repository option, with a confirmation sheet that requires typing
  the repository name (like GitHub does) before the permanent delete
  goes through. Pinned references are cleaned up and you land back on
  the Repositories tab

## What's new in v2.30 — editable tags, Settings update panel
- The Edit release sheet now has a Tag field: change the tag of any
  release (drafts publish with the tag above)
- New "App updates" section in Settings: shows the installed version
  next to the latest release on GitHub, and when a newer one exists it
  lists the APK asset with a tap-to-download row plus a "Show update
  popup" button that replays the Home update popup on demand

## What's new in v2.29 — friendlier tag validation and API errors
- Fixed the "Validation Failed" error when publishing a release with a
  tag containing spaces: both the New release and Publish draft flows
  now check the tag up front and explain what is allowed (letters,
  numbers, dots, dashes - e.g. First-Stable)
- API errors now include GitHub's detailed reason instead of just
  "Validation Failed"

## What's new in v2.28 — publish drafts, rename files, instant updates
- Draft releases can now be published: the Edit release sheet shows a
  "Publish draft" section with a tag field and a Publish release
  button
- Uploaded files can be renamed: every release file row (on the
  Releases page and in the Edit release sheet) has a rename button
- Uploads and deletions now show up immediately: GitHub's API
  responses were being cached for up to a minute by the HTTP cache,
  so the app now always reads fresh data

## What's new in v2.27 — release files visible and removable
- Fixed uploaded files not appearing: uploading from the Edit release
  sheet now refreshes the release behind it, and the sheet itself
  shows a live "Files in this release" list with sizes and download
  counts after each upload
- Release assets can now be deleted: every file row on the Releases
  page and in the Edit release sheet has a delete button with a
  confirmation step

## What's new in v2.26 — fixed release asset uploads
- Fixed "Failed: OneGit.apk - Failed to fetch" when uploading files to
  a release: uploads.github.com does not send CORS headers, so the
  WebView blocked the upload. Release assets now upload through the
  native layer (no CORS restrictions) on a background thread, with the
  same progress toasts; affects New release and Edit release uploads

## What's new in v2.25 — attach files to new releases
- The New release sheet now has an "Attach files" section: pick any
  files from your device before publishing, see them listed with
  sizes, remove any you did not mean to add, and they upload
  automatically right after the release is published

## What's new in v2.24 — app update system
- New "Auto-download app updates" toggle in Settings: when you
  publish a new release on github.com/BonkerUnkilBonki/OneGit, the
  app detects it and downloads the update APK to your Downloads
  folder automatically (once per release)
- Update popup on the Home tab: when a newer release exists, a card
  slides in under the app bar for 20 seconds with an Update button
  (downloads the APK, or opens the releases page if no APK asset),
  then dismisses itself. It shows exactly once per release version -
  never again for the same one
- The preference syncs across devices via your private Gist
- Credits version line now reads from the app version automatically

## What's new in v2.23 — navigation follows the accent color
- The active tab pill in the bottom navigation bar now uses the
  selected accent color (with auto-contrast text) instead of a fixed
  black/grey pill, so it recolors with every accent, theme, dynamic
  and custom, just like the rest of the app

## What's new in v2.22 — instant pages, efficient saves
- Repos, Issues, repo detail and profile pages now paint instantly
  from the on-device cache the moment you navigate, then refresh
  silently in the background - no spinner flash on revisits
- On-device saves are more efficient: unchanged API responses are no
  longer rewritten to storage

## What's new in v2.21.1 — rollback of v2.22
- Restores the app to the v2.21 behavior: widget layout and colors,
  full-year contribution graph, no page-background glow, and the
  original page loading (spinner while fetching). All v2.22 changes
  are reverted.

## What's new in v2.34 — upload progress and notifications
- Uploads now show a live progress card with the current file, a
  "done / total" count and an accent progress bar (folder upload and
  Upload files)
- When an upload finishes successfully you get an Android system
  notification ("Upload complete — N files uploaded to repo")
- Cancelling the folder picker no longer leaves a stuck state

## What's new in v2.33 — fixed uploads over existing files
- Fixed "sha wasn't supplied" failures when uploading files that
  already exist in the repo: GitHub requires the current file sha to
  overwrite one. Folder upload, Upload files and Add file now check
  for an existing file first and overwrite it properly. The folder
  summary toast now also reports how many files failed

## What's new in v2.32 — upload folders to a repo
- New "Upload folder" button next to Add file / Upload files in the
  repo file browser: opens the system folder picker, walks the picked
  folder recursively and uploads every file while preserving the
  folder structure (subfolders included). Files land in the directory
  you are currently viewing. Limits: 200 files max, 10MB per file

## What's new in v2.31 — delete repository
- The Edit repository sheet now has a Danger zone with a Delete
  repository option, with a confirmation sheet that requires typing
  the repository name (like GitHub does) before the permanent delete
  goes through. Pinned references are cleaned up and you land back on
  the Repositories tab

## What's new in v2.30 — editable tags, Settings update panel
- The Edit release sheet now has a Tag field: change the tag of any
  release (drafts publish with the tag above)
- New "App updates" section in Settings: shows the installed version
  next to the latest release on GitHub, and when a newer one exists it
  lists the APK asset with a tap-to-download row plus a "Show update
  popup" button that replays the Home update popup on demand

## What's new in v2.29 — friendlier tag validation and API errors
- Fixed the "Validation Failed" error when publishing a release with a
  tag containing spaces: both the New release and Publish draft flows
  now check the tag up front and explain what is allowed (letters,
  numbers, dots, dashes - e.g. First-Stable)
- API errors now include GitHub's detailed reason instead of just
  "Validation Failed"

## What's new in v2.28 — publish drafts, rename files, instant updates
- Draft releases can now be published: the Edit release sheet shows a
  "Publish draft" section with a tag field and a Publish release
  button
- Uploaded files can be renamed: every release file row (on the
  Releases page and in the Edit release sheet) has a rename button
- Uploads and deletions now show up immediately: GitHub's API
  responses were being cached for up to a minute by the HTTP cache,
  so the app now always reads fresh data

## What's new in v2.27 — release files visible and removable
- Fixed uploaded files not appearing: uploading from the Edit release
  sheet now refreshes the release behind it, and the sheet itself
  shows a live "Files in this release" list with sizes and download
  counts after each upload
- Release assets can now be deleted: every file row on the Releases
  page and in the Edit release sheet has a delete button with a
  confirmation step

## What's new in v2.26 — fixed release asset uploads
- Fixed "Failed: OneGit.apk - Failed to fetch" when uploading files to
  a release: uploads.github.com does not send CORS headers, so the
  WebView blocked the upload. Release assets now upload through the
  native layer (no CORS restrictions) on a background thread, with the
  same progress toasts; affects New release and Edit release uploads

## What's new in v2.25 — attach files to new releases
- The New release sheet now has an "Attach files" section: pick any
  files from your device before publishing, see them listed with
  sizes, remove any you did not mean to add, and they upload
  automatically right after the release is published

## What's new in v2.24 — app update system
- New "Auto-download app updates" toggle in Settings: when you
  publish a new release on github.com/BonkerUnkilBonki/OneGit, the
  app detects it and downloads the update APK to your Downloads
  folder automatically (once per release)
- Update popup on the Home tab: when a newer release exists, a card
  slides in under the app bar for 20 seconds with an Update button
  (downloads the APK, or opens the releases page if no APK asset),
  then dismisses itself. It shows exactly once per release version -
  never again for the same one
- The preference syncs across devices via your private Gist
- Credits version line now reads from the app version automatically

## What's new in v2.23 — navigation follows the accent color
- The active tab pill in the bottom navigation bar now uses the
  selected accent color (with auto-contrast text) instead of a fixed
  black/grey pill, so it recolors with every accent, theme, dynamic
  and custom, just like the rest of the app

## What's new in v2.22 — theme-synced widgets, page glow, instant pages
- Widgets now follow the app's color scheme: theme (light/dark/AMOLED)
  and accent color selected in Settings are pushed to the widgets, so
  heatmap, cards and text recolor to match. Open the app once after
  changing theme/accent to refresh the widgets
- Bigger heatmap squares: widgets show the last 6 months (2x2 shows
  recent months) at roughly double the previous size
- New "page background glow": with Navigation glow enabled, a soft
  accent-colored glow rises from the bottom of the screen behind the
  navigation bar, matching the navbar glow and changing with the
  selected accent
- Faster, calmer page changes: Repos, Issues, repo detail and profile
  pages now paint instantly from the on-device cache, then refresh
  silently in the background - no more spinner flash when revisiting
  a page
- On-device saves are more efficient: unchanged API responses are no
  longer rewritten to storage

## What's new in v2.21 — widgets redesigned to match Productivity
- Contribution widgets now mirror the in-app Productivity page: dark
  card layout (page background #161719, cards #242527, One UI rounded
  corners) instead of the old single flat panel
- 4x4 widget: full Productivity overview - contribution graph with
  the "Less ... More" legend, "Right now" (this week, this month,
  current streak, longest streak, daily average, busiest day) and
  "This year on GitHub" (commits, pull requests, issues, reviews,
  new repos, contributions)
- 4x2 widget: contribution graph card plus this week / current
  streak / busiest day
- 2x2 widget: compact Productivity card with recent-months heatmap
  and streak/busiest-day footer
- Widget stats use the exact same math and query as the Productivity
  page, so numbers always match the app
- Tapping a widget now opens the Productivity page

## What's new in v2.20 — contribution widget redesign
- Fixed the contribution widget's heatmap being invisible: empty and
  low-activity cells were almost the same color as the widget
  background. New palette matches the in-app heatmap exactly (Samsung
  blue at 40/60/80/100%, visible empty cells)
- Widget levels now use the same buckets as the app (0 / 1-2 / 3-6 /
  7-11 / 12+) instead of scaling against your busiest day, so light
  days are visible and colors are consistent with the Productivity
  heatmap
- 2x2 widget now shows the last ~4 months at a readable size instead
  of a squeezed full year (stats still cover the whole year)
- Footer reads "Best day 79 · 3-day streak · 148 this year" and aligns
  with the header

## What's new in v2.19
- Fixed the white corner artifacts: the WebView's native background
  now follows the app theme (was fixed light gray, which leaked
  through GPU compositing gaps at rounded corners in dark themes)
- Extra compositing hardening: the glass navbar, app bar and bottom
  sheets render on their own GPU layers, eliminating the white
  L-shaped corner fragments on the files page and the white tips on
  sheet corners

## What's new in v2.18
- Fixed the viewer glitch (red fragments, overlapping header, clipped
  text) when opening very large files like big JSON exports: the file
  viewer now caps rendering at the first 60,000 characters / 2,000
  lines so the WebView never breaks, with a note showing where it cut
  off. Edit still works on the full content via the raw API

## What's new in v2.17
- The active tab pill in the bottom navigation now covers the whole
  tab — icon and label text together — with a smooth rounded capsule
  shape (previously it wrapped only the icon)

## What's new in v2.16
- Navigation bar is now a full capsule (fully rounded ends instead of
  squarical corners)
- New "Navigation glow" toggle in Settings > Appearance (off by
  default): when enabled, adds an accent-colored glow around the
  bottom bar and the active tab pill
- The navigation glow preference syncs across devices via your
  GitHub account

## What's new in v2.15 — glassmorphic navbar
- Restyled the bottom navigation to a professional floating glass bar:
  translucent frosted background with real blur, hairline border and
  a soft, diffuse shadow — no more neon glow
- Active tab is now a solid dark pill with white icon and label
  (adapts per theme: dark pill on the light glass, grey pill on dark
  and pitch black)

## What's new in v2.14
- Fixed the "Save changes" button (and all primary buttons) being hard
  to read with light accent colors — button text now auto-switches
  between white and dark based on the accent's brightness
- Alerts moved: the bell now lives at the top-right of the profile
  card (next to the profile picture) on Home and the profile page;
  the bottom nav is now Home, Repos, Issues
- On-device data saving: every page you visit is cached locally, so
  when you open the app offline you see your saved data instead of
  blank screens (with a small "Offline — showing saved data" toast);
  fresh data is fetched automatically whenever you are back online

## What's new in v2.13 — fast-switch glitch fixed
- Fixed the "Cannot set properties of null (setting 'innerHTML')"
  crash that appeared when quickly switching tabs or sections while a
  page was still loading (README, notifications and feed updates)
- Added a render-session guard across every view: when you switch
  tabs/sections, any in-flight load from the previous screen is
  discarded instead of overwriting the new screen or flashing stale
  content

## What's new in v2.12
- Removed the "One UI 9-inspired" line and the Samsung mention from the
  Credits page — the bullet list is now just version, sync note and
  the GitHub disclaimer

## What's new in v2.11
- Developer details (Name, Age, Profession) in the Credits tab are now
  centered under the logo, matching the card's centered layout

## What's new in v2.10
- Reverted the v2.9 profile-picture fallback changes per user request
  (avatars render exactly as before)
- Fixed a stray "NaN" that could appear in the profile card markup
  introduced by the reverted change

## What's new in v2.9 — Today's productivity
- The Productivity tab now has two sub-tabs: Overview and Today
- Today shows the selected day at a glance: big contribution count,
  a tappable bar chart of the last 7 days, and a date picker (plus a
  Today button) to inspect any particular day
- For the picked day it fetches per-day stats straight from GitHub:
  commits, pull requests, issues, reviews, and the exact repositories
  you committed to that day (tap to open)
- Avatar fix: profile pictures that fail to load now fall back to a
  rounded letter placeholder instead of showing blank, and a stale
  cached profile without a picture is refreshed from GitHub

## What's new in v2.8 — Productivity tab
- The Gists quicklink on Home is gone — replaced by a Productivity tab
  (also hidden from profile pages; gist pages still exist if you need
  them)
- Productivity shows, from GitHub's GraphQL contribution data:
  - Contribution graph for the last 12 months (accent-colored heatmap,
    scrollable, per-day tooltips)
  - This week / this month contribution counts, current and longest
    streak, daily average, busiest day
  - Yearly breakdown: commits made, pull requests, issues, reviews,
    new repos, total contributions
  - Most active repositories ranked by commits this year (tap to open)
- Stats are cached on-device, so the page opens instantly and refreshes
  in the background

## What's new in v2.7
- Persistent activity history: Recent activity is now saved on the
  device and never cleared — every refresh merges new events into the
  stored history (deduplicated, newest first, up to 300 events)
- Your own GitHub activity is included (pushes, releases, stars,
  forks…), not just events from people you follow, so the feed stays
  populated
- Home always shows the 3 latest events with a View all activity
  button below them; the activity page shows the whole accumulated
  history
- Credits: the logo moved into the Developer card, above the name

## What's new in v2.6
- Edit release: every release card has an Edit release button — change
  the title and release notes, and upload files straight into the
  release from the same sheet (multi-select via the device picker)
- Recent activity on Home now shows the latest 3 items; a View all
  activity button opens a full activity page with everything from
  people you follow (back arrow returns Home)
- Files tab: long-press any file to get the delete confirmation
  (with a small haptic buzz); a normal tap still opens the file

## What's new in v2.5 — credits page polish
- The OneGit logo (yes, the cat) now sits at the top of the Credits
  tab in Settings, rounded to match the card design with an accent
  glow
- Version info is now a proper bullet list, one item per line:
  Version, description, sync note, disclaimer

## What's new in v2.4 — full repo editing
- Upload files: any repo's Files tab has an Upload files button that
  opens the Android file picker (multi-select) and commits each file
  straight to the repo
- Edit file: tap a file in the Files tab, then Edit — make changes in
  the editor, write a commit message, and commit
- Delete file: same viewer, Delete button, with confirmation
- New release: the Releases page has a New release button — tag,
  title, description, Final / Pre-release / Draft
- Upload release assets: every release card has an Upload asset
  button that uploads any file from your device to that release
  (APKs, zips, anything)
- Edit repository: repos you can push to show an Edit repository
  button on the repo page — description, homepage and
  public/private visibility

## What's new in v2.3 — new app font
- The entire app now uses the bundled Google Sans Flex font (shown in
  your screenshot request) for every screen, card, button and label
- Font is embedded in the APK, works fully offline
- The old Font setting (System / App default) was removed since the
  app font is now always the bundled one; code blocks, diffs and file
  views intentionally stay monospace for readability

## What's new in v2.2
- Removed the "Your GitHub, the One UI way" tagline from the home header
- Auto-sync on open: OneGit quietly restores your synced preferences
  from your private Gist in the background every time the app opens —
  no waiting, the app is usable instantly
- On-device data cache: your profile and the Recent activity feed are
  cached locally, so the home screen appears immediately from cache and
  fresh data arrives silently in the background
- New Credits tab in Settings: version info, developer details, and
  connect buttons for Telegram (t.me/BonkerUnkilBonki) and GitHub
  (github.com/BonkerUnkilBonki) with logos, plus languages used

## What's new in v2.1 — issue creation everywhere
- New issue from the global Issues tab: a New issue button now sits at
  the top of the Issues tab in the bottom nav — pick one of your repos
  from the picker sheet, then write the title and description
- (Creating issues from a specific repo's Issues tab was already there
  and still works the same)

## What's new in v2.0 — create things on GitHub
- Create repository: Repos tab > New repository — name, description,
  Private/Public, optional README initialization; jumps straight into
  your new repo
- Create gist: Gists > New gist — description, filename, content,
  Secret/Public
- Add file: any repo's Files tab > Add file — filename, content and
  commit message, committed straight from the app
- Close / reopen issues and pull requests from the issue detail header
- Edit profile: your own profile page > Edit profile — name, bio,
  location

## What's new in v1.9
- Removed the custom TTF font import feature; the Font setting now offers
  System (default) and App default only

## What's new in v1.8
- Custom color: a dashed "Custom" dot in the accent picker opens a full
  color picker plus hex input — any color becomes your accent, with
  matching pressed/glow shades derived automatically
- Font options: System (default), App default, or Custom TTF —
  import any .ttf/.otf from your device (up to 4 MB) via the native
  file picker and OneGit renders its entire UI in your font
- Custom color and font preference sync across devices (the font file
  itself stays on the device that imported it)

## What's new in v1.7
- Glow effects toggle: Settings > Appearance > Glow effects — instantly
  kills every neon glow (buttons, cards, highlights, spinner, logo pulse)
  for a flat, battery-friendlier look; synced across devices
- Three new accent colors: Teal, Red, Indigo (9 accents total)
- Dynamic color: a rainbow "Dynamic" dot in Settings picks up your
  system / wallpaper accent (Material You) on Android 12+ and applies it
  to the whole UI — buttons, highlights, glows; falls back to blue where
  unavailable

## What's new in v1.6
- Contributions 4x2 wide widget: full-year heatmap plus best day, streak
  and yearly total, sized for a 4x2 slot
- Background GitHub activity notifications: OneGit now checks GitHub
  roughly every 15 minutes (even when closed) and posts system
  notifications for new issues, PRs, mentions, reviews, releases and CI
  results on repos you watch or participate in
  - Notification permission is requested on first launch (Android 13+)
  - Toggle in Settings > Notifications; re-arms itself after reboot
  - Deduplicated per thread — you get notified once per activity
  - Tapping a notification opens the Alerts tab

## What's new in v1.5
- Contribution activity widgets (long-press home screen > Widgets > OneGit):
  - Contributions 2x2: compact full-year heatmap
  - Contributions 4x4: full-year heatmap plus best day, current streak
    and yearly total
- One UI 9 styling: dark rounded cards, Samsung-blue contribution scale
  (empty -> bright), today's cell ringed
- Live data via GitHub GraphQL using your saved token; refreshes every
  30 minutes and every time you open the app
- All four OneGit widgets now: Profile, Quick, Contributions 2x2, 4x4

## What's new in v1.4
- Home screen widgets (long-press your launcher > Widgets > OneGit):
  - OneGit Profile: avatar, name and repo/follower stats, refreshed live
  - OneGit Quick: Home / Repos / Issues / Alerts launch pills
- Releases: view every release with notes, assets (size + download count),
  and one-tap in-app downloads via Android DownloadManager — plus
  Source code (zip / tar.gz) for every tag
- Clone sheet: HTTPS and SSH URLs with native copy buttons, Download ZIP
- Repo topics shown as chips
- Release assets download straight to your Downloads folder with a
  system notification (works for public repos; private-repo asset
  downloads may require re-auth in a browser)

## What's new in v1.3
- Fixed the empty space above the big header (title now sits right under the
  status bar like One UI)
- Repo actions: Star/Unstar, Watch/Unwatch, Fork (with confirmation), and
  Open on GitHub
- Language breakdown card on repo pages (colored bar + percentages)
- Create new issues from any repo (bottom sheet form)
- Followers / Following lists — tap the stats on any profile
- Gists: browse your gists and public gists of any user, view file contents
- Notifications filter: Unread / All
- Home quick links: Gists, Discover, My profile

## What's new in v1.2
- Settings moved from the bottom bar to a top-right gear icon (also in the
  collapsed app bar while scrolling)
- Bottom navigation auto-hides while scrolling down or after ~4s idle and
  slides back on any touch or upward scroll
- Fuller One UI 9 rounding: cards 32px, navbar 34px, bigger pills and radii
  everywhere; subtle card outlines in dark/pitch themes
- Five accent color schemes: Blue, Purple, Green, Pink, Amber — recolors
  buttons, highlights, glows and the login logo; synced across devices

## What's new in v1.1
- Pitch black (AMOLED) theme — third theme option alongside light and dark
- Home activity feed (pushes, stars, forks, issues, PRs, releases)
- Commits tab per repo + full commit detail with colorized diffs
- Releases page per repo, contributors row on repo detail
- Pull requests view (global and per repo) — open PRs, comment on them
- User profiles: tap any username/avatar — stats, popular repos, follow/unfollow
- People results in search, Discover tab (trending high-star repos)
- Animations and glows: staggered card entrances, press feedback, glowing
  buttons/nav/toasts, star pin pop, sheet slide-up, refresh button
- Status and navigation bar colors follow the selected theme natively

OneGit is a lightweight GitHub client wrapped in a Samsung One UI-style interface:
big collapsing titles, floating pill bottom navigation, rounded cards, segmented
controls, pill buttons and a dark mode with the One UI dark palette.

## The APK

`OneGit.apk` — install it on any Android 7.0+ (API 24) device. It is signed with
the included debug keystore, so future builds signed with the same key will
install as updates over this one.

## Signing in

OneGit connects to GitHub with a personal access token (the same idea as the
official GitHub CLI or third-party clients):

1. In the app, tap "Create a token with the right scopes" (or visit
   https://github.com/settings/tokens/new?scopes=repo,read:user,notifications,gist&description=OneGit).
2. Generate the token and paste it into OneGit.

Scopes used: `repo`, `read:user`, `notifications`, `gist`.
The token is stored only on your device (localStorage inside the app).

## Sync across devices

- All GitHub content (repos, issues, notifications) is fetched live from your
  account, so every device you sign in on shows the same thing.
- App preferences (pinned repositories, theme) are additionally saved to a
  private Gist in your GitHub account. On a new device, sign in and your pins
  and theme are restored automatically ("Restore from GitHub" in Settings).
- The access token is never synced — you enter it once per device.

## Features

- Home: profile, stats, pinned repositories
- Repositories: your repos, starred repos, GitHub search, pin/unpin
- Repo detail: README rendering, file browser with file viewer, issues
- Issues: created/assigned, open/closed, full issue threads with comments,
  post comments
- Notifications: unread threads, open thread subject, mark read / mark all
- Settings: dark mode, sync management, sign out

## Project layout

    AndroidManifest.xml     app manifest (com.onegit)
    src/com/onegit/         MainActivity (WebView wrapper)
    assets/www/             the whole client UI (HTML/CSS/JS, no framework)
    res/                    theme, strings, launcher icons
    gen_icon.py             regenerates launcher icons (Pillow)
    build.sh                builds the APK without Gradle
    debug.keystore          signing key (keep it to sign updates)

## Building

The build script uses only Android build-tools + a JDK (no Gradle):

    # one-time toolchain setup
    export SDK=/path/to/sdk
    # build-tools 34.0.0 in $SDK/build-tools/34.0.0
    # platform android-34 in  $SDK/platforms/android-34/android.jar
    # JDK 17 on PATH

    bash build.sh          # produces OneGit.apk

Icons can be regenerated with `python3 gen_icon.py`.

## Notes

- Not affiliated with GitHub or Samsung; One UI is used purely as a visual
  inspiration.
- The web UI is plain HTML/CSS/JS served from the app's assets, so it can also
  be opened in any browser as a PWA-style page if you extract assets/www/.
