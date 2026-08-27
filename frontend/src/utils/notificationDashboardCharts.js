export function formatOpenRate(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return `${Math.round(value * 1000) / 10}%`;
}

export function chartColorsFromTheme(theme) {
  return {
    sent: theme?.palette?.success?.main || '#10b981',
    failed: theme?.palette?.error?.main || '#ef4444',
    skipped: theme?.palette?.orange?.main || '#e98a68',
    expired: theme?.palette?.text?.secondary || '#64748b',
    opened: theme?.palette?.secondary?.main || '#62caca',
  };
}

export function buildVerticalBars(items = [], width, height, padding) {
  const rows = items.map((item) => ({
    key: item.key,
    label: item.label,
    value: Math.max(0, Number(item.value) || 0),
  }));
  const max = Math.max(1, ...rows.map((item) => item.value));
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = Math.max(1, height - padding.top - padding.bottom);
  const gap = 16;
  const barWidth = Math.max(8, (innerWidth - gap * Math.max(0, rows.length - 1)) / Math.max(1, rows.length));
  return rows.map((item, index) => {
    const barHeight = (item.value / max) * innerHeight;
    return {
      ...item,
      x: padding.left + index * (barWidth + gap),
      y: padding.top + innerHeight - barHeight,
      width: barWidth,
      height: item.value ? Math.max(barHeight, 2) : 0,
    };
  });
}

export function describeDeliveryMix(mix = []) {
  const parts = mix.filter((item) => Number(item.value) > 0);
  if (!parts.length) return 'No production deliveries in this period';
  return parts.map((item) => `${item.label} ${item.value}`).join(', ');
}

export function buildPolyline(values = [], width, height, padding) {
  const safe = values.map((value) => Math.max(0, Number(value) || 0));
  const max = Math.max(1, ...safe);
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = Math.max(1, height - padding.top - padding.bottom);
  const last = Math.max(1, safe.length - 1);
  return safe
    .map((value, index) => {
      const x = padding.left + (safe.length === 1 ? innerWidth / 2 : (index / last) * innerWidth);
      const y = padding.top + innerHeight - (value / max) * innerHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

export function trendAriaLabel(trend = []) {
  const sent = trend.reduce((sum, row) => sum + (row.sent || 0), 0);
  const opened = trend.reduce((sum, row) => sum + (row.opened || 0), 0);
  return `Sent ${sent} and opened ${opened} over the selected days`;
}
