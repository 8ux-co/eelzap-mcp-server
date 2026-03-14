import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import {
  ItemSlugSchema,
  KeySchema,
  LocaleSchema,
  SeoSchema,
} from '../schemas.js';
import { readOnlyAnnotations, updateAnnotations } from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createSeoTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'get_item_seo',
      title: 'Get Item SEO',
      description: 'Get SEO metadata for an item.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, slug, ...query }) =>
        client.request({
          path: `/collections/${collectionKey}/items/${slug}/seo`,
          query,
        }),
    },
    {
      name: 'set_item_seo',
      title: 'Set Item SEO',
      description: 'Update SEO metadata for an item.',
      inputSchema: SeoSchema.extend({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, slug, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/collections/${collectionKey}/items/${slug}/seo`,
          body,
        }),
    },
    {
      name: 'get_document_seo',
      title: 'Get Document SEO',
      description: 'Get SEO metadata for a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        locale: LocaleSchema.optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey, ...query }) =>
        client.request({
          path: `/documents/${documentKey}/seo`,
          query,
        }),
    },
    {
      name: 'set_document_seo',
      title: 'Set Document SEO',
      description: 'Update SEO metadata for a document.',
      inputSchema: SeoSchema.extend({
        documentKey: KeySchema,
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey, ...body }) =>
        client.request({
          method: 'PUT',
          path: `/documents/${documentKey}/seo`,
          body,
        }),
    },
  ];
}
