import React from 'react';
import { Box, MenuItem } from '@mui/material';
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

const StarCamCategoryMenuItem = ({ category }) => {
  const label = getStarCamCategoryDisplayLabel(category);
  const slot = getStarCamCategoryIconSlot(category);
  const Icon = slot ? ICON_BY_SLOT[slot] : null;

  return (
    <MenuItem value={category._id}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {Icon ? <Icon fontSize="small" aria-hidden /> : null}
        <span>{label}</span>
      </Box>
    </MenuItem>
  );
};

export default StarCamCategoryMenuItem;
