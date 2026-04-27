import React from 'react';
import { Menu, MenuItem } from '@mui/material';

const BooksBuilderTypeMenu = ({ position, open, onClose, onSelect, options }) => (
  <Menu
    anchorReference="anchorPosition"
    anchorPosition={position || undefined}
    transformOrigin={{ vertical: 'center', horizontal: 'center' }}
    disableScrollLock
    autoFocus={false}
    disableAutoFocusItem
    disableRestoreFocus
    open={open}
    onClose={onClose}
  >
    {options.map((item) => (
      <MenuItem key={item.key} onClick={() => onSelect(item.key)}>
        {item.label}
      </MenuItem>
    ))}
  </Menu>
);

export default BooksBuilderTypeMenu;
