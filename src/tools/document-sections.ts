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

export function createDocumentSectionTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  return [
    {
      name: 'list_document_sections',
      title: 'List Document Sections',
      description: 'List sections in a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          path: `/documents/${documentKey}/sections`,
        }),
    },
    {
      name: 'create_document_section',
      title: 'Create Document Section',
      description: 'Create a section in a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        ...SectionCreateSchema.shape,
      }),
      annotations: createAnnotations,
      handler: ({ documentKey, ...body }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/sections`,
          body,
        }),
    },
    {
      name: 'update_document_section',
      title: 'Update Document Section',
      description: 'Update a section in a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        sectionId: UuidSchema,
        ...SectionUpdateSchema.shape,
      }),
      annotations: updateAnnotations,
      handler: ({ documentKey, sectionId, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/documents/${documentKey}/sections/${sectionId}`,
          body,
        }),
    },
    {
      name: 'delete_document_section',
      title: 'Delete Document Section',
      description: 'Delete a section from a document.',
      inputSchema: z.object({
        documentKey: KeySchema,
        sectionId: UuidSchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ documentKey, sectionId }) =>
        client.request({
          method: 'DELETE',
          path: `/documents/${documentKey}/sections/${sectionId}`,
        }),
    },
  ];
}
