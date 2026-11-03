/**
 * The `aspect-ratio` an element gets from its MUI styles. jsdom does not know the property, so
 * `toHaveStyle` cannot see it; this reads it from the generated style rules instead.
 */
export function aspectRatioOf(element) {
  const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('');
  for (const className of element.classList) {
    const match = css.match(new RegExp(`\\.${className}\\{[^}]*?aspect-ratio:([^;}]+)`));
    // The style engine writes "4/3"; return it as "4 / 3", the way the components spell it.
    if (match) return match[1].trim().replace(/\s*\/\s*/, ' / ');
  }
  return null;
}
