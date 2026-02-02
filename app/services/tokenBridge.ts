/**
 * Token bridge - avoids circular dependency between api and useAuthStore
 */

let getToken: () => string | null = () => null;

export const setTokenGetter = (fn: () => string | null) => {
  getToken = fn;
};

export const getAuthToken = () => getToken();
