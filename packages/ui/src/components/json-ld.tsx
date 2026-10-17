/**
 * Structured data (schema.org JSON-LD). Server-safe; render one instance per
 * schema entity on the page.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Schema graphs are generated server-side from trusted config, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
