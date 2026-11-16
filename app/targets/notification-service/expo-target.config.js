/**
 * iOS Notification Service Extension: shows the image of a push notification.
 *
 * iOS only displays a push image if a small extension inside the app downloads it and attaches it before the
 * notification is shown (Android needs nothing). The backend sends the image as `richContent.image` and marks the
 * push `mutableContent`, which is what lets this extension run. See NotificationService.swift and
 * docs/NOTIFICATION_IMAGE_IOS.md.
 *
 * Built by the `@bacons/apple-targets` plugin (listed in app.json) during `expo prebuild` / an EAS iOS build.
 *
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = () => ({
  type: 'notification-service',
  // Nothing special to sign with: the extension needs no App Group, keychain or other capability.
  entitlements: {},
});
