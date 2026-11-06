/**
 * The `aspect-ratio` an element gets from its MUI styles. jsdom does not know the property, so
 * `toHaveStyle` cannot see it; this reads it from the generated style rules instead (the usual rule, or the one for
 * screens 600px and wider when a phone-only value sits beside it).
 */
export function aspectRatioOf(element) {
  const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('');
  for (const className of element.classList) {
    // Where a phone-only value sits beside it, the usual shape is the one written for screens 600px and wider.
    const wide = css.match(new RegExp(`@media \\(min-width:600px\\)\\{\\.${className}\\{[^}]*?aspect-ratio:([^;}]+)`));
    if (wide) return wide[1].trim().replace(/\s*\/\s*/, ' / ');
    const match = css.match(new RegExp(`\\.${className}\\{[^}]*?aspect-ratio:([^;}]+)`));
    // The style engine writes "4/3"; return it as "4 / 3", the way the components spell it.
    if (match) return match[1].trim().replace(/\s*\/\s*/, ' / ');
  }
  return null;
}
