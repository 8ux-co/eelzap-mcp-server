import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import {
  ItemSlugSchema,
  KeySchema,
  LocaleSchema,
  PaginationSchema,
  SearchSchema,
} from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
  RICH_TEXT_INSTRUCTIONS,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createItemTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'list_items',
      title: 'List Items',
      description: 'List items in a collection.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        q: SearchSchema,
        ...PaginationSchema,
        sort: z.string().optional(),
        status: z.enum(['draft', 'published', 'all']).optional(),
        fields: z.string().optional(),
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, ...query }) =>
        client.request({
          path: `/collections/${collectionKey}/items`,
          query,
        }),
    },
    {
      name: 'get_item',
      title: 'Get Item',
      description: 'Get one item by slug.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        locale: LocaleSchema.optional(),
        status: z.enum(['draft', 'published', 'all']).optional(),
        fields: z.string().optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, slug, ...query }) =>
        client.request({
          path: `/collections/${collectionKey}/items/${slug}`,
          query,
        }),
    },
    {
      name: 'create_item',
      title: 'Create Item',
      description: 'Create a draft item with field-keyed values.\n\n' + RICH_TEXT_INSTRUCTIONS,
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        values: z.record(z.string(), z.unknown()).describe('Field values. For RICH_TEXT fields, the value MUST be an HTML string with formatting conforming to instructions, NOT a JSON object.'),
        locale: LocaleSchema.optional(),
      }),
      annotations: createAnnotations,
      handler: ({ collectionKey, ...body }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/items`,
          body,
        }),
    },
    {
      name: 'update_item',
      title: 'Update Item',
      description: 'Update an item and its field-keyed values.\n\n' + RICH_TEXT_INSTRUCTIONS,
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        nextSlug: ItemSlugSchema.optional(),
        values: z.record(z.string(), z.unknown()).describe('Field values. For RICH_TEXT fields, the value MUST be an HTML string with formatting conforming to instructions, NOT a JSON object.').optional(),
        locale: LocaleSchema.optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, slug, nextSlug, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/collections/${collectionKey}/items/${slug}`,
          body: {
            ...body,
            slug: nextSlug,
          },
        }),
    },
    {
      name: 'delete_item',
      title: 'Delete Item',
      description: 'Delete an item and all its values.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ collectionKey, slug }) =>
        client.request({
          method: 'DELETE',
          path: `/collections/${collectionKey}/items/${slug}`,
        }),
    },
    {
      name: 'publish_item',
      title: 'Publish Item',
      description: 'Publish a draft item.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, slug }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/items/${slug}/publish`,
        }),
    },
    {
      name: 'unpublish_item',
      title: 'Unpublish Item',
      description: 'Move a published item back to draft.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, slug }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/items/${slug}/unpublish`,
        }),
    },
  ];
}
