function asIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function pushAsset(list, asset) {
  if (!asset?.url) return;
  list.push(asset);
}

function mediaAsset(key, mediaView, kind = null) {
  if (!mediaView?.url) return null;
  return {
    key,
    mediaId: mediaView.id ? String(mediaView.id) : null,
    url: mediaView.url,
    updatedAt: asIsoDate(mediaView.updatedAt),
    kind: kind || mediaView.type || null,
  };
}

function buildCmsBookContentVersion(book) {
  const version = Number(book?.version) || 1;
  const updatedAt = asIsoDate(book?.updatedAt);
  return updatedAt ? `${version}:${updatedAt}` : String(version);
}

function collectCmsBookMediaAssetsFromPages(pages = [], mediaMap = new Map()) {
  const assets = [];
  const resolveMedia = (id) => (id ? mediaMap.get(String(id)) || null : null);

  pages.forEach((page) => {
    const pageId = page?.pageId || `order-${page?.order ?? 'x'}`;
    const prefix = `pages.${pageId}`;
    const media = page?.media || {};

    pushAsset(assets, mediaAsset(`${prefix}.image`, resolveMedia(media.imageMediaId), 'image'));
    pushAsset(assets, mediaAsset(`${prefix}.audio`, resolveMedia(media.audioMediaId), 'audio'));
    pushAsset(assets, mediaAsset(`${prefix}.video`, resolveMedia(media.videoMediaId), 'video'));
    pushAsset(
      assets,
      mediaAsset(`${prefix}.instructionAudio`, resolveMedia(media.instructionAudioMediaId), 'audio')
    );
    pushAsset(
      assets,
      mediaAsset(`${prefix}.backgroundImage`, resolveMedia(media.backgroundImageMediaId), 'image')
    );
    pushAsset(assets, mediaAsset(`${prefix}.sceneImage`, resolveMedia(media.sceneImageMediaId), 'image'));
    pushAsset(assets, mediaAsset(`${prefix}.guideImage`, resolveMedia(media.guideImageMediaId), 'image'));

    (Array.isArray(media.sceneImageMediaIds) ? media.sceneImageMediaIds : []).forEach((id, idx) => {
      pushAsset(
        assets,
        mediaAsset(`${prefix}.sceneImages[${idx + 1}]`, resolveMedia(id), 'image')
      );
    });

    (Array.isArray(media.guideImageMediaIds) ? media.guideImageMediaIds : []).forEach((id, idx) => {
      pushAsset(
        assets,
        mediaAsset(`${prefix}.guideImages[${idx + 1}]`, resolveMedia(id), 'image')
      );
    });

    const options = Array.isArray(page?.interaction?.options) ? page.interaction.options : [];
    options.forEach((option, idx) => {
      const optPrefix = `${prefix}.options[${option?.optionId || idx + 1}]`;
      pushAsset(assets, mediaAsset(`${optPrefix}.image`, resolveMedia(option?.imageMediaId), 'image'));
      pushAsset(assets, mediaAsset(`${optPrefix}.audio`, resolveMedia(option?.audioMediaId), 'audio'));
    });

    const dropZones = Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : [];
    dropZones.forEach((zone, idx) => {
      const zonePrefix = `${prefix}.dropZones[${zone?.zoneId || idx + 1}]`;
      pushAsset(assets, mediaAsset(`${zonePrefix}.audio`, resolveMedia(zone?.audioMediaId), 'audio'));
    });
  });

  return assets;
}

function buildCmsBookMediaManifest(book, mediaDocs = []) {
  const pages = Array.isArray(book?.pages) ? [...book.pages].sort((a, b) => a.order - b.order) : [];
  const mediaMap = new Map(
    (mediaDocs || []).map((item) => [
      String(item._id),
      {
        id: String(item._id),
        type: item.type || null,
        url: item.url || item.cloudUrl || null,
        updatedAt: item.updatedAt,
      },
    ])
  );

  return {
    bookId: String(book._id || book.id || ''),
    contentVersion: buildCmsBookContentVersion(book),
    assets: collectCmsBookMediaAssetsFromPages(pages, mediaMap),
  };
}

module.exports = {
  buildCmsBookContentVersion,
  collectCmsBookMediaAssetsFromPages,
  buildCmsBookMediaManifest,
};
