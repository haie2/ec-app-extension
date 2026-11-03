const TYPOGRAPHY_PROPS = ["font-size", "font-weight", "text-transform", "font-style", "text-decoration", "line-height", "letter-spacing"];
const typographyCss = (value, fontImports) => {
  if (!value) return "";
  let css = "";
  const family = value["font-family"];
  if (typeof family === "string" && family) {
    css += `font-family:"${family}", sans-serif;`;
  } else if (family && typeof family === "object") {
    if (family.name) css += `font-family:"${family.name}", sans-serif;`;
    if (family.value && fontImports) ;
  }
  for (const prop of TYPOGRAPHY_PROPS) {
    const v = value[prop];
    if (v !== void 0 && v !== null && v !== "") css += `${prop}:${v};`;
  }
  return css;
};
const isBrowser = typeof window !== "undefined" && typeof HTMLElement !== "undefined";
const readJsonAttribute = (element, name) => {
  const raw = element.getAttribute(name);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    console.error(
      `[${element.tagName?.toLowerCase() || "widget"}] attribute \`${name}\` is not valid JSON (${raw.length} chars) — falling back to an empty object:`,
      err.message
    );
    return null;
  }
};
const readBuilderMode = (element) => element.getAttribute("is-builder-mode") === "true" || element.getAttribute("isbuildermode") !== null;
const writeBuilderMode = (element, value) => {
  if (!isBrowser) return;
  if (value === false || value === null || value === void 0) {
    element.removeAttribute("is-builder-mode");
  } else {
    element.setAttribute("is-builder-mode", String(value));
  }
};
const readEcBuilder = (element) => element.getAttribute("is-ec-builder") === "true" || element.getAttribute("isecbuilder") !== null;
const readWidgetId = (element) => element.getAttribute("widget-id") || element.getAttribute("widgetId");
const guardBuilderNavigation = (element) => {
  if (!readBuilderMode(element) || element._navGuardAttached || !element.shadowRoot) return;
  element._navGuardAttached = true;
  element.shadowRoot.addEventListener("click", (event) => {
    const nav = event.target?.closest?.("a[href], button[type='submit'], [type='submit']");
    if (nav) event.preventDefault();
  }, true);
};
const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
const formatMoney = (element, cents) => {
  if (typeof window?.CRO_HUB?.formatMoney === "function") return window.CRO_HUB.formatMoney(cents);
  const amount = Number(cents) / 100;
  const currency = element.getAttribute("currency");
  if (currency) {
    try {
      return new Intl.NumberFormat(void 0, { style: "currency", currency }).format(amount);
    } catch {
      return "$" + amount.toFixed(2);
    }
  }
  return "$" + amount.toFixed(2);
};
const formatHandle = (handle) => (handle || "").split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
const TEMPLATE_TOKEN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const DEFAULT_LOCALE = "en";
const getLocalization = () => {
  const localization = isBrowser && window.CRO_LOCALIZATION || {};
  const primaryLocale = localization.primaryLocale || DEFAULT_LOCALE;
  const currentLocale = localization.currentLocale || primaryLocale;
  const availableLocales = Array.isArray(localization.availableLocales) ? localization.availableLocales : [];
  return { currentLocale, primaryLocale, availableLocales };
};
const isText = (text) => typeof text === "string";
const isFilledText = (text) => isText(text) && text !== "";
const resolveLocaleValue = (value, fallback = "") => {
  if (value === void 0 || value === null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value !== "object" || Array.isArray(value)) return fallback;
  const { currentLocale, primaryLocale, availableLocales } = getLocalization();
  if (isFilledText(value[currentLocale])) return value[currentLocale];
  if (isFilledText(value[primaryLocale])) return value[primaryLocale];
  const storeLocales = availableLocales.length > 0 ? availableLocales : Object.keys(value);
  const storeTexts = storeLocales.map((locale) => value[locale]).filter(isText);
  if (storeTexts.length > 0) return storeTexts.find(isFilledText) ?? "";
  if (isFilledText(value[DEFAULT_LOCALE])) return value[DEFAULT_LOCALE];
  const savedTexts = Object.values(value).filter(isText);
  return savedTexts.length > 0 && !savedTexts.some(isFilledText) ? "" : fallback;
};
const fillTextTemplate = (template, replacements = {}) => String(template).replace(
  TEMPLATE_TOKEN,
  (match, key) => Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key] ?? "") : match
);
const resolveTextTemplate = (value, replacements = {}, fallback = "") => fillTextTemplate(resolveLocaleValue(value, fallback), replacements);
const fixedBundleStyles = '*,\n*::before,\n*::after {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n}\n\n:host {\n    display: block;\n    width: 100%;\n}\n\n:host([data-editing]) {\n    position: relative;\n    z-index: 2147483000;\n}\n\nbutton,\nselect,\ninput {\n    font: inherit;\n    color: inherit;\n}\n\n.cro-fbw {\n\n    --cro-fg: #17191c;\n    --cro-muted: #71767c;\n    --cro-bg: #ffffff;\n    --cro-surface: #f6f7f8;\n    --cro-line-2: #cfd2d5;\n    --cro-faint: color-mix(in srgb, var(--cro-fg) 45%, var(--cro-bg));\n    --cro-line: color-mix(in srgb, var(--cro-border-subtle) 45%, transparent);\n    --cro-sel: #17191c;\n    --cro-sel-fg: #ffffff;\n    --cro-cta-bg: #17191c;\n    --cro-cta-fg: #ffffff;\n    --cro-arrow-bg: #ffffff;\n    --cro-arrow-fg: #17191c;\n    --cro-save-color: #BB0606;\n    --cro-border-subtle: #00000033;\n    --cro-header-bg: var(--cro-surface);\n    --cro-header-fg: var(--cro-muted);\n    --cro-note: #000000;\n    --cro-badge-bg: var(--cro-sel);\n    --cro-badge-fg: var(--cro-sel-fg);\n\n    --cro-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n    --cro-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n    --cro-fs-base: 16px;\n    --cro-fs-xl: calc(var(--cro-fs-base) * 1.25);\n    --cro-fs-lg: calc(var(--cro-fs-base) * 1.125);\n    --cro-fs-md: calc(var(--cro-fs-base) * 0.875);\n    --cro-fs-sm: calc(var(--cro-fs-base) * 0.75);\n    --cro-fs-xs: calc(var(--cro-fs-base) * 0.625);\n\n    --cro-fw-medium: 500;\n    --cro-fw-semibold: 600;\n    --cro-fw-bold: 700;\n\n    --cro-lh-base: 1;\n    --cro-lh-text: 1.35;\n    --cro-ls-flat: 0;\n\n    --cro-card-title-fs: var(--cro-fs-md);\n    --cro-card-price-fs: var(--cro-fs-md);\n    --cro-cta-fs: var(--cro-fs-lg);\n    --cro-control-fs: var(--cro-fs-sm);\n    --cro-badge-fs: var(--cro-fs-xs);\n    --cro-badge-tracking: .04em;\n    --cro-badge-case: uppercase;\n    --cro-header-align: center;\n\n    --cro-radius: 10px;\n    --cro-radius-sm: 4px;\n    --cro-radius-md: 8px;\n    --cro-radius-full: 50%;\n    --cro-card-radius: 12px;\n    --cro-image-radius: var(--cro-radius-sm);\n    --cro-badge-radius: 5px;\n    --cro-btn-radius: var(--cro-radius-md);\n    --cro-control-radius: 7px;\n    --cro-container-border-w: 2px;\n    --cro-inner-radius: max(0px, calc(var(--cro-radius) - var(--cro-container-border-w)));\n    --cro-card-border-w: 1px;\n    --cro-divider-w: 1px;\n\n    --cro-space: 8px;\n    --cro-container-margin: 0px;\n    --cro-content-padding: 20px;\n    --cro-header-pad: 16px;\n    --cro-row-pad: 18px;\n    --cro-grid-gap: 12px;\n    --cro-slide-gap: 10px;\n    --cro-card-pad: 5px;\n    --cro-card-body-pad: 10px;\n    --cro-card-body-gap: 12px;\n    --cro-foot-gap: 12px;\n    --cro-foot-pad: 12px 20px;\n    --cro-cta-pad: 19px;\n    --cro-cta-gap: 8px;\n    --cro-cta-min-h: 52px;\n    --cro-badge-pad: 3px 8px;\n    --cro-control-pad: 8px 10px;\n    --cro-sheet-pad: 14px;\n    --cro-change-pad: 10px;\n\n    --cro-card-min-w: 200px;\n    --cro-slide-card-w: 262px;\n    --cro-img-ratio: 200 / 180;\n    --cro-img-h-w: 105px;\n    --cro-img-h-h: 124px;\n    --cro-qty-size: 27px;\n    --cro-thumb-size: 31px;\n    --cro-chevron-size: 24px;\n    --cro-chevron-icon: 14px;\n    --cro-arrow-size: 30px;\n    --cro-arrow-offset: 0;\n    --cro-arrow-shadow: 0 1px 3px rgba(0, 0, 0, .12);\n    --cro-control-h: 40px;\n    --cro-radio-dot: 15px;\n    --cro-option-min-w: 92px;\n    --cro-spinner-size: 15px;\n\n    position: relative;\n    container-type: inline-size;\n    width: 100%;\n    min-width: min(100%, 320px);\n    margin: var(--cro-container-margin);\n    background-color: var(--cro-bg);\n    color: var(--cro-fg);\n    border-radius: var(--cro-radius);\n    border: var(--cro-container-border-w) solid var(--cro-border-subtle);\n    font-family: var(--cro-font);\n    line-height: var(--cro-lh-base);\n}\n\n.cro-fbw__list {\n    display: flex;\n    flex-direction: column;\n}\n\n.cro-fbw__bundle+.cro-fbw__bundle::before {\n    content: "";\n    display: block;\n    border-top: var(--cro-divider-w) solid var(--cro-border-subtle);\n    margin-inline: var(--cro-content-padding);\n}\n\n.cro-fbw__head {\n    width: 100%;\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    background: none;\n    border: 0;\n    text-align: start;\n    cursor: pointer;\n    color: inherit;\n    padding: var(--cro-row-pad) var(--cro-content-padding);\n    margin-bottom: 13px;\n}\n\n.cro-fbw__head--static {\n    cursor: default;\n}\n\n.cro-fbw__head-copy {\n    flex: 1;\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    gap: 9px;\n}\n\n.cro-fbw__bundle-title-wrapper {\n    display: flex;\n    align-items: center;\n    gap: 9px;\n    flex-wrap: wrap;\n}\n\n.cro-fbw__bundle-title {\n    font-size: var(--cro-fs-lg);\n    font-weight: var(--cro-fw-medium);\n    letter-spacing: -.02em;\n    overflow-wrap: anywhere;\n}\n\na.cro-fbw__bundle-title {\n    color: inherit;\n    text-decoration: none;\n    cursor: pointer;\n}\n\na.cro-fbw__bundle-title:hover {\n    text-decoration: underline;\n}\n\n.cro-fbw__flag {\n    font-size: var(--cro-badge-fs);\n    font-weight: var(--cro-fw-bold);\n    text-transform: var(--cro-badge-case);\n    letter-spacing: var(--cro-badge-tracking);\n    color: var(--cro-badge-fg);\n    background: var(--cro-badge-bg);\n    border-radius: var(--cro-badge-radius);\n    padding: var(--cro-badge-pad);\n}\n\n.cro-fbw__price {\n    text-align: end;\n    flex: none;\n    display: flex;\n    flex-direction: column;\n    align-items: flex-end;\n    gap: 11px;\n}\n\n.cro-fbw__price-now {\n    white-space: nowrap;\n    font-size: var(--cro-fs-lg);\n    font-weight: var(--cro-fw-medium);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__price-was {\n    white-space: nowrap;\n    font-size: var(--cro-fs-md);\n    color: var(--cro-muted);\n    text-decoration: line-through;\n    font-weight: var(--cro-fw-medium);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__save {\n    font-size: var(--cro-fs-sm);\n    color: var(--cro-save-color);\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__bundle--unavailable .cro-fbw__bundle-title,\n.cro-fbw__bundle--unavailable .cro-fbw__price {\n    opacity: .5;\n}\n\n.cro-fbw__panel[hidden] {\n    display: none;\n}\n\n.cro-fbw__panel {\n    padding: 0 var(--cro-content-padding);\n}\n\n.cro-fbw__panel:not(:has(> .cro-fbw__foot)) {\n    padding-bottom: var(--cro-content-padding);\n}\n\n.cro-fbw__img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    display: block;\n}\n\n.cro-fbw__img--ph {\n    background: var(--cro-surface);\n}\n\n.cro-fbw__qty {\n    position: absolute;\n    top: 8px;\n    inset-inline-end: 8px;\n    min-width: var(--cro-qty-size);\n    height: var(--cro-qty-size);\n    padding: 9px;\n    border-radius: var(--cro-radius-sm);\n    background: var(--cro-fg);\n    color: var(--cro-bg);\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-semibold);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.cro-fbw__name {\n    font-size: var(--cro-card-title-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-text);\n    display: -webkit-box;\n    -webkit-line-clamp: 2;\n    -webkit-box-orient: vertical;\n    overflow: hidden;\n    color: var(--cro-fg);\n}\n\na.cro-fbw__name {\n    text-decoration: none;\n}\n\na.cro-fbw__name:hover {\n    text-decoration: underline;\n}\n\n.cro-fbw__card-price {\n    font-size: var(--cro-card-price-fs);\n    line-height: var(--cro-lh-base);\n}\n\n.cro-fbw__card-was {\n    white-space: nowrap;\n    color: var(--cro-muted);\n    text-decoration: line-through;\n    margin-inline-end: 6px;\n    font-size: var(--cro-card-price-fs);\n}\n\n.cro-fbw__card-now {\n    white-space: nowrap;\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__variant {\n    font-size: var(--cro-fs-sm);\n    color: var(--cro-muted);\n    line-height: var(--cro-lh-text);\n    display: -webkit-box;\n    -webkit-line-clamp: 2;\n    -webkit-box-orient: vertical;\n    font-weight: 400;\n    overflow: hidden;\n}\n\n.cro-fbw__ico {\n    width: 14px;\n    height: 14px;\n}\n\n.cro-fbw__oos {\n    margin-top: 8px;\n    font-family: var(--cro-mono);\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-bold);\n    color: var(--cro-muted);\n}\n\n.cro-fbw__foot {\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-foot-gap);\n    padding-block: var(--cro-foot-pad);\n}\n\n.cro-fbw__cta {\n    width: 100%;\n    min-height: var(--cro-cta-min-h);\n    border: 0;\n    border-radius: var(--cro-btn-radius);\n    padding: var(--cro-cta-pad);\n\n    background: var(--cro-cta-bg);\n    color: var(--cro-cta-fg);\n    font-size: var(--cro-cta-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-base);\n    letter-spacing: var(--cro-ls-flat);\n\n    cursor: pointer;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: var(--cro-cta-gap);\n}\n\n.cro-fbw__cta:not([disabled]):hover {\n    opacity: .90;\n}\n\n.cro-fbw__sheet-close:hover {\n    background: var(--cro-line-2);\n}\n\n.cro-fbw__cta[disabled] {\n    cursor: not-allowed;\n}\n\n.cro-fbw__cta--unavailable {\n    opacity: .5;\n}\n\n.cro-fbw__cta--loading {\n    opacity: .8;\n}\n\n.cro-fbw__cta--success {\n    background: var(--cro-bg);\n    color: var(--cro-fg);\n    border: 1.5px solid var(--cro-sel);\n}\n\n.cro-fbw__spinner {\n    width: var(--cro-spinner-size);\n    height: var(--cro-spinner-size);\n    border: 2px solid color-mix(in srgb, var(--cro-cta-fg) 35%, transparent);\n    border-top-color: var(--cro-cta-fg);\n    border-radius: var(--cro-radius-full);\n    animation: cro-fbw-spin .7s linear infinite;\n}\n\n@keyframes cro-fbw-spin {\n    to {\n        transform: rotate(360deg);\n    }\n}\n\n.cro-fbw__note {\n    font-size: var(--cro-fs-md);\n    text-align: center;\n    color: var(--cro-note);\n    line-height: var(--cro-lh-base);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__note-save {\n    white-space: nowrap;\n    color: var(--cro-save-color);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-base);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__editor {\n    position: absolute;\n    inset: 0;\n    z-index: 30;\n}\n\n.cro-fbw__editor[hidden] {\n    display: none;\n}\n\n.cro-fbw__backdrop {\n    position: absolute;\n    inset: 0;\n    background: transparent;\n    border-radius: var(--cro-inner-radius);\n}\n\n.cro-fbw__sheet {\n    position: absolute;\n    left: var(--cro-pop-left, 16px);\n    top: var(--cro-pop-top, 60px);\n    width: var(--cro-pop-w, 288px);\n    max-height: var(--cro-pop-max-h, 86%);\n    display: flex;\n    flex-direction: column;\n    overflow: hidden;\n    background: var(--cro-bg);\n    border: 1px solid var(--cro-line-2);\n    border-radius: var(--cro-radius);\n    padding: var(--cro-sheet-pad);\n    box-shadow: 0 12px 34px rgba(0, 0, 0, .22);\n}\n\n.cro-fbw__sheet-head {\n    flex: none;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n    margin-bottom: 8px;\n}\n\n.cro-fbw__sheet-body {\n    flex: 1 1 auto;\n    min-height: 0;\n    overflow: auto;\n}\n\n.cro-fbw__sheet-title {\n    margin: 0;\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__sheet-close {\n    border: 0;\n    background: var(--cro-surface);\n    width: 30px;\n    height: 30px;\n    border-radius: var(--cro-radius-md);\n    cursor: pointer;\n    font-size: 16px;\n    color: var(--cro-fg);\n    flex: none;\n}\n\n.cro-fbw__opt {\n    margin-top: 10px;\n    border: 0;\n    padding: 0;\n}\n\n.cro-fbw__opt-label {\n    width: 100%;\n    background: var(--cro-bg);\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-bold);\n    color: var(--cro-muted);\n    text-transform: uppercase;\n    letter-spacing: .04em;\n    padding-bottom: 6px;\n    display: block;\n}\n\n.cro-fbw__opt--many .cro-fbw__opt-label {\n    position: sticky;\n    top: 0;\n    z-index: 1;\n}\n\n.cro-fbw__radios {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(var(--cro-option-min-w), 1fr));\n    gap: 6px;\n}\n\n.cro-fbw__radio {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    border: 1px solid var(--cro-line-2);\n    border-radius: var(--cro-control-radius);\n    padding: var(--cro-control-pad);\n    min-height: var(--cro-control-h);\n    cursor: pointer;\n    background: var(--cro-bg);\n    font-size: var(--cro-control-fs);\n}\n\n.cro-fbw__radio:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw__radio-input {\n    position: absolute;\n    opacity: 0;\n    width: 0;\n    height: 0;\n}\n\n.cro-fbw__radio-dot {\n    width: var(--cro-radio-dot);\n    height: var(--cro-radio-dot);\n    border-radius: var(--cro-radius-full);\n    box-shadow: inset 0 0 0 1.5px var(--cro-line-2);\n    flex: none;\n    display: grid;\n    place-items: center;\n}\n\n.cro-fbw__radio:has(.cro-fbw__radio-input:checked) {\n    border-color: var(--cro-sel);\n    background: var(--cro-surface);\n}\n\n.cro-fbw__radio:has(.cro-fbw__radio-input:checked) .cro-fbw__radio-dot {\n    box-shadow: inset 0 0 0 1.5px var(--cro-sel);\n    background: radial-gradient(circle at center,\n            var(--cro-sel) 0 calc(var(--cro-radio-dot) * .235),\n            transparent calc(var(--cro-radio-dot) * .235));\n}\n\n.cro-fbw__radio:has(.cro-fbw__radio-input:checked) .cro-fbw__radio-text {\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__radio--sold {\n    opacity: .4;\n    cursor: not-allowed;\n}\n\n.cro-fbw__radio--sold .cro-fbw__radio-text {\n    text-decoration: line-through;\n}\n\n.cro-fbw__head:focus-visible,\n.cro-fbw__change:focus-visible,\n.cro-fbw__cta:focus-visible,\n.cro-fbw__arrow:focus-visible,\n.cro-fbw__radio:has(:focus-visible),\n.cro-fbw__sheet-close:focus-visible {\n    outline: 2px solid var(--cro-fg);\n    outline-offset: 2px;\n}\n\n@container (max-width:430px) {\n    .cro-fbw__radios {\n        grid-template-columns: 1fr 1fr;\n    }\n}\n\n@media (prefers-reduced-motion:reduce) {\n\n    *,\n    *::before,\n    *::after {\n        transition: none !important;\n        animation: none !important;\n        scroll-behavior: auto !important;\n    }\n}\n\n.cro-fbw__sk {\n    display: inline-block;\n    border-radius: 6px;\n    vertical-align: middle;\n    opacity: .85;\n    background: linear-gradient(90deg, #e9eaed 25%, #f3f4f6 37%, #e9eaed 63%);\n    background-size: 400% 100%;\n    animation: cro-fbw-sk 1.2s ease infinite\n}\n\n@keyframes cro-fbw-sk {\n    0% {\n        background-position: 100% 0\n    }\n\n    100% {\n        background-position: 0 0\n    }\n}\n\n.cro-fbw__sheet,\n.cro-fbw__sheet-body {\n    scrollbar-width: thin;\n    scrollbar-color: rgba(0, 0, 0, .28) transparent\n}\n\n.cro-fbw__sheet::-webkit-scrollbar,\n.cro-fbw__sheet-body::-webkit-scrollbar {\n    width: 3px;\n    height: 3px\n}\n\n.cro-fbw__sheet::-webkit-scrollbar-thumb,\n.cro-fbw__sheet-body::-webkit-scrollbar-thumb {\n    background: rgba(0, 0, 0, .28);\n    border-radius: 9px\n}\n\n.cro-fbw__sheet::-webkit-scrollbar-track,\n.cro-fbw__sheet-body::-webkit-scrollbar-track {\n    background: transparent\n}\n\n.cro-fbw__head-copy {\n    min-width: 0\n}\n\n.cro-fbw__bundle-title-wrapper {\n    display: flex;\n    align-items: center;\n    flex-wrap: nowrap;\n    min-width: 0\n}\n\n.cro-fbw__bundle-title-wrapper .cro-fbw__chevron-wrap,\n.cro-fbw__bundle-title-wrapper .cro-fbw__flag {\n    flex-shrink: 0\n}\n\n.cro-fbw__bundle-title {\n    min-width: 0;\n    display: -webkit-box;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 2;\n    line-clamp: 2;\n    overflow: hidden;\n    line-height: var(--cro-lh-text);\n}\n\n.cro-fbw__picker {\n    position: relative;\n    display: inline-flex;\n    align-self: flex-start;\n    width: min(100%, calc(var(--cro-option-min-w) * 1.5));\n    height: calc(var(--cro-control-h) * .75);\n}\n\n.cro-fbw__picker--multi {\n    width: auto;\n    min-width: min(100%, calc(var(--cro-option-min-w) * 1.5));\n    max-width: min(100%, calc(var(--cro-option-min-w) * 3));\n}\n\n.cro-fbw__picker--multi .cro-fbw__picker-input {\n    width: auto;\n    min-width: 100%;\n    max-width: 100%;\n}\n\n.cro-fbw__picker-input {\n    display: flex;\n    align-items: center;\n    width: 100%;\n    height: 100%;\n    padding-block: 0;\n    padding-inline: 9px 24px;\n    overflow: hidden;\n    appearance: none;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    color: var(--cro-fg);\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    line-height: var(--cro-lh-base);\n    text-align: start;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    transition: border-color .15s ease;\n}\n\n.cro-fbw__picker-input:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw__picker-input:focus-visible {\n    outline: 2px solid var(--cro-sel);\n    outline-offset: 1px;\n}\n\n.cro-fbw__picker-label {\n    min-width: 0;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.cro-fbw__picker--unavailable .cro-fbw__picker-input {\n    border-color: var(--cro-save-color);\n}\n\n.cro-fbw__caret {\n    position: absolute;\n    top: 50%;\n    inset-inline-end: 9px;\n    width: 8px;\n    height: 5px;\n    transform: translateY(-50%);\n    pointer-events: none;\n    color: var(--cro-muted);\n}\n\n.cro-fbw__row {\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    padding: 10px 0;\n}\n\n.cro-fbw__row + .cro-fbw__row {\n    border-top: 1px solid var(--cro-line);\n}\n\n.cro-fbw__row--unavailable {\n    opacity: .7;\n}\n\n.cro-fbw__row-media {\n    position: relative;\n    flex: none;\n    width: calc(var(--cro-img-h-w) * .5);\n    height: calc(var(--cro-img-h-h) * .5);\n    border-radius: var(--cro-image-radius);\n    border: 1px solid var(--cro-line);\n    background: var(--cro-surface);\n    overflow: hidden;\n}\n\n.cro-fbw__row-media .cro-fbw__qty {\n    top: 4px;\n    inset-inline-end: 4px;\n    min-width: calc(var(--cro-qty-size) * .67);\n    height: calc(var(--cro-qty-size) * .67);\n    padding: 0 5px;\n    font-size: var(--cro-fs-xs);\n}\n\n.cro-fbw__row-info {\n    flex: 1;\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    gap: 5px;\n}\n\n.cro-fbw__row-info .cro-fbw__name {\n    -webkit-line-clamp: 1;\n}\n\n.cro-fbw__row-end {\n    flex: none;\n    display: flex;\n    flex-direction: column;\n    align-items: flex-end;\n    gap: 4px;\n    text-align: end;\n}\n\n.cro-fbw__row-info .cro-fbw__oos {\n    margin-top: 0;\n}\n\n@container (max-width: 430px) {\n    .cro-fbw__row {\n        align-items: flex-start;\n        gap: 10px;\n    }\n}\n';
const headerStyles = '.cro-fbw__header {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 19px;\n    padding: var(--cro-header-pad);\n    background: var(--cro-header-bg);\n    border-radius: var(--cro-inner-radius) var(--cro-inner-radius) 0 0;\n}\n\n.cro-fbw__header::before,\n.cro-fbw__header::after {\n    content: "";\n    flex: none;\n    width: 37px;\n    height: 1px;\n    background: var(--cro-header-fg);\n}\n\n.cro-fbw__header-text {\n    text-align: center;\n    color: var(--cro-header-fg);\n    font-size: var(--cro-fs-xl);\n    font-weight: var(--cro-fw-semibold);\n    letter-spacing: .04em;\n    text-transform: uppercase;\n}\n\n.cro-fbw__header--ribbon::before,\n.cro-fbw__header--ribbon::after,\n.cro-fbw__header--notch::before,\n.cro-fbw__header--notch::after,\n.cro-fbw__header--tab::before,\n.cro-fbw__header--tab::after,\n.cro-fbw__header--arrow::before,\n.cro-fbw__header--arrow::after {\n    content: none;\n}\n\n.cro-fbw__header--ribbon .cro-fbw__header-text,\n.cro-fbw__header--notch .cro-fbw__header-text,\n.cro-fbw__header--tab .cro-fbw__header-text,\n.cro-fbw__header--arrow .cro-fbw__header-text {\n    color: inherit;\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-bold);\n    letter-spacing: .06em;\n    line-height: 1.3;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw__header-icon {\n    width: 18px;\n    height: 18px;\n    flex: none;\n}\n\n.cro-fbw__header-sub {\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-medium);\n    line-height: 1.3;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw__header--ribbon {\n    flex-wrap: wrap;\n    gap: 6px 10px;\n    min-height: 44px;\n    padding: max(6px, calc(var(--cro-header-pad) - 6px)) var(--cro-content-padding);\n    background: var(--cro-sel);\n    color: var(--cro-sel-fg);\n    text-align: center;\n}\n\n.cro-fbw__header-main {\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    min-width: 0;\n}\n\n.cro-fbw__header-sep {\n    flex: none;\n    width: 4px;\n    height: 4px;\n    border-radius: var(--cro-radius-full);\n    background: currentColor;\n    opacity: .5;\n}\n\n.cro-fbw__header--ribbon .cro-fbw__header-sub {\n    opacity: .85;\n}\n\n.cro-fbw:has(> .cro-fbw__header--notch) {\n    margin-top: 18px;\n}\n\n.cro-fbw__header--notch {\n    margin-top: calc(-15px - var(--cro-container-border-w) / 2);\n    margin-bottom: 8px;\n    padding: 0 var(--cro-content-padding);\n    background: none;\n    border-radius: 0;\n}\n\n.cro-fbw__header-pill {\n    max-width: 100%;\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    padding: 7px 16px;\n    border-radius: var(--cro-btn-radius);\n    background: var(--cro-sel);\n    color: var(--cro-sel-fg);\n    text-align: center;\n}\n\n.cro-fbw__header-pill .cro-fbw__header-icon {\n    width: 14px;\n    height: 14px;\n}\n\n.cro-fbw__header--notch .cro-fbw__header-text {\n    font-size: var(--cro-fs-sm);\n    line-height: 16px;\n}\n\n.cro-fbw:has(> .cro-fbw__header--tab) {\n    margin-top: 38px;\n    border-start-start-radius: 0;\n}\n\n.cro-fbw__header--tab {\n    position: absolute;\n    z-index: 1;\n    bottom: 100%;\n    inset-inline-start: calc(-1 * var(--cro-container-border-w));\n    max-width: calc(100% - 32px);\n    min-height: 40px;\n    gap: 8px;\n    padding: 8px 18px;\n    background: var(--cro-sel);\n    color: var(--cro-sel-fg);\n    border: var(--cro-container-border-w) solid var(--cro-sel);\n    border-bottom: 0;\n    border-radius: var(--cro-radius) var(--cro-radius) 0 0;\n}\n\n.cro-fbw__header--tab .cro-fbw__header-text {\n    min-width: 0;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    letter-spacing: 0;\n    text-transform: none;\n    unicode-bidi: plaintext;\n}\n\n.cro-fbw__header--arrow {\n    justify-content: flex-start;\n    align-items: stretch;\n    gap: 0;\n    min-height: 46px;\n    padding: 0;\n    background: color-mix(in srgb, var(--cro-sel) 8%, var(--cro-bg));\n    overflow: hidden;\n}\n\n.cro-fbw__header-label {\n    flex: none;\n    max-width: 55%;\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding-block: max(6px, calc(var(--cro-header-pad) - 6px));\n    padding-inline: var(--cro-content-padding) 28px;\n    background: var(--cro-sel);\n    color: var(--cro-sel-fg);\n    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);\n}\n\n.cro-fbw__header-label:dir(rtl) {\n    clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%);\n}\n\n.cro-fbw__header--arrow .cro-fbw__header-text {\n    text-align: start;\n}\n\n.cro-fbw__header--arrow .cro-fbw__header-sub {\n    min-width: 0;\n    display: flex;\n    align-items: center;\n    padding-block: max(6px, calc(var(--cro-header-pad) - 6px));\n    padding-inline: 12px var(--cro-content-padding);\n    color: var(--cro-fg);\n}\n\n@container (max-width: 430px) {\n    .cro-fbw__header-sep {\n        display: none;\n    }\n\n    .cro-fbw__header--ribbon .cro-fbw__header-sub {\n        flex-basis: 100%;\n    }\n\n    .cro-fbw__header--arrow {\n        flex-wrap: wrap;\n    }\n\n    .cro-fbw__header-label {\n        max-width: 100%;\n        padding-inline-start: 16px;\n    }\n\n    .cro-fbw__header--arrow .cro-fbw__header-sub {\n        flex: 1 1 140px;\n        font-size: var(--cro-fs-sm);\n    }\n}\n';
const visibleBundles = (widget) => {
  const bundles = widget.embeddedData?.bundles || [];
  const maxBundles = Math.min(5, Math.max(1, Number(widget.settings?.max_bundles_display) || 3));
  return bundles.slice(0, maxBundles);
};
const initialOpenBundleId = (widget, bundles) => {
  if (!bundles.length) return null;
  if (widget.layout?.singleSelection) return bundles[0].id;
  const allowCollapse = widget.settings?.allow_collapse !== false && bundles.length > 1;
  if (!allowCollapse) return bundles[0].id;
  const defaultState = widget.settings?.default_bundle_state || "first_expanded";
  return defaultState === "first_expanded" ? bundles[0].id : null;
};
const STOREFRONT_API_VERSION = "2026-10";
const STOREFRONT_BATCH_SIZE = 10;
const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 1e4;
const PRODUCT_GID_PREFIX = "gid://shopify/Product/";
const CONTEXT_VARIABLES = "$country: CountryCode, $language: LanguageCode";
const IN_CONTEXT = "@inContext(country: $country, language: $language)";
const VARIANT_FIELDS = "id availableForSale price { amount } compareAtPrice { amount } selectedOptions { name value } image { url }";
const COMPONENT_PRODUCTS_QUERY = `query FixedBundleComponents($ids: [ID!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    nodes(ids: $ids) {
        ... on Product {
            id handle title availableForSale
            featuredImage { url }
            priceRange { minVariantPrice { amount } }
            compareAtPriceRange { minVariantPrice { amount } }
            variantsCount { count }
            options { id name optionValues { id name } }
            encodedVariantExistence
            encodedVariantAvailability
            variants(first: 250) { pageInfo { hasNextPage } nodes { ${VARIANT_FIELDS} } }
        }
    }
}`;
const BUNDLE_PRODUCT_QUERY = `query FixedBundleProduct($ids: [ID!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    nodes(ids: $ids) {
        ... on Product {
            id handle title
            options { id name optionValues { id name } }
            encodedVariantExistence
            encodedVariantAvailability
            selectedOrFirstAvailableVariant { ${VARIANT_FIELDS} }
            adjacentVariants { ${VARIANT_FIELDS} }
        }
    }
}`;
const VARIANT_NEIGHBORHOOD_QUERY = `query FixedBundleVariantNeighborhood($id: ID!, $selectedOptions: [SelectedOptionInput!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    product(id: $id) {
        variantBySelectedOptions(selectedOptions: $selectedOptions) { ${VARIANT_FIELDS} }
        adjacentVariants(selectedOptions: $selectedOptions) { ${VARIANT_FIELDS} }
    }
}`;
const toNumericId = (value) => {
  const id = String(value ?? "").split("/").pop();
  return /^[1-9]\d*$/.test(id) ? id : null;
};
const toCents = (money) => money?.amount == null ? null : Math.round(Number(money.amount) * 100);
const readStorefrontContext = () => {
  const country = String(window.Shopify?.country ?? "").toUpperCase();
  const language = String(window.Shopify?.locale ?? "").replace("-", "_").toUpperCase();
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    language: /^[A-Z]{2}(_[A-Z]{2})?$/.test(language) ? language : null
  };
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sendStorefrontRequest = async (query, variables) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/${STOREFRONT_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { ...readStorefrontContext(), ...variables } }),
      signal: controller.signal
    });
    if (!response.ok) return { data: null, isRetryable: response.status === 429 || response.status >= 500 };
    const body = await response.json();
    if (body?.errors?.length) return { data: null, isRetryable: false };
    return { data: body?.data ?? null, isRetryable: false };
  } catch {
    return { data: null, isRetryable: true };
  } finally {
    clearTimeout(timeoutId);
  }
};
const requestStorefront = async (query, variables) => {
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    const { data, isRetryable } = await sendStorefrontRequest(query, variables);
    if (data || !isRetryable) return data;
    if (attempt < MAX_REQUEST_ATTEMPTS) await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  }
  return null;
};
const toBatches = (values) => Array.from(
  { length: Math.ceil(values.length / STOREFRONT_BATCH_SIZE) },
  (_, index) => values.slice(index * STOREFRONT_BATCH_SIZE, (index + 1) * STOREFRONT_BATCH_SIZE)
);
const findValueId = (option, valueName) => option?.values.find((value) => value.name === valueName)?.id ?? null;
const normalizeStorefrontVariant = (variant, options, productImageUrl) => {
  const values = options.map(() => null);
  const valueIds = options.map(() => null);
  for (const selectedOption of variant.selectedOptions ?? []) {
    const optionIndex = options.findIndex((option) => option.name === selectedOption.name);
    if (optionIndex < 0) continue;
    values[optionIndex] = selectedOption.value;
    valueIds[optionIndex] = findValueId(options[optionIndex], selectedOption.value);
  }
  return {
    id: Number(toNumericId(variant.id)),
    values,
    valueIds,
    price: toCents(variant.price) ?? 0,
    compareAtPrice: toCents(variant.compareAtPrice),
    available: variant.availableForSale !== false,
    imageUrl: variant.image?.url ?? productImageUrl
  };
};
const normalizeStorefrontOptions = (node) => (node.options ?? []).map((option) => ({
  id: toNumericId(option.id),
  name: option.name ?? "",
  values: (option.optionValues ?? []).map((value) => ({ id: toNumericId(value.id), name: value.name ?? "" }))
}));
const decodeEncodedVariants = (encoded) => {
  if (typeof encoded !== "string" || !encoded.startsWith("v1_")) return [];
  const source = encoded.slice(3);
  const tokenizer = /[ :,-]/g;
  const combinations = [];
  const current = [];
  let depth = 0;
  let index = 0;
  let rangeStart = null;
  let token;
  while (token = tokenizer.exec(source)) {
    const operation = token[0];
    const valueIndex = Number.parseInt(source.slice(index, token.index), 10) || 0;
    if (rangeStart !== null) {
      for (; rangeStart < valueIndex; rangeStart += 1) {
        current[depth] = rangeStart;
        combinations.push([...current]);
      }
      rangeStart = null;
    }
    current[depth] = valueIndex;
    if (operation === "-") {
      rangeStart = valueIndex;
    } else if (operation === ":") {
      depth += 1;
    } else {
      if (operation === " " || operation === "," && source[token.index - 1] !== ",") combinations.push([...current]);
      if (operation === ",") {
        current.pop();
        depth -= 1;
      }
    }
    index = tokenizer.lastIndex;
  }
  const tail = source.match(/\d+$/);
  if (tail) {
    const lastIndex = Number.parseInt(tail[0], 10);
    if (rangeStart !== null) {
      for (; rangeStart <= lastIndex; rangeStart += 1) {
        current[depth] = rangeStart;
        combinations.push([...current]);
      }
    } else {
      current[depth] = lastIndex;
      combinations.push([...current]);
    }
  }
  return combinations;
};
const toComboKey = (valueIds) => valueIds.join(",");
const decodeVariantCombos = (node, options) => {
  const positionsToValueIds = (positions) => positions.map((position, optionIndex) => options[optionIndex]?.values[position]?.id ?? null);
  const availableComboKeys = new Set(decodeEncodedVariants(node.encodedVariantAvailability).map((positions) => toComboKey(positionsToValueIds(positions))));
  return decodeEncodedVariants(node.encodedVariantExistence).map(positionsToValueIds).filter((valueIds) => valueIds.length === options.length && valueIds.every(Boolean)).map((valueIds) => ({ key: toComboKey(valueIds), valueIds, available: availableComboKeys.has(toComboKey(valueIds)) }));
};
const hasCompleteValueIds = (variant) => variant.valueIds.length > 0 && variant.valueIds.every(Boolean);
const buildVariantStubs = (combos, options) => combos.map((combo) => ({
  id: null,
  values: combo.valueIds.map((valueId, optionIndex) => options[optionIndex].values.find((value) => value.id === valueId)?.name ?? null),
  valueIds: combo.valueIds,
  price: null,
  compareAtPrice: null,
  available: combo.available,
  imageUrl: null
}));
const mergeVariantDetails = (variants, details) => {
  const detailByComboKey = new Map(details.filter(hasCompleteValueIds).map((detail) => [toComboKey(detail.valueIds), detail]));
  return variants.map((variant) => detailByComboKey.get(toComboKey(variant.valueIds)) ?? variant);
};
const normalizeStorefrontProduct = (node) => {
  const options = normalizeStorefrontOptions(node);
  const imageUrl = node.featuredImage?.url ?? null;
  const firstVariants = (node.variants?.nodes ?? []).map((variant) => normalizeStorefrontVariant(variant, options, imageUrl));
  const variantStubs = node.variants?.pageInfo?.hasNextPage ? buildVariantStubs(decodeVariantCombos(node, options), options) : [];
  const loadsVariantsLazily = variantStubs.length > 0;
  const variants = loadsVariantsLazily ? mergeVariantDetails(variantStubs, firstVariants) : firstVariants;
  return {
    id: Number(toNumericId(node.id)),
    handle: node.handle ?? "",
    title: node.title ?? "",
    imageUrl,
    price: toCents(node.priceRange?.minVariantPrice) ?? 0,
    compare_at_price: toCents(node.compareAtPriceRange?.minVariantPrice),
    available: node.availableForSale !== false,
    variantsCount: Number(node.variantsCount?.count) || variants.length,
    optionNames: options.map((option) => option.name),
    hasShopifyIds: true,
    loadsVariantsLazily,
    options,
    variants
  };
};
const normalizeStorefrontBundleProduct = (node) => {
  const options = normalizeStorefrontOptions(node);
  const defaultVariant = node.selectedOrFirstAvailableVariant ? normalizeStorefrontVariant(node.selectedOrFirstAvailableVariant, options, null) : null;
  const prefetchedVariants = [defaultVariant, ...(node.adjacentVariants ?? []).map((variant) => normalizeStorefrontVariant(variant, options, null))].filter(Boolean);
  const variants = mergeVariantDetails(buildVariantStubs(decodeVariantCombos(node, options), options), prefetchedVariants);
  return {
    id: Number(toNumericId(node.id)),
    handle: node.handle ?? "",
    title: node.title ?? "",
    variantsCount: variants.length,
    optionNames: options.map((option) => option.name),
    hasShopifyIds: true,
    loadsVariantsLazily: true,
    options,
    variants,
    defaultVariant
  };
};
const nameBasedValueId = (optionIndex, valueName) => `name:${optionIndex}:${valueName}`;
const buildOptionsFromVariantValues = (optionNames, variants) => optionNames.map((name, optionIndex) => {
  const valueNames = [...new Set(variants.map((variant) => variant.values?.[optionIndex]).filter((value) => value != null))];
  return {
    id: null,
    name,
    values: valueNames.map((valueName) => ({ id: nameBasedValueId(optionIndex, valueName), name: valueName }))
  };
});
const attachValueIds = (variant, options) => {
  if (!variant) return variant;
  const valueIds = options.map((option, optionIndex) => findValueId(option, variant.values?.[optionIndex]));
  return { ...variant, valueIds };
};
const normalizePreviewProduct = (product) => {
  if (product?.options) return product;
  const options = buildOptionsFromVariantValues(product?.optionNames || [], product?.variants || []);
  return {
    ...product,
    hasShopifyIds: false,
    options,
    variants: (product?.variants || []).map((variant) => attachValueIds(variant, options))
  };
};
const productRequests = () => {
  window.__croFixedProductCache ||= /* @__PURE__ */ new Map();
  return window.__croFixedProductCache;
};
const bundleProductRequests = () => {
  window.__croFixedBundleProductCache ||= /* @__PURE__ */ new Map();
  return window.__croFixedBundleProductCache;
};
const requestProductBatch = async (productIds) => {
  const data = await requestStorefront(COMPONENT_PRODUCTS_QUERY, { ids: productIds.map((productId) => `${PRODUCT_GID_PREFIX}${productId}`) });
  if (!data) return null;
  const productsById = /* @__PURE__ */ new Map();
  for (const node of data?.nodes ?? []) {
    const productId = toNumericId(node?.id);
    if (productId) productsById.set(productId, normalizeStorefrontProduct(node));
  }
  return productsById;
};
const fetchComponentProducts = (productIds) => {
  const requests = productRequests();
  const productIdsToRequest = productIds.filter((productId) => !requests.has(productId));
  for (const batch of toBatches(productIdsToRequest)) {
    const batchRequest = requestProductBatch(batch).then((productsById) => {
      if (!productsById) for (const productId of batch) requests.delete(productId);
      return productsById;
    });
    for (const productId of batch) {
      requests.set(productId, batchRequest.then((productsById) => productsById?.get(productId) ?? null));
    }
  }
  return Promise.all(productIds.map((productId) => requests.get(productId)));
};
const fetchBundleProduct = (bundleProductId) => {
  const requests = bundleProductRequests();
  if (!requests.has(bundleProductId)) {
    requests.set(bundleProductId, requestStorefront(BUNDLE_PRODUCT_QUERY, { ids: [`${PRODUCT_GID_PREFIX}${bundleProductId}`] }).then((data) => {
      if (!data) requests.delete(bundleProductId);
      const node = data?.nodes?.[0];
      return toNumericId(node?.id) ? normalizeStorefrontBundleProduct(node) : null;
    }));
  }
  return requests.get(bundleProductId);
};
const neighborhoodKey = (product, comboKey) => `${product.id}:${comboKey}`;
const toSelectedOptions = (product, valueIds) => valueIds.map((valueId, optionIndex) => {
  const option = product.options[optionIndex];
  return { name: option.name, value: option.values.find((value) => value.id === valueId)?.name ?? "" };
});
const fetchVariantNeighborhood = async (product, valueIds) => {
  const data = await requestStorefront(VARIANT_NEIGHBORHOOD_QUERY, {
    id: `${PRODUCT_GID_PREFIX}${product.id}`,
    selectedOptions: toSelectedOptions(product, valueIds)
  });
  if (!data?.product) return null;
  const { variantBySelectedOptions, adjacentVariants } = data.product;
  const normalize = (variant) => normalizeStorefrontVariant(variant, product.options, product.imageUrl ?? null);
  return {
    selectedVariant: variantBySelectedOptions ? normalize(variantBySelectedOptions) : null,
    variants: [variantBySelectedOptions, ...adjacentVariants ?? []].filter(Boolean).map(normalize).filter(hasCompleteValueIds)
  };
};
const renderIfCurrent = (widget, store) => {
  if (widget.store === store && widget.isConnected) widget.render();
};
const startNeighborhoodRequest = (store, requestKey, load, afterSettle) => {
  if (store.neighborhoodRequests.has(requestKey)) return store.neighborhoodRequests.get(requestKey);
  if (store.failedNeighborhoods.has(requestKey)) return Promise.resolve(false);
  const request = load().then((isLoaded) => {
    if (!isLoaded) {
      store.neighborhoodRequests.delete(requestKey);
      store.failedNeighborhoods.add(requestKey);
    }
    afterSettle();
    return isLoaded;
  });
  store.neighborhoodRequests.set(requestKey, request);
  return request;
};
const requestVariantNeighborhood = (widget, product, valueIds, isDetailMissing) => {
  const { store } = widget;
  const comboKey = toComboKey(valueIds);
  return startNeighborhoodRequest(store, neighborhoodKey(product, comboKey), async () => {
    const neighborhood = await fetchVariantNeighborhood(product, valueIds);
    if (!neighborhood) return false;
    if (!store.variantDetails.has(product.id)) store.variantDetails.set(product.id, /* @__PURE__ */ new Map());
    const details = store.variantDetails.get(product.id);
    for (const variant of neighborhood.variants) details.set(toComboKey(variant.valueIds), variant);
    if (!details.has(comboKey)) details.set(comboKey, neighborhood.selectedVariant);
    return true;
  }, () => {
    if (isDetailMissing) renderIfCurrent(widget, store);
  });
};
const hydrateBundle = async (widget, bundle) => {
  const { store } = widget;
  if (!bundle || store.hydratedBundleIds.has(bundle.id) || store.hydratingBundleIds.has(bundle.id)) return;
  store.hydratingBundleIds.add(bundle.id);
  const productIds = [...new Set((bundle.components || []).map((c) => toNumericId(c.productId)).filter(Boolean))];
  const bundleProductId = toNumericId(widget.embeddedData?.bundleProducts?.[bundle.bundleHandle]?.id);
  try {
    const [products, bundleProduct] = await Promise.all([
      fetchComponentProducts(productIds),
      bundleProductId ? fetchBundleProduct(bundleProductId) : null
    ]);
    for (const product of products) if (product) store.productMap.set(product.id, product);
    if (bundleProduct) store.bundleProductMap.set(bundle.bundleHandle, bundleProduct);
  } catch (error) {
    console.error("[cro-fixed-bundle] failed to load bundle data:", bundle.id, error);
  } finally {
    store.hydratingBundleIds.delete(bundle.id);
    store.hydratedBundleIds.add(bundle.id);
  }
};
const hydrateRemainingBundles = (widget, bundles, skipId) => {
  for (const bundle of bundles) {
    if (bundle.id === skipId || widget.store.hydratedBundleIds.has(bundle.id)) continue;
    hydrateBundle(widget, bundle).then(() => {
      if (widget.isConnected) widget.render();
    });
  }
};
const hydrateWidget = async (widget) => {
  const { store } = widget;
  if (store.hydrating || store.hydrated) return;
  store.hydrating = true;
  if (widget.isBuilderMode) {
    const products = widget.embeddedData?.products || [];
    store.productMap = new Map(products.map((product) => [product.id, normalizePreviewProduct(product)]));
    for (const bundle of widget.embeddedData?.bundles || []) store.hydratedBundleIds.add(bundle.id);
    store.hydrated = true;
    store.hydrating = false;
    widget.render();
    return;
  }
  const bundles = visibleBundles(widget);
  const initialId = initialOpenBundleId(widget, bundles);
  const initialBundle = bundles.find((b) => b.id === initialId);
  if (initialBundle) await hydrateBundle(widget, initialBundle);
  store.hydrated = true;
  store.hydrating = false;
  if (widget.isConnected) widget.render();
  hydrateRemainingBundles(widget, bundles, initialId);
};
const PIXEL_BASE_URL = "https://pixel-dev.ecomposer.app";
const CLIENT_ID_STORAGE_KEY = "_cro_client_id";
const TRAFFIC_SOURCE_STORAGE_KEY = "_cro_first_touch_source";
const generateClientId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const getClientId = () => {
  try {
    let clientId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!clientId) {
      clientId = generateClientId();
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    }
    return clientId;
  } catch {
    return generateClientId();
  }
};
const getDevice = () => {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
};
const resolveTrafficSource = () => {
  const utmSource = new URLSearchParams(window.location.search).get("utm_source");
  if (utmSource) return utmSource;
  if (!document.referrer) return "direct";
  try {
    const referrerHost = new URL(document.referrer).hostname;
    return referrerHost === window.location.hostname ? "direct" : referrerHost;
  } catch {
    return "direct";
  }
};
const getTrafficSource = () => {
  try {
    const stored = window.localStorage.getItem(TRAFFIC_SOURCE_STORAGE_KEY);
    if (stored) return stored;
    const source = resolveTrafficSource();
    window.localStorage.setItem(TRAFFIC_SOURCE_STORAGE_KEY, source);
    return source;
  } catch {
    return resolveTrafficSource();
  }
};
const isAnalyticsDisabled = (analyticsEnabled) => analyticsEnabled === false || analyticsEnabled === "false";
const sendPixelEvent = ({ name, storeId, analyticsEnabled, extensionType, ruleId, ruleName, pageId, data = {} }) => {
  if (isAnalyticsDisabled(analyticsEnabled)) return;
  const shopDomain = window.Shopify?.shop;
  if (!shopDomain) {
    console.error(`[pixel-client] window.Shopify.shop is not available — dropping "${name}"`);
    return;
  }
  const numericStoreId = Number(storeId);
  if (!Number.isFinite(numericStoreId) || numericStoreId <= 0) {
    console.error(`[pixel-client] no usable store_id (${JSON.stringify(storeId)}) — dropping "${name}"`);
    return;
  }
  const payload = {
    name,
    store_id: numericStoreId,
    client_id: getClientId(),
    extension_type: extensionType,
    rule_id: ruleId,
    rule_name: ruleName,
    page_id: pageId,
    context: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
      device: getDevice()
    },
    data
  };
  fetch(`${PIXEL_BASE_URL}/v1/analytic?shopify_domain=${encodeURIComponent(shopDomain)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch((err) => console.error(`[pixel-client] failed to send "${name}"`, err));
};
const getCurrencyContext = (shopCurrency) => {
  const activeCurrency = window.Shopify?.currency?.active || shopCurrency || "";
  const baseCurrency = shopCurrency || activeCurrency;
  const parsedRate = Number(window.Shopify?.currency?.rate);
  const exchangeRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 1;
  return {
    activeCurrency,
    baseCurrency,
    exchangeRate,
    toBase: (presentmentAmount) => (Number(presentmentAmount) || 0) / exchangeRate
  };
};
const SHOPIFY_ANALYTICS_POLL_MS = 100;
const SHOPIFY_ANALYTICS_POLL_LIMIT = 200;
const publishCroContext = (shopCurrency, analyticsEnabled) => {
  if (isAnalyticsDisabled(analyticsEnabled)) return;
  const { baseCurrency, activeCurrency, exchangeRate } = getCurrencyContext(shopCurrency);
  const payload = {
    base_currency: baseCurrency,
    active_currency: activeCurrency,
    exchange_rate: exchangeRate,
    client_id: getClientId()
  };
  const publish = () => {
    try {
      window.Shopify.analytics.publish("cro_context", payload);
      return true;
    } catch (err) {
      console.error("[pixel-client] failed to publish cro_context", err);
      return true;
    }
  };
  if (window.Shopify?.analytics?.publish) {
    publish();
    return;
  }
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (window.Shopify?.analytics?.publish) {
      publish();
      window.clearInterval(timer);
      return;
    }
    if (attempts >= SHOPIFY_ANALYTICS_POLL_LIMIT) window.clearInterval(timer);
  }, SHOPIFY_ANALYTICS_POLL_MS);
};
const DEFAULT_TITLE_RE = /^default\s*title$/i;
const UNMATCHED_VALUE_ID = "unmatched";
const safeImageUrl = (url) => url ? url.startsWith("//") ? "https:" + url : url : "";
const findBundle = (widget, bundleId) => (widget.embeddedData?.bundles || []).find((b) => String(b.id) === String(bundleId));
const normalizedBundleProducts = /* @__PURE__ */ new WeakMap();
const bundlesWarnedAboutStaleIds = /* @__PURE__ */ new WeakSet();
const normalizeBundleProduct = (bundleProduct) => {
  const hasShopifyIds = Array.isArray(bundleProduct.optionValues) && bundleProduct.optionValues.length > 0;
  const options = hasShopifyIds ? bundleProduct.optionValues.map((option) => ({
    id: null,
    name: option.name,
    values: (option.values || []).map((value) => ({ id: String(value.id), name: value.value }))
  })) : buildOptionsFromVariantValues(bundleProduct.optionNames || [], bundleProduct.variants || []);
  return {
    ...bundleProduct,
    hasShopifyIds,
    loadsVariantsLazily: false,
    options,
    variants: (bundleProduct.variants || []).map((variant) => attachValueIds(variant, options)),
    defaultVariant: attachValueIds(bundleProduct.defaultVariant, options)
  };
};
const embeddedBundleProductOf = (widget, bundle) => {
  const embeddedBundleProduct = widget.embeddedData?.bundleProducts?.[bundle.bundleHandle];
  if (!embeddedBundleProduct) return null;
  if (!normalizedBundleProducts.has(embeddedBundleProduct)) {
    normalizedBundleProducts.set(embeddedBundleProduct, normalizeBundleProduct(embeddedBundleProduct));
  }
  return normalizedBundleProducts.get(embeddedBundleProduct);
};
const bundleProductOf = (widget, bundle) => widget.isBuilderMode ? embeddedBundleProductOf(widget, bundle) : widget.store.bundleProductMap.get(bundle.bundleHandle) ?? null;
const bundleTitleOf = (widget, bundle) => bundleProductOf(widget, bundle)?.title || widget.embeddedData?.bundleProducts?.[bundle.bundleHandle]?.title || "";
const hasVariantDetail = (variant) => variant?.id != null;
const variantIndexes = /* @__PURE__ */ new WeakMap();
const findVariantByComboKey = (product, comboKey) => {
  if (!variantIndexes.has(product.variants)) {
    variantIndexes.set(product.variants, new Map(product.variants.map((variant) => [toComboKey(variant.valueIds), variant])));
  }
  return variantIndexes.get(product.variants).get(comboKey) ?? null;
};
const lookupVariantDetail = (widget, product, comboKey) => {
  const { variantDetails, failedNeighborhoods } = widget.store;
  const loadedDetails = variantDetails.get(product.id);
  if (loadedDetails?.has(comboKey)) return { isPending: false, variant: loadedDetails.get(comboKey) };
  const variant = findVariantByComboKey(product, comboKey);
  if (hasVariantDetail(variant)) return { isPending: false, variant };
  if (!variant || !product.loadsVariantsLazily || failedNeighborhoods.has(neighborhoodKey(product, comboKey))) {
    return { isPending: false, variant: null };
  }
  return { isPending: true, variant: null };
};
const hasUnloadedVariants = (product) => {
  const variantsCount = Number(product?.variantsCount);
  return Number.isFinite(variantsCount) && variantsCount > (product?.variants?.length ?? 0);
};
const orderedComponents = (widget, bundle) => {
  const components = bundle.components || [];
  const currentId = widget.embeddedData?.currentProductId;
  if (currentId == null) return components;
  const index = components.findIndex((component) => component.productId === currentId);
  if (index <= 0) return components;
  return [components[index], ...components.slice(0, index), ...components.slice(index + 1)];
};
const productOf = (widget, component) => widget.store.productMap.get(component.productId);
const isAxisOption = (option) => (option.values || []).length >= 2;
const isFixedOption = (option) => (option.values || []).length === 1;
const toOptionKey = (option) => option.id != null ? String(option.id) : option.rawName || option.name;
const rawOptionName = (product, optionName) => {
  const title = product?.title;
  if (title && optionName.startsWith(`${title} (`) && optionName.endsWith(")")) {
    return optionName.slice(title.length + 2, -1);
  }
  return optionName;
};
const findLiveIndexByName = (product, optionName) => {
  const names = product?.optionNames || [];
  const direct = names.indexOf(optionName);
  if (direct >= 0) return direct;
  const raw = rawOptionName(product, optionName);
  return raw === optionName ? -1 : names.indexOf(raw);
};
const findLiveIndexById = (product, option) => {
  if (!product?.hasShopifyIds || option.id == null) return -1;
  return product.options.findIndex((liveOption) => liveOption.id === String(option.id));
};
const resolveComponentOption = (product, option) => {
  const valueNames = option.values || [];
  const liveIndexById = findLiveIndexById(product, option);
  const liveIndex = liveIndexById >= 0 ? liveIndexById : findLiveIndexByName(product, option.rawName || option.name);
  const hasStoredValueIds = Array.isArray(option.valueIds) && option.valueIds.length === valueNames.length;
  const useStoredValueIds = hasStoredValueIds && (liveIndexById >= 0 || !product);
  const liveOption = liveIndex >= 0 ? product?.options?.[liveIndex] : null;
  const valueIds = useStoredValueIds ? option.valueIds.map(String) : valueNames.map((valueName) => liveOption?.values.find((value) => value.name === valueName)?.id ?? null);
  return { option, key: toOptionKey(option), liveIndex, valueIds };
};
const resolveComponentOptions = (component, product) => (component.options || []).map((option) => resolveComponentOption(product, option));
const resolveBundleOption = (bundleProduct, option) => {
  const valueNames = option.values || [];
  const bundleOptions = bundleProduct?.options || [];
  const hasStoredParentValueIds = bundleProduct?.hasShopifyIds && Array.isArray(option.parentValueIds) && option.parentValueIds.length === valueNames.length;
  if (hasStoredParentValueIds) {
    const parentValueIds2 = option.parentValueIds.map(String);
    const bundleOptionIndex2 = bundleOptions.findIndex((bundleOption2) => bundleOption2.values.some((value) => value.id === parentValueIds2[0]));
    return { bundleOptionIndex: bundleOptionIndex2, isStale: bundleOptionIndex2 < 0, parentValueIds: parentValueIds2 };
  }
  const bundleOptionIndex = (bundleProduct?.optionNames || []).indexOf(option.parentName);
  const bundleOption = bundleOptionIndex >= 0 ? bundleOptions[bundleOptionIndex] : null;
  const parentValueIds = valueNames.map((valueName) => bundleOption?.values.find((value) => value.name === valueName)?.id ?? null);
  return { bundleOptionIndex, isStale: false, parentValueIds };
};
const buildBundleMapping = (bundleProduct, component, resolved) => {
  const { bundleOptionIndex, isStale, parentValueIds } = resolveBundleOption(bundleProduct, resolved.option);
  const parentByValueId = /* @__PURE__ */ new Map();
  const valueByParentId = /* @__PURE__ */ new Map();
  resolved.valueIds.forEach((valueId, valueIndex) => {
    const parentValueId = parentValueIds[valueIndex];
    if (!valueId || !parentValueId) return;
    parentByValueId.set(valueId, parentValueId);
    valueByParentId.set(parentValueId, valueId);
  });
  return { component, option: resolved.option, key: resolved.key, bundleOptionIndex, isStale, parentByValueId, valueByParentId };
};
const bundleMappings = (widget, bundle) => {
  const bundleProduct = bundleProductOf(widget, bundle);
  const mappings = [];
  for (const component of bundle.components || []) {
    for (const resolved of resolveComponentOptions(component, productOf(widget, component))) {
      if (resolved.option.parentName) mappings.push(buildBundleMapping(bundleProduct, component, resolved));
    }
  }
  return mappings;
};
const activeMappings = (mappings) => mappings.filter((mapping) => mapping.bundleOptionIndex >= 0 && !mapping.isStale);
const hasStaleMapping = (mappings) => mappings.some((mapping) => mapping.isStale);
const warnStaleBundleOnce = (bundle) => {
  if (bundlesWarnedAboutStaleIds.has(bundle)) return;
  bundlesWarnedAboutStaleIds.add(bundle);
  console.warn("[cro-fixed-bundle] bundle options no longer match the bundle product:", bundle.id);
};
const desiredParentValueIds = (selection, mappings) => {
  const desired = /* @__PURE__ */ new Map();
  for (const mapping of activeMappings(mappings)) {
    const selectedValueId = selection[mapping.component.productId]?.[mapping.key];
    if (selectedValueId == null) continue;
    desired.set(mapping.bundleOptionIndex, mapping.parentByValueId.get(selectedValueId) ?? UNMATCHED_VALUE_ID);
  }
  return desired;
};
const currentSelection = (widget, bundle) => widget.store.selection[bundle.id] || {};
const variantMatches = (variant, desiredValueIds) => {
  for (const [index, valueId] of desiredValueIds) {
    if (variant.valueIds?.[index] !== valueId) return false;
  }
  return true;
};
const isAvailable = (variant) => variant.available !== false;
const findBundleCombo = (bundleProduct, desiredValueIds) => bundleProduct.variants.find((variant) => isAvailable(variant) && variantMatches(variant, desiredValueIds)) || bundleProduct.variants.find((variant) => variantMatches(variant, desiredValueIds)) || null;
const selectedBundleCombo = (widget, bundle, selection = currentSelection(widget, bundle)) => {
  const bundleProduct = bundleProductOf(widget, bundle);
  if (!bundleProduct) return null;
  const mappings = bundleMappings(widget, bundle);
  if (hasStaleMapping(mappings)) return null;
  const combo = findBundleCombo(bundleProduct, desiredParentValueIds(selection, mappings));
  return combo ? { bundleProduct, combo, comboKey: toComboKey(combo.valueIds) } : null;
};
const prefetchBundleNeighborhood = (widget, bundle) => {
  const selected = selectedBundleCombo(widget, bundle);
  if (!selected?.bundleProduct.loadsVariantsLazily) return;
  const { bundleProduct, combo, comboKey } = selected;
  const defaultVariant = bundleProduct.defaultVariant;
  if (defaultVariant && toComboKey(defaultVariant.valueIds) === comboKey) return;
  requestVariantNeighborhood(widget, bundleProduct, combo.valueIds, lookupVariantDetail(widget, bundleProduct, comboKey).isPending);
};
const displayedBundleVariant = (widget, bundle) => {
  const { shownBundleVariants } = widget.store;
  const selected = selectedBundleCombo(widget, bundle);
  if (!selected) return { variant: null, pending: false };
  const { isPending, variant } = lookupVariantDetail(widget, selected.bundleProduct, selected.comboKey);
  if (!isPending) {
    if (variant) shownBundleVariants.set(bundle.id, variant);
    return { variant, pending: false };
  }
  const previousVariant = shownBundleVariants.get(bundle.id);
  if (!previousVariant) return { variant: null, pending: true };
  return { variant: { ...previousVariant, available: isAvailable(selected.combo) }, pending: false };
};
const pickerOptions = (component, product) => {
  if (hasUnloadedVariants(product)) return [];
  const result = [];
  for (const resolved of resolveComponentOptions(component, product)) {
    if (!isAxisOption(resolved.option) || resolved.liveIndex < 0) continue;
    const liveValueIds = new Set((product?.variants || []).map((variant) => variant.valueIds?.[resolved.liveIndex]).filter(Boolean));
    const valueIds = resolved.valueIds.filter((valueId) => valueId && liveValueIds.has(valueId));
    if (valueIds.length >= 2) {
      result.push({ name: resolved.option.name, key: resolved.key, liveIndex: resolved.liveIndex, valueIds });
    }
  }
  result.sort((a, b) => a.liveIndex - b.liveIndex);
  return result;
};
const desiredFromFixedOptions = (resolvedOptions) => {
  const desired = /* @__PURE__ */ new Map();
  for (const resolved of resolvedOptions) {
    if (isFixedOption(resolved.option) && resolved.liveIndex >= 0) {
      desired.set(resolved.liveIndex, resolved.valueIds[0] ?? UNMATCHED_VALUE_ID);
    }
  }
  return desired;
};
const componentDesired = (widget, bundleId, component, product) => {
  const componentSelection = widget.store.selection[bundleId]?.[component.productId] || {};
  const resolvedOptions = resolveComponentOptions(component, product);
  const desired = desiredFromFixedOptions(resolvedOptions);
  for (const resolved of resolvedOptions) {
    const selectedValueId = componentSelection[resolved.key];
    if (isAxisOption(resolved.option) && resolved.liveIndex >= 0 && selectedValueId != null) {
      desired.set(resolved.liveIndex, selectedValueId);
    }
  }
  return desired;
};
const componentDesiredBefore = (widget, bundleId, component, product, testedLiveIndex) => {
  const componentSelection = widget.store.selection[bundleId]?.[component.productId] || {};
  const resolvedOptions = resolveComponentOptions(component, product);
  const desired = desiredFromFixedOptions(resolvedOptions);
  if (testedLiveIndex < 0) return desired;
  for (const resolved of resolvedOptions) {
    const isBefore = resolved.liveIndex >= 0 && resolved.liveIndex < testedLiveIndex;
    const selectedValueId = componentSelection[resolved.key];
    if (isAxisOption(resolved.option) && isBefore && selectedValueId != null) {
      desired.set(resolved.liveIndex, selectedValueId);
    }
  }
  return desired;
};
const matchVariant = (product, desired) => {
  const variants = product?.variants || [];
  return variants.find((v) => v.available !== false && variantMatches(v, desired)) || variants.find((v) => variantMatches(v, desired)) || variants.find((v) => v.available !== false) || variants[0] || null;
};
const resolveComponentVariant = (widget, bundleId, component, product) => {
  if (hasUnloadedVariants(product)) return null;
  if (!product?.variants?.length) return null;
  return matchVariant(product, componentDesired(widget, bundleId, component, product));
};
const prefetchComponentNeighborhoods = (widget, bundle) => {
  for (const component of bundle.components || []) {
    const product = productOf(widget, component);
    if (!product?.loadsVariantsLazily) continue;
    const variant = resolveComponentVariant(widget, bundle.id, component, product);
    if (!variant) continue;
    const { isPending } = lookupVariantDetail(widget, product, toComboKey(variant.valueIds));
    requestVariantNeighborhood(widget, product, variant.valueIds, isPending);
  }
};
const displayedComponentVariant = (widget, bundle, component, product, matchedVariant) => {
  if (!matchedVariant) return null;
  const { shownComponentVariants } = widget.store;
  const shownKey = `${bundle.id}:${component.productId}`;
  const detailedVariant = lookupVariantDetail(widget, product, toComboKey(matchedVariant.valueIds)).variant;
  if (detailedVariant) {
    shownComponentVariants.set(shownKey, detailedVariant);
    return detailedVariant;
  }
  const previousVariant = shownComponentVariants.get(shownKey);
  if (!previousVariant) return matchedVariant;
  return { ...previousVariant, values: matchedVariant.values, valueIds: matchedVariant.valueIds, available: matchedVariant.available };
};
const valueAvailable = (widget, bundle, component, product, pickerOption, valueId) => {
  const desired = componentDesiredBefore(widget, bundle.id, component, product, pickerOption.liveIndex);
  desired.set(pickerOption.liveIndex, valueId);
  return (product?.variants || []).some((v) => v.available !== false && variantMatches(v, desired));
};
const pickDefaultValueId = (product, liveIndex, valueIds, desiredSoFar) => {
  const variants = product?.variants || [];
  const hasVariantWith = (variant, valueId) => liveIndex >= 0 && variantMatches(variant, desiredSoFar) && variant.valueIds?.[liveIndex] === valueId;
  const firstAvailable = valueIds.find((valueId) => variants.some((v) => v.available !== false && hasVariantWith(v, valueId)));
  if (firstAvailable) return firstAvailable;
  const firstExisting = valueIds.find((valueId) => variants.some((v) => hasVariantWith(v, valueId)));
  return firstExisting || valueIds[0];
};
const seedVariantOf = (widget, bundle) => {
  const bundleProduct = bundleProductOf(widget, bundle);
  if (widget.isBuilderMode || !widget.embeddedData?.isCurrentProductBundle) return bundleProduct?.defaultVariant;
  return embeddedBundleProductOf(widget, bundle)?.defaultVariant ?? bundleProduct?.defaultVariant;
};
const seedFromBundleDefaultVariant = (widget, bundle, mappings) => {
  const { store } = widget;
  const defaultVariant = seedVariantOf(widget, bundle);
  if (!defaultVariant || hasStaleMapping(mappings)) return;
  const usableMappings = activeMappings(mappings);
  if (!usableMappings.length) return;
  store.selection[bundle.id] ||= {};
  const selection = store.selection[bundle.id];
  for (const mapping of usableMappings) {
    const valueId = mapping.valueByParentId.get(defaultVariant.valueIds?.[mapping.bundleOptionIndex]);
    if (valueId == null) continue;
    selection[mapping.component.productId] ||= {};
    selection[mapping.component.productId][mapping.key] ??= valueId;
  }
};
const syncSelectionToAvailableBundleVariant = (widget, bundle, mappings) => {
  const { store } = widget;
  const bundleProduct = bundleProductOf(widget, bundle);
  if (!bundleProduct?.variants.length || hasUnloadedVariants(bundleProduct) || hasStaleMapping(mappings)) return;
  const usableMappings = activeMappings(mappings);
  const candidates = bundleProduct.variants.filter((combo) => isAvailable(combo) && usableMappings.every(({ valueByParentId, bundleOptionIndex }) => valueByParentId.has(combo.valueIds[bundleOptionIndex])));
  if (!candidates.length) return;
  const selection = store.selection[bundle.id] || {};
  const selectedParentValueId = (mapping) => mapping.parentByValueId.get(selection[mapping.component.productId]?.[mapping.key]);
  const lastPicked = store.lastPicked[bundle.id];
  const lastPickedMapping = lastPicked && usableMappings.find((m) => m.component.productId === lastPicked.productId && m.key === lastPicked.key);
  const lastPickedValueId = lastPickedMapping ? selection[lastPicked.productId]?.[lastPicked.key] : null;
  const keepsLastPicked = (combo) => !lastPickedMapping || lastPickedValueId == null || combo.valueIds[lastPickedMapping.bundleOptionIndex] === selectedParentValueId(lastPickedMapping);
  const pool = candidates.filter(keepsLastPicked);
  const candidatePool = pool.length ? pool : candidates;
  const score = (combo) => usableMappings.reduce((total, mapping) => {
    const parentValueId = selectedParentValueId(mapping);
    return total + (parentValueId != null && parentValueId === combo.valueIds[mapping.bundleOptionIndex] ? 1 : 0);
  }, 0);
  const bestCombo = candidatePool.reduce((best, candidate) => score(candidate) > score(best) ? candidate : best, candidatePool[0]);
  for (const mapping of usableMappings) {
    if (!isAxisOption(mapping.option)) continue;
    const valueId = mapping.valueByParentId.get(bestCombo.valueIds[mapping.bundleOptionIndex]);
    if (valueId == null) continue;
    selection[mapping.component.productId] ||= {};
    selection[mapping.component.productId][mapping.key] = valueId;
  }
};
const ensureComponentSelection = (componentSelection, component, product) => {
  const resolvedOptions = resolveComponentOptions(component, product);
  const desiredSoFar = desiredFromFixedOptions(resolvedOptions);
  if (hasUnloadedVariants(product)) {
    for (const resolved of resolvedOptions) {
      if (!isAxisOption(resolved.option)) continue;
      componentSelection[resolved.key] ??= pickDefaultValueId(product, resolved.liveIndex, resolved.valueIds.filter(Boolean), desiredSoFar);
      if (resolved.liveIndex >= 0 && componentSelection[resolved.key] != null) {
        desiredSoFar.set(resolved.liveIndex, componentSelection[resolved.key]);
      }
    }
    return;
  }
  for (const pickerOption of pickerOptions(component, product)) {
    const current = componentSelection[pickerOption.key];
    const currentStillValid = current != null && pickerOption.valueIds.includes(current) && (product.variants || []).some((v) => v.available !== false && variantMatches(v, desiredSoFar) && v.valueIds?.[pickerOption.liveIndex] === current);
    componentSelection[pickerOption.key] = currentStillValid ? current : pickDefaultValueId(product, pickerOption.liveIndex, pickerOption.valueIds, desiredSoFar);
    desiredSoFar.set(pickerOption.liveIndex, componentSelection[pickerOption.key]);
  }
};
const ensureSelection = (widget, bundle) => {
  const { store } = widget;
  store.selection[bundle.id] ||= {};
  const mappings = bundleMappings(widget, bundle);
  seedFromBundleDefaultVariant(widget, bundle, mappings);
  const selection = store.selection[bundle.id];
  for (const component of bundle.components || []) {
    const product = productOf(widget, component);
    if (!product) continue;
    selection[component.productId] ||= {};
    ensureComponentSelection(selection[component.productId], component, product);
  }
  syncSelectionToAvailableBundleVariant(widget, bundle, mappings);
};
const prefetchVariantNeighborhoods = (widget, bundles) => {
  if (widget.isBuilderMode) return;
  for (const bundle of bundles) {
    if (!widget.store.hydratedBundleIds.has(bundle.id)) continue;
    prefetchBundleNeighborhood(widget, bundle);
    prefetchComponentNeighborhoods(widget, bundle);
  }
};
const applyVariantPick = (widget, bundleId, productId, optionKey, valueId) => {
  const { store } = widget;
  const numericId = Number(productId);
  store.selection[bundleId] ||= {};
  store.selection[bundleId][numericId] ||= {};
  if (store.selection[bundleId][numericId][optionKey] === valueId) return false;
  store.selection[bundleId][numericId][optionKey] = valueId;
  store.lastPicked[bundleId] = { productId: numericId, key: optionKey };
  store.failedNeighborhoods.clear();
  if (store.addState !== "idle") {
    store.addState = "idle";
    store.addBundleId = null;
  }
  return true;
};
const resolveBundleVariant = (widget, bundle, selection = currentSelection(widget, bundle)) => {
  if (hasStaleMapping(bundleMappings(widget, bundle))) {
    warnStaleBundleOnce(bundle);
    return null;
  }
  const selected = selectedBundleCombo(widget, bundle, selection);
  if (!selected) return null;
  return lookupVariantDetail(widget, selected.bundleProduct, selected.comboKey).variant;
};
const loadBundleVariant = async (widget, bundle) => {
  const selected = hasStaleMapping(bundleMappings(widget, bundle)) ? null : selectedBundleCombo(widget, bundle);
  if (selected && lookupVariantDetail(widget, selected.bundleProduct, selected.comboKey).isPending) {
    await requestVariantNeighborhood(widget, selected.bundleProduct, selected.combo.valueIds, false);
  }
  return resolveBundleVariant(widget, bundle);
};
const bundleTotals = (bundle, components, productMap) => {
  let now = bundle.discounted_total;
  let original = bundle.original_total;
  let saved = bundle.savings_amount;
  let pct = bundle.savings_percent;
  if (now == null) {
    now = components.reduce((sum, c) => {
      const p = productMap.get(c.productId);
      return sum + (p?.price ?? 0) * (c.quantity ?? 1);
    }, 0);
  }
  if (original == null) {
    original = components.reduce((sum, c) => {
      const p = productMap.get(c.productId);
      const price = p?.price ?? 0;
      const compare = (p?.compare_at_price ?? 0) > price ? p.compare_at_price : price;
      return sum + compare * (c.quantity ?? 1);
    }, 0);
  }
  if (saved == null) saved = Math.max(0, original - now);
  if (pct == null) pct = original > 0 ? Math.round(saved / original * 100) : 0;
  return { now, original, saved, pct };
};
const resolveTotals = (widget, bundle, components) => {
  const { variant: bundleVariant, pending } = displayedBundleVariant(widget, bundle);
  const fallback = bundleTotals(bundle, components, widget.store.productMap);
  let totals = fallback;
  if (bundleVariant) {
    const now = bundleVariant.price ?? fallback.now;
    const original = bundleVariant.compareAtPrice != null && bundleVariant.compareAtPrice > now ? bundleVariant.compareAtPrice : Math.max(now, fallback.original);
    const saved = Math.max(0, original - now);
    const pct = original > 0 ? Math.round(saved / original * 100) : 0;
    totals = { now, original, saved, pct };
  }
  const addable = Boolean(bundleVariant) && bundleVariant.available !== false;
  return { totals, addable, pending };
};
const variantSummaryText = (product, variant) => {
  if (!product) return "";
  const names = product.optionNames || [];
  const vals = variant?.values || [];
  const parts = [];
  names.forEach((name, i) => {
    const v = vals[i];
    if (v == null) return;
    if (DEFAULT_TITLE_RE.test(String(v))) return;
    if (/^title$/i.test(String(name))) return;
    parts.push(String(v));
  });
  return parts.join(" ⦁ ") || product.option_note || "";
};
const valueLabel = (product, liveIndex, valueId) => product?.options?.[liveIndex]?.values?.find((value) => value.id === valueId)?.name ?? "";
const buildPickerOptions = (widget, bundle, component, product) => {
  if (widget.pickerLayout === "none" || !product) return [];
  const selected = widget.store.selection[bundle.id]?.[component.productId] || {};
  return pickerOptions(component, product).map((pickerOption) => ({
    name: pickerOption.name,
    key: pickerOption.key,
    values: pickerOption.valueIds.map((valueId) => ({
      id: valueId,
      label: valueLabel(product, pickerOption.liveIndex, valueId),
      selected: selected[pickerOption.key] === valueId,
      available: valueAvailable(widget, bundle, component, product, pickerOption, valueId)
    }))
  }));
};
const buildCardView = (widget, bundle, component, product) => {
  const variant = displayedComponentVariant(widget, bundle, component, product, resolveComponentVariant(widget, bundle.id, component, product));
  const price = variant?.price ?? product?.price ?? 0;
  const compare = variant?.compareAtPrice ?? product?.compare_at_price ?? 0;
  const hasPicker = widget.pickerLayout !== "none" && product && pickerOptions(component, product).length > 0;
  return {
    bundleId: bundle.id,
    productId: component.productId,
    hasProduct: !!product,
    title: product?.title || formatHandle(product?.handle || component.handle),
    linkHandle: product?.handle || component.handle || "",
    imageUrl: safeImageUrl(variant?.imageUrl || product?.imageUrl),
    quantity: component.quantity ?? 1,
    price,
    compare,
    hasCompare: compare > 0 && compare > price,
    variantSummary: variantSummaryText(product, variant),
    hasPicker,
    options: buildPickerOptions(widget, bundle, component, product),
    unavailable: variant ? variant.available === false : false,
    noAlternativeVariant: (product?.variants?.length ?? 0) > 0 && !product.variants.some((v) => v.available !== false)
  };
};
const buildItems = (widget, bundle, components, withCards) => components.map((component) => {
  const product = productOf(widget, component);
  return {
    component,
    product,
    card: withCards ? buildCardView(widget, bundle, component, product) : null
  };
});
const buildBundleView = (widget, bundle, index, allowCollapse) => {
  const { store } = widget;
  const hydrated = store.hydratedBundleIds.has(bundle.id);
  const components = orderedComponents(widget, bundle);
  if (hydrated) ensureSelection(widget, bundle);
  const { totals, addable, pending } = hydrated ? resolveTotals(widget, bundle, components) : { totals: { now: 0, original: 0, saved: 0, pct: 0 }, addable: false, pending: true };
  const ctaState = pending ? "resolving" : !addable ? "unavailable" : store.addBundleId === bundle.id ? store.addState : "idle";
  return {
    bundle,
    index,
    hydrated,
    allowCollapse,
    isOpen: allowCollapse ? store.expandedBundles.has(bundle.id) : true,
    title: bundleTitleOf(widget, bundle),
    items: buildItems(widget, bundle, components, hydrated),
    count: components.reduce((sum, c) => sum + (c.quantity ?? 1), 0),
    totals,
    hasSaving: totals.saved > 0,
    pending,
    unavailable: !pending && !addable,
    ctaState
  };
};
const buildCurrentBundleView = (widget, bundle) => {
  const components = orderedComponents(widget, bundle);
  ensureSelection(widget, bundle);
  return {
    bundle,
    items: buildItems(widget, bundle, components, true)
  };
};
const buildEditorView = (widget) => {
  const { store } = widget;
  const editor = store.editor;
  if (!editor) return null;
  const bundle = findBundle(widget, editor.bundleId);
  const component = bundle?.components?.find((c) => String(c.productId) === String(editor.productId));
  const product = store.productMap.get(Number(editor.productId));
  if (!bundle || !component || !product) return null;
  return {
    bundleId: bundle.id,
    productId: component.productId,
    productTitle: product.title || formatHandle(product.handle),
    options: buildPickerOptions(widget, bundle, component, product)
  };
};
const EXTENSION_TYPE = "cro_fixed_bundle";
const SUCCESS_RESET_MS = 1601;
const openEcomposerAjaxCart = (addedItem) => {
  const ec = typeof window !== "undefined" ? window.EComposer : null;
  if (!ec?.configs?.ajax_cart?.enable || typeof ec.ajaxCartSuccess !== "function") return false;
  try {
    ec.ajaxCartSuccess(addedItem || null);
    return true;
  } catch (error) {
    console.error("[cro-fixed-bundle] EComposer ajax cart open failed:", error);
    return false;
  }
};
const showEcomposerToast = (message, status) => {
  const ec = typeof window !== "undefined" ? window.EComposer : null;
  if (typeof ec?.showToast !== "function") return false;
  try {
    ec.showToast(message, status);
    return true;
  } catch (error) {
    console.error("[cro-fixed-bundle] EComposer toast failed:", error);
    return false;
  }
};
const fetchCartItems = async () => {
  try {
    const root = window.Shopify?.routes?.root || "/";
    const response = await fetch(`${root}cart.js`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const cart = await response.json();
    return Array.isArray(cart?.items) ? cart.items : null;
  } catch {
    return null;
  }
};
const croSignFromCart = (items, bundleId, variantId) => {
  const existing = items.find(
    (item) => String(item.variant_id) === String(variantId) && String(item.properties?._cro_campaign) === String(bundleId)
  );
  if (!existing) return String(Date.now());
  return existing.properties._cro_sign || null;
};
const bundleRuleName = (widget, bundle) => widget.embeddedData?.bundleProducts?.[bundle.bundleHandle]?.title || void 0;
const fireOfferAccepted = (widget, bundle, { presentmentUpsellValue, upsellQuantity }) => {
  const money = getCurrencyContext(widget.getAttribute("shop-currency"));
  const source = getTrafficSource();
  const device = getDevice();
  const impressionAt = widget.store.tracking.impressionAtByBundle?.[bundle.id];
  sendPixelEvent({
    name: "ext_offer_accepted",
    storeId: widget.getAttribute("store-id"),
    analyticsEnabled: widget.getAttribute("analytics-enabled"),
    extensionType: EXTENSION_TYPE,
    ruleId: String(bundle.id),
    ruleName: bundleRuleName(widget, bundle),
    pageId: "product-main",
    data: {
      upsell_value: money.toBase(presentmentUpsellValue),
      upsell_quantity: upsellQuantity,
      currency: money.baseCurrency,
      original_price: presentmentUpsellValue,
      original_currency: money.activeCurrency,
      exchange_rate: money.exchangeRate,
      accept_time: impressionAt ? Math.round((Date.now() - impressionAt) / 1e3) : void 0,
      source,
      device
    }
  });
};
const addBundleToCart = async (widget, bundle) => {
  const { store } = widget;
  if (widget.isBuilderMode) return;
  store.addState = "adding";
  store.addBundleId = bundle.id;
  widget.render();
  const variant = await loadBundleVariant(widget, bundle);
  const id = Number(String(variant?.id ?? "").split("/").pop());
  const isStillAdding = store.addState === "adding" && store.addBundleId === bundle.id;
  if (!isStillAdding) return;
  if (!id || variant.available === false) {
    store.addState = "idle";
    store.addBundleId = null;
    widget.render();
    return;
  }
  const root = window.Shopify?.routes?.root || "/";
  let cartErrorMessage = "";
  try {
    const properties = { _cro_ext: EXTENSION_TYPE, _cro_campaign: String(bundle.id) };
    const cartItems = await fetchCartItems();
    const croSign = croSignFromCart(cartItems || [], bundle.id, id);
    if (croSign !== null) properties._cro_sign = croSign;
    const response = await fetch(`${root}cart/add.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        items: [{ id, quantity: 1, properties }],
        sections: "cart-icon-bubble"
      })
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      cartErrorMessage = errorBody?.description || errorBody?.message || "";
      throw new Error(`Cart add failed: ${response.status} ${errorBody?.description || ""}`.trim());
    }
    const body = await response.json().catch(() => null);
    document.dispatchEvent(new CustomEvent("cro:cart-mutated", { detail: body }));
    widget.dispatchEvent(new CustomEvent("bundle:add", {
      detail: { bundle, variantId: id },
      bubbles: true,
      composed: true
    }));
    if (!openEcomposerAjaxCart(body?.items?.[0])) {
      window.location.href = `${root}cart`;
    }
    const addedItems = Array.isArray(body?.items) ? body.items : [];
    const presentmentUpsellValue = addedItems.reduce((sum, item) => sum + (Number(item.line_price) || 0), 0) / 100;
    const upsellQuantity = addedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    fireOfferAccepted(widget, bundle, { presentmentUpsellValue, upsellQuantity });
    store.addState = "success";
    widget.render();
    setTimeout(() => {
      if (store.addBundleId === bundle.id) {
        store.addState = "idle";
        store.addBundleId = null;
        widget.render();
      }
    }, SUCCESS_RESET_MS);
  } catch (error) {
    console.error("[cro-fixed-bundle] add to cart failed:", error);
    showEcomposerToast(cartErrorMessage || widget._text("retry_text"), "error");
    store.addState = "error";
    widget.render();
  }
};
const nativeCroSign = (widget, bundleId, variantId) => {
  const { native } = widget.store;
  const key = `${bundleId}:${variantId}`;
  if (key in native.croSigns) return native.croSigns[key];
  if (!native.cartItems) return void 0;
  native.croSigns[key] = croSignFromCart(native.cartItems, bundleId, variantId);
  return native.croSigns[key];
};
const setHiddenFormInput = (form, name, value) => {
  let input = form.querySelector(`input[name="${CSS.escape(name)}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = value;
};
const reportNativeFormOffer = (widget, form, bundle, bundleProduct) => {
  const { native } = widget.store;
  if (native.offerReported) return;
  native.offerReported = true;
  setTimeout(() => {
    native.offerReported = false;
  }, 0);
  const idInput = form.querySelector('[name="id"]');
  const variant = bundleProduct?.variants?.find((v) => String(v.id) === String(idInput?.value));
  if (!variant) return;
  const qtyInput = form.querySelector('[name="quantity"]');
  const quantity = Math.max(1, Number(qtyInput?.value) || 1);
  const presentmentUpsellValue = (Number(variant.price) || 0) / 100 * quantity;
  fireOfferAccepted(widget, bundle, { presentmentUpsellValue, upsellQuantity: quantity });
};
const attachNativeFormSubmitListener = (widget, form, bundle, bundleProduct) => {
  if (form.dataset.croOfferListenerAttached) return;
  form.dataset.croOfferListenerAttached = "true";
  form.addEventListener("submit", () => reportNativeFormOffer(widget, form, bundle, bundleProduct));
};
const applyNativeFormTags = (widget, bundle) => {
  const { native } = widget.store;
  const bundleProduct = widget.embeddedData?.bundleProducts?.[bundle.bundleHandle];
  const variantIds = new Set((bundleProduct?.variants || []).map((variant) => String(variant.id)));
  if (!variantIds.size) return;
  const forms = document.querySelectorAll('form[action*="/cart/add"]');
  for (const form of forms) {
    const idInput = form.querySelector('[name="id"]');
    if (!idInput || !variantIds.has(String(idInput.value))) continue;
    setHiddenFormInput(form, "properties[_cro_ext]", EXTENSION_TYPE);
    setHiddenFormInput(form, "properties[_cro_campaign]", String(bundle.id));
    const croSign = nativeCroSign(widget, bundle.id, idInput.value);
    if (croSign === null) form.querySelector('input[name="properties[_cro_sign]"]')?.remove();
    else if (croSign !== void 0) setHiddenFormInput(form, "properties[_cro_sign]", croSign);
    native.forms.add(form);
    attachNativeFormSubmitListener(widget, form, bundle, bundleProduct);
  }
};
const loadNativeCartSnapshot = (widget) => {
  const { native } = widget.store;
  if (native.cartRequest || widget.isBuilderMode) return;
  native.cartRequest = fetchCartItems().then((items) => {
    native.cartItems = items || [];
    if (native.bundle) applyNativeFormTags(widget, native.bundle);
  });
};
const matchNativeFormForTrigger = (widget, trigger) => {
  const { native } = widget.store;
  const ownForm = trigger.closest("form");
  if (ownForm) return native.forms.has(ownForm) ? ownForm : null;
  const QUICK_ADD_WRAPPER = ".card, .card-wrapper, .product-card, .quick-add, quick-add-modal, [data-quick-add]";
  if (trigger.closest(QUICK_ADD_WRAPPER)) return null;
  for (const form of native.forms) {
    if (!form.isConnected) native.forms.delete(form);
  }
  const connectedForms = [...native.forms];
  if (connectedForms.length <= 1) return connectedForms[0] || null;
  return connectedForms.find((form) => form.querySelector('[type="submit"], [name="add"]')) || connectedForms[0];
};
const handleNativeAddToCartClick = (widget, event) => {
  const { native } = widget.store;
  if (!native.bundle || !native.forms.size) return;
  const trigger = event.target.closest?.(
    '[type="submit"], [name="add"], :is(button, a, [role="button"]):is([class*="add-to-cart" i], [class*="add_to_cart" i])'
  );
  if (!trigger || trigger.disabled) return;
  const bundleProduct = widget.embeddedData?.bundleProducts?.[native.bundle.bundleHandle];
  const triggerVariantId = trigger.getAttribute("data-variant-id");
  if (triggerVariantId && !bundleProduct?.variants?.some((v) => String(v.id) === triggerVariantId)) return;
  const form = matchNativeFormForTrigger(widget, trigger);
  if (!form) return;
  reportNativeFormOffer(widget, form, native.bundle, bundleProduct);
};
const observeNativeAddToCartButtonClicks = (widget) => {
  const { native } = widget.store;
  if (native.clickAttached) return;
  native.clickAttached = true;
  document.addEventListener("click", widget._onNativeAddToCartClick, true);
};
const observeNativeAddToCartForms = (widget) => {
  const { native } = widget.store;
  if (native.formObserver || typeof MutationObserver === "undefined") return;
  native.formObserver = new MutationObserver(() => {
    if (native.retagScheduled) return;
    native.retagScheduled = true;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    schedule(() => {
      native.retagScheduled = false;
      if (native.bundle) applyNativeFormTags(widget, native.bundle);
    });
  });
  native.formObserver.observe(document.body, { childList: true, subtree: true });
};
const tagNativeAddToCartForms = (widget, bundle) => {
  widget.store.native.bundle = bundle;
  loadNativeCartSnapshot(widget);
  applyNativeFormTags(widget, bundle);
  observeNativeAddToCartForms(widget);
  observeNativeAddToCartButtonClicks(widget);
  publishCroContext(widget.getAttribute("shop-currency"), widget.getAttribute("analytics-enabled"));
};
const fireImpression = (widget, bundleId) => {
  const { tracking } = widget.store;
  publishCroContext(widget.getAttribute("shop-currency"), widget.getAttribute("analytics-enabled"));
  if (window.__croFixedBundleFired.has(bundleId)) return;
  window.__croFixedBundleFired.add(bundleId);
  tracking.impressionAtByBundle[bundleId] = Date.now();
  const bundle = findBundle(widget, bundleId);
  if (!bundle) return;
  sendPixelEvent({
    name: "ext_impression",
    storeId: widget.getAttribute("store-id"),
    analyticsEnabled: widget.getAttribute("analytics-enabled"),
    extensionType: EXTENSION_TYPE,
    ruleId: String(bundle.id),
    ruleName: bundleRuleName(widget, bundle),
    pageId: "product-main",
    data: {
      source: getTrafficSource(),
      device: getDevice()
    }
  });
};
const syncImpressionObserver = (widget) => {
  const { tracking } = widget.store;
  if (typeof IntersectionObserver === "undefined" || widget.isBuilderMode) return;
  if (widget.getAttribute("design-mode") === "true") return;
  tracking.impressionObserver?.disconnect();
  const roots = widget.shadowRoot.querySelectorAll(".cro-fbw__bundle[data-bundle-id]");
  if (!roots.length) return;
  window.__croFixedBundleFired = window.__croFixedBundleFired || /* @__PURE__ */ new Set();
  tracking.impressionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const bundleId = entry.target.getAttribute("data-bundle-id");
      tracking.impressionObserver.unobserve(entry.target);
      fireImpression(widget, bundleId);
    }
  }, { threshold: 0.5 });
  roots.forEach((root) => tracking.impressionObserver.observe(root));
};
const disconnectCart = (widget) => {
  const { tracking, native } = widget.store;
  tracking.impressionObserver?.disconnect();
  native.formObserver?.disconnect();
  document.removeEventListener("click", widget._onNativeAddToCartClick, true);
  native.clickAttached = false;
};
const STICKY_LABEL_MIN_VALUES = 6;
const skeleton = (width, height = "1em") => `<span class="cro-fbw__sk" style="width:${width};height:${height}"></span>`;
const chevronIcon = () => `<svg class="cro-fbw__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
const pencilIcon = () => `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M9.91585 4.89302L11.177 3.63184C11.5597 3.24913 11.7515 3.05742 11.854 2.85097C11.95 2.65714 12 2.44373 12 2.2274C12 2.01107 11.95 1.79767 11.854 1.60383C11.7515 1.39738 11.5597 1.20567 11.177 0.822963C10.7943 0.440254 10.6026 0.248548 10.3962 0.146024C10.2023 0.0499738 9.98893 0 9.7726 0C9.55627 0 9.34286 0.0499738 9.14903 0.146024C8.94258 0.248548 8.75087 0.440254 8.36816 0.822963L7.09083 2.1003C7.77032 3.2636 8.74481 4.22695 9.91585 4.89302ZM6.0698 3.12133L1.24555 7.94557C0.946409 8.24472 0.797538 8.39359 0.699228 8.57757C0.600917 8.76014 0.559486 8.9673 0.477327 9.38161L0.0447596 11.5423C-0.00158681 11.7755 -0.0254623 11.892 0.0412485 11.9588C0.107959 12.0255 0.223825 12.0016 0.457664 11.9552L2.61839 11.5227C3.0327 11.4405 3.23986 11.3991 3.42314 11.3008C3.60641 11.2025 3.75529 11.0536 4.05373 10.7551L8.89202 5.91686C7.75585 5.20558 6.7917 4.25102 6.0691 3.12203" fill="black" style="fill:black;fill-opacity:1;"/> </svg>`;
const checkIcon = () => `<svg class="cro-fbw__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>`;
const renderBundlePrice = (ctx, view) => {
  const { totals, hasSaving, pending } = view;
  if (pending) {
    return `<span class="cro-fbw__price">
                <span class="cro-fbw__price-now">${skeleton("68px", "1.05em")}</span>
                <span class="cro-fbw__price-was">${skeleton("44px", "0.85em")}</span>
                <span class="cro-fbw__save">${skeleton("58px", "0.85em")}</span>
            </span>`;
  }
  const saveText = hasSaving ? ctx.text("save_price_text", { amount: ctx.money(totals.saved), discount: `${totals.pct || 0}%` }) : "";
  return `<span class="cro-fbw__price">
                <span class="cro-fbw__price-now">${escapeHtml(ctx.money(totals.now))}</span>
                ${hasSaving ? `<span class="cro-fbw__price-was">${escapeHtml(ctx.money(totals.original))}</span>` : ""}
                ${saveText ? `<span class="cro-fbw__save">${escapeHtml(saveText)}</span>` : ""}
            </span>`;
};
const renderIncludedHead = (ctx, bundle) => {
  const badge = bundle.badge ? `<span class="cro-fbw__flag">${escapeHtml(bundle.badge)}</span>` : "";
  return `<div class="cro-fbw__head cro-fbw__head--static cro-fbw__head--products">
            <span class="cro-fbw__head-copy">
                <div class="cro-fbw__bundle-title-wrapper">
                    <span class="cro-fbw__bundle-title">${escapeHtml(ctx.text("included_products_text"))}</span>
                    ${badge}
                </div>
            </span>
        </div>`;
};
const renderCard$2 = (ctx, card, readOnly = false) => {
  const { settings } = ctx;
  const orient = settings.card_layout === "horizontal" ? "cro-fbw__card--h" : "cro-fbw__card--v";
  const showPrice = settings.show_product_price !== false && card.hasProduct;
  const showCompare = showPrice && settings.show_product_compare_price !== false && card.hasCompare;
  const showSummary = !readOnly && settings.show_add_to_cart !== false && settings.show_product_variant_summary !== false && card.variantSummary;
  const showQty = settings.show_product_quantity !== false;
  const media = card.imageUrl ? `<img class="cro-fbw__img" src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.title)}" loading="lazy">` : `<span class="cro-fbw__img cro-fbw__img--ph" role="img" aria-label="${escapeHtml(card.title)}"></span>`;
  const oosLabel = `<span class="cro-fbw__oos">${escapeHtml(ctx.text("out_of_stock_text"))}</span>`;
  const changeButton = `<button type="button" class="cro-fbw__change" data-action="edit" data-bundle-id="${escapeHtml(card.bundleId)}" data-product-id="${escapeHtml(card.productId)}">${pencilIcon()}<span>${escapeHtml(ctx.text("change_variant_text"))}</span></button>`;
  const action = !readOnly && card.hasPicker ? card.unavailable ? `${oosLabel}${card.noAlternativeVariant ? "" : changeButton}` : changeButton : card.unavailable ? oosLabel : "";
  return `<div class="cro-fbw__card ${orient}${card.unavailable ? " cro-fbw__card--unavailable" : ""}" data-bundle-id="${escapeHtml(card.bundleId)}" data-product-id="${escapeHtml(card.productId)}">
            <div class="cro-fbw__media">
                ${media}
            ${showQty ? `<span class="cro-fbw__qty">${escapeHtml(String(card.quantity))}</span>` : ""}</div>

            <div class="cro-fbw__card-body">
                ${card.linkHandle ? `<a class="cro-fbw__name" href="/products/${escapeHtml(card.linkHandle)}">${escapeHtml(card.title)}</a>` : `<span class="cro-fbw__name">${escapeHtml(card.title)}</span>`}
                ${showPrice ? `<span class="cro-fbw__card-price">
                    ${showCompare ? `<span class="cro-fbw__card-was">${escapeHtml(ctx.money(card.compare))}</span>` : ""}
                    <span class="cro-fbw__card-now">${escapeHtml(ctx.money(card.price))}</span>
                </span>` : ""}
                ${showSummary ? `<span class="cro-fbw__variant">${escapeHtml(card.variantSummary)}</span>` : ""}
                ${action}
            </div>
        </div>`;
};
const renderCardSkeleton = (ctx) => {
  const orient = ctx.settings.card_layout === "horizontal" ? "cro-fbw__card--h" : "cro-fbw__card--v";
  return `<div class="cro-fbw__card ${orient}">
            <div class="cro-fbw__media">${skeleton("100%", "100%")}</div>
            <div class="cro-fbw__card-body">
                ${skeleton("70%", "1em")}
                ${skeleton("45%", "1.2em")}
            </div>
        </div>`;
};
const renderCta = (ctx, view) => {
  const { bundle, totals, count, ctaState } = view;
  const discountHtml = `<span class="cro-fbw__note-save">${escapeHtml(`${totals.pct || 0}%`)}</span>`;
  const savedHtml = `<span class="cro-fbw__note-save">${escapeHtml(ctx.money(totals.saved))}</span>`;
  const summary = totals.saved > 0 ? ctx.textHtml("summary_text", { items: count, saved: savedHtml, discount: discountHtml }) : "";
  const label = ctx.text("add_to_cart_text", { price: ctx.money(totals.now), items: count });
  let button, note = summary;
  switch (ctaState) {
    case "resolving":
      button = `<button type="button" class="cro-fbw__cta" disabled>${ctx.textHtml("add_to_cart_text", { price: skeleton("52px", "0.9em"), items: count })}</button>`;
      note = `<span class="cro-fbw__sk" style="width:70%;height:0.85em"></span>`;
      break;
    case "unavailable":
      button = `<button type="button" class="cro-fbw__cta cro-fbw__cta--unavailable" disabled>${escapeHtml(ctx.text("unavailable_text"))}</button>`;
      note = "";
      break;
    case "adding":
      button = `<button type="button" class="cro-fbw__cta cro-fbw__cta--loading" disabled><span class="cro-fbw__spinner"></span>${escapeHtml(ctx.text("adding_text"))}</button>`;
      break;
    case "success":
      button = `<button type="button" class="cro-fbw__cta cro-fbw__cta--success" disabled>${checkIcon()}<span>${escapeHtml(ctx.text("added_text"))}</span></button>`;
      break;
    case "error":
      button = `<button type="button" class="cro-fbw__cta" data-action="add" data-bundle-id="${escapeHtml(bundle.id)}">${escapeHtml(ctx.text("retry_text"))}</button>`;
      break;
    default:
      button = `<button type="button" class="cro-fbw__cta" data-action="add" data-bundle-id="${escapeHtml(bundle.id)}">${escapeHtml(label)}</button>`;
  }
  return `<div class="cro-fbw__foot" data-bundle-id="${escapeHtml(bundle.id)}" aria-live="polite">${button}${note ? `<p class="cro-fbw__note">${note}</p>` : ""}</div>`;
};
const renderPicker = (editor) => editor.options.map((opt) => {
  const attrs = `data-bundle-id="${escapeHtml(editor.bundleId)}" data-product-id="${escapeHtml(editor.productId)}" data-option="${escapeHtml(opt.key)}"`;
  const radios = opt.values.map(({ id, label, selected, available }) => `<label class="cro-fbw__radio${!available ? " cro-fbw__radio--sold" : ""}">
                    <input type="radio" class="cro-fbw__radio-input" name="${escapeHtml(`${editor.bundleId}:${editor.productId}:${opt.key}`)}" value="${escapeHtml(id)}" ${selected ? "checked" : ""} ${!available ? "disabled" : ""} data-action="pick" ${attrs} data-value="${escapeHtml(id)}">
                    <span class="cro-fbw__radio-dot" aria-hidden="true"></span>
                    <span class="cro-fbw__radio-text">${escapeHtml(label)}</span>
                </label>`).join("");
  return `<fieldset class="cro-fbw__opt${opt.values.length >= STICKY_LABEL_MIN_VALUES ? " cro-fbw__opt--many" : ""}">
                <legend class="cro-fbw__opt-label">${escapeHtml(opt.name)}</legend>
                <div class="cro-fbw__radios">${radios}</div>
            </fieldset>`;
}).join("");
const CARET_ICON = `<svg class="cro-fbw__caret" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 1 5 5 9 1"/></svg>`;
const selectedValuesLabel = (options) => options.map((option) => option.values.find((choice) => choice.selected)?.label).filter(Boolean).join(" / ");
const renderVariantPicker = (ctx, card) => {
  if (!card.hasPicker || !card.options.length || card.unavailable && card.noAlternativeVariant) return "";
  const ids = `data-bundle-id="${escapeHtml(card.bundleId)}" data-product-id="${escapeHtml(card.productId)}"`;
  const pickerClass = `cro-fbw__picker${card.unavailable ? " cro-fbw__picker--unavailable" : ""}`;
  if (card.options.length === 1) {
    const [option] = card.options;
    const soldOutText = ctx.text("out_of_stock_text");
    const choices = option.values.map(({ id, label: label2, selected, available }) => {
      const text = available || !soldOutText ? label2 : `${label2} - ${soldOutText}`;
      return `<option value="${escapeHtml(id)}"${selected ? " selected" : ""}${available ? "" : " disabled"}>${escapeHtml(text)}</option>`;
    }).join("");
    return `<span class="${pickerClass}">
            <select class="cro-fbw__picker-input" data-action="pick" ${ids} data-option="${escapeHtml(option.key)}" aria-label="${escapeHtml(`${option.name}, ${card.title}`)}">${choices}</select>
            ${CARET_ICON}
        </span>`;
  }
  const label = selectedValuesLabel(card.options);
  return `<span class="${pickerClass} cro-fbw__picker--multi">
        <button type="button" class="cro-fbw__picker-input" data-action="edit" ${ids} aria-haspopup="dialog" aria-label="${escapeHtml(`${ctx.text("change_variant_text")}, ${card.title}`)}" title="${escapeHtml(label)}"><span class="cro-fbw__picker-label">${escapeHtml(label)}</span></button>
        ${CARET_ICON}
    </span>`;
};
const renderProductRowSkeleton = () => `<div class="cro-fbw__row">
        <span class="cro-fbw__row-media">${skeleton("100%", "100%")}</span>
        <span class="cro-fbw__row-info">${skeleton("70%", "1em")}${skeleton("40%", "0.85em")}</span>
    </div>`;
const renderProductRow = (ctx, card, readOnly) => {
  const { settings } = ctx;
  const showPrice = settings.show_product_price !== false && card.hasProduct;
  const showCompare = showPrice && settings.show_product_compare_price !== false && card.hasCompare;
  const showQty = settings.show_product_quantity !== false;
  const picker = readOnly ? "" : renderVariantPicker(ctx, card);
  const showSummary = !readOnly && !picker && settings.show_add_to_cart !== false && settings.show_product_variant_summary !== false && card.variantSummary;
  const media = card.imageUrl ? `<img class="cro-fbw__img" src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.title)}" loading="lazy">` : `<span class="cro-fbw__img cro-fbw__img--ph" role="img" aria-label="${escapeHtml(card.title)}"></span>`;
  const name = card.linkHandle ? `<a class="cro-fbw__name" href="/products/${escapeHtml(card.linkHandle)}">${escapeHtml(card.title)}</a>` : `<span class="cro-fbw__name">${escapeHtml(card.title)}</span>`;
  const price = showPrice ? `<span class="cro-fbw__card-price">${showCompare ? `<span class="cro-fbw__card-was">${escapeHtml(ctx.money(card.compare))}</span>` : ""}<span class="cro-fbw__card-now">${escapeHtml(ctx.money(card.price))}</span></span>` : "";
  return `<div class="cro-fbw__row${card.unavailable ? " cro-fbw__row--unavailable" : ""}" data-bundle-id="${escapeHtml(card.bundleId)}" data-product-id="${escapeHtml(card.productId)}">
        <span class="cro-fbw__row-media">${media}${showQty ? `<span class="cro-fbw__qty">${escapeHtml(String(card.quantity))}</span>` : ""}</span>
        <span class="cro-fbw__row-info">
            ${name}
            ${picker}
            ${showSummary ? `<span class="cro-fbw__variant">${escapeHtml(card.variantSummary)}</span>` : ""}
            ${card.unavailable ? `<span class="cro-fbw__oos">${escapeHtml(ctx.text("out_of_stock_text"))}</span>` : ""}
        </span>
        <span class="cro-fbw__row-end">${price}</span>
    </div>`;
};
const renderProductRows = (ctx, view, readOnly) => view.hydrated === false ? view.items.map(() => renderProductRowSkeleton()).join("") : view.items.map(({ card }) => renderProductRow(ctx, card, readOnly)).join("");
const renderEditor = (ctx, editor) => {
  if (!editor) return `<div class="cro-fbw__editor" data-editor hidden></div>`;
  const title = ctx.text("picker_title_text", { product_title: editor.productTitle });
  return `<div class="cro-fbw__editor cro-fbw__editor--open" data-editor>
            <div class="cro-fbw__backdrop" data-action="close-editor"></div>
            <div class="cro-fbw__sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="cro-fbw__sheet-head">
                    <h4 class="cro-fbw__sheet-title">${escapeHtml(title)}</h4>
                    <button type="button" class="cro-fbw__sheet-close" data-action="close-editor" aria-label="Close">×</button>
                </div>
                <div class="cro-fbw__sheet-body">${renderPicker(editor)}</div>
            </div>
        </div>`;
};
const scrollClipBounds = (widget) => {
  let top = 0;
  let bottom = window.innerHeight;
  let el = widget.parentElement;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = getComputedStyle(el);
    if (style.overflowY !== "visible") {
      const rect = el.getBoundingClientRect();
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
    el = el.parentElement;
  }
  return { top, bottom };
};
const positionEditor = (widget) => {
  const { editor } = widget.store;
  if (!editor || !widget.shadowRoot) return;
  const root = widget.shadowRoot.querySelector(".cro-fbw");
  const sheet = widget.shadowRoot.querySelector(".cro-fbw__sheet");
  const owner = `[data-bundle-id="${CSS.escape(editor.bundleId)}"][data-product-id="${CSS.escape(editor.productId)}"]`;
  const card = widget.shadowRoot.querySelector(`.cro-fbw__card${owner}`);
  const editButton = widget.shadowRoot.querySelector(`[data-action="edit"]${owner}`);
  if (!root || !sheet || !(editButton || card)) return;
  const anchor = editButton || card;
  const MARGIN = 8;
  const W = Math.min(288, Math.max(0, root.clientWidth - MARGIN * 2));
  const rr = root.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
  const anchorStart = getComputedStyle(root).direction === "rtl" ? ar.right - rr.left - W : ar.left - rr.left;
  const left = Math.max(MARGIN, Math.min(anchorStart, root.clientWidth - W - MARGIN));
  const GAP = 6;
  const clip = scrollClipBounds(widget);
  const spaceBelow = clip.bottom - ar.bottom - GAP - MARGIN;
  const spaceAbove = ar.top - clip.top - GAP - MARGIN;
  const openAbove = spaceAbove > spaceBelow;
  const maxHeight = Math.max(160, Math.min(openAbove ? spaceAbove : spaceBelow, 560));
  sheet.style.setProperty("--cro-pop-left", Math.round(left) + "px");
  sheet.style.setProperty("--cro-pop-w", Math.round(W) + "px");
  sheet.style.setProperty("--cro-pop-max-h", Math.round(maxHeight) + "px");
  if (openAbove) {
    sheet.style.top = "auto";
    sheet.style.bottom = Math.round(rr.bottom - ar.top + GAP) + "px";
  } else {
    sheet.style.bottom = "auto";
    sheet.style.top = Math.round(ar.bottom - rr.top + GAP) + "px";
  }
};
const foldoutStyles = ".cro-fbw__chevron-wrap {\n    width: var(--cro-chevron-size);\n    height: var(--cro-chevron-size);\n    border-radius: var(--cro-radius-full);\n    display: grid;\n    place-items: center;\n    flex: none;\n    text-decoration: none;\n    transition: background .15s ease, border-color .15s ease;\n}\n\n.cro-fbw__bundle--open .cro-fbw__chevron-wrap {\n    background: var(--cro-cta-bg);\n    border: 1.5px solid var(--cro-cta-bg);\n}\n\n.cro-fbw__chevron {\n    width: var(--cro-chevron-icon);\n    height: var(--cro-chevron-icon);\n    flex: none;\n    color: var(--cro-muted);\n    transform: rotate(-90deg);\n    transition: transform .2s ease;\n}\n\n.cro-fbw__chevron:dir(rtl) {\n    transform: rotate(90deg);\n}\n\n.cro-fbw__bundle--open .cro-fbw__chevron {\n    color: var(--cro-cta-fg);\n    transform: rotate(0deg);\n}\n\n.cro-fbw__thumbs {\n    display: flex;\n    align-items: center;\n}\n\n.cro-fbw__head:not(.cro-fbw__head--static) .cro-fbw__thumbs {\n    padding-inline-start: 30px;\n}\n\n.cro-fbw__thumb {\n    width: var(--cro-thumb-size);\n    height: var(--cro-thumb-size);\n    border-radius: var(--cro-radius-full);\n    overflow: hidden;\n    border: 1px solid var(--cro-border-subtle);\n    margin-inline-end: calc(var(--cro-thumb-size) * -.5);\n}\n\n.cro-fbw__thumb img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    display: block;\n}\n\n.cro-fbw__thumb-more {\n    font-size: var(--cro-fs-md);\n    color: var(--cro-fg);\n    font-weight: var(--cro-fw-medium);\n    margin-inline-start: 20px;\n    unicode-bidi: plaintext;\n}\n\n.cro-fbw__cards--grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(var(--cro-card-min-w), 1fr));\n    gap: var(--cro-grid-gap);\n}\n\n.cro-fbw__cards--grid:has(.cro-fbw__card--h) {\n    grid-template-columns: repeat(auto-fill, minmax(calc(var(--cro-card-min-w) + 80px), 1fr));\n}\n\n.cro-fbw__slider {\n    position: relative;\n}\n\n.cro-fbw__cards--slide {\n    display: flex;\n    gap: var(--cro-slide-gap);\n    overflow-x: auto;\n    scroll-snap-type: x mandatory;\n    padding-bottom: 2px;\n    padding-inline-end: 1px;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n}\n\n.cro-fbw__cards--slide::-webkit-scrollbar {\n    display: none;\n}\n\n.cro-fbw__cards--slide .cro-fbw__card {\n    flex: 0 0 auto;\n    scroll-snap-align: start;\n    width: min(var(--cro-slide-card-w), 100%);\n}\n\n.cro-fbw__cards--slide .cro-fbw__card:last-child {\n    scroll-snap-align: end;\n}\n\n.cro-fbw__arrow {\n    position: absolute;\n    top: calc(50% - var(--cro-arrow-size) * 0.8);\n    width: var(--cro-arrow-size);\n    height: var(--cro-arrow-size);\n    border-radius: var(--cro-radius-full);\n    border: 1px solid var(--cro-border-subtle);\n    background: var(--cro-arrow-bg);\n    cursor: pointer;\n    display: grid;\n    place-items: center;\n    color: var(--cro-arrow-fg);\n    font-size: calc(var(--cro-arrow-size) * .6);\n    line-height: 1;\n    z-index: 4;\n    box-shadow: var(--cro-arrow-shadow);\n}\n\n.cro-fbw__arrow svg {\n    display: block;\n}\n\n.cro-fbw__arrow--prev {\n    inset-inline-start: var(--cro-arrow-offset);\n    margin-inline-start: calc(var(--cro-arrow-size) * -.5);\n}\n\n.cro-fbw__arrow--next {\n    inset-inline-end: var(--cro-arrow-offset);\n    margin-inline-end: calc(var(--cro-arrow-size) * -.5);\n}\n\n.cro-fbw__arrow--prev svg,\n.cro-fbw__arrow--next:dir(rtl) svg {\n    transform: rotate(180deg);\n}\n\n.cro-fbw__arrow--prev:dir(rtl) svg {\n    transform: none;\n}\n\n.cro-fbw__arrow[disabled] {\n    opacity: 0;\n    pointer-events: none;\n}\n\n.cro-fbw__card {\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    padding: var(--cro-card-pad);\n    display: flex;\n    overflow: hidden;\n}\n\n.cro-fbw__card--v {\n    flex-direction: column;\n}\n\n.cro-fbw__card--h {\n    flex-direction: row;\n    gap: var(--cro-card-body-gap);\n    align-items: stretch;\n}\n\n.cro-fbw__card--unavailable {\n    opacity: .7;\n}\n\n.cro-fbw__media {\n    position: relative;\n    border-radius: var(--cro-image-radius);\n    overflow: hidden;\n    background: var(--cro-surface);\n    border: 1px solid var(--cro-line);\n}\n\n.cro-fbw__card--v .cro-fbw__media {\n    width: 100%;\n    aspect-ratio: var(--cro-img-ratio);\n}\n\n.cro-fbw__card--h .cro-fbw__media {\n    flex: none;\n    width: var(--cro-img-h-w);\n    height: var(--cro-img-h-h);\n}\n\n.cro-fbw__card-body {\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-card-body-gap);\n    padding: var(--cro-card-body-pad);\n}\n\n.cro-fbw__card--h .cro-fbw__card-body {\n    flex: 1;\n    padding: 0;\n    gap: calc(var(--cro-card-body-gap) * .7);\n    justify-content: center;\n}\n\n.cro-fbw__card--h .cro-fbw__name,\n.cro-fbw__card--h .cro-fbw__variant {\n    -webkit-line-clamp: 1;\n}\n\n.cro-fbw__change {\n    width: 100%;\n    background: var(--cro-bg);\n    border: 1px solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    padding: var(--cro-change-pad);\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 6px;\n\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-base);\n}\n\n.cro-fbw__card--v .cro-fbw__change {\n    margin-top: auto;\n}\n\n.cro-fbw__card--h .cro-fbw__qty {\n    top: 6px;\n    inset-inline-end: 6px;\n    min-width: calc(var(--cro-qty-size) * .8);\n    height: calc(var(--cro-qty-size) * .8);\n    padding: 0 6px;\n    font-size: var(--cro-fs-xs);\n}\n\n.cro-fbw__card--h .cro-fbw__change {\n    padding: calc(var(--cro-change-pad) * .8) calc(var(--cro-change-pad) * 1.4);\n}\n\n.cro-fbw__change:hover {\n    border-color: var(--cro-faint);\n}\n";
const giftIcon = () => `<svg class="cro-fbw__header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`;
const renderClassic = (headerText) => `<div class="cro-fbw__header">
            <span class="cro-fbw__header-text">${escapeHtml(headerText)}</span>
        </div>`;
const renderRibbon = (headerText, subtitle) => `<div class="cro-fbw__header cro-fbw__header--ribbon">
            <span class="cro-fbw__header-main">${giftIcon()}<span class="cro-fbw__header-text">${escapeHtml(headerText)}</span></span>
            ${subtitle ? `<span class="cro-fbw__header-sep" aria-hidden="true"></span><span class="cro-fbw__header-sub">${escapeHtml(subtitle)}</span>` : ""}
        </div>`;
const renderNotch = (headerText) => `<div class="cro-fbw__header cro-fbw__header--notch">
            <span class="cro-fbw__header-pill">${giftIcon()}<span class="cro-fbw__header-text">${escapeHtml(headerText)}</span></span>
        </div>`;
const renderTab = (headerText) => `<div class="cro-fbw__header cro-fbw__header--tab" title="${escapeHtml(headerText)}">
            ${giftIcon()}<span class="cro-fbw__header-text">${escapeHtml(headerText)}</span>
        </div>`;
const renderArrow$1 = (headerText, subtitle) => `<div class="cro-fbw__header cro-fbw__header--arrow">
            <span class="cro-fbw__header-label">${giftIcon()}<span class="cro-fbw__header-text">${escapeHtml(headerText)}</span></span>
            ${subtitle ? `<span class="cro-fbw__header-sub">${escapeHtml(subtitle)}</span>` : ""}
        </div>`;
const HEADER_RENDERERS = {
  classic: renderClassic,
  ribbon: renderRibbon,
  notch: renderNotch,
  tab: renderTab,
  arrow: renderArrow$1
};
const renderHeader = (ctx) => {
  const headerText = ctx.text("header_text");
  if (!headerText) return "";
  const render = HEADER_RENDERERS[ctx.settings.header_layout] || renderClassic;
  return render(headerText, ctx.text("header_subtitle"));
};
const ARROW_ICON = `<svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0.753715 8L5 4L0.753715 1.34975e-07L-4.54269e-07 0.71L3.49257 4L-2.45114e-07 7.29L0.753715 8Z" fill="currentColor" /> </svg>`;
const renderProductList = (settings, cards) => settings.product_layout === "slider" ? `<div class="cro-fbw__slider">
                    <button type="button" class="cro-fbw__arrow cro-fbw__arrow--prev" data-action="slide" data-dir="-1" aria-label="Previous" disabled>${ARROW_ICON}</button>
                    <div class="cro-fbw__cards cro-fbw__cards--slide">${cards}</div>
                    <button type="button" class="cro-fbw__arrow cro-fbw__arrow--next" data-action="slide" data-dir="1" aria-label="More">${ARROW_ICON}</button>
               </div>` : `<div class="cro-fbw__cards cro-fbw__cards--grid">${cards}</div>`;
const renderThumbnails$1 = (ctx, view) => {
  if (ctx.settings.show_bundle_thumbnails === false) return "";
  const { items, hydrated } = view;
  return items.slice(0, 3).map(({ product }) => {
    if (!hydrated) return `<span class="cro-fbw__thumb">${skeleton("100%", "100%")}</span>`;
    const img = safeImageUrl(product?.imageUrl);
    return `<span class="cro-fbw__thumb">${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy">` : ""}</span>`;
  }).join("") + (items.length > 3 ? `<span class="cro-fbw__thumb-more">+${items.length - 3}</span>` : "");
};
const renderBundle = (ctx, view) => {
  const { bundle, index, hydrated, allowCollapse, isOpen, title, items, unavailable } = view;
  const id = `cro-fbw-b${index}`;
  const thumbs = renderThumbnails$1(ctx, view);
  const badge = bundle.badge ? `<span class="cro-fbw__flag">${escapeHtml(bundle.badge)}</span>` : "";
  const cards = hydrated ? items.map(({ card }) => renderCard$2(ctx, card)).join("") : items.map(() => renderCardSkeleton(ctx)).join("");
  const panel = isOpen ? `<div class="cro-fbw__panel" id="${id}-panel" role="region" aria-labelledby="${id}">
            ${renderProductList(ctx.settings, cards)}
            ${ctx.settings.show_add_to_cart !== false ? renderCta(ctx, view) : ""}
        </div>` : `<div class="cro-fbw__panel" id="${id}-panel" hidden></div>`;
  const head = `<div class="cro-fbw__head${allowCollapse ? "" : " cro-fbw__head--static"}"
            ${allowCollapse ? `data-action="toggle" data-bundle-id="${escapeHtml(bundle.id)}" role="button" tabindex="0"` : ""}
            aria-expanded="${isOpen}" aria-controls="${id}-panel" id="${id}">
            <span class="cro-fbw__head-copy">
                <div class="cro-fbw__bundle-title-wrapper">
                    ${allowCollapse ? `<span class="cro-fbw__chevron-wrap">${chevronIcon()}</span>` : ""}
                    <a class="cro-fbw__bundle-title" href="/products/${escapeHtml(bundle.bundleHandle)}">${escapeHtml(title)}</a>
                    ${badge}
                </div>
                ${thumbs ? `<span class="cro-fbw__thumbs">${thumbs}</span>` : ""}
            </span>
            ${renderBundlePrice(ctx, view)}
        </div>`;
  return `<section class="cro-fbw__bundle${isOpen ? " cro-fbw__bundle--open" : ""}${unavailable ? " cro-fbw__bundle--unavailable" : ""}" data-bundle-id="${escapeHtml(bundle.id)}">
            ${head}${panel}
        </section>`;
};
const renderBundles$4 = (ctx, views, editor) => `<div class="cro-fbw">
                ${renderHeader(ctx)}
                <div class="cro-fbw__list" role="group" aria-label="Available bundles">
                    ${views.map((view) => renderBundle(ctx, view)).join("")}
                </div>
                ${renderEditor(ctx, editor)}
            </div>`;
const renderCurrentBundle$4 = (ctx, view) => {
  const { bundle, items } = view;
  const cards = items.map(({ card }) => renderCard$2(ctx, card, true)).join("");
  return `<div class="cro-fbw cro-fbw--products">
                    <div class="cro-fbw__list" role="group" aria-label="Bundle products">
                        <section class="cro-fbw__bundle cro-fbw__bundle--open cro-fbw__bundle--products" data-bundle-id="${escapeHtml(bundle.id)}">
            ${renderIncludedHead(ctx, bundle)}
            <div class="cro-fbw__panel">${renderProductList(ctx.settings, cards)}</div>
        </section>
                    </div>
                </div>`;
};
const captureState$4 = (root) => {
  const sliders = {};
  root.querySelectorAll(".cro-fbw__cards--slide").forEach((row) => {
    const key = row.closest("[data-bundle-id]")?.getAttribute("data-bundle-id") ?? "0";
    sliders[key] = row.scrollLeft;
  });
  return sliders;
};
const restoreState$4 = (root, sliders) => {
  for (const [key, left] of Object.entries(sliders)) {
    const section = root.querySelector(`.cro-fbw__bundle[data-bundle-id="${CSS.escape(key)}"]`);
    const row = section?.querySelector(".cro-fbw__cards--slide");
    if (row) row.scrollLeft = left;
  }
};
const syncSlider = (widget) => {
  const state = widget.store.layout;
  state.sliderResizeObserver?.disconnect();
  state.sliderResizeObserver = null;
  widget.shadowRoot?.querySelectorAll(".cro-fbw__cards--slide").forEach((row) => {
    const slider = row.closest(".cro-fbw__slider");
    const prev = slider.querySelector(".cro-fbw__arrow--prev");
    const next = slider.querySelector(".cro-fbw__arrow--next");
    const update = () => {
      const max = row.scrollWidth - row.clientWidth;
      const fits = max <= 2;
      const offset = Math.abs(row.scrollLeft);
      row.style.overflowX = fits ? "unset" : "";
      if (prev) prev.disabled = offset <= 1;
      if (next) next.disabled = offset >= max - 1 || fits;
    };
    row.addEventListener("scroll", update, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      state.sliderResizeObserver ||= new ResizeObserver((entries) => entries.forEach((entry) => entry.target._updateSlider?.()));
      row._updateSlider = update;
      state.sliderResizeObserver.observe(row);
    }
    if (typeof window !== "undefined") window.requestAnimationFrame(update);
  });
};
const handleClick = (event) => {
  const slide = event.target.closest("[data-action='slide']");
  if (!slide) return false;
  const row = slide.closest(".cro-fbw__slider")?.querySelector(".cro-fbw__cards--slide");
  if (row) {
    const flow = getComputedStyle(row).direction === "rtl" ? -1 : 1;
    row.scrollBy({ left: Number(slide.dataset.dir) * flow * row.clientWidth * 0.8, behavior: "smooth" });
  }
  return true;
};
const foldoutLayout = {
  styles: foldoutStyles,
  renderBundles: renderBundles$4,
  renderCurrentBundle: renderCurrentBundle$4,
  captureState: captureState$4,
  restoreState: restoreState$4,
  afterRender: syncSlider,
  handleClick,
  dispose: (widget) => widget.store.layout.sliderResizeObserver?.disconnect()
};
const lineupStyles = '.cro-fbw--lineup .cro-fbw__bundle + .cro-fbw__bundle::before {\n    content: none;\n}\n\n.cro-fbw-sel__list {\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-grid-gap);\n    padding: var(--cro-content-padding) var(--cro-content-padding) 0;\n}\n\n.cro-fbw-sel__option {\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    background: var(--cro-bg);\n    overflow: hidden;\n    transition: border-color .15s ease, box-shadow .15s ease;\n}\n\n.cro-fbw-sel__option:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw-sel__option.cro-fbw__bundle--open {\n    border-color: var(--cro-sel);\n    box-shadow: 0 0 0 1px var(--cro-sel);\n}\n\n.cro-fbw-sel__top {\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    min-height: 44px;\n    padding: var(--cro-card-body-pad) calc(var(--cro-card-body-pad) + 4px);\n    cursor: pointer;\n}\n\n.cro-fbw__bundle--open .cro-fbw-sel__top {\n    cursor: default;\n}\n\n.cro-fbw-sel__top:focus-visible {\n    outline: 2px solid var(--cro-sel);\n    outline-offset: -2px;\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-fbw-sel__dot {\n    flex: none;\n    width: 20px;\n    height: 20px;\n    border-radius: var(--cro-radius-full);\n    border: 2px solid var(--cro-faint);\n    display: grid;\n    place-items: center;\n    transition: border-color .15s ease;\n}\n\n.cro-fbw-sel__dot::after {\n    content: "";\n    width: 10px;\n    height: 10px;\n    border-radius: var(--cro-radius-full);\n    background: var(--cro-sel);\n    transform: scale(0);\n    transition: transform .15s ease;\n}\n\n.cro-fbw__bundle--open .cro-fbw-sel__dot {\n    border-color: var(--cro-sel);\n}\n\n.cro-fbw__bundle--open .cro-fbw-sel__dot::after {\n    transform: scale(1);\n}\n\n.cro-fbw-sel__main {\n    flex: 1;\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n}\n\n.cro-fbw-sel__title-row {\n    display: flex;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: 9px;\n    min-width: 0;\n}\n\n.cro-fbw-sel__thumbs {\n    display: flex;\n    gap: 6px;\n    min-width: 0;\n    overflow: hidden;\n}\n\n.cro-fbw-sel__thumb {\n    position: relative;\n    flex: none;\n    display: block;\n    width: var(--cro-thumb-size);\n    height: var(--cro-thumb-size);\n    border-radius: var(--cro-image-radius);\n    border: 1px solid var(--cro-line);\n    background: var(--cro-surface);\n    overflow: hidden;\n}\n\n.cro-fbw-sel__thumb img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.cro-fbw-sel__thumb--more {\n    display: none;\n}\n\n.cro-fbw-sel__thumb--more::after {\n    content: "";\n    position: absolute;\n    inset: 0;\n    background: rgba(0, 0, 0, .5);\n}\n\n.cro-fbw-sel__more-count {\n    position: absolute;\n    inset: 0;\n    z-index: 1;\n    display: grid;\n    place-items: center;\n    color: #fff;\n    font-size: calc(var(--cro-thumb-size) * .36);\n    font-weight: var(--cro-fw-semibold);\n    direction: ltr;\n    unicode-bidi: isolate;\n}\n\n.cro-fbw-sel__more-narrow {\n    display: none;\n}\n\n.cro-fbw__bundle--open .cro-fbw-sel__thumbs {\n    display: none;\n}\n\n.cro-fbw-sel__option .cro-fbw__price {\n    flex: 0 1 auto;\n    min-width: 0;\n    max-width: 50%;\n    gap: 6px;\n}\n\n.cro-fbw-sel__option .cro-fbw__price > * {\n    max-width: 100%;\n    white-space: normal;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-sel__items {\n    margin: 0 calc(var(--cro-card-body-pad) + 4px);\n    border-top: 1px solid var(--cro-line);\n}\n\n.cro-fbw-sel__plain {\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    padding: 0 calc(var(--cro-card-body-pad) + 4px);\n}\n\n.cro-fbw-sel__foot {\n    padding: 0 var(--cro-content-padding) var(--cro-content-padding);\n}\n\n.cro-fbw--lineup:not(:has(> .cro-fbw-sel__foot)) .cro-fbw-sel__list {\n    padding-bottom: var(--cro-content-padding);\n}\n\n.cro-fbw-sel__foot .cro-fbw__foot {\n    padding-block: var(--cro-content-padding) 0;\n}\n\n.cro-fbw--lineup.cro-fbw--products .cro-fbw__panel {\n    padding-bottom: var(--cro-content-padding);\n}\n\n.cro-fbw-sel__option--entering .cro-fbw-sel__items {\n    animation: cro-fbw-sel-reveal .24s ease-out;\n}\n\n.cro-fbw-sel__option--entering .cro-fbw-sel__dot::after {\n    animation: cro-fbw-sel-dot .2s ease-out;\n}\n\n@keyframes cro-fbw-sel-reveal {\n    from {\n        opacity: 0;\n        transform: translateY(-4px);\n    }\n}\n\n@keyframes cro-fbw-sel-dot {\n    from {\n        transform: scale(0);\n    }\n}\n\n@container (min-width: 431px) {\n    .cro-fbw-sel__thumb--more-wide {\n        display: block;\n    }\n}\n\n@container (max-width: 430px) {\n    .cro-fbw-sel__top {\n        align-items: flex-start;\n    }\n\n    .cro-fbw-sel__thumb--extra-narrow {\n        display: none;\n    }\n\n    .cro-fbw-sel__thumb--more-narrow {\n        display: block;\n    }\n\n    .cro-fbw-sel__more-wide {\n        display: none;\n    }\n\n    .cro-fbw-sel__more-narrow {\n        display: inline;\n    }\n}\n';
const WIDE_VISIBLE_THUMBS = 5;
const NARROW_VISIBLE_THUMBS = 3;
const hiddenThumbCount = (total, visibleThumbs) => total > visibleThumbs + 1 ? total - visibleThumbs : 0;
const renderThumb = (view, item, extraClasses = "", overlay = "") => {
  if (!view.hydrated) return `<span class="cro-fbw-sel__thumb${extraClasses}">${skeleton("100%", "100%")}</span>`;
  const img = safeImageUrl(item.product?.imageUrl);
  return `<span class="cro-fbw-sel__thumb${extraClasses}">${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy">` : ""}${overlay}</span>`;
};
const renderMoreThumb = (view, hiddenWide, hiddenNarrow) => {
  const firstHidden = view.items[hiddenWide ? WIDE_VISIBLE_THUMBS : NARROW_VISIBLE_THUMBS];
  const modifiers = `${hiddenWide ? " cro-fbw-sel__thumb--more-wide" : ""}${hiddenNarrow ? " cro-fbw-sel__thumb--more-narrow" : ""}`;
  const overlay = `<span class="cro-fbw-sel__more-count">
            ${hiddenWide ? `<span class="cro-fbw-sel__more-wide">+${escapeHtml(String(hiddenWide))}</span>` : ""}
            ${hiddenNarrow ? `<span class="cro-fbw-sel__more-narrow">+${escapeHtml(String(hiddenNarrow))}</span>` : ""}
        </span>`;
  return renderThumb(view, firstHidden, ` cro-fbw-sel__thumb--more${modifiers}`, overlay);
};
const renderThumbnails = (ctx, view) => {
  if (ctx.settings.show_bundle_thumbnails === false || !view.items.length) return "";
  const total = view.items.length;
  const hiddenWide = hiddenThumbCount(total, WIDE_VISIBLE_THUMBS);
  const hiddenNarrow = hiddenThumbCount(total, NARROW_VISIBLE_THUMBS);
  const shownItems = hiddenWide ? view.items.slice(0, WIDE_VISIBLE_THUMBS) : view.items;
  const thumbs = shownItems.map((item, index) => {
    const extraClasses = hiddenNarrow && index >= NARROW_VISIBLE_THUMBS ? " cro-fbw-sel__thumb--extra-narrow" : "";
    return renderThumb(view, item, extraClasses);
  }).join("");
  const more = hiddenWide || hiddenNarrow ? renderMoreThumb(view, hiddenWide, hiddenNarrow) : "";
  return `<span class="cro-fbw-sel__thumbs">${thumbs}${more}</span>`;
};
const renderOption = (ctx, view) => {
  const { bundle, isOpen, title, unavailable } = view;
  const badge = bundle.badge ? `<span class="cro-fbw__flag">${escapeHtml(bundle.badge)}</span>` : "";
  return `<section class="cro-fbw__bundle cro-fbw-sel__option${isOpen ? " cro-fbw__bundle--open" : ""}${unavailable ? " cro-fbw__bundle--unavailable" : ""}" data-bundle-id="${escapeHtml(bundle.id)}">
        <div class="cro-fbw-sel__top" role="radio" aria-checked="${isOpen}" tabindex="0" data-action="select" data-bundle-id="${escapeHtml(bundle.id)}">
            <span class="cro-fbw-sel__dot" aria-hidden="true"></span>
            <span class="cro-fbw-sel__main">
                <span class="cro-fbw-sel__title-row"><a class="cro-fbw__bundle-title" href="/products/${escapeHtml(bundle.bundleHandle)}">${escapeHtml(title)}</a>${badge}</span>
                ${renderThumbnails(ctx, view)}
            </span>
            ${renderBundlePrice(ctx, view)}
        </div>
        ${isOpen ? `<div class="cro-fbw-sel__items">${renderProductRows(ctx, view, false)}</div>` : ""}
    </section>`;
};
const renderBundles$3 = (ctx, views, editor) => {
  const selected = views.find((view) => view.isOpen);
  return `<div class="cro-fbw cro-fbw--lineup">
        ${renderHeader(ctx)}
        <div class="cro-fbw-sel__list" role="radiogroup" aria-label="Available bundles">
            ${views.map((view) => renderOption(ctx, view)).join("")}
        </div>
        ${selected && ctx.settings.show_add_to_cart !== false ? `<div class="cro-fbw-sel__foot">${renderCta(ctx, selected)}</div>` : ""}
        ${renderEditor(ctx, editor)}
    </div>`;
};
const renderCurrentBundle$3 = (ctx, view) => `<div class="cro-fbw cro-fbw--lineup cro-fbw--products">
        <div class="cro-fbw__list" role="group" aria-label="Bundle products">
            <section class="cro-fbw__bundle cro-fbw__bundle--open cro-fbw__bundle--products" data-bundle-id="${escapeHtml(view.bundle.id)}">
                ${renderIncludedHead(ctx, view.bundle)}
                <div class="cro-fbw__panel"><div class="cro-fbw-sel__plain">${renderProductRows(ctx, view, true)}</div></div>
            </section>
        </div>
    </div>`;
const SWITCH_ANIMATION$1 = { duration: 240, easing: "cubic-bezier(.2, .7, .3, 1)" };
const selectedOptionOf = (root) => root.querySelector(".cro-fbw-sel__option.cro-fbw__bundle--open");
const prefersReducedMotion$2 = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const captureState$3 = (root) => {
  const heights = {};
  root.querySelectorAll(".cro-fbw-sel__option").forEach((option) => {
    heights[option.dataset.bundleId] = option.getBoundingClientRect().height;
  });
  return { heights, selectedId: selectedOptionOf(root)?.dataset.bundleId ?? null };
};
const restoreState$3 = (root, previous) => {
  const selected = selectedOptionOf(root);
  const selectedId = selected?.dataset.bundleId ?? null;
  if (!previous.selectedId || !selected || selectedId === previous.selectedId || prefersReducedMotion$2()) return;
  selected.classList.add("cro-fbw-sel__option--entering");
  for (const bundleId of [previous.selectedId, selectedId]) {
    const option = root.querySelector(`.cro-fbw-sel__option[data-bundle-id="${CSS.escape(bundleId)}"]`);
    const fromHeight = previous.heights[bundleId];
    if (!option || fromHeight == null || typeof option.animate !== "function") continue;
    const toHeight = option.getBoundingClientRect().height;
    if (Math.abs(toHeight - fromHeight) < 1) continue;
    option.animate([{ height: `${fromHeight}px` }, { height: `${toHeight}px` }], SWITCH_ANIMATION$1);
  }
};
const lineupLayout = {
  singleSelection: true,
  styles: lineupStyles,
  renderBundles: renderBundles$3,
  renderCurrentBundle: renderCurrentBundle$3,
  captureState: captureState$3,
  restoreState: restoreState$3
};
const mosaicStyles = '.cro-fbw--mosaic .cro-fbw__bundle + .cro-fbw__bundle::before {\n    content: none;\n}\n\n.cro-fbw-mosaic__body {\n    display: flex;\n    flex-direction: column;\n    padding: var(--cro-content-padding);\n}\n\n.cro-fbw-mosaic__sizes {\n    display: grid;\n    grid-template-columns: repeat(var(--cro-mosaic-count, 3), minmax(0, 1fr));\n    gap: var(--cro-grid-gap);\n    padding-top: 8px;\n}\n\n.cro-fbw-mosaic__size {\n    position: relative;\n    min-width: 0;\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    background: var(--cro-bg);\n    transition: border-color .15s ease, background-color .15s ease;\n}\n\n.cro-fbw-mosaic__size:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw-mosaic__size.cro-fbw__bundle--open {\n    border-color: var(--cro-sel);\n    box-shadow: 0 0 0 1px var(--cro-sel);\n    background: color-mix(in srgb, var(--cro-sel) 5%, var(--cro-bg));\n}\n\n.cro-fbw-mosaic__choice {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    gap: 6px;\n    height: 100%;\n    min-height: 44px;\n    padding: calc(var(--cro-card-body-pad) + 10px) var(--cro-card-body-pad) calc(var(--cro-card-body-pad) + 4px);\n    border-radius: inherit;\n    text-align: center;\n    cursor: pointer;\n}\n\n.cro-fbw__bundle--open .cro-fbw-mosaic__choice {\n    cursor: default;\n}\n\n.cro-fbw-mosaic__choice:focus-visible {\n    outline: 2px solid var(--cro-sel);\n    outline-offset: 2px;\n}\n\n.cro-fbw-mosaic__choice .cro-fbw__bundle-title {\n    display: -webkit-box;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 2;\n    max-width: 100%;\n    overflow: hidden;\n    overflow-wrap: anywhere;\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    letter-spacing: 0;\n    color: var(--cro-muted);\n}\n\n.cro-fbw__bundle--open .cro-fbw-mosaic__choice .cro-fbw__bundle-title {\n    color: var(--cro-fg);\n}\n\n.cro-fbw-mosaic__choice .cro-fbw__price {\n    align-items: center;\n    gap: 2px;\n    text-align: center;\n}\n\n.cro-fbw-mosaic__choice .cro-fbw__price-now {\n    font-size: calc(var(--cro-fs-base) * 1.5);\n    font-weight: var(--cro-fw-bold);\n    letter-spacing: -.02em;\n    line-height: 1.1;\n}\n\n.cro-fbw-mosaic__choice .cro-fbw__price-was,\n.cro-fbw-mosaic__choice .cro-fbw__save {\n    font-size: var(--cro-fs-sm);\n}\n\n.cro-fbw-mosaic__choice .cro-fbw__price {\n    max-width: 100%;\n}\n\n.cro-fbw-mosaic__choice .cro-fbw__price > * {\n    max-width: 100%;\n    white-space: normal;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-mosaic__flag {\n    position: absolute;\n    top: 0;\n    left: 50%;\n    max-width: calc(100% - 12px);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    transform: translate(-50%, -50%);\n    white-space: nowrap;\n}\n\n.cro-fbw-mosaic__wall {\n    padding-top: var(--cro-content-padding);\n}\n\n.cro-fbw-mosaic__wall-head {\n    display: flex;\n    align-items: baseline;\n    justify-content: space-between;\n    gap: 12px;\n    margin-bottom: 10px;\n    font-size: var(--cro-fs-sm);\n    color: var(--cro-muted);\n}\n\n.cro-fbw-mosaic__wall-head b {\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    color: var(--cro-fg);\n}\n\n.cro-fbw-mosaic__link {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    min-height: 32px;\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-semibold);\n    color: var(--cro-fg);\n    text-decoration: none;\n    white-space: nowrap;\n}\n\n.cro-fbw-mosaic__link:hover {\n    text-decoration: underline;\n    text-underline-offset: 3px;\n}\n\n.cro-fbw-mosaic__link-icon {\n    display: inline-block;\n}\n\n.cro-fbw-mosaic__link-icon:dir(rtl) {\n    transform: scaleX(-1);\n}\n\n.cro-fbw-mosaic__grid {\n    display: grid;\n    grid-template-columns: repeat(6, minmax(0, 1fr));\n    gap: 6px;\n}\n\n.cro-fbw-mosaic__tile {\n    position: relative;\n    aspect-ratio: 1;\n    border-radius: var(--cro-card-radius);\n    overflow: hidden;\n    background: var(--cro-surface);\n}\n\n.cro-fbw-mosaic__tile img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.cro-fbw-mosaic__qty {\n    position: absolute;\n    inset-inline-end: 3px;\n    bottom: 3px;\n    padding: 0 5px;\n    border-radius: var(--cro-radius-full);\n    background: var(--cro-fg);\n    color: var(--cro-bg);\n    font-size: 11px;\n    font-weight: var(--cro-fw-semibold);\n    line-height: 16px;\n}\n\n.cro-fbw-mosaic__more {\n    display: none;\n    place-items: center;\n    aspect-ratio: 1;\n    border: 1px dashed var(--cro-faint);\n    border-radius: var(--cro-card-radius);\n    color: var(--cro-fg);\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    text-decoration: none;\n}\n\n.cro-fbw-mosaic__more-wide,\n.cro-fbw-mosaic__more-narrow {\n    direction: ltr;\n    unicode-bidi: isolate;\n}\n\n.cro-fbw-mosaic__more:hover {\n    background: var(--cro-surface);\n}\n\n.cro-fbw-mosaic__more-narrow {\n    display: none;\n}\n\n.cro-fbw-mosaic__foot .cro-fbw__foot {\n    padding-block: var(--cro-content-padding) 0;\n}\n\n.cro-fbw--mosaic.cro-fbw--products .cro-fbw__panel {\n    padding-bottom: var(--cro-content-padding);\n}\n\n.cro-fbw-mosaic__products {\n    display: grid;\n    grid-template-columns: repeat(5, minmax(0, 1fr));\n    gap: 16px 10px;\n}\n\n.cro-fbw-mosaic__product {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    min-width: 0;\n}\n\n.cro-fbw-mosaic__product--unavailable .cro-fbw-mosaic__tile {\n    opacity: .5;\n}\n\n.cro-fbw-mosaic__product-info {\n    display: flex;\n    flex-direction: column;\n    gap: 3px;\n    min-width: 0;\n}\n\n.cro-fbw-mosaic__product-info .cro-fbw__name {\n    overflow: hidden;\n    overflow-wrap: anywhere;\n    color: var(--cro-fg);\n}\n\n\n.cro-fbw-mosaic__product-info .cro-fbw__card-price {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    column-gap: 6px;\n}\n\n.cro-fbw-mosaic__product-info .cro-fbw__card-was,\n.cro-fbw-mosaic__product-info .cro-fbw__card-now {\n    margin: 0;\n    min-width: 0;\n    white-space: normal;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-mosaic__product-info .cro-fbw__oos {\n    margin-top: 2px;\n}\n\n@container (min-width: 431px) {\n    .cro-fbw-mosaic__tile--extra-wide {\n        display: none;\n    }\n\n    .cro-fbw-mosaic__more--wide {\n        display: grid;\n    }\n}\n\n@container (max-width: 430px) {\n    .cro-fbw-mosaic__sizes {\n        gap: 8px;\n    }\n\n    .cro-fbw-mosaic__sizes[data-count="4"] {\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n\n    .cro-fbw-mosaic__sizes[data-count="5"] {\n        grid-template-columns: repeat(6, minmax(0, 1fr));\n    }\n\n    .cro-fbw-mosaic__sizes[data-count="5"] .cro-fbw-mosaic__size {\n        grid-column: span 2;\n    }\n\n    .cro-fbw-mosaic__sizes[data-count="5"] .cro-fbw-mosaic__size:nth-child(n+4) {\n        grid-column: span 3;\n    }\n\n    .cro-fbw-mosaic__grid {\n        grid-template-columns: repeat(5, minmax(0, 1fr));\n    }\n\n    .cro-fbw-mosaic__products {\n        grid-template-columns: repeat(3, minmax(0, 1fr));\n        gap: 14px 8px;\n    }\n\n    .cro-fbw-mosaic__tile--extra-narrow {\n        display: none;\n    }\n\n    .cro-fbw-mosaic__more--narrow {\n        display: grid;\n    }\n\n    .cro-fbw-mosaic__more-wide {\n        display: none;\n    }\n\n    .cro-fbw-mosaic__more-narrow {\n        display: inline;\n    }\n}\n';
const WIDE_VISIBLE_TILES = 11;
const NARROW_VISIBLE_TILES = 9;
const hiddenTileCount = (total, visibleTiles) => total > visibleTiles + 1 ? total - visibleTiles : 0;
const bundleUrl$1 = (bundle) => escapeHtml(`/products/${bundle.bundleHandle}`);
const renderTile$1 = (ctx, hydrated, { component, product }, extraClasses) => {
  if (!hydrated) return `<span class="cro-fbw-mosaic__tile${extraClasses}">${skeleton("100%", "100%")}</span>`;
  const imageUrl = safeImageUrl(product?.imageUrl);
  const quantity = component.quantity ?? 1;
  const showQuantity = quantity > 1 && ctx.settings.show_product_quantity !== false;
  return `<span class="cro-fbw-mosaic__tile${extraClasses}" title="${escapeHtml(product?.title || "")}">
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy">` : ""}
            ${showQuantity ? `<span class="cro-fbw-mosaic__qty">×${escapeHtml(String(quantity))}</span>` : ""}
        </span>`;
};
const renderMoreTile = (ctx, view, hiddenWide, hiddenNarrow) => {
  const modifiers = `${hiddenWide ? " cro-fbw-mosaic__more--wide" : ""}${hiddenNarrow ? " cro-fbw-mosaic__more--narrow" : ""}`;
  return `<a class="cro-fbw-mosaic__more${modifiers}" href="${bundleUrl$1(view.bundle)}" aria-label="${escapeHtml(ctx.text("view_bundle_text"))}">
            ${hiddenWide ? `<span class="cro-fbw-mosaic__more-wide">+${hiddenWide}</span>` : ""}
            ${hiddenNarrow ? `<span class="cro-fbw-mosaic__more-narrow">+${hiddenNarrow}</span>` : ""}
        </a>`;
};
const renderGrid = (ctx, view) => {
  const hiddenWide = hiddenTileCount(view.items.length, WIDE_VISIBLE_TILES);
  const hiddenNarrow = hiddenTileCount(view.items.length, NARROW_VISIBLE_TILES);
  const tiles = view.items.map((item, index) => {
    const extraClasses = `${hiddenWide && index >= WIDE_VISIBLE_TILES ? " cro-fbw-mosaic__tile--extra-wide" : ""}${hiddenNarrow && index >= NARROW_VISIBLE_TILES ? " cro-fbw-mosaic__tile--extra-narrow" : ""}`;
    return renderTile$1(ctx, view.hydrated, item, extraClasses);
  }).join("");
  const more = hiddenWide || hiddenNarrow ? renderMoreTile(ctx, view, hiddenWide, hiddenNarrow) : "";
  return `<div class="cro-fbw-mosaic__grid">${tiles}${more}</div>`;
};
const renderWall = (ctx, view) => {
  const count = `<b>${view.items.length}</b>`;
  return `<div class="cro-fbw-mosaic__wall" data-bundle-id="${escapeHtml(view.bundle.id)}">
            <div class="cro-fbw-mosaic__wall-head">
                <span>${ctx.textHtml("bundle_products_text", { count })}</span>
                <a class="cro-fbw-mosaic__link" href="${bundleUrl$1(view.bundle)}">${escapeHtml(ctx.text("view_bundle_text"))}<span class="cro-fbw-mosaic__link-icon" aria-hidden="true">→</span></a>
            </div>
            ${renderGrid(ctx, view)}
        </div>`;
};
const renderSize = (ctx, view) => {
  const { bundle, isOpen, title, unavailable } = view;
  const badge = bundle.badge ? `<span class="cro-fbw__flag cro-fbw-mosaic__flag">${escapeHtml(bundle.badge)}</span>` : "";
  return `<section class="cro-fbw__bundle cro-fbw-mosaic__size${isOpen ? " cro-fbw__bundle--open" : ""}${unavailable ? " cro-fbw__bundle--unavailable" : ""}" data-bundle-id="${escapeHtml(bundle.id)}">
        <div class="cro-fbw-mosaic__choice" role="radio" aria-checked="${isOpen}" tabindex="0" data-action="select" data-bundle-id="${escapeHtml(bundle.id)}">
            <span class="cro-fbw__bundle-title" href="${bundleUrl$1(bundle)}">${escapeHtml(title)}</span>
            ${renderBundlePrice(ctx, view)}
        </div>
        ${badge}
    </section>`;
};
const renderBundles$2 = (ctx, views) => {
  const selected = views.find((view) => view.isOpen);
  return `<div class="cro-fbw cro-fbw--mosaic">
        ${renderHeader(ctx)}
        <div class="cro-fbw-mosaic__body">
            <div class="cro-fbw-mosaic__sizes" data-count="${views.length}" style="--cro-mosaic-count:${views.length}" role="radiogroup" aria-label="Available bundles">
                ${views.map((view) => renderSize(ctx, view)).join("")}
            </div>
            ${selected ? renderWall(ctx, selected) : ""}
            ${selected && ctx.settings.show_add_to_cart !== false ? `<div class="cro-fbw-mosaic__foot">${renderCta(ctx, selected)}</div>` : ""}
        </div>
    </div>`;
};
const renderProductCard = (ctx, card) => {
  const { settings } = ctx;
  const showPrice = settings.show_product_price !== false && card.hasProduct;
  const showCompare = showPrice && settings.show_product_compare_price !== false && card.hasCompare;
  const showQuantity = settings.show_product_quantity !== false;
  const title = escapeHtml(card.title);
  const media = card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${title}" loading="lazy">` : "";
  const name = card.linkHandle ? `<a class="cro-fbw__name" href="/products/${escapeHtml(card.linkHandle)}">${title}</a>` : `<span class="cro-fbw__name">${title}</span>`;
  return `<div class="cro-fbw-mosaic__product${card.unavailable ? " cro-fbw-mosaic__product--unavailable" : ""}" data-bundle-id="${escapeHtml(card.bundleId)}" data-product-id="${escapeHtml(card.productId)}">
            <span class="cro-fbw-mosaic__tile">
                ${media}
                ${showQuantity ? `<span class="cro-fbw__qty">${escapeHtml(String(card.quantity))}</span>` : ""}
            </span>
            <span class="cro-fbw-mosaic__product-info">
                ${name}
                ${showPrice ? `<span class="cro-fbw__card-price">
                    ${showCompare ? `<span class="cro-fbw__card-was">${escapeHtml(ctx.money(card.compare))}</span>` : ""}
                    <span class="cro-fbw__card-now">${escapeHtml(ctx.money(card.price))}</span>
                </span>` : ""}
                ${card.unavailable ? `<span class="cro-fbw__oos">${escapeHtml(ctx.text("out_of_stock_text"))}</span>` : ""}
            </span>
        </div>`;
};
const renderCurrentBundle$2 = (ctx, view) => `<div class="cro-fbw cro-fbw--mosaic cro-fbw--products">
        <div class="cro-fbw__list" role="group" aria-label="Bundle products">
            <section class="cro-fbw__bundle cro-fbw__bundle--open cro-fbw__bundle--products" data-bundle-id="${escapeHtml(view.bundle.id)}">
                ${renderIncludedHead(ctx, view.bundle)}
                <div class="cro-fbw__panel">
                    <div class="cro-fbw-mosaic__products">${view.items.map(({ card }) => renderProductCard(ctx, card)).join("")}</div>
                </div>
            </section>
        </div>
    </div>`;
const SWITCH_ANIMATION = { duration: 200, easing: "ease-out" };
const captureState$2 = (root) => ({
  selectedId: root.querySelector(".cro-fbw-mosaic__size.cro-fbw__bundle--open")?.dataset.bundleId ?? null
});
const prefersReducedMotion$1 = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const restoreState$2 = (root, previous) => {
  const wall = root.querySelector(".cro-fbw-mosaic__wall");
  if (!wall || !previous.selectedId || wall.dataset.bundleId === previous.selectedId || prefersReducedMotion$1()) return;
  if (typeof wall.animate === "function") wall.animate([{ opacity: 0 }, { opacity: 1 }], SWITCH_ANIMATION);
};
const mosaicLayout = {
  singleSelection: true,
  styles: mosaicStyles,
  renderBundles: renderBundles$2,
  renderCurrentBundle: renderCurrentBundle$2,
  captureState: captureState$2,
  restoreState: restoreState$2
};
const posterStyles = '.cro-fbw--poster .cro-fbw__bundle + .cro-fbw__bundle::before {\n    content: none;\n}\n\n.cro-fbw-poster__body {\n    display: flex;\n    flex-direction: column;\n    gap: 14px;\n    padding: var(--cro-content-padding);\n}\n\n.cro-fbw-poster__stage {\n    --cro-poster-card: min(320px, 66cqw);\n    position: relative;\n}\n\n.cro-fbw-poster__track {\n    position: relative;\n    display: flex;\n    align-items: stretch;\n    gap: 12px;\n    padding: 10px 2px 14px;\n    scroll-padding-inline: 2px;\n    overflow-x: auto;\n    overscroll-behavior-x: contain;\n    scroll-snap-type: x mandatory;\n    scrollbar-width: none;\n}\n\n.cro-fbw-poster__track::-webkit-scrollbar {\n    display: none;\n}\n\n.cro-fbw-poster__card {\n    position: relative;\n    flex: none;\n    width: var(--cro-poster-card);\n    display: flex;\n    flex-direction: column;\n    scroll-snap-align: center;\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: calc(var(--cro-card-radius) + 4px);\n    background: var(--cro-bg);\n    opacity: .55;\n    transform: scale(.94);\n    transition: transform .25s ease, opacity .25s ease, border-color .2s ease, box-shadow .2s ease;\n}\n\n.cro-fbw-poster__card:first-child {\n    scroll-snap-align: start;\n    margin-inline-start: auto;\n}\n\n.cro-fbw-poster__card:last-child {\n    scroll-snap-align: end;\n    margin-inline-end: auto;\n}\n\n.cro-fbw-poster__card.cro-fbw__bundle--open {\n    opacity: 1;\n    transform: none;\n    border-color: var(--cro-sel);\n    box-shadow: 0 0 0 1px var(--cro-sel), 0 10px 24px -12px rgba(0, 0, 0, .35);\n}\n\n.cro-fbw-poster__card.cro-fbw__bundle--unavailable .cro-fbw-poster__art {\n    opacity: .5;\n}\n\n.cro-fbw-poster__choice {\n    display: flex;\n    flex-direction: column;\n    gap: 12px;\n    padding: 10px 10px 4px;\n    border-radius: inherit;\n    cursor: pointer;\n}\n\n.cro-fbw__bundle--open .cro-fbw-poster__choice {\n    cursor: default;\n}\n\n.cro-fbw-poster__choice:focus-visible {\n    outline: 2px solid var(--cro-sel);\n    outline-offset: 3px;\n}\n\n.cro-fbw-poster__art {\n    position: relative;\n    display: grid;\n    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);\n    grid-template-rows: repeat(2, minmax(0, 1fr));\n    gap: 5px;\n    min-height: 0;\n    aspect-ratio: 4 / 3;\n}\n\n.cro-fbw-poster__tile {\n    position: relative;\n    min-height: 0;\n    overflow: hidden;\n    border-radius: var(--cro-card-radius);\n    background: var(--cro-surface);\n}\n\n.cro-fbw-poster__tile img {\n    position: absolute;\n    inset: 0;\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.cro-fbw-poster__tile .cro-fbw__sk {\n    display: block;\n}\n\n.cro-fbw-poster__tile--hero,\n.cro-fbw-poster__tile--tall {\n    grid-row: 1 / 3;\n}\n\n.cro-fbw-poster__tile--full {\n    grid-row: 1 / 3;\n    grid-column: 1 / 3;\n}\n\n.cro-fbw-poster__tile--more::after {\n    content: "";\n    position: absolute;\n    inset: 0;\n    background: rgba(0, 0, 0, .5);\n}\n\n.cro-fbw-poster__more {\n    position: absolute;\n    inset: 0;\n    z-index: 1;\n    display: grid;\n    place-items: center;\n    color: #fff;\n    font-size: var(--cro-fs-lg);\n    font-weight: var(--cro-fw-semibold);\n    direction: ltr;\n    unicode-bidi: isolate;\n}\n\n.cro-fbw-poster__qty {\n    position: absolute;\n    inset-inline-end: 4px;\n    bottom: 4px;\n    padding: 0 5px;\n    border-radius: var(--cro-radius-full);\n    background: var(--cro-fg);\n    color: var(--cro-bg);\n    font-size: 11px;\n    font-weight: var(--cro-fw-semibold);\n    line-height: 16px;\n}\n\n.cro-fbw-poster__flag {\n    position: absolute;\n    top: 8px;\n    inset-inline-start: 8px;\n    z-index: 1;\n    max-width: calc(100% - 16px);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-fbw-poster__info {\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding-inline: 4px;\n}\n\n.cro-fbw-poster__title {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    font-size: var(--cro-fs-lg);\n    font-weight: var(--cro-fw-semibold);\n    letter-spacing: -.01em;\n}\n\n.cro-fbw-poster__count,\n.cro-fbw-poster__save {\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-poster__count {\n    font-size: var(--cro-fs-sm);\n    color: var(--cro-muted);\n}\n\n.cro-fbw-poster__prices {\n    display: flex;\n    align-items: baseline;\n    flex-wrap: wrap;\n    gap: 8px;\n}\n\n.cro-fbw-poster__prices .cro-fbw__price-now,\n.cro-fbw-poster__prices .cro-fbw__price-was {\n    min-width: 0;\n    white-space: normal;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-poster__prices .cro-fbw__price-now {\n    font-size: calc(var(--cro-fs-base) * 1.75);\n    font-weight: var(--cro-fw-bold);\n    letter-spacing: -.03em;\n    line-height: 1.05;\n}\n\n.cro-fbw-poster__link {\n    display: inline-flex;\n    align-items: center;\n    align-self: flex-start;\n    gap: 4px;\n    min-height: 32px;\n    margin: 0 14px 12px;\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-semibold);\n    color: var(--cro-fg);\n    text-decoration: none;\n}\n\n.cro-fbw-poster__link:hover {\n    text-decoration: underline;\n    text-underline-offset: 3px;\n}\n\n.cro-fbw-poster__link-text {\n    min-width: 0;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-poster__link-icon {\n    display: inline-block;\n}\n\n.cro-fbw-poster__link-icon:dir(rtl),\n.cro-fbw-poster__arrow:dir(rtl) svg {\n    transform: scaleX(-1);\n}\n\n.cro-fbw-poster__card:not(.cro-fbw__bundle--open) .cro-fbw-poster__link {\n    visibility: hidden;\n}\n\n.cro-fbw-poster__arrow {\n    position: absolute;\n    top: calc(50% - 2px - var(--cro-arrow-size) / 2);\n    z-index: 2;\n    display: grid;\n    place-items: center;\n    width: var(--cro-arrow-size);\n    height: var(--cro-arrow-size);\n    padding: 0;\n    border: 1px solid var(--cro-border-subtle);\n    border-radius: var(--cro-radius-full);\n    background: var(--cro-arrow-bg);\n    color: var(--cro-arrow-fg);\n    box-shadow: var(--cro-arrow-shadow);\n    cursor: pointer;\n}\n\n.cro-fbw-poster__arrow::before {\n    content: "";\n    position: absolute;\n    inset: -8px;\n}\n\n.cro-fbw-poster__arrow--prev {\n    inset-inline-start: calc(var(--cro-arrow-size) * -.5);\n}\n\n.cro-fbw-poster__arrow--next {\n    inset-inline-end: calc(var(--cro-arrow-size) * -.5);\n}\n\n.cro-fbw-poster__arrow svg {\n    width: calc(var(--cro-arrow-size) * .5);\n    height: calc(var(--cro-arrow-size) * .5);\n}\n\n.cro-fbw-poster__dots {\n    display: flex;\n    justify-content: center;\n}\n\n.cro-fbw-poster__dot {\n    display: grid;\n    place-items: center;\n    width: 24px;\n    height: 24px;\n    padding: 0;\n    border: 0;\n    background: none;\n    cursor: pointer;\n}\n\n.cro-fbw-poster__dot::after {\n    content: "";\n    width: 8px;\n    height: 8px;\n    border-radius: var(--cro-radius-full);\n    background: var(--cro-faint);\n    transition: background-color .2s ease;\n}\n\n.cro-fbw-poster__dot[aria-current="true"]::after {\n    background: var(--cro-sel);\n}\n\n.cro-fbw-poster__dot:focus-visible {\n    outline: 2px solid var(--cro-sel);\n    border-radius: 6px;\n}\n\n.cro-fbw-poster__foot .cro-fbw__foot {\n    padding-block: 0;\n}\n\n.cro-fbw-poster__rows {\n    padding: 0 calc(var(--cro-card-body-pad) + 4px);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-fbw--poster.cro-fbw--products .cro-fbw__panel {\n    padding-bottom: var(--cro-content-padding);\n}\n\n@media (prefers-reduced-motion: reduce) {\n    .cro-fbw-poster__card {\n        transition: none;\n    }\n}\n\n@container (min-width: 560px) {\n    .cro-fbw-poster__rows {\n        display: grid;\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n        column-gap: 24px;\n    }\n\n    .cro-fbw-poster__rows .cro-fbw__row:nth-child(2) {\n        border-top: 0;\n    }\n}\n\n@container (max-width: 430px) {\n    .cro-fbw-poster__stage {\n        --cro-poster-card: 68cqw;\n    }\n\n    .cro-fbw-poster__prices .cro-fbw__price-now {\n        font-size: calc(var(--cro-fs-base) * 1.6);\n    }\n}\n';
const SCROLL_SETTLE_MS = 120;
const USER_SCROLL_EVENTS = ["pointerdown", "wheel", "touchstart", "keydown"];
const arrowIcon = (direction) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${direction === "prev" ? "15 6 9 12 15 18" : "9 6 15 12 9 18"}"/></svg>`;
const bundleUrl = (bundle) => escapeHtml(`/products/${bundle.bundleHandle}`);
const renderTile = (ctx, view, item, className, overlay = "") => {
  if (!view.hydrated) return `<span class="cro-fbw-poster__tile ${className}">${skeleton("100%", "100%")}</span>`;
  const imageUrl = safeImageUrl(item.product?.imageUrl);
  const quantity = item.component.quantity ?? 1;
  const showQuantity = !overlay && quantity > 1 && ctx.settings.show_product_quantity !== false;
  return `<span class="cro-fbw-poster__tile ${className}">
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.product?.title || "")}" loading="lazy">` : ""}
            ${showQuantity ? `<span class="cro-fbw-poster__qty">×${escapeHtml(String(quantity))}</span>` : ""}
            ${overlay}
        </span>`;
};
const renderArt = (ctx, view) => {
  const [first, second, third] = view.items;
  const hiddenCount = view.items.length - 2;
  let tiles = renderTile(ctx, view, first, view.items.length === 1 ? "cro-fbw-poster__tile--full" : "cro-fbw-poster__tile--hero");
  if (view.items.length === 2) tiles += renderTile(ctx, view, second, "cro-fbw-poster__tile--tall");
  if (view.items.length === 3) tiles += renderTile(ctx, view, second, "") + renderTile(ctx, view, third, "");
  if (view.items.length > 3) {
    const overlay = `<span class="cro-fbw-poster__more">+${escapeHtml(String(hiddenCount))}</span>`;
    tiles += renderTile(ctx, view, second, "") + renderTile(ctx, view, third, "cro-fbw-poster__tile--more", overlay);
  }
  const badge = view.bundle.badge ? `<span class="cro-fbw__flag cro-fbw-poster__flag">${escapeHtml(view.bundle.badge)}</span>` : "";
  return `<span class="cro-fbw-poster__art">${tiles}${badge}</span>`;
};
const renderPrice = (ctx, view) => {
  const { totals, hasSaving, pending } = view;
  if (pending) {
    return `<span class="cro-fbw-poster__prices">${skeleton("60%", "1.6em")}</span>
            <span class="cro-fbw-poster__save">${skeleton("40%", "0.9em")}</span>`;
  }
  const saveText = hasSaving ? ctx.text("save_price_text", { amount: ctx.money(totals.saved), discount: `${totals.pct || 0}%` }) : "";
  return `<span class="cro-fbw-poster__prices">
            <span class="cro-fbw__price-now">${escapeHtml(ctx.money(totals.now))}</span>
            ${hasSaving ? `<span class="cro-fbw__price-was">${escapeHtml(ctx.money(totals.original))}</span>` : ""}
        </span>
        ${saveText ? `<span class="cro-fbw__save cro-fbw-poster__save">${escapeHtml(saveText)}</span>` : ""}`;
};
const renderCard$1 = (ctx, view) => {
  const { bundle, isOpen, title, unavailable } = view;
  const bundleId = escapeHtml(bundle.id);
  return `<section class="cro-fbw__bundle cro-fbw-poster__card${isOpen ? " cro-fbw__bundle--open" : ""}${unavailable ? " cro-fbw__bundle--unavailable" : ""}" data-bundle-id="${bundleId}">
        <div class="cro-fbw-poster__choice" role="radio" aria-checked="${isOpen}" tabindex="0" data-action="select" data-bundle-id="${bundleId}">
            ${renderArt(ctx, view)}
            <span class="cro-fbw-poster__info">
                <a class="cro-fbw__bundle-title cro-fbw-poster__title" href="${bundleUrl(bundle)}">${escapeHtml(title)}</a>
                <span class="cro-fbw-poster__count">${escapeHtml(ctx.text("bundle_products_text", { count: view.items.length }))}</span>
                ${renderPrice(ctx, view)}
            </span>
        </div>
        <a class="cro-fbw-poster__link" href="${bundleUrl(bundle)}"${isOpen ? "" : ` tabindex="-1" aria-hidden="true"`}><span class="cro-fbw-poster__link-text">${escapeHtml(ctx.text("view_bundle_text"))}</span><span class="cro-fbw-poster__link-icon" aria-hidden="true">→</span></a>
    </section>`;
};
const renderArrow = (direction, neighbor) => {
  if (!neighbor) return "";
  const label = direction === "prev" ? "Previous bundle" : "Next bundle";
  return `<button type="button" class="cro-fbw-poster__arrow cro-fbw-poster__arrow--${direction}" aria-label="${label}" data-action="select" data-bundle-id="${escapeHtml(neighbor.bundle.id)}">${arrowIcon(direction)}</button>`;
};
const renderDots = (views) => `<div class="cro-fbw-poster__dots">
        ${views.map((view) => `<button type="button" class="cro-fbw-poster__dot" data-action="select" data-bundle-id="${escapeHtml(view.bundle.id)}" aria-label="${escapeHtml(view.title)}" aria-current="${view.isOpen}"></button>`).join("")}
    </div>`;
const renderBundles$1 = (ctx, views) => {
  const selectedIndex = views.findIndex((view) => view.isOpen);
  const selected = views[selectedIndex];
  return `<div class="cro-fbw cro-fbw--poster">
        ${renderHeader(ctx)}
        <div class="cro-fbw-poster__body">
            <div class="cro-fbw-poster__stage">
                ${renderArrow("prev", views[selectedIndex - 1])}
                <div class="cro-fbw-poster__track" role="radiogroup" aria-label="Available bundles">
                    ${views.map((view) => renderCard$1(ctx, view)).join("")}
                </div>
                ${renderArrow("next", views[selectedIndex + 1])}
            </div>
            ${views.length > 1 ? renderDots(views) : ""}
            ${selected && ctx.settings.show_add_to_cart !== false ? `<div class="cro-fbw-poster__foot">${renderCta(ctx, selected)}</div>` : ""}
        </div>
    </div>`;
};
const renderCurrentBundle$1 = (ctx, view) => `<div class="cro-fbw cro-fbw--poster cro-fbw--products">
        <div class="cro-fbw__list" role="group" aria-label="Bundle products">
            <section class="cro-fbw__bundle cro-fbw__bundle--open cro-fbw__bundle--products" data-bundle-id="${escapeHtml(view.bundle.id)}">
                ${renderIncludedHead(ctx, view.bundle)}
                <div class="cro-fbw__panel"><div class="cro-fbw-poster__rows">${renderProductRows(ctx, view, true)}</div></div>
            </section>
        </div>
    </div>`;
const trackOf = (root) => root?.querySelector(".cro-fbw-poster__track");
const selectedCardOf = (track) => track.querySelector(".cro-fbw-poster__card.cro-fbw__bundle--open");
const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const horizontalCenter = (element) => {
  const rect = element.getBoundingClientRect();
  return rect.left + rect.width / 2;
};
const centerSelectedCard = (track, smooth) => {
  const card = selectedCardOf(track);
  if (!card) return;
  const offset = horizontalCenter(card) - horizontalCenter(track);
  if (Math.abs(offset) < 1) return;
  track.scrollBy({ left: offset, behavior: smooth ? "smooth" : "auto" });
};
const restingScrollOf = (track, card, index, cards) => {
  const maxScroll = track.scrollWidth - track.clientWidth;
  if (index === 0) return 0;
  if (index === cards.length - 1) return maxScroll;
  const isRtl = getComputedStyle(track).direction === "rtl";
  const trackRect = track.getBoundingClientRect();
  const cardCenter = horizontalCenter(card);
  const centerFromStart = isRtl ? trackRect.right - cardCenter : cardCenter - trackRect.left;
  const centeredScroll = Math.abs(track.scrollLeft) + centerFromStart - track.clientWidth / 2;
  return Math.min(Math.max(centeredScroll, 0), maxScroll);
};
const cardAtScrollPosition = (track) => {
  if (track.scrollWidth - track.clientWidth <= 1) return null;
  const cards = [...track.querySelectorAll(".cro-fbw-poster__card")];
  const scrolled = Math.abs(track.scrollLeft);
  let nearest = null;
  let nearestDistance = Infinity;
  cards.forEach((card, index) => {
    const distance = Math.abs(restingScrollOf(track, card, index, cards) - scrolled);
    if (distance < nearestDistance) {
      nearest = card;
      nearestDistance = distance;
    }
  });
  return nearest;
};
const stopWatchingTrack = (widget) => {
  widget.store.layout.posterStopWatching?.();
  widget.store.layout.posterStopWatching = null;
};
const watchTrack = (widget, track) => {
  let settleTimer = null;
  let autoScrolling = true;
  const takeOver = () => {
    autoScrolling = false;
  };
  const selectCardAtScrollPosition = () => {
    const card = cardAtScrollPosition(track);
    if (!card) return;
    const isSelected = card.classList.contains("cro-fbw__bundle--open");
    if (autoScrolling) {
      if (isSelected) autoScrolling = false;
      return;
    }
    if (!isSelected) card.querySelector("[data-action='select']")?.click();
  };
  const onScroll = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(selectCardAtScrollPosition, SCROLL_SETTLE_MS);
  };
  USER_SCROLL_EVENTS.forEach((type) => track.addEventListener(type, takeOver, { passive: true }));
  track.addEventListener("scroll", onScroll, { passive: true });
  widget.store.layout.posterStopWatching = () => {
    clearTimeout(settleTimer);
    USER_SCROLL_EVENTS.forEach((type) => track.removeEventListener(type, takeOver));
    track.removeEventListener("scroll", onScroll);
  };
};
const afterRender = (widget) => {
  stopWatchingTrack(widget);
  const track = trackOf(widget.shadowRoot);
  if (!track) return;
  centerSelectedCard(track, track.dataset.switching === "true" && !prefersReducedMotion());
  delete track.dataset.switching;
  watchTrack(widget, track);
};
const captureState$1 = (root) => {
  const track = trackOf(root);
  if (!track) return { scrollLeft: null, selectedId: null };
  return { scrollLeft: track.scrollLeft, selectedId: selectedCardOf(track)?.dataset.bundleId ?? null };
};
const restoreState$1 = (root, previous) => {
  const track = trackOf(root);
  if (!track || previous.scrollLeft == null) return;
  track.scrollLeft = previous.scrollLeft;
  if (previous.selectedId && previous.selectedId !== selectedCardOf(track)?.dataset.bundleId) track.dataset.switching = "true";
};
const posterLayout = {
  singleSelection: true,
  styles: posterStyles,
  renderBundles: renderBundles$1,
  renderCurrentBundle: renderCurrentBundle$1,
  captureState: captureState$1,
  restoreState: restoreState$1,
  afterRender,
  dispose: stopWatchingTrack
};
const showcaseStyles = '.cro-fbw--showcase .cro-fbw__bundle + .cro-fbw__bundle::before {\n    content: none;\n}\n\n.cro-fbw-showcase__body {\n    display: flex;\n    flex-direction: column;\n    padding: var(--cro-content-padding);\n}\n\n.cro-fbw-showcase__grid {\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-grid-gap);\n}\n\n.cro-fbw-showcase__card {\n    position: relative;\n    min-width: 0;\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    background: var(--cro-bg);\n    transition: border-color .15s ease, background-color .15s ease;\n}\n\n.cro-fbw-showcase__card:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw-showcase__card.cro-fbw__bundle--open {\n    border-color: var(--cro-sel);\n    box-shadow: 0 0 0 1px var(--cro-sel);\n    background: color-mix(in srgb, var(--cro-sel) 6%, var(--cro-bg));\n}\n\n.cro-fbw-showcase__choice {\n    display: grid;\n    grid-template-columns: auto auto minmax(0, 1fr);\n    align-items: center;\n    gap: 12px;\n    min-height: 44px;\n    padding: var(--cro-card-body-pad) calc(var(--cro-card-body-pad) + 4px);\n    border-radius: inherit;\n    cursor: pointer;\n}\n\n.cro-fbw__bundle--open .cro-fbw-showcase__choice {\n    cursor: default;\n}\n\n.cro-fbw-showcase__choice:focus-visible {\n    outline: 2px solid var(--cro-sel);\n    outline-offset: 2px;\n}\n\n.cro-fbw-showcase__radio {\n    width: 20px;\n    height: 20px;\n    border-radius: var(--cro-radius-full);\n    border: 2px solid var(--cro-faint);\n    background: var(--cro-bg);\n    display: grid;\n    place-items: center;\n}\n\n.cro-fbw-showcase__radio::after {\n    content: "";\n    width: 10px;\n    height: 10px;\n    border-radius: var(--cro-radius-full);\n    background: var(--cro-sel);\n    transform: scale(0);\n    transition: transform .15s ease;\n}\n\n.cro-fbw__bundle--open .cro-fbw-showcase__radio {\n    border-color: var(--cro-sel);\n}\n\n.cro-fbw__bundle--open .cro-fbw-showcase__radio::after {\n    transform: scale(1);\n}\n\n.cro-fbw-showcase__visual {\n    position: relative;\n    display: grid;\n    gap: 2px;\n    width: calc(var(--cro-img-h-w) * .6);\n    aspect-ratio: 1;\n    border-radius: var(--cro-image-radius);\n    background: var(--cro-surface);\n    overflow: hidden;\n}\n\n.cro-fbw-showcase__visual[data-count="2"] {\n    grid-template-columns: 1fr 1fr;\n}\n\n.cro-fbw-showcase__visual[data-count="3"],\n.cro-fbw-showcase__visual[data-count="4"] {\n    grid-template-columns: 1fr 1fr;\n    grid-template-rows: 1fr 1fr;\n}\n\n.cro-fbw-showcase__visual[data-count="3"] .cro-fbw-showcase__tile:first-child {\n    grid-row: span 2;\n}\n\n.cro-fbw-showcase__tile {\n    position: relative;\n    display: block;\n    min-width: 0;\n    min-height: 0;\n    background: var(--cro-surface);\n}\n\n.cro-fbw-showcase__tile img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.cro-fbw-showcase__tile--more::after {\n    content: "";\n    position: absolute;\n    inset: 0;\n    background: rgba(0, 0, 0, .5);\n}\n\n.cro-fbw-showcase__more {\n    position: absolute;\n    inset: 0;\n    z-index: 1;\n    display: grid;\n    place-items: center;\n    color: #fff;\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    direction: ltr;\n    unicode-bidi: isolate;\n}\n\n.cro-fbw-showcase__quantity {\n    position: absolute;\n    inset-inline-end: 4px;\n    bottom: 4px;\n    padding: 2px 6px;\n    border-radius: var(--cro-badge-radius);\n    background: var(--cro-bg);\n    color: var(--cro-fg);\n    font-size: var(--cro-fs-xs);\n    font-weight: var(--cro-fw-bold);\n    line-height: 1.2;\n}\n\n.cro-fbw-showcase__copy {\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 6px;\n}\n\n.cro-fbw-showcase__copy .cro-fbw__bundle-title {\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    letter-spacing: 0;\n}\n\n.cro-fbw-showcase__save {\n    padding: 2px 6px;\n    border-radius: var(--cro-badge-radius);\n    background: color-mix(in srgb, var(--cro-save-color) 12%, var(--cro-bg));\n    font-size: var(--cro-fs-xs);\n    text-transform: uppercase;\n    letter-spacing: var(--cro-badge-tracking);\n}\n\n.cro-fbw-showcase__price {\n    display: flex;\n    align-items: baseline;\n    flex-wrap: wrap;\n    column-gap: 8px;\n    row-gap: 2px;\n    max-width: 100%;\n}\n\n.cro-fbw-showcase__price > * {\n    min-width: 0;\n    max-width: 100%;\n    white-space: normal;\n    overflow-wrap: anywhere;\n}\n\n.cro-fbw-showcase__price .cro-fbw__price-now {\n    font-size: calc(var(--cro-fs-base) * 1.25);\n    font-weight: var(--cro-fw-bold);\n    letter-spacing: -.02em;\n}\n\n.cro-fbw-showcase__flag {\n    position: absolute;\n    top: -1px;\n    inset-inline-end: 12px;\n    max-width: calc(100% - 24px);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    transform: translateY(-50%);\n}\n\n.cro-fbw-showcase__panel {\n    --cro-showcase-caret: 50%;\n    position: relative;\n    margin-top: 2px;\n    border: var(--cro-card-border-w) solid var(--cro-sel);\n    border-radius: var(--cro-card-radius);\n    background: var(--cro-bg);\n}\n\n.cro-fbw-showcase__panel::before {\n    content: "";\n    position: absolute;\n    top: -7px;\n    left: var(--cro-showcase-caret);\n    width: 12px;\n    height: 12px;\n    border-top: var(--cro-card-border-w) solid var(--cro-sel);\n    border-left: var(--cro-card-border-w) solid var(--cro-sel);\n    background: var(--cro-bg);\n    transform: translateX(-50%) rotate(45deg);\n}\n\n.cro-fbw-showcase__panel--entering::before {\n    transition: left .2s ease;\n}\n\n.cro-fbw-showcase__rows {\n    padding: 0 calc(var(--cro-card-body-pad) + 4px);\n}\n\n.cro-fbw-showcase__rows--plain {\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-fbw-showcase__panel--entering .cro-fbw-showcase__rows {\n    animation: cro-fbw-showcase-reveal .24s ease-out;\n}\n\n@keyframes cro-fbw-showcase-reveal {\n    from {\n        opacity: 0;\n        transform: translateY(-4px);\n    }\n}\n\n.cro-fbw-showcase__foot .cro-fbw__foot {\n    padding-block: var(--cro-content-padding) 0;\n}\n\n.cro-fbw--showcase.cro-fbw--products .cro-fbw__panel {\n    padding-bottom: var(--cro-content-padding);\n}\n\n@container (min-width: 520px) {\n    .cro-fbw-showcase__grid {\n        display: grid;\n        grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));\n        padding-top: 10px;\n    }\n\n    .cro-fbw-showcase__choice {\n        grid-template-columns: minmax(0, 1fr);\n        justify-items: stretch;\n        align-items: start;\n        height: 100%;\n        padding: calc(var(--cro-card-body-pad) + 4px);\n    }\n\n    .cro-fbw-showcase__radio {\n        justify-self: center;\n    }\n\n    .cro-fbw-showcase__visual {\n        width: 100%;\n    }\n\n    .cro-fbw-showcase__copy {\n        gap: 8px;\n    }\n\n    .cro-fbw-showcase__price {\n        flex-direction: column;\n        align-items: flex-start;\n    }\n\n    .cro-fbw-showcase__price .cro-fbw__price-now {\n        font-size: calc(var(--cro-fs-base) * 1.5);\n    }\n\n    .cro-fbw-showcase__panel {\n        grid-column: 1 / -1;\n        order: 1;\n    }\n}\n';
const MAX_VISUAL_IMAGES = 4;
const CARET_PROPERTY = "--cro-showcase-caret";
const renderVisual = (view) => {
  const images = view.items.slice(0, MAX_VISUAL_IMAGES);
  const hiddenCount = view.items.length - (MAX_VISUAL_IMAGES - 1);
  const tiles = images.map(({ product }, index) => {
    if (!view.hydrated) return `<span class="cro-fbw-showcase__tile">${skeleton("100%", "100%")}</span>`;
    const img = safeImageUrl(product?.imageUrl);
    const isMoreTile = view.items.length > MAX_VISUAL_IMAGES && index === MAX_VISUAL_IMAGES - 1;
    const overlay = isMoreTile ? `<span class="cro-fbw-showcase__more">+${escapeHtml(String(hiddenCount))}</span>` : "";
    return `<span class="cro-fbw-showcase__tile${isMoreTile ? " cro-fbw-showcase__tile--more" : ""}">${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy">` : ""}${overlay}</span>`;
  }).join("");
  const onlyItem = view.items.length === 1 ? view.items[0].component : null;
  const quantity = onlyItem && (onlyItem.quantity ?? 1) > 1 ? `<span class="cro-fbw-showcase__quantity">×${escapeHtml(String(onlyItem.quantity))}</span>` : "";
  return `<span class="cro-fbw-showcase__visual" data-count="${images.length}">${tiles}${quantity}</span>`;
};
const renderCardPrice = (ctx, view) => {
  const { totals, hasSaving, pending } = view;
  if (pending) return `<span class="cro-fbw-showcase__price">${skeleton("70%", "1.4em")}</span>`;
  return `<span class="cro-fbw-showcase__price">
            <span class="cro-fbw__price-now">${escapeHtml(ctx.money(totals.now))}</span>
            ${hasSaving ? `<span class="cro-fbw__price-was">${escapeHtml(ctx.money(totals.original))}</span>` : ""}
        </span>`;
};
const renderSavePill = (ctx, view) => {
  if (view.pending || !view.hasSaving) return "";
  const text = ctx.text("save_price_text", { amount: ctx.money(view.totals.saved), discount: `${view.totals.pct || 0}%` });
  return text ? `<span class="cro-fbw__save cro-fbw-showcase__save">${escapeHtml(text)}</span>` : "";
};
const renderCard = (ctx, view) => {
  const { bundle, isOpen, title, unavailable } = view;
  return `<section class="cro-fbw__bundle cro-fbw-showcase__card${isOpen ? " cro-fbw__bundle--open" : ""}${unavailable ? " cro-fbw__bundle--unavailable" : ""}" data-bundle-id="${escapeHtml(bundle.id)}">
        <div class="cro-fbw-showcase__choice" role="radio" aria-checked="${isOpen}" tabindex="0" data-action="select" data-bundle-id="${escapeHtml(bundle.id)}">
            <span class="cro-fbw-showcase__radio" aria-hidden="true"></span>
            ${renderVisual(view)}
            <span class="cro-fbw-showcase__copy">
                <a class="cro-fbw__bundle-title" href="/products/${escapeHtml(bundle.bundleHandle)}">${escapeHtml(title)}</a>
                ${renderSavePill(ctx, view)}
                ${renderCardPrice(ctx, view)}
            </span>
        </div>
        ${bundle.badge ? `<span class="cro-fbw__flag cro-fbw-showcase__flag">${escapeHtml(bundle.badge)}</span>` : ""}
    </section>`;
};
const renderPanel = (ctx, view) => `<div class="cro-fbw-showcase__panel" data-bundle-id="${escapeHtml(view.bundle.id)}">
        <div class="cro-fbw-showcase__rows">${renderProductRows(ctx, view, false)}</div>
    </div>`;
const renderBundles = (ctx, views, editor) => {
  const selected = views.find((view) => view.isOpen);
  return `<div class="cro-fbw cro-fbw--showcase">
        ${renderHeader(ctx)}
        <div class="cro-fbw-showcase__body">
            <div class="cro-fbw-showcase__grid" role="radiogroup" aria-label="Available bundles">
                ${views.map((view) => renderCard(ctx, view) + (view.isOpen ? renderPanel(ctx, view) : "")).join("")}
            </div>
            ${selected && ctx.settings.show_add_to_cart !== false ? `<div class="cro-fbw-showcase__foot">${renderCta(ctx, selected)}</div>` : ""}
        </div>
        ${renderEditor(ctx, editor)}
    </div>`;
};
const renderCurrentBundle = (ctx, view) => `<div class="cro-fbw cro-fbw--showcase cro-fbw--products">
        <div class="cro-fbw__list" role="group" aria-label="Bundle products">
            <section class="cro-fbw__bundle cro-fbw__bundle--open cro-fbw__bundle--products" data-bundle-id="${escapeHtml(view.bundle.id)}">
                ${renderIncludedHead(ctx, view.bundle)}
                <div class="cro-fbw__panel"><div class="cro-fbw-showcase__rows cro-fbw-showcase__rows--plain">${renderProductRows(ctx, view, true)}</div></div>
            </section>
        </div>
    </div>`;
const pointPanelAtSelection = (widget) => {
  const root = widget.shadowRoot;
  const panel = root?.querySelector(".cro-fbw-showcase__panel");
  const card = root?.querySelector(".cro-fbw-showcase__card.cro-fbw__bundle--open");
  if (!panel || !card) return;
  const panelRect = panel.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  panel.style.setProperty(CARET_PROPERTY, `${Math.round(cardRect.left + cardRect.width / 2 - panelRect.left)}px`);
};
const watchPanelPointer = (widget) => {
  const state = widget.store.layout;
  state.showcaseResizeObserver?.disconnect();
  pointPanelAtSelection(widget);
  const grid = widget.shadowRoot?.querySelector(".cro-fbw-showcase__grid");
  if (!grid || typeof ResizeObserver === "undefined") return;
  state.showcaseResizeObserver = new ResizeObserver(() => pointPanelAtSelection(widget));
  state.showcaseResizeObserver.observe(grid);
};
const captureState = (root) => {
  const panel = root.querySelector(".cro-fbw-showcase__panel");
  return {
    selectedId: root.querySelector(".cro-fbw-showcase__card.cro-fbw__bundle--open")?.dataset.bundleId ?? null,
    caret: panel?.style.getPropertyValue(CARET_PROPERTY) || null
  };
};
const restoreState = (root, previous) => {
  const panel = root.querySelector(".cro-fbw-showcase__panel");
  if (!panel) return;
  if (previous.caret) panel.style.setProperty(CARET_PROPERTY, previous.caret);
  if (!previous.selectedId || panel.dataset.bundleId === previous.selectedId) return;
  panel.classList.add("cro-fbw-showcase__panel--entering");
};
const showcaseLayout = {
  singleSelection: true,
  styles: showcaseStyles,
  renderBundles,
  renderCurrentBundle,
  captureState,
  restoreState,
  afterRender: watchPanelPointer,
  dispose: (widget) => widget.store.layout.showcaseResizeObserver?.disconnect()
};
const LAYOUTS = {
  foldout: foldoutLayout,
  lineup: lineupLayout,
  mosaic: mosaicLayout,
  poster: posterLayout,
  showcase: showcaseLayout
};
const DEFAULT_LAYOUT = "foldout";
const resolveLayout = (name) => LAYOUTS[name] || LAYOUTS[DEFAULT_LAYOUT];
const DEFAULT_TEXT = Object.freeze({
  header_text: "Bundle deal",
  included_products_text: "All products included in bundle",
  view_bundle_text: "View bundle",
  bundle_products_text: "{{count}} products in this bundle",
  save_price_text: "Save {{amount}}",
  change_variant_text: "Change",
  picker_title_text: "{{product_title}}",
  add_to_cart_text: "Add bundle to cart • {{price}}",
  summary_text: "({{items}} items) you save {{saved}}",
  adding_text: "Adding…",
  added_text: "Added to cart",
  retry_text: "Couldn’t add — try again",
  unavailable_text: "Currently unavailable",
  out_of_stock_text: "Out of stock"
});
const DEFAULT_SETTINGS = Object.freeze({
  max_bundles_display: 3,
  allow_collapse: true,
  default_bundle_state: "first_expanded",
  show_bundle_thumbnails: true,
  bundle_layout: "foldout",
  header_layout: "classic",
  product_layout: "slider",
  card_layout: "horizontal",
  show_product_price: true,
  show_product_compare_price: true,
  show_product_variant_summary: true,
  show_product_quantity: true,
  variant_picker_layout: "buttons",
  show_add_to_cart: true
});
const STYLE_TOKENS = [
  ["space", "--cro-space", "8px"],
  ["content_padding", "--cro-content-padding", "22px"],
  ["row_padding", "--cro-row-pad", "18px"],
  ["header_padding", "--cro-header-pad", "16px"],
  ["grid_gap", "--cro-grid-gap", "12px"],
  ["slide_gap", "--cro-slide-gap", "10px"],
  ["foot_gap", "--cro-foot-gap", "12px"],
  ["foot_padding", "--cro-foot-pad", "12px 20px"],
  ["radius", "--cro-radius", "10px"],
  ["radius_sm", "--cro-radius-sm", "4px"],
  ["radius_md", "--cro-radius-md", "8px"],
  ["card_radius", "--cro-card-radius", "12px"],
  ["image_radius", "--cro-image-radius", "4px"],
  ["badge_radius", "--cro-badge-radius", "5px"],
  ["button_radius", "--cro-btn-radius", "8px"],
  ["control_radius", "--cro-control-radius", "7px"],
  ["card_padding", "--cro-card-pad", "5px"],
  ["card_body_padding", "--cro-card-body-pad", "10px"],
  ["card_body_gap", "--cro-card-body-gap", "12px"],
  ["card_min_width", "--cro-card-min-w", "200px"],
  ["slide_card_width", "--cro-slide-card-w", "262px"],
  ["card_image_width", "--cro-img-h-w", "105px"],
  ["card_image_height", "--cro-img-h-h", "124px"],
  ["card_title_font_size", "--cro-card-title-fs", "var(--cro-fs-md)"],
  ["card_price_font_size", "--cro-card-price-fs", "var(--cro-fs-md)"],
  ["quantity_badge_size", "--cro-qty-size", "27px"],
  ["change_button_padding", "--cro-change-pad", "10px"],
  ["cta_padding", "--cro-cta-pad", "19px"],
  ["cta_font_size", "--cro-cta-fs", "var(--cro-fs-lg)"],
  ["cta_gap", "--cro-cta-gap", "8px"],
  ["cta_min_height", "--cro-cta-min-h", "52px"],
  ["spinner_size", "--cro-spinner-size", "15px"],
  ["chevron_size", "--cro-chevron-size", "24px"],
  ["chevron_icon_size", "--cro-chevron-icon", "14px"],
  ["arrow_size", "--cro-arrow-size", "30px"],
  ["arrow_offset", "--cro-arrow-offset", "-4px"],
  ["badge_font_size", "--cro-badge-fs", "var(--cro-fs-xs)"],
  ["badge_padding", "--cro-badge-pad", "3px 8px"],
  ["badge_tracking", "--cro-badge-tracking", "0.04em"],
  ["control_height", "--cro-control-h", "40px"],
  ["control_padding", "--cro-control-pad", "8px 10px"],
  ["radio_dot_size", "--cro-radio-dot", "15px"],
  ["control_font_size", "--cro-control-fs", "var(--cro-fs-sm)"],
  ["option_min_width", "--cro-option-min-w", "92px"],
  ["sheet_padding", "--cro-sheet-pad", "14px"],
  ["base_font_size", "--cro-fs-base", "16px"],
  ["container_border_width", "--cro-container-border-w", "2px"],
  ["image_ratio", "--cro-img-ratio", "200 / 180"],
  ["font_family", "--cro-font", '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'],
  ["container_margin", "--cro-container-margin", "0px"],
  ["color_background", "--cro-bg", "#ffffff"],
  ["color_surface", "--cro-surface", "#f6f7f8"],
  ["color_text", "--cro-fg", "#17191c"],
  ["color_muted", "--cro-muted", "#71767c"],
  ["color_line2", "--cro-line-2", "#00000033"],
  ["color_border", "--cro-border-subtle", "#00000033"],
  ["color_accent", "--cro-sel", "#17191c"],
  ["color_accent_on", "--cro-sel-fg", "#ffffff"],
  ["cta_background", "--cro-cta-bg", "#17191c"],
  ["cta_foreground", "--cro-cta-fg", "#ffffff"],
  ["badge_background", "--cro-badge-bg", "#17191c"],
  ["badge_foreground", "--cro-badge-fg", "#ffffff"],
  ["arrow_background", "--cro-arrow-bg", "#ffffff"],
  ["arrow_foreground", "--cro-arrow-fg", "#17191c"],
  ["header_background", "--cro-header-bg", "#f6f7f8"],
  ["header_foreground", "--cro-header-fg", "var(--cro-muted)"],
  ["note", "--cro-note", "#000000"],
  ["color_save", "--cro-save-color", "#BB0606"]
];
const TYPOGRAPHY_TARGETS = [
  ["header_typography", ".cro-fbw__header-text"],
  ["bundle_title_typography", ".cro-fbw__bundle-title"],
  ["bundle_price_typography", ".cro-fbw__price-now"],
  ["product_title_typography", ".cro-fbw__name"],
  ["product_price_typography", ".cro-fbw__card-price"],
  ["picker_label_typography", ".cro-fbw__opt-label"],
  ["button_typography", ".cro-fbw__cta"]
];
const createStore = () => ({
  selection: {},
  lastPicked: {},
  productMap: /* @__PURE__ */ new Map(),
  bundleProductMap: /* @__PURE__ */ new Map(),
  shownBundleVariants: /* @__PURE__ */ new Map(),
  shownComponentVariants: /* @__PURE__ */ new Map(),
  variantDetails: /* @__PURE__ */ new Map(),
  neighborhoodRequests: /* @__PURE__ */ new Map(),
  failedNeighborhoods: /* @__PURE__ */ new Set(),
  hydrated: false,
  hydrating: false,
  hydratedBundleIds: /* @__PURE__ */ new Set(),
  hydratingBundleIds: /* @__PURE__ */ new Set(),
  expandedBundles: /* @__PURE__ */ new Set(),
  expandedInitialized: false,
  editor: null,
  addState: "idle",
  addBundleId: null,
  layout: {},
  native: {
    cartItems: null,
    croSigns: {},
    forms: /* @__PURE__ */ new Set(),
    bundle: null,
    cartRequest: null,
    offerReported: false,
    formObserver: null,
    retagScheduled: false,
    clickAttached: false
  },
  tracking: {
    impressionObserver: null,
    impressionAtByBundle: {}
  }
});
class FixedBundleWidget extends (isBrowser ? HTMLElement : class {
}) {
  constructor() {
    super();
    if (isBrowser) this.attachShadow({ mode: "open" });
    this._eventsAttached = false;
    this.store = createStore();
    this._onReposition = this._onReposition.bind(this);
    this._onNativeAddToCartClick = (event) => handleNativeAddToCartClick(this, event);
  }
  static get observedAttributes() {
    return ["config", "settings", "styles", "is-builder-mode", "isbuildermode", "is-cro-hub-builder", "is-ec-builder", "widget-data", "widgetdata"];
  }
  connectedCallback() {
    if (isBrowser) {
      this.render();
      guardBuilderNavigation(this);
    }
    if (typeof window !== "undefined") window.addEventListener("resize", this._onReposition, { passive: true });
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => {
        if (this.isConnected && this.embeddedData.bundles) hydrateWidget(this);
      });
    }
  }
  disconnectedCallback() {
    if (typeof window !== "undefined") window.removeEventListener("resize", this._onReposition);
    disconnectCart(this);
    this.layout.dispose?.(this);
  }
  set widgetData(value) {
    const val = typeof value === "object" ? JSON.stringify(value) : value;
    this.setAttribute("widget-data", val);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "widget-data" || name === "widgetdata") {
      const prev = this._prevSettings || {};
      const next = this.settings;
      if (prev.allow_collapse !== next.allow_collapse || prev.default_bundle_state !== next.default_bundle_state || prev.max_bundles_display !== next.max_bundles_display || prev.bundle_layout !== next.bundle_layout) {
        this.store.expandedBundles.clear();
        this.store.expandedInitialized = false;
      }
      this._prevSettings = next;
    }
    if (isBrowser && oldValue !== newValue) this.render();
  }
  get isBuilderMode() {
    return readBuilderMode(this);
  }
  set isBuilderMode(value) {
    writeBuilderMode(this, value);
  }
  get isEcBuilder() {
    return readEcBuilder(this);
  }
  get widgetId() {
    return readWidgetId(this);
  }
  get embeddedData() {
    if (this._embeddedData) return this._embeddedData;
    let data = null;
    try {
      const id = this.widgetId;
      if (id && typeof document !== "undefined") {
        const el = document.querySelector(
          `script[type="application/json"][data-id="${CSS.escape(id)}"]`
        );
        if (el) data = JSON.parse(el.textContent);
      }
    } catch {
      data = null;
    }
    if (!data) return {};
    this._embeddedData = data;
    return data;
  }
  get _resolvedFixedWidget() {
    return readJsonAttribute(this, "widget-data") ?? this.embeddedData?.fixedWidget ?? {};
  }
  get settings() {
    return { ...DEFAULT_SETTINGS, ...this._resolvedFixedWidget?.settings || {} };
  }
  get styleSettings() {
    return this._resolvedFixedWidget?.styles || {};
  }
  get pickerLayout() {
    const { variant_picker_layout: layout, show_add_to_cart: showAddToCart } = this.settings;
    return layout === "none" || showAddToCart === false ? "none" : "buttons";
  }
  get layout() {
    return resolveLayout(this.settings.bundle_layout);
  }
  get renderContext() {
    return {
      settings: this.settings,
      text: (name, vars) => this._text(name, vars),
      textHtml: (name, vars) => this._textHtml(name, vars),
      money: (cents) => formatMoney(this, cents)
    };
  }
  _openBundle(bundleId) {
    const { store } = this;
    store.expandedBundles.clear();
    store.editor = null;
    store.addState = "idle";
    store.expandedBundles.add(bundleId);
    const bundle = findBundle(this, bundleId);
    if (bundle && !store.hydratedBundleIds.has(bundle.id)) {
      hydrateBundle(this, bundle).then(() => {
        if (this.isConnected) this.render();
      });
    }
    this.render();
  }
  _toggleBundle(bundleId) {
    if (this.settings.allow_collapse === false) return;
    const { store } = this;
    if (!store.expandedBundles.has(bundleId)) {
      this._openBundle(bundleId);
      return;
    }
    store.expandedBundles.clear();
    store.editor = null;
    store.addState = "idle";
    this.render();
  }
  _selectBundle(bundleId) {
    if (this.store.expandedBundles.has(bundleId)) return;
    this._openBundle(bundleId);
  }
  _openEditor(bundleId, productId) {
    if (this.isEcBuilder) return;
    this.store.editor = { bundleId, productId: String(productId) };
    this._syncEditor();
    const sheet = this.shadowRoot?.querySelector(".cro-fbw__sheet");
    (sheet?.querySelector("[data-action='pick']:checked") || sheet?.querySelector(".cro-fbw__sheet-close"))?.focus({ preventScroll: true });
  }
  _closeEditor() {
    const { editor } = this.store;
    if (!editor) return;
    this.store.editor = null;
    this._syncEditor();
    this._restoreFocus({ action: "edit", bundleId: editor.bundleId, productId: editor.productId });
  }
  _syncEditor() {
    const editorElement = this.shadowRoot?.querySelector("[data-editor]");
    if (!editorElement) {
      this.render();
      return;
    }
    this.toggleAttribute("data-editing", Boolean(this.store.editor));
    editorElement.outerHTML = renderEditor(this.renderContext, buildEditorView(this));
    positionEditor(this);
  }
  _pickVariant(bundleId, productId, optionName, value) {
    if (applyVariantPick(this, bundleId, productId, optionName, value)) this.render();
  }
  _t(value, vars, fallback) {
    return resolveTextTemplate(value, vars || {}, fallback).trim();
  }
  _text(name, vars) {
    return this._t(this.settings[name], vars, DEFAULT_TEXT[name]);
  }
  _textHtml(name, vars) {
    const template = escapeHtml(resolveLocaleValue(this.settings[name], DEFAULT_TEXT[name])).trim();
    return resolveTextTemplate(template, vars || {}, "");
  }
  _captureFocus() {
    const active = this.shadowRoot?.activeElement;
    if (!active?.dataset?.action) return null;
    const { action, bundleId, productId, option, value } = active.dataset;
    return { action, bundleId, productId, option, value };
  }
  _restoreFocus(focus) {
    if (!focus || !this.shadowRoot) return;
    const attributes = { action: focus.action, "bundle-id": focus.bundleId, "product-id": focus.productId, option: focus.option, value: focus.value };
    const selector = Object.entries(attributes).filter(([, value]) => value != null).map(([name, value]) => `[data-${name}="${CSS.escape(String(value))}"]`).join("");
    this.shadowRoot.querySelector(selector)?.focus({ preventScroll: true });
  }
  _captureScroll() {
    if (!this.shadowRoot) return null;
    const layout = this.layout;
    const sheet = this.shadowRoot.querySelector(".cro-fbw__sheet");
    const sheetBody = this.shadowRoot.querySelector(".cro-fbw__sheet-body");
    return {
      layout,
      layoutState: layout.captureState?.(this.shadowRoot) ?? null,
      sheet: sheet ? sheet.scrollTop : null,
      sheetBody: sheetBody ? sheetBody.scrollTop : null
    };
  }
  _restoreScroll(state) {
    if (!state || !this.shadowRoot) return;
    if (state.layoutState && state.layout === this.layout) this.layout.restoreState?.(this.shadowRoot, state.layoutState);
    if (state.sheet != null) {
      const sheet = this.shadowRoot.querySelector(".cro-fbw__sheet");
      if (sheet) sheet.scrollTop = state.sheet;
    }
    if (state.sheetBody != null) {
      const sheetBody = this.shadowRoot.querySelector(".cro-fbw__sheet-body");
      if (sheetBody) sheetBody.scrollTop = state.sheetBody;
    }
  }
  render() {
    const { store } = this;
    this._pendingScroll = this._captureScroll();
    this._pendingFocus = this._captureFocus();
    const { bundles, isCurrentProductBundle } = this.embeddedData || {};
    if (!bundles?.length) {
      this.shadowRoot.innerHTML = "";
      return;
    }
    if (!store.hydrated) {
      this.shadowRoot.innerHTML = "";
      return;
    }
    this.toggleAttribute("data-editing", Boolean(store.editor));
    const { layout } = this;
    const context = this.renderContext;
    if (isCurrentProductBundle) {
      const view = buildCurrentBundleView(this, bundles[0]);
      this.shadowRoot.innerHTML = `${this.styles}
${layout.renderCurrentBundle(context, view)}`;
      this._attachEvents();
      this._afterRender();
      tagNativeAddToCartForms(this, bundles[0]);
      prefetchVariantNeighborhoods(this, [bundles[0]]);
      return;
    }
    const settings = this.settings || {};
    const bundlesToShow = visibleBundles(this);
    const allowCollapse = layout.singleSelection || settings.allow_collapse !== false && bundlesToShow.length > 1;
    if (!store.expandedInitialized && bundlesToShow.length > 0) {
      store.expandedInitialized = true;
      const initialId = initialOpenBundleId(this, bundlesToShow);
      if (initialId != null) store.expandedBundles.add(initialId);
    }
    const views = bundlesToShow.map((bundle, index) => buildBundleView(this, bundle, index, allowCollapse));
    this.shadowRoot.innerHTML = `${this.styles}
${layout.renderBundles(context, views, buildEditorView(this))}`;
    this._attachEvents();
    this._afterRender();
    prefetchVariantNeighborhoods(this, views.filter((view) => view.isOpen || store.lastPicked[view.bundle.id]).map((view) => view.bundle));
  }
  _afterRender() {
    this._restoreScroll(this._pendingScroll);
    this._pendingScroll = null;
    this._restoreFocus(this._pendingFocus);
    this._pendingFocus = null;
    positionEditor(this);
    this.layout.afterRender?.(this);
    syncImpressionObserver(this);
  }
  _onReposition() {
    positionEditor(this);
  }
  _attachEvents() {
    if (this._eventsAttached) return;
    this._eventsAttached = true;
    this.shadowRoot.addEventListener("click", (e) => {
      if (e.target.closest("a[href]")) return;
      const toggle = e.target.closest("[data-action='toggle']");
      if (toggle) {
        this._toggleBundle(toggle.dataset.bundleId);
        return;
      }
      const select = e.target.closest("[data-action='select']");
      if (select) {
        this._selectBundle(select.dataset.bundleId);
        return;
      }
      const edit = e.target.closest("[data-action='edit']");
      if (edit) {
        this._openEditor(edit.dataset.bundleId, edit.dataset.productId);
        return;
      }
      const close = e.target.closest("[data-action='close-editor']");
      if (close) {
        this._closeEditor();
        return;
      }
      if (this.layout.handleClick?.(e)) return;
      const add = e.target.closest("[data-action='add']");
      if (add) {
        if (add.disabled) return;
        const bundle = findBundle(this, add.dataset.bundleId);
        if (bundle) addBundleToCart(this, bundle);
        return;
      }
    });
    this.shadowRoot.addEventListener("change", (e) => {
      const el = e.target.closest?.("[data-action='pick']");
      if (!el || el.disabled) return;
      this._pickVariant(el.dataset.bundleId, el.dataset.productId, el.dataset.option, el.dataset.value ?? el.value);
    });
    this.shadowRoot.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.store.editor) this._closeEditor();
      if (e.target.closest("a[href]")) return;
      if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-action='toggle']")) {
        e.preventDefault();
        const toggle = e.target.closest("[data-action='toggle']");
        if (toggle) this._toggleBundle(toggle.dataset.bundleId);
      }
      if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-action='select']")) {
        e.preventDefault();
        this._selectBundle(e.target.closest("[data-action='select']").dataset.bundleId);
      }
    });
  }
  get styles() {
    const styleSettings = this.styleSettings || {};
    const tokens = styleSettings.tokens || {};
    const declarations = STYLE_TOKENS.map(([token, cssVar, fallback]) => {
      const value = tokens[token];
      const resolved = value !== void 0 && value !== null && value !== "" ? value : fallback;
      return `${cssVar}: ${resolved};`;
    }).join("\n    ");
    const typographyRules = TYPOGRAPHY_TARGETS.map(([field, selector]) => {
      const css = typographyCss(styleSettings[field]);
      return css ? `.cro-fbw ${selector} { ${css} }` : "";
    }).filter(Boolean).join("\n");
    const overrides = `.cro-fbw {
    ${declarations}
}
${typographyRules}`;
    const customCss = String(styleSettings.custom_css || "").replace(/<\/style/gi, "");
    const layoutStyles = this.layout.styles ? `
${this.layout.styles}` : "";
    return `<style>${fixedBundleStyles}
${headerStyles}${layoutStyles}
${overrides}</style>${customCss ? `<style>${customCss}</style>` : ""}`;
  }
}
if (typeof customElements !== "undefined" && !customElements.get("cro-fixed-bundle-widget")) {
  customElements.define("cro-fixed-bundle-widget", FixedBundleWidget);
}
export {
  FixedBundleWidget as default
};
