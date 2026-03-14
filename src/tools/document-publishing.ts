import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { KeySchema } from '../schemas.js';
import { updateAnnotations } from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createDocumentPublishingTools(
  client: CmsHttpClient,
): ToolDefinition[] {
  const schema = z.object({
    documentKey: KeySchema,
  });

  return [
    {
      name: 'publish_document',
      title: 'Publish Document',
      description: 'Publish a document.',
      inputSchema: schema,
      annotations: updateAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/publish`,
        }),
    },
    {
      name: 'unpublish_document',
      title: 'Unpublish Document',
      description: 'Revert a published document to draft.',
      inputSchema: schema,
      annotations: updateAnnotations,
      handler: ({ documentKey }) =>
        client.request({
          method: 'POST',
          path: `/documents/${documentKey}/unpublish`,
        }),
    },
  ];
}
