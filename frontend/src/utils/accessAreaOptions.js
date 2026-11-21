/**
 * Small, pure helpers the admin access screens share (the checkboxes, the Access column, "will be removed" marks).
 * An "option" is what the server sends for each checkbox: { key, label, help, legacy }.
 */

/** The selected keys in the order of the options (the order of the checkboxes), without duplicates or unknown keys. */
export const orderAreas = (selected, options) => {
  const chosen = new Set(Array.isArray(selected) ? selected : []);
  return (options || []).map((option) => option.key).filter((key) => chosen.has(key));
};

/** Same areas in the same order. */
export const sameAreaList = (a, b) => {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

/** What changes from `before` to `after`: { added, removed }, each in the order given by the options. */
export const diffAreas = (before, after, options) => {
  const had = new Set(Array.isArray(before) ? before : []);
  const has = new Set(Array.isArray(after) ? after : []);
  const keys = (options || []).map((option) => option.key);
  return {
    added: keys.filter((key) => has.has(key) && !had.has(key)),
    removed: keys.filter((key) => had.has(key) && !has.has(key)),
  };
};

/** "Explore", "Explore and Star Cam Missions", "Contents, Explore and Notifications": for a sentence. */
export const joinLabels = (keys, options) => {
  const byKey = Object.fromEntries((options || []).map((option) => [option.key, option.label]));
  const labels = (keys || []).map((key) => byKey[key] || key);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
};

/**
 * For the Access column: the first few labels, and how many more there are.
 * @returns {{ labels: string[], more: number, total: number, all: boolean }}
 */
export const summarizeAreas = (keys, options, show = 2) => {
  const ordered = orderAreas(keys, options);
  const byKey = Object.fromEntries((options || []).map((option) => [option.key, option.label]));
  const labels = ordered.map((key) => byKey[key]);
  const total = (options || []).length;
  return {
    labels: labels.slice(0, show),
    more: Math.max(0, labels.length - show),
    total: labels.length,
    all: total > 0 && labels.length === total,
  };
};

/** The areas EVERY one of these creators has (where the "same list for all" starts from). */
export const commonAreas = (creators, options) => {
  const lists = (creators || []).map((creator) => (Array.isArray(creator?.accessAreas) ? creator.accessAreas : []));
  if (lists.length === 0) return [];
  return orderAreas(
    lists.reduce((common, list) => common.filter((key) => list.includes(key))),
    options
  );
};
