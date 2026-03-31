import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { KeySchema, LocaleSchema, UuidSchema } from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
  RICH_TEXT_INSTRUCTIONS,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createDocumentVersionTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'list_document_versions',
      title: 'List Document Versions',
      description: 'List version history for a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          path: `/documents/${documentKey}/versions`,
        }),
    },
    {
      name: 'get_document_version',
      title: 'Get Document Version',
      description: 'Get details of a specific document version by ID.',
      inputSchema: z.object({
        documentKey: KeySchema,
        versionId: UuidSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey, versionId }) =>
        client.request({
          path: `/documents/${documentKey}/versions/${versionId}`,
        }),
    },
    {
      name: 'create_document_draft',
      title: 'Create Document Draft',
      description:
        'Create a new draft version from the current published version of a document. ' +
        'Use this before making changes — it is the safest way to edit content without affecting published state.',
      inputSchema: z.object({
        documentKey: KeySchema,
        note: z.string().max(200).optional().describe('Optional note describing this draft.'),
      }),
      annotations: createAnnotations,
      handler: ({ documentKey, ...body }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/versions`,
          body,
        }),
    },
    {
      name: 'update_document_draft',
      title: 'Update Document Draft',
      description:
        'Update the current draft version of a document with new field values. ' +
        'A draft must exist first (use create_document_draft).\n\n' +
        RICH_TEXT_INSTRUCTIONS,
      inputSchema: z.object({
        documentKey: KeySchema,
        values: z
          .record(z.string(), z.unknown())
          .default({})
          .describe(
            'Field values keyed by field key. For RICH_TEXT fields, the value MUST be an HTML string.',
          ),
        locale: LocaleSchema.optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey, ...body }) =>
        client.request({
          method: 'PUT',
          path: `/documents/${documentKey}/versions/draft`,
          body,
        }),
    },
    {
      name: 'discard_document_draft',
      title: 'Discard Document Draft',
      description:
        'Discard the current draft version without publishing. ' +
        'This does NOT affect published content — it only removes the in-progress draft.',
      inputSchema: z.object({
        documentKey: KeySchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          method: 'DELETE',
          path: `/documents/${documentKey}/versions/draft`,
        }),
    },
    {
      name: 'publish_document_draft',
      title: 'Publish Document Draft',
      description:
        'Publish the current draft version, making it the live published content. ' +
        'Only publish after confirming content is correct.',
      inputSchema: z.object({
        documentKey: KeySchema,
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/versions/draft/publish`,
        }),
    },
    {
      name: 'rollback_document_version',
      title: 'Rollback Document Version',
      description:
        'Create a new draft from a historical version. ' +
        'This is non-destructive — it does not delete any version history. ' +
        'Discard any existing draft before rolling back.',
      inputSchema: z.object({
        documentKey: KeySchema,
        versionId: UuidSchema,
      }),
      annotations: createAnnotations,
      handler: ({ documentKey, versionId }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/versions/${versionId}/rollback`,
        }),
    },
  ];
}
