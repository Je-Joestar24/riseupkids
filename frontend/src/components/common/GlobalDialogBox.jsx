import React from 'react';
import { useSelector } from 'react-redux';
import AdminDialogBox from './AdminDialogBox';
import ChildDialogBox from './ChildDialogBox';

/**
 * GlobalDialogBox Component
 * 
 * Routes to appropriate dialog box based on user role
 * Admin users get professional dialogs, children get child-friendly dialogs
 * Parents have their own dialog box in ParentsLayout
 */
const GlobalDialogBox = () => {
  const { user } = useSelector((state) => state.user);
  
  // Determine user role
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'parent';
  const isTeacher = user?.role === 'teacher';

  // Parents have their own dialog box in ParentsLayout, so return null here
  if (isParent) {
    return null;
  }

  // Render appropriate dialog box based on user role
  if (isAdmin || isTeacher) {
    return <AdminDialogBox />;
  }

  // Default to child-friendly dialog for non-admin, non-parent, non-teacher users
  return <ChildDialogBox />;

};

export default GlobalDialogBox;

