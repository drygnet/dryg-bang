# Copilot Instructions for Dryg Search

## Project Overview

A client-side bang redirect service running on `search.dryg.net`. Users add `https://search.dryg.net?q=%s` as a browser custom search engine, and this app parses bang commands (e.g., `!g search term`) and redirects instantly without server-side processing.

**Key features:**
- All of DuckDuckGo's bangs built-in
- User-configurable default search engine
- Custom user-defined bangs (stored in localStorage)
- PWA for offline capability

## Architecture

```
src/
├── main.ts    # Entry point: URL parsing, redirect logic, landing page UI, settings modal
├── bang.ts    # ~122k lines of bang definitions (auto-generated from DuckDuckGo)
└── global.css # Styling with Inter font, dark mode, settings button, modal (fullscreen on mobile)
public/
├── clipboard.svg      # Copy icon
├── clipboard-check.svg # Copy success icon
├── search.svg         # Favicon
└── settings.svg       # Settings button icon
```

**Key flow in `main.ts`:**
1. Parse `?q=` query param for bang pattern (`!shortcut`)
2. Look up bang via `findBang()` - checks custom bangs first, then built-in `bangs` array
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
Built-in bangs in `bang.ts` follow this shape:
```typescript
{ c: "Category", d: "domain.com", r: 0, s: "Service Name", sc: "Subcategory", t: "shortcut", u: "https://...{{{s}}}" }
```

Custom bangs use the `CustomBang` interface:
```typescript
interface CustomBang {
  t: string;  // trigger (the bang shortcut without `!`)
  u: string;  // URL template with {{{s}}} as search placeholder
  s?: string; // service name (optional)
  d?: string; // domain for empty queries (optional)
}
```

### localStorage Keys
- `dryg-default-bang` - Default search engine trigger (e.g., `"g"`, `"ddg"`)
- `dryg-custom-bangs` - JSON array of custom bang objects

Custom bangs take priority over built-in bangs when triggers conflict.

### Storage Helper Functions
```typescript
getDefaultBangTrigger(): string     // Get default bang trigger from localStorage
setDefaultBangTrigger(trigger)      // Save default bang trigger
getCustomBangs(): CustomBang[]      // Get all custom bangs
setCustomBangs(bangs)               // Save custom bangs array
addCustomBang(bang)                 // Add/update a custom bang
removeCustomBang(trigger)           // Remove a custom bang by trigger
findBang(trigger)                   // Find bang - custom first, then built-in
getBuiltInBangConflict(trigger)     // Check if trigger conflicts with built-in
```

### URL Encoding
The code replaces `%2F` back to `/` after encoding to support paths like `!ghr+user/repo`.

## Important Conventions

- **No runtime dependencies** - pure vanilla TypeScript for minimal bundle size
- **Client-side only** - all redirect logic runs in browser, no backend
- **`bang.ts` is mostly auto-generated** - don't manually edit; source is DuckDuckGo's bang.js
- **Inline HTML** in `main.ts` for landing page and settings modal - no framework, no templating
- **Settings modal** - centered with backdrop on desktop, fullscreen at `max-width: 640px` for mobile

## Files to Know

| File | Purpose |
|------|---------|
| `src/main.ts` | All application logic: redirect, landing page, storage helpers, settings modal |
| `src/bang.ts` | Bang definitions - treat as data, not code |
| `src/global.css` | Styling including settings button, modal and mobile fullscreen |
| `vite.config.ts` | PWA configuration with manifest |
| `public/*.svg` | UI icons (clipboard, settings, search) |
