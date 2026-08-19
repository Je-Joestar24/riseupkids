import React from 'react';
import { Box, Pagination } from '@mui/material';

const NotificationsPagination = ({ page = 1, pages = 0, onChange }) => {
  if (!pages || pages <= 1) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
      <Pagination
        count={pages}
        page={page}
        onChange={(_, value) => onChange?.(value)}
        color="primary"
        aria-label="Notification campaign pagination"
      />
    </Box>
  );
};

export default NotificationsPagination;
