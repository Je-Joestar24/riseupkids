import { describe, it, expect } from 'vitest';
import childrenReducer, { requestChildDeletion } from './childrenSlice';

describe('childrenSlice requestChildDeletion', () => {
  const initialState = {
    children: [
      { _id: 'child1', displayName: 'Alex', isActive: true },
      { _id: 'child2', displayName: 'Sam', isActive: true },
    ],
    currentChild: { _id: 'child1', displayName: 'Alex' },
    filters: { isActive: undefined },
    loading: false,
    error: null,
  };

  it('sets loading on pending', () => {
    const state = childrenReducer(initialState, {
      type: requestChildDeletion.pending.type,
    });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('removes deleted child from list on fulfilled', () => {
    const state = childrenReducer(initialState, {
      type: requestChildDeletion.fulfilled.type,
      payload: {
        data: { childId: 'child1' },
      },
      meta: { arg: { childId: 'child1' } },
    });

    expect(state.loading).toBe(false);
    expect(state.children).toHaveLength(1);
    expect(state.children[0]._id).toBe('child2');
    expect(state.currentChild).toBeNull();
  });

  it('stores error on rejected', () => {
    const state = childrenReducer(initialState, {
      type: requestChildDeletion.rejected.type,
      payload: 'Password is incorrect',
    });

    expect(state.loading).toBe(false);
    expect(state.error).toBe('Password is incorrect');
    expect(state.children).toHaveLength(2);
  });
});
