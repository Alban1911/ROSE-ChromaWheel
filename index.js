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
  const SPECIAL_BASE_SKIN_IDS = new Set([99007, 145070, 103085]);
  const SPECIAL_CHROMA_SKIN_IDS = new Set([145071, 100001, 103086, 88888]);
  const chromaParentMap = new Map();
  let skinMonitorState = null;
  const championSkinCache = new Map(); // championId -> Map(skinId -> skin data)
  const skinChromaCache = new Map(); // skinId -> boolean
  const skinToChampionMap = new Map(); // skinId -> championId
  const pendingChampionRequests = new Map(); // championId -> Promise

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

    .${BUTTON_CLASS}[data-hidden],
    .${BUTTON_CLASS}[data-hidden] * {
      pointer-events: none !important;
      cursor: default !important;
      visibility: hidden !important;
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

    .${PANEL_CLASS}[data-no-button] {
      pointer-events: none;
      cursor: default !important;
    }

    .${PANEL_CLASS}[data-no-button] * {
      pointer-events: none !important;
      cursor: default !important;
    }

    .${PANEL_CLASS} .chroma-modal {
      background: #000;
      display: flex;
      flex-direction: column;
      width: 305px;
      position: relative;
      z-index: 0;
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

    .${PANEL_CLASS}[data-no-button] .flyout {
      pointer-events: none !important;
      cursor: default !important;
    }
    
    .${PANEL_CLASS} .flyout-frame {
      position: relative;
      transition: 250ms all cubic-bezier(0.02, 0.85, 0.08, 0.99);
    }
    
    /* Target the caret/notch element to be above the border */
    .${PANEL_CLASS} .flyout .caret,
    .${PANEL_CLASS} .flyout [class*="caret"],
    .${PANEL_CLASS} lol-uikit-flyout-frame .caret,
    .${PANEL_CLASS} lol-uikit-flyout-frame [class*="caret"],
    .${PANEL_CLASS} .flyout::part(caret),
    .${PANEL_CLASS} lol-uikit-flyout-frame::part(caret) {
      z-index: 3 !important;
      position: relative;
    }
    
    .${PANEL_CLASS} .border {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      background-color: transparent;
      box-shadow: 0 0 0 1px rgba(1,10,19,0.48);
      transition: 250ms all cubic-bezier(0.02, 0.85, 0.08, 0.99);
      border-top: 2px solid transparent;
      border-left: 2px solid transparent;
      border-right: 2px solid transparent;
      border-bottom: none;
      border-image: linear-gradient(to top, #785a28 0, #463714 50%, #463714 100%) 1 stretch;
      border-image-slice: 1 1 0 1;
      width: 100%;
      height: 100%;
      visibility: visible;
      z-index: 2;
      pointer-events: none;
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
      z-index: 1;
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
      position: relative;
      z-index: 1;
    }

    .${PANEL_CLASS}[data-no-button] .chroma-selection {
      pointer-events: none;
      cursor: default;
    }

    .${PANEL_CLASS} .chroma-selection ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0;
      width: 100%;
    }

    .${PANEL_CLASS} .chroma-selection li {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .${PANEL_CLASS} .chroma-skin-button {
      pointer-events: all;
      align-items: center;
      border-radius: 50%;
      border: none; /* No default border to ensure proper centering */
      display: flex;
      height: 26px;
      justify-content: center;
      margin: 0; /* Ensure no margin affects centering */
      padding: 0; /* Ensure no padding affects centering */
      width: 26px;
      cursor: pointer;
      box-sizing: border-box; /* Consistent box model */
    }

    .${PANEL_CLASS}[data-no-button] .chroma-skin-button {
      pointer-events: none !important;
      cursor: default !important;
    }

    .${PANEL_CLASS} .chroma-skin-button:not(.locked) {
      cursor: pointer;
      opacity: 1 !important; /* Always 100% opacity for non-locked buttons */
    }

    .${PANEL_CLASS} .chroma-skin-button.selected,
    .${PANEL_CLASS} .chroma-skin-button:hover {
      /* Selected and hover states: 2px golden border around the button */
      border: 2px solid #c89b3c;
      box-sizing: border-box;
      /* Border is inside the 26px, so inner space is 22px */
    }
    
    .${PANEL_CLASS} .chroma-skin-button.selected .contents,
    .${PANEL_CLASS} .chroma-skin-button:hover .contents {
      /* Create 2px gap on each side: 22px inner - 4px gap = 18px contents */
      height: 18px;
      width: 18px;
    }

    .${PANEL_CLASS} .chroma-skin-button.locked {
      opacity: 1 !important; /* All buttons at 100% opacity, including locked */
      cursor: pointer;
      /* Keep colors visible, no opacity reduction */
    }

    .${PANEL_CLASS} .chroma-skin-button .contents {
      align-items: center;
      border-radius: 50%;
      display: flex;
      height: 18px;
      justify-content: center;
      width: 18px;
      opacity: 1 !important; /* All button contents at 100% opacity always */
      /* Background will be set inline based on chroma color */
    }
    
    /* All buttons at 100% opacity, no variation on hover or state */
    .${PANEL_CLASS} .chroma-skin-button.locked:hover:not([purchase-disabled]) {
      opacity: 1 !important;
    }
    
    .${PANEL_CLASS} .chroma-skin-button.locked.purchase-disabled {
      opacity: 1 !important;
      pointer-events: none;
    }
  `;

  function emitBridgeLog(event, data = {}) {
    try {
      const emitter = window?.__leagueUnlockedBridgeEmit;
      if (typeof emitter !== "function") {
        return;
      }
      emitter({
        type: "chroma-log",
        source: "LU-ChromaWheel",
        event,
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Can't use log here since it's not defined yet
      console.debug(`${LOG_PREFIX} Failed to emit bridge log`, error);
    }
  }

  const log = {
    info: (msg, extra) => {
      console.log(`${LOG_PREFIX} ${msg}`, extra ?? "");
      emitBridgeLog("info", { message: msg, data: extra });
    },
    warn: (msg, extra) => {
      console.warn(`${LOG_PREFIX} ${msg}`, extra ?? "");
      emitBridgeLog("warn", { message: msg, data: extra });
    },
    debug: (msg, extra) => {
      console.debug(`${LOG_PREFIX} ${msg}`, extra ?? "");
      emitBridgeLog("debug", { message: msg, data: extra });
    },
  };

  function getNumericId(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  function extractSkinIdFromData(skinData) {
    if (!skinData || typeof skinData !== "object") {
      return null;
    }
    const candidates = [
      skinData.skinId,
      skinData.id,
      skinData.skin?.skinId,
      skinData.skin?.id,
      skinData.championSkinId,
      skinData.parentSkinId,
    ];
    for (const candidate of candidates) {
      const numeric = getNumericId(candidate);
      if (numeric !== null) {
        return numeric;
      }
    }
    return null;
  }

  function extractSkinIdFromElement(element) {
    if (!element) {
      return null;
    }
    const direct = element.getAttribute?.("data-skin-id");
    if (direct) {
      return getNumericId(direct);
    }
    const nested = element
      .querySelector?.("[data-skin-id]")
      ?.getAttribute("data-skin-id");
    if (nested) {
      return getNumericId(nested);
    }
    return null;
  }

  function getSkinIdFromContext(skinData, element) {
    return extractSkinIdFromData(skinData) ?? extractSkinIdFromElement(element);
  }

  function getChampionIdFromContext(skinData, skinId, element) {
    if (skinData && Number.isFinite(skinData.championId)) {
      return skinData.championId;
    }

    if (element?.dataset?.championId) {
      const attrId = getNumericId(element.dataset.championId);
      if (Number.isFinite(attrId)) {
        return attrId;
      }
    }

    const championElement = element?.closest?.("[data-champion-id]");
    if (championElement) {
      const attrId = getNumericId(
        championElement.getAttribute("data-champion-id")
      );
      if (Number.isFinite(attrId)) {
        return attrId;
      }
    }

    if (Number.isFinite(skinId)) {
      const mappedChampion = skinToChampionMap.get(skinId);
      if (Number.isFinite(mappedChampion)) {
        return mappedChampion;
      }

      const inferred = Math.floor(skinId / 1000);
      if (Number.isFinite(inferred) && inferred > 0) {
        return inferred;
      }
    }

    return null;
  }

  function isElementalistFormSkinId(skinId) {
    return Number.isFinite(skinId) && skinId >= 99991 && skinId <= 99999;
  }

  function isSpecialBaseSkin(skinId) {
    return (
      Number.isFinite(skinId) &&
      (SPECIAL_BASE_SKIN_IDS.has(skinId) || skinId === 99007)
    );
  }

  function isSpecialChromaSkin(skinId) {
    return (
      Number.isFinite(skinId) &&
      (SPECIAL_CHROMA_SKIN_IDS.has(skinId) || isElementalistFormSkinId(skinId))
    );
  }

  function isLikelyChromaId(skinId) {
    if (!Number.isFinite(skinId)) {
      return false;
    }
    if (isSpecialChromaSkin(skinId)) {
      return true;
    }
    if (chromaParentMap.has(skinId)) {
      return true;
    }
    return skinId >= 1000000;
  }

  function getChildSkinsFromData(skinData) {
    if (!skinData || typeof skinData !== "object") {
      return [];
    }

    const candidates = [
      skinData.childSkins,
      skinData.skin?.childSkins,
      skinData.skin?.chromas,
      Array.isArray(skinData.chromas) ? skinData.chromas : null,
      skinData.chromaDetails,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate;
      }
    }

    return [];
  }

  function markSkinHasChromas(skinId, hasChromas) {
    const numericId = getNumericId(skinId);
    if (!Number.isFinite(numericId)) {
      return;
    }
    skinChromaCache.set(numericId, Boolean(hasChromas));
  }

  function registerChromaChildren(baseSkinId, childSkins) {
    const numericBaseId = getNumericId(baseSkinId);
    if (!Number.isFinite(numericBaseId) || !Array.isArray(childSkins)) {
      return;
    }
    markSkinHasChromas(numericBaseId, true);
    childSkins.forEach((child) => {
      const childId = extractSkinIdFromData(child);
      if (Number.isFinite(childId)) {
        chromaParentMap.set(childId, numericBaseId);
        markSkinHasChromas(childId, true);
      }
    });
  }

  function getCachedChromasForSkin(skinId) {
    const numericId = getNumericId(skinId);
    if (!Number.isFinite(numericId)) {
      log.debug(`[getCachedChromasForSkin] Invalid skin ID: ${skinId}`);
      return [];
    }

    const championId = skinToChampionMap.get(numericId);
    if (!Number.isFinite(championId)) {
      log.debug(`[getCachedChromasForSkin] No champion ID found for skin ${numericId}`);
      return [];
    }

    const championCache = championSkinCache.get(championId);
    if (!championCache) {
      log.debug(`[getCachedChromasForSkin] No champion cache found for champion ${championId}`);
      return [];
    }

    const entry = championCache.get(numericId);
    if (!entry || !Array.isArray(entry.chromas)) {
      log.debug(`[getCachedChromasForSkin] No chromas entry found for skin ${numericId} in champion ${championId} cache`);
      return [];
    }

    log.debug(`[getCachedChromasForSkin] Found ${entry.chromas.length} chromas for skin ${numericId}`);
    return entry.chromas.map((chroma) => ({ ...chroma }));
  }

  function fetchChampionEndpoint(endpoint) {
    return window
      .fetch(endpoint, {
        method: "GET",
        credentials: "include",
      })
      .then((response) => {
        if (!response || !response.ok) {
          throw new Error(
            `HTTP ${response ? response.status : "NO_RESPONSE"} for ${endpoint}`
          );
        }
        return response.json();
      });
  }

  function requestChampionDataSequentially(endpoints, index = 0) {
    if (index >= endpoints.length) {
      return Promise.resolve(null);
    }
    const endpoint = endpoints[index];
    return fetchChampionEndpoint(endpoint)
      .then((data) => {
        if (data && Array.isArray(data.skins)) {
          return data;
        }
        throw new Error("Invalid champion data");
      })
      .catch((err) => {
        log.debug(`Failed to fetch champion data from ${endpoint}`, err);
        return requestChampionDataSequentially(endpoints, index + 1);
      });
  }

  function storeChampionSkins(championId, skins) {
    const skinMap = new Map();
    if (!Array.isArray(skins)) {
      return;
    }

    skins.forEach((skin) => {
      const skinId = getNumericId(skin?.id);
      if (!Number.isFinite(skinId)) {
        return;
      }

      const chromas = Array.isArray(skin.chromas) ? skin.chromas : [];
      const formattedChromas = chromas.map((chroma, index) => {
        const chromaId =
          getNumericId(chroma?.id) ?? getNumericId(chroma?.skinId) ?? index;
        const imagePath =
          chroma?.chromaPath ||
          chroma?.chromaPreviewPath ||
          chroma?.imagePath ||
          chroma?.splashPath ||
          "";
        // Extract colors from chroma data
        const colors = Array.isArray(chroma?.colors) ? chroma.colors : [];
        // Use the second color if available (typically the main chroma color), otherwise first color
        const primaryColor = colors.length > 1 ? colors[1] : (colors.length > 0 ? colors[0] : null);
        return {
          id: chromaId,
          name: chroma?.name || chroma?.shortName || `Chroma ${index}`,
          imagePath,
          colors: colors,
          primaryColor: primaryColor,
          locked: !chroma?.ownership?.owned,
          purchaseDisabled: chroma?.purchaseDisabled,
        };
      });

      skinMap.set(skinId, {
        chromas: formattedChromas,
        rawSkin: skin,
      });

      skinToChampionMap.set(skinId, championId);
      const hasChromas =
        formattedChromas.length > 0 || isSpecialBaseSkin(skinId);
      markSkinHasChromas(skinId, hasChromas);
      if (formattedChromas.length > 0) {
        registerChromaChildren(skinId, formattedChromas);
      }
    });

    championSkinCache.set(championId, skinMap);
  }

  function fetchChampionSkinData(championId) {
    if (!Number.isFinite(championId)) {
      return null;
    }

    if (championSkinCache.has(championId)) {
      log.debug(`Champion ${championId} skin data already cached`);
      return Promise.resolve(championSkinCache.get(championId));
    }

    if (pendingChampionRequests.has(championId)) {
      return pendingChampionRequests.get(championId);
    }

    const endpoints = [
      `/lol-game-data/assets/v1/champions/${championId}.json`,
      `/lol-champions/v1/inventories/scouting/champions/${championId}`,
    ];

    log.debug(`Loading champion ${championId} skin data...`);
    const requestPromise = requestChampionDataSequentially(endpoints)
      .then((data) => {
        if (data && Array.isArray(data.skins)) {
          storeChampionSkins(championId, data.skins);
          const cacheEntry = championSkinCache.get(championId);
          log.debug(
            `Champion ${championId} skin data cached (${
              cacheEntry ? cacheEntry.size : 0
            } skins)`
          );
          return championSkinCache.get(championId);
        }
        return null;
      })
      .catch((err) => {
        log.debug(
          `Failed to load champion ${championId} skin data from all endpoints`,
          err
        );
        return null;
      })
      .finally(() => {
        pendingChampionRequests.delete(championId);
        setTimeout(() => {
          try {
            if (typeof scanSkinSelection === "function") {
              scanSkinSelection();
            }
          } catch (e) {
            log.debug("Rescan after champion fetch failed", e);
          }
        }, 0);
      });

    pendingChampionRequests.set(championId, requestPromise);
    return requestPromise;
  }

  function cacheSkinData(element, skinData) {
    if (!element || !skinData) {
      return;
    }
    try {
      element.__luChromaSkinData = skinData;
    } catch (e) {
      log.debug("Failed to cache skin data", e);
    }
  }

  function getCachedSkinData(element) {
    if (!element) {
      return null;
    }
    if (element.__luChromaSkinData) {
      return element.__luChromaSkinData;
    }
    const skinData = getSkinData(element);
    if (skinData) {
      cacheSkinData(element, skinData);
    }
    return skinData;
  }

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
      log.info("[ChromaWheel] Chroma button clicked!");
      const skinItem = button.closest(
        ".skin-selection-item, .thumbnail-wrapper"
      );
      if (skinItem) {
        // Check if this skin has offset 2
        const offset = getSkinOffset(skinItem);
        log.info(`[ChromaWheel] Skin offset: ${offset}`);

        if (offset === 2) {
          log.info("[ChromaWheel] Found skin item with offset 2, opening panel");
          toggleChromaPanel(button, skinItem);
        } else {
          log.info(`[ChromaWheel] Skin offset is ${offset}, not 2. Panel will not open.`);
        }
      } else {
        log.warn("[ChromaWheel] Could not find skin item for chroma button");
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

  function updateButtonVisibility(button, hasChromas) {
    if (!button) return;
    
    const shouldShow = Boolean(hasChromas);
    const lastState = button._luLastVisibilityState;
    const willChange = lastState === undefined || lastState !== shouldShow;
    
    // Only log when visibility actually changes
    if (willChange) {
      emitBridgeLog("button_visibility_update", {
        shouldShow,
        hasChromas,
        buttonExists: true,
      });
      button._luLastVisibilityState = shouldShow;
    }
    
    if (shouldShow) {
      button.style.display = "block";
      button.style.visibility = "visible";
      button.style.pointerEvents = "auto";
      button.style.opacity = "1";
      button.style.cursor = "pointer";
      button.removeAttribute("data-hidden");
      // Re-enable pointer events on all children
      const children = button.querySelectorAll("*");
      children.forEach(child => {
        child.style.pointerEvents = "";
        child.style.cursor = "";
        child.style.visibility = "";
      });
    } else {
      button.style.display = "none";
      button.style.visibility = "hidden";
      button.style.pointerEvents = "none";
      button.style.opacity = "0";
      button.style.cursor = "default";
      button.setAttribute("data-hidden", "true");
      
      // Disable pointer events on all children to prevent any hover effects
      const children = button.querySelectorAll("*");
      children.forEach(child => {
        child.style.pointerEvents = "none";
        child.style.cursor = "default";
        child.style.visibility = "hidden";
      });
      
      // Close and disable any open panel when button becomes hidden
      const existingPanel = document.getElementById(PANEL_ID);
      if (existingPanel) {
        log.info("[ChromaWheel] Button hidden, closing panel and marking as non-interactive");
        existingPanel.setAttribute("data-no-button", "true");
        existingPanel.style.pointerEvents = "none";
        existingPanel.style.cursor = "default";
        // Remove the panel after a short delay to allow any animations
        setTimeout(() => {
          if (existingPanel.parentNode) {
            existingPanel.remove();
          }
        }, 100);
      }
    }
  }

  function isCurrentSkinItem(skinItem) {
    if (!skinItem) {
      return false;
    }

    // Carousel items: rely on offset 2 (center/current slot)
    if (skinItem.classList.contains("skin-selection-item")) {
      const offset = getSkinOffset(skinItem);
      if (offset === 2) {
        return true;
      }
    }

    // Thumbnail wrappers (e.g., Swiftplay lobby) typically flag selection via attributes/classes
    if (skinItem.classList.contains("thumbnail-wrapper")) {
      if (
        skinItem.classList.contains("selected") ||
        skinItem.getAttribute("aria-selected") === "true"
      ) {
        return true;
      }
    }

    return false;
  }

  function doesSkinItemMatchSkinState(skinItem) {
    if (!skinMonitorState?.skinId) {
      return true;
    }
    const skinData = getCachedSkinData(skinItem);
    const skinId = getSkinIdFromContext(skinData, skinItem);
    return Number.isFinite(skinId) && skinId === skinMonitorState.skinId;
  }

  function getSkinItemFromButton(button) {
    return button.closest(".skin-selection-item, .thumbnail-wrapper");
  }

  function ensureFakeButton(skinItem) {
    if (!skinItem) {
      return;
    }

    const isCurrent = isCurrentSkinItem(skinItem);
    const hasChromas = Boolean(skinMonitorState?.hasChromas);

    // Check if button already exists
    let existingButton = skinItem.querySelector(BUTTON_SELECTOR);
    if (!isCurrent) {
      if (existingButton) {
        existingButton.remove();
      }
      return;
    }

    // Only log current skin eval when skin actually changes
    const lastEval = ensureFakeButton._lastEval;
    const currentSkinId = skinMonitorState?.skinId ?? null;
    if (!lastEval || lastEval.skinId !== currentSkinId || lastEval.hasChromas !== hasChromas) {
      emitBridgeLog("current_skin_eval", {
        stateSkinId: currentSkinId,
        hasChromas,
        elementClasses: skinItem.className,
      });
      ensureFakeButton._lastEval = { skinId: currentSkinId, hasChromas };
    }

    // Create and inject the fake button
    try {
      if (!existingButton) {
        const fakeButton = createFakeButton();
        skinItem.appendChild(fakeButton);
        existingButton = fakeButton;
        emitBridgeLog("button_created", {
          skinId: currentSkinId,
          hasChromas,
        });
      }

      updateButtonVisibility(existingButton, hasChromas);
    } catch (e) {
      log.warn("Failed to create chroma button", e);
      emitBridgeLog("button_creation_error", { error: String(e) });
    }
  }

  function scanSkinSelection() {
    const skinItems = document.querySelectorAll(".skin-selection-item");
    const thumbnailWrappers = document.querySelectorAll(".thumbnail-wrapper");
    
    // Only log when state actually changes
    const prevState = scanSkinSelection._lastState;
    const currentState = {
      skinItemsCount: skinItems.length,
      currentSkinId: skinMonitorState?.skinId,
      hasChromas: skinMonitorState?.hasChromas,
    };
    if (!prevState || 
        prevState.currentSkinId !== currentState.currentSkinId ||
        prevState.hasChromas !== currentState.hasChromas) {
      emitBridgeLog("scan_skin_selection", {
        ...currentState,
        thumbnailWrappersCount: thumbnailWrappers.length,
      });
      scanSkinSelection._lastState = currentState;
    }
    
    skinItems.forEach((skinItem) => {
      ensureFakeButton(skinItem);
    });

    thumbnailWrappers.forEach((thumbnailWrapper) => {
      ensureFakeButton(thumbnailWrapper);
    });
  }

  function isVisible(element) {
    if (!element) {
      return false;
    }
    return element.offsetParent !== null;
  }

  function readCurrentSkinName() {
    if (skinMonitorState?.name) {
      return skinMonitorState.name;
    }

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
            // Try to get chromas from the skin object directly (like official client does)
            // The official client has chromas in the skin object from Ember context
            if (skin.chromas || skin.childSkins) {
              log.debug(`[getSkinData] Found chromas in Ember context: ${(skin.chromas || skin.childSkins)?.length || 0} chromas`);
            }
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

    // First, check if chromas are directly in the skinData (like official client)
    // The official client gets chromas from the Ember component context
    if (Array.isArray(skinData.chromas) && skinData.chromas.length > 0) {
      log.debug(`[getChromaData] Found ${skinData.chromas.length} chromas directly in skinData (official client method)`);
      const baseSkinId = extractSkinIdFromData(skinData);
      
      // Include the base skin as the first option (default)
      const baseSkinChroma = {
        id: baseSkinId,
        name: "Default",
        imagePath: null,
        colors: [],
        primaryColor: null,
        selected: true,
        locked: false,
      };
      
      const chromaList = skinData.chromas.map((chroma, index) => {
        const chromaId = extractSkinIdFromData(chroma) ?? chroma.id ?? chroma.skinId ?? index;
        // Extract colors from chroma data
        const colors = Array.isArray(chroma?.colors) ? chroma.colors : [];
        // Use the second color if available (typically the main chroma color), otherwise first color
        const primaryColor = colors.length > 1 ? colors[1] : (colors.length > 0 ? colors[0] : null);
        return {
          id: chromaId,
          name: chroma.name || chroma.shortName || chroma.chromaName || `Chroma ${index}`,
          imagePath: chroma.chromaPreviewPath || chroma.imagePath || chroma.chromaPath,
          colors: colors,
          primaryColor: primaryColor,
          selected: false,
          locked: !chroma.ownership?.owned,
          purchaseDisabled: chroma.purchaseDisabled,
        };
      });
      
      return [baseSkinChroma, ...chromaList];
    }

    const childSkins = getChildSkinsFromData(skinData);
    if (childSkins.length > 0) {
      log.debug(`[getChromaData] Found ${childSkins.length} child skins in skinData`);
      const baseSkinId = extractSkinIdFromData(skinData);
      registerChromaChildren(baseSkinId, childSkins);
      
      // Include the base skin as the first option (default)
      const baseSkinChroma = {
        id: baseSkinId,
        name: "Default",
        imagePath: null,
        colors: [],
        primaryColor: null,
        selected: true,
        locked: false,
      };
      
      const chromaList = childSkins.map((chroma, index) => {
        const chromaId =
          extractSkinIdFromData(chroma) ?? chroma.id ?? chroma.skinId ?? index;
        // Extract colors from chroma data
        const colors = Array.isArray(chroma?.colors) ? chroma.colors : [];
        // Use the second color if available (typically the main chroma color), otherwise first color
        const primaryColor = colors.length > 1 ? colors[1] : (colors.length > 0 ? colors[0] : null);
        return {
          id: chromaId,
          name: chroma.name || chroma.shortName || `Chroma ${index}`,
          imagePath: chroma.chromaPreviewPath || chroma.imagePath,
          colors: colors,
          primaryColor: primaryColor,
          selected:
            chroma.id === skinData.id ||
            chroma.skinId === skinData.id ||
            false, // Don't auto-select chromas, base skin is selected
          locked: !chroma.ownership?.owned,
          purchaseDisabled: chroma.purchaseDisabled,
        };
      });
      
      return [baseSkinChroma, ...chromaList];
    }

    const baseSkinId = extractSkinIdFromData(skinData);
    log.debug(`[getChromaData] Checking cached chromas for base skin ${baseSkinId}`);
    const cachedChromas = getCachedChromasForSkin(baseSkinId);
    if (cachedChromas.length > 0) {
      log.debug(`[getChromaData] Found ${cachedChromas.length} cached chromas for skin ${baseSkinId}`);
      // Include the base skin as the first option (default)
      const baseSkinChroma = {
        id: baseSkinId,
        name: "Default",
        imagePath: null,
        colors: [],
        primaryColor: null,
        selected: true,
        locked: false,
      };
      return [baseSkinChroma, ...cachedChromas.map((chroma, index) => ({
        ...chroma,
        selected: chroma.selected ?? false,
      }))];
    }

    // Fallback: construct chroma paths based on skin ID
    // This should rarely be used if champion data is properly fetched
    log.debug(`[getChromaData] No chromas found in cache for skin ${baseSkinId}, using fallback`);
    const fallbackSkinId = baseSkinId ?? skinData.id;
    const effectiveSkinId = getNumericId(fallbackSkinId);
    const championId =
      skinData.championId || getChampionIdFromContext(skinData, effectiveSkinId);
    const resolvedChampionId =
      championId || (Number.isFinite(effectiveSkinId)
        ? Math.floor(effectiveSkinId / 1000)
        : null);

    if (!Number.isFinite(effectiveSkinId)) {
      log.debug(`[getChromaData] Invalid skin ID: ${fallbackSkinId}`);
      return [];
    }

    const fallbackChampionId = resolvedChampionId;
    const championForImages =
      fallbackChampionId ?? (Number.isFinite(effectiveSkinId)
        ? Math.floor(effectiveSkinId / 1000)
        : null);
    if (!championForImages) {
      log.debug(`[getChromaData] Could not determine champion ID for skin ${effectiveSkinId}`);
      return [];
    }
    const chromas = [];

    // Create base skin as first option
    chromas.push({
      id: effectiveSkinId,
      name: "Default",
      imagePath: `/lol-game-data/assets/v1/champion-chroma-images/${championForImages}/${effectiveSkinId}000.png`,
      selected: true,
      locked: false,
      colors: [],
      primaryColor: null,
    });

    // Try to find additional chromas (typically numbered 001-012)
    // Create placeholder chromas with default colors if we know the skin has chromas
    const hasChromas = skinMonitorState?.hasChromas || skinChromaCache.get(effectiveSkinId);
    const numPlaceholders = hasChromas ? 12 : 3; // Create more placeholders if we know chromas exist
    
    // Default chroma colors to use as fallback (from official League)
    const defaultColors = [
      "#DF9117", // Orange/Gold
      "#2DA130", // Green
      "#BE1E37", // Red
      "#1E90FF", // Blue
      "#9370DB", // Purple
      "#FF69B4", // Pink
      "#FFD700", // Gold
      "#00CED1", // Cyan
      "#FF6347", // Tomato
      "#32CD32", // Lime
      "#FF1493", // Deep Pink
      "#4169E1", // Royal Blue
    ];
    
    for (let i = 1; i <= numPlaceholders; i++) {
      const chromaId = effectiveSkinId * 1000 + i;
      const colorIndex = (i - 1) % defaultColors.length;
      chromas.push({
        id: chromaId,
        name: `Chroma ${i}`,
        imagePath: `/lol-game-data/assets/v1/champion-chroma-images/${championForImages}/${chromaId}.png`,
        selected: false,
        locked: true, // Assume locked unless we can verify ownership
        colors: [defaultColors[colorIndex]],
        primaryColor: defaultColors[colorIndex],
      });
    }

    log.debug(`[getChromaData] Created ${chromas.length} fallback chromas for skin ${effectiveSkinId}`);
    return chromas;
  }

  function createChromaPanel(skinData, chromas, buttonElement) {
    log.info(`[ChromaWheel] createChromaPanel called with ${chromas.length} chromas`);
    log.debug("createChromaPanel details:", { skinData, chromas, buttonElement });

    // Ensure button element exists and is valid before creating panel
    if (!buttonElement) {
      log.warn("[ChromaWheel] Cannot create panel: button element not provided");
      return;
    }

    // Verify button is visible
    const buttonVisible = buttonElement.offsetParent !== null && 
                         buttonElement.style.display !== "none" &&
                         buttonElement.style.opacity !== "0";
    if (!buttonVisible) {
      log.warn("[ChromaWheel] Cannot create panel: button element not visible");
      return;
    }

    // Remove existing panel if any
    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = PANEL_CLASS;
    panel.style.position = "fixed";
    panel.style.top = "0";
    panel.style.left = "0";
    panel.style.width = "100%";
    panel.style.height = "100%";
    panel.style.zIndex = "10000";
    panel.style.pointerEvents = "none"; // Panel container doesn't capture events, only flyout does
    // Only set default cursor if button isn't present - otherwise allow normal interaction
    if (!buttonElement || !buttonVisible) {
      panel.setAttribute("data-no-button", "true");
      panel.style.cursor = "default";
    }

    // Create flyout frame structure (or use simple div if custom elements don't work)
    let flyoutFrame;
    try {
      flyoutFrame = document.createElement("lol-uikit-flyout-frame");
      flyoutFrame.className = "flyout";
      flyoutFrame.setAttribute("orientation", "top");
      flyoutFrame.setAttribute("animated", "false");
      flyoutFrame.setAttribute("caretoffset", "undefined");
      flyoutFrame.setAttribute("borderless", "undefined");
      flyoutFrame.setAttribute("caretless", "undefined");
      flyoutFrame.setAttribute("show", "true");
    } catch (e) {
      log.debug("Could not create custom element, using div", e);
      flyoutFrame = document.createElement("div");
      flyoutFrame.className = "flyout";
    }

    // Set initial flyout frame styles to match official positioning
    flyoutFrame.style.position = "absolute";
    flyoutFrame.style.overflow = "visible";
    flyoutFrame.style.pointerEvents = "all";
    // Only set default cursor if button isn't present - otherwise allow normal interaction
    if (!buttonElement || !buttonVisible) {
      flyoutFrame.style.pointerEvents = "none";
      flyoutFrame.style.cursor = "default";
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
    // Set initial preview - use selected chroma if available, otherwise first chroma
    // This matches the official client behavior
    if (chromas.length > 0) {
      const selectedChroma = chromas.find(c => c.selected) || chromas[0];
      updateChromaPreview(selectedChroma, chromaImage, skinData);
    } else {
      // Hide the image element when no chromas are available
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

    // Create ul list for chroma buttons (matching official League structure)
    const chromaList = document.createElement("ul");
    chromaList.style.listStyle = "none";
    chromaList.style.margin = "0";
    chromaList.style.padding = "0";
    chromaList.style.display = "flex";
    chromaList.style.flexDirection = "row";
    chromaList.style.flexWrap = "wrap";
    chromaList.style.alignItems = "center";
    chromaList.style.justifyContent = "center";
    chromaList.style.gap = "0";
    chromaList.style.width = "100%";

    // Create chroma buttons as li elements (matching official League structure)
    let buttonCount = 0;
    chromas.forEach((chroma, index) => {
      const listItem = document.createElement("li");
      listItem.style.listStyle = "none";
      listItem.style.margin = "0";
      listItem.style.padding = "0";
      listItem.style.display = "flex";
      listItem.style.alignItems = "center";
      listItem.style.justifyContent = "center";

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
      
      // Check if this is the base/default skin button
      const isDefaultButton = chroma.name === "Default" && !chroma.primaryColor && !chroma.colors?.length;
      
      if (isDefaultButton) {
        // Base/default button: use the original gradient (beige with red stripe) - matching official League
        contents.style.background = "linear-gradient(135deg, #f0e6d2, #f0e6d2 48%, #be1e37 0, #be1e37 52%, #f0e6d2 0, #f0e6d2)";
        contents.style.backgroundSize = "cover";
        contents.style.backgroundPosition = "center";
        contents.style.backgroundRepeat = "no-repeat";
        log.debug(`[ChromaWheel] Button ${index + 1}: ${chroma.name} - using default gradient`);
      } else {
        // Chroma buttons: use chroma color if available, otherwise fall back to image
        const primaryColor = chroma.primaryColor || chroma.colors?.[1] || chroma.colors?.[0];
        if (primaryColor) {
          // Ensure color has # prefix
          const color = primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`;
          // Use solid background color (no gradient to avoid darkening)
          contents.style.backgroundColor = color;
          contents.style.background = color;
          log.debug(`[ChromaWheel] Button ${index + 1}: ${chroma.name} with color ${color}`);
        } else if (chroma.imagePath) {
          // Fall back to image if no color available
          contents.style.background = `url('${chroma.imagePath}')`;
          contents.style.backgroundSize = "cover";
          contents.style.backgroundPosition = "center";
          contents.style.backgroundRepeat = "no-repeat";
          log.debug(`[ChromaWheel] Button ${index + 1}: ${chroma.name} with image ${chroma.imagePath}`);
        } else {
          // Default fallback color if no color or image is available
          contents.style.background = "linear-gradient(135deg, #f0e6d2 0%, #f0e6d2 50%, #f0e6d2 50%, #f0e6d2 100%)";
          contents.style.backgroundSize = "cover";
          contents.style.backgroundPosition = "center";
          contents.style.backgroundRepeat = "no-repeat";
          log.debug(`[ChromaWheel] Button ${index + 1}: ${chroma.name} - no color or image, using default`);
        }
      }

      chromaButton.appendChild(contents);
      emberView.appendChild(chromaButton);
      listItem.appendChild(emberView);
      chromaList.appendChild(listItem);
      buttonCount++;

      // Add click handler
      if (!chroma.locked) {
        chromaButton.addEventListener("click", (e) => {
          e.stopPropagation();
          selectChroma(chroma, chromas, chromaImage, chromaButton, scrollable, skinData);
        });
      }

      // Add hover handlers to update preview (matching official client behavior)
      chromaButton.addEventListener("mouseenter", (e) => {
        e.stopPropagation();
        updateChromaPreview(chroma, chromaImage, skinData);
      });

      chromaButton.addEventListener("mouseleave", (e) => {
        e.stopPropagation();
        // Reset to currently selected chroma when not hovering
        const selectedChroma = chromas.find(c => c.selected);
        if (selectedChroma) {
          updateChromaPreview(selectedChroma, chromaImage, skinData);
        }
      });
    });

    log.info(`[ChromaWheel] Created ${buttonCount} chroma buttons in panel`);
    scrollable.appendChild(chromaList);

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

    // Find the flyout frame element inside the panel
    const flyoutFrame = panel.querySelector(".flyout");
    if (!flyoutFrame) {
      log.warn("Cannot position panel: flyout frame not found");
      return;
    }

    const rect = buttonElement.getBoundingClientRect();
    let flyoutRect = flyoutFrame.getBoundingClientRect();

    // If flyout hasn't been rendered yet, use estimated dimensions
    if (flyoutRect.width === 0) {
      flyoutRect = { width: 305, height: 420 };
    }

    // Calculate position relative to button to match official flyout positioning
    // Official flyout is positioned at top: 178px, left: 486.5px relative to the viewport
    // We need to position it relative to the button's position
    // The flyout should appear above the button, centered horizontally
    const buttonCenterX = rect.left + rect.width / 2;
    const flyoutLeft = buttonCenterX - flyoutRect.width / 2;

    // Position above the button with some spacing
    // Official positioning shows the flyout above the button
    // Adjusted 5px higher than default
    const flyoutTop = rect.top - flyoutRect.height - 15;

    // Set the flyout frame positioning to match official style
    // Official: position: absolute; overflow: visible; top: 178px; left: 486.5px;
    flyoutFrame.style.position = "absolute";
    flyoutFrame.style.overflow = "visible";
    flyoutFrame.style.top = `${Math.max(10, flyoutTop)}px`;
    flyoutFrame.style.left = `${Math.max(
      10,
      Math.min(flyoutLeft, window.innerWidth - flyoutRect.width - 10)
    )}px`;

    // Ensure panel container doesn't interfere with positioning
    panel.style.position = "fixed";
    panel.style.top = "0";
    panel.style.left = "0";
    panel.style.width = "100%";
    panel.style.height = "100%";
    panel.style.pointerEvents = "none";

    // Make flyout frame interactive
    flyoutFrame.style.pointerEvents = "all";

    log.debug("Flyout frame positioned", {
      top: flyoutFrame.style.top,
      left: flyoutFrame.style.left,
      buttonRect: rect,
      flyoutRect: flyoutRect,
    });
  }

  function updateChromaPreview(chroma, chromaImage, skinData) {
    // Update preview image - prioritize image path over color (matches official client)
    // The official client uses chroma preview images, not just color gradients
    let imagePath = chroma.imagePath;
    
    // For default/base chroma with no imagePath, try to construct one
    if (!imagePath && chroma.name === "Default" && chroma.id) {
      // Try to construct base skin preview path
      // Pattern: /lol-game-data/assets/v1/champion-chroma-images/{championId}/{skinId}.png
      const skinId = chroma.id;
      const championId = skinData?.championId || Math.floor(skinId / 1000);
      if (championId && skinId) {
        // Try base skin path (skinId with 000 suffix or just skinId)
        imagePath = `/lol-game-data/assets/v1/champion-chroma-images/${championId}/${skinId}.png`;
      }
    }
    
    if (imagePath) {
      // Use the chroma preview image (official client behavior)
      chromaImage.style.background = ""; // Clear any gradient
      chromaImage.style.backgroundImage = `url('${imagePath}')`;
      chromaImage.style.backgroundSize = "cover";
      chromaImage.style.backgroundPosition = "center";
      chromaImage.style.backgroundRepeat = "no-repeat";
      chromaImage.style.display = ""; // Show the element
    } else {
      // Fallback to color gradient if no image available
      const primaryColor = chroma.primaryColor || chroma.colors?.[1] || chroma.colors?.[0];
      if (primaryColor) {
        // Ensure color has # prefix
        const color = primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`;
        // Use gradient background matching official League style
        chromaImage.style.background = `linear-gradient(135deg, ${color} 0%, ${color} 50%, ${color} 50%, ${color} 100%)`;
        chromaImage.style.backgroundImage = ""; // Clear image if set
        chromaImage.style.display = ""; // Show the element
      } else {
        // For default/base chroma with no image or color, keep it visible but empty
        chromaImage.style.display = ""; // Keep it visible
        chromaImage.style.background = "";
        chromaImage.style.backgroundImage = "";
      }
    }
  }

  function selectChroma(
    chroma,
    allChromas,
    chromaImage,
    clickedButton,
    scrollable,
    skinData
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

    // Update preview image using the shared function
    updateChromaPreview(chroma, chromaImage, skinData);

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
    log.info("[ChromaWheel] toggleChromaPanel called");

    // Check if chroma button exists and is visible before allowing panel to open
    if (!buttonElement) {
      log.warn("[ChromaWheel] Cannot open panel: chroma button element not provided");
      return;
    }

    // Verify the button is actually visible and has chromas
    const buttonVisible = buttonElement.offsetParent !== null && 
                         buttonElement.style.display !== "none" &&
                         buttonElement.style.opacity !== "0";
    const hasChromas = skinMonitorState?.hasChromas || 
                      buttonElement._luLastVisibilityState === true;

    if (!buttonVisible || !hasChromas) {
      log.warn("[ChromaWheel] Cannot open panel: chroma button not visible or no chromas");
      return;
    }

    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
      log.info("[ChromaWheel] Closing existing panel");
      existingPanel.remove();
      return;
    }

    log.info("[ChromaWheel] Opening chroma panel...");
    log.debug("Extracting skin data...");
    let skinData = getCachedSkinData(skinItem);
    
    // If we couldn't extract skin data from DOM, use the skin state data we have
    if (!skinData || !extractSkinIdFromData(skinData)) {
      log.info("[ChromaWheel] Could not extract skin data from DOM, using skin state data");
      if (skinMonitorState && skinMonitorState.skinId) {
        skinData = {
          id: skinMonitorState.skinId,
          skinId: skinMonitorState.skinId,
          championId: skinMonitorState.championId,
          name: skinMonitorState.name,
        };
        log.info("[ChromaWheel] Using skin state data:", { 
          skinId: skinData.skinId,
          championId: skinData.championId,
          name: skinData.name 
        });
      } else {
        log.warn("[ChromaWheel] Could not extract skin data from skin item and no skin state available", skinItem);
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
    } else {
      log.info("[ChromaWheel] Skin data extracted from DOM:", { 
        skinId: extractSkinIdFromData(skinData),
        championId: skinData?.championId,
        name: skinData?.name 
      });
    }

    log.info("[ChromaWheel] Getting chroma data...");
    
    // Ensure champion data is fetched before getting chromas
    const championId = getChampionIdFromContext(skinData, extractSkinIdFromData(skinData), skinItem);
    log.info(`[ChromaWheel] Champion ID: ${championId}, Cache has data: ${championId ? championSkinCache.has(championId) : 'N/A'}`);
    if (championId) {
      // Check if fetch is already in progress
      const fetchInProgress = pendingChampionRequests.has(championId);
      
      if (!championSkinCache.has(championId)) {
        if (fetchInProgress) {
          log.debug(`Champion ${championId} data fetch already in progress, waiting...`);
          // Wait for existing fetch to complete
          pendingChampionRequests.get(championId).then(() => {
            const chromas = getChromaData(skinData);
            log.debug("Chromas found after waiting for fetch:", chromas);
            if (chromas.length === 0) {
              log.warn("No chromas found after fetch completed, using fallback");
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
            createChromaPanel(skinData, chromas, buttonElement);
          }).catch((err) => {
            log.warn("Failed while waiting for champion data, using available chromas", err);
            const chromas = getChromaData(skinData);
            if (chromas.length === 0) {
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
            } else {
              createChromaPanel(skinData, chromas, buttonElement);
            }
          });
          return; // Exit early, will create panel in promise callback
        }
        
        log.debug(`Champion ${championId} data not cached, fetching...`);
        fetchChampionSkinData(championId).then(() => {
        // Retry getting chromas after fetch completes
        const chromas = getChromaData(skinData);
        log.debug("Chromas found after fetch:", chromas);
        if (chromas.length === 0) {
          log.warn("No chromas found for this skin after fetch, creating with default");
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
        log.debug("Creating chroma panel with fetched chromas...");
        createChromaPanel(skinData, chromas, buttonElement);
        log.info("Chroma panel opened successfully");
      }).catch((err) => {
        log.warn("Failed to fetch champion data, using available chromas", err);
        const chromas = getChromaData(skinData);
        if (chromas.length === 0) {
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
        } else {
          createChromaPanel(skinData, chromas, buttonElement);
        }
      });
      return; // Exit early, will create panel in promise callback
      }
    }
    
    const chromas = getChromaData(skinData);
    log.info(`[ChromaWheel] Chromas found: ${chromas.length} total`);
    log.info("[ChromaWheel] Chroma details:", chromas.map(c => ({ 
      id: c.id, 
      name: c.name, 
      hasColor: !!c.primaryColor, 
      color: c.primaryColor,
      hasImage: !!c.imagePath,
      locked: c.locked 
    })));

    if (chromas.length === 0) {
      log.warn("[ChromaWheel] No chromas found for this skin, creating with default");
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

    log.info(`[ChromaWheel] Creating chroma panel with ${chromas.length} chromas...`);
    createChromaPanel(skinData, chromas, buttonElement);
    log.info(`[ChromaWheel] Chroma panel opened successfully with ${chromas.length} chroma buttons`);
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

    // Return cleanup function
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }

  function subscribeToSkinMonitor() {
    if (typeof window === "undefined") {
      return;
    }

    if (window.__leagueUnlockedSkinState) {
      skinMonitorState = window.__leagueUnlockedSkinState;
      
      // Proactively fetch champion data if initial state has chromas
      if (skinMonitorState && skinMonitorState.hasChromas && skinMonitorState.championId && skinMonitorState.skinId) {
        const championId = skinMonitorState.championId;
        if (!championSkinCache.has(championId)) {
          log.info(`[ChromaWheel] Proactively fetching champion ${championId} data for initial skin ${skinMonitorState.skinId} with chromas`);
          fetchChampionSkinData(championId).then(() => {
            log.info(`[ChromaWheel] Successfully fetched champion ${championId} data (initial)`);
          }).catch((err) => {
            log.warn(`[ChromaWheel] Failed to proactively fetch champion ${championId} data (initial)`, err);
          });
        } else {
          log.info(`[ChromaWheel] Champion ${championId} data already cached (initial), skipping fetch`);
        }
      }
    }

    try {
      scanSkinSelection();
    } catch (e) {
      log.debug("Initial scan after skin state preload failed", e);
    }

    window.addEventListener("lu-skin-monitor-state", (event) => {
      const detail = event?.detail;
      emitBridgeLog("skin_state_update", detail || {});
      const prevState = skinMonitorState;
      skinMonitorState = detail || null;
      
      // Proactively fetch champion data when a skin with chromas is detected
      if (detail && detail.hasChromas && detail.championId && detail.skinId) {
        const championId = detail.championId;
        const skinId = detail.skinId;
        
        // Only fetch if champion data isn't cached yet, or if skin changed
        const shouldFetch = !championSkinCache.has(championId) || 
                           (prevState && prevState.skinId !== skinId);
        
        if (shouldFetch) {
          log.info(`[ChromaWheel] Proactively fetching champion ${championId} data for skin ${skinId} with chromas`);
          fetchChampionSkinData(championId).then(() => {
            log.info(`[ChromaWheel] Successfully fetched champion ${championId} data`);
            // Trigger a rescan to update button visibility if needed
            try {
              scanSkinSelection();
            } catch (e) {
              log.debug("scanSkinSelection failed after champion fetch", e);
            }
          }).catch((err) => {
            log.warn(`[ChromaWheel] Failed to proactively fetch champion ${championId} data`, err);
          });
        } else {
          log.info(`[ChromaWheel] Champion ${championId} data already cached, skipping proactive fetch`);
        }
      }
      
      try {
        scanSkinSelection();
      } catch (e) {
        log.debug("scanSkinSelection failed after state update", e);
      }
    });
  }

  function init() {
    if (!document || !document.head) {
      requestAnimationFrame(init);
      return;
    }

    subscribeToSkinMonitor();
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
