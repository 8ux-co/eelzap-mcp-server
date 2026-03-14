import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { KeySchema, PaginationSchema, SearchSchema } from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createCollectionTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'list_collections',
      title: 'List Collections',
      description: 'List all collections in the current site.',
      inputSchema: z.object({
        q: SearchSchema,
        ...PaginationSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: (args) =>
        client.request({
          path: '/collections',
          query: args,
        }),
    },
    {
      name: 'get_collection',
      title: 'Get Collection',
      description: 'Get a collection with fields, sections, and options.',
      inputSchema: z.object({
        collectionKey: KeySchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey }) =>
        client.request({
          path: `/collections/${collectionKey}`,
        }),
    },
    {
      name: 'create_collection',
      title: 'Create Collection',
      description: 'Create a collection in the current site.',
      inputSchema: z.object({
        key: KeySchema,
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
      annotations: createAnnotations,
      handler: (args) =>
        client.request({
          method: 'POST',
          path: '/collections',
          body: args,
        }),
    },
    {
      name: 'update_collection',
      title: 'Update Collection',
      description: 'Update a collection name or description.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/collections/${collectionKey}`,
          body,
        }),
    },
    {
      name: 'delete_collection',
      title: 'Delete Collection',
      description:
        'Delete a collection and all its items, fields, and values. This is irreversible.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        deleteMediaIds: z.array(z.string().uuid()).optional(),
      }),
      annotations: deleteAnnotations,
      handler: ({ collectionKey, ...body }) =>
        client.request({
          method: 'DELETE',
          path: `/collections/${collectionKey}`,
          body,
        }),
    },
  ];
}
