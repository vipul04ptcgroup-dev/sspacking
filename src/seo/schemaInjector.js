function getSchemaKey(schema) {
  if (schema?.['@id']) return schema['@id'];

  const type = Array.isArray(schema?.['@type']) ? schema['@type'].join(',') : schema?.['@type'];
  return JSON.stringify({
    type,
    url: schema?.url,
    name: schema?.name,
  });
}

function normalizeSchemas(schemas = []) {
  const flatSchemas = schemas.flat().filter(Boolean);
  const uniqueSchemas = [];
  const seen = new Set();

  for (const schema of flatSchemas) {
    const key = getSchemaKey(schema);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSchemas.push(schema);
  }

  return uniqueSchemas;
}

function serializeSchema(schema) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

export function SchemaInjector({ schemas = [] }) {
  const normalizedSchemas = normalizeSchemas(schemas);

  if (normalizedSchemas.length === 0) return null;

  return (
    <>
      {normalizedSchemas.map((schema) => (
        <script
          key={getSchemaKey(schema)}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
        />
      ))}
    </>
  );
}
