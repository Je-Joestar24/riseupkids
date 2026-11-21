import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ContentCreatorNoAccess from '../../components/contentcreator/common/ContentCreatorNoAccess';
import { creatorLandingPath, hasCreatorArea, isContentCreator } from '../../utils/contentCreatorAccess';

/**
 * The area lock on the screen (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md). Sits inside AuthedAccess, which has
 * already checked the ROLE. This only narrows a content creator down to the areas an admin gave her:
 *
 *  - she has the area  -> the page
 *  - she does not      -> her landing page (never the same page: she always has the area of her landing page)
 *  - she has no area   -> a plain "no access yet" screen (there is nowhere to send her)
 *
 * Anyone who is not a content creator passes through; so does a route that belongs to no area. The server is the real
 * lock; this is what keeps the screen from showing a page the server would refuse.
 */
const CreatorAreaAccess = ({ area, children }) => {
  const user = useSelector((state) => state.user.user);

  if (!area || !isContentCreator(user)) return children;
  if (hasCreatorArea(user, area)) return children;

  const landing = creatorLandingPath(user);
  return landing ? <Navigate to={landing} replace /> : <ContentCreatorNoAccess />;
};

export default CreatorAreaAccess;
