/**
 * Bottom clearance for child layout/pages.
 * Phone: match compact nav bar height only on the layout scroll container.
 * Desktop: preserve original layout + page padding so content scrolls fully.
 */

/** Layout main — phone matches nav bar; desktop unchanged at 100px */
export const CHILD_LAYOUT_NAV_CLEARANCE = {
  xs: '86px',
  sm: '100px',
};

/** Page containers — desktop only (phones rely on layout clearance) */
export const CHILD_PAGE_NAV_CLEARANCE = {
  xs: 0,
  sm: '90px',
};
