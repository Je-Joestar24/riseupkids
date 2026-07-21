import {
  CMS_BOOK_PLAYER_MODAL_ORIENTATIONS,
  CMS_PLAYER_MODAL_ORIENTATIONS,
} from '@/utils/cmsPlayerOrientation';

describe('cmsPlayerOrientation', () => {
  it('CMS book player modal allows landscape only', () => {
    expect(CMS_BOOK_PLAYER_MODAL_ORIENTATIONS).toEqual([
      'landscape',
      'landscape-left',
      'landscape-right',
    ]);
    expect(CMS_BOOK_PLAYER_MODAL_ORIENTATIONS).not.toContain('portrait');
    expect(CMS_BOOK_PLAYER_MODAL_ORIENTATIONS).not.toContain('portrait-upside-down');
  });

  it('other video modals may still allow portrait on iOS', () => {
    expect(CMS_PLAYER_MODAL_ORIENTATIONS).toContain('portrait');
    expect(CMS_PLAYER_MODAL_ORIENTATIONS).toContain('landscape');
  });
});
