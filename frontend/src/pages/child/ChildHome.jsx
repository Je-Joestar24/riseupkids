import React from 'react';
import { Box } from '@mui/material';
import ChildHomeStartLearning from '../../components/child/home/ChildHomeStartLearning';
import ChildHomeLiveClass from '../../components/child/home/ChildHomeLiveClass';
import ChildHomeAccumlatedAwards from '../../components/child/home/ChildHomeAccumlatedAwards';

/**
 * ChildHome Page
 * 
 * Home page for child interface
 * Displays welcome message and child-specific content
 */
const ChildHome = ({ childId }) => {

  // Get child data from sessionStorage
  const getChildData = () => {
    try {
      const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
      return childProfiles.find(child => child._id === childId) || null;
    } catch (error) {
      return null;
    }
  };

  const child = getChildData();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        paddingBottom: '90px', // Space for fixed bottom navigation
        paddingTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '848px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Start Learning Welcome Card */}
        <ChildHomeStartLearning child={child} />

        {/* Next Live Class Card */}
        <ChildHomeLiveClass />

        {/* Accumulated Awards */}
        <ChildHomeAccumlatedAwards child={child} />
      </Box>
    </Box>
  );
};

export default ChildHome;
