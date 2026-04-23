import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { PAGE_TYPES } from './BooksBuilderCreate.constants';

const BooksBuilderTypeMenu = ({ position, open, onClose, onSelect }) => (
  <Menu
    anchorReference="anchorPosition"
    anchorPosition={position || undefined}
    transformOrigin={{ vertical: 'center', horizontal: 'center' }}
    disableScrollLock
    autoFocus={false}
    disableAutoFocusItem
    disableRestoreFocus
    keepMounted
    open={open}
    onClose={onClose}
  >
    {PAGE_TYPES.map((item) => (
      <MenuItem key={item.key} onClick={() => onSelect(item.key)}>
        {item.label}
      </MenuItem>
    ))}
  </Menu>
);

export default BooksBuilderTypeMenu;
