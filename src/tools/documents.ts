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

export function createDocumentTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'list_documents',
      title: 'List Documents',
      description: 'List documents in the current site.',
      inputSchema: z.object({
        q: SearchSchema,
        ...PaginationSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: (args) =>
        client.request({
          path: '/documents',
          query: args,
        }),
    },
    {
      name: 'get_document',
      title: 'Get Document',
      description: 'Get one document with schema and current values.',
      inputSchema: z.object({
        documentKey: KeySchema,
        locale: z.string().optional(),
        status: z.enum(['draft', 'published', 'all']).optional(),
        fields: z.string().optional(),
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey, ...query }) =>
        client.request({
          path: `/documents/${documentKey}`,
          query,
        }),
    },
    {
      name: 'create_document',
      title: 'Create Document',
      description: 'Create a document.',
      inputSchema: z.object({
        key: KeySchema,
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
      annotations: createAnnotations,
      handler: (body) =>
        client.request({
          method: 'POST',
          path: '/documents',
          body,
        }),
    },
    {
      name: 'update_document',
      title: 'Update Document',
      description: 'Update a document name or description.',
      inputSchema: z.object({
        documentKey: KeySchema,
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/documents/${documentKey}`,
          body,
        }),
    },
    {
      name: 'delete_document',
      title: 'Delete Document',
      description: 'Delete a document and its fields and values.',
      inputSchema: z.object({
        documentKey: KeySchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          method: 'DELETE',
          path: `/documents/${documentKey}`,
        }),
    },
  ];
}
