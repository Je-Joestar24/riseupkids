import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ContentCreatorNoAccess from '../../components/contentcreator/common/ContentCreatorNoAccess';
import { creatorLandingPath } from '../../utils/contentCreatorAccess';

/**
 * /content-creator and any address under it that is not a real page. A creator is sent to her first allowed page
 * (her landing page); one with no area at all is told so. This used to show the Dashboard for any unknown address,
 * which a creator without the Dashboard must not see.
 */
const ContentCreatorHome = () => {
  const user = useSelector((state) => state.user.user);
  const landing = creatorLandingPath(user);

  return landing ? <Navigate to={landing} replace /> : <ContentCreatorNoAccess />;
};

export default ContentCreatorHome;
