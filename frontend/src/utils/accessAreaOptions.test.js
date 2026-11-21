import { describe, expect, it } from 'vitest';
import { commonAreas, diffAreas, joinLabels, orderAreas, sameAreaList, summarizeAreas } from './accessAreaOptions';

const OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'contents', label: 'Contents' },
  { key: 'explore', label: 'Explore' },
  { key: 'star_cam_missions', label: 'Star Cam Missions' },
  { key: 'notifications', label: 'Notifications' },
];

describe('orderAreas', () => {
  it('puts the chosen keys in the order of the checkboxes', () => {
    expect(orderAreas(['notifications', 'dashboard', 'explore'], OPTIONS)).toEqual(['dashboard', 'explore', 'notifications']);
  });

  it('drops duplicates and keys that are not options', () => {
    expect(orderAreas(['explore', 'explore', 'retired'], OPTIONS)).toEqual(['explore']);
  });

  it('copes with nothing', () => {
    [undefined, null, 'explore', {}].forEach((value) => expect(orderAreas(value, OPTIONS)).toEqual([]));
    expect(orderAreas(['explore'], undefined)).toEqual([]);
  });

  it('does not change what it was given', () => {
    const chosen = ['notifications', 'dashboard'];
    orderAreas(chosen, OPTIONS);
    expect(chosen).toEqual(['notifications', 'dashboard']);
  });
});

describe('sameAreaList', () => {
  it('is true for the same keys in the same order', () => {
    expect(sameAreaList(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameAreaList([], [])).toBe(true);
  });

  it('is false for a different length, a different key or a different order', () => {
    expect(sameAreaList(['a'], ['a', 'b'])).toBe(false);
    expect(sameAreaList(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(sameAreaList(['a', 'b'], ['b', 'a'])).toBe(false);
  });

  it('treats a missing list as empty', () => {
    expect(sameAreaList(undefined, [])).toBe(true);
    expect(sameAreaList(null, undefined)).toBe(true);
    expect(sameAreaList(undefined, ['a'])).toBe(false);
  });
});

describe('diffAreas', () => {
  it('says what was added and what was removed, in checkbox order', () => {
    expect(diffAreas(['dashboard', 'contents', 'explore'], ['explore', 'notifications', 'dashboard'], OPTIONS)).toEqual({
      added: ['notifications'],
      removed: ['contents'],
    });
  });

  it('says nothing changed when nothing did', () => {
    expect(diffAreas(['explore'], ['explore'], OPTIONS)).toEqual({ added: [], removed: [] });
  });

  it('everything is added from nothing, and everything is removed to nothing', () => {
    expect(diffAreas([], ['explore', 'dashboard'], OPTIONS)).toEqual({ added: ['dashboard', 'explore'], removed: [] });
    expect(diffAreas(['explore', 'dashboard'], [], OPTIONS)).toEqual({ added: [], removed: ['dashboard', 'explore'] });
  });

  it('copes with missing lists and options', () => {
    expect(diffAreas(undefined, undefined, OPTIONS)).toEqual({ added: [], removed: [] });
    expect(diffAreas(['explore'], [], undefined)).toEqual({ added: [], removed: [] });
  });
});

describe('joinLabels', () => {
  it('reads as a sentence', () => {
    expect(joinLabels(['explore'], OPTIONS)).toBe('Explore');
    expect(joinLabels(['explore', 'star_cam_missions'], OPTIONS)).toBe('Explore and Star Cam Missions');
    expect(joinLabels(['contents', 'explore', 'notifications'], OPTIONS)).toBe('Contents, Explore and Notifications');
  });

  it('shows the key for an area it has no label for', () => {
    expect(joinLabels(['explore', 'retired'], OPTIONS)).toBe('Explore and retired');
  });

  it('is empty for nothing', () => {
    expect(joinLabels([], OPTIONS)).toBe('');
    expect(joinLabels(undefined, OPTIONS)).toBe('');
  });
});

describe('summarizeAreas (the Access column)', () => {
  it('shows the first two labels and how many more', () => {
    expect(summarizeAreas(['dashboard', 'contents', 'explore', 'notifications'], OPTIONS)).toEqual({
      labels: ['Dashboard', 'Contents'],
      more: 2,
      total: 4,
      all: false,
    });
  });

  it('shows a short list in full', () => {
    expect(summarizeAreas(['notifications'], OPTIONS)).toEqual({ labels: ['Notifications'], more: 0, total: 1, all: false });
  });

  it('says "all" when every option is ticked', () => {
    expect(summarizeAreas(OPTIONS.map((option) => option.key), OPTIONS).all).toBe(true);
  });

  it('says "all" never when there are no options at all', () => {
    expect(summarizeAreas(['explore'], []).all).toBe(false);
  });

  it('copes with a missing list', () => {
    expect(summarizeAreas(undefined, OPTIONS)).toEqual({ labels: [], more: 0, total: 0, all: false });
  });

  it('can show a different number of labels', () => {
    expect(summarizeAreas(['dashboard', 'contents', 'explore'], OPTIONS, 1).labels).toEqual(['Dashboard']);
    expect(summarizeAreas(['dashboard', 'contents', 'explore'], OPTIONS, 1).more).toBe(2);
  });
});

describe('commonAreas', () => {
  it('is what every creator has', () => {
    expect(
      commonAreas(
        [
          { accessAreas: ['dashboard', 'contents', 'explore'] },
          { accessAreas: ['contents', 'explore', 'notifications'] },
          { accessAreas: ['explore', 'contents'] },
        ],
        OPTIONS
      )
    ).toEqual(['contents', 'explore']);
  });

  it('is that creator\'s whole list for one creator', () => {
    expect(commonAreas([{ accessAreas: ['notifications', 'dashboard'] }], OPTIONS)).toEqual(['dashboard', 'notifications']);
  });

  it('is empty when they share nothing, or when there is nobody', () => {
    expect(commonAreas([{ accessAreas: ['explore'] }, { accessAreas: ['contents'] }], OPTIONS)).toEqual([]);
    expect(commonAreas([], OPTIONS)).toEqual([]);
    expect(commonAreas(undefined, OPTIONS)).toEqual([]);
  });

  it('counts a creator with no list as having nothing in common', () => {
    expect(commonAreas([{ accessAreas: ['explore'] }, {}], OPTIONS)).toEqual([]);
  });
});
