# Copilot Instructions for dryg-bang (Unduck)

## Project Overview

A client-side DuckDuckGo bang redirect service. Users add `https://unduck.link?q=%s` as a browser custom search engine, and this app parses bang commands (e.g., `!g search term`) and redirects instantly without server-side processing.

## Architecture

```
src/
├── main.ts    # Entry point: URL parsing, redirect logic, landing page UI
├── bang.ts    # ~122k lines of bang definitions (auto-generated from DuckDuckGo)
└── global.css # Styling with Inter font and dark mode support
```

**Key flow in `main.ts`:**
1. Parse `?q=` query param for bang pattern (`!shortcut`)
2. Look up bang in `bangs` array from `bang.ts`
3. Replace `{{{s}}}` placeholder in URL template with encoded query
4. `window.location.replace()` to redirect (or render landing page if no query)

## Tech Stack & Commands

- **Vite + TypeScript** with strict mode enabled
- **PWA** via `vite-plugin-pwa` for offline caching
- **pnpm** as package manager

```bash
pnpm dev      # Start dev server
pnpm build    # TypeScript check + Vite build
pnpm preview  # Preview production build
```

## Code Patterns

### Bang Data Structure
Each bang in `bang.ts` follows this shape:
```typescript
{ c: "Category", d: "domain.com", r: 0, s: "Service Name", sc: "Subcategory", t: "shortcut", u: "https://...{{{s}}}" }
```
- `t` = trigger (the bang shortcut without `!`)
- `u` = URL template with `{{{s}}}` as search placeholder
- `d` = domain (used for empty queries: `!gh` → `github.com`)

### Default Bang
Stored in localStorage as `default-bang`, defaults to `"g"` (Google). Used when query has no explicit bang.

### URL Encoding
The code replaces `%2F` back to `/` after encoding to support paths like `!ghr+user/repo`.

## Important Conventions

- **No runtime dependencies** - pure vanilla TypeScript for minimal bundle size
- **Client-side only** - all redirect logic runs in browser, no backend
- **`bang.ts` is mostly auto-generated** - don't manually edit; source is DuckDuckGo's bang.js
- **Inline HTML** in `main.ts` for landing page - no framework, no templating

## Files to Know

| File | Purpose |
|------|---------|
| `src/main.ts` | All application logic lives here |
| `src/bang.ts` | Bang definitions - treat as data, not code |
| `vite.config.ts` | PWA configuration |
| `public/*.svg` | UI icons for copy button |
