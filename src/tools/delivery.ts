import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { LocaleSchema, PaginationSchema } from '../schemas.js';
import { readOnlyAnnotations } from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

async function requestDelivery<T>(
  client: CmsHttpClient,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  return client.request<T>({ path, query });
}

export function createDeliveryTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'delivery_list_collections',
      title: 'Delivery List Collections',
      description: 'List collections as returned by the delivery API.',
      inputSchema: z.object({}),
      annotations: readOnlyAnnotations,
      handler: () => requestDelivery(client, '/collections'),
    },
    {
      name: 'delivery_get_collection',
      title: 'Delivery Get Collection',
      description: 'Get one collection schema from the delivery API.',
      inputSchema: z.object({
        collectionKey: z.string().min(1),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey }) =>
        requestDelivery(client, `/collections/${collectionKey}`),
    },
    {
      name: 'delivery_list_items',
      title: 'Delivery List Items',
      description: 'List published items from the delivery API.',
      inputSchema: z.object({
        collectionKey: z.string().min(1),
        ...PaginationSchema,
        sort: z.string().optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, filter, ...query }) =>
        requestDelivery(client, `/collections/${collectionKey}/items`, {
          ...query,
          filter: filter ? JSON.stringify(filter) : undefined,
        }),
    },
    {
      name: 'delivery_get_item',
      title: 'Delivery Get Item',
      description: 'Get one published item by slug from the delivery API.',
      inputSchema: z.object({
        collectionKey: z.string().min(1),
        slug: z.string().min(1),
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, slug, locale }) =>
        requestDelivery(client, `/collections/${collectionKey}/items/${slug}`, {
          locale,
        }),
    },
    {
      name: 'delivery_get_document',
      title: 'Delivery Get Document',
      description: 'Get one published document by key from the delivery API.',
      inputSchema: z.object({
        documentKey: z.string().min(1),
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey, locale }) =>
        requestDelivery(client, `/documents/${documentKey}`, {
          locale,
        }),
    },
  ];
}
