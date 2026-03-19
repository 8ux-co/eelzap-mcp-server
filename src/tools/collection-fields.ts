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

export function createCollectionFieldTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'list_collection_fields',
      title: 'List Collection Fields',
      description: 'List all fields in a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey }) =>
        client.request({
          path: `/collections/${collectionKey}/fields`,
        }),
    },
    {
      name: 'create_collection_field',
      title: 'Create Collection Field',
      description: 'Add a field to a collection.',
      inputSchema: CollectionFieldCreateSchema.omit({ collectionId: true }).extend({
        collectionKey: KeySchema,
      }),
      annotations: createAnnotations,
      handler: async ({ collectionKey, ...body }) =>
        withCodegenHint(
          await client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/fields`,
          body,
          }),
        ),
    },
    {
      name: 'update_collection_field',
      title: 'Update Collection Field',
      description: 'Update a field in a collection.',
      inputSchema: CollectionFieldUpdateSchema.omit({ collectionId: true }).extend({
        collectionKey: KeySchema,
      }),
      annotations: updateAnnotations,
      handler: async ({ collectionKey, fieldId, ...body }) =>
        withCodegenHint(
          await client.request({
          method: 'PATCH',
          path: `/collections/${collectionKey}/fields/${fieldId}`,
          body,
          }),
        ),
    },
    {
      name: 'delete_collection_field',
      title: 'Delete Collection Field',
      description: 'Delete a field from a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        fieldId: UuidSchema,
      }),
      annotations: deleteAnnotations,
      handler: async ({ collectionKey, fieldId }) =>
        withCodegenHint(
          await client.request({
          method: 'DELETE',
          path: `/collections/${collectionKey}/fields/${fieldId}`,
          }),
        ),
    },
    {
      name: 'reorder_collection_fields',
      title: 'Reorder Collection Fields',
      description: 'Reorder the fields in a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        fieldIds: z.array(UuidSchema).min(1),
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, fieldIds }) =>
        client.request({
          method: 'PUT',
          path: `/collections/${collectionKey}/fields/reorder`,
          body: { fieldIds },
        }),
    },
  ];
}
