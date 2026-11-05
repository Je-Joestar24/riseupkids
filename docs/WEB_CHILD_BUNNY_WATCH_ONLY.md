# Web child side — Bunny embed, watch-only (copied from the phone app)

The client is focusing the video player on Bunny Stream embeds. The phone app already plays them "watch only"
(`docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md`, `app/components/child/common/bunny-embed-webview.tsx`). This copies that
behaviour to the web player. Web only; no backend change, no new library.

## How the phone app does it, and the web equivalent

| Phone app | Web |
|---|---|
| URL settings `autoplay`, `preload`, `playsinline`, `disableIosPlayer`, `disableAirplay`, `showSpeed=false`, `chromecast=false`, `muted=false` | Same settings (`buildBunnyEmbedWatchUrl`, same "watchOnly" preset). A stored `muted=true` or `autoplay=false` no longer wins |
| Both Bunny hosts accepted for playing (`iframe.` and `player.mediadelivery.net`) | Same. Saving a video (admin) still accepts only the `iframe.` host, as the server does |
| Injected script hides Bunny's control bar | **Not possible on the web** (a page cannot reach into another site's page). Instead the controls cannot be touched once the video plays; Bunny hides them by itself while playing |
| A transparent "wall" over the video: taps never reach Bunny's controls; a tap plays or pauses | A clear cover button over the video (also reachable from the keyboard), put up once the embed reports that it is playing; the embed is also made unreachable by keyboard behind it. A tap sends play / pause to the embed |
| A small play / pause badge for one second after a tap | Same badge, same length |
| No Bunny fullscreen, no picture in picture, no AirPlay | `fullscreen` and `picture-in-picture` are removed from the frame's permissions; AirPlay and Chromecast are off by URL |
| Error with **Try again** if the video does not load | If the embed does not load within 15 s, or the player reports a media failure: the reason and **Try again** (rebuilds the frame) |
| "No video is available" when there is no Bunny address | Same message (it used to leave "Loading video..." for ever) |
| Fullscreen icon in the title bar | On touch phones whose browser can do it (Android Chrome), a Full screen button in the title bar, upright and sideways. iPhone Safari cannot, so nothing is shown |
| Manual "I finished watching", close confirmation | Already the same on the web; unchanged |

## The full-screen view (a Bunny video on a phone held sideways)

As in the app's full-screen mode, the picture fills the whole screen and nothing else is drawn except:

- **top right:** the screen toggle (Full screen / Leave full screen: real full screen and a sideways lock on Android Chrome);
- **bottom left:** "I finished watching", over the picture;
- **the middle:** a play button while the video is paused or has ended (it stays until the video plays), and a
  pause badge for one second after it resumes. A tap anywhere on the picture plays or pauses.

There is **no header, no title and no Close button** in this view. To leave without finishing, the child turns the
phone upright: the card has its title, Full screen and Close, exactly as before. A computer, a phone held upright,
and uploaded-file videos keep their existing layouts. On iPhone Safari (no full screen) the toggle is not drawn.

## Bunny's own control bar

The web cannot hide Bunny's controls (a page cannot reach into another site's page, and the embed address has no
setting for it: only speed, Chromecast and AirPlay). What the player does: nothing in Bunny's bar can be touched once
the video plays, and Bunny hides the bar by itself while playing. While paused, Bunny keeps its bar on screen
under our play button. The clean fix is on Bunny's side: in the Bunny dashboard, open the video library's **Player**
settings and switch off the controls that should not show (progress bar, volume, speed, settings, full screen,
Chromecast, AirPlay), leaving play / pause. Library settings apply to every embed, the phone app and the web alike.
(The Bunny page names "player controls" at library level; the exact labels in the dashboard were not checked.)

## How the cover stays safe

The web talks to the embed with the Player.js messages Bunny supports (`play`, `pause`, and the `ready`, `play`,
`pause`, `ended`, `timeupdate`, `error` events; Bunny's docs: playback control API). The cover is put up **only after
the embed has said "playing"**. If it never does (autoplay refused by the browser, a player that does not answer,
messages blocked) there is no cover and Bunny's own play button works, so a child can never be locked out of
starting the video. A refused autoplay (error code 5) is not shown as an error.

## What this does not do

- It was **not tried against a real Bunny video** (no library or video id available here). The messages follow the
  standard Player.js format, but Bunny's page does not spell out the raw messages. The tests simulate the embed. The
  first real check is on a phone and a computer with a real video (steps below).
- Bunny's control bar is visible for the first seconds, until Bunny hides it, because the web cannot hide it.
- Bunny's own full screen is now off for every device, as in the app. A computer has no replacement button.
- Uploaded files (`<video>`) still play as before. "Only Bunny" would mean removing that branch; it was left in
  place because existing videos may still use it (decision pending).
- Auto-saving a finished video is not added: the app uses the manual "I finished watching" button.

## Tests

- `utils/bunnyExploreEmbed.test.js` (new) - the admin check is unchanged (iframe host only); playing accepts both
  hosts and rejects plain http, look-alike hosts and non-embed paths; the watch-only settings are exactly the app's;
  stored settings (a saved `muted=true`, `autoplay=false`) do not win; other Bunny settings are kept.
- `utils/bunnyPlayerBridge.test.js` (new) - sends play and pause only to the embed's own address; subscribes on
  "ready"; ignores messages from another window, another site, a look-alike host, other libraries, bad JSON; stops
  after destroy.
- `components/child/common/BunnyEmbedIframe.test.jsx` (26, new) - the settings, permissions and referrer policy of
  the frame; no cover before the video plays (and none if the embed never answers); the cover, keyboard lock, tap to
  pause and play, the one-second badge (not on the very first start); a refused autoplay is not an error; a media
  failure and a 15 s silence show the reason and Try again, which rebuilds the frame; the unlocked version never
  covers; no address shows a message.
- `utils/bunnyPlaybackResolution.test.js` (11, new) - a course or Explore video on either Bunny host plays as an
  embed whichever field holds the address; a file, another site or a look-alike host stays a file.
- `components/child/common/VideoPlayerModal.layout.test.jsx` (34) - updated: the Bunny frame has no full screen or
  picture in picture and the address carries the watch-only settings; the Full screen button is in the title bar of
  an upright phone too, where the browser can do it; computers and tablets never get it.
- Broken on purpose to confirm the tests catch it (46 ways): either host rule loosened or tightened, plain http or
  look-alike hosts accepted, each watch-only setting dropped or overridden, a stored setting winning, messages
  accepted from any window or site or sent to any site, no subscription on ready, listening forever, the cover up
  from the start or never, the keyboard not locked, Bunny full screen or picture in picture allowed, a tap that
  never pauses, the badge on the first start or never hiding or missing for pause, no timeout or a timeout after
  loading, Try again not rebuilding, a refused autoplay shown as an error or a media failure ignored, no play on
  ready, no referrer policy, the unlocked version messaging, the cover surviving a new video, and the Full screen
  button on every screen. One break was badly written (it changed nothing) and was redone; one gap (nothing tested
  that course and Explore videos accept the newer host) was closed. All were caught.
- Full-screen view (`VideoPlayerModal.layout.test.jsx`, `BunnyEmbedIframe.test.jsx`): no header, title, Close or footer
  on a sideways phone; the toggle top right and "I finished watching" bottom left, both above the cover; no toggle on
  iPhone-like browsers; the upright card, computer and file-video layouts unchanged; the same Bunny frame kept when
  the phone is rotated; the play button stays while paused or ended, a pause badge for one second after resuming, the
  play arrow and pause symbol, and the button never takes the taps. 15 more break-it checks (header back, toggle or
  finish button missing / moved / under the cover, play button vanishing, wrong icon, taking taps); three gaps they
  exposed (position, stacking order, icons) were closed and all are caught.
- Whole web suite: 67 files, 904 tests pass (was 63 files, 806 tests). `vite build` compiles; the first file grew by
  under 1 kB.

## Check by hand

1. Open a Bunny video from Explore and from a course (computer, then phone). It starts by itself with sound; if the
   browser blocks sound it shows Bunny's play button, which works.
2. Once it plays, tap or click the picture: it pauses and a pause badge shows for a second; again: it plays with a
   play badge. Bunny's bar, speed menu and full screen cannot be used. Press Tab: the focus lands on the video
   cover button, not inside Bunny.
3. Let it end, tap: it plays again. "I finished watching" still records and closes.
4. Turn the wifi off (or block `mediadelivery.net`) and open a video: after about 15 s the message and Try again
   show; turn it back on and press Try again.
5. Android Chrome: the title bar has a Full screen button, in both positions of the phone. iPhone: no button.
6. If anything above does not behave (for example a tap does not pause), tell me what you see: that would mean the
   embed answers differently from the standard Player.js messages and the cover can be adjusted.
