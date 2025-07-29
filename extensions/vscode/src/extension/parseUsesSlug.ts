const USES_PATTERN_STRING = "\\buses:\\s*(.+)$";

export function parseUsesSlug(
  lineText: string,
  position?: number,
): string | undefined {
  const [slug, index] = findSlug(lineText, position);
  if (slug) {
    return slug;
  }
  return undefined;
}

export function findSlug(
  lineText: string,
  position?: number,
): [string | undefined, number | undefined] {
  const pattern = new RegExp(USES_PATTERN_STRING, "dg");
  let match;
  while ((match = pattern.exec(lineText)) !== null) {
    let slug = match[1].trim();
    let quoteOffset = 0;

    // Check for surrounding quotes
    const quoteMatch = slug.match(/^(['"])(.*?)\1/);
    if (quoteMatch) {
      // If quoted, remove the quotes but keep everything inside (including #)
      slug = quoteMatch[2].trim();
      quoteOffset = 1; // Add offset to skip the opening quote
    } else {
      // If not quoted, remove any trailing comment
      slug = slug.replace(/\s*#.*$/, "").trim();
    }

    if (!slug || !slug.startsWith("$")) {
      continue;
    }

    const indices = match.indices![1];
    const startPosition = indices[0] + quoteOffset;
    const endPosition = indices[1] - quoteOffset; // don't include potential last quote
    // If a position is provided, check if the slug capture group contains the position
    if (
      typeof position === "number" &&
      (position < startPosition || position >= endPosition)
    ) {
      continue;
    }

    return [slug, startPosition];
  }
  return [undefined, undefined];
}
