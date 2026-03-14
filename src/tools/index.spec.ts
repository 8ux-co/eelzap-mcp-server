import { describe, expect, it, vi } from 'vitest';
import { CmsHttpClient } from '../http.js';
import { createAllTools } from './index.js';

describe('createAllTools', () => {
  it('registers the full MCP tool surface', () => {
    const tools = createAllTools(
      new CmsHttpClient({
        apiKey: 'cms_secret_test',
        baseUrl: 'https://cms.example.com',
        pathPrefix: '/v1',
      }),
    );

    expect(tools).toHaveLength(57);
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'get_site',
        'create_collection',
        'create_item',
        'set_document_values',
        'upload_media_from_url',
        'unpublish_media',
        'delivery_get_document',
      ]),
    );
  });

  it('wires collection creation to the public collections endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'col_1' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const tools = createAllTools(
      new CmsHttpClient({
        apiKey: 'cms_secret_test',
        baseUrl: 'https://cms.example.com',
        pathPrefix: '/v1',
      }),
    );

    const createCollection = tools.find((tool) => tool.name === 'create_collection');
    expect(createCollection).toBeDefined();

    const response = await createCollection!.handler({
      key: 'blog',
      name: 'Blog',
    });

    expect(response).toEqual({ id: 'col_1' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('uses the live public API verbs for document values and seo writes', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const tools = createAllTools(
      new CmsHttpClient({
        apiKey: 'cms_secret_test',
        baseUrl: 'https://cms.example.com',
        pathPrefix: '/v1',
      }),
    );

    const setDocumentValues = tools.find((tool) => tool.name === 'set_document_values');
    const setDocumentSeo = tools.find((tool) => tool.name === 'set_document_seo');

    await setDocumentValues!.handler({
      documentKey: 'homepage',
      values: { hero_title: 'Hello' },
    });
    await setDocumentSeo!.handler({
      documentKey: 'homepage',
      metaTitle: 'Homepage',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL('https://cms.example.com/v1/documents/homepage/values'),
      expect.objectContaining({
        method: 'PUT',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL('https://cms.example.com/v1/documents/homepage/seo'),
      expect.objectContaining({
        method: 'PUT',
      }),
    );
  });

  it('uses the live public API verbs for field reorder routes', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const tools = createAllTools(
      new CmsHttpClient({
        apiKey: 'cms_secret_test',
        baseUrl: 'https://cms.example.com',
        pathPrefix: '/v1',
      }),
    );

    const reorderCollectionFields = tools.find(
      (tool) => tool.name === 'reorder_collection_fields',
    );
    const reorderDocumentFields = tools.find(
      (tool) => tool.name === 'reorder_document_fields',
    );

    await reorderCollectionFields!.handler({
      collectionKey: 'blog',
      fieldIds: ['4b0e9ec8-d5fc-453f-b390-ece551f64431'],
    });
    await reorderDocumentFields!.handler({
      documentKey: 'homepage',
      fieldIds: ['4b0e9ec8-d5fc-453f-b390-ece551f64431'],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL('https://cms.example.com/v1/collections/blog/fields/reorder'),
      expect.objectContaining({
        method: 'PUT',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL('https://cms.example.com/v1/documents/homepage/fields/reorder'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
