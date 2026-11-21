# JerryTunes — Music Player
**Complete Context & Architecture Document**

*Use this document to provide full context to any AI assistant so they understand the current state, architecture, and strict rules of the project.*

## 1. Tech Stack
* **Framework:** React Native + Expo (SDK ~57.0)
* **Language:** TypeScript (Frontend) / Node.js (Backend)
* **Audio Engine:** `expo-audio` (~57.0.5)
* **Backend:** Local Express Proxy Server (`server/index.js`) using `youtube-sr` (Search) and `youtube-dl-exec` (Stream URL Extraction).

## 2. Core Architecture
* **Frontend/Backend Networking:** The app communicates with a local proxy. For physical device testing, `src/config/api.ts` extracts the LAN IPv4 address dynamically from `Constants.experienceUrl` (e.g., `192.168.1.x`) to prevent `localhost` connection refusals on real iPhones.
* **Audio Sourcing:** The backend does **not** proxy binary data. It resolves the direct `googlevideo.com` `.m4a` URL via `/api/stream` and passes it to the frontend.
* **Playback Management:** `src/context/AudioContext.tsx` acts as the global state for the player, queue, repeat/shuffle modes, and tracks the origin of playback (`playbackContext` e.g., Search, Library).
* **Native Audio Configuration:** `app.json` includes `"bundleIdentifier": "com.jerrytunes.app"` and `UIBackgroundModes: ["audio"]`. Background audio requires a native **EAS Development Build** (Expo Go suspends background processes on physical devices).

## 3. Critical Fixes & "LOCKED" Code (Do NOT Break)
The following behaviors have been stabilized through extensive debugging and must be preserved:
1. **Search Logic:** Search fetches properly using the LAN API resolver. Detailed error logging exists in `SearchScreen.tsx`.
2. **Authoritative Duration:** Native iOS `AVPlayer` fundamentally miscalculates VBR `.m4a` durations (often doubling them). `NowPlayingScreen.tsx` parses the 100% authoritative duration string directly from YouTube metadata (e.g., `"4:00" -> 240,000ms`) to override the native player. **Never rely on `status.duration` for maximum time.**
3. **Decoupled Scrubbing (Seek Architecture):** The progress bar in `NowPlayingScreen.tsx` uses a local `isScrubbing` state. The slider is fully detached from `expo-audio` events while dragging so the UI doesn't snap backwards. It emits exactly **one** seek request on release, with a 500ms shield against stale native events.
4. **Anti-Lag Buffering:** `AudioContext.tsx` initializes the player with `preferredForwardBufferDuration: 30`. This aggressively buffers 30 seconds of audio ahead to defeat temporary network drops without ruining "Time-to-First-Byte" speed.

## 4. Strict Rules for Future Development
* **No Speculative Guesses:** Any changes to the playback engine must be fully audited and proven.
* **Physical iPhone is the Target:** "Works in browser" is not enough. Changes must survive real iOS native capabilities.
* **Video is Postponed:** Do not implement video features until audio is 100% production-ready.
* **Respect Existing Systems:** Do not redesign working UI components (Now Playing, Mini Player, Library, Search) or rewrite working systems just to make them look different. Keep changes minimal and surgically integrated.
* **Context-Aware Playback:** Next/Previous must strictly respect the `playbackContext` (e.g., if playing from Search, "Next" plays the next result in the Search array, not a random song).

## 5. Development Build Execution
To run the app on a physical iPhone with background audio support:
1. `eas login`
2. `eas device:create`
3. `eas build --profile development --platform ios`
4. Scan the QR code, install, and run `npx expo start --dev-client`.

## 6. Features Ported from iKoda (Koda Architecture)
This copy (`JerryTunes_Koda`) integrates the following core capabilities adapted from `Ivorisnoob/iKoda`:
1. **Synchronized Karaoke Lyrics Engine:**
   * **Backend:** `/api/lyrics` on Express proxy querying LRCLIB with sanitized metadata and title-fallback search.
   * **Frontend:** `LyricsView.tsx` component with `.lrc` timestamp parsing, auto-scrolling to active lines, and tap-to-seek functionality.
   * **UI Integration:** Toggle button in `NowPlayingScreen.tsx` switching between album artwork and synchronized lyrics while preserving all locked duration and scrubbing safeguards.
2. **Koda-Style Dynamic Home Recommendations:**
   * **Backend:** `/api/home` fetching Quick Picks and Trending Charts.
   * **Frontend:** `HomeScreen.tsx` upgraded with horizontal carousels for "Quick Picks" and "Trending Hits" alongside "Recently Played".

