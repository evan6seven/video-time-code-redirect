// ==UserScript==
// @name         Video Time Code Redirect
// @namespace    https://example.local/video-time-code-redirect
// @version      0.2.0
// @description  Redirect timestamped links on docs.google.com using saved source-to-destination mappings.
// @match        https://docs.google.com/*
// @downloadURL  https://raw.githubusercontent.com/evan6seven/video-time-code-redirect/main/tampermonkey.user.js
// @updateURL    https://raw.githubusercontent.com/evan6seven/video-time-code-redirect/main/tampermonkey.user.js
// @run-at       document-start
// @inject-into  content
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "redirectMappings";
  const ENABLED_KEY = "redirectEnabled";
  const UI_ROOT_ID = "video-time-code-redirect-root";
  const LAUNCHER_ID = "video-time-code-redirect-launcher";
  const TOGGLE_ID = "video-time-code-redirect-toggle";
  const PANEL_ID = "video-time-code-redirect-panel";
  const RESTORE_SHORTCUT = "Alt+Shift+M";
  let listContainer = null;
  let emptyState = null;
  let enabledToggle = null;
  let deleteAllButton = null;
  let isMenuOpen = false;
  let isRedirectEnabled = true;
  let uiRoot = null;

  function isInterceptableClick(event) {
    return (
      event.button === 0 &&
      !event.defaultPrevented &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  function findAnchor(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest("a[href]");
  }

  function parseUrl(rawUrl) {
    try {
      return new URL(rawUrl, window.location.href);
    } catch (error) {
      return null;
    }
  }

  function normalizeUrl(url) {
    const normalized = new URL(url.toString());
    normalized.searchParams.delete("t");
    normalized.hash = "";
    return normalized.toString();
  }

  async function getStoredValue(key, defaultValue) {
    if (typeof GM !== "undefined" && typeof GM.getValue === "function") {
      return GM.getValue(key, defaultValue);
    }

    if (typeof GM_getValue === "function") {
      return GM_getValue(key, defaultValue);
    }

    return defaultValue;
  }

  async function setStoredValue(key, value) {
    if (typeof GM !== "undefined" && typeof GM.setValue === "function") {
      await GM.setValue(key, value);
      return;
    }

    if (typeof GM_setValue === "function") {
      GM_setValue(key, value);
    }
  }

  async function openInNewTab(url) {
    if (typeof GM !== "undefined" && typeof GM.openInTab === "function") {
      await GM.openInTab(url, false);
      return;
    }

    window.open(url, "_blank", "noopener");
  }

  async function getMappings() {
    return getStoredValue(STORAGE_KEY, {});
  }

  async function saveMappings(mappings) {
    await setStoredValue(STORAGE_KEY, mappings);
  }

  async function getEnabledState() {
    return getStoredValue(ENABLED_KEY, true);
  }

  async function saveEnabledState(enabled) {
    await setStoredValue(ENABLED_KEY, enabled);
  }

  function updateEnabledUi() {
    if (enabledToggle) {
      enabledToggle.checked = isRedirectEnabled;
      enabledToggle.title = isRedirectEnabled
        ? "Disable redirects"
        : "Enable redirects";
    }
  }

  async function refreshMappingsList() {
    if (!listContainer || !emptyState) {
      return;
    }

    const mappings = await getMappings();
    const entries = Object.entries(mappings).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    listContainer.textContent = "";
    emptyState.hidden = entries.length > 0;

    if (deleteAllButton) {
      deleteAllButton.disabled = entries.length === 0;
    }

    for (const [source, destination] of entries) {
      const row = document.createElement("div");
      row.className = "vtr-row";

      const textBlock = document.createElement("div");
      textBlock.className = "vtr-text";

      const sourceLabel = document.createElement("div");
      sourceLabel.className = "vtr-source";
      sourceLabel.textContent = source;
      sourceLabel.title = source;

      const destinationLabel = document.createElement("div");
      destinationLabel.className = "vtr-destination";
      destinationLabel.textContent = destination;
      destinationLabel.title = destination;

      const actions = document.createElement("div");
      actions.className = "vtr-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "vtr-action-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        editMapping(source, destination).catch((error) => {
          console.error("Video Time Code Redirect failed to edit mapping:", error);
        });
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "vtr-action-button vtr-delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        deleteMapping(source).catch((error) => {
          console.error("Video Time Code Redirect failed to delete mapping:", error);
        });
      });

      textBlock.append(sourceLabel, destinationLabel);
      actions.append(editButton, deleteButton);
      row.append(textBlock, actions);
      listContainer.append(row);
    }
  }

  async function editMapping(source, destination) {
    const userInput = window.prompt(
      `Update destination URL for:\n${source}`,
      destination
    );

    if (userInput === null) {
      return;
    }

    const parsedDestination = parseUrl(userInput.trim());

    if (!parsedDestination) {
      window.alert("The destination URL is invalid.");
      return;
    }

    const mappings = await getMappings();
    mappings[source] = normalizeUrl(parsedDestination);
    await saveMappings(mappings);
    await refreshMappingsList();
  }

  async function deleteMapping(source) {
    const confirmed = window.confirm(
      `Delete redirect mapping for:\n${source}`
    );

    if (!confirmed) {
      return;
    }

    const mappings = await getMappings();
    delete mappings[source];
    await saveMappings(mappings);
    await refreshMappingsList();
  }

  async function deleteAllMappings() {
    const mappings = await getMappings();
    const entryCount = Object.keys(mappings).length;

    if (entryCount === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete all ${entryCount} saved redirect mapping${entryCount === 1 ? "" : "s"}?`
    );

    if (!confirmed) {
      return;
    }

    await saveMappings({});
    await refreshMappingsList();
  }

  async function ensureMapping(sourceKey) {
    if (!isRedirectEnabled) {
      return null;
    }

    const mappings = await getMappings();
    const existingDestination = mappings[sourceKey];

    if (existingDestination) {
      return existingDestination;
    }

    const userInput = window.prompt(
      "No redirect mapping exists for this link yet.\n\nEnter the destination URL to use for future redirects:"
    );

    if (!userInput) {
      return null;
    }

    const parsedDestination = parseUrl(userInput.trim());

    if (!parsedDestination) {
      window.alert("The destination URL is invalid.");
      return null;
    }

    const destinationKey = normalizeUrl(parsedDestination);
    mappings[sourceKey] = destinationKey;
    await saveMappings(mappings);
    await refreshMappingsList();

    return destinationKey;
  }

  async function redirectLink(originalUrl) {
    if (!isRedirectEnabled) {
      return false;
    }

    const timeCode = originalUrl.searchParams.get("t");

    if (!timeCode) {
      return false;
    }

    const sourceKey = normalizeUrl(originalUrl);
    const destinationUrl = await ensureMapping(sourceKey);

    if (!destinationUrl) {
      return true;
    }

    const finalUrl = new URL(destinationUrl);
    finalUrl.searchParams.set("t", timeCode);
    await openInNewTab(finalUrl.toString());
    return true;
  }

  function showUi() {
    if (!uiRoot) {
      return;
    }

    uiRoot.hidden = false;
  }

  function createStyle() {
    const style = document.createElement("style");
    style.textContent = `
      #${UI_ROOT_ID} {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        font-family: Arial, sans-serif;
        color: #202124;
      }

      .vtr-compact-controls {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      #${LAUNCHER_ID} {
        border: 0;
        border-radius: 999px;
        background: #1a73e8;
        color: #fff;
        width: 44px;
        height: 44px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }

      #${TOGGLE_ID} {
        appearance: none;
        -webkit-appearance: none;
        width: 38px;
        height: 22px;
        margin: 0;
        border: 0;
        border-radius: 999px;
        background: #c4c7c5;
        position: relative;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
        transition: background 120ms ease;
      }

      #${TOGGLE_ID}::before {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        transition: transform 120ms ease;
      }

      #${TOGGLE_ID}:checked {
        background: #1a73e8;
      }

      #${TOGGLE_ID}:checked::before {
        transform: translateX(16px);
      }

      #${PANEL_ID} {
        width: 420px;
        max-height: min(70vh, 640px);
        background: #fff;
        border: 1px solid #dadce0;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }

      #${PANEL_ID}[hidden] {
        display: none;
      }

      .vtr-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid #eceff1;
        gap: 12px;
      }

      .vtr-title {
        font-size: 14px;
        font-weight: 700;
      }

      .vtr-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .vtr-action-button {
        border: 1px solid #dadce0;
        background: #fff;
        color: #202124;
        border-radius: 8px;
        padding: 7px 10px;
        cursor: pointer;
      }

      .vtr-action-button:disabled {
        opacity: 0.55;
        cursor: default;
      }

      .vtr-action-button:hover,
      #${LAUNCHER_ID}:hover {
        filter: brightness(0.97);
      }

      .vtr-content {
        padding: 12px;
        overflow: auto;
        max-height: calc(min(70vh, 640px) - 56px);
      }

      .vtr-empty {
        padding: 24px 12px;
        text-align: center;
        color: #5f6368;
        font-size: 13px;
      }

      .vtr-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
        padding: 12px;
        border: 1px solid #eceff1;
        border-radius: 10px;
      }

      .vtr-row + .vtr-row {
        margin-top: 10px;
      }

      .vtr-text {
        min-width: 0;
      }

      .vtr-source,
      .vtr-destination {
        overflow-wrap: anywhere;
        font-size: 12px;
        line-height: 1.5;
      }

      .vtr-source {
        font-weight: 700;
      }

      .vtr-destination {
        color: #5f6368;
        margin-top: 4px;
      }

      .vtr-actions {
        display: flex;
        gap: 8px;
      }

      .vtr-delete-button {
        color: #b3261e;
      }
    `;
    return style;
  }

  function createUi() {
    if (document.getElementById(UI_ROOT_ID)) {
      return;
    }

    const root = document.createElement("div");
    root.id = UI_ROOT_ID;
    uiRoot = root;

    const compactControls = document.createElement("div");
    compactControls.className = "vtr-compact-controls";

    const launcher = document.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.textContent = "🔀";
    launcher.title = "Open redirect mappings";

    enabledToggle = document.createElement("input");
    enabledToggle.id = TOGGLE_ID;
    enabledToggle.type = "checkbox";

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.hidden = true;

    const header = document.createElement("div");
    header.className = "vtr-header";

    const title = document.createElement("div");
    title.className = "vtr-title";
    title.textContent = "Saved Redirect Mappings";

    const headerActions = document.createElement("div");
    headerActions.className = "vtr-header-actions";

    deleteAllButton = document.createElement("button");
    deleteAllButton.type = "button";
    deleteAllButton.className = "vtr-action-button vtr-delete-button";
    deleteAllButton.textContent = "Delete All";
    deleteAllButton.disabled = true;

    const content = document.createElement("div");
    content.className = "vtr-content";

    emptyState = document.createElement("div");
    emptyState.className = "vtr-empty";
    emptyState.textContent = "No mappings saved yet.";

    listContainer = document.createElement("div");

    compactControls.append(launcher, enabledToggle);
    headerActions.append(deleteAllButton);
    header.append(title, headerActions);
    content.append(emptyState, listContainer);
    panel.append(header, content);
    root.append(createStyle(), compactControls, panel);
    document.documentElement.append(root);

    updateEnabledUi();

    launcher.addEventListener("click", () => {
      isMenuOpen = !isMenuOpen;
      panel.hidden = !isMenuOpen;

      if (isMenuOpen) {
        refreshMappingsList().catch((error) => {
          console.error("Video Time Code Redirect failed to refresh mappings:", error);
        });
      }
    });

    enabledToggle.addEventListener("change", () => {
      isRedirectEnabled = enabledToggle.checked;
      updateEnabledUi();
      saveEnabledState(isRedirectEnabled).catch((error) => {
        console.error("Video Time Code Redirect failed to save enabled state:", error);
      });
    });

    deleteAllButton.addEventListener("click", () => {
      deleteAllMappings().catch((error) => {
        console.error("Video Time Code Redirect failed to delete mappings:", error);
      });
    });
  }

  function ensureUiReady() {
    if (document.body) {
      createUi();
      return;
    }

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        createUi();
      },
      { once: true }
    );
  }

  getEnabledState()
    .then((enabled) => {
      isRedirectEnabled = enabled;
      updateEnabledUi();
    })
    .catch((error) => {
      console.error("Video Time Code Redirect failed to load enabled state:", error);
    });
  ensureUiReady();

  document.addEventListener("keydown", (event) => {
    if (
      event.altKey &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key.toLowerCase() === "m"
    ) {
      showUi();
    }
  });

  document.addEventListener(
    "click",
    async (event) => {
      if (!isInterceptableClick(event)) {
        return;
      }

      const anchor = findAnchor(event.target);

      if (!anchor || anchor.closest(`#${UI_ROOT_ID}`)) {
        return;
      }

      const originalUrl = parseUrl(anchor.href);

      if (
        !isRedirectEnabled ||
        !originalUrl ||
        !originalUrl.searchParams.has("t")
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        await redirectLink(originalUrl);
      } catch (error) {
        console.error("Video Time Code Redirect failed:", error);
        await openInNewTab(originalUrl.toString());
      }
    },
    true
  );
})();
