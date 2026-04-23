import React, { useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BooksBuilderCreateHeader from './BooksBuilderCreateHeader';
import BooksBuilderPageSection from './BooksBuilderPageSection';
import BooksBuilderTypeMenu from './BooksBuilderTypeMenu';
import { createEmptyPage, isPageComplete, resetPageByType } from './BooksBuilderCreate.utils';

const BooksBuilderCreateMain = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState([createEmptyPage(0)]);
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(null);

  const canAddNext = useMemo(() => {
    if (!pages.length) return false;
    if (!isPageComplete(pages[0])) return false;
    return pages.every((page) => isPageComplete(page));
  }, [pages]);

  const openTypeMenu = (targetEl, pageIndex) => {
    if (!targetEl?.getBoundingClientRect) return;
    const rect = targetEl.getBoundingClientRect();
    setMenuPosition({
      top: Math.round(rect.top + rect.height / 2),
      left: Math.round(rect.left + rect.width / 2),
    });
    setActivePageIndex(pageIndex);
  };

  const closeTypeMenu = () => {
    setMenuPosition(null);
    setActivePageIndex(null);
  };

  const updatePage = (pageIndex, patch) => {
    setPages((prev) =>
      prev.map((page, index) => (index === pageIndex ? { ...page, ...patch } : page))
    );
  };

  const selectPageType = (typeKey) => {
    if (activePageIndex == null) return;
    updatePage(activePageIndex, {
      type: typeKey,
      ...resetPageByType,
    });
    closeTypeMenu();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh' }}>
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

      {canAddNext ? (
        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setPages((prev) => [...prev, createEmptyPage(prev.length)])}
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
      />
    </Box>
  );
};

export default BooksBuilderCreateMain;
