/**
 * Token bridge - avoids circular dependency between api and useAuthStore
 */

let getToken: () => string | null = () => null;

export const setTokenGetter = (fn: () => string | null) => {
  getToken = fn;
};

export const getAuthToken = () => getToken();

/**
 * Chunk 9 Phase C — api.ts needs to trigger a silent refresh on a 401, but it can't import
 * useAuthStore directly (useAuthStore -> authService -> api would cycle back). _layout.tsx wires
 * this to useAuthStore.getState().refreshSession so a successful refresh also updates the store's
 * reactive token/isAuthenticated state, not just AsyncStorage.
 */
let refreshFn: (() => Promise<string | null>) | null = null;

export const setRefreshFn = (fn: () => Promise<string | null>) => {
  refreshFn = fn;
};

export const runRefresh = (): Promise<string | null> => (refreshFn ? refreshFn() : Promise.resolve(null));
