# @8ux-co/eelzap-mcp-server

Connect your AI assistant to [Eel Zap CMS](https://eelzap.com). Create collections, manage content, upload media, and publish — all through natural language.

Works with Claude Code, Cursor, VS Code, Codex, and Claude Desktop.

## Quick Start

**With the CLI (recommended):**
```bash
npx @8ux-co/eelzap-mcp-server install
```

**With Claude Code:**
```bash
claude mcp add --transport stdio eelzap \
  --env EELZAP_API_KEY=cms_secret_your_key_here \
  -- npx -y @8ux-co/eelzap-mcp-server
```

For other tools, see the [Installation Guides](#installation-guides) below.

## Installation Guides

### Claude Code

**CLI method:**
```bash
npx @8ux-co/eelzap-mcp-server install --tool claude-code
```

**Manual method — Project scope (`.mcp.json`):**

Create `.mcp.json` in your project root:
```json
{
  "mcpServers": {
    "eelzap": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@8ux-co/eelzap-mcp-server"],
      "env": {
        "EELZAP_API_KEY": "cms_secret_your_key_here"
      }
    }
  }
}
```

**Manual method — User scope (`~/.claude.json`):**

Add to the `mcpServers` section in `~/.claude.json`:
```json
{
  "mcpServers": {
    "eelzap": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@8ux-co/eelzap-mcp-server"],
      "env": {
        "EELZAP_API_KEY": "cms_secret_your_key_here"
      }
    }
  }
}
```

**Using `claude mcp add`:**
```bash
claude mcp add --transport stdio eelzap \
  --env EELZAP_API_KEY=cms_secret_your_key_here \
  -- npx -y @8ux-co/eelzap-mcp-server
```

### Cursor

**CLI method:**
```bash
npx @8ux-co/eelzap-mcp-server install --tool cursor
```

**Manual method — Project scope:**

Create `.cursor/mcp.json` in your project root:
```json
{
  "mcpServers": {
    "eelzap": {
      "command": "npx",
      "args": ["-y", "@8ux-co/eelzap-mcp-server"],
      "env": {
        "EELZAP_API_KEY": "cms_secret_your_key_here"
      }
    }
  }
}
```

**Manual method — Global scope:**

Create or edit `~/.cursor/mcp.json` with the same structure.

### VS Code

**CLI method:**
```bash
npx @8ux-co/eelzap-mcp-server install --tool vscode
```

**Manual method:**

Create `.vscode/mcp.json` in your project root:
```json
{
  "servers": {
    "eelzap": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@8ux-co/eelzap-mcp-server"],
      "env": {
        "EELZAP_API_KEY": "cms_secret_your_key_here"
      }
    }
  }
}
```

**Important:** VS Code uses `"servers"` as the top-level key, not `"mcpServers"`.

### Codex

**CLI method:**
```bash
npx @8ux-co/eelzap-mcp-server install --tool codex
```

**Manual method:**

Add to `~/.codex/config.toml` (or `.codex/config.toml` for project scope):
```toml
[mcp_servers.eelzap]
command = "npx"
args = ["-y", "@8ux-co/eelzap-mcp-server"]
enabled = true

[mcp_servers.eelzap.env]
EELZAP_API_KEY = "cms_secret_your_key_here"
```

### Claude Desktop

**CLI method:**
```bash
npx @8ux-co/eelzap-mcp-server install --tool claude-desktop
```

**Manual method:**

Edit the config file at:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/claude/claude_desktop_config.json`

Add to the `mcpServers` section:
```json
{
  "mcpServers": {
    "eelzap": {
      "command": "npx",
      "args": ["-y", "@8ux-co/eelzap-mcp-server"],
      "env": {
        "EELZAP_API_KEY": "cms_secret_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx @8ux-co/eelzap-mcp-server install` | Interactive setup for any supported tool |
| `npx @8ux-co/eelzap-mcp-server switch-key` | Change the API key for an existing installation |
| `npx @8ux-co/eelzap-mcp-server uninstall` | Remove the eelzap entry from a tool's config |
| `npx @8ux-co/eelzap-mcp-server status` | Show all detected installations and their connection status |
| `npx @8ux-co/eelzap-mcp-server doctor` | Diagnose common configuration issues |

**Examples:**

```bash
# Install with flags (non-interactive):
npx @8ux-co/eelzap-mcp-server install \
  --tool claude-code \
  --scope project \
  --api-key cms_secret_xxx

# Update the API key for a specific tool:
npx @8ux-co/eelzap-mcp-server switch-key --tool cursor

# Check what's configured and whether it's working:
npx @8ux-co/eelzap-mcp-server status

# Run diagnostics:
npx @8ux-co/eelzap-mcp-server doctor
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EELZAP_API_KEY` | Yes | — | Your API key. Starts with `cms_secret_` (full access) or `cms_public_` (read-only). Get it from your Eel Zap dashboard under Settings > API Keys. |
| `EELZAP_BASE_URL` | No | `https://api.eelzap.com` | API base URL. Override for self-hosted or local development. |
| `EELZAP_PATH_PREFIX` | No | `/v1` | Path prefix. Set to `/api/public/v1` for local dev against the Next.js dev server. |

### API Key Types

| Key prefix | Access level | Use case |
|------------|-------------|----------|
| `cms_secret_` | Full read/write | Creating content, managing collections, uploading media, publishing |
| `cms_public_` | Read-only | Querying published content via the delivery API only |

For MCP server usage, you almost always want a **secret key** since the whole point is to manage content through your AI assistant.

### Local Development

If you're running the CMS locally:
```json
"env": {
  "EELZAP_API_KEY": "cms_secret_your_key",
  "EELZAP_BASE_URL": "http://localhost:5041",
  "EELZAP_PATH_PREFIX": "/api/public/v1"
}
```

## Available Tools

### Sites (1 tool)
| Tool | Description |
|------|-------------|
| `get_site` | Get the current site associated with your API key |

### Collections (5 tools)
| Tool | Description |
|------|-------------|
| `list_collections` | List all collections in the site |
| `get_collection` | Get a collection by ID |
| `create_collection` | Create a new collection |
| `update_collection` | Update a collection's name or key |
| `delete_collection` | Delete a collection and all its items |

### Collection Fields (5 tools)
| Tool | Description |
|------|-------------|
| `list_collection_fields` | List all fields in a collection |
| `create_collection_field` | Add a new field to a collection |
| `update_collection_field` | Update a field's configuration |
| `delete_collection_field` | Remove a field from a collection |
| `reorder_collection_fields` | Change the display order of fields |

### Collection Sections (4 tools)
| Tool | Description |
|------|-------------|
| `list_collection_sections` | List all sections in a collection |
| `create_collection_section` | Create a new section to group fields |
| `update_collection_section` | Update a section's name |
| `delete_collection_section` | Delete a section |

### Items (7 tools)
| Tool | Description |
|------|-------------|
| `list_items` | List items in a collection (with pagination and search) |
| `get_item` | Get a single item by ID |
| `create_item` | Create a new item in a collection |
| `update_item` | Update an item's field values |
| `delete_item` | Delete an item |
| `publish_item` | Publish an item (makes it available via delivery API) |
| `unpublish_item` | Unpublish an item |

### Documents (5 tools)
| Tool | Description |
|------|-------------|
| `list_documents` | List all documents (singletons like homepage, about page) |
| `get_document` | Get a document by ID |
| `create_document` | Create a new document |
| `update_document` | Update a document's name or key |
| `delete_document` | Delete a document |

### Document Fields (5 tools)
| Tool | Description |
|------|-------------|
| `list_document_fields` | List all fields in a document |
| `create_document_field` | Add a new field to a document |
| `update_document_field` | Update a field's configuration |
| `delete_document_field` | Remove a field from a document |
| `reorder_document_fields` | Change the display order of fields |

### Document Sections (4 tools)
| Tool | Description |
|------|-------------|
| `list_document_sections` | List all sections in a document |
| `create_document_section` | Create a new section to group fields |
| `update_document_section` | Update a section's name |
| `delete_document_section` | Delete a section |

### Document Values (2 tools)
| Tool | Description |
|------|-------------|
| `get_document_values` | Get all field values for a document |
| `set_document_values` | Set field values for a document |

### Document Publishing (2 tools)
| Tool | Description |
|------|-------------|
| `publish_document` | Publish a document |
| `unpublish_document` | Unpublish a document |

### Media (7 tools)
| Tool | Description |
|------|-------------|
| `list_media` | List all media assets |
| `get_media` | Get a media asset by ID |
| `upload_media_from_url` | Upload media from a URL |
| `update_media` | Update media metadata (alt text, title) |
| `delete_media` | Delete a media asset |
| `publish_media` | Publish a media asset |
| `unpublish_media` | Unpublish a media asset |

### SEO (4 tools)
| Tool | Description |
|------|-------------|
| `get_item_seo` | Get SEO metadata for a collection item |
| `set_item_seo` | Set SEO metadata for a collection item |
| `get_document_seo` | Get SEO metadata for a document |
| `set_document_seo` | Set SEO metadata for a document |

### Delivery API (5 tools)
| Tool | Description |
|------|-------------|
| `delivery_list_collections` | List published collections (public API) |
| `delivery_get_collection` | Get a published collection (public API) |
| `delivery_list_items` | List published items in a collection (public API) |
| `delivery_get_item` | Get a published item (public API) |
| `delivery_get_document` | Get a published document (public API) |

## What Can You Do?

Once connected, try asking your AI assistant:

### Content Creation
- "Create a blog collection with title, content, author, and featured image fields"
- "Add 5 blog posts about web development best practices"
- "Create an About page document with hero title, description, and team section"

### Content Management
- "List all my collections and their field schemas"
- "Update the hero title on my homepage to 'Build faster with AI'"
- "Publish all draft items in the blog collection"

### Media
- "Upload this image from URL and set it as the featured image for my latest blog post"
- "List all media assets and show me which ones are unpublished"

### SEO
- "Set SEO metadata for all blog posts — generate meta titles and descriptions based on the content"
- "Check which items are missing SEO metadata"

### Site Discovery
- "Show me the structure of my site — all collections, documents, and their fields"
- "What content types do I have? List everything."

### Content Delivery
- "Fetch my published blog posts and show me what the delivery API returns"
- "Check if the homepage document is published and what data it serves"

## Troubleshooting

### "EELZAP_API_KEY is required"
The server can't find your API key. Make sure it's set in the `env` section of your MCP config (all tools, including Codex via `[mcp_servers.eelzap.env]`).

### "Connection refused" or "ECONNREFUSED"
The server can't reach the API. Check:
- Your `EELZAP_BASE_URL` is correct (default: `https://api.eelzap.com`)
- If using local dev, ensure the CMS app is running on the expected port

### "401 Unauthorized"
Your API key is invalid or expired. Generate a new one from the Eel Zap dashboard (Settings > API Keys) and run `eelzap-mcp switch-key`.

### "403 Forbidden"
You're using a public key (`cms_public_`) for a write operation. Switch to a secret key (`cms_secret_`).

### Server not appearing in your tool
- **Claude Code:** Restart Claude Code or run `/mcp` to check server status
- **Cursor:** Restart Cursor; check Settings > Tools & MCP for server status
- **VS Code:** Check the MCP panel; try "MCP: List Servers" from the command palette
- **Codex:** Restart Codex; ensure the TOML config is at `~/.codex/config.toml`
- **Claude Desktop:** Fully quit and reopen Claude Desktop (config changes require restart)

### Tools not loading / "No tools available"
The server starts but tools aren't registered. Run `eelzap-mcp doctor` to diagnose, or check the server logs for errors during startup.

## Development

```bash
git clone https://github.com/8ux-co/eelzap-mcp-server.git
cd eelzap-mcp-server
npm install
npm run build
npm test
```

Run locally during development:
```bash
EELZAP_API_KEY=cms_secret_... npx tsx src/index.ts
```

Test with MCP Inspector:
```bash
EELZAP_API_KEY=cms_secret_... npx @modelcontextprotocol/inspector npx tsx src/index.ts
```
