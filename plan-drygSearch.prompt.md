## Plan: Rebrand Unduck → Dryg Search with Custom Bangs

Transform the unduck project into "Dryg Search" running on search.dryg.net, adding a modal-based settings UI for choosing default search engine and managing custom bangs—all stored in localStorage, keeping the client-side PWA architecture.

### Steps

1. ✅ **Remove analytics and rebrand HTML** in [index.html](index.html): Delete Plausible script (lines 25-29), change `<title>` to "Dryg Search", update meta description.

2. ✅ **Rebrand landing page** in [src/main.ts](src/main.ts): Update title to "Dryg Search", URL to `search.dryg.net?q=%s`, remove t3.chat/theo footer links, add "Settings" button that opens modal.

3. ✅ **Add storage layer** in [src/main.ts](src/main.ts): Create helpers for `dryg-default-bang` and `dryg-custom-bangs` (array of `{t, u, s?, d?}`), modify `getBangredirectUrl` to check custom bangs first before built-ins.

4. ✅ **Build settings modal UI** in [src/main.ts](src/main.ts): Modal with backdrop on desktop, fullscreen slide-up on mobile. Contains: default search engine dropdown + custom bangs manager. Use existing `bangs.find()` pattern to check for conflicts and show warning (e.g. "Overrides: Google Search") when adding/editing.

5. ✅ **Add modal and settings styles** in [src/global.css](src/global.css): Modal positioning/backdrop, fullscreen at `max-width: 640px` (standard mobile breakpoint, täcker alla iPhones), form styling, warning text for conflict display.

6. ✅ **Update PWA manifest** in [vite.config.ts](vite.config.ts): Expand `VitePWA` config with manifest: name "Dryg Search", short_name "Dryg", theme colors.

7. ✅ **Update package metadata** in [package.json](package.json): Change name to `"dryg-search"`.
