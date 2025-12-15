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
const LS_KEY_THEME = "dryg-theme";

// Theme helpers
type Theme = "system" | "dark";

function getTheme(): Theme {
  const stored = localStorage.getItem(LS_KEY_THEME);
  return stored === "dark" ? "dark" : "system";
}

function setTheme(theme: Theme): void {
  localStorage.setItem(LS_KEY_THEME, theme);
  applyTheme(theme);
}

function applyTheme(theme: Theme): void {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Apply theme on load
applyTheme(getTheme());

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
    <div class="landing-container">
      <main class="landing-main">
        <div class="search-container">
          <input 
            type="text" 
            class="search-input"
            placeholder="Search or type a !bang..."
            autofocus
          />
          <div class="autocomplete-dropdown hidden"></div>
        </div>
      </main>
      <footer class="footer">
        <a href="https://github.com/drygnet/dryg-bang" target="_blank">github</a>
        <span class="footer-separator">·</span>
        <a href="#" id="open-settings-footer">settings</a>
        <span class="footer-separator">·</span>
        <a href="#" id="open-about-footer">about</a>
      </footer>
    </div>
  `;

  // Settings link
  const settingsFooterLink = app.querySelector<HTMLAnchorElement>("#open-settings-footer")!;
  settingsFooterLink.addEventListener("click", (e: Event) => {
    e.preventDefault();
    openSettingsModal();
  });

  // About link
  const aboutFooterLink = app.querySelector<HTMLAnchorElement>("#open-about-footer")!;
  aboutFooterLink.addEventListener("click", (e: Event) => {
    e.preventDefault();
    openAboutModal();
  });

  // Search input with autocomplete
  const searchInput = app.querySelector<HTMLInputElement>(".search-input")!;
  const dropdown = app.querySelector<HTMLDivElement>(".autocomplete-dropdown")!;
  let selectedIndex = -1;

  function updateAutocomplete() {
    const value = searchInput.value;
    const bangMatch = value.match(/!(\S*)$/i);
    
    if (!bangMatch) {
      dropdown.classList.add("hidden");
      selectedIndex = -1;
      return;
    }

    const partial = bangMatch[1].toLowerCase();
    const customBangs = getCustomBangs();
    
    // Filter custom bangs that match the partial
    const matches = customBangs.filter(b => 
      b.t.toLowerCase().startsWith(partial) ||
      (b.s && b.s.toLowerCase().includes(partial))
    ).slice(0, 8); // Limit to 8 suggestions

    if (matches.length === 0) {
      dropdown.classList.add("hidden");
      selectedIndex = -1;
      return;
    }

    dropdown.innerHTML = matches.map((b, i) => `
      <div class="autocomplete-item ${i === selectedIndex ? 'selected' : ''}" data-trigger="${b.t}">
        <span class="autocomplete-bang">!${b.t}</span>
        ${b.s ? `<span class="autocomplete-name">${b.s}</span>` : ''}
      </div>
    `).join('');

    dropdown.classList.remove("hidden");

    // Add click handlers
    dropdown.querySelectorAll<HTMLDivElement>(".autocomplete-item").forEach(item => {
      item.addEventListener("click", () => {
        selectBang(item.dataset.trigger!);
      });
    });
  }

  function selectBang(trigger: string) {
    const value = searchInput.value;
    // Replace the partial bang with the selected one
    searchInput.value = value.replace(/!\S*$/i, `!${trigger} `);
    dropdown.classList.add("hidden");
    selectedIndex = -1;
    searchInput.focus();
  }

  searchInput.addEventListener("input", updateAutocomplete);

  searchInput.addEventListener("keydown", (e: KeyboardEvent) => {
    const items = dropdown.querySelectorAll<HTMLDivElement>(".autocomplete-item");
    
    if (!dropdown.classList.contains("hidden") && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && selectedIndex >= 0)) {
        e.preventDefault();
        const selected = items[selectedIndex];
        if (selected) {
          selectBang(selected.dataset.trigger!);
        }
        return;
      }
      if (e.key === "Escape") {
        dropdown.classList.add("hidden");
        selectedIndex = -1;
        return;
      }
    }

    if (e.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `?q=${encodeURIComponent(query)}`;
      }
    }
  });

  function updateSelection(items: NodeListOf<HTMLDivElement>) {
    items.forEach((item, i) => {
      item.classList.toggle("selected", i === selectedIndex);
    });
  }

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      dropdown.classList.add("hidden");
      selectedIndex = -1;
    }
  });
}

// Popular search engines for the default bang dropdown
const popularBangs = [
  { t: "g", s: "Google" },
  { t: "ddg", s: "DuckDuckGo" },
  { t: "b", s: "Bing" },
  { t: "sp", s: "Startpage" },
  { t: "brave", s: "Brave Search" },
  { t: "ka", s: "Kagi" },
];

function openAboutModal() {
  // Remove existing modal if any
  const existingModal = document.querySelector(".modal-backdrop");
  if (existingModal) existingModal.remove();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>About</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-content">
        <div class="about-content">
          <p class="tagline">A fork of <a href="https://unduck.link" target="_blank">unduck.link</a> with custom bangs.</p>
          <p>Fast client-side bang redirects. Add the URL below as a custom search engine in your browser to enable <a href="https://duckduckgo.com/bang.html" target="_blank">all of DuckDuckGo's bangs</a>.</p>
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
          <p class="feature-text">💡 Add custom bangs for enterprise apps, internal tools, or self-hosted services in <a href="#" id="open-settings-from-about">settings</a>.</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Close modal handlers
  const closeModal = () => backdrop.remove();
  backdrop.querySelector(".modal-close")!.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Copy button
  const copyButton = backdrop.querySelector<HTMLButtonElement>(".copy-button")!;
  const copyIcon = copyButton.querySelector("img")!;
  const urlInput = backdrop.querySelector<HTMLInputElement>(".url-input")!;

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(urlInput.value);
    copyIcon.src = "/clipboard-check.svg";

    setTimeout(() => {
      copyIcon.src = "/clipboard.svg";
    }, 2000);
  });

  // Settings link from about modal
  const settingsLink = backdrop.querySelector<HTMLAnchorElement>("#open-settings-from-about")!;
  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
    openSettingsModal();
  });
}

function openSettingsModal() {
  // Remove existing modal if any
  const existingModal = document.querySelector(".modal-backdrop");
  if (existingModal) existingModal.remove();

  const currentDefault = getDefaultBangTrigger();
  const customBangs = getCustomBangs();
  const currentTheme = getTheme();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-content">
        <section class="settings-section">
          <h3>Theme</h3>
          <p class="settings-description">Choose your preferred appearance.</p>
          <select id="theme-select" class="settings-select">
            <option value="system" ${currentTheme === 'system' ? 'selected' : ''}>Follow system</option>
            <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Always dark</option>
          </select>
        </section>

        <section class="settings-section">
          <h3>Default Search Engine</h3>
          <p class="settings-description">Used when no bang is specified in your search.</p>
          <select id="default-bang-select" class="settings-select">
            ${popularBangs.map(b => `<option value="${b.t}" ${b.t === currentDefault ? 'selected' : ''}>${b.s} (!${b.t})</option>`).join('')}
            <option value="_custom" ${!popularBangs.find(b => b.t === currentDefault) ? 'selected' : ''}>Custom...</option>
          </select>
          <input 
            type="text" 
            id="custom-default-input" 
            class="settings-input ${popularBangs.find(b => b.t === currentDefault) ? 'hidden' : ''}"
            placeholder="Enter bang trigger (e.g., sp)"
            value="${!popularBangs.find(b => b.t === currentDefault) ? currentDefault : ''}"
          />
        </section>

        <section class="settings-section">
          <h3>Favorite Bangs</h3>
          <p class="settings-description">Search and add built-in bangs to your favorites. These appear in autocomplete.</p>
          <div class="favorites-search-container">
            <input 
              type="text" 
              id="favorites-search" 
              class="settings-input"
              placeholder="Search bangs (e.g., github, youtube, wiki...)"
            />
            <div id="favorites-results" class="favorites-results hidden"></div>
          </div>
          <div id="favorites-list" class="custom-bangs-list">
            ${customBangs.filter(b => b.d && !b.u.includes('{{{s}}}')).length === 0 && customBangs.length === 0 ? 
              '<p class="empty-state">No favorites yet. Search above to add some!</p>' : ''}
          </div>
        </section>

        <section class="settings-section">
          <h3>Custom Bangs</h3>
          <p class="settings-description">Create your own bang shortcuts for any site.</p>
          
          <div id="custom-bangs-list" class="custom-bangs-list">
            ${customBangs.length === 0 ? '<p class="empty-state">No custom bangs yet.</p>' : 
              customBangs.map(b => `
                <div class="custom-bang-item" data-trigger="${b.t}">
                  <div class="custom-bang-info">
                    <strong>!${b.t}</strong>${b.s ? ` <span class="custom-bang-name">— ${b.s}</span>` : ''}
                    <span class="custom-bang-url">${b.u}</span>
                  </div>
                  <div class="custom-bang-actions">
                    <button class="custom-bang-edit" data-trigger="${b.t}" aria-label="Edit">✎</button>
                    <button class="custom-bang-delete" data-trigger="${b.t}" aria-label="Delete">×</button>
                  </div>
                </div>
              `).join('')}
          </div>

          <div class="add-bang-form" id="bang-form">
            <h4 id="bang-form-title">Add New Bang</h4>
            <input type="hidden" id="edit-original-trigger" value="" />
            <div class="form-row">
              <label for="new-bang-trigger">Trigger</label>
              <input type="text" id="new-bang-trigger" class="settings-input" placeholder="e.g., mysite" />
            </div>
            <div class="form-row">
              <label for="new-bang-name">Name (optional)</label>
              <input type="text" id="new-bang-name" class="settings-input" placeholder="e.g., My Site Search" />
            </div>
            <div class="form-row">
              <label for="new-bang-url">URL Template</label>
              <input type="text" id="new-bang-url" class="settings-input" placeholder="https://example.com/search?q={{{s}}}" />
            </div>
            <div class="form-row">
              <label for="new-bang-domain">Domain (optional)</label>
              <input type="text" id="new-bang-domain" class="settings-input" placeholder="example.com" />
            </div>
            <div id="bang-conflict-warning" class="conflict-warning hidden"></div>
            <div class="form-buttons">
              <button id="cancel-edit-btn" class="btn-secondary hidden">Cancel</button>
              <button id="add-bang-btn" class="btn-primary">Add Bang</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Close modal handlers
  const closeModal = () => backdrop.remove();
  backdrop.querySelector(".modal-close")!.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Theme select handler
  const themeSelect = backdrop.querySelector<HTMLSelectElement>("#theme-select")!;
  themeSelect.addEventListener("change", () => {
    setTheme(themeSelect.value as Theme);
  });

  // Default bang select handler
  const defaultSelect = backdrop.querySelector<HTMLSelectElement>("#default-bang-select")!;
  const customDefaultInput = backdrop.querySelector<HTMLInputElement>("#custom-default-input")!;
  
  defaultSelect.addEventListener("change", () => {
    if (defaultSelect.value === "_custom") {
      customDefaultInput.classList.remove("hidden");
      customDefaultInput.focus();
    } else {
      customDefaultInput.classList.add("hidden");
      setDefaultBangTrigger(defaultSelect.value);
    }
  });

  customDefaultInput.addEventListener("input", () => {
    const trigger = customDefaultInput.value.trim().toLowerCase();
    if (trigger) {
      setDefaultBangTrigger(trigger);
    }
  });

  // Favorites search
  const favoritesSearch = backdrop.querySelector<HTMLInputElement>("#favorites-search")!;
  const favoritesResults = backdrop.querySelector<HTMLDivElement>("#favorites-results")!;

  favoritesSearch.addEventListener("input", () => {
    const query = favoritesSearch.value.trim().toLowerCase();
    if (query.length < 2) {
      favoritesResults.classList.add("hidden");
      return;
    }

    // Search built-in bangs
    const matches = bangs.filter(b => 
      b.t.toLowerCase().includes(query) ||
      b.s.toLowerCase().includes(query) ||
      (b.d && b.d.toLowerCase().includes(query))
    ).slice(0, 10);

    if (matches.length === 0) {
      favoritesResults.innerHTML = '<div class="favorites-empty">No bangs found</div>';
      favoritesResults.classList.remove("hidden");
      return;
    }

    favoritesResults.innerHTML = matches.map(b => {
      const isAdded = customBangs.some(cb => cb.t === b.t);
      return `
        <div class="favorites-result-item ${isAdded ? 'added' : ''}" data-trigger="${b.t}">
          <div class="favorites-result-info">
            <strong>!${b.t}</strong>
            <span class="favorites-result-name">${b.s}</span>
          </div>
          <button class="favorites-add-btn" data-trigger="${b.t}" ${isAdded ? 'disabled' : ''}>
            ${isAdded ? '✓' : '+'}
          </button>
        </div>
      `;
    }).join('');

    favoritesResults.classList.remove("hidden");

    // Add click handlers for add buttons
    favoritesResults.querySelectorAll<HTMLButtonElement>(".favorites-add-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const trigger = btn.dataset.trigger!;
        const bang = bangs.find(b => b.t === trigger);
        if (bang) {
          addCustomBang({
            t: bang.t,
            u: bang.u,
            s: bang.s,
            d: bang.d,
          });
          // Re-render modal
          closeModal();
          openSettingsModal();
        }
      });
    });
  });

  // Delete custom bang handlers
  backdrop.querySelectorAll<HTMLButtonElement>(".custom-bang-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const trigger = btn.dataset.trigger!;
      removeCustomBang(trigger);
      // Re-render modal
      closeModal();
      openSettingsModal();
    });
  });

  // Add/Edit bang form elements
  const formTitle = backdrop.querySelector<HTMLHeadingElement>("#bang-form-title")!;
  const originalTriggerInput = backdrop.querySelector<HTMLInputElement>("#edit-original-trigger")!;
  const triggerInput = backdrop.querySelector<HTMLInputElement>("#new-bang-trigger")!;
  const nameInput = backdrop.querySelector<HTMLInputElement>("#new-bang-name")!;
  const urlInput = backdrop.querySelector<HTMLInputElement>("#new-bang-url")!;
  const domainInput = backdrop.querySelector<HTMLInputElement>("#new-bang-domain")!;
  const conflictWarning = backdrop.querySelector<HTMLDivElement>("#bang-conflict-warning")!;
  const addBtn = backdrop.querySelector<HTMLButtonElement>("#add-bang-btn")!;
  const cancelBtn = backdrop.querySelector<HTMLButtonElement>("#cancel-edit-btn")!;

  // Reset form to add mode
  function resetForm() {
    formTitle.textContent = "Add New Bang";
    originalTriggerInput.value = "";
    triggerInput.value = "";
    triggerInput.disabled = false;
    nameInput.value = "";
    urlInput.value = "";
    domainInput.value = "";
    addBtn.textContent = "Add Bang";
    cancelBtn.classList.add("hidden");
    conflictWarning.classList.add("hidden");
  }

  // Edit custom bang handlers
  backdrop.querySelectorAll<HTMLButtonElement>(".custom-bang-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const trigger = btn.dataset.trigger!;
      const bang = customBangs.find(b => b.t === trigger);
      if (!bang) return;

      // Switch to edit mode
      formTitle.textContent = "Edit Bang";
      originalTriggerInput.value = bang.t;
      triggerInput.value = bang.t;
      triggerInput.disabled = true; // Can't change trigger when editing
      nameInput.value = bang.s ?? "";
      urlInput.value = bang.u;
      domainInput.value = bang.d ?? "";
      addBtn.textContent = "Save Changes";
      cancelBtn.classList.remove("hidden");
      conflictWarning.classList.add("hidden");

      // Scroll form into view
      backdrop.querySelector("#bang-form")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Cancel edit handler
  cancelBtn.addEventListener("click", resetForm);

  // Check for conflicts when typing trigger
  triggerInput.addEventListener("input", () => {
    const trigger = triggerInput.value.trim().toLowerCase();
    const conflict = getBuiltInBangConflict(trigger);
    if (conflict) {
      conflictWarning.textContent = `⚠️ Overrides: ${conflict.s} (!${conflict.t})`;
      conflictWarning.classList.remove("hidden");
    } else {
      conflictWarning.classList.add("hidden");
    }
  });

  addBtn.addEventListener("click", () => {
    const isEditMode = originalTriggerInput.value !== "";
    const trigger = isEditMode ? originalTriggerInput.value : triggerInput.value.trim().toLowerCase();
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const domain = domainInput.value.trim();

    if (!trigger || !url) {
      alert("Please fill in both trigger and URL template.");
      return;
    }

    if (!url.includes("{{{s}}}")) {
      alert("URL template must include {{{s}}} as the search placeholder.");
      return;
    }

    addCustomBang({
      t: trigger,
      u: url,
      s: name || undefined,
      d: domain || undefined,
    });

    // Re-render modal
    closeModal();
    openSettingsModal();
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
