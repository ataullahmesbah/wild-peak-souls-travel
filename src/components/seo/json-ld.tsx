// src/components/seo/json-ld.tsx

/**
 * Structured data, serialised so it cannot break out of its own script tag.
 *
 * `JSON.stringify` escapes what JSON needs but knows nothing about HTML. The
 * string `</script>` survives it intact, and inside
 * `<script type="application/ld+json">` the HTML parser ends the element at
 * that point — everything after it is parsed as markup. Any field fed from the
 * database is therefore an injection point: a post body, an event title, an
 * FAQ answer, a brand name typed into Settings. Whoever can edit that content
 * could run script in every visitor's browser, including an administrator's.
 *
 * Escaping `<`, `>` and `&` as JSON unicode escapes closes it. They are
 * ordinary JSON, so every consumer — Google, an AI crawler, JSON.parse —
 * decodes them back to the original characters and the structured data is
 * unchanged. U+2028 and U+2029 are escaped too: they are legal in JSON but
 * terminate a line in a JavaScript string literal.
 */
export function serialiseJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Renders one JSON-LD block. Always use this rather than a raw script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Safe by construction: serialiseJsonLd escapes every character that
      // could close the tag or start a new one.
      dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }}
    />
  );
}
