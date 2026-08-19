const ALLOWED_NOTIFICATION_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertNotificationImageMime(mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (!ALLOWED_NOTIFICATION_IMAGE_MIMES.includes(mime)) {
    throw httpError('Notification image must be JPG, PNG, or WebP');
  }
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

function readUInt32BE(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function readPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(pngSig)) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return {
    width: readUInt32BE(buffer, 16),
    height: readUInt32BE(buffer, 20),
  };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    const size = buffer.readUInt16BE(offset + 2);
    offset += 2 + size;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
    };
  }
  if (chunk === 'VP8L') {
    const bits = buffer[21] | (buffer[22] << 8) | (buffer[23] << 16) | (buffer[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

/**
 * Read natural width/height. Never crops or resizes the buffer.
 */
function readImageDimensions(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw httpError('Notification image file is empty');
  }
  const mime = String(mimeType || '').toLowerCase();
  let dims = null;
  if (mime === 'image/png') dims = readPngDimensions(buffer);
  else if (mime === 'image/jpeg' || mime === 'image/jpg') dims = readJpegDimensions(buffer);
  else if (mime === 'image/webp') dims = readWebpDimensions(buffer);

  if (!dims || !dims.width || !dims.height) {
    throw httpError('Could not read notification image dimensions');
  }
  return dims;
}

module.exports = {
  ALLOWED_NOTIFICATION_IMAGE_MIMES,
  assertNotificationImageMime,
  readImageDimensions,
};
