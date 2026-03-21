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
      description:
        'Get SEO metadata for a collection item. Returns metaTitle, metaDescription, canonicalUrl, ogUrl, ogImage (with url and alt), ogType, twitterCard, noIndex, noFollow, keywords, and structuredData. canonicalUrl and ogUrl are generated from the site URL and item slug unless a canonical override was stored.',
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
      description:
        'Update SEO metadata for a collection item. Accepts metaTitle, metaDescription, ogImageId (UUID of an uploaded media item), ogImageAlt, canonicalUrl (full URL override), ogType, twitterCard ("SUMMARY" or "SUMMARY_LARGE_IMAGE"), noIndex, noFollow, keywords, structuredData, and locale. Use "article" for item ogType. Leave canonicalUrl empty unless the real URL differs from the slug. If locale is omitted the record is written under the site\'s default locale.',
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
      description:
        'Get SEO metadata for a document. Returns the same fields as get_item_seo. Documents commonly use ogType "website". Homepage-style documents may require a canonicalUrl override because the document key can differ from the actual path.',
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
      description:
        'Update SEO metadata for a document. Accepts the same fields as set_item_seo. For homepage-style documents, set canonicalUrl explicitly to the real public URL such as "https://example.com/" when the document key is not the live route. If locale is omitted the record is written under the site\'s default locale.',
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
