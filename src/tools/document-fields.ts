import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import {
  CollectionFieldCreateSchema,
  CollectionFieldUpdateSchema,
  KeySchema,
  UuidSchema,
} from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';
import { withCodegenHint } from './utils/codegen-hint.js';

export function createDocumentFieldTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'list_document_fields',
      title: 'List Document Fields',
      description: 'List fields in a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          path: `/documents/${documentKey}/fields`,
        }),
    },
    {
      name: 'create_document_field',
      title: 'Create Document Field',
      description: 'Add a field to a document.',
      inputSchema: CollectionFieldCreateSchema.omit({ collectionId: true }).extend({
        documentKey: KeySchema,
      }),
      annotations: createAnnotations,
      handler: async ({ documentKey, ...body }) =>
        withCodegenHint(
          await client.request({
          method: 'POST',
          path: `/documents/${documentKey}/fields`,
          body,
          }),
        ),
    },
    {
      name: 'update_document_field',
      title: 'Update Document Field',
      description: 'Update a field in a document.',
      inputSchema: CollectionFieldUpdateSchema.omit({ collectionId: true }).extend({
        documentKey: KeySchema,
      }),
      annotations: updateAnnotations,
      handler: async ({ documentKey, fieldId, ...body }) =>
        withCodegenHint(
          await client.request({
          method: 'PATCH',
          path: `/documents/${documentKey}/fields/${fieldId}`,
          body,
          }),
        ),
    },
    {
      name: 'delete_document_field',
      title: 'Delete Document Field',
      description: 'Delete a field from a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        fieldId: UuidSchema,
      }),
      annotations: deleteAnnotations,
      handler: async ({ documentKey, fieldId }) =>
        withCodegenHint(
          await client.request({
          method: 'DELETE',
          path: `/documents/${documentKey}/fields/${fieldId}`,
          }),
        ),
    },
    {
      name: 'reorder_document_fields',
      title: 'Reorder Document Fields',
      description: 'Reorder fields in a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        fieldIds: z.array(UuidSchema).min(1),
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey, fieldIds }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/fields/reorder`,
          body: { fieldIds },
        }),
    },
  ];
}
