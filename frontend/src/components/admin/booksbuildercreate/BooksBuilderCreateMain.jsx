import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useCmsBookAdmin from '../../../hooks/cmsBookAdminHook';
import CmsBooksModalTest from '../common/CmsBooksModalTest';
import BooksBuilderCreateHeader from './BooksBuilderCreateHeader';
import BooksBuilderPageSection from './BooksBuilderPageSection';
import BooksBuilderTypeMenu from './BooksBuilderTypeMenu';
import { PAGE_TYPES } from './BooksBuilderCreate.constants';
import {
  buildCmsPageSkeleton,
  buildCmsBookCreatePayload,
  createEmptyPage,
  isPageComplete,
  isValidPageSequence,
  resetPageByType,
} from './BooksBuilderCreate.utils';

const BooksBuilderCreateMain = () => {
  const navigate = useNavigate();
  const {
    addBook,
    loading,
    builderDraft,
    setBuilderPages,
    patchBuilderPage,
    appendBuilderPage,
    resetBuilderDraft,
    uploadBookMedia,
  } = useCmsBookAdmin();
  const pages = builderDraft?.pages || [];
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(null);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!pages.length) {
      setBuilderPages([createEmptyPage(0)]);
    }
  }, [pages.length, setBuilderPages]);

  const canAddNext = useMemo(() => {
    if (!pages.length) return false;
    if (!isPageComplete(pages[0])) return false;
    if (!isValidPageSequence(pages)) return false;
    return pages.every((page) => isPageComplete(page));
  }, [pages]);

  const canSaveBook = useMemo(() => {
    if (!pages.length) return false;
    if (!isValidPageSequence(pages)) return false;
    const lastPage = pages[pages.length - 1];
    if (lastPage?.type !== 'reward') return false;
    return isPageComplete(lastPage);
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
    patchBuilderPage(pageIndex, patch);
  };

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

    const ensureUploadedMediaId = async ({ source, mediaType, title }) => {
      if (!source) return null;
      if (typeof source !== 'string') return null;
      if (mediaCache.has(source)) return mediaCache.get(source);

      let fileToUpload = null;
      if (source.startsWith('data:')) {
        const fallbackMime = mediaType === 'image' ? 'image/png' : mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4';
        fileToUpload = await dataUrlToFile(source, `${mediaType}-${Date.now()}`, fallbackMime);
      } else {
        // For now, the builder stores local data URLs. Non-data URLs are not supported in this save flow.
        return null;
      }

      const uploadResponse = await uploadBookMedia({
        file: fileToUpload,
        mediaType,
        title,
      });
      const mediaId = uploadResponse?.data?._id || uploadResponse?.data?.id || null;
      mediaCache.set(source, mediaId);
      return mediaId;
    };

    try {
      const typedPages = pages.filter((page) => Boolean(page?.type));
      const cmsPages = [];

      for (let index = 0; index < typedPages.length; index += 1) {
        const page = typedPages[index];
        const pagePayload = buildCmsPageSkeleton({ page, index });

        if (page.type === 'intro') {
          pagePayload.media.imageMediaId = await ensureUploadedMediaId({
            source: page.imageUrl,
            mediaType: 'image',
            title: `${page.title || 'Cover'} image`,
          });
        } else if (page.type === 'demo' || page.type === 'reward') {
          pagePayload.media.videoMediaId = await ensureUploadedMediaId({
            source: page.videoUrl,
            mediaType: 'video',
            title: `${page.title || 'Video'} video`,
          });
        } else if (page.type === 'content') {
          pagePayload.media.imageMediaId = await ensureUploadedMediaId({
            source: page.imageUrl,
            mediaType: 'image',
            title: `${page.title || 'Content'} image`,
          });
          pagePayload.media.audioMediaId = await ensureUploadedMediaId({
            source: page.audioUrl,
            mediaType: 'audio',
            title: `${page.title || 'Content'} audio`,
          });
        } else if (page.type === 'interactive') {
          const isTwoAnswer = page.interactionMode === 'two_options_two_answers';
          pagePayload.media.backgroundImageMediaId = await ensureUploadedMediaId({
            source: page.backgroundImageUrl,
            mediaType: 'image',
            title: `${page.title || 'Interactive'} background`,
          });

          if (isTwoAnswer) {
            const guideOne = await ensureUploadedMediaId({
              source: page.guideImageOne,
              mediaType: 'image',
              title: `${page.title || 'Interactive'} guide one`,
            });
            const guideTwo = await ensureUploadedMediaId({
              source: page.guideImageTwo,
              mediaType: 'image',
              title: `${page.title || 'Interactive'} guide two`,
            });
            pagePayload.media.guideImageMediaIds = [guideOne, guideTwo].filter(Boolean);
          } else {
            pagePayload.media.guideImageMediaId = await ensureUploadedMediaId({
              source: page.guideImageOne,
              mediaType: 'image',
              title: `${page.title || 'Interactive'} guide`,
            });
          }

          const optionOneImageId = await ensureUploadedMediaId({
            source: page.optionImageOne,
            mediaType: 'image',
            title: `${page.title || 'Interactive'} option one image`,
          });
          const optionOneAudioId = await ensureUploadedMediaId({
            source: page.optionAudioOne,
            mediaType: 'audio',
            title: `${page.title || 'Interactive'} option one audio`,
          });
          const optionTwoImageId = await ensureUploadedMediaId({
            source: page.optionImageTwo,
            mediaType: 'image',
            title: `${page.title || 'Interactive'} option two image`,
          });
          const optionTwoAudioId = await ensureUploadedMediaId({
            source: page.optionAudioTwo,
            mediaType: 'audio',
            title: `${page.title || 'Interactive'} option two audio`,
          });

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
      await addBook(payload, { successMessage: 'Book saved successfully' });
      resetBuilderDraft();
      navigate('/admin/built-in-books');
    } finally {
      setIsSaving(false);
    }
  }, [addBook, isSaving, loading?.mutating, navigate, pages, resetBuilderDraft, uploadBookMedia]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <BooksBuilderCreateHeader onBack={() => navigate('/admin/built-in-books')} />

      {pages.map((page, index) => (
        <BooksBuilderPageSection
          key={page.id}
          page={page}
          pageIndex={index}
          onOpenTypeMenu={openTypeMenu}
          onPatchPage={updatePage}
        />
      ))}

      {canSaveBook ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleSaveBook}
            disabled={isSaving || loading?.mutating}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            {isSaving || loading?.mutating ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setIsTesterOpen(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Test
          </Button>
        </Box>
      ) : null}

      {canAddNext && !canSaveBook ? (
        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => appendBuilderPage(createEmptyPage(pages.length))}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          Add Next Content
        </Button>
      ) : null}

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
        pages={pages}
      />
    </Box>
  );
};

export default BooksBuilderCreateMain;
