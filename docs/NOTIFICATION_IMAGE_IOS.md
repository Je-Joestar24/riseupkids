# Notification pictures on iPhone

A push notification can carry a picture (the one the admin uploads on the campaign, or the app icon when there is
none). **Android** shows it with nothing extra. **iPhone** only shows it if a small extension inside the app
downloads the picture and attaches it before the notification appears. Until that extension existed, iPhones got the
text only.

## How it works

1. The admin uploads a picture on the campaign (stored on S3 / CloudFront, public https address).
2. The backend (`services/notificationPush.services.js`, `buildPushPayload`) puts the address in `richContent.image`
   and sets `mutableContent: true`. Without `mutableContent` iOS never runs the extension.
3. Expo's push service forwards it to Apple. In the payload iOS receives, the picture sits at
   `userInfo["body"]["_richContent"]["image"]`.
4. The **Notification Service Extension** (`app/targets/notification-service/NotificationService.swift`) reads that
   address, downloads the picture (20 s limit), attaches it, and hands the notification back to iOS.

If anything goes wrong (no picture, a bad link, the download fails or is slow, the picture is too big or in a format
iOS cannot attach) the notification is shown **as it came, without the picture**. It is never lost or delayed more than
the 20 s limit.

## Rules for the picture

- **JPG or PNG** (GIF also works). **WebP is not shown on iPhone**: iOS cannot attach it. The admin form accepts
  WebP, so use JPG or PNG for campaigns that iPhone families should see with a picture.
- At most **10 MB** (iOS limit). The link must be **https** and public.
- Android has no such format limit.

## Files

| File | What it is |
|---|---|
| `app/targets/notification-service/NotificationService.swift` | The extension code. |
| `app/targets/notification-service/Info.plist` | Tells iOS this is a notification service extension. |
| `app/targets/notification-service/expo-target.config.js` | Tells the `@bacons/apple-targets` plugin to build it. |
| `app/app.json` | Lists the `@bacons/apple-targets` plugin. |
| `backend/services/notificationPush.services.js` | Sends `richContent.image` + `mutableContent`. |

## Building it (once, from `app/`)

1. `npm install @bacons/apple-targets` (adds the dependency to `package.json` and `package-lock.json`; commit both).
2. Build for iOS with EAS, signed in to the Apple Developer account, e.g. `eas build -p ios --profile production`.
   The extension is a second small app inside the app with its own identifier (the app's `com.riseupkids.app` plus a
   suffix chosen by the plugin), so EAS asks to create its identifier and provisioning profile the first time. No new push key is needed: the existing Apple push key keeps working.
3. Release it like any iOS build. It does **not** work in Expo Go or the simulator.

## Checking it on a real iPhone

1. Install the new build, sign in as a parent, allow notifications.
2. Admin → Notifications → a campaign **with a JPG or PNG picture** → **Send test** to that parent.
3. Close the app (or lock the phone). The notification should show the picture; pulling it down (long press) shows it
   larger.
4. No picture? Check in this order: the picture is JPG/PNG and under 10 MB; its link opens in a browser; the build is
   the new one (not an older install); the notification arrived while the app was in the background.

## Tests

`backend/tests/notificationImage.e2e.test.js` (campaign -> send -> the exact message handed to Expo for every device),
`backend/tests/notificationPush.service.test.js` (the payload), and
`backend/tests/notificationImage.iosExtension.contract.test.js` (the backend and the extension agree on where the
picture is; the app is set up to build the extension). Swift itself cannot be run in these tests; the real check is the
device test above.
