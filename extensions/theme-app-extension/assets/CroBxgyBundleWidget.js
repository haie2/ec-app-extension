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
const bxgyStyles = '*,\n*::before,\n*::after {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n}\n\n:host {\n    display: block;\n}\n\n.cro-bxgy {\n    --cro-fg: #000000;\n    --cro-bg: #ffffff;\n    --cro-border-subtle: #00000033;\n\n    --cro-font: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n    --cro-fw-medium: 500;\n    --cro-fw-semibold: 600;\n    --cro-lh-heading: 1.2;\n\n    --cro-header-title-fs: 20px;\n    --cro-header-subtitle-fs: 14px;\n    --cro-header-gap: 6px;\n    --cro-header-divider-w: 157px;\n    --cro-header-divider-h: 2px;\n    --cro-header-divider-mt: 13px;\n    --cro-header-mb: 25px;\n\n    --cro-trigger-gap: 13px;\n    --cro-trigger-card-min-w: 280px;\n    --cro-trigger-card-max-w: 324px;\n    --cro-card-radius: 8px;\n    --cro-card-border-w: 1px;\n    --cro-card-pad: 5px;\n    --cro-card-gap: 12px;\n    --cro-card-body-pt: 9px;\n    --cro-card-body-gap: 7px;\n    --cro-card-title-fs: 14px;\n    --cro-card-title-lines: 2;\n    --cro-card-price-fs: 14px;\n    --cro-price-gap: 7px;\n    --cro-price-row-gap: 2px;\n    --cro-price-was-opacity: 0.6;\n    --cro-img-w: 105px;\n    --cro-img-h: 124px;\n    --cro-image-radius: 4px;\n    --cro-qty-size: 20px;\n    --cro-qty-fs: 10px;\n    --cro-qty-top: 4.5px;\n    --cro-qty-right: 6.5px;\n    --cro-qty-radius: 2px;\n    --cro-qty-bg: var(--cro-fg);\n    --cro-qty-fg: var(--cro-bg);\n    --cro-control-w: 99px;\n    --cro-control-h: 28px;\n    --cro-control-fs: 12px;\n    --cro-control-radius: 4px;\n    --cro-control-pad-left: 10px;\n    --cro-control-pad-right: 28px;\n    --cro-caret-w: 10px;\n    --cro-caret-right: 12px;\n    --cro-fw-regular: 400;\n    --cro-fw-bold: 600;\n\n    --cro-body-gap: 22px;\n    --cro-reward-gap: 25px;\n    --cro-reward-head-gap: 14px;\n    --cro-reward-label-fs: 14px;\n    --cro-reward-label-case: uppercase;\n    --cro-reward-bg: color-mix(in srgb, var(--cro-fg) 4%, transparent);\n    --cro-reward-border: var(--cro-fg);\n    --cro-reward-border-w: 2px;\n    --cro-reward-radius: 12px;\n    --cro-reward-pad: 12px;\n    --cro-reward-list-gap: 13px;\n    --cro-reward-card-min-w: 240px;\n    --cro-reward-card-max-w: 312px;\n    --cro-reward-card-border: color-mix(in srgb, var(--cro-fg) 10%, transparent);\n    --cro-reward-card-pad-y: 9px;\n    --cro-reward-card-pad-x: 10px;\n    --cro-reward-card-gap: 13px;\n    --cro-reward-body-gap: 9px;\n    --cro-reward-info-gap: 2px;\n    --cro-reward-img-w: 52px;\n    --cro-reward-img-h: 61px;\n    --cro-reward-img-radius: 2px;\n    --cro-gift-bg: #d9fa74;\n    --cro-gift-fg: #000000;\n    --cro-gift-h: 20px;\n    --cro-gift-pad-x: 10px;\n    --cro-gift-fs: 10px;\n    --cro-gift-radius: 4px;\n\n    --cro-footer-mt: 11px;\n    --cro-footer-gap: 7px;\n    --cro-total-gap: 9px;\n    --cro-total-label-fs: 14px;\n    --cro-total-price-fs: 20px;\n    --cro-savings-fs: 12px;\n    --cro-savings-color: #b30000;\n    --cro-cta-mt: 13px;\n    --cro-cta-bg: var(--cro-fg);\n    --cro-cta-fg: var(--cro-bg);\n    --cro-cta-border: color-mix(in srgb, var(--cro-fg) 8%, transparent);\n    --cro-cta-h: 52px;\n    --cro-cta-fs: 18px;\n    --cro-cta-pad: 10px;\n    --cro-cta-radius: 8px;\n\n    --cro-progress-max-w: 461px;\n    --cro-progress-gap: 5px;\n    --cro-progress-mb: 30px;\n    --cro-progress-fs: 12px;\n    --cro-progress-color: #1c9622;\n    --cro-track-h: 7px;\n    --cro-track-bg: color-mix(in srgb, var(--cro-fg) 8%, transparent);\n    --cro-stepper-w: 68px;\n    --cro-step-icon: 8px;\n    --cro-step-disabled-opacity: 0.3;\n    --cro-controls-gap: 6px;\n\n    --cro-reward-list-row-gap: 12px;\n    --cro-reward-qty-top: 3px;\n    --cro-reward-qty-right: 3px;\n    --cro-reward-pick-img-w: 95px;\n    --cro-reward-pick-img-h: 113px;\n    --cro-reward-pick-img-radius: 4px;\n    --cro-reward-pick-gap: 15px;\n    --cro-reward-pick-pad: 5px;\n    --cro-reward-pick-body-pt: 8px;\n    --cro-reward-pick-body-pb: 4px;\n    --cro-reward-pick-qty-top: 5px;\n    --cro-reward-pick-qty-right: 5px;\n    --cro-reward-controls-mt: 3px;\n    --cro-reward-controls-gap: 7px;\n    --cro-reward-title-gap: 9px;\n    --cro-reward-locked-opacity: 0.4;\n    --cro-lock-badge-h: 22px;\n    --cro-lock-badge-pad-x: 7px;\n    --cro-lock-badge-gap: 5px;\n    --cro-lock-badge-bg: color-mix(in srgb, var(--cro-fg) 8%, transparent);\n    --cro-lock-badge-fs: 10px;\n    --cro-lock-icon-w: 8px;\n    --cro-lock-icon-h: 10px;\n    --cro-cta-disabled-bg: color-mix(in srgb, var(--cro-fg) 20%, transparent);\n\n    --cro-radius: 10px;\n    --cro-container-border-w: 2px;\n    --cro-container-max-w: 705px;\n    --cro-container-margin: 0px;\n    --cro-container-pad-x: 22px;\n    --cro-container-pad-y: 27px;\n\n    position: relative;\n    width: 100%;\n    max-width: var(--cro-container-max-w);\n    margin: var(--cro-container-margin) auto;\n    padding: var(--cro-container-pad-y) var(--cro-container-pad-x);\n    background-color: var(--cro-bg);\n    border: var(--cro-container-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-radius);\n    color: var(--cro-fg);\n    font-family: var(--cro-font);\n}\n\n.cro-bxgy__header {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: var(--cro-header-gap);\n    margin-bottom: var(--cro-header-mb);\n    text-align: center;\n}\n\n.cro-bxgy__title {\n    font-size: var(--cro-header-title-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__subtitle {\n    font-size: var(--cro-header-subtitle-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__header-divider {\n    width: var(--cro-header-divider-w);\n    max-width: 100%;\n    height: var(--cro-header-divider-h);\n    margin-top: var(--cro-header-divider-mt);\n    border: 0;\n    background-color: var(--cro-border-subtle);\n}\n\n.cro-bxgy__trigger {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--cro-trigger-card-min-w)), 1fr));\n    gap: var(--cro-trigger-gap);\n}\n\n.cro-bxgy__card {\n    display: flex;\n    justify-self: start;\n    width: 100%;\n    max-width: var(--cro-trigger-card-max-w);\n    gap: var(--cro-card-gap);\n    min-width: 0;\n    padding: calc(var(--cro-card-pad) - var(--cro-card-border-w));\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-bxgy__media {\n    position: relative;\n    flex: none;\n    width: var(--cro-img-w);\n    height: var(--cro-img-h);\n}\n\n.cro-bxgy__img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    border-radius: var(--cro-image-radius);\n}\n\n.cro-bxgy__img--placeholder {\n    background-color: var(--cro-border-subtle);\n}\n\n.cro-bxgy__qty {\n    position: absolute;\n    top: var(--cro-qty-top);\n    right: var(--cro-qty-right);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-width: var(--cro-qty-size);\n    height: var(--cro-qty-size);\n    padding: 0 3px;\n    background-color: var(--cro-qty-bg);\n    border-radius: var(--cro-qty-radius);\n    color: var(--cro-qty-fg);\n    font-size: var(--cro-qty-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: 1;\n}\n\n.cro-bxgy__card-body {\n    display: flex;\n    flex: 1;\n    flex-direction: column;\n    align-items: flex-start;\n    gap: var(--cro-card-body-gap);\n    min-width: 0;\n    padding-top: var(--cro-card-body-pt);\n}\n\n.cro-bxgy__name {\n    display: -webkit-box;\n    max-width: 100%;\n    overflow: hidden;\n    overflow-wrap: anywhere;\n    -webkit-line-clamp: var(--cro-card-title-lines);\n    -webkit-box-orient: vertical;\n    font-size: var(--cro-card-title-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__price {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    gap: var(--cro-price-row-gap) var(--cro-price-gap);\n    max-width: 100%;\n    font-size: var(--cro-card-price-fs);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__price-was,\n.cro-bxgy__price-now {\n    white-space: nowrap;\n}\n\n.cro-bxgy__price-was {\n    font-weight: var(--cro-fw-regular);\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__price-now {\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-bxgy__select {\n    position: relative;\n    width: var(--cro-control-w);\n    max-width: 100%;\n    height: var(--cro-control-h);\n}\n\n.cro-bxgy__select-input {\n    width: 100%;\n    height: 100%;\n    padding: 0 var(--cro-control-pad-right) 0 var(--cro-control-pad-left);\n    overflow: hidden;\n    appearance: none;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    color: inherit;\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-regular);\n    text-overflow: ellipsis;\n}\n\n.cro-bxgy__select-caret {\n    position: absolute;\n    top: 50%;\n    right: var(--cro-caret-right);\n    width: var(--cro-caret-w);\n    transform: translateY(-50%);\n    pointer-events: none;\n}\n\n.cro-bxgy__body {\n    display: grid;\n    gap: var(--cro-body-gap);\n}\n\n.cro-bxgy__reward {\n    display: grid;\n    gap: var(--cro-reward-gap);\n}\n\n.cro-bxgy__reward-head {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);\n    align-items: center;\n    gap: var(--cro-reward-head-gap);\n}\n\n.cro-bxgy__reward-head::before,\n.cro-bxgy__reward-head::after {\n    content: "";\n    height: var(--cro-card-border-w);\n    background-color: var(--cro-border-subtle);\n}\n\n.cro-bxgy__reward-title {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    justify-content: center;\n    gap: var(--cro-price-row-gap) var(--cro-reward-title-gap);\n}\n\n.cro-bxgy__lock-badge {\n    display: inline-flex;\n    align-items: center;\n    gap: var(--cro-lock-badge-gap);\n    height: var(--cro-lock-badge-h);\n    padding: 0 var(--cro-lock-badge-pad-x);\n    background-color: var(--cro-lock-badge-bg);\n    border-radius: var(--cro-gift-radius);\n    font-size: var(--cro-lock-badge-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: 1;\n    text-transform: uppercase;\n}\n\n.cro-bxgy__lock-icon {\n    width: var(--cro-lock-icon-w);\n    height: var(--cro-lock-icon-h);\n}\n\n.cro-bxgy__reward--locked .cro-bxgy__reward-list {\n    opacity: var(--cro-reward-locked-opacity);\n}\n\n.cro-bxgy__reward-label {\n    font-size: var(--cro-reward-label-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n    text-align: center;\n    text-transform: var(--cro-reward-label-case);\n}\n\n.cro-bxgy__reward-list {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--cro-reward-card-min-w)), 1fr));\n    gap: var(--cro-reward-list-gap);\n    padding: calc(var(--cro-reward-pad) - var(--cro-reward-border-w));\n    background-color: var(--cro-reward-bg);\n    border: var(--cro-reward-border-w) solid var(--cro-reward-border);\n    border-radius: var(--cro-reward-radius);\n}\n\n.cro-bxgy__reward-card {\n    display: flex;\n    justify-self: start;\n    gap: var(--cro-reward-card-gap);\n    width: 100%;\n    max-width: var(--cro-reward-card-max-w);\n    min-width: 0;\n    padding: var(--cro-reward-card-pad-y) var(--cro-reward-card-pad-x);\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-reward-card-border);\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-bxgy__reward-media {\n    --cro-image-radius: var(--cro-reward-img-radius);\n    position: relative;\n    flex: none;\n    width: var(--cro-reward-img-w);\n    height: var(--cro-reward-img-h);\n}\n\n.cro-bxgy__reward-media .cro-bxgy__qty {\n    top: var(--cro-reward-qty-top);\n    right: var(--cro-reward-qty-right);\n}\n\n.cro-bxgy__reward-body {\n    display: flex;\n    flex: 1;\n    flex-direction: column;\n    align-items: flex-start;\n    gap: var(--cro-reward-body-gap);\n    min-width: 0;\n}\n\n.cro-bxgy__gift-tag {\n    display: inline-flex;\n    align-items: center;\n    height: var(--cro-gift-h);\n    padding: 0 var(--cro-gift-pad-x);\n    background-color: var(--cro-gift-bg);\n    border-radius: var(--cro-gift-radius);\n    color: var(--cro-gift-fg);\n    font-size: var(--cro-gift-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: 1;\n}\n\n.cro-bxgy__reward-info {\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-reward-info-gap);\n    max-width: 100%;\n    min-width: 0;\n}\n\n.cro-bxgy__footer {\n    display: grid;\n    justify-items: center;\n    gap: var(--cro-footer-gap);\n    margin-top: var(--cro-footer-mt);\n}\n\n.cro-bxgy__total {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    justify-content: center;\n    gap: var(--cro-price-row-gap) var(--cro-total-gap);\n    text-align: center;\n}\n\n.cro-bxgy__total-label {\n    font-size: var(--cro-total-label-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__total-price {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    justify-content: center;\n    gap: var(--cro-price-row-gap) var(--cro-total-gap);\n    white-space: nowrap;\n}\n\n.cro-bxgy__total-was {\n    font-size: var(--cro-total-label-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__total-now {\n    font-size: var(--cro-total-price-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__savings {\n    font-size: var(--cro-savings-fs);\n    font-weight: var(--cro-fw-regular);\n    line-height: var(--cro-lh-heading);\n    text-align: center;\n}\n\n.cro-bxgy__savings-value {\n    color: var(--cro-savings-color);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__cta {\n    width: 100%;\n    min-height: var(--cro-cta-h);\n    margin-top: var(--cro-cta-mt);\n    padding: var(--cro-cta-pad);\n    background-color: var(--cro-cta-bg);\n    border: var(--cro-card-border-w) solid var(--cro-cta-border);\n    border-radius: var(--cro-cta-radius);\n    color: var(--cro-cta-fg);\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-cta-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__progress {\n    display: grid;\n    gap: var(--cro-progress-gap);\n    width: 100%;\n    max-width: var(--cro-progress-max-w);\n    margin: 0 auto var(--cro-progress-mb);\n}\n\n.cro-bxgy__progress-labels {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    justify-content: space-between;\n    gap: var(--cro-price-row-gap) var(--cro-total-gap);\n    font-size: var(--cro-progress-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__progress-count {\n    margin-left: auto;\n    color: var(--cro-progress-color);\n}\n\n.cro-bxgy__progress-track {\n    height: var(--cro-track-h);\n    overflow: hidden;\n    background-color: var(--cro-track-bg);\n    border-radius: 100px;\n}\n\n.cro-bxgy__progress-fill {\n    height: 100%;\n    background-color: var(--cro-progress-color);\n    border-radius: 100px;\n}\n\n.cro-bxgy__variant-row {\n    width: 100%;\n}\n\n.cro-bxgy__variant-row .cro-bxgy__select {\n    display: block;\n    width: 100%;\n}\n\n.cro-bxgy__action-row {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: var(--cro-controls-gap);\n    width: 100%;\n}\n\n.cro-bxgy__action-row .cro-bxgy__stepper {\n    flex: none;\n}\n\n.cro-bxgy__action-row .cro-bxgy__add {\n    flex: 1 1 auto;\n    min-width: 96px;\n    width: auto;\n}\n\n.cro-bxgy__stepper {\n    display: grid;\n    grid-template-columns: 1fr auto 1fr;\n    align-items: center;\n    width: var(--cro-stepper-w);\n    height: var(--cro-control-h);\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    font-size: var(--cro-card-price-fs);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__step {\n    display: grid;\n    place-items: center;\n    height: 100%;\n    padding: 0;\n    background: none;\n    border: 0;\n    color: inherit;\n    cursor: pointer;\n}\n\n.cro-bxgy__step:disabled {\n    cursor: not-allowed;\n    opacity: var(--cro-step-disabled-opacity);\n}\n\n.cro-bxgy__step-value {\n    text-align: center;\n}\n\n.cro-bxgy__step-icon {\n    width: var(--cro-step-icon);\n    height: var(--cro-step-icon);\n}\n\n.cro-bxgy__add {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) auto;\n    align-items: center;\n    gap: var(--cro-controls-gap);\n    width: var(--cro-control-w);\n    max-width: 100%;\n    height: var(--cro-control-h);\n    padding: 0 var(--cro-caret-right) 0 var(--cro-control-pad-left);\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    color: inherit;\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-semibold);\n    text-align: left;\n}\n\n.cro-bxgy__add-label {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-bxgy__cta:disabled {\n    background-color: var(--cro-cta-disabled-bg);\n    cursor: not-allowed;\n}\n\n.cro-bxgy__reward-list:has(.cro-bxgy__reward-card--mixMatch) {\n    row-gap: var(--cro-reward-list-row-gap);\n}\n\n.cro-bxgy__reward-card--mixMatch {\n    gap: var(--cro-reward-pick-gap);\n    padding: calc(var(--cro-reward-pick-pad) - var(--cro-card-border-w));\n}\n\n.cro-bxgy__reward-card--mixMatch .cro-bxgy__reward-media {\n    --cro-image-radius: var(--cro-reward-pick-img-radius);\n    width: var(--cro-reward-pick-img-w);\n    height: var(--cro-reward-pick-img-h);\n}\n\n.cro-bxgy__reward-card--mixMatch .cro-bxgy__qty {\n    top: var(--cro-reward-pick-qty-top);\n    right: var(--cro-reward-pick-qty-right);\n}\n\n.cro-bxgy__reward-card--mixMatch .cro-bxgy__reward-body {\n    padding: var(--cro-reward-pick-body-pt) 0 var(--cro-reward-pick-body-pb);\n}\n\n.cro-bxgy__reward-controls {\n    display: grid;\n    justify-items: start;\n    gap: var(--cro-reward-controls-gap);\n    max-width: 100%;\n    margin-top: var(--cro-reward-controls-mt);\n}\n\n.cro-bxgy__add:disabled {\n    cursor: not-allowed;\n    opacity: var(--cro-step-disabled-opacity);\n}\n\n.cro-bxgy__sk {\n    display: block;\n    background-color: var(--cro-border-subtle);\n    border-radius: var(--cro-image-radius);\n    animation: cro-bxgy-pulse 1.4s ease-in-out infinite;\n}\n\n.cro-bxgy__sk--title {\n    width: 80%;\n    height: var(--cro-card-title-fs);\n}\n\n.cro-bxgy__sk--price {\n    width: 40%;\n    height: var(--cro-card-price-fs);\n}\n\n.cro-bxgy__unavailable {\n    font-size: var(--cro-card-price-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n    opacity: var(--cro-price-was-opacity);\n}\n\n@keyframes cro-bxgy-pulse {\n    0%,\n    100% {\n        opacity: 1;\n    }\n\n    50% {\n        opacity: 0.5;\n    }\n}\n\n@media (prefers-reduced-motion: reduce) {\n    .cro-bxgy__sk {\n        animation: none;\n    }\n}\n\n.cro-bxgy__picked {\n    display: flex;\n    flex-wrap: wrap;\n    justify-self: stretch;\n    gap: 4px;\n    width: 100%;\n    padding-top: 4px;\n    list-style: none;\n}\n\n.cro-bxgy__picked-line {\n    display: inline-flex;\n    align-items: center;\n    gap: 0;\n    max-width: 100%;\n    min-width: 0;\n    padding: 0 1px 0 6px;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: 999px;\n    font-size: 10px;\n    line-height: 1.2;\n}\n\n.cro-bxgy__picked-label {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-bxgy__picked-remove {\n    display: grid;\n    flex: none;\n    place-items: center;\n    width: 18px;\n    height: 18px;\n    padding: 0;\n    background: none;\n    border: 0;\n    border-radius: 999px;\n    color: inherit;\n    cursor: pointer;\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__picked-remove:hover,\n.cro-bxgy__picked-remove:focus-visible {\n    opacity: 1;\n}\n\n.cro-bxgy__picked-remove:focus-visible {\n    outline: 2px solid currentColor;\n    outline-offset: -2px;\n}\n\n.cro-bxgy__picked-remove-icon {\n    width: 6px;\n    height: 6px;\n}\n\n.cro-bxgy__backdrop {\n    position: fixed;\n    inset: 0;\n    z-index: 20;\n}\n\n.cro-bxgy__popover {\n    position: absolute;\n    top: calc(100% + 6px);\n    left: 0;\n    z-index: 21;\n    width: min(260px, 80vw);\n    max-height: 320px;\n    display: flex;\n    flex-direction: column;\n    transform: translateX(var(--cro-pop-shift, 0px));\n    padding: 10px;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);\n}\n\n.cro-bxgy__popover-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    margin-bottom: 6px;\n}\n\n.cro-bxgy__popover-title {\n    overflow: hidden;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-bold);\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-bxgy__popover-close {\n    flex: none;\n    width: 28px;\n    height: 28px;\n    background: none;\n    border: 0;\n    border-radius: var(--cro-control-radius);\n    color: inherit;\n    cursor: pointer;\n    font-size: 18px;\n    line-height: 1;\n}\n\n.cro-bxgy__popover-body {\n    min-height: 0;\n    overflow: auto;\n}\n\n.cro-bxgy__fieldset {\n    min-width: 0;\n    margin: 0 0 8px;\n    padding: 0;\n    border: 0;\n}\n\n.cro-bxgy__legend {\n    margin-bottom: 4px;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-semibold);\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__radios {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px;\n}\n\n.cro-bxgy__radio {\n    position: relative;\n}\n\n.cro-bxgy__radio-input {\n    position: absolute;\n    inset: 0;\n    margin: 0;\n    opacity: 0;\n    cursor: pointer;\n}\n\n.cro-bxgy__radio-label {\n    display: inline-flex;\n    align-items: center;\n    min-height: 28px;\n    padding: 0 10px;\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    font-size: var(--cro-control-fs);\n}\n\n.cro-bxgy__radio-input:checked + .cro-bxgy__radio-label {\n    border-color: var(--cro-fg);\n    box-shadow: inset 0 0 0 1px var(--cro-fg);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__radio-input:focus-visible + .cro-bxgy__radio-label {\n    outline: 2px solid currentColor;\n    outline-offset: 2px;\n}\n\n.cro-bxgy__radio--sold-out .cro-bxgy__radio-label {\n    opacity: 0.45;\n    text-decoration: line-through;\n}\n\n.cro-bxgy__radio--sold-out .cro-bxgy__radio-input {\n    cursor: not-allowed;\n}\n\n.cro-bxgy__sr {\n    position: absolute;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    clip-path: inset(50%);\n    white-space: nowrap;\n}\n\n.cro-bxgy__select-input[data-popover-trigger] {\n    cursor: pointer;\n}\n\n.cro-bxgy__popover-apply {\n    flex: none;\n    width: 100%;\n    height: var(--cro-control-h);\n    margin-top: 6px;\n    background-color: var(--cro-cta-bg);\n    border: 0;\n    border-radius: var(--cro-control-radius);\n    color: var(--cro-cta-fg);\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__popover-apply:disabled {\n    background-color: var(--cro-cta-disabled-bg);\n    cursor: not-allowed;\n}\n\n.cro-bxgy__popover-apply:focus-visible {\n    outline: 2px solid currentColor;\n    outline-offset: 2px;\n}\n';
const AJAX_VARIANT_LIMIT = 250;
const MAX_PARALLEL_REQUESTS = 6;
const REQUEST_TIMEOUT_MS = 1e4;
const collectBxgyHandles = (campaign) => {
  const items = [...campaign?.trigger?.items ?? [], ...campaign?.reward?.items ?? []];
  return [...new Set(items.map((item) => item?.handle).filter(Boolean))];
};
const withVariants = (product, variants) => ({
  ...product,
  price: variants.length ? Math.min(...variants.map((variant) => variant.price)) : 0,
  available: variants.some((variant) => variant.available),
  variants
});
const readOptionName = (option) => typeof option === "string" ? option : option?.name ?? "";
const normalizeBxgyAjaxProduct = (raw) => {
  const options = raw.options ?? [];
  const variants = (raw.variants ?? []).map((variant) => ({
    id: variant.id,
    title: variant.title ?? "",
    values: variant.options ?? [],
    price: variant.price,
    compareAtPrice: variant.compare_at_price ?? null,
    available: variant.available !== false,
    imageUrl: variant.featured_image?.src ?? null
  }));
  return withVariants({
    id: raw.id,
    handle: raw.handle,
    title: raw.title ?? "",
    imageUrl: raw.featured_image ?? null,
    optionNames: options.map(readOptionName),
    options: options.map((option) => ({ name: readOptionName(option), values: option?.values ?? [] })),
    hasMoreVariants: variants.length >= AJAX_VARIANT_LIMIT
  }, variants);
};
const narrowBxgyProducts = (products, items) => {
  const narrowed = [];
  for (const product of products ?? []) {
    const itemsOfProduct = (items ?? []).filter((item) => String(item?.id) === String(product?.id));
    if (!itemsOfProduct.length) continue;
    const includeAllVariants = itemsOfProduct.some((item) => !item.variantIds?.length);
    const allowedVariantIds = new Set(itemsOfProduct.flatMap((item) => item.variantIds ?? []).map(String));
    const variants = (product.variants ?? []).filter((variant) => includeAllVariants || allowedVariantIds.has(String(variant.id)));
    if (!variants.length) continue;
    narrowed.push(withVariants(product, variants));
  }
  return narrowed;
};
const requestProduct = async (handle) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const root = window.Shopify?.routes?.root || "/";
  try {
    const response = await fetch(`${root}products/${encodeURIComponent(handle)}.js`, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) return { product: null, isRetryable: response.status !== 404 };
    return { product: normalizeBxgyAjaxProduct(await response.json()), isRetryable: false };
  } catch {
    return { product: null, isRetryable: true };
  } finally {
    clearTimeout(timeoutId);
  }
};
const fetchBxgyProduct = (handle) => {
  window.__croBxgyProductCache ||= /* @__PURE__ */ new Map();
  const cache = window.__croBxgyProductCache;
  if (cache.has(handle)) return cache.get(handle);
  const request = requestProduct(handle).then(({ product, isRetryable }) => {
    if (isRetryable) cache.delete(handle);
    return product;
  });
  cache.set(handle, request);
  return request;
};
const mapWithConcurrency = async (values, limit, mapper) => {
  const results = new Array(values.length);
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, runWorker));
  return results;
};
const loadBxgyProducts = async (campaign) => {
  const products = await mapWithConcurrency(collectBxgyHandles(campaign), MAX_PARALLEL_REQUESTS, fetchBxgyProduct);
  return products.filter(Boolean);
};
const DEFAULT_TITLE_RE$1 = /^default\s*title$/i;
const countOptions = (variants) => Math.max(0, ...variants.map((variant) => variant.values?.length ?? 0));
const isDefaultTitleOnly = (variants) => variants.length === 1 && (variants[0].values ?? []).every((value) => DEFAULT_TITLE_RE$1.test(String(value)));
const matchesPrefix = (variant, selection, optionIndex) => {
  for (let index = 0; index < optionIndex; index += 1) {
    if (variant.values?.[index] !== selection[index]) return false;
  }
  return true;
};
const listChoices = (variants, selection, optionIndex) => {
  const choices = /* @__PURE__ */ new Map();
  for (const variant of variants) {
    if (!matchesPrefix(variant, selection, optionIndex)) continue;
    const value = variant.values?.[optionIndex];
    if (value == null) continue;
    choices.set(value, (choices.get(value) ?? false) || variant.available !== false);
  }
  return [...choices].map(([value, available]) => ({ value, available }));
};
const pickValue = (choices, preferredValue) => {
  const preferred = choices.find((choice) => choice.value === preferredValue);
  if (preferred?.available) return preferred.value;
  const firstAvailable = choices.find((choice) => choice.available);
  if (firstAvailable) return firstAvailable.value;
  return preferred?.value ?? choices[0]?.value ?? null;
};
const resolveSelection = (variants, selection) => {
  const defaultVariant = variants.find((variant) => variant.available !== false) ?? variants[0];
  const preferredSelection = selection ?? defaultVariant?.values ?? [];
  const resolvedSelection = [];
  for (let optionIndex = 0; optionIndex < countOptions(variants); optionIndex += 1) {
    const choices = listChoices(variants, resolvedSelection, optionIndex);
    resolvedSelection.push(pickValue(choices, preferredSelection[optionIndex]));
  }
  return resolvedSelection;
};
const findVariant = (variants, selection) => variants.find((variant) => (variant.values ?? []).every((value, optionIndex) => value === selection[optionIndex])) ?? null;
const DEFAULT_TITLE_RE = /^default\s*title$/i;
const SKELETON_CARDS_PER_GROUP = 3;
const POPOVER_OPTION_COUNT = 2;
const DEFAULT_TEXT = Object.freeze({
  headerTitleText: "Buy more, get a free gift",
  headerSubtitleText: "Add the eligible items to unlock your free reward",
  rewardLabel: "Your free reward preview",
  giftTagText: "Gift",
  rewardFreeText: "Free",
  footerSummaryText: "Total {{count}} items in this bundle :",
  footerSavingsText: "You save {{amount}} ({{percent}}%)",
  ctaText: "Add offer to cart • {{total}}",
  ctaUnavailableText: "Currently unavailable",
  ctaLockedText: "Add {{remaining}} more to unlock",
  ctaSpendText: "Spend {{amount}} more to unlock",
  ctaPickRewardText: "Choose your gift to continue",
  rewardLockedText: "Locked",
  itemAddText: "Add items",
  itemUnavailableText: "Unavailable",
  soldOutText: "Sold out",
  closeText: "Close",
  variantApplyText: "Apply",
  pickedLineDefaultText: "{{quantity}} added",
  removeLineLabelText: "Remove {{item}}",
  itemAddedAnnouncement: "Added {{quantity}} × {{item}}",
  itemRemovedAnnouncement: "Removed {{item}}",
  progressLabelText: "Your progress",
  progressCountText: "{{currentCount}}/{{maxTriggerCount}} items added ({{percent}}%)",
  progressSpendCountText: "{{currentAmount}} of {{targetAmount}} spent ({{percent}}%)"
});
const STYLE_TOKENS = Object.freeze([
  ["color_background", "--cro-bg", "#ffffff"],
  ["color_text", "--cro-fg", "#000000"],
  ["color_border", "--cro-border-subtle", "#00000033"],
  ["cta_background", "--cro-cta-bg", "#000000"],
  ["cta_foreground", "--cro-cta-fg", "#ffffff"],
  ["quantity_background", "--cro-qty-bg", "#000000"],
  ["quantity_foreground", "--cro-qty-fg", "#ffffff"],
  ["reward_border_color", "--cro-reward-border", "#000000"],
  ["progress_color", "--cro-progress-color", "#1c9622"],
  ["savings_color", "--cro-savings-color", "#b30000"],
  ["gift_background", "--cro-gift-bg", "#d9fa74"],
  ["gift_foreground", "--cro-gift-fg", "#000000"],
  ["radius", "--cro-radius", "10px"],
  ["card_radius", "--cro-card-radius", "8px"],
  ["reward_radius", "--cro-reward-radius", "12px"],
  ["control_radius", "--cro-control-radius", "4px"],
  ["cta_radius", "--cro-cta-radius", "8px"],
  ["gift_radius", "--cro-gift-radius", "4px"],
  ["image_radius", "--cro-image-radius", "4px"],
  ["quantity_radius", "--cro-qty-radius", "2px"],
  ["container_pad_x", "--cro-container-pad-x", "22px"],
  ["container_pad_y", "--cro-container-pad-y", "27px"],
  ["body_gap", "--cro-body-gap", "22px"],
  ["trigger_gap", "--cro-trigger-gap", "13px"],
  ["reward_gap", "--cro-reward-gap", "25px"],
  ["reward_pad", "--cro-reward-pad", "12px"],
  ["card_image_width", "--cro-img-w", "105px"],
  ["card_image_height", "--cro-img-h", "124px"],
  ["card_title_font_size", "--cro-card-title-fs", "14px"],
  ["card_price_font_size", "--cro-card-price-fs", "14px"],
  ["cta_height", "--cro-cta-h", "52px"],
  ["cta_font_size", "--cro-cta-fs", "18px"],
  ["font_family", "--cro-font", 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'],
  ["container_border_width", "--cro-container-border-w", "2px"]
]);
class CroBxgyWidget extends (isBrowser ? HTMLElement : class {
}) {
  constructor() {
    super();
    this._variantSelection = /* @__PURE__ */ new Map();
    this._editor = null;
    this._pickedLines = /* @__PURE__ */ new Map();
    this._draftQuantity = /* @__PURE__ */ new Map();
    if (isBrowser) {
      this.attachShadow({ mode: "open" });
      this._content = document.createElement("div");
      this._announcer = document.createElement("div");
      this._announcer.setAttribute("aria-live", "polite");
      this._announcer.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;";
      this.shadowRoot.append(this._content, this._announcer);
      this.shadowRoot.addEventListener("change", (event) => this._handleChange(event));
      this.shadowRoot.addEventListener("click", (event) => this._handleClick(event));
      this.shadowRoot.addEventListener("keydown", (event) => this._handleKeydown(event));
      this.shadowRoot.addEventListener("mousedown", (event) => {
        if (event.target.closest?.("[data-popover-trigger]")) event.preventDefault();
      });
      this.shadowRoot.addEventListener("touchend", (event) => {
        const trigger = event.target.closest?.("[data-popover-trigger]");
        if (!trigger) return;
        event.preventDefault();
        trigger.click();
      }, { passive: false });
    }
  }
  static get observedAttributes() {
    return ["config", "settings", "styles", "is-builder-mode", "isbuildermode", "is-cro-hub-builder", "is-ec-builder", "widget-data", "widgetdata"];
  }
  connectedCallback() {
    if (isBrowser) {
      this.render();
      guardBuilderNavigation(this);
    }
    if (!this._embeddedData && typeof queueMicrotask === "function") {
      queueMicrotask(() => {
        if (this.isConnected && this.embeddedData.campaign) this.render();
      });
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if ((name === "widget-data" || name === "widgetdata") && oldValue !== newValue) {
      this._dataCache = null;
      this._productMap = null;
      this._loadedProducts = null;
      this._editor = null;
      this._loadingCampaign = null;
      this._variantSelection.clear();
      this._pickedLines.clear();
      this._draftQuantity.clear();
    }
    if (isBrowser && oldValue !== newValue) this.render();
  }
  get isBuilderMode() {
    return readBuilderMode(this);
  }
  set isBuilderMode(value) {
    writeBuilderMode(this, value);
  }
  get widgetId() {
    return readWidgetId(this);
  }
  set widgetData(value) {
    const val = typeof value === "object" ? JSON.stringify(value) : value;
    this.setAttribute("widget-data", val);
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
        if (el) {
          const raw = el.textContent.replace(/<!--[\s\S]*?-->/g, "");
          data = JSON.parse(raw);
        }
      }
    } catch {
      data = null;
    }
    if (!data) return {};
    this._embeddedData = data;
    return data;
  }
  get _resolvedWidgetData() {
    if (this._dataCache) return this._dataCache;
    const data = this.hasAttribute("widget-data") ? readJsonAttribute(this, "widget-data") : this.embeddedData;
    if (data?.campaign) this._dataCache = data;
    return data;
  }
  get _productIndex() {
    if (!this._productMap) {
      const items = [...this._roleItems("trigger"), ...this._roleItems("reward")];
      this._productMap = new Map(narrowBxgyProducts(this.products, items).map((product) => [String(product.id), product]));
    }
    return this._productMap;
  }
  get _hasProvidedProducts() {
    return Array.isArray(this._resolvedWidgetData?.products);
  }
  get _loadState() {
    if (this._hasProvidedProducts || this.isBuilderMode || this._loadedProducts) return "ready";
    return "loading";
  }
  _loadProducts() {
    const campaign = this.campaign;
    if (this._loadingCampaign === campaign) return;
    this._loadingCampaign = campaign;
    loadBxgyProducts(campaign).then((products) => {
      if (this._loadingCampaign !== campaign) return;
      this._loadedProducts = products;
      this._productMap = null;
      if (this.isConnected) this.render();
    });
  }
  get campaign() {
    return this._resolvedWidgetData?.campaign ?? null;
  }
  get products() {
    if (this._hasProvidedProducts) return this._resolvedWidgetData.products;
    return this._loadedProducts ?? [];
  }
  get settings() {
    return this._resolvedWidgetData?.settings ?? {};
  }
  get styleSettings() {
    return this._resolvedWidgetData?.styles ?? {};
  }
  _renderHeader() {
    const title = this._text("headerTitleText");
    const subtitle = this._text("headerSubtitleText");
    const showDivider = this.campaign.trigger?.type === "fixed";
    if (!title && !subtitle && !showDivider) return "";
    return `
            <div class="cro-bxgy__header">
                ${title ? `<h2 class="cro-bxgy__title">${escapeHtml(title)}</h2>` : ""}
                ${subtitle ? `<p class="cro-bxgy__subtitle">${escapeHtml(subtitle)}</p>` : ""}
                ${showDivider ? `<hr class="cro-bxgy__header-divider">` : ""}
            </div>
        `;
  }
  _safeImg(url) {
    if (!url) return "";
    return url.startsWith("//") ? `https:${url}` : url;
  }
  _variantLabel(variant) {
    const values = (variant?.values ?? []).filter((value) => value != null && !DEFAULT_TITLE_RE.test(String(value)));
    return values.join(" / ");
  }
  _selectionKey(role, index) {
    return `${role}:${index}`;
  }
  _handleChange(event) {
    const select = event.target.closest?.(".cro-bxgy__select-input, .cro-bxgy__radio-input");
    if (!select) return;
    const { role, index, option } = select.dataset;
    const key = this._selectionKey(role, index);
    const item = this._roleItems(role)[Number(index)];
    const isDrafting = select.classList.contains("cro-bxgy__radio-input") && this._editor;
    const baseSelection = isDrafting ? this._editor.draft : this._variantSelection.get(key);
    const nextSelection = [...this._resolveItem(item, baseSelection).selection];
    nextSelection[Number(option)] = select.value;
    if (isDrafting) this._editor.draft = nextSelection;
    else this._variantSelection.set(key, nextSelection);
    this.render();
    this._restoreFocus([
      `.cro-bxgy__select-input[data-role="${role}"][data-index="${index}"][data-option="${option}"]`,
      `.cro-bxgy__radio-input[data-role="${role}"][data-index="${index}"][data-option="${option}"]:checked`
    ]);
  }
  _roleItems(role) {
    return (role === "trigger" ? this.campaign.trigger?.items : this.campaign.reward?.items) ?? [];
  }
  _pickLines(role, index) {
    return this._pickedLines.get(this._selectionKey(role, index)) ?? [];
  }
  _pickedUnits(role, index) {
    return this._pickLines(role, index).reduce((total, line) => total + line.quantity, 0);
  }
  _pickedUnitsOfRole(role) {
    return this._roleItems(role).reduce((total, _item, index) => total + this._pickedUnits(role, index), 0);
  }
  _remainingUnits(role, index) {
    const item = this._roleItems(role)[index];
    const itemRemaining = Math.max(1, Number(item?.quantity) || 1) - this._pickedUnits(role, index);
    if (role !== "reward") return Math.max(0, itemRemaining);
    if (this._lockState().isLocked) return 0;
    const maxQuantity = Number(this.campaign.reward?.maxQuantity) || Infinity;
    return Math.max(0, Math.min(itemRemaining, maxQuantity - this._pickedUnitsOfRole("reward")));
  }
  _draftUnits(role, index) {
    const remaining = this._remainingUnits(role, index);
    const draft = this._draftQuantity.get(this._selectionKey(role, index)) ?? 1;
    return Math.max(1, Math.min(draft, remaining));
  }
  _handleClick(event) {
    const target = event.target.closest?.("[data-action]");
    if (!target || target.disabled) return;
    const { action, role, index, delta, variantId } = target.dataset;
    const key = this._selectionKey(role, index);
    const cardSelector = `[data-role="${role}"][data-index="${index}"]`;
    const focusSelectors = [];
    if (action === "open-editor") {
      const item = this._roleItems(role)[Number(index)];
      this._editor = { role, index, draft: this._resolveItem(item, this._variantSelection.get(key)).selection };
      focusSelectors.push(`.cro-bxgy__radio-input[data-role="${role}"][data-index="${index}"]:checked`);
    }
    if (action === "apply-editor" && this._editor) {
      this._variantSelection.set(key, this._editor.draft);
      this._editor = null;
      focusSelectors.push(`[data-action="open-editor"]${cardSelector}`);
    }
    if (action === "close-editor") {
      this._editor = null;
      focusSelectors.push(`[data-action="open-editor"]${cardSelector}`);
    }
    if (action === "step") {
      this._draftQuantity.set(key, this._draftUnits(role, Number(index)) + Number(delta));
      focusSelectors.push(`[data-action="step"][data-delta="${delta}"]${cardSelector}`);
    }
    if (action === "add-items") {
      const addedLine = this._addItems(role, Number(index));
      if (addedLine) {
        this._announce(this._text("itemAddedAnnouncement", {
          quantity: addedLine.quantity,
          item: this._lineItemLabel(role, Number(index), addedLine.variantId)
        }));
        focusSelectors.push(`[data-action="add-items"]${cardSelector}`, `[data-action="remove-line"][data-variant-id="${addedLine.variantId}"]${cardSelector}`);
      }
    }
    if (action === "remove-line") {
      const removedLine = this._removeLine(role, Number(index), variantId);
      if (removedLine) {
        this._announce(this._text("itemRemovedAnnouncement", { item: this._lineItemLabel(role, Number(index), variantId) }));
      }
    }
    this.render();
    this._restoreFocus([...focusSelectors, `[data-action="add-items"]${cardSelector}`, `[data-action="remove-line"]${cardSelector}`]);
  }
  _handleKeydown(event) {
    if (event.key === "Escape" && this._editor) {
      this._closeEditor();
      return;
    }
    const trigger = event.target.closest?.("[data-popover-trigger]");
    if (trigger && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      trigger.click();
    }
  }
  _closeEditor() {
    const { role, index } = this._editor;
    this._editor = null;
    this.render();
    this._restoreFocus([`[data-action="open-editor"][data-role="${role}"][data-index="${index}"]`]);
  }
  _positionEditor() {
    const popover = this._content.querySelector(".cro-bxgy__popover");
    const section = this._content.querySelector(".cro-bxgy");
    if (!popover || !section) return;
    popover.style.removeProperty("--cro-pop-shift");
    const margin = 8;
    const sectionRect = section.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const overflowRight = popoverRect.right - (sectionRect.right - margin);
    const overflowLeft = sectionRect.left + margin - popoverRect.left;
    if (overflowRight > 0) popover.style.setProperty("--cro-pop-shift", `${-overflowRight}px`);
    else if (overflowLeft > 0) popover.style.setProperty("--cro-pop-shift", `${overflowLeft}px`);
  }
  _restoreFocus(selectors) {
    const target = selectors.map((selector) => this._content.querySelector(selector)).find((element) => element && !element.disabled);
    target?.focus();
  }
  _announce(message) {
    this._announcer.textContent = "";
    setTimeout(() => {
      this._announcer.textContent = message;
    }, 100);
  }
  _lineVariant(role, index, variantId) {
    const item = this._roleItems(role)[index];
    const product = this._productIndex.get(String(item?.id));
    return product?.variants.find((variant) => String(variant.id) === String(variantId)) ?? null;
  }
  _lineItemLabel(role, index, variantId) {
    const item = this._roleItems(role)[index];
    const product = this._productIndex.get(String(item?.id));
    const title = product?.title || formatHandle(item?.handle);
    const variantLabel = this._variantLabel(this._lineVariant(role, index, variantId));
    return variantLabel ? `${title} – ${variantLabel}` : title;
  }
  _removeLine(role, index, variantId) {
    const key = this._selectionKey(role, index);
    const lines = this._pickLines(role, index);
    const removedLine = lines.find((line) => line.variantId === variantId);
    if (!removedLine) return null;
    const remainingLines = lines.filter((line) => line.variantId !== variantId);
    if (remainingLines.length) this._pickedLines.set(key, remainingLines);
    else this._pickedLines.delete(key);
    if (role === "trigger" && this._lockState().isLocked) {
      for (const pickedKey of [...this._pickedLines.keys()]) {
        if (pickedKey.startsWith("reward:")) this._pickedLines.delete(pickedKey);
      }
    }
    return removedLine;
  }
  _addItems(role, index) {
    const item = this._roleItems(role)[index];
    const key = this._selectionKey(role, index);
    const resolved = item ? this._resolveItem(item, this._variantSelection.get(key)) : null;
    const remaining = this._remainingUnits(role, index);
    if (!resolved?.variant || resolved.variant.available === false || remaining < 1) return null;
    const quantity = Math.min(this._draftUnits(role, index), remaining);
    const variantId = String(resolved.variant.id);
    const lines = this._pickLines(role, index).map((line) => ({ ...line }));
    const existingLine = lines.find((line) => line.variantId === variantId);
    if (existingLine) existingLine.quantity += quantity;
    else lines.push({ variantId, quantity });
    this._pickedLines.set(key, lines);
    this._draftQuantity.delete(key);
    return { variantId, quantity };
  }
  _resolveItem(item, storedSelection) {
    const product = this._productIndex.get(String(item.id));
    const quantity = Math.max(1, Number(item.quantity) || 1);
    if (!product) return { status: "missing", title: formatHandle(item.handle), quantity };
    const allowedIds = (item.variantIds ?? []).map(String);
    const variants = allowedIds.length ? product.variants.filter((variant2) => allowedIds.includes(String(variant2.id))) : product.variants;
    const selection = resolveSelection(variants, storedSelection);
    const variant = findVariant(variants, selection) ?? variants[0] ?? null;
    return {
      status: "ready",
      variants,
      variant,
      selection,
      optionNames: product.optionNames ?? [],
      title: product.title || formatHandle(product.handle || item.handle),
      image: this._safeImg(variant?.imageUrl || product.imageUrl),
      quantity,
      price: variant?.price ?? product.price ?? 0,
      compareAtPrice: variant?.compareAtPrice ?? null
    };
  }
  _renderTriggerPrice({ price, compareAtPrice }) {
    const wasPrice = compareAtPrice > price ? `<s class="cro-bxgy__price-was">${escapeHtml(formatMoney(this, compareAtPrice))}</s>` : "";
    return `
            <span class="cro-bxgy__price">
                ${wasPrice}
                <span class="cro-bxgy__price-now">${escapeHtml(formatMoney(this, price))}</span>
            </span>
        `;
  }
  _renderPopover({ variants, selection, optionNames, title }, role, index) {
    const soldOutText = this._text("soldOutText");
    const draftVariant = findVariant(variants, selection);
    const canApply = Boolean(draftVariant) && draftVariant.available !== false;
    const fieldsets = Array.from({ length: countOptions(variants) }, (_, optionIndex) => {
      const optionName = optionNames[optionIndex] || `Option ${optionIndex + 1}`;
      const choices = listChoices(variants, selection, optionIndex).map(({ value, available }) => `
                <label class="cro-bxgy__radio${available ? "" : " cro-bxgy__radio--sold-out"}">
                    <input type="radio" class="cro-bxgy__radio-input" name="${role}-${index}-${optionIndex}" value="${escapeHtml(value)}" data-role="${role}" data-index="${index}" data-option="${optionIndex}"${value === selection[optionIndex] ? " checked" : ""}${available ? "" : " disabled"}>
                    <span class="cro-bxgy__radio-label">${escapeHtml(value)}${available || !soldOutText ? "" : `<span class="cro-bxgy__sr"> - ${escapeHtml(soldOutText)}</span>`}</span>
                </label>
            `).join("");
      return `
                <fieldset class="cro-bxgy__fieldset">
                    <legend class="cro-bxgy__legend">${escapeHtml(optionName)}</legend>
                    <div class="cro-bxgy__radios">${choices}</div>
                </fieldset>
            `;
    }).join("");
    return `
            <div class="cro-bxgy__backdrop" data-action="close-editor" data-role="${role}" data-index="${index}"></div>
            <div class="cro-bxgy__popover" role="dialog" aria-label="${escapeHtml(title)}">
                <div class="cro-bxgy__popover-head">
                    <h4 class="cro-bxgy__popover-title">${escapeHtml(title)}</h4>
                    <button type="button" class="cro-bxgy__popover-close" data-action="close-editor" data-role="${role}" data-index="${index}" aria-label="${escapeHtml(this._text("closeText"))}">×</button>
                </div>
                <div class="cro-bxgy__popover-body">${fieldsets}</div>
                <button type="button" class="cro-bxgy__popover-apply" data-action="apply-editor" data-role="${role}" data-index="${index}"${canApply ? "" : " disabled"}>${escapeHtml(this._text("variantApplyText"))}</button>
            </div>
        `;
  }
  _renderVariantPicker(resolved, role, index) {
    const { variants, variant, selection, title } = resolved;
    if (variants.length < 2 || isDefaultTitleOnly(variants)) return "";
    const caret = `<svg class="cro-bxgy__select-caret" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 1 5 5 9 1"/></svg>`;
    const selectedLabel = this._variantLabel(variant);
    if (countOptions(variants) < POPOVER_OPTION_COUNT) {
      const soldOutText = this._text("soldOutText");
      const choices = listChoices(variants, selection, 0).map(({ value, available }) => {
        const label = available || !soldOutText ? value : `${value} - ${soldOutText}`;
        return `<option value="${escapeHtml(value)}"${value === selection[0] ? " selected" : ""}${available ? "" : " disabled"}>${escapeHtml(label)}</option>`;
      }).join("");
      return `
                <span class="cro-bxgy__select">
                    <select class="cro-bxgy__select-input" aria-label="${escapeHtml(`${resolved.optionNames[0] || "Variant"}, ${title}`)}" data-role="${role}" data-index="${index}" data-option="0">${choices}</select>
                    ${caret}
                </span>
            `;
    }
    const isOpen = this._editor?.role === role && String(this._editor?.index) === String(index);
    return `
            <span class="cro-bxgy__select">
                <select class="cro-bxgy__select-input" aria-label="${escapeHtml(`Options, ${title}`)}" title="${escapeHtml(selectedLabel)}" aria-haspopup="dialog" aria-expanded="${isOpen}" data-action="open-editor" data-role="${role}" data-index="${index}" data-popover-trigger>
                    <option selected>${escapeHtml(selectedLabel)}</option>
                </select>
                ${caret}
                ${isOpen ? this._renderPopover({ ...resolved, selection: resolveSelection(variants, this._editor.draft) }, role, index) : ""}
            </span>
        `;
  }
  _renderStepper(role, index) {
    const draft = this._draftUnits(role, index);
    const remaining = this._remainingUnits(role, index);
    const minusIcon = `<svg class="cro-bxgy__step-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" aria-hidden="true"><line x1="0" y1="4" x2="8" y2="4"/></svg>`;
    const plusIcon = `<svg class="cro-bxgy__step-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" aria-hidden="true"><line x1="0" y1="4" x2="8" y2="4"/><line x1="4" y1="0" x2="4" y2="8"/></svg>`;
    return `
            <span class="cro-bxgy__stepper">
                <button type="button" class="cro-bxgy__step" aria-label="Decrease quantity" data-action="step" data-role="${role}" data-index="${index}" data-delta="-1"${draft <= 1 ? " disabled" : ""}>${minusIcon}</button>
                <span class="cro-bxgy__step-value">${draft}</span>
                <button type="button" class="cro-bxgy__step" aria-label="Increase quantity" data-action="step" data-role="${role}" data-index="${index}" data-delta="1"${draft >= remaining ? " disabled" : ""}>${plusIcon}</button>
            </span>
        `;
  }
  _renderAddItemsButton(role, index, resolved) {
    const label = this._text("itemAddText");
    if (!label) return "";
    const isDisabled = this._remainingUnits(role, index) < 1 || resolved.variant?.available === false;
    return `
            <button type="button" class="cro-bxgy__add" data-action="add-items" data-role="${role}" data-index="${index}"${isDisabled ? " disabled" : ""}>
                <span class="cro-bxgy__add-label">${escapeHtml(label)}</span>
                <svg class="cro-bxgy__step-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" aria-hidden="true"><line x1="0" y1="4" x2="8" y2="4"/><line x1="4" y1="0" x2="4" y2="8"/></svg>
            </button>
        `;
  }
  _renderUnavailableCard({ title, quantity }, role, mode) {
    const isReward = role === "reward";
    const label = this._text("itemUnavailableText");
    const showQuantityBadge = this.settings.showItemQuantityBadge !== false;
    return `
            <article class="${isReward ? `cro-bxgy__reward-card cro-bxgy__reward-card--${mode}` : "cro-bxgy__card"} cro-bxgy__card--unavailable">
                <div class="${isReward ? "cro-bxgy__reward-media" : "cro-bxgy__media"}">
                    <span class="cro-bxgy__img cro-bxgy__img--placeholder" role="img" aria-label="${escapeHtml(title)}"></span>
                    ${showQuantityBadge ? `<span class="cro-bxgy__qty">x${quantity}</span>` : ""}
                </div>
                <div class="${isReward ? "cro-bxgy__reward-body" : "cro-bxgy__card-body"}">
                    <span class="cro-bxgy__name" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                    ${label ? `<span class="cro-bxgy__unavailable">${escapeHtml(label)}</span>` : ""}
                </div>
            </article>
        `;
  }
  _renderPickedLines(role, index) {
    const lines = this._pickLines(role, index);
    if (!lines.length) return "";
    const removeIcon = `<svg class="cro-bxgy__picked-remove-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" aria-hidden="true"><line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/></svg>`;
    const rows = lines.map((line) => {
      const variantLabel = this._variantLabel(this._lineVariant(role, index, line.variantId));
      const label = variantLabel ? `${variantLabel} × ${line.quantity}` : this._text("pickedLineDefaultText", { quantity: line.quantity });
      const removeLabel = this._text("removeLineLabelText", { item: this._lineItemLabel(role, index, line.variantId) });
      return `
                <li class="cro-bxgy__picked-line">
                    <span class="cro-bxgy__picked-label">${escapeHtml(label)}</span>
                    <button type="button" class="cro-bxgy__picked-remove" aria-label="${escapeHtml(removeLabel)}" data-action="remove-line" data-role="${role}" data-index="${index}" data-variant-id="${escapeHtml(line.variantId)}">${removeIcon}</button>
                </li>
            `;
    }).join("");
    return `<ul class="cro-bxgy__picked">${rows}</ul>`;
  }
  _renderTriggerCard(item, mode, index) {
    const resolved = this._resolveItem(item, this._variantSelection.get(this._selectionKey("trigger", index)));
    const isFixed = mode === "fixed";
    if (resolved.status === "missing") return isFixed ? this._renderUnavailableCard(resolved, "trigger", mode) : "";
    const { title, image, quantity } = resolved;
    const showQuantityBadge = this.settings.showItemQuantityBadge !== false;
    const showPrice = this.settings.showItemPrice !== false;
    const showVariant = this.settings.showItemVariant !== false;
    const variantPicker = showVariant ? this._renderVariantPicker(resolved, "trigger", index) : "";
    const media = image ? `<img class="cro-bxgy__img" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">` : `<span class="cro-bxgy__img cro-bxgy__img--placeholder" role="img" aria-label="${escapeHtml(title)}"></span>`;
    const controls = isFixed ? variantPicker : `
                ${variantPicker ? `<div class="cro-bxgy__variant-row">${variantPicker}</div>` : ""}
                <div class="cro-bxgy__action-row">
                    ${this._renderStepper("trigger", index)}
                    ${this._renderAddItemsButton("trigger", index, resolved)}
                </div>
                ${this._renderPickedLines("trigger", index)}
            `;
    return `
            <article class="cro-bxgy__card">
                <div class="cro-bxgy__media">
                    ${media}
                    ${showQuantityBadge ? `<span class="cro-bxgy__qty">${isFixed ? `x${quantity}` : `${this._pickedUnits("trigger", index)}/${quantity}`}</span>` : ""}
                </div>
                <div class="cro-bxgy__card-body">
                    <span class="cro-bxgy__name" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                    ${showPrice ? this._renderTriggerPrice(resolved) : ""}
                    ${controls}
                </div>
            </article>
        `;
  }
  _renderTriggerCards(mode) {
    const items = this.campaign.trigger.items ?? [];
    return `
            <div class="cro-bxgy__trigger cro-bxgy__trigger--${mode}">
                ${items.map((item, index) => this._renderTriggerCard(item, mode, index)).join("")}
            </div>
        `;
  }
  _renderFixedTrigger() {
    return this._renderTriggerCards("fixed");
  }
  _renderMixMatchTrigger() {
    return this._renderTriggerCards("mixMatch");
  }
  _lockState() {
    const trigger = this.campaign.trigger;
    if (trigger?.type === "spend") {
      const current = this._sumPicked("trigger").amount;
      const target = Math.max(1, this._toCents(trigger.minAmount));
      const remainingAmount = Math.max(0, target - current);
      return { isLocked: remainingAmount > 0, current, target, remainingCount: 0, remainingAmount };
    }
    if (trigger?.type === "mixMatch") {
      const current = this._pickedUnitsOfRole("trigger");
      const target = Math.max(1, Number(trigger.minQuantity) || 1);
      const remainingCount = Math.max(0, target - current);
      return { isLocked: remainingCount > 0, current, target, remainingCount, remainingAmount: 0 };
    }
    return { isLocked: false, current: 0, target: 0, remainingCount: 0, remainingAmount: 0 };
  }
  _progressState() {
    const { current, target } = this._lockState();
    const percent = Math.min(100, Math.round(current / target * 100));
    if (this.campaign.trigger.type === "spend") {
      return {
        settingName: "progressSpendCountText",
        percent,
        replacements: { currentAmount: formatMoney(this, current), targetAmount: formatMoney(this, target), percent }
      };
    }
    return {
      settingName: "progressCountText",
      percent,
      replacements: { currentCount: current, maxTriggerCount: target, percent }
    };
  }
  _renderProgressBar() {
    const triggerType = this.campaign.trigger?.type;
    if (triggerType !== "mixMatch" && triggerType !== "spend") return "";
    if (this.settings.showProgressBar === false) return "";
    const { settingName, percent, replacements } = this._progressState();
    const labelText = this._text("progressLabelText");
    const labelCount = this._text(settingName, replacements);
    const showTrack = this.settings.showProgressTrack !== false;
    if (!labelText && !labelCount && !showTrack) return "";
    return `
            <div class="cro-bxgy__progress">
                ${labelText || labelCount ? `
                    <div class="cro-bxgy__progress-labels">
                        <span class="cro-bxgy__progress-label">${escapeHtml(labelText)}</span>
                        <span class="cro-bxgy__progress-count">${escapeHtml(labelCount)}</span>
                    </div>
                ` : ""}
                ${showTrack ? `
                    <div class="cro-bxgy__progress-track">
                        <div class="cro-bxgy__progress-fill" style="width:${percent}%"></div>
                    </div>
                ` : ""}
            </div>
        `;
  }
  _renderTriggerBlock() {
    const triggerType = this.campaign.trigger?.type;
    if (triggerType === "fixed") return this._renderFixedTrigger();
    if (triggerType === "mixMatch" || triggerType === "spend") return this._renderMixMatchTrigger();
    return "";
  }
  _text(name, replacements = {}) {
    return resolveTextTemplate(this.settings[name], replacements, DEFAULT_TEXT[name]).trim();
  }
  get _discountRate() {
    const offer = this.campaign.reward?.discountOffer;
    if (offer?.type !== "percentage") return 0;
    return Math.min(100, Math.max(0, Number(offer.value) || 0)) / 100;
  }
  _renderRewardPrice({ price }) {
    const discountedPrice = Math.round(price * (1 - this._discountRate));
    const isDiscounted = discountedPrice < price;
    const nowLabel = discountedPrice <= 0 ? this._text("rewardFreeText") : formatMoney(this, discountedPrice);
    return `
            <span class="cro-bxgy__price">
                ${isDiscounted ? `<s class="cro-bxgy__price-was">${escapeHtml(formatMoney(this, price))}</s>` : ""}
                <span class="cro-bxgy__price-now">${escapeHtml(nowLabel)}</span>
            </span>
        `;
  }
  _renderRewardCard(item, mode, index) {
    const resolved = this._resolveItem(item, this._variantSelection.get(this._selectionKey("reward", index)));
    const isFixed = mode === "fixed";
    if (resolved.status === "missing") return isFixed ? this._renderUnavailableCard(resolved, "reward", mode) : "";
    const { title, image, quantity } = resolved;
    const giftTag = this._text("giftTagText");
    const showPrice = this.settings.showItemPrice !== false;
    const showQuantityBadge = this.settings.showItemQuantityBadge !== false;
    const showVariant = this.settings.showItemVariant !== false;
    const variantPicker = showVariant ? this._renderVariantPicker(resolved, "reward", index) : "";
    const hasQuantityControls = variantPicker !== "" || quantity > 1;
    const media = image ? `<img class="cro-bxgy__img" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">` : `<span class="cro-bxgy__img cro-bxgy__img--placeholder" role="img" aria-label="${escapeHtml(title)}"></span>`;
    const controls = isFixed ? variantPicker ? `<div class="cro-bxgy__reward-controls">${variantPicker}</div>` : "" : `
            <div class="cro-bxgy__reward-controls">
                ${variantPicker ? `<div class="cro-bxgy__variant-row">${variantPicker}</div>` : ""}
                <div class="cro-bxgy__action-row">
                    ${hasQuantityControls ? this._renderStepper("reward", index) : ""}
                    ${this._renderAddItemsButton("reward", index, resolved)}
                </div>
                ${this._renderPickedLines("reward", index)}
            </div>
        `;
    return `
            <article class="cro-bxgy__reward-card cro-bxgy__reward-card--${mode}">
                <div class="cro-bxgy__reward-media">
                    ${media}
                    ${showQuantityBadge ? `<span class="cro-bxgy__qty">${isFixed ? `x${quantity}` : `${this._pickedUnits("reward", index)}/${quantity}`}</span>` : ""}
                </div>
                <div class="cro-bxgy__reward-body">
                    ${giftTag ? `<span class="cro-bxgy__gift-tag">${escapeHtml(giftTag)}</span>` : ""}
                    <div class="cro-bxgy__reward-info">
                        <span class="cro-bxgy__name" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                        ${showPrice ? this._renderRewardPrice(resolved) : ""}
                    </div>
                    ${controls}
                </div>
            </article>
        `;
  }
  _renderRewardSection(mode) {
    const items = this.campaign.reward.items ?? [];
    const label = this._text("rewardLabel");
    const { isLocked } = this._lockState();
    const lockBadge = isLocked ? `
            <span class="cro-bxgy__lock-badge">
                <svg class="cro-bxgy__lock-icon" viewBox="0 0 8 10" fill="currentColor" aria-hidden="true"><path d="M6.5 4V3a2.5 2.5 0 0 0-5 0v1H1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-.5ZM2.5 3a1.5 1.5 0 0 1 3 0v1h-3V3Z"/></svg>
                <span>${escapeHtml(this._text("rewardLockedText"))}</span>
            </span>
        ` : "";
    return `
            <div class="cro-bxgy__reward cro-bxgy__reward--${mode}${isLocked ? " cro-bxgy__reward--locked" : ""}">
                ${label || lockBadge ? `
                    <div class="cro-bxgy__reward-head">
                        <div class="cro-bxgy__reward-title">
                            ${label ? `<span class="cro-bxgy__reward-label">${escapeHtml(label)}</span>` : ""}
                            ${lockBadge}
                        </div>
                    </div>
                ` : ""}
                <div class="cro-bxgy__reward-list">
                    ${items.map((item, index) => this._renderRewardCard(item, mode, index)).join("")}
                </div>
            </div>
        `;
  }
  _renderFixedReward() {
    return this._renderRewardSection("fixed");
  }
  _renderMixMatchReward() {
    return this._renderRewardSection("mixMatch");
  }
  _renderRewardBlock() {
    const rewardType = this.campaign.reward?.type;
    if (rewardType === "fixed") return this._renderFixedReward();
    if (rewardType === "mixMatch") return this._renderMixMatchReward();
    return "";
  }
  _toCents(amount) {
    return Math.round((Number(amount) || 0) * 100);
  }
  _sumItems(items, role) {
    return items.reduce((sum, item, index) => {
      const resolved = this._resolveItem(item, this._variantSelection.get(this._selectionKey(role, index)));
      if (resolved.status === "missing") return { ...sum, soldOut: true };
      return {
        count: sum.count + resolved.quantity,
        amount: sum.amount + resolved.price * resolved.quantity,
        soldOut: sum.soldOut || !resolved.variants.some((variant) => variant.available !== false)
      };
    }, { count: 0, amount: 0, soldOut: false });
  }
  _sumPicked(role) {
    return this._roleItems(role).reduce((sum, item, index) => {
      const product = this._productIndex.get(String(item.id));
      return this._pickLines(role, index).reduce((lineSum, line) => {
        const variant = product?.variants.find((candidate) => String(candidate.id) === line.variantId);
        return {
          count: lineSum.count + line.quantity,
          amount: lineSum.amount + (variant?.price ?? product?.price ?? 0) * line.quantity,
          soldOut: false
        };
      }, sum);
    }, { count: 0, amount: 0, soldOut: false });
  }
  _sumRole(role) {
    const type = this.campaign[role]?.type;
    return type === "fixed" ? this._sumItems(this._roleItems(role), role) : this._sumPicked(role);
  }
  _rewardDiscount(rewardAmount) {
    const offer = this.campaign.reward?.discountOffer;
    if (!offer) return 0;
    if (offer.type === "fixedPrice") return Math.min(rewardAmount, this._toCents(offer.value));
    return Math.round(rewardAmount * this._discountRate);
  }
  _bundleTotals() {
    const trigger = this._sumRole("trigger");
    const reward = this._sumRole("reward");
    const subtotal = trigger.amount + reward.amount;
    const discount = this._rewardDiscount(reward.amount);
    return {
      itemCount: trigger.count + reward.count,
      subtotal,
      discount,
      total: subtotal - discount,
      percent: subtotal > 0 ? Math.round(discount / subtotal * 100) : 0,
      soldOut: trigger.soldOut || reward.soldOut,
      needsRewardPick: this.campaign.reward?.type === "mixMatch" && reward.count === 0
    };
  }
  _renderSavings({ discount, percent }) {
    if (discount <= 0) return "";
    const template = resolveLocaleValue(this.settings.footerSavingsText, DEFAULT_TEXT.footerSavingsText);
    const replacements = { amount: formatMoney(this, discount), percent };
    const fill = (text) => resolveTextTemplate(text, replacements, "");
    const highlightStart = template.indexOf("{{");
    const leading = highlightStart === -1 ? template : template.slice(0, highlightStart);
    const highlighted = highlightStart === -1 ? "" : template.slice(highlightStart);
    return `
            <p class="cro-bxgy__savings">
                ${escapeHtml(fill(leading))}${highlighted ? `<strong class="cro-bxgy__savings-value">${escapeHtml(fill(highlighted))}</strong>` : ""}
            </p>
        `;
  }
  _renderFooter() {
    const totals = this._bundleTotals();
    const totalLabel = this._text("footerSummaryText", { count: totals.itemCount });
    const { isLocked, remainingCount, remainingAmount } = this._lockState();
    const getCtaLabel = () => {
      if (totals.soldOut) return this._text("ctaUnavailableText");
      if (remainingAmount > 0) return this._text("ctaSpendText", { amount: formatMoney(this, remainingAmount) });
      if (remainingCount > 0) return this._text("ctaLockedText", { remaining: remainingCount });
      if (totals.needsRewardPick) return this._text("ctaPickRewardText");
      return this._text("ctaText", { total: formatMoney(this, totals.total) });
    };
    return `
            <div class="cro-bxgy__footer">
                <div class="cro-bxgy__total">
                    <span class="cro-bxgy__total-label">${escapeHtml(totalLabel)}</span>
                    <span class="cro-bxgy__total-price">
                        ${totals.discount > 0 ? `<s class="cro-bxgy__total-was">${escapeHtml(formatMoney(this, totals.subtotal))}</s>` : ""}
                        <strong class="cro-bxgy__total-now">${escapeHtml(formatMoney(this, totals.total))}</strong>
                    </span>
                </div>
                ${this._renderSavings(totals)}
                <button type="button" class="cro-bxgy__cta"${totals.soldOut || isLocked || totals.needsRewardPick ? " disabled" : ""}>${escapeHtml(getCtaLabel())}</button>
            </div>
        `;
  }
  _renderStyles() {
    const tokens = this.styleSettings.tokens ?? {};
    const declarations = STYLE_TOKENS.map(([token, cssVar, fallback]) => {
      const value = tokens[token];
      const isValid = value !== void 0 && value !== null && String(value).trim() !== "";
      return `${cssVar}: ${isValid ? value : fallback};`;
    }).join("\n    ");
    const customCss = String(this.styleSettings.custom_css || "").replace(/<\/style/gi, "");
    return `<style>${bxgyStyles}
.cro-bxgy {
    ${declarations}
}</style>${customCss ? `<style>${customCss}</style>` : ""}`;
  }
  _renderSkeletonCards(role) {
    const cardCount = Math.min(SKELETON_CARDS_PER_GROUP, this._roleItems(role).length);
    const isReward = role === "reward";
    const card = `
            <div class="${isReward ? "cro-bxgy__reward-card" : "cro-bxgy__card"} cro-bxgy__card--skeleton">
                <span class="${isReward ? "cro-bxgy__reward-media" : "cro-bxgy__media"} cro-bxgy__sk"></span>
                <div class="${isReward ? "cro-bxgy__reward-body" : "cro-bxgy__card-body"}">
                    <span class="cro-bxgy__sk cro-bxgy__sk--title"></span>
                    <span class="cro-bxgy__sk cro-bxgy__sk--price"></span>
                </div>
            </div>
        `;
    return card.repeat(cardCount);
  }
  _renderSkeleton() {
    return `
            <section class="cro-bxgy" aria-busy="true">
                ${this._renderHeader()}
                <div class="cro-bxgy__body">
                    <div class="cro-bxgy__trigger">${this._renderSkeletonCards("trigger")}</div>
                    <div class="cro-bxgy__reward-list">${this._renderSkeletonCards("reward")}</div>
                </div>
            </section>
        `;
  }
  render() {
    const styles = this._renderStyles();
    const emptyState = this.isBuilderMode ? `${styles}<section class="cro-bxgy"><p class="cro-bxgy__empty">No offer data available.</p></section>` : "";
    if (!this.campaign) {
      this._content.innerHTML = emptyState;
      return;
    }
    if (this._loadState === "loading") {
      this._loadProducts();
      this._content.innerHTML = `${styles}${this._renderSkeleton()}`;
      return;
    }
    if (!this._productIndex.size) {
      this._content.innerHTML = emptyState;
      return;
    }
    this._content.innerHTML = `
            ${styles}
            <section class="cro-bxgy">
                ${this._renderHeader()}
                ${this._renderProgressBar()}
                <div class="cro-bxgy__body">
                    ${this._renderTriggerBlock()}
                    ${this._renderRewardBlock()}
                </div>
                ${this._renderFooter()}
            </section>
        `;
    this._positionEditor();
  }
}
if (isBrowser && !customElements.get("cro-bxgy-bundle-widget")) {
  customElements.define("cro-bxgy-bundle-widget", CroBxgyWidget);
}
export {
  CroBxgyWidget as default
};
