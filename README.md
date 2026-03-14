# `@8ux-co/eelzap-mcp-server`

Standalone MCP server for the Eel Zap CMS.

## Configuration

Set these environment variables before starting the server:

- `EELZAP_API_KEY`
- `EELZAP_BASE_URL` (optional, defaults to `https://api.eelzap.com`)

## Development

```bash
npm install
npm run build
npm test
```

## Usage

```bash
EELZAP_API_KEY=cms_secret_... \
npx tsx src/index.ts
```
