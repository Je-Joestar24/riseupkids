/**
 * The server and the iPhone app have to agree on where the notification picture is.
 *
 * The backend puts the https link in `richContent.image` and sets `mutableContent`. Expo's push service hands iOS a
 * payload where that sits at `userInfo["body"]["_richContent"]["image"]`, and the app's Notification Service
 * Extension (Swift, app/targets/notification-service) reads it from there. Swift cannot be run here, so this test
 * reads the extension's files and proves they match what the backend sends, so neither side can change quietly and
 * leave iPhones without pictures.
 *
 * Also checks the app is set up to BUILD the extension (the plugin in app.json, the dependency, the target config).
 */
const fs = require('fs');
const path = require('path');
const { buildPushPayload } = require('../services/notificationPush.services');

const APP = path.join(__dirname, '..', '..', 'app');
const TARGET = path.join(APP, 'targets', 'notification-service');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

describe('iPhone notification picture: the backend and the extension agree', () => {
  const swift = read(TARGET, 'NotificationService.swift');
  const plist = read(TARGET, 'Info.plist');

  it('the backend sends the link where the extension looks for it, and allows the extension to run', () => {
    const payload = buildPushPayload({ title: 'T', message: 'M', imageUrl: 'https://media.riseup.kids/a.jpg' });

    expect(payload.richContent).toEqual({ image: 'https://media.riseup.kids/a.jpg' });
    expect(payload.mutableContent).toBe(true);

    // The extension reads `richContent` (as Expo wraps it: `_richContent`, inside `body`) and its `image`
    expect(swift).toMatch(/userInfo\["body"\] as\? \[String: Any\]/);
    expect(swift).toMatch(/\["_richContent", "richContent"\]/);
    expect(swift).toMatch(/rich\["image"\] as\? String/);
  });

  it('the extension is a real notification service extension', () => {
    expect(swift).toMatch(/class NotificationService: UNNotificationServiceExtension/);
    expect(swift).toMatch(/func didReceive\(/);
    expect(swift).toMatch(/override func serviceExtensionTimeWillExpire\(\) \{/);
    expect(plist).toContain('com.apple.usernotifications.service');
    expect(plist).toContain('$(PRODUCT_MODULE_NAME).NotificationService');
  });

  it('the extension attaches the picture and never loses the notification', () => {
    expect(swift).toMatch(/UNNotificationAttachment\(identifier: "image"/);
    expect(swift).toMatch(/content\.attachments = \[attachment\]/);
    // every failure path still shows the notification
    expect(swift).toMatch(/guard let imageUrl = NotificationService\.imageUrl\(from: request\.content\.userInfo\) else \{\s*finish\(content\)/);
    expect(swift).toMatch(/error == nil,[\s\S]*else \{\s*self\.finish\(content\)/);
    // the handler can only be called once
    expect(swift).toMatch(/contentHandler = nil/);
  });

  it('only https pictures, only formats iOS can attach, and a size limit are accepted', () => {
    expect(swift).toMatch(/url\.scheme\?\.lowercased\(\) == "https"/);
    expect(swift).toMatch(/case "image\/jpeg", "image\/jpg": return "jpg"/);
    expect(swift).toMatch(/case "image\/png": return "png"/);
    // WebP is refused (iOS cannot attach it), so the notification shows without the picture instead of failing
    expect(swift).not.toMatch(/case [^\n]*"image\/webp"/);
    expect(swift).toMatch(/if mime\.hasPrefix\("image\/"\) \{ return nil \}/);
    expect(swift).toMatch(/maxImageBytes: Int64 = 10 \* 1024 \* 1024/);
  });
});

describe('the app is set up to build the extension', () => {
  it('lists the apple-targets plugin in app.json', () => {
    const appJson = JSON.parse(read(APP, 'app.json'));

    expect(appJson.expo.plugins).toContain('@bacons/apple-targets');
  });

  it('declares the apple-targets dependency in package.json', () => {
    const pkg = JSON.parse(read(APP, 'package.json'));

    expect(pkg.dependencies['@bacons/apple-targets']).toBeTruthy();
  });

  it('declares the target as a notification service', () => {
    const config = require(path.join(TARGET, 'expo-target.config.js'));
    expect(config().type).toBe('notification-service');
  });

  it('the dependency is also in the lock file, so an EAS build (which installs from it) finds it', () => {
    const lock = JSON.parse(read(APP, 'package-lock.json'));
    expect(lock.packages['node_modules/@bacons/apple-targets']).toBeTruthy();
  });
});
