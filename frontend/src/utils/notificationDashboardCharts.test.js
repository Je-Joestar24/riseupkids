import { describe, expect, it } from 'vitest';
import {
  buildPolyline,
  buildVerticalBars,
  formatOpenRate,
  trendAriaLabel,
} from './notificationDashboardCharts';

describe('notificationDashboardCharts', () => {
  it('does not invent an open rate', () => {
    expect(formatOpenRate(0)).toBe('0%');
    expect(formatOpenRate(0.5)).toBe('50%');
  });

  it('builds standing bars from delivery mix', () => {
    const bars = buildVerticalBars(
      [
        { key: 'sent', label: 'Sent', value: 8 },
        { key: 'failed', label: 'Failed', value: 2 },
      ],
      200,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 }
    );
    expect(bars).toHaveLength(2);
    expect(bars[0].height).toBeGreaterThan(bars[1].height);
    expect(bars[0].y).toBeLessThan(bars[1].y);
  });

  it('builds a line path for sent vs opened', () => {
    const path = buildPolyline([0, 4, 2], 100, 40, { top: 0, right: 0, bottom: 0, left: 0 });
    expect(path.split(' ')).toHaveLength(3);
    expect(trendAriaLabel([{ sent: 2, opened: 1 }, { sent: 1, opened: 0 }])).toBe(
      'Sent 3 and opened 1 over the selected days'
    );
  });
});
