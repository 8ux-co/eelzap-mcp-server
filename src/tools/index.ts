import type { CmsHttpClient } from '../http.js';
import type { ToolDefinition } from '../types.js';
import { createCollectionFieldTools } from './collection-fields.js';
import { createCollectionSectionTools } from './collection-sections.js';
import { createCollectionTools } from './collections.js';
import { createDeliveryTools } from './delivery.js';
import { createDocumentFieldTools } from './document-fields.js';
import { createDocumentPublishingTools } from './document-publishing.js';
import { createDocumentSectionTools } from './document-sections.js';
import { createDocumentValueTools } from './document-values.js';
import { createDocumentTools } from './documents.js';
import { createItemTools } from './items.js';
import { createMediaTools } from './media.js';
import { createSeoTools } from './seo.js';
import { createSiteTools } from './sites.js';

export function createAllTools(client: CmsHttpClient): ToolDefinition[] {
  return [
    ...createSiteTools(client),
    ...createCollectionTools(client),
    ...createCollectionFieldTools(client),
    ...createCollectionSectionTools(client),
    ...createItemTools(client),
    ...createDocumentTools(client),
    ...createDocumentFieldTools(client),
    ...createDocumentSectionTools(client),
    ...createDocumentValueTools(client),
    ...createDocumentPublishingTools(client),
    ...createMediaTools(client),
    ...createSeoTools(client),
    ...createDeliveryTools(client),
  ];
}
