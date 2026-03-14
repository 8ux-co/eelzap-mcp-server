import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { readOnlyAnnotations } from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

export function createSiteTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'get_site',
      title: 'Get Site',
      description:
        'Get current site details resolved from the configured API key.',
      inputSchema: z.object({}),
      annotations: readOnlyAnnotations,
      handler: () => client.request({ path: '/site' }),
    },
    {
      name: 'list_sites',
      title: 'List Sites',
      description:
        'List all sites in the workspace associated with the configured API key.',
      inputSchema: z.object({}),
      annotations: readOnlyAnnotations,
      handler: async () => {
        const result = await client.requestWithFallback<
          { sites: unknown[] } | Record<string, unknown>
        >(
          { path: '/sites' },
          { path: '/site' },
        );

        if ('sites' in result && Array.isArray(result.sites)) {
          return result;
        }

        return { sites: [result] };
      },
    },
  ];
}
