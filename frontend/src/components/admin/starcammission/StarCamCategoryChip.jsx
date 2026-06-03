import React from 'react';
import { Chip } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import {
  getStarCamCategoryDisplayLabel,
  getStarCamCategoryIconSlot,
} from '../../../utils/starCamCategoryDisplay';

const ICON_BY_SLOT = {
  learning: MenuBookRoundedIcon,
  home: HomeRoundedIcon,
  food: RestaurantRoundedIcon,
  nature: ParkRoundedIcon,
};

const StarCamCategoryChip = ({ category, size = 'small' }) => {
  if (!category) return null;
  const label = getStarCamCategoryDisplayLabel(category);
  const slot = getStarCamCategoryIconSlot(category);
  const Icon = slot ? ICON_BY_SLOT[slot] : null;

  return (
    <Chip
      size={size}
      icon={Icon ? <Icon aria-hidden /> : undefined}
      label={label}
      aria-label={`Category: ${label}`}
    />
  );
};

export default StarCamCategoryChip;
