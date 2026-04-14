import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { KeySchema, LocaleSchema } from '../schemas.js';
import { readOnlyAnnotations, updateAnnotations, RICH_TEXT_INSTRUCTIONS, FIELD_TYPE_INSTRUCTIONS } from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createDocumentValueTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'get_document_values',
      title: 'Get Document Values',
      description: 'Get current values for a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey, ...query }) =>
        client.request({
          path: `/documents/${documentKey}/values`,
          query,
        }),
    },
    {
      name: 'set_document_values',
      title: 'Set Document Values',
      description: 'Set field-keyed values for a document directly. Prefer the draft workflow (create_document_draft → update_document_draft → publish_document_draft) for safer editing.\n\n' + FIELD_TYPE_INSTRUCTIONS + RICH_TEXT_INSTRUCTIONS,
      inputSchema: z.object({
        documentKey: KeySchema,
        values: z.record(z.string(), z.unknown()).describe('Field values keyed by field key. Each value must match the format for its field type — see field type instructions.'),
        locale: LocaleSchema.optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey, ...body }) =>
        client.request({
          method: 'PUT',
          path: `/documents/${documentKey}/values`,
          body,
        }),
    },
  ];
}
