import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import {
  KeySchema,
  SectionCreateSchema,
  SectionUpdateSchema,
  UuidSchema,
} from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createCollectionSectionTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'list_collection_sections',
      title: 'List Collection Sections',
      description: 'List the sections in a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey }) =>
        client.request({
          path: `/collections/${collectionKey}/sections`,
        }),
    },
    {
      name: 'create_collection_section',
      title: 'Create Collection Section',
      description: 'Create a section in a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        ...SectionCreateSchema.shape,
      }),
      annotations: createAnnotations,
      handler: ({ collectionKey, ...body }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/sections`,
          body,
        }),
    },
    {
      name: 'update_collection_section',
      title: 'Update Collection Section',
      description: 'Update a section in a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        sectionId: UuidSchema,
        ...SectionUpdateSchema.shape,
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, sectionId, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/collections/${collectionKey}/sections/${sectionId}`,
          body,
        }),
    },
    {
      name: 'delete_collection_section',
      title: 'Delete Collection Section',
      description: 'Delete a section from a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        sectionId: UuidSchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ collectionKey, sectionId }) =>
        client.request({
          method: 'DELETE',
          path: `/collections/${collectionKey}/sections/${sectionId}`,
        }),
    },
  ];
}
