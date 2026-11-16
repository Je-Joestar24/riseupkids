import UserNotifications

/// Shows the image of a push notification.
///
/// The backend sends the image as `richContent.image` (an https link) and marks the push `mutableContent`, so iOS
/// runs this extension before showing it. Expo's push service puts the field inside the `body` dictionary of the
/// payload (`userInfo["body"]["_richContent"]["image"]`); the other spellings are read too, so a change on the way
/// does not silently drop the picture.
///
/// This must never block or lose the notification: whatever goes wrong (no image, a bad link, a download that
/// fails or takes too long, a format iOS cannot attach such as WebP), the notification is shown as it came,
/// just without the picture. The content handler is called exactly once.
class NotificationService: UNNotificationServiceExtension {
  private let lock = NSLock()
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?
  private var downloadTask: URLSessionDownloadTask?

  /// iOS refuses image attachments over 10 MB.
  private static let maxImageBytes: Int64 = 10 * 1024 * 1024
  private static let downloadTimeout: TimeInterval = 20

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    let content = request.content.mutableCopy() as? UNMutableNotificationContent
    self.bestAttemptContent = content

    guard let content = content else {
      finish(request.content)
      return
    }
    guard let imageUrl = NotificationService.imageUrl(from: request.content.userInfo) else {
      finish(content)
      return
    }

    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = NotificationService.downloadTimeout
    let session = URLSession(configuration: configuration)
    downloadTask = session.downloadTask(with: imageUrl) { [weak self] location, response, error in
      guard let self = self else { return }
      guard
        error == nil,
        let location = location,
        let attachment = NotificationService.makeAttachment(from: location, response: response, url: imageUrl)
      else {
        self.finish(content)
        return
      }
      content.attachments = [attachment]
      self.finish(content)
    }
    downloadTask?.resume()
  }

  /// iOS is about to stop the extension: show what we have.
  override func serviceExtensionTimeWillExpire() {
    downloadTask?.cancel()
    if let content = bestAttemptContent {
      finish(content)
    }
  }

  /// Calls the content handler once, however many paths reach here.
  private func finish(_ content: UNNotificationContent) {
    lock.lock()
    let handler = contentHandler
    contentHandler = nil
    lock.unlock()
    handler?(content)
  }

  // MARK: - Reading the image link

  /// The https image link in the push payload, or nil. Only https is accepted.
  static func imageUrl(from userInfo: [AnyHashable: Any]) -> URL? {
    var containers: [[String: Any]] = []
    if let body = userInfo["body"] as? [String: Any] { containers.append(body) }
    if let all = userInfo as? [String: Any] { containers.append(all) }

    for container in containers {
      for key in ["_richContent", "richContent"] {
        if let rich = container[key] as? [String: Any],
           let text = rich["image"] as? String,
           let url = secureUrl(text) {
          return url
        }
      }
    }
    return nil
  }

  private static func secureUrl(_ text: String) -> URL? {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let url = URL(string: trimmed), url.scheme?.lowercased() == "https", url.host != nil else {
      return nil
    }
    return url
  }

  // MARK: - Attaching the image

  /// The file extension iOS needs to recognise the picture, from what the server said it is, else from the link.
  /// Only formats iOS can attach (JPEG, PNG, GIF); anything else (WebP...) returns nil.
  static func fileExtension(mimeType: String?, url: URL) -> String? {
    let mime = (mimeType ?? "").lowercased().split(separator: ";").first.map(String.init) ?? ""
    switch mime {
    case "image/jpeg", "image/jpg": return "jpg"
    case "image/png": return "png"
    case "image/gif": return "gif"
    default:
      // The server named another picture type (e.g. image/webp): iOS cannot attach it.
      if mime.hasPrefix("image/") { return nil }
      // No usable type from the server: go by the end of the link.
      let ext = url.pathExtension.lowercased()
      if ext == "jpeg" || ext == "jpg" { return "jpg" }
      return ext == "png" || ext == "gif" ? ext : nil
    }
  }

  private static func makeAttachment(
    from location: URL,
    response: URLResponse?,
    url: URL
  ) -> UNNotificationAttachment? {
    if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) { return nil }
    guard let ext = fileExtension(mimeType: response?.mimeType, url: url) else { return nil }

    let attributes = try? FileManager.default.attributesOfItem(atPath: location.path)
    let size = (attributes?[.size] as? NSNumber)?.int64Value ?? 0
    guard size > 0, size <= maxImageBytes else { return nil }

    let target = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(ext)
    do {
      try FileManager.default.moveItem(at: location, to: target)
      return try UNNotificationAttachment(identifier: "image", url: target, options: nil)
    } catch {
      return nil
    }
  }
}
