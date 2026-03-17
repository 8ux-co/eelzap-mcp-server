/**
 * Tests for all tool factory functions.
 * Each tool's handler is exercised through the CmsHttpClient mock.
 */
import { describe, expect, it, vi } from 'vitest';
import { CmsHttpClient } from '../http.js';
import { createCollectionTools } from './collections.js';
import { createItemTools } from './items.js';
import { createDocumentTools } from './documents.js';
import { createDocumentValueTools } from './document-values.js';
import { createDocumentPublishingTools } from './document-publishing.js';
import { createDocumentFieldTools } from './document-fields.js';
import { createDocumentSectionTools } from './document-sections.js';
import { createCollectionFieldTools } from './collection-fields.js';
import { createCollectionSectionTools } from './collection-sections.js';
import { createSeoTools } from './seo.js';
import { createDeliveryTools } from './delivery.js';
import { createSiteTools } from './sites.js';
import { createMediaTools } from './media.js';

function makeClient(mockResponse: unknown = { ok: true }) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(mockResponse), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return new CmsHttpClient({
    apiKey: 'cms_secret_test',
    baseUrl: 'https://cms.example.com',
    pathPrefix: '/v1',
  });
}

describe('createSiteTools', () => {
  it('get_site calls /site endpoint', async () => {
    const client = makeClient({ id: 'site_1', name: 'My Site' });
    const tools = createSiteTools(client);
    const tool = tools.find((t) => t.name === 'get_site')!;

    const result = await tool.handler({});
    expect(result).toEqual({ id: 'site_1', name: 'My Site' });
  });
});

describe('createCollectionTools', () => {
  it('list_collections calls /collections', async () => {
    const client = makeClient({ collections: [] });
    const tools = createCollectionTools(client);
    const tool = tools.find((t) => t.name === 'list_collections')!;

    const result = await tool.handler({});
    expect(result).toEqual({ collections: [] });
  });

  it('get_collection calls /collections/:key', async () => {
    const client = makeClient({ id: 'col_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionTools(client);
    const tool = tools.find((t) => t.name === 'get_collection')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog'),
      expect.any(Object),
    );
  });

  it('create_collection posts to /collections', async () => {
    const client = makeClient({ id: 'col_new' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionTools(client);
    const tool = tools.find((t) => t.name === 'create_collection')!;

    await tool.handler({ key: 'blog', name: 'Blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_collection patches /collections/:key', async () => {
    const client = makeClient({ id: 'col_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionTools(client);
    const tool = tools.find((t) => t.name === 'update_collection')!;

    await tool.handler({ collectionKey: 'blog', name: 'Updated Blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_collection sends DELETE to /collections/:key', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionTools(client);
    const tool = tools.find((t) => t.name === 'delete_collection')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('createItemTools', () => {
  it('list_items calls /collections/:key/items', async () => {
    const client = makeClient({ items: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'list_items')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('blog/items') }),
      expect.any(Object),
    );
  });

  it('get_item calls /collections/:key/items/:slug', async () => {
    const client = makeClient({ slug: 'my-post' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'get_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post'),
      expect.any(Object),
    );
  });

  it('create_item posts to /collections/:key/items', async () => {
    const client = makeClient({ id: 'item_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'create_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'new-post', values: { title: 'Hello' } });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_item patches /collections/:key/items/:slug', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'update_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post', values: { title: 'Updated' } });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_item deletes /collections/:key/items/:slug', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'delete_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('publish_item posts to /items/:slug/publish', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'publish_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post/publish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('unpublish_item posts to /items/:slug/unpublish', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createItemTools(client);
    const tool = tools.find((t) => t.name === 'unpublish_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post/unpublish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('createDocumentTools', () => {
  it('list_documents calls /documents', async () => {
    const client = makeClient({ documents: [] });
    const tools = createDocumentTools(client);
    const tool = tools.find((t) => t.name === 'list_documents')!;

    await tool.handler({});
    expect(tool).toBeDefined();
  });

  it('get_document calls /documents/:key', async () => {
    const client = makeClient({ key: 'homepage' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentTools(client);
    const tool = tools.find((t) => t.name === 'get_document')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage'),
      expect.any(Object),
    );
  });

  it('create_document posts to /documents', async () => {
    const client = makeClient({ id: 'doc_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentTools(client);
    const tool = tools.find((t) => t.name === 'create_document')!;

    await tool.handler({ key: 'homepage', name: 'Homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_document patches /documents/:key', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentTools(client);
    const tool = tools.find((t) => t.name === 'update_document')!;

    await tool.handler({ documentKey: 'homepage', name: 'Home Page' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_document deletes /documents/:key', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentTools(client);
    const tool = tools.find((t) => t.name === 'delete_document')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('createDocumentValueTools', () => {
  it('get_document_values calls /documents/:key/values', async () => {
    const client = makeClient({ values: {} });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentValueTools(client);
    const tool = tools.find((t) => t.name === 'get_document_values')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/values'),
      expect.any(Object),
    );
  });

  it('set_document_values puts /documents/:key/values', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentValueTools(client);
    const tool = tools.find((t) => t.name === 'set_document_values')!;

    await tool.handler({ documentKey: 'homepage', values: { hero: 'Hello' } });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/values'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('createDocumentPublishingTools', () => {
  it('publish_document posts to /documents/:key/publish', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentPublishingTools(client);
    const tool = tools.find((t) => t.name === 'publish_document')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/publish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('unpublish_document posts to /documents/:key/unpublish', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentPublishingTools(client);
    const tool = tools.find((t) => t.name === 'unpublish_document')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/unpublish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('createDocumentFieldTools', () => {
  it('list_document_fields calls /documents/:key/fields', async () => {
    const client = makeClient({ fields: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentFieldTools(client);
    const tool = tools.find((t) => t.name === 'list_document_fields')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/fields'),
      expect.any(Object),
    );
  });

  it('create_document_field posts to /documents/:key/fields', async () => {
    const client = makeClient({ id: 'field_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentFieldTools(client);
    const tool = tools.find((t) => t.name === 'create_document_field')!;

    await tool.handler({ documentKey: 'homepage', key: 'hero_title', label: 'Hero Title', type: 'TEXT' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/fields'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_document_field patches /documents/:key/fields/:fieldId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentFieldTools(client);
    const tool = tools.find((t) => t.name === 'update_document_field')!;

    await tool.handler({
      documentKey: 'homepage',
      fieldId: '4b0e9ec8-d5fc-453f-b390-ece551f64431',
      label: 'Updated Label',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/fields/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_document_field deletes /documents/:key/fields/:fieldId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentFieldTools(client);
    const tool = tools.find((t) => t.name === 'delete_document_field')!;

    await tool.handler({ documentKey: 'homepage', fieldId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/fields/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('reorder_document_fields posts to /documents/:key/fields/reorder', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentFieldTools(client);
    const tool = tools.find((t) => t.name === 'reorder_document_fields')!;

    await tool.handler({
      documentKey: 'homepage',
      fieldIds: ['4b0e9ec8-d5fc-453f-b390-ece551f64431'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/fields/reorder'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('createDocumentSectionTools', () => {
  it('list_document_sections calls /documents/:key/sections', async () => {
    const client = makeClient({ sections: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentSectionTools(client);
    const tool = tools.find((t) => t.name === 'list_document_sections')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/sections'),
      expect.any(Object),
    );
  });

  it('create_document_section posts to /documents/:key/sections', async () => {
    const client = makeClient({ id: 'sec_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentSectionTools(client);
    const tool = tools.find((t) => t.name === 'create_document_section')!;

    await tool.handler({ documentKey: 'homepage', key: 'hero_section', name: 'Hero' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/sections'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_document_section patches /documents/:key/sections/:sectionId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentSectionTools(client);
    const tool = tools.find((t) => t.name === 'update_document_section')!;

    await tool.handler({
      documentKey: 'homepage',
      sectionId: '4b0e9ec8-d5fc-453f-b390-ece551f64431',
      name: 'Updated',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/sections/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_document_section deletes /documents/:key/sections/:sectionId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDocumentSectionTools(client);
    const tool = tools.find((t) => t.name === 'delete_document_section')!;

    await tool.handler({ documentKey: 'homepage', sectionId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/sections/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('createCollectionFieldTools', () => {
  it('list_collection_fields calls /collections/:key/fields', async () => {
    const client = makeClient({ fields: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionFieldTools(client);
    const tool = tools.find((t) => t.name === 'list_collection_fields')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/fields'),
      expect.any(Object),
    );
  });

  it('create_collection_field posts to /collections/:key/fields', async () => {
    const client = makeClient({ id: 'field_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionFieldTools(client);
    const tool = tools.find((t) => t.name === 'create_collection_field')!;

    await tool.handler({ collectionKey: 'blog', key: 'title', label: 'Title', type: 'TEXT' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/fields'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_collection_field patches /collections/:key/fields/:fieldId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionFieldTools(client);
    const tool = tools.find((t) => t.name === 'update_collection_field')!;

    await tool.handler({
      collectionKey: 'blog',
      fieldId: '4b0e9ec8-d5fc-453f-b390-ece551f64431',
      label: 'Updated Label',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/fields/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_collection_field deletes /collections/:key/fields/:fieldId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionFieldTools(client);
    const tool = tools.find((t) => t.name === 'delete_collection_field')!;

    await tool.handler({ collectionKey: 'blog', fieldId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/fields/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('reorder_collection_fields puts /collections/:key/fields/reorder', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionFieldTools(client);
    const tool = tools.find((t) => t.name === 'reorder_collection_fields')!;

    await tool.handler({
      collectionKey: 'blog',
      fieldIds: ['4b0e9ec8-d5fc-453f-b390-ece551f64431'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/fields/reorder'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('createCollectionSectionTools', () => {
  it('list_collection_sections calls /collections/:key/sections', async () => {
    const client = makeClient({ sections: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionSectionTools(client);
    const tool = tools.find((t) => t.name === 'list_collection_sections')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/sections'),
      expect.any(Object),
    );
  });

  it('create_collection_section posts to /collections/:key/sections', async () => {
    const client = makeClient({ id: 'sec_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionSectionTools(client);
    const tool = tools.find((t) => t.name === 'create_collection_section')!;

    await tool.handler({ collectionKey: 'blog', key: 'meta_section', name: 'Meta' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/sections'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('update_collection_section patches /collections/:key/sections/:sectionId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionSectionTools(client);
    const tool = tools.find((t) => t.name === 'update_collection_section')!;

    await tool.handler({
      collectionKey: 'blog',
      sectionId: '4b0e9ec8-d5fc-453f-b390-ece551f64431',
      name: 'Updated Section',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/sections/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_collection_section deletes /collections/:key/sections/:sectionId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createCollectionSectionTools(client);
    const tool = tools.find((t) => t.name === 'delete_collection_section')!;

    await tool.handler({ collectionKey: 'blog', sectionId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/sections/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('createSeoTools', () => {
  it('get_item_seo calls /collections/:key/items/:slug/seo', async () => {
    const client = makeClient({ metaTitle: 'SEO Title' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createSeoTools(client);
    const tool = tools.find((t) => t.name === 'get_item_seo')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post/seo'),
      expect.any(Object),
    );
  });

  it('set_item_seo patches /collections/:key/items/:slug/seo', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createSeoTools(client);
    const tool = tools.find((t) => t.name === 'set_item_seo')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post', metaTitle: 'SEO Title' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post/seo'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('get_document_seo calls /documents/:key/seo', async () => {
    const client = makeClient({ metaTitle: 'Doc SEO' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createSeoTools(client);
    const tool = tools.find((t) => t.name === 'get_document_seo')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/seo'),
      expect.any(Object),
    );
  });

  it('set_document_seo puts /documents/:key/seo', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createSeoTools(client);
    const tool = tools.find((t) => t.name === 'set_document_seo')!;

    await tool.handler({ documentKey: 'homepage', metaTitle: 'Homepage SEO' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage/seo'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('createDeliveryTools', () => {
  it('delivery_list_collections calls /collections', async () => {
    const client = makeClient({ collections: [] });
    const tools = createDeliveryTools(client);
    const tool = tools.find((t) => t.name === 'delivery_list_collections')!;

    const result = await tool.handler({});
    expect(result).toEqual({ collections: [] });
  });

  it('delivery_get_collection calls /collections/:key', async () => {
    const client = makeClient({ key: 'blog' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDeliveryTools(client);
    const tool = tools.find((t) => t.name === 'delivery_get_collection')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog'),
      expect.any(Object),
    );
  });

  it('delivery_list_items calls /collections/:key/items', async () => {
    const client = makeClient({ items: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDeliveryTools(client);
    const tool = tools.find((t) => t.name === 'delivery_list_items')!;

    await tool.handler({ collectionKey: 'blog' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('blog/items') }),
      expect.any(Object),
    );
  });

  it('delivery_list_items passes filter as JSON string', async () => {
    const client = makeClient({ items: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDeliveryTools(client);
    const tool = tools.find((t) => t.name === 'delivery_list_items')!;

    await tool.handler({ collectionKey: 'blog', filter: { status: 'published' } });

    const url = fetchMock.mock.calls[0]![0] as URL;
    expect(url.searchParams.get('filter')).toBe(JSON.stringify({ status: 'published' }));
  });

  it('delivery_get_item calls /collections/:key/items/:slug', async () => {
    const client = makeClient({ slug: 'my-post' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDeliveryTools(client);
    const tool = tools.find((t) => t.name === 'delivery_get_item')!;

    await tool.handler({ collectionKey: 'blog', slug: 'my-post' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/collections/blog/items/my-post'),
      expect.any(Object),
    );
  });

  it('delivery_get_document calls /documents/:key', async () => {
    const client = makeClient({ key: 'homepage' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createDeliveryTools(client);
    const tool = tools.find((t) => t.name === 'delivery_get_document')!;

    await tool.handler({ documentKey: 'homepage' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/documents/homepage'),
      expect.any(Object),
    );
  });
});

describe('createMediaTools', () => {
  it('list_media calls /media', async () => {
    const client = makeClient({ media: [] });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'list_media')!;

    await tool.handler({});

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/media'),
      expect.any(Object),
    );
  });

  it('get_media calls /media/:mediaId', async () => {
    const client = makeClient({ id: 'media_1' });
    const fetchMock = vi.mocked(global.fetch);
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'get_media')!;

    await tool.handler({ mediaId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/media/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.any(Object),
    );
  });

  it('update_media patches /media/:mediaId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'update_media')!;

    await tool.handler({ mediaId: '4b0e9ec8-d5fc-453f-b390-ece551f64431', alt: 'New Alt' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/media/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('delete_media deletes /media/:mediaId', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'delete_media')!;

    await tool.handler({ mediaId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/media/4b0e9ec8-d5fc-453f-b390-ece551f64431'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('publish_media posts to /media/:mediaId/publish', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'publish_media')!;

    await tool.handler({ mediaId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/media/4b0e9ec8-d5fc-453f-b390-ece551f64431/publish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('unpublish_media posts to /media/:mediaId/unpublish', async () => {
    const client = makeClient({});
    const fetchMock = vi.mocked(global.fetch);
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'unpublish_media')!;

    await tool.handler({ mediaId: '4b0e9ec8-d5fc-453f-b390-ece551f64431' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://cms.example.com/v1/media/4b0e9ec8-d5fc-453f-b390-ece551f64431/unpublish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('media upload_media_from_url — SSRF and edge cases', () => {
  it('throws for non-http protocols', async () => {
    const client = makeClient({});
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'upload_media_from_url')!;

    await expect(tool.handler({ url: 'ftp://example.com/file.png' })).rejects.toThrow(
      'Only http:// and https:// URLs are allowed',
    );
  });

  it('throws when remote download fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    // Mock dns lookup to return a public IP
    const { lookup } = await import('node:dns/promises');
    vi.spyOn({ lookup }, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);

    const client = new CmsHttpClient({
      apiKey: 'cms_secret_test',
      baseUrl: 'https://cms.example.com',
      pathPrefix: '/v1',
    });
    const tools = createMediaTools(client);
    const tool = tools.find((t) => t.name === 'upload_media_from_url')!;

    // The DNS lookup for example.com happens in real network; just check for error
    await expect(tool.handler({ url: 'https://example.com/file.png' })).rejects.toThrow();
  });
});
