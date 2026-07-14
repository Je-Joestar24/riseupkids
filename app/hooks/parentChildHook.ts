/**
 * Rise Up Kids Parent Child Hook
 * Reusable hook for parent-child operations - exposes store state & actions
 * Use in any screen that needs children list, selected child, or CRUD operations
 */

import { useCallback } from 'react';

import { useParentChildStore } from '@/store/parentChildStore';
import type {
  ChildProfile,
  CreateChildInput,
  UpdateChildInput,
  GetAllChildrenParams,
} from '@/services/parentChildService';

export function useParentChild() {
  const {
    children,
    selectedChild,
    isLoading,
    isMutating,
    error,
    fetchChildren,
    fetchChildById,
    createChild,
    updateChild,
    requestChildDeletion,
    setSelectedChild,
    clearError,
    reset,
  } = useParentChildStore();

  const refreshChildren = useCallback(
    (params?: GetAllChildrenParams) => fetchChildren(params),
    [fetchChildren]
  );

  const selectChild = useCallback(
    (child: ChildProfile | null) => setSelectedChild(child),
    [setSelectedChild]
  );

  const selectChildById = useCallback(
    (childId: string | null) => {
      if (!childId) {
        setSelectedChild(null);
        return;
      }
      const child = children.find((c) => c._id === childId) ?? null;
      setSelectedChild(child);
    },
    [children, setSelectedChild]
  );

  return {
    // State
    children,
    selectedChild,
    isLoading,
    isMutating,
    error,
    hasChildren: children.length > 0,
    activeChildren: children.filter((c) => c.isActive !== false),

    // Actions
    fetchChildren: refreshChildren,
    fetchChildById,
    createChild,
    updateChild,
    requestChildDeletion,
    setSelectedChild: selectChild,
    selectChildById,
    clearError,
    reset,
  };
}
