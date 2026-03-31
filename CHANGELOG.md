# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-03-31

### Added

- Added `list_deleted_collection_fields` tool to list soft-deleted fields in a collection.
- Added `restore_collection_field` tool to restore a soft-deleted collection field.
- Added `list_deleted_document_fields` tool to list soft-deleted fields in a document.
- Added `restore_document_field` tool to restore a soft-deleted document field.

## [0.6.0] - 2026-03-30

### Added

- Added 7 item versioning tools: `list_item_versions`, `get_item_version`, `create_item_draft`, `update_item_draft`, `discard_item_draft`, `publish_item_draft`, `rollback_item_version`.
- Added 7 document versioning tools: `list_document_versions`, `get_document_version`, `create_document_draft`, `update_document_draft`, `discard_document_draft`, `publish_document_draft`, `rollback_document_version`.
- Added `VERSIONING_INSTRUCTIONS` to system prompt guiding LLMs to prefer the safe draft workflow over direct updates.
- Updated `update_item`, `set_document_values`, `publish_item`, and `publish_document` descriptions to reference the versioned alternatives.

## [0.5.2] - 2026-03-26

### Changed

- Document default-locale fallback in SEO tool descriptions.

## [0.5.1] - 2026-03-26

### Changed

- Expand SEO MCP guidance.

## [0.5.0] - 2026-03-25

### Added

- Add codegen hints for schema changes.

## [0.4.0] - 2026-03-24

### Added

- Support structured data in SEO tools.

## [0.3.4] - 2026-03-23

### Changed

- Allow multi-currency field constraints.

## [0.3.3] - 2026-03-22

### Changed

- Support document key updates in MCP tool.

## [0.3.2] - 2026-03-21

### Added

- Add concurrency semaphore and 429 retry to HTTP client.

## [0.3.1] - 2026-03-20

### Fixed

- Use plain input prompt for API key (easier to paste).
- Replace `cms_` prefix with `secret_`/`public_`.

## [0.3.0] - 2026-03-19

### Changed

- Raise test coverage to 95%+.

## [0.2.0] - 2026-03-18

### Added

- Add CLI installer for Claude Code, Cursor, VS Code, Codex, Claude Desktop.
- Add pre-commit hooks and updated docs.

## [0.1.5] - 2026-03-17

### Changed

- Remove `list_sites` tool (API keys are site-scoped).

## [0.1.0] - 2026-03-14

### Added

- Initial release with full CMS management tools.
