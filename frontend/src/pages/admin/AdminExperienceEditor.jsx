import React from 'react';
import { useParams } from 'react-router-dom';
import ExperienceEditorMain from '../../components/admin/experiences/editor/ExperienceEditorMain';

/**
 * AdminExperienceEditor Page
 *
 * Add a new experience (/admin/experiences/create) or edit one (/admin/experiences/:uuid/edit), admins only.
 * It starts from scratch whenever the experience in the address changes, so one experience's form is never
 * carried over to another.
 */
const AdminExperienceEditor = () => {
  const { uuid } = useParams();
  return <ExperienceEditorMain key={uuid || 'new'} />;
};

export default AdminExperienceEditor;
