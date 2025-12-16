import { bangs } from "./bang";
import "./global.css";

// Types
interface IconData {
  light: string;  // Light theme icon URL
  dark: string;   // Dark theme icon URL
}

interface CustomBang {
  t: string;  // trigger
  u: string;  // URL template with {{{s}}}
  s?: string; // service name
  d?: string; // domain or URL for empty queries (e.g., "github.com" or "https://github.com/myOrg")
  icon?: string | IconData; // svgl.app icon - string (legacy) or object with light/dark URLs
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

// Helper to get the correct icon URL based on current theme
function getIconUrl(icon: string | IconData | undefined): string | null {
  if (!icon) return null;
  
  if (typeof icon === 'string') {
    // Legacy format - just a filename
    return `https://svgl.app/library/${icon}.svg`;
  }
  
  // New format with light/dark variants
  const isDarkMode = document.documentElement.classList.contains('dark') || 
    (getTheme() === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return isDarkMode ? icon.dark : icon.light;
}

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
  const customBangs = getCustomBangs();
  const defaultTrigger = getDefaultBangTrigger();
  
  // Find the default/initial bang to display - prefer the user's default bang if it exists in favorites
  const defaultBangMatch = customBangs.find(b => b.t === defaultTrigger);
  const initialBang = defaultBangMatch ?? (customBangs.length > 0 ? customBangs[0] : findBang(defaultTrigger));
  const initialIconUrl = initialBang ? getIconUrl((initialBang as CustomBang).icon) : null;
  
  // Get first 7 favorites with both home URL and icon for shortcuts
  const shortcutBangs = customBangs
    .filter(b => b.d && b.icon)
    .slice(0, 7);
  
  app.innerHTML = `
    <div class="landing-container">
      <main class="landing-main">
        <div class="search-container">
          ${customBangs.length > 0 ? `
          <button class="bang-prefix-btn" id="bang-prefix-btn" data-trigger="${initialBang?.t ?? ''}" title="!${initialBang?.t ?? defaultTrigger}">
            ${initialIconUrl ? `<img src="${initialIconUrl}" alt="!${initialBang?.t ?? ''}" class="bang-prefix-icon" />` : `<span class="bang-prefix-text">!${initialBang?.t ?? defaultTrigger}</span>`}
          </button>
          <div class="bang-selector-dropdown hidden" id="bang-selector-dropdown">
            ${customBangs.map(b => {
              const iconUrl = getIconUrl(b.icon);
              return `
                <div class="bang-selector-item" data-trigger="${b.t}">
                  ${iconUrl ? `<img src="${iconUrl}" alt="" class="bang-selector-item-icon" />` : '<span class="bang-selector-item-icon-placeholder"></span>'}
                  <span class="bang-selector-item-trigger">!${b.t}</span>
                  ${b.s ? `<span class="bang-selector-item-name">${b.s}</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
          ` : ''}
          <input 
            type="text" 
            class="search-input ${customBangs.length > 0 ? 'has-prefix' : ''}"
            placeholder="Search..."
            autofocus
          />
          <div class="autocomplete-dropdown hidden"></div>
        </div>
        ${shortcutBangs.length > 0 ? `
        <div class="shortcuts-row">
          ${shortcutBangs.map(b => {
            const iconUrl = getIconUrl(b.icon);
            const homeUrl = b.d!.startsWith('http') ? b.d : `https://${b.d}`;
            return `<a href="${homeUrl}" class="shortcut-link" title="${b.s ?? b.t}">
              <img src="${iconUrl}" alt="${b.s ?? b.t}" class="shortcut-icon" />
            </a>`;
          }).join('')}
        </div>
        ` : ''}
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

  // Bang selector dropdown (if favorites exist)
  const bangPrefixBtn = app.querySelector<HTMLButtonElement>("#bang-prefix-btn");
  const bangSelectorDropdown = app.querySelector<HTMLDivElement>("#bang-selector-dropdown");
  let selectedBangTrigger = bangPrefixBtn?.dataset.trigger ?? '';

  if (bangPrefixBtn && bangSelectorDropdown) {
    // Toggle dropdown
    bangPrefixBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      bangSelectorDropdown.classList.toggle("hidden");
    });

    // Select a bang from dropdown
    bangSelectorDropdown.querySelectorAll<HTMLDivElement>(".bang-selector-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const trigger = item.dataset.trigger!;
        selectBangFromDropdown(trigger);
        bangSelectorDropdown.classList.add("hidden");
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      bangSelectorDropdown.classList.add("hidden");
    });
  }

  function selectBangFromDropdown(trigger: string) {
    if (!bangPrefixBtn) return;
    
    const bang = customBangs.find(b => b.t === trigger);
    if (!bang) return;

    selectedBangTrigger = trigger;
    bangPrefixBtn.dataset.trigger = trigger;
    bangPrefixBtn.title = `!${trigger}`;
    
    const iconUrl = getIconUrl(bang.icon);
    bangPrefixBtn.innerHTML = iconUrl 
      ? `<img src="${iconUrl}" alt="!${trigger}" class="bang-prefix-icon" />`
      : `<span class="bang-prefix-text">!${trigger}</span>`;

    // Update search input - remove any existing bang
    const currentValue = searchInput.value;
    const cleanedValue = currentValue.replace(/!\S+\s*/gi, '').trim();
    searchInput.value = cleanedValue;
    searchInput.focus();
  }

  function updateBangSelectorFromInput(inputTrigger: string) {
    if (!bangPrefixBtn || !bangSelectorDropdown) return;
    
    const matchingBang = customBangs.find(b => b.t.toLowerCase() === inputTrigger.toLowerCase());
    if (matchingBang && matchingBang.t !== selectedBangTrigger) {
      selectBangFromDropdown(matchingBang.t);
    }
  }

  // Search input with autocomplete
  const searchInput = app.querySelector<HTMLInputElement>(".search-input")!;
  const dropdown = app.querySelector<HTMLDivElement>(".autocomplete-dropdown")!;
  let selectedIndex = -1;

  function updateAutocomplete() {
    const value = searchInput.value;
    const bangMatch = value.match(/!(\S+)/i);
    
    // Check if typed bang matches a favorite and update selector
    if (bangMatch && bangMatch[1]) {
      const typedTrigger = bangMatch[1].toLowerCase();
      updateBangSelectorFromInput(typedTrigger);
    }
    
    // Only show autocomplete for partial bangs at end of input
    const partialMatch = value.match(/!(\S*)$/i);
    if (!partialMatch) {
      dropdown.classList.add("hidden");
      selectedIndex = -1;
      return;
    }

    const partial = partialMatch[1].toLowerCase();
    
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

    dropdown.innerHTML = matches.map((b, i) => {
      const iconUrl = getIconUrl(b.icon);
      const iconHtml = iconUrl ? `<img src="${iconUrl}" alt="" class="autocomplete-icon" />` : '';
      return `
        <div class="autocomplete-item ${i === selectedIndex ? 'selected' : ''}" data-trigger="${b.t}">
          ${iconHtml}
          <span class="autocomplete-bang">!${b.t}</span>
          ${b.s ? `<span class="autocomplete-name">${b.s}</span>` : ''}
        </div>
      `;
    }).join('');

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
      let query = searchInput.value.trim();
      if (query) {
        // If user has a bang prefix and no bang in query, prepend the selected bang
        if (bangPrefixBtn && selectedBangTrigger && !query.match(/!\S+/i)) {
          query = `!${selectedBangTrigger} ${query}`;
        }
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
              customBangs.map(b => {
                const iconUrl = getIconUrl(b.icon);
                const iconHtml = iconUrl ? `<img src="${iconUrl}" alt="" class="custom-bang-icon" />` : '';
                return `
                  <div class="custom-bang-item" data-trigger="${b.t}">
                    <div class="custom-bang-info">
                      ${iconHtml}
                      <div class="custom-bang-details">
                        <div class="custom-bang-header">
                          <strong>!${b.t}</strong>${b.s ? ` <span class="custom-bang-name">— ${b.s}</span>` : ''}
                        </div>
                        <span class="custom-bang-url">${b.u}</span>
                      </div>
                    </div>
                    <div class="custom-bang-actions">
                      <button class="custom-bang-edit" data-trigger="${b.t}" aria-label="Edit">✎</button>
                      <button class="custom-bang-delete" data-trigger="${b.t}" aria-label="Delete">×</button>
                    </div>
                  </div>
                `;
              }).join('')}
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
              <label for="new-bang-domain">Home URL (optional)</label>
              <input type="text" id="new-bang-domain" class="settings-input" placeholder="e.g., github.com or https://github.com/myOrg" />
            </div>
            <div class="form-row">
              <label for="new-bang-icon">Icon (optional)</label>
              <div class="icon-input-container">
                <input type="text" id="new-bang-icon" class="settings-input" placeholder="e.g., github (from svgl.app)" autocomplete="off" />
                <div id="icon-autocomplete" class="icon-autocomplete hidden"></div>
              </div>
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

  // Close modal handlers - refresh main page to show updated favorites
  const closeModal = () => {
    backdrop.remove();
    noSearchDefaultPageRender();
  };
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
    let query = favoritesSearch.value.trim().toLowerCase();
    if (query.length < 2) {
      favoritesResults.classList.add("hidden");
      return;
    }

    // Strip leading ! if present (so "!g" searches for "g")
    if (query.startsWith('!')) {
      query = query.slice(1);
      if (query.length === 0) {
        favoritesResults.classList.add("hidden");
        return;
      }
    }

    // Search built-in bangs with smart ranking
    const allMatches = bangs.filter(b => 
      b.t.toLowerCase().includes(query) ||
      b.s.toLowerCase().includes(query) ||
      (b.d && b.d.toLowerCase().includes(query))
    );

    // Sort by relevance:
    // 1. Exact trigger match
    // 2. Trigger starts with query
    // 3. Service name starts with query
    // 4. Trigger contains query
    // 5. Everything else
    const matches = allMatches.sort((a, b) => {
      const aT = a.t.toLowerCase();
      const bT = b.t.toLowerCase();
      const aS = a.s.toLowerCase();
      const bS = b.s.toLowerCase();

      // Exact trigger match gets highest priority
      if (aT === query && bT !== query) return -1;
      if (bT === query && aT !== query) return 1;

      // Trigger starts with query
      const aStartsT = aT.startsWith(query);
      const bStartsT = bT.startsWith(query);
      if (aStartsT && !bStartsT) return -1;
      if (bStartsT && !aStartsT) return 1;

      // Service name equals query
      if (aS === query && bS !== query) return -1;
      if (bS === query && aS !== query) return 1;

      // Service name starts with query
      const aStartsS = aS.startsWith(query);
      const bStartsS = bS.startsWith(query);
      if (aStartsS && !bStartsS) return -1;
      if (bStartsS && !aStartsS) return 1;

      // Shorter triggers are usually more relevant
      return aT.length - bT.length;
    }).slice(0, 10);

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
          <div class="favorites-result-actions">
            <input 
              type="text" 
              class="favorites-icon-input" 
              data-trigger="${b.t}" 
              placeholder="icon"
              ${isAdded ? 'disabled' : ''}
            />
            <button class="favorites-add-btn" data-trigger="${b.t}" ${isAdded ? 'disabled' : ''}>
              ${isAdded ? '✓' : '+'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    favoritesResults.classList.remove("hidden");

    // Add click handlers for add buttons
    favoritesResults.querySelectorAll<HTMLButtonElement>(".favorites-add-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const trigger = btn.dataset.trigger!;
        const bang = bangs.find(b => b.t === trigger);
        const iconInput = favoritesResults.querySelector<HTMLInputElement>(`.favorites-icon-input[data-trigger="${trigger}"]`);
        const iconName = iconInput?.value.trim().toLowerCase() || undefined;
        if (bang) {
          addCustomBang({
            t: bang.t,
            u: bang.u,
            s: bang.s,
            d: bang.d,
            icon: iconName,
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
  const iconInput = backdrop.querySelector<HTMLInputElement>("#new-bang-icon")!;
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
    iconInput.value = "";
    iconInput.dataset.iconData = "";
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
      // Handle both legacy string format and new IconData format
      if (bang.icon) {
        if (typeof bang.icon === 'string') {
          iconInput.value = bang.icon;
          iconInput.dataset.iconData = '';
        } else {
          // Display light URL filename for reference
          const displayName = bang.icon.light.split('/').pop()?.replace('.svg', '') ?? '';
          iconInput.value = displayName;
          iconInput.dataset.iconData = JSON.stringify(bang.icon);
        }
      } else {
        iconInput.value = '';
        iconInput.dataset.iconData = '';
      }
      addBtn.textContent = "Save Changes";
      cancelBtn.classList.remove("hidden");
      conflictWarning.classList.add("hidden");

      // Scroll form into view
      backdrop.querySelector("#bang-form")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Cancel edit handler
  cancelBtn.addEventListener("click", resetForm);

  // Icon autocomplete
  const iconAutocomplete = backdrop.querySelector<HTMLDivElement>("#icon-autocomplete")!;
  let iconSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  iconInput.addEventListener("input", () => {
    const query = iconInput.value.trim().toLowerCase();
    
    // Clear previous timeout
    if (iconSearchTimeout) {
      clearTimeout(iconSearchTimeout);
    }

    if (query.length < 3) {
      iconAutocomplete.classList.add("hidden");
      return;
    }

    // Debounce API call
    iconSearchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`https://api.svgl.app/?search=${encodeURIComponent(query)}`);
        const results = await response.json();

        if (!Array.isArray(results) || results.length === 0) {
          iconAutocomplete.innerHTML = '<div class="icon-autocomplete-empty">No icons found</div>';
          iconAutocomplete.classList.remove("hidden");
          return;
        }

        iconAutocomplete.innerHTML = results.slice(0, 8).map((icon: { id: number; title: string; route: string | { light: string; dark: string } }) => {
          // route can be a string or an object with light/dark variants
          const isDarkMode = document.documentElement.classList.contains('dark') || 
            (getTheme() === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          
          let lightUrl: string;
          let darkUrl: string;
          let displayFilename: string;
          
          if (typeof icon.route === 'string') {
            lightUrl = icon.route;
            darkUrl = icon.route;
            displayFilename = icon.route.split('/').pop()?.replace('.svg', '') ?? '';
          } else {
            lightUrl = icon.route.light;
            darkUrl = icon.route.dark;
            displayFilename = icon.route.light.split('/').pop()?.replace('.svg', '') ?? '';
          }
          
          // Show preview based on current theme
          const previewUrl = isDarkMode ? darkUrl : lightUrl;
          // Store both URLs as a JSON string for later use
          const iconData = JSON.stringify({ light: lightUrl, dark: darkUrl });
          
          return `
            <div class="icon-autocomplete-item" data-value='${iconData}' data-url="${previewUrl}">
              <img src="${previewUrl}" alt="${icon.title}" class="icon-autocomplete-preview" />
              <span class="icon-autocomplete-name">${icon.title}</span>
              <span class="icon-autocomplete-filename">${displayFilename}</span>
            </div>
          `;
        }).join('');

        iconAutocomplete.classList.remove("hidden");

        // Add click handlers
        iconAutocomplete.querySelectorAll<HTMLDivElement>(".icon-autocomplete-item").forEach(item => {
          item.addEventListener("click", () => {
            // Store the JSON data in the input
            iconInput.value = item.dataset.value ?? '';
            iconInput.dataset.iconData = item.dataset.value ?? '';
            iconAutocomplete.classList.add("hidden");
          });
        });
      } catch (error) {
        console.error('Failed to fetch icons:', error);
        iconAutocomplete.classList.add("hidden");
      }
    }, 300);
  });

  // Hide icon autocomplete when clicking outside
  backdrop.addEventListener("click", (e) => {
    if (!iconInput.contains(e.target as Node) && !iconAutocomplete.contains(e.target as Node)) {
      iconAutocomplete.classList.add("hidden");
    }
  });

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
    
    // Parse icon - check if we have IconData JSON or just a string
    let icon: string | IconData | undefined;
    const iconDataStr = iconInput.dataset.iconData;
    const iconValue = iconInput.value.trim();
    
    if (iconDataStr) {
      try {
        icon = JSON.parse(iconDataStr) as IconData;
      } catch {
        icon = iconValue || undefined;
      }
    } else if (iconValue) {
      icon = iconValue.toLowerCase();
    }

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
      icon: icon,
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
  if (cleanQuery === "") {
    if (!selectedBang?.d) return null;
    // Support both full URLs (starting with http) and plain domains
    return selectedBang.d.startsWith("http") ? selectedBang.d : `https://${selectedBang.d}`;
  }

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
