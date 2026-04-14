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

export const FIELD_TYPE_INSTRUCTIONS = `
FIELD VALUE FORMATS BY TYPE:

When setting values for items or documents, each field type expects a specific format:

TEXT TYPES — NEVER put HTML markup in SHORT_TEXT or LONG_TEXT fields. If the content needs formatting, it belongs in a RICH_TEXT field.
- SHORT_TEXT: plain string. Single-line text for titles, names, labels, taglines. No HTML, no line breaks.
- LONG_TEXT: plain string. Multi-line text for descriptions, summaries, excerpts, notes. No HTML — use line breaks for formatting.
- RICH_TEXT: HTML string. For articles, blog posts, page body content — anything needing formatting (bold, links, headings, images). See RICH_TEXT instructions for details.

NUMERIC TYPES:
- NUMBER: number (e.g., 3.14)
- INTEGER: whole number (e.g., 42)
- BOOLEAN: boolean (true or false)

DATE TYPES:
- DATE: ISO 8601 date string (e.g., "2025-01-15")
- DATETIME: ISO 8601 datetime string (e.g., "2025-01-15T10:30:00Z")

CURRENCY:
- CURRENCY: object with amountMinor (amount in smallest unit, e.g. cents) and currency (ISO 4217 code).
  Example: { "amountMinor": 1500, "currency": "USD" } represents $15.00.

ENUM:
- ENUM: string matching one of the field's defined options[].value

MEDIA TYPES — values are media UUID strings referencing uploaded media items. Use list/upload media tools to obtain UUIDs.
- IMAGE: media UUID string
- VIDEO: media UUID string
- FILE: media UUID string

GALLERY:
- GALLERY: array of objects, each with mediaId (required UUID), caption (optional string), and description (optional string).
  Example: [{ "mediaId": "550e8400-...", "caption": "Photo caption" }]

OTHER:
- URL: valid URL string (e.g., "https://example.com")
- EMAIL: valid email string (e.g., "user@example.com")
`;

export const FIELD_CREATION_INSTRUCTIONS = `
FIELD CREATION GUIDE:

When creating fields, choose the correct type and provide required companion properties:

CHOOSING TEXT TYPES:
- SHORT_TEXT: titles, names, labels, taglines, slugs — short single-line values
- LONG_TEXT: plain-text descriptions, summaries, excerpts, notes — multi-line but no formatting needed
- RICH_TEXT: article bodies, page content, formatted descriptions — anything needing headings, bold, links, images, or HTML

TYPE-SPECIFIC REQUIREMENTS:
- ENUM: must provide options array with [{label, value, color?}] entries
- CURRENCY: should provide constraints.currencies with allowed ISO 4217 codes (e.g., ["USD", "EUR"])
- GALLERY: should set galleryAllowedTypes ('IMAGE', 'VIDEO', or 'IMAGE,VIDEO') and optionally galleryMinItems/galleryMaxItems

CONSTRAINT APPLICABILITY:
- min/max: for NUMBER, INTEGER, and CURRENCY fields
- minLength/maxLength/regex: for SHORT_TEXT, LONG_TEXT, URL, and EMAIL fields
- currencies: for CURRENCY fields only
- galleryMinItems/galleryMaxItems/galleryAllowedTypes: for GALLERY fields only
`;

export const VERSIONING_INSTRUCTIONS = `
CONTENT VERSIONING — SAFE EDITING WORKFLOW:

ALWAYS prefer the draft workflow over direct updates to prevent destructive overwrites:
1. create_item_draft / create_document_draft — create a safe draft from the current published version
2. update_item_draft / update_document_draft — make changes to the draft
3. publish_item_draft / publish_document_draft — publish only after confirming content is correct

- Save as DRAFT first when creating or modifying content. Only publish after the user confirms.
- Use list_item_versions / list_document_versions to review history before rollbacks.
- discard_item_draft / discard_document_draft is non-destructive to published content.
- rollback_item_version / rollback_document_version creates a new draft from history — it does NOT delete anything.
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
            text: `${FIELD_TYPE_INSTRUCTIONS}\n${FIELD_CREATION_INSTRUCTIONS}\n${RICH_TEXT_INSTRUCTIONS}\n${SEO_INSTRUCTIONS}\n${VERSIONING_INSTRUCTIONS}`,
          },
        },
      ],
    }),
  );
}
