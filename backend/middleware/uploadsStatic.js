/**
 * Static serving for /uploads with long-lived caching for pictures.
 *
 * Uploaded files get a unique, timestamped name (replacing a cover creates a new file with a new
 * address), so a picture at a given address never changes. Without a cache lifetime a phone asks the
 * server again for every cover each time a page opens, which is slow when the server is. Pictures are
 * now cached for 30 days; everything else (PDFs, audio, packages) keeps the default behaviour.
 */
const express = require('express');

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;
const IMAGE_CACHE_SECONDS = 30 * 24 * 60 * 60;

function setUploadCacheHeaders(res, filePath) {
  if (IMAGE_EXTENSIONS.test(filePath)) {
    res.setHeader('Cache-Control', `public, max-age=${IMAGE_CACHE_SECONDS}`);
  }
}

function uploadsStatic(root) {
  return express.static(root, { setHeaders: setUploadCacheHeaders });
}

module.exports = { uploadsStatic, setUploadCacheHeaders, IMAGE_CACHE_SECONDS };
