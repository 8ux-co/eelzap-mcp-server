import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { ItemSlugSchema, KeySchema, LocaleSchema, UuidSchema } from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
  RICH_TEXT_INSTRUCTIONS,
  FIELD_TYPE_INSTRUCTIONS,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createItemVersionTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'list_item_versions',
      title: 'List Item Versions',
      description: 'List version history for a collection item.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, slug }) =>
        client.request({
          path: `/collections/${collectionKey}/items/${slug}/versions`,
        }),
    },
    {
      name: 'get_item_version',
      title: 'Get Item Version',
      description: 'Get details of a specific item version by ID.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        versionId: UuidSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ collectionKey, slug, versionId }) =>
        client.request({
          path: `/collections/${collectionKey}/items/${slug}/versions/${versionId}`,
        }),
    },
    {
      name: 'create_item_draft',
      title: 'Create Item Draft',
      description:
        'Create a new draft version from the current published version of an item. ' +
        'Use this before making changes — it is the safest way to edit content without affecting published state.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        note: z.string().max(200).optional().describe('Optional note describing this draft.'),
      }),
      annotations: createAnnotations,
      handler: ({ collectionKey, slug, ...body }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/items/${slug}/versions`,
          body,
        }),
    },
    {
      name: 'update_item_draft',
      title: 'Update Item Draft',
      description:
        'Update the current draft version of an item with new field values. ' +
        'A draft must exist first (use create_item_draft).\n\n' +
        FIELD_TYPE_INSTRUCTIONS +
        RICH_TEXT_INSTRUCTIONS,
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        values: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Field values keyed by field key. Each value must match the format for its field type — see field type instructions.',
          ),
        nextSlug: ItemSlugSchema.optional().describe('New slug for the item.'),
        locale: LocaleSchema.optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, slug, nextSlug, ...body }) =>
        client.request({
          method: 'PUT',
          path: `/collections/${collectionKey}/items/${slug}/versions/draft`,
          body: { ...body, slug: nextSlug },
        }),
    },
    {
      name: 'discard_item_draft',
      title: 'Discard Item Draft',
      description:
        'Discard the current draft version without publishing. ' +
        'This does NOT affect published content — it only removes the in-progress draft.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ collectionKey, slug }) =>
        client.request({
          method: 'DELETE',
          path: `/collections/${collectionKey}/items/${slug}/versions/draft`,
        }),
    },
    {
      name: 'publish_item_draft',
      title: 'Publish Item Draft',
      description:
        'Publish the current draft version, making it the live published content. ' +
        'Only publish after confirming content is correct.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
      }),
      annotations: updateAnnotations,
      handler: ({ collectionKey, slug }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/items/${slug}/versions/draft/publish`,
        }),
    },
    {
      name: 'rollback_item_version',
      title: 'Rollback Item Version',
      description:
        'Create a new draft from a historical version. ' +
        'This is non-destructive — it does not delete any version history. ' +
        'Discard any existing draft before rolling back.',
      inputSchema: z.object({
        collectionKey: KeySchema,
        slug: ItemSlugSchema,
        versionId: UuidSchema,
      }),
      annotations: createAnnotations,
      handler: ({ collectionKey, slug, versionId }) =>
        client.request({
          method: 'POST',
          path: `/collections/${collectionKey}/items/${slug}/versions/${versionId}/rollback`,
        }),
    },
  ];
}
