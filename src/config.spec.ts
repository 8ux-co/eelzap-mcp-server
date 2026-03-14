import { describe, expect, it } from 'vitest';
import { readConfig } from './config.js';

describe('readConfig', () => {
  it('reads required environment variables', () => {
    expect(
      readConfig({
        EELZAP_API_KEY: 'cms_secret_test',
        EELZAP_BASE_URL: 'http://localhost:5041/',
        EELZAP_PATH_PREFIX: '/api/public/v1/',
      }),
    ).toEqual({
      apiKey: 'cms_secret_test',
      baseUrl: 'http://localhost:5041',
      pathPrefix: '/api/public/v1',
    });
  });

  it('uses production defaults for optional values', () => {
    expect(
      readConfig({
        EELZAP_API_KEY: 'cms_secret_test',
      }),
    ).toEqual({
      apiKey: 'cms_secret_test',
      baseUrl: 'https://api.eelzap.com',
      pathPrefix: '/v1',
    });
  });

  it('throws when the api key is missing', () => {
    expect(() => readConfig({})).toThrow(/EELZAP_API_KEY/);
  });
});
