# Architecture

Laputa is a personal knowledge and life management desktop app. It reads a vault of markdown files with YAML frontmatter and presents them in a four-panel UI inspired by Bear Notes.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri v2 | 2.10.0 |
| Frontend | React + TypeScript | React 19, TS 5.9 |
| Editor | BlockNote | 0.46.2 |
| Styling | Tailwind CSS v4 + CSS variables | 4.1.18 |
| UI primitives | Radix UI + shadcn/ui | - |
| Icons | Phosphor Icons + Lucide | - |
| Build | Vite | 7.3.1 |
| Backend language | Rust (edition 2021) | 1.77.2 |
| Frontmatter parsing | gray_matter | 0.2 |
| AI | Anthropic Claude API (Haiku 3.5 default) | - |
| MCP | @modelcontextprotocol/sdk | 1.0 |
| Tests | Vitest (unit), Playwright (E2E), cargo test (Rust) | - |
| Package manager | pnpm | - |

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri v2 Window                        │
│                                                             │
│  ┌─────────────────── React Frontend ───────────────────┐   │
│  │                                                      │   │
│  │  App.tsx (orchestrator)                               │   │
│  │    ├── Sidebar         (navigation + filters)        │   │
│  │    ├── NoteList         (filtered note list)          │   │
│  │    ├── Editor           (BlockNote + tabs + diff)     │   │
│  │    │     ├── Inspector  (metadata + relationships)    │   │
│  │    │     └── AIChatPanel (AI assistant + context)     │   │
│  │    ├── StatusBar        (footer info)                 │   │
│  │    └── Modals (QuickOpen, CreateNote, CommitDialog)  │   │
│  │                                                      │   │
│  └──────────────┬──────────┬──────────────────────────┘   │
│                 │          │                               │
│        Tauri IPC│     Vite Proxy / WS                     │
│  ┌──────────────▼────┐ ┌──▼───────────────────────────┐   │
│  │   Rust Backend    │ │   External Services          │   │
│  │  lib.rs → 10 cmds │ │  Anthropic API (Claude)      │   │
│  │  vault/           │ │  MCP Server (ws://9710)      │   │
│  │  frontmatter.rs   │ │                              │   │
│  │  git.rs           │ └──────────────────────────────┘   │
│  │  ai_chat.rs       │                                    │
│  └───────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

## Four-Panel Layout

```
┌────────┬─────────────┬─────────────────────────┬────────────┐
│Sidebar │ Note List   │ Editor                  │ Inspector  │
│(250px) │ (300px)     │ (flex-1)                │ (280px)    │
│        │             │                         │ OR         │
│ All    │ [Search]    │ [Tab Bar]               │ AI Chat    │
│ Favs   │ [Type Pill] │ [Breadcrumb Bar]        │            │
│        │             │                         │ Context    │
│Projects│ Note 1      │ # My Note               │ Messages   │
│Experim.│ Note 2      │                         │ Actions    │
│Respons.│ Note 3      │ Content here...         │ Input      │
│Procedu.│ ...         │                         │            │
│People  │             │                         │            │
│Events  │             │                         │            │
│Topics  │             │                         │            │
├────────┴─────────────┴─────────────────────────┴────────────┤
│ StatusBar: v0.4.2 │ main │ Synced 2m ago        1,247 notes│
└─────────────────────────────────────────────────────────────┘
```

- **Sidebar** (150-400px, resizable): Top-level filters (All Notes, Favorites) and collapsible section groups (Projects, Experiments, Responsibilities, etc.)
- **Note List** (200-500px, resizable): Filtered list of notes matching the sidebar selection. Shows snippets, modified dates, and relationship groups. The flat list view (All Notes, type sections, etc.) uses **react-virtuoso** for virtual rendering — only visible items are in the DOM, enabling smooth scrolling with 9000+ notes. Entity/relationship views are not virtualized (groups are small).
- **Editor** (flex, fills remaining space): Tab bar, breadcrumb bar with word count and modified indicator, BlockNote editor with wikilink support. Can toggle to diff view for modified files.
- **Inspector / AI Chat** (200-500px or 40px collapsed): Toggles between Inspector (frontmatter, relationships, backlinks, git history) and AI Chat panel. The Sparkle icon in the breadcrumb bar toggles between them.

Panels are separated by `ResizeHandle` components that support drag-to-resize.

## AI Chat System

### Architecture

The AI chat feature has three layers:

1. **Frontend** (`AIChatPanel` + `useAIChat` hook) — UI and state management
2. **API Proxy** (Vite middleware in dev, Rust `ai_chat` command in Tauri) — routes to Anthropic
3. **MCP Server** (`mcp-server/`) — vault operation tools for AI assistants

### Data Flow

```
User types message in AIChatPanel
  → useAIChat.sendMessage(text)
    → buildSystemPrompt(contextNotes, allContent, model)
      → Assembles selected notes as system context
      → Estimates tokens, truncates if needed
    → streamChat(messages, systemPrompt, model, callbacks)
      → POST /api/ai/chat (Vite proxy → Anthropic API)
      → SSE stream parsed, chunks dispatched to onChunk callback
      → UI updates in real-time as tokens arrive
    → On completion: message added to conversation history
```

### Context Picker

The context picker controls which notes are sent to the AI as context:

- **Current note** is auto-added when the panel opens
- **Add button** opens a search dropdown to select additional notes
- **Token estimation** shows approximate context size (~4 chars/token)
- **Truncation** kicks in when context exceeds 60% of model limit (108k tokens)
- Context pills show selected notes with remove buttons

### API Key Management

- Stored in `localStorage` under key `laputa:anthropic-api-key`
- Configurable via the key icon in the AI Chat header
- When no key is set, falls back to mock responses for testing

### Models

| Model | ID | Use case |
|-------|----|----------|
| Haiku 3.5 | `claude-3-5-haiku-20241022` | Fast, cheap — default |
| Sonnet 4 | `claude-sonnet-4-20250514` | Balanced |
| Opus 4 | `claude-opus-4-20250514` | Most capable |

### MCP Server

The MCP server (`mcp-server/`) exposes vault operations as tools:

| Tool | Description |
|------|-------------|
| `open_note` | Open and read a note by path |
| `read_note` | Read note content (alias) |
| `create_note` | Create new note with frontmatter |
| `search_notes` | Search by title or content |
| `append_to_note` | Append text to a note |

**Transports:**
- **stdio** — standard MCP transport (`node mcp-server/index.js`)
- **WebSocket** — live bridge for app integration (`node mcp-server/ws-bridge.js`, port 9710)

### WebSocket Bridge

The WebSocket bridge (`useMcpBridge` hook) enables real-time vault operations from the frontend:

```
Frontend (useMcpBridge) ←→ ws://localhost:9710 ←→ ws-bridge.js ←→ vault.js
```

Protocol: JSON-RPC-like with `{id, tool, args}` requests and `{id, result}` responses.

### Rust Backend (Tauri)

The `ai_chat` Tauri command (`src-tauri/src/ai_chat.rs`) provides a non-streaming alternative:
- Uses `reqwest` to call the Anthropic Messages API directly
- API key from `ANTHROPIC_API_KEY` environment variable
- Returns full response (not streamed)
- Used in production Tauri builds where Vite proxy is unavailable

### Files

| File | Purpose |
|------|---------|
| `src/components/AIChatPanel.tsx` | Main UI: context bar, messages, input, quick actions |
| `src/hooks/useAIChat.ts` | Chat state: messages, streaming, send/retry/clear |
| `src/hooks/useMcpBridge.ts` | WebSocket client for MCP vault tool calls |
| `src/utils/ai-chat.ts` | API client, token estimation, context builder |
| `src-tauri/src/ai_chat.rs` | Rust Anthropic API client (non-streaming) |
| `mcp-server/index.js` | MCP server entry (stdio transport) |
| `mcp-server/vault.js` | Vault file operations |
| `mcp-server/ws-bridge.js` | WebSocket bridge server |

## Data Flow

### Startup Sequence

```
1. App mounts
2. useVaultLoader fires:
   a. isTauri() ? invoke('list_vault') : mockInvoke('list_vault')
      → VaultEntry[] stored in state
   b. Load all content (mock mode) or on-demand (Tauri mode)
   c. invoke('get_modified_files') → ModifiedFile[] stored in state
3. User clicks note in NoteList
4. useNoteActions.handleSelectNote:
   a. invoke('get_note_content') → raw markdown string
   b. Add tab { entry, content } to tabs state
   c. Set activeTabPath
5. Editor renders BlockNoteTab:
   a. splitFrontmatter(content) → [yaml, body]
   b. preProcessWikilinks(body) → replaces [[target]] with tokens
   c. editor.tryParseMarkdownToBlocks(preprocessed)
   d. injectWikilinks(blocks) → replaces tokens with wikilink nodes
   e. editor.replaceBlocks()
6. Inspector renders frontmatter parsed from content
```

### Frontmatter Edit Flow

```
User edits property in Inspector
  → handleUpdateFrontmatter(path, key, value)
    → Tauri: invoke('update_frontmatter') → Rust reads file, modifies YAML, writes back
    → Mock: updateMockFrontmatter() → client-side YAML manipulation
  → Update tab content in state
  → Update allContent for backlink recalculation
  → Toast: "Property updated"
```

### Git Flow

```
User clicks Commit button → CommitDialog opens
  → handleCommitPush(message)
    → invoke('git_commit') → git add -A && git commit -m "..."
    → invoke('git_push') → git push
    → Reload modified files
    → Toast: "Committed and pushed"
```

## Vault Module Structure

The vault backend (`src-tauri/src/vault/`) is split into focused submodules:

| File | Purpose | CodeScene Health |
|------|---------|-----------------|
| `mod.rs` | Core types (`VaultEntry`, `Frontmatter`), `parse_md_file`, `scan_vault`, relationship extraction | 10.0 |
| `parsing.rs` | Text processing: snippet extraction, markdown stripping, ISO date parsing, `extract_title` | 9.68 |
| `cache.rs` | Git-based incremental vault caching (`scan_vault_cached`), git helpers | 9.68 |
| `trash.rs` | `purge_trash` — deletes trashed notes older than 30 days | 9.38 |
| `rename.rs` | `rename_note` — renames files and updates wikilinks across the vault | 9.68 |
| `image.rs` | `save_image` — saves base64-encoded attachments with sanitized filenames | 10.0 |

Public API (re-exported from `mod.rs`): `scan_vault_cached`, `save_image`, `rename_note`, `RenameResult`, `purge_trash`, `get_note_content`, `parse_md_file`, `VaultEntry`.

## Tauri IPC Commands

All commands are defined in `src-tauri/src/lib.rs` and registered via `tauri::generate_handler![]`.

| Command | Params | Returns | Backend function |
|---------|--------|---------|-----------------|
| `list_vault` | `path` | `Vec<VaultEntry>` | `vault::scan_vault()` |
| `get_note_content` | `path` | `String` | `vault::get_note_content()` |
| `update_frontmatter` | `path, key, value` | `String` (updated content) | `frontmatter::with_frontmatter()` |
| `delete_frontmatter_property` | `path, key` | `String` (updated content) | `frontmatter::with_frontmatter()` |
| `get_file_history` | `vault_path, path` | `Vec<GitCommit>` | `git::get_file_history()` |
| `get_modified_files` | `vault_path` | `Vec<ModifiedFile>` | `git::get_modified_files()` |
| `get_file_diff` | `vault_path, path` | `String` (unified diff) | `git::get_file_diff()` |
| `git_commit` | `vault_path, message` | `String` | `git::git_commit()` |
| `git_push` | `vault_path` | `String` | `git::git_push()` |
| `ai_chat` | `request: AiChatRequest` | `AiChatResponse` | `ai_chat::send_chat()` |

All commands return `Result<T, String>`. Errors are serialized as JSON error objects to the frontend.

## Mock Layer

When running outside Tauri (browser at `localhost:5201`), `src/mock-tauri.ts` provides a transparent mock layer:

```typescript
// In hooks, the pattern is always:
if (isTauri()) {
  result = await invoke<T>('command_name', { args })
} else {
  result = await mockInvoke<T>('command_name', { args })
}
```

The mock layer includes:
- **15 sample entries** across all entity types (Project, Responsibility, Procedure, Experiment, Note, Person, Event, Topic, Essay)
- **Full markdown content** with realistic frontmatter for each entry
- **Mock git history, modified files, and diff output**
- **Mock AI chat responses** with context-aware answers (summarize, expand, grammar)
- `addMockEntry()` and `updateMockContent()` for runtime updates

This means the entire UI can be developed and tested in Chrome without the Rust backend.

## State Management

No Redux or global context. State lives in the root `App.tsx` and custom hooks:

| State owner | State | Purpose |
|-------------|-------|---------|
| `App.tsx` | `selection`, panel widths, dialog visibility, toast, `showAIChat` | UI state |
| `useVaultLoader` | `entries`, `allContent`, `modifiedFiles` | Vault data |
| `useNoteActions` | `tabs`, `activeTabPath` | Open tabs and note operations |
| `useAIChat` | `messages`, `isStreaming`, `streamingContent` | AI conversation state |
| `useMcpBridge` | `connected`, tool methods | MCP WebSocket connection |

Data flows unidirectionally: `App` passes data and callbacks as props to child components. No child-to-child communication — everything goes through `App`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+P | Open Quick Open palette |
| Cmd+N | Open Create Note dialog |
| Cmd+S | Show "Saved" toast |
| Cmd+W | Close active tab |
| `[[` in editor | Open wikilink suggestion menu |

## Auto-Release & In-App Updates

### Release Pipeline

Every push to `main` triggers `.github/workflows/release.yml`:

```
push to main
  → version job: compute 0.YYYYMMDD.RUN_NUMBER
  → build job (matrix: aarch64 + x86_64):
      → pnpm install, stamp version, pnpm build, tauri build --target <arch>
      → upload .app, .tar.gz + .sig, .dmg as artifacts
  → release job:
      → download both arch artifacts
      → lipo aarch64 + x86_64 → universal binary
      → create universal .dmg + signed updater tarball
      → generate latest.json (per-arch + universal platform entries)
      → publish GitHub Release with all assets + auto-generated notes
  → pages job:
      → fetch all releases via gh api
      → build static HTML release history page
      → deploy to gh-pages via peaceiris/actions-gh-pages
```

### Versioning

Format: `0.YYYYMMDD.GITHUB_RUN_NUMBER` (e.g. `0.20260223.42`). The `0.` prefix keeps it SemVer-compatible while making it clear these are date-based auto-releases. The version is stamped into both `tauri.conf.json` and `Cargo.toml` dynamically in the workflow.

### Universal Binary

macOS builds produce both `aarch64-apple-darwin` and `x86_64-apple-darwin` in parallel. The release job merges them with `lipo` — copying the arm64 `.app` as the base and replacing only the main executable with a universal fat binary. The per-arch updater tarballs are also uploaded so the Tauri updater downloads only the relevant architecture (smaller download).

### Updater Endpoint

The Tauri updater plugin is configured to fetch:
```
https://github.com/refactoringhq/laputa-app/releases/latest/download/latest.json
```

This JSON manifest contains `version`, `pub_date`, `notes`, and per-platform entries (`darwin-aarch64`, `darwin-x86_64`) with `url` and `signature` fields. The updater compares the manifest version against the running app version, downloads the matching platform artifact, verifies the signature, and installs it.

### In-App Update UI

```
App startup (3s delay)
  → useUpdater.check()
    → idle (no update) → no UI shown
    → available → UpdateBanner: "Laputa X.Y.Z is available" + Release Notes + Update Now + X
      → user clicks Update Now → downloading → progress bar
        → download complete → ready → "Restart to apply" + Restart Now button
          → user clicks Restart → relaunch()
    → network error / 404 → fail silently, no UI
```

| Component | File | Purpose |
|-----------|------|---------|
| `useUpdater` | `src/hooks/useUpdater.ts` | State machine: idle → available → downloading → ready → error |
| `UpdateBanner` | `src/components/UpdateBanner.tsx` | Top-of-app notification bar |
| `restartApp` | `src/hooks/useUpdater.ts` | Calls `@tauri-apps/plugin-process` relaunch |

### GitHub Pages

Release history site at `https://refactoringhq.github.io/laputa-app/`. Auto-updated by the workflow after each release. The page loads `releases.json` (deployed alongside) and renders each release with date, notes, and `.dmg` download links. Linked from the in-app "Release Notes" button.
