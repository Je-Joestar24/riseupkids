/**
 * The picture shown for an experience with no cover: decoration only, three colour sets taken in turn.
 */
import React from 'react';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { COVER_PALETTES, coverPalette, ExperienceCoverPlaceholder } from '@/components/child/experiences/experience-cover-placeholder';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

describe('coverPalette', () => {
  it('takes the three colour sets in turn, then starts over', () => {
    expect(COVER_PALETTES).toHaveLength(3);
    expect([0, 1, 2, 3, 4, 5].map((i) => COVER_PALETTES.indexOf(coverPalette(i)))).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it.each([[undefined], [null], ['x'], [-1], [1.5], [NaN]])('never fails for the place %p', (index) => {
    expect(COVER_PALETTES as readonly unknown[]).toContain(coverPalette(index));
  });
});

describe('ExperienceCoverPlaceholder', () => {
  it('is decoration: hidden from screen readers', () => {
    const tree = render(<ExperienceCoverPlaceholder index={0} />);
    const root = tree.root.findAll((n: ReactTestInstance) => n.props.testID === 'experience-cover-placeholder')[0];
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it("uses its place's colours, so neighbours differ", () => {
    const gradient = (i: number) =>
      render(<ExperienceCoverPlaceholder index={i} />).root.findAll((n: ReactTestInstance) => Array.isArray(n.props.colors))[0].props.colors;
    expect(gradient(0)).toEqual([COVER_PALETTES[0].from, COVER_PALETTES[0].to]);
    expect(gradient(1)).toEqual([COVER_PALETTES[1].from, COVER_PALETTES[1].to]);
    expect(gradient(0)).not.toEqual(gradient(1));
  });
});
