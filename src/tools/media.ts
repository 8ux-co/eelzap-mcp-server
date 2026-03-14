import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { basename } from 'node:path';
import { z } from 'zod';
import type { CmsHttpClient } from '../http.js';
import { HttpError } from '../http.js';
import { PaginationSchema, SearchSchema, UuidSchema } from '../schemas.js';
import {
  createAnnotations,
  deleteAnnotations,
  readOnlyAnnotations,
  updateAnnotations,
} from '../toolkit.js';
import type { ToolDefinition } from '../types.js';

const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

type UploadSpec = {
  uploadUrl: string;
  uploadMethod?: string;
  uploadHeaders?: Record<string, string>;
  confirmPayload?: Record<string, unknown>;
  mediaId?: string;
  media?: { id?: string };
};

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) {
    return (
      address.startsWith('10.') ||
      address.startsWith('127.') ||
      address.startsWith('169.254.') ||
      address.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
    );
  }

  if (isIP(address) === 6) {
    return (
      address === '::1' ||
      address.startsWith('fc') ||
      address.startsWith('fd') ||
      address.startsWith('fe80:')
    );
  }

  return false;
}

async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http:// and https:// URLs are allowed');
  }

  const resolved = await lookup(url.hostname, { all: true });
  if (resolved.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Refusing to fetch a private or local address');
  }

  return url;
}

function deriveFilename(url: URL, explicit?: string): string {
  if (explicit?.trim()) {
    return explicit.trim();
  }

  return basename(url.pathname) || 'upload.bin';
}

async function downloadRemoteAsset(url: URL): Promise<{
  buffer: ArrayBuffer;
  contentType: string;
  filename: string;
}> {
  const response = await fetch(url, {
    redirect: 'manual',
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error('Redirects are not allowed when downloading remote media');
  }

  if (!response.ok) {
    throw new Error(`Failed to download media (${response.status})`);
  }

  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (contentLength > MAX_DOWNLOAD_BYTES) {
    throw new Error('Remote media exceeds the 50MB download limit');
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();
  if (!contentType) {
    throw new Error('Remote media response is missing a content-type header');
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error('Remote media exceeds the 50MB download limit');
  }

  return {
    buffer,
    contentType,
    filename: basename(url.pathname) || 'upload.bin',
  };
}

async function uploadFromUrl(
  client: CmsHttpClient,
  args: {
    url: string;
    filename?: string;
    alt?: string;
    title?: string;
  },
): Promise<unknown> {
  const safeUrl = await assertSafeExternalUrl(args.url);
  const downloaded = await downloadRemoteAsset(safeUrl);
  const filename = deriveFilename(safeUrl, args.filename ?? downloaded.filename);

  const uploadSpec = await client.request<UploadSpec>({
    method: 'POST',
    path: '/media/upload-url',
    body: {
      filename,
      contentType: downloaded.contentType,
      size: downloaded.buffer.byteLength,
    },
  });

  const uploadResponse = await fetch(uploadSpec.uploadUrl, {
    method: uploadSpec.uploadMethod ?? 'PUT',
    headers: uploadSpec.uploadHeaders,
    body: downloaded.buffer,
  });

  if (!uploadResponse.ok) {
    throw new HttpError('Failed to upload media to storage', uploadResponse.status);
  }

  const mediaId = uploadSpec.mediaId ?? uploadSpec.media?.id;
  const confirmPayload = uploadSpec.confirmPayload ?? (mediaId ? { mediaId } : {});
  const confirmed = await client.request<unknown>({
    method: 'POST',
    path: '/media/confirm',
    body: confirmPayload,
  });

  const confirmedId =
    mediaId ??
    (typeof confirmed === 'object' && confirmed
      ? ((confirmed as Record<string, unknown>).id as string | undefined)
      : undefined);

  if (confirmedId && (args.alt || args.title)) {
    return client.request({
      method: 'PATCH',
      path: `/media/${confirmedId}`,
      body: {
        alt: args.alt,
        title: args.title,
      },
    });
  }

  return confirmed;
}

export function createMediaTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    {
      name: 'list_media',
      title: 'List Media',
      description: 'List media files in the current site.',
      inputSchema: z.object({
        q: SearchSchema,
        type: z.enum(['IMAGE', 'VIDEO', 'PDF']).optional(),
        ...PaginationSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: (query) =>
        client.request({
          path: '/media',
          query,
        }),
    },
    {
      name: 'get_media',
      title: 'Get Media',
      description: 'Get one media item.',
      inputSchema: z.object({
        mediaId: UuidSchema,
      }),
      annotations: readOnlyAnnotations,
      handler: ({ mediaId }) =>
        client.request({
          path: `/media/${mediaId}`,
        }),
    },
    {
      name: 'upload_media_from_url',
      title: 'Upload Media From URL',
      description:
        'Download a remote file and upload it into the CMS media library with SSRF protections.',
      inputSchema: z.object({
        url: z.url(),
        filename: z.string().optional(),
        alt: z.string().optional(),
        title: z.string().optional(),
      }),
      annotations: createAnnotations,
      handler: (args) => uploadFromUrl(client, args),
    },
    {
      name: 'update_media',
      title: 'Update Media',
      description: 'Update media metadata.',
      inputSchema: z.object({
        mediaId: UuidSchema,
        alt: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
      annotations: updateAnnotations,
      handler: ({ mediaId, ...body }) =>
        client.request({
          method: 'PATCH',
          path: `/media/${mediaId}`,
          body,
        }),
    },
    {
      name: 'delete_media',
      title: 'Delete Media',
      description: 'Delete a media record and its stored file.',
      inputSchema: z.object({
        mediaId: UuidSchema,
      }),
      annotations: deleteAnnotations,
      handler: ({ mediaId }) =>
        client.request({
          method: 'DELETE',
          path: `/media/${mediaId}`,
        }),
    },
    {
      name: 'publish_media',
      title: 'Publish Media',
      description: 'Publish a media item.',
      inputSchema: z.object({
        mediaId: UuidSchema,
      }),
      annotations: updateAnnotations,
      handler: ({ mediaId }) =>
        client.request({
          method: 'POST',
          path: `/media/${mediaId}/publish`,
        }),
    },
    {
      name: 'unpublish_media',
      title: 'Unpublish Media',
      description: 'Move a published media item back to draft.',
      inputSchema: z.object({
        mediaId: UuidSchema,
      }),
      annotations: updateAnnotations,
      handler: ({ mediaId }) =>
        client.request({
          method: 'POST',
          path: `/media/${mediaId}/unpublish`,
        }),
    },
  ];
}
