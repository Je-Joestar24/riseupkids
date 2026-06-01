import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import useCmsBookAdmin from '../../../hooks/cmsBookAdminHook';
import useCmsBookPlayer from '../../../hooks/cmsBookPlayer';
import CmsBooksModalTest from '../common/CmsBooksModalTest';
import BooksBuilderCreateHeader from './BooksBuilderCreateHeader';
import BooksBuilderPageSection from './BooksBuilderPageSection';
import BooksBuilderTypeMenu from './BooksBuilderTypeMenu';
import { PAGE_TYPES } from './BooksBuilderCreate.constants';
import {
  adjustReadingWordsForTrim,
  buildWeightedWords,
  buildCmsPageSkeleton,
  buildCmsBookCreatePayload,
  buildBuilderPageFromCms,
  buildTesterPagesFromBuilder,
  createEmptyPage,
  isPageComplete,
  isValidPageSequence,
  resetPageByType,
} from './BooksBuilderCreate.utils';

const BooksBuilderCreateMain = () => {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const isEditMode = Boolean(bookId);
  const {
    addBook,
    editBook,
    loadBookById,
    loading,
    builderDraft,
    setBuilderPages,
    patchBuilderPage,
    resetBuilderDraft,
    uploadBookMedia,
  } = useCmsBookAdmin();
  const { loadPlayableBookById } = useCmsBookPlayer();
  const pages = builderDraft?.pages || [];
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(null);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [bookMeta, setBookMeta] = useState(null);
  const pageNodeMapRef = useRef(new Map());
  const [pendingScrollPageId, setPendingScrollPageId] = useState('');

  useEffect(() => {
    if (!isEditMode && !pages.length) {
      setBuilderPages([createEmptyPage(0)]);
    }
  }, [isEditMode, pages.length, setBuilderPages]);

  useEffect(() => {
    const initEditDraft = async () => {
      if (!isEditMode || !bookId) return;
      setIsInitializing(true);
      try {
        const adminResponse = await loadBookById(bookId);
        const adminBook = adminResponse?.data || null;
        if (!adminBook) return;

        let playableBook = null;
        try {
          const playableResponse = await loadPlayableBookById(bookId);
          playableBook = playableResponse?.data || null;
        } catch (_error) {
          playableBook = null;
        }

        const playableByPageId = new Map(
          (playableBook?.pages || []).map((page) => [String(page.pageId || ''), page])
        );
        const sourcePages = Array.isArray(adminBook.pages) ? [...adminBook.pages] : [];
        sourcePages.sort((a, b) => (a.order || 0) - (b.order || 0));

        const mappedPages = sourcePages.map((page, index) => {
          const playablePage = playableByPageId.get(String(page.pageId || ''));
          const mergedPage = playablePage
            ? {
                ...page,
                media: {
                  ...(page.media || {}),
                  ...(playablePage.media || {}),
                },
                interaction: playablePage.interaction || page.interaction || null,
              }
            : page;
          return buildBuilderPageFromCms(mergedPage, index);
        });

        setBookMeta({
          title: adminBook.title || '',
          description: adminBook.description || '',
          language: adminBook.language || 'en',
        });
        setBuilderPages(mappedPages.length ? mappedPages : [createEmptyPage(0)]);
      } finally {
        setIsInitializing(false);
      }
    };

    initEditDraft();
  }, [bookId, isEditMode, loadBookById, loadPlayableBookById, setBuilderPages]);

  useEffect(() => {
    if (!pendingScrollPageId) return;
    const node = pageNodeMapRef.current.get(pendingScrollPageId);
    if (node) {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const topOffsetPx = rootFontSize * 5; // 5em allowance from top
      const nodeTop = node.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(nodeTop - topOffsetPx, 0),
        behavior: 'smooth',
      });
    }
    setPendingScrollPageId('');
  }, [pages, pendingScrollPageId]);

  const testerPages = useMemo(() => buildTesterPagesFromBuilder(pages), [pages]);

  const canSaveBook = useMemo(() => {
    if (!pages.length) return false;
    if (pages.some((page) => !page?.type)) return false;
    if (!isValidPageSequence(pages)) return false;
    if (!pages.every((page) => isPageComplete(page))) return false;

    const typedPages = pages.filter((page) => Boolean(page?.type));
    const hasIntro = typedPages.some((page) => page.type === 'intro');
    const hasContent = typedPages.some((page) => page.type === 'content');
    const hasInteractive = typedPages.some((page) => page.type === 'interactive');
    const hasReward = typedPages.some((page) => page.type === 'reward');
    const demoCount = typedPages.filter((page) => page.type === 'demo').length;
    const lastPage = typedPages[typedPages.length - 1];

    if (!hasIntro || !hasContent || !hasInteractive || !hasReward) return false;
    if (demoCount > 1) return false;
    if (lastPage?.type !== 'reward') return false;

    return true;
  }, [pages]);

  const availableTypeOptions = useMemo(() => {
    if (activePageIndex == null) return [];

    return PAGE_TYPES.filter((item) => {
      const draftPages = pages.map((page, index) =>
        index === activePageIndex
          ? {
              ...page,
              type: item.key,
              ...resetPageByType,
            }
          : page
      );
      return isValidPageSequence(draftPages);
    });
  }, [activePageIndex, pages]);

  const openTypeMenu = (targetEl, pageIndex) => {
    if (!targetEl?.getBoundingClientRect) return;
    const rect = targetEl.getBoundingClientRect();
    setMenuPosition({
      top: Math.round(rect.top + rect.height / 2),
      left: Math.round(rect.left + rect.width / 2),
    });
    setActivePageIndex(pageIndex);
  };

  const closeTypeMenu = useCallback(() => {
    setMenuPosition(null);
    setActivePageIndex(null);
  }, []);

  useEffect(() => {
    if (!menuPosition) return undefined;
    const onScroll = () => {
      closeTypeMenu();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menuPosition, closeTypeMenu]);

  const updatePage = (pageIndex, patch) => {
    const currentPage = pages[pageIndex] || {};
    const nextType = patch?.type || currentPage?.type;

    if (nextType !== 'content') {
      patchBuilderPage(pageIndex, patch);
      return;
    }

    // Preserve manual timeline edits from drag/drop or explicit word timing updates.
    // Auto regeneration should only happen when text/duration inputs change.
    if (Object.prototype.hasOwnProperty.call(patch || {}, 'readingWords')) {
      patchBuilderPage(pageIndex, {
        ...patch,
      });
      return;
    }

    const nextSubtitle = patch?.subtitle ?? currentPage?.subtitle ?? '';
    const nextReadingTextRaw = patch?.readingText ?? currentPage?.readingText ?? nextSubtitle;
    const nextReadingText = String(nextReadingTextRaw || '').trim();
    const nextDuration = Number(patch?.audioDurationSec ?? currentPage?.audioDurationSec);
    const hasDuration = Number.isFinite(nextDuration) && nextDuration > 0;

    const recalculatedWords = nextReadingText && hasDuration
      ? buildWeightedWords(nextReadingText, nextDuration)
      : [];

    patchBuilderPage(pageIndex, {
      ...patch,
      readingText: nextReadingTextRaw,
      readingWords: recalculatedWords,
    });
  };

  const getSwappedPages = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex < 0 || toIndex < 0) return null;
      if (fromIndex >= pages.length || toIndex >= pages.length) return null;

      const movingPage = pages[fromIndex];
      const targetPage = pages[toIndex];
      const isMovable = movingPage?.type === 'content' || movingPage?.type === 'interactive';
      const targetIsMovable = targetPage?.type === 'content' || targetPage?.type === 'interactive';
      if (!isMovable || !targetIsMovable) return null;

      const nextPages = [...pages];
      [nextPages[fromIndex], nextPages[toIndex]] = [nextPages[toIndex], nextPages[fromIndex]];
      return nextPages;
    },
    [pages]
  );

  const canMovePage = useCallback(
    (pageIndex, direction) => {
      const targetIndex = direction === 'up' ? pageIndex - 1 : pageIndex + 1;
      const swapped = getSwappedPages(pageIndex, targetIndex);
      if (!swapped) return false;
      return isValidPageSequence(swapped);
    },
    [getSwappedPages]
  );

  const movePage = useCallback(
    (pageIndex, direction) => {
      const targetIndex = direction === 'up' ? pageIndex - 1 : pageIndex + 1;
      const swapped = getSwappedPages(pageIndex, targetIndex);
      if (!swapped) return;
      if (!isValidPageSequence(swapped)) return;
      const movedPageId = pages[pageIndex]?.id || '';
      if (movedPageId) setPendingScrollPageId(movedPageId);
      setBuilderPages(swapped);
    },
    [getSwappedPages, pages, setBuilderPages]
  );

  const canDeletePage = useCallback(
    (pageIndex) => {
      if (pages.length <= 1) return false;
      const nextPages = pages.filter((_, index) => index !== pageIndex);
      if (!nextPages.length) return false;
      return isValidPageSequence(nextPages);
    },
    [pages]
  );

  const deletePage = useCallback(
    (pageIndex) => {
      if (!canDeletePage(pageIndex)) return;
      const nextPages = pages.filter((_, index) => index !== pageIndex);
      setBuilderPages(nextPages.length ? nextPages : [createEmptyPage(0)]);
    },
    [canDeletePage, pages, setBuilderPages]
  );

  const insertPageAfter = useCallback(
    (pageIndex) => {
      const currentPage = pages[pageIndex];
      if (!currentPage || currentPage.type === 'reward') return;
      const nextPages = [...pages];
      nextPages.splice(pageIndex + 1, 0, createEmptyPage(pageIndex + 1));
      setBuilderPages(nextPages);
    },
    [pages, setBuilderPages]
  );

  const selectPageType = (typeKey) => {
    if (activePageIndex == null) return;
    if (!availableTypeOptions.some((option) => option.key === typeKey)) return;
    const basePatch = {
      type: typeKey,
      ...resetPageByType,
    };
    if (typeKey === 'interactive') {
      basePatch.interactionMode = 'two_options_one_answer';
      basePatch.answerTwoCorrectOptionId = '';
    }
    updatePage(activePageIndex, basePatch);
    closeTypeMenu();
  };

  const handleSaveBook = useCallback(async () => {
    if (isSaving || loading?.mutating) return;
    setIsSaving(true);
    const mediaCache = new Map();
    const dataUrlToFile = async (dataUrl, fallbackName, fallbackMime) => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const extFromMime = (() => {
        if (blob.type.startsWith('image/')) return blob.type.replace('image/', '') || 'png';
        if (blob.type.startsWith('audio/')) return blob.type.replace('audio/', '') || 'mp3';
        if (blob.type.startsWith('video/')) return blob.type.replace('video/', '') || 'mp4';
        if (fallbackMime?.startsWith('image/')) return 'png';
        if (fallbackMime?.startsWith('audio/')) return 'mp3';
        if (fallbackMime?.startsWith('video/')) return 'mp4';
        return 'bin';
      })();
      const filename = `${fallbackName}.${extFromMime}`;
      return new File([blob], filename, { type: blob.type || fallbackMime || 'application/octet-stream' });
    };

    const emptyUploadResult = { mediaId: null, durationSec: null, trimMeta: null };

    const ensureUploadedMediaId = async ({ source, mediaType, title, existingMediaId = null }) => {
      if (!source) return emptyUploadResult;
      if (typeof source !== 'string') return emptyUploadResult;
      if (mediaCache.has(source)) return mediaCache.get(source);

      let fileToUpload = null;
      const fallbackMime = mediaType === 'image' ? 'image/png' : mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4';

      if (source.startsWith('data:')) {
        fileToUpload = await dataUrlToFile(source, `${mediaType}-${Date.now()}`, fallbackMime);
      } else if (source.startsWith('blob:')) {
        const blobResponse = await fetch(source);
        const blob = await blobResponse.blob();
        const extFromMime = (() => {
          if (blob.type.startsWith('image/')) return blob.type.replace('image/', '') || 'png';
          if (blob.type.startsWith('audio/')) return blob.type.replace('audio/', '') || 'mp3';
          if (blob.type.startsWith('video/')) return blob.type.replace('video/', '') || 'mp4';
          if (fallbackMime.startsWith('image/')) return 'png';
          if (fallbackMime.startsWith('audio/')) return 'mp3';
          if (fallbackMime.startsWith('video/')) return 'mp4';
          return 'bin';
        })();
        fileToUpload = new File([blob], `${mediaType}-${Date.now()}.${extFromMime}`, {
          type: blob.type || fallbackMime,
        });
      } else {
        return {
          mediaId: existingMediaId || null,
          durationSec: null,
          trimMeta: null,
        };
      }

      const uploadResponse = await uploadBookMedia({
        file: fileToUpload,
        mediaType,
        title,
      });
      const uploadData = uploadResponse?.data || {};
      const uploadResult = {
        mediaId: uploadData._id || uploadData.id || null,
        durationSec: Number.isFinite(Number(uploadData.duration)) ? Number(uploadData.duration) : null,
        trimMeta: uploadData.trimMeta || null,
      };
      mediaCache.set(source, uploadResult);
      return uploadResult;
    };

    try {
      const typedPages = pages.filter((page) => Boolean(page?.type));
      const cmsPages = [];

      for (let index = 0; index < typedPages.length; index += 1) {
        const page = typedPages[index];
        const pagePayload = buildCmsPageSkeleton({ page, index });

        if (page.type === 'intro') {
          pagePayload.media.imageMediaId = (await ensureUploadedMediaId({
            source: page.imageUrl,
            mediaType: 'image',
            title: `${page.title || 'Cover'} image`,
            existingMediaId: page.imageMediaId,
          })).mediaId;

          const introBgmSource = String(page.introBackgroundMusicUrl || '').trim();
          if (introBgmSource) {
            const bgmUpload = await ensureUploadedMediaId({
              source: introBgmSource,
              mediaType: 'audio',
              title: `${page.title || 'Cover'} intro background music`,
              existingMediaId: page.introBackgroundMusicMediaId || null,
            });
            pagePayload.media.audioMediaId = bgmUpload.mediaId;
          } else {
            pagePayload.media.audioMediaId = null;
          }
        } else if (page.type === 'demo' || page.type === 'reward') {
          pagePayload.media.videoMediaId = (await ensureUploadedMediaId({
            source: page.videoUrl,
            mediaType: 'video',
            title: `${page.title || 'Video'} video`,
            existingMediaId: page.videoMediaId,
          })).mediaId;
        } else if (page.type === 'content') {
          pagePayload.media.imageMediaId = (await ensureUploadedMediaId({
            source: page.imageUrl,
            mediaType: 'image',
            title: `${page.title || 'Content'} image`,
            existingMediaId: page.imageMediaId,
          })).mediaId;
          const audioUpload = await ensureUploadedMediaId({
            source: page.audioUrl,
            mediaType: 'audio',
            title: `${page.title || 'Content'} audio`,
            existingMediaId: page.audioMediaId,
          });
          pagePayload.media.audioMediaId = audioUpload.mediaId;
          const readingText = String(page.readingText || page.subtitle || '').trim();
          const trimmedDurationSec = Number(audioUpload.durationSec);
          const fallbackDurationSec = Number(page.audioDurationSec);
          const durationSec =
            Number.isFinite(trimmedDurationSec) && trimmedDurationSec > 0
              ? trimmedDurationSec
              : fallbackDurationSec;
          const hasValidDuration = Number.isFinite(durationSec) && durationSec > 0;
          const timelineWords = Array.isArray(page.readingWords) ? page.readingWords : [];
          const hasSavedTimeline =
            timelineWords.length > 0
            && timelineWords.every(
              (w) =>
                String(w?.w || '').trim()
                && Number.isFinite(Number(w?.start))
                && Number.isFinite(Number(w?.end))
            );
          const trimOffsetSec = audioUpload.trimMeta?.applied
            ? Number(audioUpload.trimMeta?.trimmedStartSec) || 0
            : 0;
          let readingWords = [];
          if (readingText && hasValidDuration) {
            if (hasSavedTimeline) {
              readingWords = adjustReadingWordsForTrim(timelineWords, {
                durationSec,
                trimmedStartSec: trimOffsetSec,
              });
            } else {
              readingWords = buildWeightedWords(readingText, durationSec);
            }
          }
          pagePayload.reading = {
            text: readingText || null,
            durationSec: hasValidDuration ? durationSec : null,
            words: readingWords,
          };
        } else if (page.type === 'interactive') {
          const isTwoAnswer = page.interactionMode === 'two_options_two_answers';
          pagePayload.media.backgroundImageMediaId = (await ensureUploadedMediaId({
            source: page.backgroundImageUrl,
            mediaType: 'image',
            title: `${page.title || 'Interactive'} background`,
            existingMediaId: page.backgroundImageMediaId,
          })).mediaId;

          if (isTwoAnswer) {
            const guideOne = (await ensureUploadedMediaId({
              source: page.guideImageOne,
              mediaType: 'image',
              title: `${page.title || 'Interactive'} guide one`,
              existingMediaId: page.guideImageMediaIds?.[0] || page.guideImageMediaId,
            })).mediaId;
            const guideTwo = (await ensureUploadedMediaId({
              source: page.guideImageTwo,
              mediaType: 'image',
              title: `${page.title || 'Interactive'} guide two`,
              existingMediaId: page.guideImageMediaIds?.[1] || null,
            })).mediaId;
            pagePayload.media.guideImageMediaIds = [guideOne, guideTwo].filter(Boolean);
          } else {
            pagePayload.media.guideImageMediaId = (await ensureUploadedMediaId({
              source: page.guideImageOne,
              mediaType: 'image',
              title: `${page.title || 'Interactive'} guide`,
              existingMediaId: page.guideImageMediaId || page.guideImageMediaIds?.[0] || null,
            })).mediaId;
          }

          const optionOneImageId = (await ensureUploadedMediaId({
            source: page.optionImageOne,
            mediaType: 'image',
            title: `${page.title || 'Interactive'} option one image`,
            existingMediaId: page.optionOneImageMediaId,
          })).mediaId;
          const optionOneAudioId = (await ensureUploadedMediaId({
            source: page.optionAudioOne,
            mediaType: 'audio',
            title: `${page.title || 'Interactive'} option one audio`,
            existingMediaId: page.optionOneAudioMediaId,
          })).mediaId;
          const optionTwoImageId = (await ensureUploadedMediaId({
            source: page.optionImageTwo,
            mediaType: 'image',
            title: `${page.title || 'Interactive'} option two image`,
            existingMediaId: page.optionTwoImageMediaId,
          })).mediaId;
          const optionTwoAudioId = (await ensureUploadedMediaId({
            source: page.optionAudioTwo,
            mediaType: 'audio',
            title: `${page.title || 'Interactive'} option two audio`,
            existingMediaId: page.optionTwoAudioMediaId,
          })).mediaId;

          pagePayload.interaction = {
            kind: isTwoAnswer ? 'drag_2x2' : 'drag_2x1',
            allowRetry: true,
            options: [
              {
                optionId: 'option_one',
                label: 'Option 1',
                imageMediaId: optionOneImageId,
                audioMediaId: optionOneAudioId,
              },
              {
                optionId: 'option_two',
                label: 'Option 2',
                imageMediaId: optionTwoImageId,
                audioMediaId: optionTwoAudioId,
              },
            ],
            dropZones: isTwoAnswer
              ? [
                  {
                    zoneId: 'zone_one',
                    label: 'Answer 1',
                    correctOptionId: page.answerOneCorrectOptionId,
                  },
                  {
                    zoneId: 'zone_two',
                    label: 'Answer 2',
                    correctOptionId: page.answerTwoCorrectOptionId,
                  },
                ]
              : [
                  {
                    zoneId: 'zone_one',
                    label: 'Answer 1',
                    correctOptionId: page.answerOneCorrectOptionId,
                  },
                ],
          };
        }

        cmsPages.push(pagePayload);
      }

      const payload = buildCmsBookCreatePayload(pages, cmsPages);
      if (isEditMode && bookId) {
        await editBook(
          bookId,
          {
            title: bookMeta?.title || payload.title,
            description: bookMeta?.description || payload.description,
            language: bookMeta?.language || payload.language || 'en',
            pages: payload.pages,
          },
          { successMessage: 'Book updated successfully' }
        );
      } else {
        await addBook(payload, { successMessage: 'Book saved successfully' });
      }
      resetBuilderDraft();
      navigate('/admin/built-in-books');
    } finally {
      setIsSaving(false);
    }
  }, [addBook, bookId, bookMeta?.description, bookMeta?.language, bookMeta?.title, editBook, isEditMode, isSaving, loading?.mutating, navigate, pages, resetBuilderDraft, uploadBookMedia]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <BooksBuilderCreateHeader onBack={() => navigate('/admin/built-in-books')} />

      {pages.map((page, index) => (
        <Box
          key={page.id || `page-${index + 1}`}
          ref={(node) => {
            const pageId = page.id || '';
            if (!pageId) return;
            if (node) {
              pageNodeMapRef.current.set(pageId, node);
            } else {
              pageNodeMapRef.current.delete(pageId);
            }
          }}
          sx={{ mb: 2 }}
        >
          <BooksBuilderPageSection
            page={page}
            pageIndex={index}
            onOpenTypeMenu={openTypeMenu}
            onPatchPage={updatePage}
            onMoveUp={(pageIndex) => movePage(pageIndex, 'up')}
            onMoveDown={(pageIndex) => movePage(pageIndex, 'down')}
            canMoveUp={canMovePage(index, 'up')}
            canMoveDown={canMovePage(index, 'down')}
            onDeletePage={deletePage}
            canDelete={canDeletePage(index)}
          />
          {page?.type !== 'reward' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<AddCircleOutline />}
                onClick={() => insertPageAfter(index)}
                aria-label={`Insert new page after page ${index + 1}`}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                Add page after this
              </Button>
            </Box>
          ) : null}
        </Box>
      ))}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleSaveBook}
          disabled={!canSaveBook || isSaving || loading?.mutating || isInitializing}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          {isSaving || loading?.mutating ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setIsTesterOpen(true)}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          Test
        </Button>
      </Box>

      <BooksBuilderTypeMenu
        position={menuPosition}
        open={Boolean(menuPosition)}
        onClose={closeTypeMenu}
        onSelect={selectPageType}
        options={availableTypeOptions}
      />

      <CmsBooksModalTest
        open={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        pages={testerPages}
      />
    </Box>
  );
};

export default BooksBuilderCreateMain;
