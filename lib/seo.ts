const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, token: string) => {
      if (token.startsWith("#")) {
        const hexadecimal = token[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(token.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
        if (Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) {
          return String.fromCodePoint(codePoint);
        }
        return entity;
      }
      return NAMED_ENTITIES[token.toLowerCase()] ?? entity;
    });
}

export function cleanMetadataText(value: string | null | undefined): string {
  if (!value) return "";
  return decodeHtmlEntities(
    value
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function conciseMetadataDescription(
  value: string | null | undefined,
  fallback: string,
  maximumLength = 160,
): string {
  const text = cleanMetadataText(value) || cleanMetadataText(fallback);
  if (text.length <= maximumLength) return text;

  const shortened = text.slice(0, maximumLength - 1).replace(/\s+\S*$/, "").trimEnd();
  return `${shortened || text.slice(0, maximumLength - 1).trimEnd()}…`;
}
