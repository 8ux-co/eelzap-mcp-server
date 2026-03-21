import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { errorResult, jsonResult } from './results.js';
import type { ToolDefinition } from './types.js';

export const RICH_TEXT_INSTRUCTIONS = `
CRITICAL INSTRUCTIONS FOR RICH_TEXT FIELDS:
Any tools dealing with RICH_TEXT fields (e.g., in values objects) MUST provide an HTML string, not a JSON object.
When generating or modifying HTML that includes images within a RICH_TEXT field, you MUST use this exact structure:
<img data-media-id="UUID_HERE" src="..." width="..." height="..." alt="..." data-alignment="center" data-status="published">
- data-media-id (mandatory): The UUID of the media item stored in the CMS. The CMS uses this ID for reference tracking and URL resolution.
- src, width, height, and alt remain as standard attributes.
- data-alignment: 'left', 'center', or 'right' (default 'center').
- data-status: 'draft' or 'published'.
`;

export const SEO_INSTRUCTIONS = `
SEO BEST PRACTICES FOR CMS CONTENT:

- metaTitle: keep it under roughly 60 characters and place the main keyword early.
- metaDescription: aim for roughly 160 characters and summarize the page clearly.
- ogImageId: use an uploaded media UUID. Prefer 1200x630 images when possible.
- ogImageAlt: always provide concise alt text for accessibility.
- canonicalUrl: leave empty for the common case where the URL matches the slug/key. Override it only when the public path differs, especially homepage documents.
- ogType: use "website" for documents and singleton pages, "article" for collection items like posts or products.
- twitterCard: prefer "SUMMARY_LARGE_IMAGE" when an OG image is present.
- structuredData: use schema.org JSON-LD with @context and @type.
- noIndex/noFollow: only enable them when the page should be excluded from search engines.
`;

export const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export const createAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
} as const;

export const updateAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export const deleteAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
} as const;

export function registerTools(server: McpServer, tools: ToolDefinition[]): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (args) => {
        try {
          return jsonResult(await tool.handler(args as never));
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  }
}

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'system_instructions',
    'System instructions and formatting rules for CMS interactions',
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${RICH_TEXT_INSTRUCTIONS}\n${SEO_INSTRUCTIONS}`,
          },
        },
      ],
    }),
  );
}
