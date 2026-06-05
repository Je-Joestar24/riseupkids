import React from 'react';
import { Box, MenuItem, Typography } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import {
  getStarCamCategoryDisplayLabel,
  getStarCamCategoryIconSlot,
  getStarCamCategoryId,
} from '../../../utils/starCamCategoryDisplay';

const ICON_BY_SLOT = {
  learning: MenuBookRoundedIcon,
  home: HomeRoundedIcon,
  food: RestaurantRoundedIcon,
  nature: ParkRoundedIcon,
};

export function findStarCamCategoryById(categories = [], categoryId = '') {
  const normalized = String(categoryId || '');
  if (!normalized) return null;
  return categories.find((category) => getStarCamCategoryId(category) === normalized) || null;
}

export function renderStarCamCategorySelectValue(categories = [], selectedId = '') {
  const normalized = String(selectedId || '');
  if (!normalized) return null;
  const category = findStarCamCategoryById(categories, normalized);
  if (!category) return normalized;

  const label = getStarCamCategoryDisplayLabel(category);
  const slot = getStarCamCategoryIconSlot(category);
  const Icon = slot ? ICON_BY_SLOT[slot] : null;

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {Icon ? <Icon fontSize="small" aria-hidden sx={{ pointerEvents: 'none' }} /> : null}
      <span>{label}</span>
    </Box>
  );
}

/** Keeps the floating label from overlapping empty-state hint text. */
export const starCamCategoryTextFieldLabelProps = {
  InputLabelProps: { shrink: true },
};

export function createStarCamCategoryRenderValue(
  categories = [],
  emptyLabel = 'Select category',
  { mutedEmpty = true } = {}
) {
  return (selectedId) => {
    const rendered = renderStarCamCategorySelectValue(categories, selectedId);
    if (rendered) return rendered;
    if (!emptyLabel) return null;
    return (
      <Typography
        component="span"
        variant="body2"
        color={mutedEmpty ? 'text.secondary' : 'text.primary'}
        sx={{ lineHeight: 1.4 }}
      >
        {emptyLabel}
      </Typography>
    );
  };
}

/** Must return direct MenuItem nodes — MUI Select only attaches handlers to MenuItem children. */
export function renderStarCamCategoryMenuItems(categories = []) {
  return categories
    .map((category) => {
      const categoryId = getStarCamCategoryId(category);
      if (!categoryId) return null;

      const label = getStarCamCategoryDisplayLabel(category);
      const slot = getStarCamCategoryIconSlot(category);
      const Icon = slot ? ICON_BY_SLOT[slot] : null;

      return (
        <MenuItem key={categoryId} value={categoryId}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {Icon ? <Icon fontSize="small" aria-hidden sx={{ pointerEvents: 'none' }} /> : null}
            <span>{label}</span>
          </Box>
        </MenuItem>
      );
    })
    .filter(Boolean);
}

export const starCamCategorySelectMenuProps = {
  disablePortal: true,
  PaperProps: {
    sx: { maxHeight: 280 },
  },
};

export const starCamCategoryFilterSelectMenuProps = {
  PaperProps: {
    sx: { maxHeight: 280 },
  },
};
