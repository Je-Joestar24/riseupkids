import { useEffect, useState } from 'react';

/**
 * A picture the admin has chosen but not saved, as an address the browser can show. It is made when the file
 * arrives and given back to the browser's memory when the file changes or the page goes away.
 *
 * It is made inside the effect (not while drawing), so a development double-run of the effect cannot leave the
 * page holding an address that was already released.
 *
 * @param {File|null|undefined} file
 * @returns {string|null}
 */
const useObjectUrl = (file) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      setUrl(null);
      return undefined;
    }
    const made = URL.createObjectURL(file);
    setUrl(made);
    return () => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(made);
    };
  }, [file]);

  return url;
};

export default useObjectUrl;
