/** Small display helpers for the admin Experiences list. */

/** "3 videos", "1 video", "No videos". */
export const videoCountLabel = (count) => {
  const n = Number.isFinite(count) ? count : 0;
  if (n <= 0) return 'No videos';
  return n === 1 ? '1 video' : `${n} videos`;
};

/** "Updated 12 Nov 2026", or '' when there is no usable date. */
export const updatedLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `Updated ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

/** The rows shown on this page: "from" and "to" (both 0 when there is nothing). */
export const pageRange = (pagination) => {
  const total = Number(pagination?.total) || 0;
  if (total === 0) return { from: 0, to: 0, total: 0 };
  const page = Math.max(1, Number(pagination?.page) || 1);
  const limit = Math.max(1, Number(pagination?.limit) || 1);
  const from = (page - 1) * limit + 1;
  return { from: Math.min(from, total), to: Math.min(page * limit, total), total };
};
