# Dryg Search

A fork of [unduck.link](https://unduck.link) by [Theo](https://github.com/t3dotgg) — fast client-side bang redirects for your browser.

```
https://search.dryg.net?q=%s
```

Add the URL above as a custom search engine in your browser to enable all of [DuckDuckGo's bangs](https://duckduckgo.com/bang.html), but much faster.

## Why a fork?

This fork adds **custom bangs** and a **configurable default search engine**, which makes it particularly useful for:

- **Enterprise/internal tools** – Create bangs for your company's Jira, Confluence, internal wikis, or any SaaS app with custom domains
- **Self-hosted services** – Point bangs to your own GitLab, Nextcloud, or other self-hosted instances
- **Regional services** – Override built-in bangs for services that have different URLs in your country
- **Personal shortcuts** – Quick access to any searchable site you use frequently

### Example use cases

| Bang | URL Template | Use case |
|------|-------------|----------|
| `!jira` | `https://yourcompany.atlassian.net/browse/{{{s}}}` | Jump to Jira tickets |
| `!wiki` | `https://wiki.internal.company/search?q={{{s}}}` | Search internal wiki |
| `!gl` | `https://gitlab.yourcompany.com/search?search={{{s}}}` | Search self-hosted GitLab |
| `!slack` | `https://yourcompany.slack.com/search/query={{{s}}}` | Search Slack workspace |

## How it works

All redirects happen client-side in your browser. Once loaded, the JavaScript is cached and works offline. No server processing, no tracking, instant redirects.

## Features

- ✅ All 13,000+ DuckDuckGo bangs
- ✅ Custom bangs (stored in localStorage)
- ✅ Configurable default search engine
- ✅ PWA with offline support
- ✅ Dark mode

## Adding Local Icons

The project includes some local SVG icons in `public/icons/` for quick selection when creating custom bangs. To add more:

1. Download SVG icons from [worldvectorlogo.com](https://worldvectorlogo.com) or similar sites
2. Place them in `public/icons/`
3. Add an entry to `src/icons.ts` following the existing format:

```typescript
{
  id: 3,
  title: "Service Name",
  category: "Software",
  route: "/icons/service-name.svg",
  url: "https://service-website.com"
}
```

## Development

```bash
pnpm install
pnpm dev      # Start dev server
pnpm build    # Build for production
```

## Credits

Based on [unduck](https://github.com/t3dotgg/unduck) by Theo. Bang data sourced from DuckDuckGo.
