# OneGit — a One UI-inspired GitHub client for Android

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
