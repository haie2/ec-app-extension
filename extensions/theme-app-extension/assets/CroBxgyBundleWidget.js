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
const bxgyStyles = '*,\n*::before,\n*::after {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n}\n\n:host {\n    display: block;\n}\n\n.cro-bxgy {\n    --cro-fg: #000000;\n    --cro-bg: #ffffff;\n    --cro-border-subtle: #00000033;\n\n    --cro-font: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n    --cro-fw-medium: 500;\n    --cro-fw-semibold: 600;\n    --cro-lh-heading: 1.2;\n\n    --cro-header-title-fs: 20px;\n    --cro-header-subtitle-fs: 14px;\n    --cro-header-gap: 6px;\n    --cro-header-divider-w: 157px;\n    --cro-header-divider-h: 2px;\n    --cro-header-divider-mt: 13px;\n    --cro-header-mb: 25px;\n\n    --cro-trigger-gap: 13px;\n    --cro-trigger-card-min-w: 280px;\n    --cro-trigger-card-max-w: 324px;\n    --cro-card-radius: 8px;\n    --cro-card-border-w: 1px;\n    --cro-card-pad: 5px;\n    --cro-card-gap: 12px;\n    --cro-card-body-pt: 9px;\n    --cro-card-body-gap: 7px;\n    --cro-card-title-fs: 14px;\n    --cro-card-title-lines: 2;\n    --cro-card-price-fs: 14px;\n    --cro-price-gap: 7px;\n    --cro-price-row-gap: 2px;\n    --cro-price-was-opacity: 0.6;\n    --cro-img-w: 105px;\n    --cro-img-h: 124px;\n    --cro-image-radius: 4px;\n    --cro-qty-size: 20px;\n    --cro-qty-fs: 10px;\n    --cro-qty-top: 4.5px;\n    --cro-qty-right: 6.5px;\n    --cro-qty-radius: 2px;\n    --cro-qty-bg: var(--cro-fg);\n    --cro-qty-fg: var(--cro-bg);\n    --cro-control-w: 99px;\n    --cro-control-h: 28px;\n    --cro-control-fs: 12px;\n    --cro-control-radius: 4px;\n    --cro-control-pad-left: 10px;\n    --cro-control-pad-right: 28px;\n    --cro-caret-w: 10px;\n    --cro-caret-right: 12px;\n    --cro-fw-regular: 400;\n    --cro-fw-bold: 600;\n\n    --cro-body-gap: 22px;\n    --cro-reward-gap: 25px;\n    --cro-reward-head-gap: 14px;\n    --cro-reward-count-color: color-mix(in srgb, var(--cro-fg) 60%, transparent);\n    --cro-reward-count-fs: 13px;\n    --cro-reward-label-fs: 14px;\n    --cro-reward-label-case: uppercase;\n    --cro-reward-bg: color-mix(in srgb, var(--cro-fg) 4%, transparent);\n    --cro-reward-border: var(--cro-fg);\n    --cro-reward-border-w: 2px;\n    --cro-reward-radius: 12px;\n    --cro-reward-pad: 12px;\n    --cro-reward-list-gap: 13px;\n    --cro-reward-card-min-w: 240px;\n    --cro-reward-card-max-w: 312px;\n    --cro-reward-card-border: color-mix(in srgb, var(--cro-fg) 10%, transparent);\n    --cro-reward-card-pad-y: 9px;\n    --cro-reward-card-pad-x: 10px;\n    --cro-reward-card-gap: 13px;\n    --cro-reward-body-gap: 9px;\n    --cro-reward-info-gap: 2px;\n    --cro-reward-img-w: 52px;\n    --cro-reward-img-h: 61px;\n    --cro-reward-img-radius: 2px;\n    --cro-gift-bg: #d9fa74;\n    --cro-gift-fg: #000000;\n    --cro-gift-h: 20px;\n    --cro-gift-pad-x: 10px;\n    --cro-gift-fs: 10px;\n    --cro-gift-radius: 4px;\n\n    --cro-footer-mt: 11px;\n    --cro-footer-gap: 7px;\n    --cro-total-gap: 9px;\n    --cro-total-label-fs: 14px;\n    --cro-total-price-fs: 20px;\n    --cro-savings-fs: 12px;\n    --cro-savings-color: #b30000;\n    --cro-cta-mt: 13px;\n    --cro-cta-bg: var(--cro-fg);\n    --cro-cta-fg: var(--cro-bg);\n    --cro-cta-border: color-mix(in srgb, var(--cro-fg) 8%, transparent);\n    --cro-cta-h: 52px;\n    --cro-cta-fs: 18px;\n    --cro-cta-pad: 10px;\n    --cro-cta-radius: 8px;\n    --cro-notice-mt: 8px;\n    --cro-notice-color: #b42318;\n    --cro-notice-fs: 13px;\n\n    --cro-progress-max-w: 461px;\n    --cro-progress-gap: 5px;\n    --cro-progress-mb: 30px;\n    --cro-progress-fs: 12px;\n    --cro-progress-color: #1c9622;\n    --cro-track-h: 7px;\n    --cro-track-bg: color-mix(in srgb, var(--cro-fg) 8%, transparent);\n    --cro-stepper-w: 68px;\n    --cro-step-icon: 8px;\n    --cro-step-disabled-opacity: 0.3;\n    --cro-controls-gap: 6px;\n\n    --cro-reward-list-row-gap: 12px;\n    --cro-reward-qty-top: 3px;\n    --cro-reward-qty-right: 3px;\n    --cro-reward-pick-img-w: 95px;\n    --cro-reward-pick-img-h: 113px;\n    --cro-reward-pick-img-radius: 4px;\n    --cro-reward-pick-gap: 15px;\n    --cro-reward-pick-pad: 5px;\n    --cro-reward-pick-body-pt: 8px;\n    --cro-reward-pick-body-pb: 4px;\n    --cro-reward-pick-qty-top: 5px;\n    --cro-reward-pick-qty-right: 5px;\n    --cro-reward-controls-mt: 3px;\n    --cro-reward-controls-gap: 7px;\n    --cro-reward-title-gap: 9px;\n    --cro-reward-locked-opacity: 0.4;\n    --cro-lock-badge-h: 22px;\n    --cro-lock-badge-pad-x: 7px;\n    --cro-lock-badge-gap: 5px;\n    --cro-lock-badge-bg: color-mix(in srgb, var(--cro-fg) 8%, transparent);\n    --cro-lock-badge-fs: 10px;\n    --cro-lock-icon-w: 8px;\n    --cro-lock-icon-h: 10px;\n    --cro-cta-disabled-bg: color-mix(in srgb, var(--cro-fg) 20%, transparent);\n\n    --cro-radius: 10px;\n    --cro-container-border-w: 2px;\n    --cro-container-max-w: 705px;\n    --cro-container-margin: 0px;\n    --cro-container-pad-x: 22px;\n    --cro-container-pad-y: 27px;\n\n    position: relative;\n    width: 100%;\n    max-width: var(--cro-container-max-w);\n    padding: var(--cro-container-pad-y) var(--cro-container-pad-x);\n    background-color: var(--cro-bg);\n    border: var(--cro-container-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-radius);\n    color: var(--cro-fg);\n    font-family: var(--cro-font);\n}\n\n.cro-bxgy__header {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: var(--cro-header-gap);\n    margin-bottom: var(--cro-header-mb);\n    text-align: center;\n}\n\n.cro-bxgy__title {\n    font-size: var(--cro-header-title-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__subtitle {\n    font-size: var(--cro-header-subtitle-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__header-divider {\n    width: var(--cro-header-divider-w);\n    max-width: 100%;\n    height: var(--cro-header-divider-h);\n    margin-top: var(--cro-header-divider-mt);\n    border: 0;\n    background-color: var(--cro-border-subtle);\n}\n\n.cro-bxgy__trigger {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--cro-trigger-card-min-w)), 1fr));\n    gap: var(--cro-trigger-gap);\n}\n\n.cro-bxgy__card {\n    display: flex;\n    justify-self: start;\n    width: 100%;\n    max-width: var(--cro-trigger-card-max-w);\n    gap: var(--cro-card-gap);\n    min-width: 0;\n    padding: calc(var(--cro-card-pad) - var(--cro-card-border-w));\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-bxgy__media {\n    position: relative;\n    flex: none;\n    width: var(--cro-img-w);\n    height: var(--cro-img-h);\n}\n\n.cro-bxgy__img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    border-radius: var(--cro-image-radius);\n}\n\n.cro-bxgy__img--placeholder {\n    background-color: var(--cro-border-subtle);\n}\n\n.cro-bxgy__qty {\n    position: absolute;\n    top: var(--cro-qty-top);\n    right: var(--cro-qty-right);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-width: var(--cro-qty-size);\n    height: var(--cro-qty-size);\n    padding: 0 3px;\n    background-color: var(--cro-qty-bg);\n    border-radius: var(--cro-qty-radius);\n    color: var(--cro-qty-fg);\n    font-size: var(--cro-qty-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: 1;\n}\n\n.cro-bxgy__card-body {\n    display: flex;\n    flex: 1;\n    flex-direction: column;\n    align-items: flex-start;\n    gap: var(--cro-card-body-gap);\n    min-width: 0;\n    padding-top: var(--cro-card-body-pt);\n}\n\n.cro-bxgy__name {\n    display: -webkit-box;\n    max-width: 100%;\n    overflow: hidden;\n    overflow-wrap: anywhere;\n    -webkit-line-clamp: var(--cro-card-title-lines);\n    -webkit-box-orient: vertical;\n    font-size: var(--cro-card-title-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__name--link {\n    color: inherit;\n    text-decoration: none;\n}\n\n.cro-bxgy__name--link:hover {\n    text-decoration: underline;\n}\n\n.cro-bxgy__name--link:focus-visible {\n    outline: 2px solid currentColor;\n    outline-offset: 2px;\n}\n\n.cro-bxgy__price {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    gap: var(--cro-price-row-gap) var(--cro-price-gap);\n    max-width: 100%;\n    font-size: var(--cro-card-price-fs);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__price-was,\n.cro-bxgy__price-now {\n    white-space: nowrap;\n}\n\n.cro-bxgy__price-was {\n    font-weight: var(--cro-fw-regular);\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__price-now {\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-bxgy__select {\n    position: relative;\n    width: var(--cro-control-w);\n    max-width: 100%;\n    height: var(--cro-control-h);\n}\n\n.cro-bxgy__select-input {\n    width: 100%;\n    height: 100%;\n    padding: 0 var(--cro-control-pad-right) 0 var(--cro-control-pad-left);\n    overflow: hidden;\n    appearance: none;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    color: inherit;\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-regular);\n    text-overflow: ellipsis;\n}\n\n.cro-bxgy__select-caret {\n    position: absolute;\n    top: 50%;\n    right: var(--cro-caret-right);\n    width: var(--cro-caret-w);\n    transform: translateY(-50%);\n    pointer-events: none;\n}\n\n.cro-bxgy__body {\n    display: grid;\n    gap: var(--cro-body-gap);\n}\n\n.cro-bxgy__reward {\n    display: grid;\n    gap: var(--cro-reward-gap);\n}\n\n.cro-bxgy__reward-head {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);\n    align-items: center;\n    gap: var(--cro-reward-head-gap);\n}\n\n.cro-bxgy__reward-head::before,\n.cro-bxgy__reward-head::after {\n    content: "";\n    height: var(--cro-card-border-w);\n    background-color: var(--cro-border-subtle);\n}\n\n.cro-bxgy__reward-title {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    justify-content: center;\n    gap: var(--cro-price-row-gap) var(--cro-reward-title-gap);\n}\n\n.cro-bxgy__reward-count {\n    color: var(--cro-reward-count-color);\n    font-size: var(--cro-reward-count-fs);\n}\n\n.cro-bxgy__lock-badge {\n    display: inline-flex;\n    align-items: center;\n    gap: var(--cro-lock-badge-gap);\n    height: var(--cro-lock-badge-h);\n    padding: 0 var(--cro-lock-badge-pad-x);\n    background-color: var(--cro-lock-badge-bg);\n    border-radius: var(--cro-gift-radius);\n    font-size: var(--cro-lock-badge-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: 1;\n    text-transform: uppercase;\n}\n\n.cro-bxgy__lock-icon {\n    width: var(--cro-lock-icon-w);\n    height: var(--cro-lock-icon-h);\n}\n\n.cro-bxgy__reward--locked .cro-bxgy__reward-list {\n    opacity: var(--cro-reward-locked-opacity);\n}\n\n.cro-bxgy__reward-label {\n    font-size: var(--cro-reward-label-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n    text-align: center;\n    text-transform: var(--cro-reward-label-case);\n}\n\n.cro-bxgy__reward-list {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--cro-reward-card-min-w)), 1fr));\n    gap: var(--cro-reward-list-gap);\n    padding: calc(var(--cro-reward-pad) - var(--cro-reward-border-w));\n    background-color: var(--cro-reward-bg);\n    border: var(--cro-reward-border-w) solid var(--cro-reward-border);\n    border-radius: var(--cro-reward-radius);\n}\n\n.cro-bxgy__reward-card {\n    display: flex;\n    justify-self: start;\n    gap: var(--cro-reward-card-gap);\n    width: 100%;\n    max-width: var(--cro-reward-card-max-w);\n    min-width: 0;\n    padding: var(--cro-reward-card-pad-y) var(--cro-reward-card-pad-x);\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-reward-card-border);\n    border-radius: var(--cro-card-radius);\n}\n\n.cro-bxgy__reward-media {\n    --cro-image-radius: var(--cro-reward-img-radius);\n    position: relative;\n    flex: none;\n    width: var(--cro-reward-img-w);\n    height: var(--cro-reward-img-h);\n}\n\n.cro-bxgy__reward-media .cro-bxgy__qty {\n    top: var(--cro-reward-qty-top);\n    right: var(--cro-reward-qty-right);\n}\n\n.cro-bxgy__reward-body {\n    display: flex;\n    flex: 1;\n    flex-direction: column;\n    align-items: flex-start;\n    gap: var(--cro-reward-body-gap);\n    min-width: 0;\n}\n\n.cro-bxgy__gift-tag {\n    display: inline-flex;\n    align-items: center;\n    height: var(--cro-gift-h);\n    padding: 0 var(--cro-gift-pad-x);\n    background-color: var(--cro-gift-bg);\n    border-radius: var(--cro-gift-radius);\n    color: var(--cro-gift-fg);\n    font-size: var(--cro-gift-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: 1;\n}\n\n.cro-bxgy__reward-info {\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-reward-info-gap);\n    max-width: 100%;\n    min-width: 0;\n}\n\n.cro-bxgy__footer {\n    display: grid;\n    justify-items: center;\n    gap: var(--cro-footer-gap);\n    margin-top: var(--cro-footer-mt);\n}\n\n.cro-bxgy__total {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    justify-content: center;\n    gap: var(--cro-price-row-gap) var(--cro-total-gap);\n    text-align: center;\n}\n\n.cro-bxgy__total-label {\n    font-size: var(--cro-total-label-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__total-price {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    justify-content: center;\n    gap: var(--cro-price-row-gap) var(--cro-total-gap);\n    white-space: nowrap;\n}\n\n.cro-bxgy__total-was {\n    font-size: var(--cro-total-label-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__total-now {\n    font-size: var(--cro-total-price-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__savings {\n    font-size: var(--cro-savings-fs);\n    font-weight: var(--cro-fw-regular);\n    line-height: var(--cro-lh-heading);\n    text-align: center;\n}\n\n.cro-bxgy__savings-value {\n    color: var(--cro-savings-color);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__cta {\n    width: 100%;\n    min-height: var(--cro-cta-h);\n    margin-top: var(--cro-cta-mt);\n    padding: var(--cro-cta-pad);\n    background-color: var(--cro-cta-bg);\n    border: var(--cro-card-border-w) solid var(--cro-cta-border);\n    border-radius: var(--cro-cta-radius);\n    color: var(--cro-cta-fg);\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-cta-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__notice {\n    margin: var(--cro-notice-mt) 0 0;\n    color: var(--cro-notice-color);\n    font-size: var(--cro-notice-fs);\n    line-height: var(--cro-lh-heading);\n    text-align: center;\n}\n\n.cro-bxgy__progress {\n    display: grid;\n    gap: var(--cro-progress-gap);\n    width: 100%;\n    max-width: var(--cro-progress-max-w);\n    margin: 0 auto var(--cro-progress-mb);\n}\n\n.cro-bxgy__progress-labels {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    justify-content: space-between;\n    gap: var(--cro-price-row-gap) var(--cro-total-gap);\n    font-size: var(--cro-progress-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-heading);\n}\n\n.cro-bxgy__progress-count {\n    margin-left: auto;\n    color: var(--cro-progress-color);\n}\n\n.cro-bxgy__progress-track {\n    height: var(--cro-track-h);\n    overflow: hidden;\n    background-color: var(--cro-track-bg);\n    border-radius: 100px;\n}\n\n.cro-bxgy__progress-fill {\n    height: 100%;\n    background-color: var(--cro-progress-color);\n    border-radius: 100px;\n}\n\n.cro-bxgy__variant-row {\n    width: 100%;\n}\n\n.cro-bxgy__variant-row .cro-bxgy__select {\n    display: block;\n    width: 100%;\n}\n\n.cro-bxgy__action-row {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: var(--cro-controls-gap);\n    width: 100%;\n}\n\n.cro-bxgy__action-row .cro-bxgy__stepper {\n    flex: none;\n}\n\n.cro-bxgy__action-row .cro-bxgy__add {\n    flex: 1 1 auto;\n    min-width: 96px;\n    width: auto;\n}\n\n.cro-bxgy__stepper {\n    display: grid;\n    grid-template-columns: 1fr auto 1fr;\n    align-items: center;\n    width: var(--cro-stepper-w);\n    height: var(--cro-control-h);\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    font-size: var(--cro-card-price-fs);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__step {\n    display: grid;\n    place-items: center;\n    height: 100%;\n    padding: 0;\n    background: none;\n    border: 0;\n    color: inherit;\n    cursor: pointer;\n}\n\n.cro-bxgy__step:disabled {\n    cursor: not-allowed;\n    opacity: var(--cro-step-disabled-opacity);\n}\n\n.cro-bxgy__step-value {\n    text-align: center;\n}\n\n.cro-bxgy__step-icon {\n    width: var(--cro-step-icon);\n    height: var(--cro-step-icon);\n}\n\n.cro-bxgy__add {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) auto;\n    align-items: center;\n    gap: var(--cro-controls-gap);\n    width: var(--cro-control-w);\n    max-width: 100%;\n    height: var(--cro-control-h);\n    padding: 0 var(--cro-caret-right) 0 var(--cro-control-pad-left);\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    color: inherit;\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-semibold);\n    text-align: left;\n}\n\n.cro-bxgy__add-label {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-bxgy__cta:disabled {\n    background-color: var(--cro-cta-disabled-bg);\n    cursor: not-allowed;\n}\n\n.cro-bxgy__reward-list:has(.cro-bxgy__reward-card--mixMatch) {\n    row-gap: var(--cro-reward-list-row-gap);\n}\n\n.cro-bxgy__reward-card--mixMatch {\n    gap: var(--cro-reward-pick-gap);\n    padding: calc(var(--cro-reward-pick-pad) - var(--cro-card-border-w));\n}\n\n.cro-bxgy__reward-card--mixMatch .cro-bxgy__reward-media {\n    --cro-image-radius: var(--cro-reward-pick-img-radius);\n    width: var(--cro-reward-pick-img-w);\n    height: var(--cro-reward-pick-img-h);\n}\n\n.cro-bxgy__reward-card--mixMatch .cro-bxgy__qty {\n    top: var(--cro-reward-pick-qty-top);\n    right: var(--cro-reward-pick-qty-right);\n}\n\n.cro-bxgy__reward-card--mixMatch .cro-bxgy__reward-body {\n    padding: var(--cro-reward-pick-body-pt) 0 var(--cro-reward-pick-body-pb);\n}\n\n.cro-bxgy__reward-controls {\n    display: grid;\n    justify-items: start;\n    gap: var(--cro-reward-controls-gap);\n    max-width: 100%;\n    margin-top: var(--cro-reward-controls-mt);\n}\n\n.cro-bxgy__add:disabled {\n    cursor: not-allowed;\n    opacity: var(--cro-step-disabled-opacity);\n}\n\n.cro-bxgy__sk {\n    display: block;\n    background-color: var(--cro-border-subtle);\n    border-radius: var(--cro-image-radius);\n    animation: cro-bxgy-pulse 1.4s ease-in-out infinite;\n}\n\n.cro-bxgy__sk--title {\n    width: 80%;\n    height: var(--cro-card-title-fs);\n}\n\n.cro-bxgy__sk--price {\n    width: 40%;\n    height: var(--cro-card-price-fs);\n}\n\n.cro-bxgy__unavailable {\n    font-size: var(--cro-card-price-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-heading);\n    opacity: var(--cro-price-was-opacity);\n}\n\n@keyframes cro-bxgy-pulse {\n\n    0%,\n    100% {\n        opacity: 1;\n    }\n\n    50% {\n        opacity: 0.5;\n    }\n}\n\n@media (prefers-reduced-motion: reduce) {\n    .cro-bxgy__sk {\n        animation: none;\n    }\n}\n\n.cro-bxgy__picked {\n    display: flex;\n    flex-wrap: wrap;\n    justify-self: stretch;\n    gap: 4px;\n    width: 100%;\n    padding-top: 4px;\n    list-style: none;\n}\n\n.cro-bxgy__picked-line {\n    display: inline-flex;\n    align-items: center;\n    gap: 0;\n    max-width: 100%;\n    min-width: 0;\n    padding: 0 1px 0 6px;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: 999px;\n    font-size: 10px;\n    line-height: 1.2;\n}\n\n.cro-bxgy__picked-label {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-bxgy__picked-remove {\n    display: grid;\n    flex: none;\n    place-items: center;\n    width: 18px;\n    height: 18px;\n    padding: 0;\n    background: none;\n    border: 0;\n    border-radius: 999px;\n    color: inherit;\n    cursor: pointer;\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__picked-remove:hover,\n.cro-bxgy__picked-remove:focus-visible {\n    opacity: 1;\n}\n\n.cro-bxgy__picked-remove:focus-visible {\n    outline: 2px solid currentColor;\n    outline-offset: -2px;\n}\n\n.cro-bxgy__picked-remove-icon {\n    width: 6px;\n    height: 6px;\n}\n\n.cro-bxgy__backdrop {\n    position: fixed;\n    inset: 0;\n    z-index: 20;\n}\n\n.cro-bxgy__popover {\n    position: absolute;\n    top: calc(100% + 6px);\n    left: 0;\n    z-index: 21;\n    width: min(260px, 80vw);\n    max-height: 320px;\n    display: flex;\n    flex-direction: column;\n    transform: translateX(var(--cro-pop-shift, 0px));\n    padding: 10px;\n    background-color: var(--cro-bg);\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);\n}\n\n.cro-bxgy__popover-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    margin-bottom: 6px;\n}\n\n.cro-bxgy__popover-title {\n    overflow: hidden;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-bold);\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.cro-bxgy__popover-close {\n    flex: none;\n    width: 28px;\n    height: 28px;\n    background: none;\n    border: 0;\n    border-radius: var(--cro-control-radius);\n    color: inherit;\n    cursor: pointer;\n    font-size: 18px;\n    line-height: 1;\n}\n\n.cro-bxgy__popover-body {\n    min-height: 0;\n    overflow: auto;\n}\n\n.cro-bxgy__fieldset {\n    min-width: 0;\n    margin: 0 0 8px;\n    padding: 0;\n    border: 0;\n}\n\n.cro-bxgy__legend {\n    margin-bottom: 4px;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-semibold);\n    opacity: var(--cro-price-was-opacity);\n}\n\n.cro-bxgy__radios {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px;\n}\n\n.cro-bxgy__radio {\n    position: relative;\n}\n\n.cro-bxgy__radio-input {\n    position: absolute;\n    inset: 0;\n    margin: 0;\n    opacity: 0;\n    cursor: pointer;\n}\n\n.cro-bxgy__radio-label {\n    display: inline-flex;\n    align-items: center;\n    min-height: 28px;\n    padding: 0 10px;\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    font-size: var(--cro-control-fs);\n}\n\n.cro-bxgy__radio-input:checked+.cro-bxgy__radio-label {\n    border-color: var(--cro-fg);\n    box-shadow: inset 0 0 0 1px var(--cro-fg);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__radio-input:focus-visible+.cro-bxgy__radio-label {\n    outline: 2px solid currentColor;\n    outline-offset: 2px;\n}\n\n.cro-bxgy__radio--sold-out .cro-bxgy__radio-label {\n    opacity: 0.45;\n    text-decoration: line-through;\n}\n\n.cro-bxgy__radio--sold-out .cro-bxgy__radio-input {\n    cursor: not-allowed;\n}\n\n.cro-bxgy__sr {\n    position: absolute;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    clip-path: inset(50%);\n    white-space: nowrap;\n}\n\n.cro-bxgy__select-input[data-popover-trigger] {\n    cursor: pointer;\n}\n\n.cro-bxgy__popover-apply {\n    flex: none;\n    width: 100%;\n    height: var(--cro-control-h);\n    margin-top: 6px;\n    background-color: var(--cro-cta-bg);\n    border: 0;\n    border-radius: var(--cro-control-radius);\n    color: var(--cro-cta-fg);\n    cursor: pointer;\n    font: inherit;\n    font-size: var(--cro-control-fs);\n    font-weight: var(--cro-fw-semibold);\n}\n\n.cro-bxgy__popover-apply:disabled {\n    background-color: var(--cro-cta-disabled-bg);\n    cursor: not-allowed;\n}\n\n.cro-bxgy__popover-apply:focus-visible {\n    outline: 2px solid currentColor;\n    outline-offset: 2px;\n}';
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
const STOREFRONT_API_VERSION = "2026-10";
const STOREFRONT_BATCH_SIZE = 250;
const MAX_PARALLEL_REQUESTS = 4;
const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 1e4;
const PRODUCT_GID_PREFIX = "gid://shopify/Product/";
const VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";
const CONTEXT_VARIABLES = "$country: CountryCode, $language: LanguageCode";
const IN_CONTEXT = "@inContext(country: $country, language: $language)";
const VARIANT_FIELDS = "id availableForSale price { amount } compareAtPrice { amount } selectedOptions { name value } image { url }";
const HEAD_FIELDS = "id handle title featuredImage { url } availableForSale requiresSellingPlan priceRange { minVariantPrice { amount } } options { id name optionValues { name } } encodedVariantAvailability";
const HEADS_QUERY = `query BxgyHeads($subsetIds: [ID!]!, $allIds: [ID!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    subset: nodes(ids: $subsetIds) { ... on Product { ${HEAD_FIELDS} } }
    all: nodes(ids: $allIds) { ... on Product { ${HEAD_FIELDS} encodedVariantExistence selectedOrFirstAvailableVariant { ${VARIANT_FIELDS} } } }
}`;
const VARIANTS_QUERY = `query BxgyVariants($ids: [ID!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    nodes(ids: $ids) { ... on ProductVariant { ${VARIANT_FIELDS} } }
}`;
const INVENTORY_QUERY = `query BxgyInventory($ids: [ID!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    nodes(ids: $ids) { ... on ProductVariant { id quantityAvailable currentlyNotInStock } }
}`;
const VARIANT_BY_OPTIONS_QUERY = `query BxgyVariantByOptions($id: ID!, $selectedOptions: [SelectedOptionInput!]!, ${CONTEXT_VARIABLES}) ${IN_CONTEXT} {
    product(id: $id) { variantBySelectedOptions(selectedOptions: $selectedOptions) { ${VARIANT_FIELDS} } }
}`;
const toNumericId = (value) => {
  const id = String(value ?? "").split("/").pop();
  return /^[1-9]\d*$/.test(id) ? id : null;
};
const hasVariantDetail = (variant) => Number.isFinite(variant?.price);
const withVariants = (product, variants) => {
  const prices = variants.map((variant) => variant.price).filter(Number.isFinite);
  return {
    ...product,
    price: prices.length && prices.length === variants.length ? Math.min(...prices) : product.price ?? 0,
    available: variants.some((variant) => variant.available),
    variants
  };
};
const planBxgyRequests = (campaign) => {
  const items = [...campaign?.trigger?.items ?? [], ...campaign?.reward?.items ?? []];
  const variantIdsByProduct = /* @__PURE__ */ new Map();
  for (const item of items) {
    const productId = toNumericId(item?.id);
    if (!productId) continue;
    if (!item.variantIds?.length) {
      variantIdsByProduct.set(productId, null);
      continue;
    }
    const current = variantIdsByProduct.get(productId);
    if (current === null) continue;
    const variantIds = item.variantIds.map(toNumericId).filter(Boolean);
    variantIdsByProduct.set(productId, /* @__PURE__ */ new Set([...current ?? [], ...variantIds]));
  }
  const entries = [...variantIdsByProduct];
  return {
    items,
    productIds: entries.map(([productId]) => productId),
    subsetProductIds: entries.filter(([, variantIds]) => variantIds !== null).map(([productId]) => productId),
    allProductIds: entries.filter(([, variantIds]) => variantIds === null).map(([productId]) => productId),
    variantIdsByProduct
  };
};
const readStorefrontContext = () => {
  const country = String(window.Shopify?.country ?? "").toUpperCase();
  const language = String(window.Shopify?.locale ?? "").replace("-", "_").toUpperCase();
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    language: /^[A-Z]{2}(_[A-Z]{2})?$/.test(language) ? language : null
  };
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sendStorefrontRequest = async (query, variables, storefrontToken) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/${STOREFRONT_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...storefrontToken ? { "X-Shopify-Storefront-Access-Token": storefrontToken } : {}
      },
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
const requestStorefront = async (query, variables, storefrontToken) => {
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    const { data, isRetryable } = await sendStorefrontRequest(query, variables, storefrontToken);
    if (data || !isRetryable) return data;
    if (attempt < MAX_REQUEST_ATTEMPTS) await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  }
  return null;
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
const toBatches = (values) => Array.from(
  { length: Math.ceil(values.length / STOREFRONT_BATCH_SIZE) },
  (_, index) => values.slice(index * STOREFRONT_BATCH_SIZE, (index + 1) * STOREFRONT_BATCH_SIZE)
);
const toCents$1 = (money) => money?.amount == null ? null : Math.round(Number(money.amount) * 100);
const normalizeVariantDetail = (node) => ({
  id: Number(toNumericId(node.id)),
  price: toCents$1(node.price) ?? 0,
  compareAtPrice: toCents$1(node.compareAtPrice),
  available: node.availableForSale !== false,
  imageUrl: node.image?.url ?? null
});
const normalizeFullVariant = (node, optionNames) => {
  const valueByName = new Map((node.selectedOptions ?? []).map((option) => [option.name, option.value]));
  return {
    ...normalizeVariantDetail(node),
    key: `variant:${toNumericId(node.id)}`,
    values: optionNames.map((name) => valueByName.get(name) ?? null)
  };
};
const fetchVariantDetails = async (variantIds) => {
  const pages = await mapWithConcurrency(toBatches(variantIds), MAX_PARALLEL_REQUESTS, (batch) => requestStorefront(VARIANTS_QUERY, { ids: batch.map((id) => `${VARIANT_GID_PREFIX}${id}`) }));
  const nodesById = /* @__PURE__ */ new Map();
  for (const node of pages.flatMap((data) => data?.nodes ?? [])) {
    const id = toNumericId(node?.id);
    if (id) nodesById.set(id, node);
  }
  return nodesById;
};
const failedStorefrontTokens = /* @__PURE__ */ new Set();
const toStock = (node) => ({
  quantityAvailable: Number.isFinite(node?.quantityAvailable) ? node.quantityAvailable : null,
  currentlyNotInStock: node?.currentlyNotInStock === true
});
const fetchInventory = async (variantIds, storefrontToken) => {
  const stockById = /* @__PURE__ */ new Map();
  if (!storefrontToken || failedStorefrontTokens.has(storefrontToken) || !variantIds.length) return stockById;
  const pages = await mapWithConcurrency(toBatches(variantIds), MAX_PARALLEL_REQUESTS, (batch) => requestStorefront(INVENTORY_QUERY, { ids: batch.map((id) => `${VARIANT_GID_PREFIX}${id}`) }, storefrontToken));
  if (pages.some((data) => !data)) failedStorefrontTokens.add(storefrontToken);
  for (const node of pages.flatMap((data) => data?.nodes ?? [])) {
    const id = toNumericId(node?.id);
    if (id) stockById.set(id, toStock(node));
  }
  return stockById;
};
const hasEnoughStock = (variant, requiredQuantity) => {
  if (variant?.available === false) return false;
  if (!Number.isFinite(variant?.quantityAvailable)) return true;
  if (variant.currentlyNotInStock) return true;
  if (variant.quantityAvailable <= 0) return true;
  return variant.quantityAvailable >= requiredQuantity;
};
const requiredStockOf = (role, item) => role?.type === "fixed" ? Math.max(1, Number(item?.quantity) || 1) : 1;
const inventoryVariantIds = (candidates) => {
  const ids = /* @__PURE__ */ new Set();
  for (const { campaign } of candidates) {
    for (const role of [campaign?.trigger, campaign?.reward]) {
      for (const item of role?.items ?? []) {
        if (requiredStockOf(role, item) < 2) continue;
        for (const variantId of (item.variantIds ?? []).map(toNumericId).filter(Boolean)) ids.add(variantId);
      }
    }
  }
  return [...ids];
};
const allVariantDefaultIds = (candidates, stubsByProduct) => {
  const ids = /* @__PURE__ */ new Set();
  for (const { campaign } of candidates) {
    for (const role of [campaign?.trigger, campaign?.reward]) {
      for (const item of role?.items ?? []) {
        if (requiredStockOf(role, item) < 2 || item.variantIds?.length) continue;
        const defaultStub = (stubsByProduct.get(toNumericId(item?.id)) ?? []).find((stub) => stub.id !== null);
        if (defaultStub) ids.add(String(defaultStub.id));
      }
    }
  }
  return [...ids];
};
const readLiveOptions = (head) => (head.options ?? []).map((option) => ({
  id: toNumericId(option.id),
  name: option.name ?? "",
  values: (option.optionValues ?? []).map((value) => value.name)
}));
const toAvailabilityKeys = (encoded) => new Set(decodeEncodedVariants(encoded).map((indexes) => indexes.join(":")));
const buildSubsetStubs = (head, mapProduct) => {
  const liveOptions = readLiveOptions(head);
  const availableKeys = toAvailabilityKeys(head.encodedVariantAvailability);
  const liveOptionIndexById = new Map(liveOptions.map((option, optionIndex) => [option.id, optionIndex]));
  const storedToLive = (mapProduct.optionIds ?? []).map((optionId) => liveOptionIndexById.get(String(optionId)));
  const isCurrent = storedToLive.length === liveOptions.length && new Set(storedToLive).size === liveOptions.length && storedToLive.every((liveOptionIndex, storedIndex) => liveOptionIndex !== void 0 && liveOptions[liveOptionIndex].values.length === mapProduct.optionValueCounts?.[storedIndex]);
  if (!isCurrent) return null;
  return (mapProduct.variants ?? []).map(([variantId, ...positions]) => {
    const liveIndexes = Array.from(liveOptions, () => 0);
    positions.forEach((position, storedIndex) => {
      liveIndexes[storedToLive[storedIndex]] = position;
    });
    return {
      key: `variant:${variantId}`,
      id: Number(variantId),
      values: liveIndexes.map((position, optionIndex) => liveOptions[optionIndex].values[position] ?? null),
      available: availableKeys.has(liveIndexes.join(":"))
    };
  }).filter((stub) => stub.values.every((value) => value !== null));
};
const buildAllStubs = (head) => {
  const liveOptions = readLiveOptions(head);
  const availableKeys = toAvailabilityKeys(head.encodedVariantAvailability);
  const productId = toNumericId(head.id);
  return decodeEncodedVariants(head.encodedVariantExistence).map((indexes) => {
    const values = indexes.map((valueIndex, optionIndex) => liveOptions[optionIndex]?.values[valueIndex] ?? null);
    return {
      key: `options:${productId}:${values.join("\0")}`,
      id: null,
      values,
      available: availableKeys.has(indexes.join(":"))
    };
  });
};
const toProductShell = (head) => {
  const liveOptions = readLiveOptions(head);
  return {
    id: Number(toNumericId(head.id)),
    handle: head.handle ?? "",
    title: head.title ?? "",
    imageUrl: head.featuredImage?.url ?? null,
    optionNames: liveOptions.map((option) => option.name),
    options: liveOptions.map((option) => ({ name: option.name, values: option.values })),
    price: toCents$1(head.priceRange?.minVariantPrice) ?? 0,
    available: head.availableForSale !== false
  };
};
const mergeDetail = (stub, node) => node ? { ...stub, ...normalizeVariantDetail(node), values: stub.values } : stub;
const matchesValues = (stub, node, optionNames) => {
  const valueByName = new Map((node.selectedOptions ?? []).map((option) => [option.name, option.value]));
  return optionNames.every((name, optionIndex) => valueByName.get(name) === stub.values[optionIndex]);
};
const pickDefaultStub = (stubs) => stubs.find((stub) => stub.available) ?? stubs[0] ?? null;
const defaultVariantIds = (plan, stubsByProduct) => {
  const ids = /* @__PURE__ */ new Set();
  for (const item of plan.items) {
    const productId = toNumericId(item?.id);
    const stubs = stubsByProduct.get(productId);
    if (!stubs || !item.variantIds?.length) continue;
    const allowedIds = new Set(item.variantIds.map(toNumericId).filter(Boolean));
    const stub = pickDefaultStub(stubs.filter((candidate) => allowedIds.has(String(candidate.id))));
    if (stub && !hasVariantDetail(stub)) ids.add(String(stub.id));
  }
  return [...ids];
};
const loadStubs = async (plan, variantMap) => {
  const mapProducts = variantMap?.products ?? {};
  const unmappedVariantIds = plan.subsetProductIds.filter((productId) => !mapProducts[productId]).flatMap((productId) => [...plan.variantIdsByProduct.get(productId)]);
  const [data, unmappedNodes] = await Promise.all([
    requestStorefront(HEADS_QUERY, {
      subsetIds: plan.subsetProductIds.map((id) => `${PRODUCT_GID_PREFIX}${id}`),
      allIds: plan.allProductIds.map((id) => `${PRODUCT_GID_PREFIX}${id}`)
    }),
    unmappedVariantIds.length ? fetchVariantDetails(unmappedVariantIds) : /* @__PURE__ */ new Map()
  ]);
  const heads = [...data?.subset ?? [], ...data?.all ?? []].filter((head) => toNumericId(head?.id));
  const headsById = new Map(heads.map((head) => [toNumericId(head.id), head]));
  const stubsByProduct = /* @__PURE__ */ new Map();
  const staleProductIds = [];
  for (const productId of plan.productIds) {
    const head = headsById.get(productId);
    if (!head) continue;
    const optionNames = readLiveOptions(head).map((option) => option.name);
    if (plan.variantIdsByProduct.get(productId) === null) {
      const firstVariant = head.selectedOrFirstAvailableVariant;
      stubsByProduct.set(productId, buildAllStubs(head).map((stub) => firstVariant && matchesValues(stub, firstVariant, optionNames) ? mergeDetail(stub, firstVariant) : stub));
    } else if (mapProducts[productId]) {
      const stubs = buildSubsetStubs(head, mapProducts[productId]);
      if (stubs) stubsByProduct.set(productId, stubs);
      else staleProductIds.push(productId);
    } else {
      stubsByProduct.set(productId, [...plan.variantIdsByProduct.get(productId)].map((variantId) => unmappedNodes.get(variantId)).filter(Boolean).map((node) => normalizeFullVariant(node, optionNames)));
    }
  }
  if (staleProductIds.length) {
    const staleNodes = await fetchVariantDetails(staleProductIds.flatMap((productId) => [...plan.variantIdsByProduct.get(productId)]));
    for (const productId of staleProductIds) {
      const optionNames = readLiveOptions(headsById.get(productId)).map((option) => option.name);
      stubsByProduct.set(productId, [...plan.variantIdsByProduct.get(productId)].map((variantId) => staleNodes.get(variantId)).filter(Boolean).map((node) => normalizeFullVariant(node, optionNames)));
    }
  }
  return { headsById, stubsByProduct };
};
const itemHasAvailableVariant$1 = (item, productsById, requiredQuantity) => {
  const product = productsById.get(toNumericId(item?.id));
  if (!product) return false;
  const allowedIds = new Set((item.variantIds ?? []).map(toNumericId).filter(Boolean));
  return (product.variants ?? []).some((variant) => variant.available && hasEnoughStock(variant, requiredQuantity) && (!item.variantIds?.length || allowedIds.has(String(variant.id))));
};
const isRoleFulfillable = (role, isTrigger, productsById) => {
  const items = role?.items ?? [];
  if (!items.length) return false;
  const availableItems = items.filter((item) => itemHasAvailableVariant$1(item, productsById, requiredStockOf(role, item)));
  if (role.type === "fixed") return availableItems.length === items.length;
  if (isTrigger && role.type === "mixMatch") {
    const reachableUnits = availableItems.reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);
    return reachableUnits >= Math.max(1, Number(role.minQuantity) || 1);
  }
  return availableItems.length > 0;
};
const isBxgyOfferFulfillable = (campaign, products) => {
  const productsById = new Map((products ?? []).map((product) => [String(product.id), product]));
  return isRoleFulfillable(campaign?.trigger, true, productsById) && isRoleFulfillable(campaign?.reward, false, productsById);
};
const mergeCandidates = (candidates) => {
  const mapProducts = {};
  for (const candidate of candidates) {
    for (const [productId, mapProduct] of Object.entries(candidate.variantMap?.products ?? {})) {
      if (!mapProducts[productId]) mapProducts[productId] = mapProduct;
    }
  }
  return {
    campaign: {
      trigger: { items: candidates.flatMap((candidate) => candidate.campaign.trigger?.items ?? []) },
      reward: { items: candidates.flatMap((candidate) => candidate.campaign.reward?.items ?? []) }
    },
    variantMap: { products: mapProducts }
  };
};
const loadBxgyOffer = async (candidates, storefrontToken) => {
  const validCandidates = (candidates ?? []).filter((candidate) => candidate?.campaign);
  const merged = mergeCandidates(validCandidates);
  const plan = planBxgyRequests(merged.campaign);
  if (!plan.productIds.length) return { candidateIndex: -1, products: [] };
  const [{ headsById, stubsByProduct }, subsetStockById] = await Promise.all([
    loadStubs(plan, merged.variantMap),
    fetchInventory(inventoryVariantIds(validCandidates), storefrontToken)
  ]);
  const defaultStockIds = allVariantDefaultIds(validCandidates, stubsByProduct).filter((variantId) => !subsetStockById.has(variantId));
  const stockById = new Map([...subsetStockById, ...await fetchInventory(defaultStockIds, storefrontToken)]);
  const productIds = plan.productIds.filter((productId) => stubsByProduct.has(productId) && headsById.get(productId)?.requiresSellingPlan !== true);
  const withStock = (variant) => {
    const stock = variant.id === null ? null : stockById.get(String(variant.id));
    return stock ? { ...variant, ...stock } : variant;
  };
  const toProducts = (detailNodes) => productIds.map((productId) => withVariants(
    toProductShell(headsById.get(productId)),
    stubsByProduct.get(productId).map((stub) => withStock(
      hasVariantDetail(stub) || stub.id === null ? stub : mergeDetail(stub, detailNodes.get(String(stub.id)))
    ))
  ));
  const products = toProducts(/* @__PURE__ */ new Map());
  const candidateIndex = validCandidates.findIndex((candidate) => isBxgyOfferFulfillable(candidate.campaign, products));
  const shownCandidate = validCandidates[Math.max(0, candidateIndex)];
  const defaultIds = defaultVariantIds(planBxgyRequests(shownCandidate.campaign), stubsByProduct);
  const defaultNodes = defaultIds.length ? await fetchVariantDetails(defaultIds) : /* @__PURE__ */ new Map();
  return { candidateIndex, products: toProducts(defaultNodes) };
};
const loadVariantDetail = async (product, stub, storefrontToken) => {
  if (stub.id !== null) {
    const node2 = (await fetchVariantDetails([String(stub.id)])).get(String(stub.id));
    return node2 ? normalizeVariantDetail(node2) : null;
  }
  const data = await requestStorefront(VARIANT_BY_OPTIONS_QUERY, {
    id: `${PRODUCT_GID_PREFIX}${product.id}`,
    selectedOptions: (product.optionNames ?? []).map((name, optionIndex) => ({ name, value: stub.values[optionIndex] }))
  });
  const node = data?.product?.variantBySelectedOptions;
  if (!node) return null;
  const detail = normalizeVariantDetail(node);
  const stock = (await fetchInventory([String(detail.id)], storefrontToken)).get(String(detail.id));
  return stock ? { ...detail, ...stock } : detail;
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
const CRO_DATA_PROPERTY = "_cro_data";
const BXGY_LINE_TYPE = "bxgy";
const CART_ICON_SECTION = "cart-icon-bubble";
const newBundleInstanceId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const toVariantNumber = (value) => {
  const id = Number(String(value ?? "").split("/").pop());
  return Number.isInteger(id) && id > 0 ? id : null;
};
const buildBxgyCartLines = (selections, { campaignId, bundleId }) => {
  const linesByKey = /* @__PURE__ */ new Map();
  for (const { role, variantId, quantity } of selections ?? []) {
    const id = toVariantNumber(variantId);
    const units = Math.floor(Number(quantity) || 0);
    if (!id || units < 1) return null;
    const key = `${role}:${id}`;
    const existing = linesByKey.get(key);
    linesByKey.set(key, { role, id, quantity: (existing?.quantity ?? 0) + units });
  }
  return [...linesByKey.values()].map(({ role, id, quantity }) => ({
    id,
    quantity,
    properties: {
      [CRO_DATA_PROPERTY]: JSON.stringify({ type: BXGY_LINE_TYPE, campaign: String(campaignId), bundle: bundleId, role, qty: quantity })
    }
  }));
};
const readCroData = (item) => {
  try {
    const parsed = JSON.parse(item?.properties?.[CRO_DATA_PROPERTY] ?? "");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};
const setsOfBundle = (lines) => {
  let multiplier = 0;
  for (const { quantity, croData } of lines) {
    const unitQuantity = Math.floor(Number(croData.qty) || 0);
    if (!croData.role) return Math.max(1, quantity);
    if (unitQuantity < 1 || quantity % unitQuantity !== 0) return 1;
    const factor = quantity / unitQuantity;
    if (multiplier && factor !== multiplier) return 1;
    multiplier = factor;
  }
  return multiplier || 1;
};
const countBxgyBundlesInCart = (cartItems, campaignId, parentVariantId) => {
  const linesByBundle = /* @__PURE__ */ new Map();
  let mergedSets = 0;
  for (const item of cartItems ?? []) {
    if (parentVariantId && String(item?.variant_id) === String(parentVariantId)) {
      mergedSets += Math.max(0, Math.floor(Number(item.quantity) || 0));
      continue;
    }
    const croData = readCroData(item);
    if (croData?.type !== BXGY_LINE_TYPE || String(croData.campaign) !== String(campaignId) || !croData.bundle) continue;
    const lines = linesByBundle.get(croData.bundle) ?? [];
    lines.push({ quantity: Math.floor(Number(item.quantity) || 0), croData });
    linesByBundle.set(croData.bundle, lines);
  }
  return [...linesByBundle.values()].reduce((total, lines) => total + setsOfBundle(lines), mergedSets);
};
const fetchCart = async (root) => {
  try {
    const response = await fetch(`${root}cart.js`, { headers: { Accept: "application/json" } });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};
const addBxgyLinesToCart = async (root, lines) => {
  try {
    const response = await fetch(`${root}cart/add.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: lines, sections: CART_ICON_SECTION })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, message: body?.description || body?.message || "" };
    return { ok: true, body };
  } catch {
    return { ok: false, message: "" };
  }
};
const patchCartIconBubble = (body) => {
  const html = body?.sections?.[CART_ICON_SECTION];
  if (!html) return;
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const rendered = template.content.firstElementChild;
  if (!rendered) return;
  document.querySelectorAll(`[id^="shopify-section-${CART_ICON_SECTION}"]`).forEach((existing) => {
    existing.outerHTML = rendered.outerHTML;
  });
};
const notifyThemeCartUpdated = (body, itemCount) => {
  patchCartIconBubble(body);
  document.dispatchEvent(new CustomEvent("cro:cart-mutated", { detail: body }));
  if (typeof window.publish === "function" && window.PUB_SUB_EVENTS?.cartUpdate) {
    window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: "cro-bxgy", cartData: { ...body, item_count: itemCount } });
  }
  document.dispatchEvent(new CustomEvent("cart:update", { detail: { itemCount, source: "cro-bxgy" }, bubbles: true }));
  const cartLinesUpdateEvent = new CustomEvent("shopify:cart:lines-update", { detail: { cart: body, source: "cro-bxgy" }, bubbles: true });
  cartLinesUpdateEvent.action = "add";
  cartLinesUpdateEvent.promise = Promise.resolve({ cart: { totalQuantity: itemCount }, detail: { itemCount } });
  document.dispatchEvent(cartLinesUpdateEvent);
  document.documentElement.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true }));
};
const openEcomposerAjaxCart = (addedItem) => {
  const ecomposer = window.EComposer;
  if (!ecomposer?.configs?.ajax_cart?.enable || typeof ecomposer.ajaxCartSuccess !== "function") return false;
  try {
    ecomposer.ajaxCartSuccess(addedItem ?? null);
    return true;
  } catch (error) {
    console.error("[cro-bxgy] EComposer ajax cart open failed:", error);
    return false;
  }
};
const openThemeCartDrawer = () => {
  const openCart = window.Shopify?.actions?.openCart;
  if (typeof openCart !== "function") return false;
  try {
    Promise.resolve(openCart.call(window.Shopify.actions)).catch(() => {
    });
    return true;
  } catch {
    return false;
  }
};
const openCartAfterAdd = (root, addedItem) => {
  if (openEcomposerAjaxCart(addedItem)) return "ecomposer";
  if (openThemeCartDrawer()) return "drawer";
  window.location.href = `${root}cart`;
  return "page";
};
const DEFAULT_TITLE_RE = /^default\s*title$/i;
const selectionModeOf = (role, type) => {
  if (type === "fixed") return "fixed";
  if (type === "mixMatch" || role === "trigger" && type === "spend") return "mixMatch";
  return null;
};
const createStore = () => ({
  variantSelection: /* @__PURE__ */ new Map(),
  pickedLines: /* @__PURE__ */ new Map(),
  draftQuantity: /* @__PURE__ */ new Map(),
  editor: null,
  productMap: null,
  loadedProducts: null,
  loadingCampaign: null,
  candidateIndex: null,
  variantDetails: /* @__PURE__ */ new Map(),
  variantRequests: /* @__PURE__ */ new Map(),
  shownVariants: /* @__PURE__ */ new Map(),
  submit: { state: "idle", message: "" }
});
const safeImageUrl = (url) => {
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url;
};
const variantLabel = (variant) => {
  const values = (variant?.values ?? []).filter((value) => value != null && !DEFAULT_TITLE_RE.test(String(value)));
  return values.join(" / ");
};
const selectionKey = (role, index) => `${role}:${index}`;
const toCents = (amount) => Math.round((Number(amount) || 0) * 100);
const currencyRateOf = (widget) => {
  const rate = Number(widget.currencyRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
};
const toPresentmentCents = (widget, amount) => Math.round(toCents(amount) * currencyRateOf(widget));
const roleItems = (widget, role) => (role === "trigger" ? widget.campaign.trigger?.items : widget.campaign.reward?.items) ?? [];
const productIndexOf = (widget) => {
  const { store } = widget;
  if (!store.productMap) {
    const items = [...roleItems(widget, "trigger"), ...roleItems(widget, "reward")];
    store.productMap = new Map(narrowBxgyProducts(widget.products, items).map((product) => [String(product.id), product]));
  }
  return store.productMap;
};
const productOf = (widget, item) => productIndexOf(widget).get(String(item?.id));
const withDetail = (widget, variant) => {
  if (!variant || hasVariantDetail(variant)) return variant;
  const detail = widget.store.variantDetails.get(variant.key);
  return detail ? { ...variant, ...detail, values: variant.values } : variant;
};
const detailStatusOf = (widget, variant) => {
  if (!variant || hasVariantDetail(variant)) return "ready";
  const detail = widget.store.variantDetails.get(variant.key);
  if (detail) return "ready";
  return detail === null ? "unavailable" : "pending";
};
const variantById = (widget, product, variantId) => (product?.variants ?? []).map((variant) => withDetail(widget, variant)).find((variant) => variant.id != null && String(variant.id) === String(variantId)) ?? null;
const markShortStock = (widget, variants, requiredQuantity) => {
  if (requiredQuantity < 2) return variants;
  return variants.map((variant) => {
    const detailed = withDetail(widget, variant);
    return hasEnoughStock(detailed, requiredQuantity) ? detailed : { ...detailed, available: false };
  });
};
const allowedVariantsOf = (widget, product, item, requiredQuantity) => {
  const allowedIds = (item.variantIds ?? []).map(String);
  const allowedVariants = allowedIds.length ? product.variants.filter((variant) => allowedIds.includes(String(variant.id))) : product.variants;
  return markShortStock(widget, allowedVariants, requiredQuantity);
};
const resolveItem = (widget, item, storedSelection, requiredQuantity = 1) => {
  const product = productOf(widget, item);
  const quantity = Math.max(1, Number(item.quantity) || 1);
  if (!product) return { status: "missing", title: formatHandle(item.handle), quantity };
  const variants = allowedVariantsOf(widget, product, item, requiredQuantity);
  const selection = resolveSelection(variants, storedSelection);
  const selectedVariant = findVariant(variants, selection) ?? variants[0] ?? null;
  const variantStatus = detailStatusOf(widget, selectedVariant);
  if (variantStatus === "pending") widget.requestVariantDetail?.(product, selectedVariant, requiredQuantity > 1);
  const variant = withDetail(widget, selectedVariant);
  return {
    status: "ready",
    variantStatus,
    variants,
    variant,
    selection,
    optionNames: product.optionNames ?? [],
    title: product.title || formatHandle(product.handle || item.handle),
    image: safeImageUrl(variant?.imageUrl || product.imageUrl),
    url: productUrlOf(widget, product.handle || item.handle, variant),
    quantity,
    price: variant?.price ?? product.price ?? 0,
    compareAtPrice: variant?.compareAtPrice ?? null
  };
};
const productUrlOf = (widget, handle, variant) => {
  if (!handle) return null;
  const root = widget.routesRoot || "/";
  const variantQuery = variant?.id != null ? `?variant=${encodeURIComponent(variant.id)}` : "";
  return `${root}products/${encodeURIComponent(handle)}${variantQuery}`;
};
const requiredStockOfItem = (widget, role, item) => requiredStockOf(widget.campaign[role], item);
const keepShownVariantWhilePending = (widget, key, resolved) => {
  const { shownVariants } = widget.store;
  if (resolved.status !== "ready") return resolved;
  if (resolved.variantStatus === "ready") {
    shownVariants.set(key, { price: resolved.price, compareAtPrice: resolved.compareAtPrice, image: resolved.image });
    return resolved;
  }
  const shown = resolved.variantStatus === "pending" ? shownVariants.get(key) : null;
  return shown ? { ...resolved, ...shown } : resolved;
};
const resolveRoleItem = (widget, role, index) => {
  const item = roleItems(widget, role)[index];
  const key = selectionKey(role, index);
  const resolved = resolveItem(widget, item, widget.store.variantSelection.get(key), requiredStockOfItem(widget, role, item));
  return keepShownVariantWhilePending(widget, key, resolved);
};
const pickLines = (widget, role, index) => widget.store.pickedLines.get(selectionKey(role, index)) ?? [];
const pickedUnits = (widget, role, index) => pickLines(widget, role, index).reduce((total, line) => total + line.quantity, 0);
const pickedUnitsOfRole = (widget, role) => roleItems(widget, role).reduce((total, _item, index) => total + pickedUnits(widget, role, index), 0);
const sumItems = (widget, role) => roleItems(widget, role).reduce((sum, _item, index) => {
  const resolved = resolveRoleItem(widget, role, index);
  if (resolved.status === "missing") return { ...sum, soldOut: true };
  return {
    count: sum.count + resolved.quantity,
    amount: sum.amount + resolved.price * resolved.quantity,
    soldOut: sum.soldOut || resolved.variantStatus === "unavailable" || !resolved.variants.some((variant) => variant.available !== false),
    pending: sum.pending || resolved.variantStatus === "pending"
  };
}, { count: 0, amount: 0, soldOut: false, pending: false });
const itemHasAvailableVariant = (widget, role, index) => {
  const item = roleItems(widget, role)[index];
  const product = productOf(widget, item);
  if (!product) return false;
  return allowedVariantsOf(widget, product, item, requiredStockOfItem(widget, role, item)).some((variant) => variant.available !== false);
};
const isPickRoleUnreachable = (widget, role) => {
  const config = widget.campaign[role];
  const items = roleItems(widget, role);
  const availableIndexes = items.map((_item, index) => index).filter((index) => itemHasAvailableVariant(widget, role, index));
  if (role === "trigger" && config?.type === "mixMatch") {
    const reachableUnits = availableIndexes.reduce((total, index) => total + Math.max(1, Number(items[index].quantity) || 1), 0) + items.reduce((total, _item, index) => total + (availableIndexes.includes(index) ? 0 : pickedUnits(widget, role, index)), 0);
    return reachableUnits < Math.max(1, Number(config.minQuantity) || 1);
  }
  return availableIndexes.length === 0 && pickedUnitsOfRole(widget, role) === 0;
};
const sumPicked = (widget, role) => roleItems(widget, role).reduce((sum, item, index) => {
  const product = productOf(widget, item);
  return pickLines(widget, role, index).reduce((lineSum, line) => {
    const variant = variantById(widget, product, line.variantId);
    return {
      count: lineSum.count + line.quantity,
      amount: lineSum.amount + (variant?.price ?? product?.price ?? 0) * line.quantity,
      soldOut: false,
      pending: false
    };
  }, sum);
}, { count: 0, amount: 0, soldOut: false, pending: false });
const sumRole = (widget, role) => {
  if (widget.campaign[role]?.type === "fixed") return sumItems(widget, role);
  const picked = sumPicked(widget, role);
  return { ...picked, soldOut: isPickRoleUnreachable(widget, role) };
};
const lockState = (widget) => {
  const trigger = widget.campaign.trigger;
  if (trigger?.type === "spend") {
    const current = sumPicked(widget, "trigger").amount;
    const target = Math.max(1, toPresentmentCents(widget, trigger.minAmount));
    const remainingAmount = Math.max(0, target - current);
    return { isLocked: remainingAmount > 0, current, target, remainingCount: 0, remainingAmount };
  }
  if (trigger?.type === "mixMatch") {
    const current = pickedUnitsOfRole(widget, "trigger");
    const target = Math.max(1, Number(trigger.minQuantity) || 1);
    const remainingCount = Math.max(0, target - current);
    return { isLocked: remainingCount > 0, current, target, remainingCount, remainingAmount: 0 };
  }
  return { isLocked: false, current: 0, target: 0, remainingCount: 0, remainingAmount: 0 };
};
const rewardPickLimit = (widget) => {
  const maxQuantity = Number(widget.campaign.reward?.maxQuantity);
  if (Number.isFinite(maxQuantity) && maxQuantity > 0) return maxQuantity;
  return roleItems(widget, "reward").reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);
};
const remainingUnits = (widget, role, index) => {
  const item = roleItems(widget, role)[index];
  const itemRemaining = Math.max(1, Number(item?.quantity) || 1) - pickedUnits(widget, role, index);
  if (role !== "reward") return Math.max(0, itemRemaining);
  if (lockState(widget).isLocked) return 0;
  const maxQuantity = Number(widget.campaign.reward?.maxQuantity) || Infinity;
  return Math.max(0, Math.min(itemRemaining, maxQuantity - pickedUnitsOfRole(widget, "reward")));
};
const draftUnits = (widget, role, index) => {
  const remaining = remainingUnits(widget, role, index);
  const draft = widget.store.draftQuantity.get(selectionKey(role, index)) ?? 1;
  return Math.max(1, Math.min(draft, remaining));
};
const discountRate = (widget) => {
  const offer = widget.campaign.reward?.discountOffer;
  if (offer?.type !== "percentage") return 0;
  return Math.min(100, Math.max(0, Number(offer.value) || 0)) / 100;
};
const rewardDiscount = (widget, rewardAmount) => {
  const offer = widget.campaign.reward?.discountOffer;
  if (!offer) return 0;
  if (offer.type === "fixedAmount") return Math.min(rewardAmount, toPresentmentCents(widget, offer.value));
  return Math.round(rewardAmount * discountRate(widget));
};
const PERCENT_DECIMALS_SCALE = 1e6;
const currencyUnitCentsOf = (widget) => {
  const decimals = widget.currencyDecimals;
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 2 ? 10 ** (2 - decimals) : 1;
};
const mergedPercentOf = (subtotal, discount) => {
  if (subtotal <= 0 || discount <= 0) return 0;
  const percent = Math.min(discount, subtotal) / subtotal * 100;
  return Math.min(100, Math.ceil(percent * PERCENT_DECIMALS_SCALE) / PERCENT_DECIMALS_SCALE);
};
const mergedTotalOf = (widget, subtotal, discount) => {
  const percent = mergedPercentOf(subtotal, discount);
  if (percent <= 0) return subtotal;
  const unitCents = currencyUnitCentsOf(widget);
  return Math.round(subtotal * (1 - percent / 100) / unitCents) * unitCents;
};
const bundleTotals = (widget) => {
  const trigger = sumRole(widget, "trigger");
  const reward = sumRole(widget, "reward");
  const subtotal = trigger.amount + reward.amount;
  const total = mergedTotalOf(widget, subtotal, rewardDiscount(widget, reward.amount));
  const discount = subtotal - total;
  return {
    itemCount: trigger.count + reward.count,
    subtotal,
    discount,
    total,
    percent: subtotal > 0 ? Math.round(discount / subtotal * 100) : 0,
    soldOut: trigger.soldOut || reward.soldOut,
    pending: trigger.pending || reward.pending,
    needsRewardPick: widget.campaign.reward?.type === "mixMatch" && reward.count === 0
  };
};
const lineVariant = (widget, role, index, variantId) => variantById(widget, productOf(widget, roleItems(widget, role)[index]), variantId);
const lineItemLabel = (widget, role, index, variantId) => {
  const item = roleItems(widget, role)[index];
  const product = productOf(widget, item);
  const title = product?.title || formatHandle(item?.handle);
  const label = variantLabel(lineVariant(widget, role, index, variantId));
  return label ? `${title} – ${label}` : title;
};
const changeVariantOption = (widget, role, index, optionIndex, value, isDrafting) => {
  const { store } = widget;
  const baseSelection = isDrafting ? store.editor.draft : store.variantSelection.get(selectionKey(role, index));
  const item = roleItems(widget, role)[index];
  const nextSelection = [...resolveItem(widget, item, baseSelection, requiredStockOfItem(widget, role, item)).selection];
  nextSelection[optionIndex] = value;
  if (isDrafting) store.editor.draft = nextSelection;
  else store.variantSelection.set(selectionKey(role, index), nextSelection);
};
const openEditor = (widget, role, index) => {
  widget.store.editor = { role, index, draft: resolveRoleItem(widget, role, Number(index)).selection };
};
const applyEditor = (widget, role, index) => {
  const { store } = widget;
  if (!store.editor) return false;
  store.variantSelection.set(selectionKey(role, index), store.editor.draft);
  store.editor = null;
  return true;
};
const closeEditor = (widget) => {
  widget.store.editor = null;
};
const stepDraftQuantity = (widget, role, index, delta) => {
  widget.store.draftQuantity.set(selectionKey(role, index), draftUnits(widget, role, index) + delta);
};
const addItems = (widget, role, index) => {
  const { store } = widget;
  const item = roleItems(widget, role)[index];
  const key = selectionKey(role, index);
  const resolved = item ? resolveItem(widget, item, store.variantSelection.get(key), requiredStockOfItem(widget, role, item)) : null;
  const remaining = remainingUnits(widget, role, index);
  if (!resolved?.variant || resolved.variantStatus !== "ready" || resolved.variant.available === false || remaining < 1) return null;
  const quantity = Math.min(draftUnits(widget, role, index), remaining);
  const variantId = String(resolved.variant.id);
  const lines = pickLines(widget, role, index).map((line) => ({ ...line }));
  const existingLine = lines.find((line) => line.variantId === variantId);
  if (existingLine) existingLine.quantity += quantity;
  else lines.push({ variantId, quantity });
  store.pickedLines.set(key, lines);
  store.draftQuantity.delete(key);
  return { variantId, quantity };
};
const collectCartSelections = (widget) => {
  const selections = [];
  for (const role of ["trigger", "reward"]) {
    const mode = selectionModeOf(role, widget.campaign[role]?.type);
    const items = roleItems(widget, role);
    for (let index = 0; index < items.length; index += 1) {
      if (mode === "fixed") {
        const resolved = resolveRoleItem(widget, role, index);
        if (resolved.status !== "ready" || resolved.variantStatus !== "ready" || !resolved.variant || resolved.variant.available === false) return null;
        selections.push({ role, variantId: resolved.variant.id, quantity: resolved.quantity });
      } else if (mode === "mixMatch") {
        for (const line of pickLines(widget, role, index)) selections.push({ role, variantId: line.variantId, quantity: line.quantity });
      }
    }
  }
  return selections;
};
const clearPickedLines = (widget) => {
  widget.store.pickedLines.clear();
  widget.store.draftQuantity.clear();
};
const removeLine = (widget, role, index, variantId) => {
  const { store } = widget;
  const key = selectionKey(role, index);
  const lines = pickLines(widget, role, index);
  const removedLine = lines.find((line) => line.variantId === variantId);
  if (!removedLine) return null;
  const remainingLines = lines.filter((line) => line.variantId !== variantId);
  if (remainingLines.length) store.pickedLines.set(key, remainingLines);
  else store.pickedLines.delete(key);
  if (role === "trigger" && lockState(widget).isLocked) {
    for (const pickedKey of [...store.pickedLines.keys()]) {
      if (pickedKey.startsWith("reward:")) store.pickedLines.delete(pickedKey);
    }
  }
  return removedLine;
};
const buildOptionsView = (variants, optionNames, selection) => Array.from({ length: countOptions(variants) }, (_, optionIndex) => ({
  name: optionNames[optionIndex] || "",
  selected: selection[optionIndex],
  choices: listChoices(variants, selection, optionIndex)
}));
const buildEditorView = (widget, role, index, resolved) => {
  const { editor } = widget.store;
  if (editor?.role !== role || String(editor?.index) !== String(index)) return null;
  const draftSelection = resolveSelection(resolved.variants, editor.draft);
  const draftVariant = findVariant(resolved.variants, draftSelection);
  return {
    options: buildOptionsView(resolved.variants, resolved.optionNames, draftSelection),
    canApply: Boolean(draftVariant) && draftVariant.available !== false
  };
};
const buildPickerView = (widget, role, index, resolved) => {
  const { variants, variant, selection, optionNames } = resolved;
  return {
    hasChoice: variants.length >= 2 && !isDefaultTitleOnly(variants),
    optionCount: countOptions(variants),
    selectedLabel: variantLabel(variant),
    options: buildOptionsView(variants, optionNames, selection),
    editor: buildEditorView(widget, role, index, resolved)
  };
};
const buildLinesView = (widget, role, index) => pickLines(widget, role, index).map((line) => ({
  variantId: line.variantId,
  quantity: line.quantity,
  variantLabel: variantLabel(lineVariant(widget, role, index, line.variantId)),
  itemLabel: lineItemLabel(widget, role, index, line.variantId)
}));
const buildCardView = (widget, role, mode, index) => {
  const resolved = resolveRoleItem(widget, role, index);
  if (resolved.status === "missing") {
    return { role, mode, index, status: "missing", title: resolved.title, quantity: resolved.quantity };
  }
  const remaining = remainingUnits(widget, role, index);
  const discountedPrice = Math.round(resolved.price * (1 - discountRate(widget)));
  const soldOut = !resolved.variants.some((variant) => variant.available !== false);
  return {
    role,
    mode,
    index,
    status: "ready",
    title: resolved.title,
    image: resolved.image,
    url: resolved.url,
    quantity: resolved.quantity,
    price: resolved.price,
    compareAtPrice: resolved.compareAtPrice,
    rewardPrice: discountedPrice,
    picker: buildPickerView(widget, role, index, resolved),
    draftQuantity: draftUnits(widget, role, index),
    remaining,
    soldOut,
    canAdd: !soldOut && remaining >= 1 && resolved.variantStatus !== "unavailable" && resolved.variant?.available !== false,
    pending: resolved.variantStatus === "pending",
    pickedUnits: pickedUnits(widget, role, index),
    lines: buildLinesView(widget, role, index)
  };
};
const buildRoleView = (widget, role) => {
  const type = widget.campaign[role]?.type;
  const mode = selectionModeOf(role, type);
  if (!mode) return null;
  const cards = roleItems(widget, role).map((_item, index) => buildCardView(widget, role, mode, index)).filter((card) => card.status !== "missing" || mode === "fixed");
  const pickCount = role === "reward" && mode === "mixMatch" ? { selected: pickedUnitsOfRole(widget, role), max: rewardPickLimit(widget) } : null;
  return { type, mode, cards, pickCount };
};
const buildProgressView = (widget, lock) => {
  const type = widget.campaign.trigger?.type;
  if (type !== "mixMatch" && type !== "spend") return null;
  return {
    type,
    current: lock.current,
    target: lock.target,
    percent: Math.min(100, Math.round(lock.current / lock.target * 100))
  };
};
const ctaStatusOf = (totals, lock) => {
  if (totals.soldOut) return "unavailable";
  if (lock.remainingAmount > 0) return "spend";
  if (lock.remainingCount > 0) return "locked";
  if (totals.needsRewardPick) return "pickReward";
  return "ready";
};
const buildOfferView = (widget) => {
  const lock = lockState(widget);
  const totals = bundleTotals(widget);
  const status = ctaStatusOf(totals, lock);
  const submit = widget.store.submit;
  const isAdding = submit.state === "adding";
  return {
    trigger: buildRoleView(widget, "trigger"),
    reward: buildRoleView(widget, "reward"),
    isLocked: lock.isLocked,
    progress: buildProgressView(widget, lock),
    totals,
    submit,
    cta: {
      status,
      submitState: submit.state,
      disabled: totals.soldOut || lock.isLocked || totals.needsRewardPick || isAdding,
      busy: totals.pending || isAdding,
      remainingCount: lock.remainingCount,
      remainingAmount: lock.remainingAmount,
      total: totals.total
    }
  };
};
const SKELETON_CARDS_PER_GROUP = 3;
const POPOVER_OPTION_COUNT = 2;
const caretIcon = `<svg class="cro-bxgy__select-caret" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 1 5 5 9 1"/></svg>`;
const minusIcon = `<svg class="cro-bxgy__step-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" aria-hidden="true"><line x1="0" y1="4" x2="8" y2="4"/></svg>`;
const plusIcon = `<svg class="cro-bxgy__step-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" aria-hidden="true"><line x1="0" y1="4" x2="8" y2="4"/><line x1="4" y1="0" x2="4" y2="8"/></svg>`;
const removeIcon = `<svg class="cro-bxgy__picked-remove-icon" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" aria-hidden="true"><line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/></svg>`;
const lockIcon = `<svg class="cro-bxgy__lock-icon" viewBox="0 0 8 10" fill="currentColor" aria-hidden="true"><path d="M6.5 4V3a2.5 2.5 0 0 0-5 0v1H1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-.5ZM2.5 3a1.5 1.5 0 0 1 3 0v1h-3V3Z"/></svg>`;
const renderEmptyState = () => `<section class="cro-bxgy"><p class="cro-bxgy__empty">No offer data available.</p></section>`;
const renderHeader = (ctx, { showDivider }) => {
  const title = ctx.text("headerTitleText");
  const subtitle = ctx.text("headerSubtitleText");
  if (!title && !subtitle && !showDivider) return "";
  return `
            <div class="cro-bxgy__header">
                ${title ? `<h2 class="cro-bxgy__title">${escapeHtml(title)}</h2>` : ""}
                ${subtitle ? `<p class="cro-bxgy__subtitle">${escapeHtml(subtitle)}</p>` : ""}
                ${showDivider ? `<hr class="cro-bxgy__header-divider">` : ""}
            </div>
        `;
};
const renderProductName = ({ title, url }) => url ? `<a class="cro-bxgy__name cro-bxgy__name--link" href="${escapeHtml(url)}" title="${escapeHtml(title)}">${escapeHtml(title)}</a>` : `<span class="cro-bxgy__name" title="${escapeHtml(title)}">${escapeHtml(title)}</span>`;
const renderProductImage = (card) => card.image ? `<img class="cro-bxgy__img" src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy">` : `<span class="cro-bxgy__img cro-bxgy__img--placeholder" role="img" aria-label="${escapeHtml(card.title)}"></span>`;
const renderQuantityBadge = (ctx, card) => {
  if (ctx.settings.showItemQuantityBadge === false) return "";
  const label = card.mode === "fixed" ? `x${card.quantity}` : `${card.pickedUnits}/${card.quantity}`;
  return `<span class="cro-bxgy__qty">${label}</span>`;
};
const renderTriggerPrice = (ctx, { price, compareAtPrice }) => {
  const wasPrice = compareAtPrice > price ? `<s class="cro-bxgy__price-was">${escapeHtml(ctx.money(compareAtPrice))}</s>` : "";
  return `
            <span class="cro-bxgy__price">
                ${wasPrice}
                <span class="cro-bxgy__price-now">${escapeHtml(ctx.money(price))}</span>
            </span>
        `;
};
const renderRewardPrice = (ctx, { price, rewardPrice }) => {
  const isDiscounted = rewardPrice < price;
  const nowLabel = rewardPrice <= 0 ? ctx.text("rewardFreeText") : ctx.money(rewardPrice);
  return `
            <span class="cro-bxgy__price">
                ${isDiscounted ? `<s class="cro-bxgy__price-was">${escapeHtml(ctx.money(price))}</s>` : ""}
                <span class="cro-bxgy__price-now">${escapeHtml(nowLabel)}</span>
            </span>
        `;
};
const renderPopover = (ctx, card) => {
  const { role, index, title } = card;
  const { editor } = card.picker;
  const soldOutText = ctx.text("itemSoldOutText");
  const fieldsets = editor.options.map((option, optionIndex) => {
    const optionName = option.name || `Option ${optionIndex + 1}`;
    const choices = option.choices.map(({ value, available }) => `
                <label class="cro-bxgy__radio${available ? "" : " cro-bxgy__radio--sold-out"}">
                    <input type="radio" class="cro-bxgy__radio-input" name="${role}-${index}-${optionIndex}" value="${escapeHtml(value)}" data-action="draft-variant" data-role="${role}" data-index="${index}" data-option="${optionIndex}"${value === option.selected ? " checked" : ""}${available ? "" : " disabled"}>
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
                    <button type="button" class="cro-bxgy__popover-close" data-action="close-editor" data-role="${role}" data-index="${index}" aria-label="${escapeHtml(ctx.text("closeText"))}">×</button>
                </div>
                <div class="cro-bxgy__popover-body">${fieldsets}</div>
                <button type="button" class="cro-bxgy__popover-apply" data-action="apply-editor" data-role="${role}" data-index="${index}"${editor.canApply ? "" : " disabled"}>${escapeHtml(ctx.text("variantApplyText"))}</button>
            </div>
        `;
};
const renderVariantPicker = (ctx, card) => {
  const { role, index, title, picker } = card;
  if (ctx.settings.showItemVariant === false || !picker.hasChoice) return "";
  if (picker.optionCount < POPOVER_OPTION_COUNT) {
    const [firstOption] = picker.options;
    const soldOutText = ctx.text("itemSoldOutText");
    const choices = (firstOption?.choices ?? []).map(({ value, available }) => {
      const label = available || !soldOutText ? value : `${value} - ${soldOutText}`;
      return `<option value="${escapeHtml(value)}"${value === firstOption.selected ? " selected" : ""}${available ? "" : " disabled"}>${escapeHtml(label)}</option>`;
    }).join("");
    return `
                <span class="cro-bxgy__select">
                    <select class="cro-bxgy__select-input" aria-label="${escapeHtml(`${firstOption?.name || "Variant"}, ${title}`)}" data-action="pick-variant" data-role="${role}" data-index="${index}" data-option="0">${choices}</select>
                    ${caretIcon}
                </span>
            `;
  }
  const isOpen = Boolean(picker.editor);
  return `
            <span class="cro-bxgy__select">
                <select class="cro-bxgy__select-input" aria-label="${escapeHtml(`Options, ${title}`)}" title="${escapeHtml(picker.selectedLabel)}" aria-haspopup="dialog" aria-expanded="${isOpen}" data-action="open-editor" data-role="${role}" data-index="${index}" data-popover-trigger>
                    <option selected>${escapeHtml(picker.selectedLabel)}</option>
                </select>
                ${caretIcon}
                ${isOpen ? renderPopover(ctx, card) : ""}
            </span>
        `;
};
const renderStepper = ({ role, index, draftQuantity, remaining }) => `
            <span class="cro-bxgy__stepper">
                <button type="button" class="cro-bxgy__step" aria-label="Decrease quantity" data-action="step" data-role="${role}" data-index="${index}" data-delta="-1"${draftQuantity <= 1 ? " disabled" : ""}>${minusIcon}</button>
                <span class="cro-bxgy__step-value">${draftQuantity}</span>
                <button type="button" class="cro-bxgy__step" aria-label="Increase quantity" data-action="step" data-role="${role}" data-index="${index}" data-delta="1"${draftQuantity >= remaining ? " disabled" : ""}>${plusIcon}</button>
            </span>
        `;
const addItemsLabel = (ctx, { soldOut, remaining, pickedUnits: pickedUnits2 }) => {
  if (soldOut) return ctx.text("itemSoldOutText");
  if (pickedUnits2 > 0 && remaining < 1) return ctx.text("itemAddedText");
  if (pickedUnits2 > 0) return ctx.text("itemAddMoreText", { remaining });
  return ctx.text("itemAddText");
};
const renderAddItemsButton = (ctx, card) => {
  const { role, index, canAdd } = card;
  const label = addItemsLabel(ctx, card);
  if (!label) return "";
  return `
            <button type="button" class="cro-bxgy__add" data-action="add-items" data-role="${role}" data-index="${index}"${canAdd ? "" : " disabled"}>
                <span class="cro-bxgy__add-label">${escapeHtml(label)}</span>
                ${plusIcon}
            </button>
        `;
};
const renderPickedLines = (ctx, { role, index, lines }) => {
  if (!lines.length) return "";
  const rows = lines.map((line) => {
    const label = line.variantLabel ? `${line.variantLabel} × ${line.quantity}` : ctx.text("pickedLineDefaultText", { quantity: line.quantity });
    const removeLabel = `${ctx.text("itemRemoveText")} ${line.itemLabel}`.trim();
    return `
                <li class="cro-bxgy__picked-line">
                    <span class="cro-bxgy__picked-label">${escapeHtml(label)}</span>
                    <button type="button" class="cro-bxgy__picked-remove" aria-label="${escapeHtml(removeLabel)}" data-action="remove-line" data-role="${role}" data-index="${index}" data-variant-id="${escapeHtml(line.variantId)}">${removeIcon}</button>
                </li>
            `;
  }).join("");
  return `<ul class="cro-bxgy__picked">${rows}</ul>`;
};
const renderLockBadge = (ctx) => `
            <span class="cro-bxgy__lock-badge">
                ${lockIcon}
                <span>${escapeHtml(ctx.text("rewardLockedText"))}</span>
            </span>
        `;
const renderProgressBar = (ctx, progress) => {
  if (!progress) return "";
  if (ctx.settings.showProgressBar === false) return "";
  const { type, current, target, percent } = progress;
  const labelText = ctx.text("progressLabelText");
  const labelCount = type === "spend" ? ctx.text("progressSpendCountText", { currentAmount: ctx.money(current), targetAmount: ctx.money(target), percent }) : ctx.text("progressCountText", { currentCount: current, maxTriggerCount: target, percent });
  const showTrack = ctx.settings.showProgressTrack !== false;
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
};
const renderSavings = (ctx, { discount, percent }) => {
  if (discount <= 0) return "";
  const template = ctx.template("footerSavingsText");
  const replacements = { amount: ctx.money(discount), percent };
  const fill = (text) => fillTextTemplate(text, replacements);
  const highlightStart = template.indexOf("{{");
  const leading = highlightStart === -1 ? template : template.slice(0, highlightStart);
  const highlighted = highlightStart === -1 ? "" : template.slice(highlightStart);
  return `
            <p class="cro-bxgy__savings">
                ${escapeHtml(fill(leading))}${highlighted ? `<strong class="cro-bxgy__savings-value">${escapeHtml(fill(highlighted))}</strong>` : ""}
            </p>
        `;
};
const ctaLabel = (ctx, cta) => {
  if (cta.status === "unavailable") return ctx.text("ctaUnavailableText");
  if (cta.submitState === "adding") return ctx.text("ctaAddingText");
  if (cta.submitState === "success") return ctx.text("ctaAddedText");
  if (cta.status === "spend") return ctx.text("ctaSpendText", { amount: ctx.money(cta.remainingAmount) });
  if (cta.status === "locked") return ctx.text("ctaLockedText", { remaining: cta.remainingCount });
  if (cta.status === "pickReward") return ctx.text("ctaPickRewardText");
  return ctx.text("ctaText", { total: ctx.money(cta.total) });
};
const renderSubmitNotice = (submit) => {
  if (submit?.state !== "error" || !submit.message) return "";
  return `<p class="cro-bxgy__notice" role="alert">${escapeHtml(submit.message)}</p>`;
};
const renderFooter = (ctx, { totals, cta, submit }) => {
  const totalLabel = ctx.text("footerSummaryText", { count: totals.itemCount });
  return `
            <div class="cro-bxgy__footer">
                <div class="cro-bxgy__total">
                    <span class="cro-bxgy__total-label">${escapeHtml(totalLabel)}</span>
                    <span class="cro-bxgy__total-price">
                        ${totals.discount > 0 ? `<s class="cro-bxgy__total-was">${escapeHtml(ctx.money(totals.subtotal))}</s>` : ""}
                        <strong class="cro-bxgy__total-now">${escapeHtml(ctx.money(totals.total))}</strong>
                    </span>
                </div>
                ${renderSavings(ctx, totals)}
                <button type="button" class="cro-bxgy__cta" data-action="submit-offer"${cta.disabled ? " disabled" : ""}${cta.busy ? ' aria-busy="true"' : ""}>${escapeHtml(ctaLabel(ctx, cta))}</button>
                ${renderSubmitNotice(submit)}
            </div>
        `;
};
const renderSkeletonCards = (role, itemCount) => {
  const cardCount = Math.min(SKELETON_CARDS_PER_GROUP, itemCount);
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
};
const positionEditor = (root) => {
  const popover = root.querySelector(".cro-bxgy__popover");
  const section = root.querySelector(".cro-bxgy");
  if (!popover || !section) return;
  popover.style.removeProperty("--cro-pop-shift");
  const margin = 8;
  const sectionRect = section.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const overflowRight = popoverRect.right - (sectionRect.right - margin);
  const overflowLeft = sectionRect.left + margin - popoverRect.left;
  if (overflowRight > 0) popover.style.setProperty("--cro-pop-shift", `${-overflowRight}px`);
  else if (overflowLeft > 0) popover.style.setProperty("--cro-pop-shift", `${overflowLeft}px`);
};
const renderUnavailableCard = (ctx, { role, mode, title, quantity }) => {
  const isReward = role === "reward";
  const label = ctx.text("itemUnavailableText");
  const showQuantityBadge = ctx.settings.showItemQuantityBadge !== false;
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
};
const renderTriggerCard = (ctx, card) => {
  if (card.status === "missing") return renderUnavailableCard(ctx, card);
  const variantPicker = renderVariantPicker(ctx, card);
  const controls = card.mode === "fixed" ? variantPicker : `
                ${variantPicker ? `<div class="cro-bxgy__variant-row">${variantPicker}</div>` : ""}
                <div class="cro-bxgy__action-row">
                    ${renderStepper(card)}
                    ${renderAddItemsButton(ctx, card)}
                </div>
                ${renderPickedLines(ctx, card)}
            `;
  return `
            <article class="cro-bxgy__card"${card.pending ? ' aria-busy="true"' : ""}>
                <div class="cro-bxgy__media">
                    ${renderProductImage(card)}
                    ${renderQuantityBadge(ctx, card)}
                </div>
                <div class="cro-bxgy__card-body">
                    ${renderProductName(card)}
                    ${ctx.settings.showItemPrice !== false ? renderTriggerPrice(ctx, card) : ""}
                    ${controls}
                </div>
            </article>
        `;
};
const renderTrigger = (ctx, trigger) => {
  if (!trigger) return "";
  return `
            <div class="cro-bxgy__trigger cro-bxgy__trigger--${trigger.mode}">
                ${trigger.cards.map((card) => renderTriggerCard(ctx, card)).join("")}
            </div>
        `;
};
const renderRewardCard = (ctx, card) => {
  if (card.status === "missing") return renderUnavailableCard(ctx, card);
  const { quantity, mode } = card;
  const giftTag = ctx.text("giftTagText");
  const variantPicker = renderVariantPicker(ctx, card);
  const hasQuantityControls = variantPicker !== "" || quantity > 1;
  const controls = mode === "fixed" ? variantPicker ? `<div class="cro-bxgy__reward-controls">${variantPicker}</div>` : "" : `
            <div class="cro-bxgy__reward-controls">
                ${variantPicker ? `<div class="cro-bxgy__variant-row">${variantPicker}</div>` : ""}
                <div class="cro-bxgy__action-row">
                    ${hasQuantityControls ? renderStepper(card) : ""}
                    ${renderAddItemsButton(ctx, card)}
                </div>
                ${renderPickedLines(ctx, card)}
            </div>
        `;
  return `
            <article class="cro-bxgy__reward-card cro-bxgy__reward-card--${mode}"${card.pending ? ' aria-busy="true"' : ""}>
                <div class="cro-bxgy__reward-media">
                    ${renderProductImage(card)}
                    ${renderQuantityBadge(ctx, card)}
                </div>
                <div class="cro-bxgy__reward-body">
                    ${giftTag ? `<span class="cro-bxgy__gift-tag">${escapeHtml(giftTag)}</span>` : ""}
                    <div class="cro-bxgy__reward-info">
                        ${renderProductName(card)}
                        ${ctx.settings.showItemPrice !== false ? renderRewardPrice(ctx, card) : ""}
                    </div>
                    ${controls}
                </div>
            </article>
        `;
};
const renderRewardCount = (ctx, pickCount) => {
  if (!pickCount) return "";
  const text = ctx.text("rewardCountText", pickCount);
  return text ? `<span class="cro-bxgy__reward-count">${escapeHtml(text)}</span>` : "";
};
const renderReward = (ctx, reward, isLocked) => {
  if (!reward) return "";
  const label = ctx.text("rewardLabel");
  const lockBadge = isLocked ? renderLockBadge(ctx) : "";
  const rewardCount = renderRewardCount(ctx, reward.pickCount);
  return `
            <div class="cro-bxgy__reward cro-bxgy__reward--${reward.mode}${isLocked ? " cro-bxgy__reward--locked" : ""}">
                ${label || lockBadge || rewardCount ? `
                    <div class="cro-bxgy__reward-head">
                        <div class="cro-bxgy__reward-title">
                            ${label ? `<span class="cro-bxgy__reward-label">${escapeHtml(label)}</span>` : ""}
                            ${lockBadge}
                            ${rewardCount}
                        </div>
                    </div>
                ` : ""}
                <div class="cro-bxgy__reward-list">
                    ${reward.cards.map((card) => renderRewardCard(ctx, card)).join("")}
                </div>
            </div>
        `;
};
const render = (ctx, view) => `
            <section class="cro-bxgy">
                ${renderHeader(ctx, { showDivider: view.trigger?.type === "fixed" })}
                ${renderProgressBar(ctx, view.progress)}
                <div class="cro-bxgy__body">
                    ${renderTrigger(ctx, view.trigger)}
                    ${renderReward(ctx, view.reward, view.isLocked)}
                </div>
                ${renderFooter(ctx, view)}
            </section>
        `;
const renderSkeleton = (ctx, view) => `
            <section class="cro-bxgy" aria-busy="true">
                ${renderHeader(ctx, { showDivider: view.trigger.type === "fixed" })}
                <div class="cro-bxgy__body">
                    <div class="cro-bxgy__trigger">${renderSkeletonCards("trigger", view.trigger.itemCount)}</div>
                    <div class="cro-bxgy__reward-list">${renderSkeletonCards("reward", view.reward.itemCount)}</div>
                </div>
            </section>
        `;
const classicLayout = {
  render,
  renderSkeleton,
  afterRender: (root) => positionEditor(root)
};
const LAYOUTS = {
  classic: classicLayout
};
const DEFAULT_LAYOUT = "classic";
const resolveLayout = (name) => LAYOUTS[name] || LAYOUTS[DEFAULT_LAYOUT];
const showEcomposerToast = (message, status) => {
  const ecomposer = window.EComposer;
  if (typeof ecomposer?.showToast !== "function") return false;
  try {
    ecomposer.showToast(message, status);
    return true;
  } catch (error) {
    console.error("[cro-bxgy] EComposer toast failed:", error);
    return false;
  }
};
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
  ctaAddingText: "Adding to cart…",
  ctaAddedText: "Added to cart",
  addToCartErrorText: "We couldn't add this offer to your cart. Please try again.",
  chooseOptionsErrorText: "Please choose an option for every item.",
  repeatLimitErrorText: "You've reached the limit for this offer in your cart.",
  rewardLockedText: "Locked",
  itemAddText: "Add items",
  itemAddMoreText: "Add {{remaining}} More",
  itemAddedText: "Added",
  itemRemoveText: "Remove",
  itemSoldOutText: "Sold out",
  itemUnavailableText: "Unavailable",
  rewardCountText: "{{selected}} of {{max}} selected",
  closeText: "Close",
  variantApplyText: "Apply",
  pickedLineDefaultText: "{{quantity}} added",
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
const hasCampaignData = (data) => Boolean(data?.campaign || data?.candidates?.length);
const SUBMIT_RESET_MS = 3e3;
const toCandidates = (data) => {
  if (Array.isArray(data?.candidates)) return data.candidates.filter((candidate) => candidate?.campaign);
  if (!data?.campaign) return [];
  return [{ campaign: data.campaign, settings: data.settings, styles: data.styles, variantMap: data.variantMap }];
};
class CroBxgyWidget extends (isBrowser ? HTMLElement : class {
}) {
  constructor() {
    super();
    this.store = createStore();
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
        if (this.isConnected && hasCampaignData(this.embeddedData)) this.render();
      });
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if ((name === "widget-data" || name === "widgetdata") && oldValue !== newValue) {
      this._dataCache = null;
      this.store = createStore();
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
    if (hasCampaignData(data)) this._dataCache = data;
    return data;
  }
  get _hasProvidedProducts() {
    return Array.isArray(this._resolvedWidgetData?.products);
  }
  get _loadState() {
    if (this._hasProvidedProducts || this.isBuilderMode || this.store.loadedProducts) return "ready";
    return "loading";
  }
  _loadProducts() {
    const { store } = this;
    const candidates = this.candidates;
    if (store.loadingCampaign === candidates) return;
    store.loadingCampaign = candidates;
    loadBxgyOffer(candidates, this.storefrontToken).catch((error) => {
      console.error("[cro-bxgy] loading the offer failed:", error);
      return { candidateIndex: -1, products: [] };
    }).then(({ candidateIndex, products }) => {
      if (this.store !== store || store.loadingCampaign !== candidates) return;
      store.candidateIndex = candidateIndex;
      store.loadedProducts = products;
      store.productMap = null;
      if (this.isConnected) this.render();
    });
  }
  get candidates() {
    if (this._candidatesSource !== this._resolvedWidgetData) {
      this._candidatesSource = this._resolvedWidgetData;
      this._candidates = toCandidates(this._resolvedWidgetData);
    }
    return this._candidates;
  }
  get activeCandidate() {
    return this.candidates[Math.max(0, this.store.candidateIndex ?? 0)] ?? null;
  }
  get _hasNoFulfillableOffer() {
    const data = this._resolvedWidgetData;
    return this.store.candidateIndex === -1 && !this.isBuilderMode && !data?.designMode;
  }
  get routesRoot() {
    return isBrowser ? window.Shopify?.routes?.root || "/" : "/";
  }
  get currencyRate() {
    return isBrowser ? window.CRO_HUB?.currencyRate ?? 1 : 1;
  }
  get currencyDecimals() {
    const currency = isBrowser ? window.Shopify?.currency?.active : null;
    if (!currency) return null;
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    } catch {
      return null;
    }
  }
  get storefrontToken() {
    return this._resolvedWidgetData?.storefrontToken ?? null;
  }
  requestVariantDetail(product, variant, needsStock = false) {
    const { store } = this;
    if (store.variantRequests.has(variant.key)) return;
    store.variantRequests.set(variant.key, loadVariantDetail(product, variant, needsStock ? this.storefrontToken : null).then((detail) => {
      if (this.store !== store) return;
      store.variantDetails.set(variant.key, detail);
      if (!this.isConnected) return;
      const { action, role, index } = this.shadowRoot.activeElement?.dataset ?? {};
      this.render();
      if (action) this._restoreFocus([`[data-action="${action}"][data-role="${role}"][data-index="${index}"]`]);
    }));
  }
  get campaign() {
    return this.activeCandidate?.campaign ?? null;
  }
  get products() {
    if (this._hasProvidedProducts) return this._resolvedWidgetData.products;
    return this.store.loadedProducts ?? [];
  }
  get settings() {
    return this.activeCandidate?.settings ?? {};
  }
  get styleSettings() {
    return this.activeCandidate?.styles ?? {};
  }
  get layout() {
    return resolveLayout(this.settings.layout);
  }
  get renderContext() {
    return {
      settings: this.settings,
      text: (name, replacements) => this._text(name, replacements),
      template: (name) => resolveLocaleValue(this.settings[name], DEFAULT_TEXT[name]),
      money: (cents) => formatMoney(this, cents)
    };
  }
  _text(name, replacements = {}) {
    return resolveTextTemplate(this.settings[name], replacements, DEFAULT_TEXT[name]).trim();
  }
  _handleChange(event) {
    const input = event.target.closest?.("[data-action='pick-variant'], [data-action='draft-variant']");
    if (!input) return;
    const { action, role, index, option } = input.dataset;
    const isDrafting = action === "draft-variant" && Boolean(this.store.editor);
    changeVariantOption(this, role, Number(index), Number(option), input.value, isDrafting);
    this.render();
    this._restoreFocus([
      `[data-action="pick-variant"][data-role="${role}"][data-index="${index}"][data-option="${option}"]`,
      `[data-action="draft-variant"][data-role="${role}"][data-index="${index}"][data-option="${option}"]:checked`
    ]);
  }
  _handleClick(event) {
    const target = event.target.closest?.("[data-action]");
    if (!target || target.disabled) return;
    if (this.layout.handleClick?.(event, this)) return;
    const { action, role, index, delta, variantId } = target.dataset;
    const cardSelector = `[data-role="${role}"][data-index="${index}"]`;
    const focusSelectors = [];
    if (action === "open-editor") {
      openEditor(this, role, index);
      focusSelectors.push(`[data-action="draft-variant"]${cardSelector}:checked`);
    } else if (action === "apply-editor") {
      if (applyEditor(this, role, Number(index))) focusSelectors.push(`[data-action="open-editor"]${cardSelector}`);
    } else if (action === "close-editor") {
      closeEditor(this);
      focusSelectors.push(`[data-action="open-editor"]${cardSelector}`);
    } else if (action === "step") {
      stepDraftQuantity(this, role, Number(index), Number(delta));
      focusSelectors.push(`[data-action="step"][data-delta="${delta}"]${cardSelector}`);
    } else if (action === "add-items") {
      const addedLine = addItems(this, role, Number(index));
      if (addedLine) {
        this._announce(this._text("itemAddedAnnouncement", {
          quantity: addedLine.quantity,
          item: lineItemLabel(this, role, Number(index), addedLine.variantId)
        }));
        focusSelectors.push(`[data-action="add-items"]${cardSelector}`, `[data-action="remove-line"][data-variant-id="${addedLine.variantId}"]${cardSelector}`);
      }
    } else if (action === "submit-offer") {
      this._submitOffer();
      return;
    } else if (action === "remove-line") {
      const removedLine = removeLine(this, role, Number(index), variantId);
      if (removedLine) {
        this._announce(this._text("itemRemovedAnnouncement", { item: lineItemLabel(this, role, Number(index), variantId) }));
      }
    } else {
      return;
    }
    this.render();
    this._restoreFocus([...focusSelectors, `[data-action="add-items"]${cardSelector}`, `[data-action="remove-line"]${cardSelector}`]);
  }
  _setSubmitState(state, message = "") {
    const { store } = this;
    const isToastShown = state === "error" && Boolean(message) && showEcomposerToast(message, "error");
    store.submit = { state, message: isToastShown ? "" : message };
    clearTimeout(this._submitResetTimer);
    this._submitResetTimer = state === "success" || state === "error" ? setTimeout(() => {
      if (this.store !== store) return;
      store.submit = { state: "idle", message: "" };
      if (this.isConnected) this.render();
    }, SUBMIT_RESET_MS) : null;
    if (this.isConnected) this.render();
  }
  get _isPreview() {
    return this.isBuilderMode || this._hasProvidedProducts || Boolean(this._resolvedWidgetData?.designMode);
  }
  async _submitOffer() {
    const { store, campaign } = this;
    const { cta } = buildOfferView(this);
    if (!campaign || store.submit.state === "adding" || cta.disabled || cta.busy) return;
    if (this._isPreview) {
      this._setSubmitState("success");
      return;
    }
    const selections = collectCartSelections(this);
    const lines = selections ? buildBxgyCartLines(selections, { campaignId: campaign.id, bundleId: newBundleInstanceId() }) : null;
    if (!lines?.length) {
      this._setSubmitState("error", this._text("chooseOptionsErrorText"));
      return;
    }
    this._setSubmitState("adding");
    const root = window.Shopify?.routes?.root || "/";
    if (campaign.repeatLimit?.enabled) {
      const cart2 = await fetchCart(root);
      if (cart2 && countBxgyBundlesInCart(cart2.items, campaign.id, campaign.parentProduct?.variantId) >= Number(campaign.repeatLimit.max)) {
        this._setSubmitState("error", this._text("repeatLimitErrorText"));
        return;
      }
    }
    const result = await addBxgyLinesToCart(root, lines);
    if (this.store !== store) return;
    if (!result.ok) {
      this._setSubmitState("error", result.message || this._text("addToCartErrorText"));
      return;
    }
    clearPickedLines(this);
    const cart = await fetchCart(root);
    notifyThemeCartUpdated(result.body, cart?.item_count ?? result.body?.item_count ?? 0);
    this._setSubmitState("success");
    openCartAfterAdd(root, result.body?.items?.[0]);
  }
  _handleKeydown(event) {
    if (event.key === "Escape" && this.store.editor) {
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
    const { role, index } = this.store.editor;
    closeEditor(this);
    this.render();
    this._restoreFocus([`[data-action="open-editor"][data-role="${role}"][data-index="${index}"]`]);
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
  get styles() {
    const tokens = this.styleSettings.tokens ?? {};
    const declarations = STYLE_TOKENS.map(([token, cssVar, fallback]) => {
      const value = tokens[token];
      const isValid = value !== void 0 && value !== null && String(value).trim() !== "";
      return `${cssVar}: ${isValid ? value : fallback};`;
    }).join("\n    ");
    const customCss = String(this.styleSettings.custom_css || "").replace(/<\/style/gi, "");
    const layoutStyles = this.layout.styles ? `
${this.layout.styles}` : "";
    return `<style>${bxgyStyles}${layoutStyles}
.cro-bxgy {
    ${declarations}
}</style>${customCss ? `<style>${customCss}</style>` : ""}`;
  }
  render() {
    const { styles, layout } = this;
    const emptyState = this.isBuilderMode ? `${styles}${renderEmptyState()}` : "";
    if (!this.campaign || this._hasNoFulfillableOffer) {
      this._content.innerHTML = emptyState;
      return;
    }
    if (this._loadState === "loading") {
      this._loadProducts();
      this._content.innerHTML = "";
      return;
    }
    if (!productIndexOf(this).size) {
      this._content.innerHTML = emptyState;
      return;
    }
    this._content.innerHTML = `${styles}${layout.render(this.renderContext, buildOfferView(this))}`;
    layout.afterRender?.(this._content, this);
  }
}
if (isBrowser && !customElements.get("cro-bxgy-bundle-widget")) {
  customElements.define("cro-bxgy-bundle-widget", CroBxgyWidget);
}
export {
  CroBxgyWidget as default
};
