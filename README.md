OneGit — GitHub Client for Android

OneGit is a lightweight GitHub client for Android with a Samsung One UI-inspired interface. It combines GitHub repository management, issues, pull requests, releases, notifications, profile features, widgets, customization, and full repository editing in a rounded One UI-style design.

Core Interface & Design

- Samsung One UI-inspired interface with:
  - Large collapsing titles
  - Floating pill-shaped bottom navigation
  - Rounded cards and controls
  - Segmented controls and pill buttons
  - Dark and AMOLED-friendly themes
  - Smooth animations and press feedback
  - Optional neon glow effects
- OneGit uses the bundled Google Sans Flex font throughout the interface.
- Code blocks, diffs, and file views use monospace fonts for readability.
- Status and navigation bars follow the selected theme.
- Supports light, dark, and pitch-black AMOLED themes.
- Multiple accent colors plus:
  - Custom accent color with color picker and hex input
  - Dynamic Material You color on Android 12+
- Glow effects can be enabled or disabled for a flatter, more battery-friendly appearance.
- Bottom navigation automatically hides while scrolling and returns on interaction.

Home

- GitHub profile information
- Avatar, name and account statistics
- Pinned repositories
- Recent GitHub activity feed
- Cached profile and activity data for instant loading
- Fresh data silently synchronizes in the background
- Quick links to:
  - Repositories
  - Issues
  - Alerts
  - Gists
  - Discover
  - Profile

Repositories

- View your repositories
- View starred repositories
- Search GitHub repositories
- Pin and unpin repositories
- Repository details with:
  - README rendering
  - File browser
  - File viewer
  - Issues
  - Commits
  - Releases
  - Contributors
  - Repository topics
  - Language breakdown
- Star / unstar repositories
- Watch / unwatch repositories
- Fork repositories
- Open repositories directly on GitHub
- Clone information with:
  - HTTPS URL
  - SSH URL
  - Native copy buttons
  - Download ZIP

Repository Creation & Editing

- Create new repositories directly from the app
- Set:
  - Repository name
  - Description
  - Public/private visibility
  - Optional README initialization
- Edit repositories you have permission to push to:
  - Description
  - Homepage
  - Public/private visibility

File Management

OneGit supports full basic repository file management directly from Android.

- Browse repository files
- View file contents
- Add/create files
- Upload files from the Android file picker
- Multi-select file uploads
- Edit existing files
- Delete files with confirmation
- Enter commit messages when modifying files
- Changes are committed directly to GitHub

Commits & Code

- Repository commits tab
- Full commit details
- Colorized code diffs
- File viewer with readable code presentation
- Repository language breakdown with percentages

Issues

- Global Issues section
- View issues created by or assigned to you
- Open and closed issues
- View complete issue threads
- Post comments
- Create issues from:
  - Global Issues tab
  - Individual repository Issues tab
- Select a repository when creating an issue globally
- Close and reopen issues directly from issue details

Pull Requests

- Global and repository-specific pull request views
- View open pull requests
- Open pull request details
- Comment on pull requests
- Close and reopen pull requests directly from the detail screen

Releases

- View all repository releases
- Release notes and metadata
- View release assets
- Asset sizes and download counts
- Download release assets directly to Android Downloads
- Android DownloadManager integration
- Source-code downloads for tags:
  - ZIP
  - TAR.GZ
- Create new releases with:
  - Tag
  - Title
  - Description
  - Final release
  - Pre-release
  - Draft
- Upload release assets directly from the device
- Supports files such as APKs, ZIPs and other assets

Gists

- Browse your own gists
- Browse public gists from other users
- View gist file contents
- Create new gists
- Configure:
  - Description
  - Filename
  - Content
  - Public/private visibility

Profiles & People

- View GitHub user profiles
- Profile statistics
- Popular repositories
- Follow / unfollow users
- Followers and following lists
- Tap usernames and avatars throughout the app to open profiles
- Search for people on GitHub

GitHub Search & Discover

- Search GitHub repositories
- Search for people
- Discover trending/high-star repositories

Notifications & Alerts

- GitHub notification center
- Unread and all notification filters
- Open notification threads
- View notification subjects
- Mark individual notifications as read
- Mark all notifications as read
- Background activity monitoring
- System notifications for new:
  - Issues
  - Pull requests
  - Mentions
  - Reviews
  - Releases
  - CI results
- Background checks run approximately every 15 minutes
- Notifications are deduplicated per thread
- Notification permission support on Android 13+
- Notification monitoring can be enabled/disabled in Settings
- Notification monitoring re-arms after device reboot
- Tapping a notification opens the relevant Alerts section

Widgets

OneGit provides four Android home-screen widgets:

- Profile Widget
  
  - Avatar
  - Name
  - Repository statistics
  - Follower statistics

- Quick Widget
  
  - Home
  - Repositories
  - Issues
  - Alerts

- Contributions 2×2
  
  - Compact yearly GitHub contribution heatmap

- Contributions 4×4
  
  - Full-year contribution heatmap
  - Best contribution day
  - Current streak
  - Yearly total

Contribution widgets use live GitHub GraphQL data and refresh periodically as well as when the app is opened.

Contributions

- Full-year GitHub contribution heatmap
- Best contribution day
- Current streak
- Yearly contribution total
- One UI-inspired contribution colors
- Today's contribution cell is highlighted

Sync & Data

- GitHub content is fetched live from your account.
- Profile and recent activity are cached locally for faster startup.
- App preferences such as pinned repositories and theme can be synchronized through a private GitHub Gist.
- Preferences automatically restore when signing in on another device.
- Sync happens in the background without blocking normal app usage.
- GitHub access tokens are not synchronized between devices.
- Each device requires its own token.

Authentication

OneGit uses a GitHub Personal Access Token.

Required scopes:

- "repo"
- "read:user"
- "notifications"
- "gist"

The access token is stored locally on the device and is not synchronized to other devices.

Settings & Customization

Settings include:

- Light / Dark / AMOLED themes
- Accent color selection
- Custom accent color
- Dynamic Material You colors
- Glow effects toggle
- Notification controls
- GitHub preference synchronization
- Sign out
- Credits and application information

The Credits section contains:

- Version information
- Developer information
- GitHub link
- Telegram link
- Logos
- Languages used in the project

Android Support

- Android 7.0+ / API 24+
- Native Android file picker integration
- Android DownloadManager integration
- Android system notifications
- Home-screen widgets
- Android 12+ Material You dynamic colors
- Android 13+ notification permission support

Technical Overview

- Lightweight Android application
- Main Android activity uses a WebView wrapper
- UI is built with plain HTML, CSS and JavaScript
- No frontend framework
- Web assets are bundled inside the APK
- Can also be opened as a PWA-style web interface by extracting the "assets/www/" files
- APK can be built without Gradle using Android build-tools and a JDK
- Project includes a build script and launcher-icon generator

Latest Overall Feature Set

In short, OneGit is now a full-featured GitHub client rather than just a GitHub viewer. It supports browsing and searching GitHub, repository management, file creation/upload/edit/delete, commits and diffs, issues, pull requests, releases and release uploads, gists, profiles, followers, notifications, contribution widgets, GitHub preference sync, and extensive One UI-style customization—all from Android.