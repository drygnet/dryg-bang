import { bangs } from "./bang";
import "./global.css";

// Types
interface CustomBang {
  t: string;  // trigger
  u: string;  // URL template with {{{s}}}
  s?: string; // service name
  d?: string; // domain for empty queries
}

// Storage keys
const LS_KEY_DEFAULT_BANG = "dryg-default-bang";
const LS_KEY_CUSTOM_BANGS = "dryg-custom-bangs";

// Storage helpers
function getDefaultBangTrigger(): string {
  return localStorage.getItem(LS_KEY_DEFAULT_BANG) ?? "g";
}

function setDefaultBangTrigger(trigger: string): void {
  localStorage.setItem(LS_KEY_DEFAULT_BANG, trigger);
}

function getCustomBangs(): CustomBang[] {
  try {
    const stored = localStorage.getItem(LS_KEY_CUSTOM_BANGS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setCustomBangs(bangs: CustomBang[]): void {
  localStorage.setItem(LS_KEY_CUSTOM_BANGS, JSON.stringify(bangs));
}

function addCustomBang(bang: CustomBang): void {
  const existing = getCustomBangs();
  // Remove any existing bang with the same trigger
  const filtered = existing.filter((b) => b.t !== bang.t);
  setCustomBangs([...filtered, bang]);
}

function removeCustomBang(trigger: string): void {
  const existing = getCustomBangs();
  setCustomBangs(existing.filter((b) => b.t !== trigger));
}

// Find a bang by trigger - custom bangs take priority
function findBang(trigger: string): CustomBang | typeof bangs[number] | undefined {
  const customBangs = getCustomBangs();
  const customMatch = customBangs.find((b) => b.t === trigger);
  if (customMatch) return customMatch;
  return bangs.find((b) => b.t === trigger);
}

// Check if a trigger conflicts with a built-in bang
function getBuiltInBangConflict(trigger: string): typeof bangs[number] | undefined {
  return bangs.find((b) => b.t === trigger);
}

function noSearchDefaultPageRender() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
      <div class="content-container">
        <h1>Dryg Search</h1>
        <p>DuckDuckGo's bang redirects are too slow. Add the following URL as a custom search engine to your browser. Enables <a href="https://duckduckgo.com/bang.html" target="_blank">all of DuckDuckGo's bangs.</a></p>
        <div class="url-container"> 
          <input 
            type="text" 
            class="url-input"
            value="https://search.dryg.net?q=%s"
            readonly 
          />
          <button class="copy-button">
            <img src="/clipboard.svg" alt="Copy" />
          </button>
        </div>
        <button class="settings-button" id="open-settings">
          <img src="/settings.svg" alt="Settings" />
          Settings
        </button>
      </div>
      <footer class="footer">
        <a href="https://github.com/jblb/dryg-bang" target="_blank">github</a>
      </footer>
    </div>
  `;

  const copyButton = app.querySelector<HTMLButtonElement>(".copy-button")!;
  const copyIcon = copyButton.querySelector("img")!;
  const urlInput = app.querySelector<HTMLInputElement>(".url-input")!;

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(urlInput.value);
    copyIcon.src = "/clipboard-check.svg";

    setTimeout(() => {
      copyIcon.src = "/clipboard.svg";
    }, 2000);
  });
}

// Get default bang object
function getDefaultBang() {
  const trigger = getDefaultBangTrigger();
  return findBang(trigger) ?? bangs.find((b) => b.t === "g");
}

function getBangredirectUrl() {
  const url = new URL(window.location.href);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    noSearchDefaultPageRender();
    return null;
  }

  const match = query.match(/!(\S+)/i);

  const bangCandidate = match?.[1]?.toLowerCase();
  // Use findBang to check custom bangs first, then built-in
  const selectedBang = bangCandidate 
    ? findBang(bangCandidate) ?? getDefaultBang()
    : getDefaultBang();

  // Remove the first bang from the query
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

  // If the query is just `!gh`, use domain instead of search URL
  if (cleanQuery === "")
    return selectedBang?.d ? `https://${selectedBang.d}` : null;

  // Format of the url is:
  // https://www.google.com/search?q={{{s}}}
  const searchUrl = selectedBang?.u.replace(
    "{{{s}}}",
    // Replace %2F with / to fix formats like "!ghr+user/repo"
    encodeURIComponent(cleanQuery).replace(/%2F/g, "/"),
  );
  if (!searchUrl) return null;

  return searchUrl;
}

function doRedirect() {
  const searchUrl = getBangredirectUrl();
  if (!searchUrl) return;
  window.location.replace(searchUrl);
}

doRedirect();
