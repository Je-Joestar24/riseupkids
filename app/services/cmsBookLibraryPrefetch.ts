/**
 * Library-level CMS book warm-up — start first-page downloads before the player opens.
 */

import { getBuiltinCmsBookId, isBuiltinCmsBook } from '@/components/child/module/module-utils';
import { startCmsBookPackPreload } from '@/services/cmsBookMediaCache';
import {
  cmsBooksPlayerService,
  normalizePlayableBookDetail,
  type CmsPlayableBookDetail,
} from '@/services/cmsBooksPlayerService';
import type { PopulatedContentItem } from '@/services/moduleService';

/** First page + next page (so Next can unlock while the child is still on the cover). */
export const CMS_LIBRARY_PREFETCH_LOOKAHEAD = 1;

const inflightByBookId = new Map<string, Promise<void>>();

export function findFirstBuiltinCmsBookId(
  books: Array<PopulatedContentItem | null | undefined> | null | undefined
): string | null {
  if (!Array.isArray(books)) return null;
  for (const book of books) {
    if (!isBuiltinCmsBook(book)) continue;
    const id = getBuiltinCmsBookId(book);
    if (id) return id;
  }
  return null;
}

async function loadPlayableBookForPrefetch(bookId: string): Promise<CmsPlayableBookDetail | null> {
  const response = await cmsBooksPlayerService.getPlayableBook(bookId);
  if (!response?.success) return null;
  return normalizePlayableBookDetail(response.data ?? null);
}

/**
 * Download cover + next-page media for a built-in book while the child is still
 * browsing the module library. Full-book preload joins later via pack files.
 */
export function prefetchCmsBuiltinBookStartPack(bookId: string): Promise<void> {
  const id = String(bookId || '').trim();
  if (!id) return Promise.resolve();

  const existing = inflightByBookId.get(id);
  if (existing) return existing;

  const task = (async () => {
    const book = await loadPlayableBookForPrefetch(id);
    if (!book) return;
    await startCmsBookPackPreload(book, {
      maxPageLookahead: CMS_LIBRARY_PREFETCH_LOOKAHEAD,
      concurrency: { imageAudio: 4, video: 1 },
    });
  })().finally(() => {
    if (inflightByBookId.get(id) === task) inflightByBookId.delete(id);
  });

  inflightByBookId.set(id, task);
  return task;
}

/** Warm the first visible built-in book after the module list is on screen. */
export function prefetchFirstBuiltinCmsBookFromLibrary(
  books: Array<PopulatedContentItem | null | undefined> | null | undefined
): Promise<void> {
  const bookId = findFirstBuiltinCmsBookId(books);
  if (!bookId) return Promise.resolve();
  return prefetchCmsBuiltinBookStartPack(bookId).catch(() => undefined);
}

/** @internal */
export function __resetCmsBookLibraryPrefetchForTests(): void {
  inflightByBookId.clear();
}
