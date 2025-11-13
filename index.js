/**
 * LU-ChromaButton Plugin
 * Creates a fake chroma button to replace the hidden official one
 * and implements the chroma selection panel
 */
(function createFakeChromaButton() {
  const LOG_PREFIX = "[LU-ChromaButton]";
  const BUTTON_CLASS = "lu-chroma-button";
  const BUTTON_SELECTOR = `.${BUTTON_CLASS}`;
  const PANEL_CLASS = "lu-chroma-panel";
  const PANEL_ID = "lu-chroma-panel-container";
  const SKIN_SELECTORS = [
    ".skin-name-text", // Classic Champ Select
    ".skin-name", // Swiftplay lobby
  ];

  const CSS_RULES = `
    .${BUTTON_CLASS} {
      pointer-events: auto;
      -webkit-user-select: none;
      list-style-type: none;
      cursor: pointer;
      display: block !important;
      bottom: 0;
      height: 25px;
      left: 50%;
      position: absolute;
      transform: translateX(-50%) translateY(50%);
      width: 25px;
      z-index: 10;
    }

    .${BUTTON_CLASS} .outer-mask {
      pointer-events: auto;
      -webkit-user-select: none;
      list-style-type: none;
      cursor: pointer;
      border-radius: 50%;
      box-shadow: 0 0 4px 1px rgba(1,10,19,.25);
      box-sizing: border-box;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    .${BUTTON_CLASS} .frame-color {
      pointer-events: auto;
      -webkit-user-select: none;
      list-style-type: none;
      cursor: pointer;
      background-image: linear-gradient(0deg,#695625 0,#a9852d 23%,#b88d35 93%,#c8aa6e);
      box-sizing: border-box;
      height: 100%;
      overflow: hidden;
      width: 100%;
      padding: 2px;
    }

    .${BUTTON_CLASS} .content {
      pointer-events: auto;
      -webkit-user-select: none;
      list-style-type: none;
      cursor: pointer;
      display: block;
      background: url(/fe/lol-champ-select/images/config/button-chroma.png) no-repeat;
      background-size: contain;
      border: 2px solid #010a13;
      border-radius: 50%;
      height: 16px;
      margin: 1px;
      width: 16px;
    }

    .${BUTTON_CLASS} .inner-mask {
      -webkit-user-select: none;
      list-style-type: none;
      cursor: default;
      border-radius: 50%;
      box-sizing: border-box;
      overflow: hidden;
      pointer-events: none;
      position: absolute;
      box-shadow: inset 0 0 4px 4px rgba(0,0,0,.75);
      width: calc(100% - 4px);
      height: calc(100% - 4px);
      left: 2px;
      top: 2px;
    }

    .thumbnail-wrapper .${BUTTON_CLASS} {
      direction: ltr;
      background: url(/fe/lol-static-assets/images/skin-viewer/icon-chroma-default.png) 0 0 no-repeat;
      background-size: contain;
      cursor: pointer;
      height: 28px;
      width: 28px;
    }

    .thumbnail-wrapper .${BUTTON_CLASS} .outer-mask {
      display: none;
    }

    .chroma.icon {
      display: none !important;
    }

    .${PANEL_CLASS} {
      position: fixed;
      z-index: 10000;
      pointer-events: all;
      -webkit-user-select: none;
    }

    .${PANEL_CLASS} .chroma-modal {
      background: #000;
      display: flex;
      flex-direction: column;
      width: 305px;
      position: relative;
    }
    
    .${PANEL_CLASS} .chroma-modal.chroma-view {
      max-height: 420px;
      min-height: 355px;
    }
    
    .${PANEL_CLASS} .flyout {
      position: absolute;
      overflow: visible;
      pointer-events: all;
      -webkit-user-select: none;
    }
    
    .${PANEL_CLASS} .flyout-frame {
      position: relative;
      transition: 250ms all cubic-bezier(0.02, 0.85, 0.08, 0.99);
    }
    
    .${PANEL_CLASS} .border {
      position: absolute;
      box-sizing: border-box;
      background-color: #010a13;
      box-shadow: 0 0 0 1px rgba(1,10,19,0.48);
      transition: 250ms all cubic-bezier(0.02, 0.85, 0.08, 0.99);
      border: 2px solid transparent;
      border-image: linear-gradient(to top, #785a28 0, #463714 50%, #463714 100%) 1 stretch;
      width: 100%;
      height: 100%;
      visibility: visible;
    }
    
    .${PANEL_CLASS} .lc-flyout-content {
      position: relative;
    }

    .${PANEL_CLASS} .chroma-information {
      background-size: cover;
      border-bottom: thin solid #463714;
      flex-grow: 1;
      height: 315px;
      position: relative;
      width: 100%;
    }

    .${PANEL_CLASS} .chroma-information-image {
      background-repeat: no-repeat;
      background-size: contain;
      bottom: 0;
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
    }

    .${PANEL_CLASS} .child-skin-name {
      bottom: 10px;
      color: #f7f0de;
      font-family: "LoL Display", "Times New Roman", Times, Baskerville, Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      position: absolute;
      text-align: center;
      width: 100%;
    }

    .${PANEL_CLASS} .chroma-selection {
      pointer-events: all;
      height: 100%;
      overflow: auto;
      transform: translateZ(0);
      -webkit-mask-box-image-source: url("/fe/lol-static-assets/images/uikit/scrollable/scrollable-content-gradient-mask-bottom.png");
      -webkit-mask-box-image-slice: 0 8 18 0 fill;
      align-items: center;
      display: flex;
      flex-direction: row;
      flex-grow: 0;
      flex-wrap: wrap;
      justify-content: center;
      max-height: 92px;
      min-height: 40px;
      padding: 7px 0;
      width: 100%;
    }

    .${PANEL_CLASS} .chroma-skin-button {
      pointer-events: all;
      align-items: center;
      border-radius: 50%;
      box-shadow: 0 0 2px #010a13;
      display: flex;
      height: 26px;
      justify-content: center;
      width: 26px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .${PANEL_CLASS} .chroma-skin-button:hover {
      transform: scale(1.1);
    }

    .${PANEL_CLASS} .chroma-skin-button.selected {
      background: linear-gradient(180deg,#c89b3c 0,#916c30 33%,#c89b3c 75%,#cdbe91);
      color: #c89b3c;
    }

    .${PANEL_CLASS} .chroma-skin-button.locked {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(100%);
    }

    .${PANEL_CLASS} .chroma-skin-button .contents {
      align-items: center;
      background: linear-gradient(135deg, #f0e6d2, #f0e6d2 48%, #be1e37 0, #be1e37 52%, #f0e6d2 0, #f0e6d2);
      border: 2px solid #010a13;
      border-radius: 50%;
      display: flex;
      height: 18px;
      justify-content: center;
      width: 18px;
    }
    
    .${PANEL_CLASS} .chroma-skin-button.locked {
      background: url(/fe/lol-champ-select/images/config/skin-carousel-locked.png) no-repeat;
      background-size: contain;
      cursor: pointer;
      pointer-events: all;
    }
    
    .${PANEL_CLASS} .chroma-skin-button.locked:hover:not([purchase-disabled]) {
      background-image: url(/fe/lol-champ-select/images/config/skin-carousel-locked-hover.png);
    }
    
    .${PANEL_CLASS} .chroma-skin-button.locked.purchase-disabled {
      background-image: url(/fe/lol-champ-select/images/config/skin-carousel-locked-inactive.png);
      pointer-events: none;
    }
  `;

  const log = {
    info: (msg, extra) => console.info(`${LOG_PREFIX} ${msg}`, extra ?? ""),
    warn: (msg, extra) => console.warn(`${LOG_PREFIX} ${msg}`, extra ?? ""),
    debug: (msg, extra) => console.debug(`${LOG_PREFIX} ${msg}`, extra ?? ""),
  };

  function injectCSS() {
    const styleId = "lu-chroma-button-css";
    if (document.getElementById(styleId)) {
      return;
    }

    const styleTag = document.createElement("style");
    styleTag.id = styleId;
    styleTag.textContent = CSS_RULES;
    document.head.appendChild(styleTag);
    log.debug("injected CSS rules");
  }

  function createFakeButton() {
    const button = document.createElement("div");
    button.className = BUTTON_CLASS;

    const outerMask = document.createElement("div");
    outerMask.className = "outer-mask interactive";

    const frameColor = document.createElement("div");
    frameColor.className = "frame-color";
    frameColor.style.padding = "2px";

    const content = document.createElement("div");
    content.className = "content";
    content.style.background = "";

    const innerMask = document.createElement("div");
    innerMask.className = "inner-mask inner-shadow";
    innerMask.style.width = "calc(100% - 4px)";
    innerMask.style.height = "calc(100% - 4px)";
    innerMask.style.left = "2px";
    innerMask.style.top = "2px";

    frameColor.appendChild(content);
    frameColor.appendChild(innerMask);
    outerMask.appendChild(frameColor);
    button.appendChild(outerMask);

    // Add click handler to open chroma panel
    const handleClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      log.debug("Chroma button clicked");
      const skinItem = button.closest(
        ".skin-selection-item, .thumbnail-wrapper"
      );
      if (skinItem) {
        // Check if this skin has offset 2
        const offset = getSkinOffset(skinItem);
        log.debug("Skin offset:", offset);

        if (offset === 2) {
          log.debug("Found skin item with offset 2, opening panel");
          toggleChromaPanel(button, skinItem);
        } else {
          log.debug(`Skin offset is ${offset}, not 2. Panel will not open.`);
        }
      } else {
        log.warn("Could not find skin item for chroma button");
      }
    };

    button.addEventListener("click", handleClick);
    button.addEventListener("mousedown", (e) => {
      // Also handle mousedown as fallback
      e.stopPropagation();
    });

    return button;
  }

  function isSwiftplayMode() {
    // Check if game mode is Swiftplay
    try {
      if (window.Ember) {
        const championSelectEl = document.querySelector(".champion-select");
        if (championSelectEl) {
          if (window.Ember.getOwner) {
            const application = window.Ember.getOwner(championSelectEl);
            if (application) {
              const rootComponent = application.lookup(
                "component:champion-select"
              );
              if (rootComponent) {
                const gameMode = rootComponent.get("gameMode");
                if (
                  gameMode &&
                  (gameMode.toLowerCase().includes("swiftplay") ||
                    gameMode === "SWIFTPLAY")
                ) {
                  return true;
                }
              }
            }
          }

          // Try accessing via __ember_view__
          const emberView =
            championSelectEl.__ember_view__ || championSelectEl._view;
          if (emberView) {
            const context = emberView.context || emberView._context;
            if (context) {
              const gameMode =
                context.gameMode ||
                (context.gameflow &&
                  context.gameflow.gameData &&
                  context.gameflow.gameData.queue &&
                  context.gameflow.gameData.queue.gameMode);
              if (
                gameMode &&
                (gameMode.toLowerCase().includes("swiftplay") ||
                  gameMode === "SWIFTPLAY")
              ) {
                return true;
              }
            }
          }
        }
      }
    } catch (e) {
      // Silently fail
    }
    return false;
  }

  function isSessionInitialized() {
    // Check if champ-select-init has completed by checking for session data
    try {
      // Check if session timer exists (indicates session is initialized)
      const timer = document.querySelector(".timer");
      if (timer && timer.textContent && timer.textContent.trim() !== "") {
        return true;
      }

      // Check if skin carousel exists (indicates session is initialized)
      const skinCarousel = document.querySelector(".skin-selection-carousel");
      if (skinCarousel && skinCarousel.children.length > 0) {
        return true;
      }

      // Check if session data exists via API or Ember
      if (window.Ember) {
        const championSelectEl = document.querySelector(".champion-select");
        if (championSelectEl) {
          if (window.Ember.getOwner) {
            const application = window.Ember.getOwner(championSelectEl);
            if (application) {
              const rootComponent = application.lookup(
                "component:champion-select"
              );
              if (rootComponent) {
                const session = rootComponent.get("session");
                if (session && session.timer) {
                  return true;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Silently fail
    }
    return false;
  }

  function shouldShowChromaButton() {
    // In Swiftplay, always show
    if (isSwiftplayMode()) {
      return true;
    }

    // Otherwise, only show if session is initialized
    return isSessionInitialized();
  }

  function updateButtonVisibility(button) {
    const shouldShow = shouldShowChromaButton();
    if (shouldShow) {
      button.style.display = "block";
      button.style.pointerEvents = "auto";
      button.style.opacity = "1";
    } else {
      button.style.display = "none";
      button.style.pointerEvents = "none";
      button.style.opacity = "0";
    }
  }

  function ensureFakeButton(skinItem) {
    if (!skinItem) {
      return;
    }

    // Check if button already exists
    let existingButton = skinItem.querySelector(BUTTON_SELECTOR);
    if (existingButton) {
      log.debug("Button already exists for skin item");
      return;
    }

    // Create and inject the fake button
    try {
      const fakeButton = createFakeButton();
      skinItem.appendChild(fakeButton);
      log.debug("Created fake chroma button for skin item", skinItem);

      // Set initial visibility
      updateButtonVisibility(fakeButton);
    } catch (e) {
      log.warn("Failed to create chroma button", e);
    }
  }

  function scanSkinSelection() {
    const skinItems = document.querySelectorAll(".skin-selection-item");
    log.debug(`Found ${skinItems.length} skin-selection-item elements`);
    skinItems.forEach((skinItem) => {
      ensureFakeButton(skinItem);
    });

    const thumbnailWrappers = document.querySelectorAll(".thumbnail-wrapper");
    log.debug(`Found ${thumbnailWrappers.length} thumbnail-wrapper elements`);
    thumbnailWrappers.forEach((thumbnailWrapper) => {
      ensureFakeButton(thumbnailWrapper);
    });

    // Update visibility of all existing buttons
    const existingButtons = document.querySelectorAll(BUTTON_SELECTOR);
    log.debug(`Total chroma buttons found: ${existingButtons.length}`);
    existingButtons.forEach((button) => {
      updateButtonVisibility(button);
    });
  }

  function isVisible(element) {
    if (!element) {
      return false;
    }
    return element.offsetParent !== null;
  }

  function readCurrentSkinName() {
    // Read skin name from the same location as skin monitor
    for (const selector of SKIN_SELECTORS) {
      const nodes = document.querySelectorAll(selector);
      if (!nodes.length) {
        continue;
      }

      let candidate = null;

      nodes.forEach((node) => {
        const name = node.textContent.trim();
        if (!name) {
          return;
        }

        if (isVisible(node)) {
          candidate = name;
        } else if (!candidate) {
          candidate = name;
        }
      });

      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  function getSkinOffset(skinItem) {
    // Check the skin item itself for offset class like "skin-carousel-offset-2"
    let offsetMatch = skinItem.className.match(/skin-carousel-offset-(\d+)/);
    if (offsetMatch) {
      return parseInt(offsetMatch[1]);
    }

    // Check parent elements (the li element might have the class)
    let parent = skinItem.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      offsetMatch = parent.className.match(/skin-carousel-offset-(\d+)/);
      if (offsetMatch) {
        return parseInt(offsetMatch[1]);
      }
      parent = parent.parentElement;
      depth++;
    }

    // Try to get from Ember view context
    const emberView = skinItem.closest(".ember-view");
    if (emberView) {
      const view =
        emberView.__ember_view__ ||
        emberView._view ||
        (window.Ember &&
          window.Ember.View.views &&
          window.Ember.View.views[emberView.id]);

      if (view) {
        const context = view.context || view._context || view.get?.("context");
        if (context) {
          const item = context.item || context;
          if (item && typeof item.offset === "number") {
            return item.offset;
          }
        }
      }
    }

    return null;
  }

  function getSkinData(skinItem) {
    // Try multiple methods to extract skin data

    // Method 1: Try to get from Ember view context
    const emberView = skinItem.closest(".ember-view");
    if (emberView) {
      // Try different Ember view property access patterns
      const view =
        emberView.__ember_view__ ||
        emberView._view ||
        (window.Ember &&
          window.Ember.View.views &&
          window.Ember.View.views[emberView.id]);

      if (view) {
        const context = view.context || view._context || view.get?.("context");
        if (context) {
          const skin = context.skin || context.item?.skin || context;
          if (skin && (skin.id || skin.skinId)) {
            return skin;
          }
        }
      }
    }

    // Method 2: Try to get from data attributes
    const dataId =
      skinItem.getAttribute("data-skin-id") ||
      skinItem.querySelector("[data-skin-id]")?.getAttribute("data-skin-id");
    if (dataId) {
      return { skinId: parseInt(dataId) };
    }

    // Method 3: Extract from background image URL
    const thumbnail = skinItem.querySelector(".skin-selection-thumbnail");
    if (thumbnail) {
      const bgImage =
        thumbnail.style.backgroundImage ||
        window.getComputedStyle(thumbnail).backgroundImage;
      const match = bgImage.match(/champion-splashes\/(\d+)\/(\d+)\.jpg/);
      if (match) {
        return {
          championId: parseInt(match[1]),
          skinId: parseInt(match[2]),
        };
      }
    }

    // Method 4: Try to find skin name from DOM
    const skinNameElement = skinItem.querySelector(
      ".skin-selection-item-information"
    );
    const name = skinNameElement?.textContent?.trim();

    return name ? { name } : null;
  }

  function getChromaData(skinData) {
    if (!skinData) {
      return [];
    }

    // Try to get chromas from skinData.childSkins if available (from Ember)
    if (skinData.childSkins && Array.isArray(skinData.childSkins)) {
      return skinData.childSkins.map((chroma, index) => ({
        id: chroma.id || chroma.skinId,
        name: chroma.name || chroma.shortName || `Chroma ${index}`,
        imagePath: chroma.chromaPreviewPath || chroma.imagePath,
        selected: chroma.id === skinData.id || index === 0,
        locked: !chroma.ownership?.owned,
        purchaseDisabled: chroma.purchaseDisabled,
      }));
    }

    // Fallback: construct chroma paths based on skin ID
    const baseSkinId = skinData.skinId || skinData.id;
    if (!baseSkinId) {
      return [];
    }

    const championId = skinData.championId || Math.floor(baseSkinId / 1000);
    const chromas = [];

    // Create base skin as first option
    chromas.push({
      id: baseSkinId,
      name: "Default",
      imagePath: `/lol-game-data/assets/v1/champion-chroma-images/${championId}/${baseSkinId}000.png`,
      selected: true,
      locked: false,
    });

    // Try to find additional chromas (typically numbered 001-012)
    // We'll create a few placeholder chromas
    for (let i = 1; i <= 3; i++) {
      const chromaId = baseSkinId * 1000 + i;
      chromas.push({
        id: chromaId,
        name: `Chroma ${i}`,
        imagePath: `/lol-game-data/assets/v1/champion-chroma-images/${championId}/${chromaId}.png`,
        selected: false,
        locked: true, // Assume locked unless we can verify ownership
      });
    }

    return chromas;
  }

  function createChromaPanel(skinData, chromas, buttonElement) {
    log.debug("createChromaPanel called", { skinData, chromas, buttonElement });

    // Remove existing panel if any
    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = PANEL_CLASS;
    panel.style.position = "fixed";
    panel.style.zIndex = "10000";

    // Create flyout frame structure (or use simple div if custom elements don't work)
    let flyoutFrame;
    try {
      flyoutFrame = document.createElement("lol-uikit-flyout-frame");
      flyoutFrame.className = "flyout";
      flyoutFrame.setAttribute("orientation", "top");
      flyoutFrame.setAttribute("show", "true");
    } catch (e) {
      log.debug("Could not create custom element, using div", e);
      flyoutFrame = document.createElement("div");
      flyoutFrame.className = "flyout";
    }

    let flyoutContent;
    try {
      flyoutContent = document.createElement("lc-flyout-content");
    } catch (e) {
      log.debug("Could not create lc-flyout-content, using div", e);
      flyoutContent = document.createElement("div");
      flyoutContent.className = "lc-flyout-content";
    }

    const modal = document.createElement("div");
    modal.className = "champ-select-chroma-modal chroma-view ember-view";

    // Add border element (matches official structure)
    const border = document.createElement("div");
    border.className = "border";

    // Chroma information section
    const chromaInfo = document.createElement("div");
    chromaInfo.className = "chroma-information";
    const bgPath =
      "lol-game-data/assets/content/src/LeagueClient/GameModeAssets/Classic_SRU/img/champ-select-flyout-background.jpg";
    chromaInfo.style.backgroundImage = `url('${bgPath}')`;

    const chromaImage = document.createElement("div");
    chromaImage.className = "chroma-information-image";
    if (chromas.length > 0 && chromas[0].imagePath) {
      chromaImage.style.backgroundImage = `url('${chromas[0].imagePath}')`;
      chromaImage.style.display = ""; // Ensure it's visible
    } else {
      // Hide the image element when no image is available
      chromaImage.style.display = "none";
    }

    const skinName = document.createElement("div");
    skinName.className = "child-skin-name";
    // Fetch the actual skin name from the DOM (same location as skin monitor)
    const displayName =
      readCurrentSkinName() ||
      skinData.name ||
      skinData.championName ||
      (skinData.championId ? `Champion ${skinData.championId}` : "Champion");
    skinName.textContent = displayName;

    const disabledNotification = document.createElement("div");
    disabledNotification.className = "child-skin-disabled-notification";

    skinName.appendChild(disabledNotification);
    chromaInfo.appendChild(chromaImage);
    chromaInfo.appendChild(skinName);

    // Chroma selection scrollable area
    let scrollable;
    try {
      scrollable = document.createElement("lol-uikit-scrollable");
      scrollable.className = "chroma-selection";
      scrollable.setAttribute("overflow-masks", "enabled");
    } catch (e) {
      log.debug("Could not create scrollable, using div", e);
      scrollable = document.createElement("div");
      scrollable.className = "chroma-selection";
      scrollable.style.overflowY = "auto";
      scrollable.style.maxHeight = "92px";
    }

    // Create chroma buttons
    chromas.forEach((chroma) => {
      const emberView = document.createElement("div");
      emberView.className = "ember-view";

      const chromaButton = document.createElement("div");
      chromaButton.className = `chroma-skin-button ${
        chroma.locked ? "locked" : ""
      } ${chroma.selected ? "selected" : ""} ${
        chroma.purchaseDisabled ? "purchase-disabled" : ""
      }`;

      const contents = document.createElement("div");
      contents.className = "contents";
      if (chroma.imagePath) {
        contents.style.background = `url('${chroma.imagePath}')`;
        contents.style.backgroundSize = "cover";
        contents.style.backgroundPosition = "center";
        contents.style.backgroundRepeat = "no-repeat";
      }

      chromaButton.appendChild(contents);
      emberView.appendChild(chromaButton);
      scrollable.appendChild(emberView);

      // Add click handler
      if (!chroma.locked) {
        chromaButton.addEventListener("click", (e) => {
          e.stopPropagation();
          selectChroma(chroma, chromas, chromaImage, chromaButton, scrollable);
        });
      }
    });

    modal.appendChild(border);
    modal.appendChild(chromaInfo);
    modal.appendChild(scrollable);
    flyoutContent.appendChild(modal);
    flyoutFrame.appendChild(flyoutContent);
    panel.appendChild(flyoutFrame);

    // Position the panel relative to the button
    positionPanel(panel, buttonElement);

    // Add click outside handler to close
    const closeHandler = function closePanelOnOutsideClick(e) {
      if (
        panel &&
        panel.parentNode &&
        !panel.contains(e.target) &&
        !buttonElement.contains(e.target)
      ) {
        panel.remove();
        document.removeEventListener("click", closeHandler);
      }
    };
    // Use setTimeout to avoid immediate closure
    setTimeout(() => {
      document.addEventListener("click", closeHandler);
    }, 100);

    document.body.appendChild(panel);
    log.debug("Panel appended to body", panel);

    // Force a reflow to ensure positioning works
    panel.offsetHeight;

    // Reposition after render
    setTimeout(() => {
      positionPanel(panel, buttonElement);
    }, 0);

    return panel;
  }

  function positionPanel(panel, buttonElement) {
    if (!panel || !buttonElement) {
      log.warn("Cannot position panel: missing elements");
      return;
    }

    const rect = buttonElement.getBoundingClientRect();
    let panelRect = panel.getBoundingClientRect();

    // If panel hasn't been rendered yet, use estimated dimensions
    if (panelRect.width === 0) {
      panelRect = { width: 300, height: 300 };
    }

    // Position above the button, centered
    const top = rect.top - panelRect.height - 10;
    const left = rect.left + rect.width / 2 - panelRect.width / 2;

    panel.style.top = `${Math.max(10, top)}px`;
    panel.style.left = `${Math.max(
      10,
      Math.min(left, window.innerWidth - panelRect.width - 10)
    )}px`;

    log.debug("Panel positioned", {
      top: panel.style.top,
      left: panel.style.left,
      rect,
      panelRect,
    });
  }

  function selectChroma(
    chroma,
    allChromas,
    chromaImage,
    clickedButton,
    scrollable
  ) {
    // Update selected state
    allChromas.forEach((c) => {
      c.selected = c.id === chroma.id;
    });

    // Update UI
    scrollable.querySelectorAll(".chroma-skin-button").forEach((btn) => {
      btn.classList.remove("selected");
    });
    clickedButton.classList.add("selected");

    // Update preview image
    if (chroma.imagePath) {
      chromaImage.style.backgroundImage = `url('${chroma.imagePath}')`;
      chromaImage.style.display = ""; // Show the element
    } else {
      chromaImage.style.display = "none"; // Hide when no image
    }

    // Try to set the skin via API
    if (window.fetch) {
      fetch("/lol-champ-select/v1/session/my-selection", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedSkinId: chroma.id,
        }),
      })
        .then(() => {
          log.debug(`Successfully set chroma: ${chroma.id}`);
        })
        .catch((err) => {
          log.warn(`Failed to set chroma: ${chroma.id}`, err);
        });
    } else {
      log.debug(`Selected chroma: ${chroma.id} (API call not available)`);
    }
  }

  function toggleChromaPanel(buttonElement, skinItem) {
    log.debug("toggleChromaPanel called", { buttonElement, skinItem });

    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
      log.debug("Closing existing panel");
      existingPanel.remove();
      return;
    }

    log.debug("Extracting skin data...");
    const skinData = getSkinData(skinItem);
    log.debug("Skin data extracted:", skinData);

    if (!skinData) {
      log.warn("Could not extract skin data from skin item", skinItem);
      // Try to create panel with minimal data anyway
      const fallbackData = {
        name: "Champion",
        skinId: 0,
        championId: 0,
      };
      const fallbackChromas = [
        {
          id: 0,
          name: "Default",
          imagePath: "",
          selected: true,
          locked: false,
        },
      ];
      createChromaPanel(fallbackData, fallbackChromas, buttonElement);
      return;
    }

    log.debug("Getting chroma data...");
    const chromas = getChromaData(skinData);
    log.debug("Chromas found:", chromas);

    if (chromas.length === 0) {
      log.warn("No chromas found for this skin, creating with default");
      // Create at least one default chroma
      const defaultChromas = [
        {
          id: skinData.skinId || skinData.id || 0,
          name: "Default",
          imagePath: "",
          selected: true,
          locked: false,
        },
      ];
      createChromaPanel(skinData, defaultChromas, buttonElement);
      return;
    }

    log.debug("Creating chroma panel...");
    createChromaPanel(skinData, chromas, buttonElement);
    log.info("Chroma panel opened successfully");
  }

  function setupObserver() {
    const observer = new MutationObserver(() => {
      scanSkinSelection();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // Periodic scan as safety net
    const intervalId = setInterval(scanSkinSelection, 500);

    // Periodic visibility update for all buttons
    const visibilityCheckInterval = setInterval(() => {
      const buttons = document.querySelectorAll(BUTTON_SELECTOR);
      buttons.forEach((button) => {
        updateButtonVisibility(button);
      });
    }, 500);

    // Return cleanup function
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      clearInterval(visibilityCheckInterval);
    };
  }

  function init() {
    if (!document || !document.head) {
      requestAnimationFrame(init);
      return;
    }

    injectCSS();
    scanSkinSelection();
    setupObserver();
    log.info("fake chroma button creation active");
  }

  if (typeof document === "undefined") {
    log.warn("document unavailable; aborting");
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
