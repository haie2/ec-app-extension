const productCardStyles = "/* Shared product card styles for BaseWidget.renderProductCard/renderVariantSelector/\n   renderProductQuickView/renderPendingQtyStepper — moved out of\n   CroMixMatchBundleWidget.css so any widget extending BaseWidget can reuse the\n   same card/variant-selector/quickview markup+styles. */\n\n.cro-card {\n    display: flex;\n    flex-direction: column;\n    border: var(--cro-card-border-width, 1px) solid var(--cro-card-border, #eaeaea);\n    border-radius: var(--cro-card-radius, 12px);\n    background: var(--cro-card-bg, #fff);\n    box-shadow: var(--cro-card-shadow, none);\n    container-type: inline-size;\n}\n\n.cro-card--horizontal {\n    flex-direction: row;\n}\n\n/* Clip only the media, not the whole card — an ancestor\n   overflow:hidden would also clip the variant popover menu\n   (position:absolute, see .cro-card-variant-popover-menu). */\n.cro-card-media {\n    position: relative;\n    aspect-ratio: var(--cro-card-media-ratio, 1/1);\n    overflow: hidden;\n    border-radius: calc(var(--cro-card-radius, 12px) - 1px) calc(var(--cro-card-radius, 12px) - 1px) 0 0;\n    padding: var(--cro-card-media-padding, 0);\n    box-sizing: border-box;\n}\n\n/* Inset from the card edges — matching `.cro-card-body`'s padding — instead of\n   bleeding into the border the way the vertical layout's full-width media does. */\n.cro-card--horizontal .cro-card-media {\n    width: 96px;\n    height: 96px;\n    aspect-ratio: 1/1;\n    flex-shrink: 0;\n    align-self: flex-start;\n    margin: 12px 0 12px 12px;\n    border-radius: calc(var(--cro-card-radius, 12px) - 4px);\n}\n\n.cro-card-media img {\n    display: block;\n    width: 100%;\n    height: var(--cro-card-media-img-height, 100%);\n    object-fit: var(--cro-card-media-fit, cover);\n}\n\n.cro-card-media-hover {\n    position: absolute;\n    inset: 0;\n    opacity: 0;\n    transition: opacity .2s ease;\n}\n\n.cro-card:hover .cro-card-media-hover {\n    opacity: 1;\n}\n\n.cro-card-flag {\n    position: absolute;\n    top: 8px;\n    left: 8px;\n    padding: 2px 8px;\n    border-radius: 999px;\n    background: var(--cro-card-badge-bg, #111);\n    color: var(--cro-card-badge-text, #fff);\n    font-size: 10px;\n    font-weight: 650;\n}\n\n.cro-card-flag--soldout {\n    border-radius: 4px;\n    background: var(--cro-card-soldout-bg, #6b6257);\n    color: var(--cro-card-soldout-text, #fff);\n}\n\n.cro-card-flag--sale {\n    border-radius: 4px;\n    background: var(--cro-card-sale-bg, #c0392b);\n    color: var(--cro-card-sale-text, #fff);\n}\n\n.cro-card-quickview {\n    position: absolute;\n    top: 50%;\n    left: 50%;\n    transform: translate(-50%, -50%);\n    width: 28px;\n    height: 28px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    border: none;\n    border-radius: 999px;\n    background: #fff;\n    color: #171717;\n    cursor: pointer;\n    box-shadow: 0 1px 4px rgba(0, 0, 0, .2);\n    opacity: 0;\n    transition: opacity .15s ease;\n}\n\n/* Kept in the layout (only faded out) so revealing it on hover doesn't shift\n   anything; `:focus-visible` keeps it reachable by keyboard. */\n.cro-card:hover .cro-card-quickview,\n.cro-card-quickview:focus-visible {\n    opacity: 1;\n}\n\n/* Touch devices have no hover state — the button would never appear. */\n@media (hover: none) {\n    .cro-card-quickview {\n        opacity: 1;\n    }\n}\n\n.cro-card-quickview-overlay {\n    position: fixed;\n    inset: 0;\n    z-index: 20;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: rgba(0, 0, 0, .5);\n    padding: 52px 16px 16px;\n}\n\n/* Shown via showPopover() so it lands in the browser's top layer — a theme\n   ancestor with its own z-index (a stacking context) otherwise traps the\n   overlay below the theme's sticky header. These reset the UA popover box. */\n.cro-card-quickview-overlay[popover] {\n    width: auto;\n    height: auto;\n    max-width: none;\n    max-height: none;\n    margin: 0;\n    border: 0;\n    overflow: visible;\n    color: inherit;\n}\n\n.cro-card-quickview-wrap {\n    position: relative;\n    width: 100%;\n    max-width: 760px;\n    max-height: 100%;\n}\n\n.cro-card-quickview-modal {\n    display: flex;\n    flex-direction: column;\n    width: 100%;\n    max-height: 90vh;\n    overflow: hidden;\n    background: #fff;\n    border-radius: 14px;\n    padding: 20px;\n}\n\n.cro-card-quickview-close {\n    position: absolute;\n    top: -30px;\n    right: -30px;\n    width: 28px;\n    height: 28px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    border: none;\n    border-radius: 999px;\n    background: #fff;\n    color: #171717;\n    cursor: pointer;\n    box-shadow: 0 1px 4px rgba(0, 0, 0, .25);\n}\n\n.cro-card-quickview-layout {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: 20px;\n    flex: 1;\n    min-height: 0;\n}\n\n@container (max-width:480px) {\n    .cro-card-quickview-layout {\n        grid-template-columns: 1fr;\n    }\n\n    /* Below 480px the wrap spans almost the full viewport width, so the\n       button's -30px offset pushes it past the screen edge — clipped to a\n       sliver that reads as a \"›\" instead of \"✕\". Pull it inside the modal\n       instead of floating above it. */\n    .cro-card-quickview-overlay {\n        padding: 16px;\n    }\n\n    .cro-card-quickview-close {\n        top: 8px;\n        right: 8px;\n        background: rgba(255, 255, 255, .92);\n    }\n}\n\n.cro-card-quickview-gallery {\n    min-width: 0;\n    overflow-y: auto;\n}\n\n.cro-card-quickview-media {\n    aspect-ratio: 1/1;\n    border-radius: 10px;\n    overflow: hidden;\n    background: #f4f4f4;\n}\n\n.cro-card-quickview-media img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.cro-card-quickview-thumbs {\n    display: flex;\n    gap: 8px;\n    margin-top: 8px;\n    overflow-x: auto;\n    min-width: 0;\n}\n\n.cro-card-quickview-thumb {\n    flex-shrink: 0;\n    width: 48px;\n    height: 48px;\n    padding: 0;\n    border: 2px solid transparent;\n    border-radius: 8px;\n    overflow: hidden;\n    background: #f4f4f4;\n    cursor: pointer;\n}\n\n.cro-card-quickview-thumb.is-active {\n    border-width: 1px;\n    border-color: #bbb;\n}\n\n.cro-card-quickview-thumb img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.cro-card-quickview-body {\n    display: flex;\n    flex-direction: column;\n    min-width: 0;\n    min-height: 0;\n}\n\n.cro-card-quickview-scroll {\n    flex: 1;\n    min-height: 0;\n    overflow-y: auto;\n}\n\n.cro-card-quickview-title {\n    font-size: 16px;\n    font-weight: 650;\n    margin-bottom: 6px;\n}\n\n.cro-card-quickview-rating {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n    font-size: 13px;\n    color: #444;\n    margin-bottom: 8px;\n}\n\n.cro-card-quickview-rating-star {\n    color: #e5a134;\n}\n\n.cro-card-quickview-rating-count {\n    color: #767676;\n}\n\n.cro-card-quickview-price-row {\n    display: flex;\n    align-items: baseline;\n    gap: 8px;\n    margin-bottom: 10px;\n}\n\n.cro-card-quickview-price {\n    font-size: 15px;\n    font-weight: 600;\n}\n\n.cro-card-quickview-compare {\n    font-size: 13px;\n    color: #9a9a9a;\n    text-decoration: line-through;\n}\n\n.cro-card-quickview-soldout {\n    font-size: 12px;\n    color: #c0392b;\n    margin-bottom: 10px;\n}\n\n.cro-card-quickview-description {\n    display: -webkit-box;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 5;\n    overflow: hidden;\n    font-size: 13px;\n    line-height: 1.5;\n    color: #444;\n    margin-bottom: 4px;\n    white-space: pre-line;\n}\n\n.cro-card-quickview-description.is-expanded {\n    display: block;\n    -webkit-line-clamp: unset;\n    overflow: visible;\n}\n\n.cro-card-quickview-description-toggle {\n    display: block;\n    margin-bottom: 12px;\n    padding: 0;\n    border: none;\n    background: none;\n    color: #111;\n    font-size: 12px;\n    font-weight: 650;\n    text-decoration: underline;\n    cursor: pointer;\n}\n\n.cro-card-quickview-add-row {\n    flex-shrink: 0;\n    display: flex;\n    align-items: stretch;\n    gap: 8px;\n    min-height: 38px;\n    margin-top: 12px;\n    padding-top: 12px;\n    border-top: 1px solid #eee;\n}\n\n.cro-card-quickview-add-row .cro-card-add {\n    min-height: 38px;\n}\n\n.cro-card-body {\n    display: flex;\n    flex: 1;\n    flex-direction: column;\n    gap: 8px;\n    padding: 12px;\n}\n\n.cro-card-vendor {\n    font-size: 11px;\n    font-weight: 600;\n    letter-spacing: .02em;\n    text-transform: uppercase;\n    color: #767676;\n}\n\n/* `--cro-card-title-lines` unset means no clamp — the fallback is high enough\n   that the -webkit-box never truncates a real product title. */\n.cro-card-title {\n    display: -webkit-box;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: var(--cro-card-title-lines, 99);\n    line-clamp: var(--cro-card-title-lines, 99);\n    overflow: hidden;\n    font-size: 14px;\n    font-weight: 650;\n}\n\n.cro-card-price {\n    display: flex;\n    align-items: baseline;\n    gap: 6px;\n    font-size: 13px;\n    color: #444;\n}\n\n.cro-card-compare {\n    font-size: 12px;\n    color: var(--cro-card-compare-color, #616161);\n    text-decoration: line-through;\n}\n\n.cro-card-savings {\n    margin-top: 2px;\n    font-size: 12px;\n    font-weight: 650;\n    color: var(--cro-card-savings-color, #c0392b);\n}\n\n.cro-card-rating {\n    font-size: 12px;\n    color: #e0a000;\n}\n\n.cro-card-rating-count {\n    color: #767676;\n}\n\n.cro-card-variant {\n    height: 38px;\n    padding: 0 26px 0 8px;\n    background-color: var(--cro-card-variant-bg, #fff);\n    background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23767676' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\");\n    background-repeat: no-repeat;\n    background-position: right 8px center;\n    background-size: 14px;\n    color: var(--cro-card-variant-color, #241f1a);\n    font-size: 12px;\n    border: var(--cro-card-variant-border-width, 1px) solid var(--cro-card-variant-border-color, #ddd);\n    border-radius: var(--cro-card-variant-radius, 6px);\n    appearance: none;\n    -webkit-appearance: none;\n    cursor: pointer;\n}\n\n.cro-card-variant-options {\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n}\n\n.cro-card-variant-option-row {\n    display: flex;\n    flex-direction: column;\n    gap: 3px;\n}\n\n.cro-card-variant-option-name {\n    font-size: 10px;\n    font-weight: 650;\n    color: var(--cro-card-option-name-color, #616161);\n    text-transform: uppercase;\n    letter-spacing: .03em;\n}\n\n.cro-card-variant-pills {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 4px;\n}\n\n.cro-card-variant-pill {\n    padding: 4px 9px;\n    border: var(--cro-card-variant-border-width, 1px) solid var(--cro-card-variant-border-color, #ddd);\n    border-radius: var(--cro-card-variant-radius, 6px);\n    font-size: 11px;\n    font-weight: 600;\n    background: var(--cro-card-variant-bg, #f2f2f2);\n    color: var(--cro-card-variant-color, #444);\n    cursor: pointer;\n}\n\n.cro-card-variant-pill.is-active {\n    background: var(--cro-card-variant-active-bg, #111);\n    border-color: var(--cro-card-variant-active-bg, #111);\n    color: var(--cro-card-variant-active-color, #fff);\n}\n\n.cro-card-variant-popover-wrap {\n    position: relative;\n}\n\n.cro-card-variant-popover {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 6px;\n    height: 38px;\n    padding: 0 8px;\n    background: var(--cro-card-variant-bg, #fff);\n    border: var(--cro-card-variant-border-width, 1px) solid var(--cro-card-variant-border-color, #ddd);\n    border-radius: var(--cro-card-variant-radius, 6px);\n    font-size: 14px;\n    color: var(--cro-card-variant-color, #241f1a);\n    cursor: pointer;\n}\n\n.cro-card-variant-popover span:first-child {\n    overflow: hidden;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    min-width: 0;\n}\n\n.cro-card-variant-popover-caret {\n    display: flex;\n    flex-shrink: 0;\n    color: #767676;\n}\n\n.cro-card-variant-popover-menu {\n    position: absolute;\n    top: calc(100% + 4px);\n    left: 0;\n    z-index: 6;\n    min-width: 170px;\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    padding: 8px;\n    background: #fff;\n    border: 1px solid #e0ddd7;\n    border-radius: 10px;\n    box-shadow: 0 10px 26px rgba(36, 31, 26, .16);\n}\n\n.cro-card-add-row {\n    margin-top: auto;\n    display: flex;\n    align-items: stretch;\n    gap: 8px;\n    min-height: 38px;\n}\n\n/* Below this card width there isn't room for the qty stepper and the Add\n   button side by side without either getting cramped — stack them instead.\n   `align-items: stretch` above then stretches the qty stepper (no explicit\n   width of its own) to the row's full width; its grid columns switch to `fr`\n   so the −/qty/+ cells spread out evenly across that width instead of\n   leaving blank space after their fixed px sizes. */\n@container (max-width: 210px) {\n    .cro-card-add-row {\n        flex-direction: column;\n    }\n\n    .cro-card-add-row .cro-card-qty {\n        grid-template-columns: 1fr 1fr 1fr;\n    }\n}\n\n.cro-card-add {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    flex: 1 1 auto;\n    height: 38px;\n    padding: 0 8px;\n    border: var(--cro-card-add-border-width, 0) solid var(--cro-card-add-border-color, transparent);\n    border-radius: var(--cro-card-add-radius, 8px);\n    box-shadow: var(--cro-card-add-shadow, none);\n    background: var(--cro-card-add-bg, #111);\n    color: var(--cro-card-add-text, #fff);\n    line-height: 1;\n    cursor: pointer;\n}\n\n.cro-card-add:not(:disabled):hover {\n    background: var(--cro-card-add-hover-bg, var(--cro-card-add-bg, #111));\n    color: var(--cro-card-add-hover-text, var(--cro-card-add-text, #fff));\n}\n\n.cro-card-add:disabled {\n    background: #d8d8d8;\n    color: #888;\n    cursor: not-allowed;\n}\n\n.cro-card-add-row .cro-card-qty {\n    flex-shrink: 0;\n}\n\n.cro-card-qty {\n    display: grid;\n    grid-template-columns: 28px 32px 28px;\n    height: 38px;\n    overflow: hidden;\n    border: var(--cro-card-qty-border-width, 1px) solid var(--cro-card-qty-border-color, #ddd);\n    border-radius: var(--cro-card-qty-radius, 6px);\n}\n\n.cro-card-qty button,\n.cro-card-qty span {\n    display: grid;\n    height: 100%;\n    place-items: center;\n    border: 0;\n    background: var(--cro-card-qty-bg, #fff);\n    color: var(--cro-card-qty-color, inherit);\n}\n\n.cro-card-qty button {\n    cursor: pointer;\n}";
const isBrowser = typeof window !== "undefined" && typeof HTMLElement !== "undefined";
class BaseWidget extends (isBrowser ? HTMLElement : class {
}) {
  constructor() {
    super();
    if (isBrowser) this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["config", "settings", "styles", "is-builder-mode", "isbuildermode", "is-cro-hub-builder", "locale", "primary-locale"];
  }
  connectedCallback() {
    if (!isBrowser) return;
    this.render();
    this._guardBuilderNavigation();
  }
  _guardBuilderNavigation() {
    if (!this.isBuilderMode || this._navGuardAttached || !this.shadowRoot) return;
    this._navGuardAttached = true;
    this.shadowRoot.addEventListener("click", (e) => {
      const target = e.target;
      const nav = target?.closest?.("a[href], button[type='submit'], [type='submit']");
      if (nav) e.preventDefault();
    }, true);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!isBrowser || oldValue === newValue) return;
    this.render();
  }
  set isBuilderMode(value) {
    if (!isBrowser) return;
    if (value === false || value === null || value === void 0) {
      this.removeAttribute("is-builder-mode");
    } else {
      this.setAttribute("is-builder-mode", String(value));
    }
  }
  get isCroHubBuilder() {
    return this.getAttribute("is-cro-hub-builder") === "true" || this.getAttribute("iscrohubbuilder") !== null;
  }
  get isBuilderMode() {
    return this.getAttribute("is-builder-mode") === "true" || this.getAttribute("isbuildermode") !== null;
  }
  get widgetId() {
    return this.getAttribute("widget-id") || this.getAttribute("widgetId");
  }
  readJsonAttribute(name) {
    const raw = this.getAttribute(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      console.error(
        `[${this.tagName?.toLowerCase() || "widget"}] attribute \`${name}\` is not valid JSON (${raw.length} chars) — falling back to an empty object:`,
        err.message
      );
      return null;
    }
  }
  get config() {
    return this.readJsonAttribute("config");
  }
  get settings() {
    return this.readJsonAttribute("settings");
  }
  get styleSettings() {
    return this.readJsonAttribute("styles");
  }
  /** `window.CRO_HUB` is the storefront's locale context (pushed by the
   * `cro-helper.js` asset every widget block loads). The admin builder
   * preview has no such global, so the `locale`/`primary-locale` attributes it
   * sets on the element are the fallback. */
  get _locales() {
    const ctx = isBrowser && window.CRO_HUB || {};
    const current = ctx.currentLocale || ctx.primaryLocale || this.getAttribute("locale") || this.getAttribute("primary-locale") || "en";
    const primary = ctx.primaryLocale || this.getAttribute("primary-locale") || current || "en";
    return { current, primary };
  }
  _resolveLocaleValue(value, fallback = "") {
    if (value === void 0 || value === null) return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "object" && !Array.isArray(value)) {
      const { current, primary } = this._locales;
      const currentValue = value[current];
      if (typeof currentValue === "string" && currentValue !== "") return currentValue;
      const primaryValue = value[primary];
      if (typeof primaryValue === "string") return primaryValue;
      return fallback;
    }
    return fallback;
  }
  escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }
  styleAttr(value) {
    return String(value ?? "").replace(/"/g, "&quot;");
  }
  formatMoney(cents) {
    if (typeof window?.CRO_HUB?.formatMoney === "function") return window.CRO_HUB.formatMoney(cents);
    const amount = Number(cents) / 100;
    const currency = this.getAttribute?.("currency");
    if (currency) {
      try {
        return new Intl.NumberFormat(void 0, { style: "currency", currency }).format(amount);
      } catch {
      }
    }
    return "$" + amount.toFixed(2);
  }
  /** Rounds cents to the grain `formatMoney` will display (whole units for a
   * zero-decimal currency like VND/JPY, cents for a two-decimal one). Use
   * this before splitting an amount into rows that must stay additive after
   * formatting — e.g. "Subtotal − Discount == Total" — since formatting two
   * related cents amounts independently can round each one a different way
   * and break that sum even though the underlying totals were exact. */
  roundMoneyCents(cents) {
    const decimals = Number.isInteger(window?.CRO_HUB?.moneyDecimals) ? window.CRO_HUB.moneyDecimals : 2;
    const grain = Math.pow(10, 2 - decimals);
    return Math.round(Number(cents) / grain) * grain;
  }
  _formatHandle(handle) {
    return (handle || "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  _bgCss(value) {
    if (!value) return "";
    const native = Array.isArray(value.native) ? value.native.filter(Boolean) : [];
    if (native.length) return native.join(";") + ";";
    const color = value.classic?.["background-color"];
    return color ? `background-color:${color};` : "";
  }
  _borderCss(value) {
    if (!value || !value["border-style"]) return "";
    if (value["border-style"] === "none") return "border-style:none;";
    const width = value["border-width"] || {};
    const side = (key) => width[key] || "0px";
    return `border-style:${value["border-style"]};border-color:${value["border-color"] || "transparent"};border-width:${side("top")} ${side("right")} ${side("bottom")} ${side("left")};`;
  }
  _boxCss(prop, value) {
    if (!value) return "";
    const { top, right, bottom, left } = value;
    if (!top && !right && !bottom && !left) return "";
    return `${prop}:${top || "0px"} ${right || "0px"} ${bottom || "0px"} ${left || "0px"};`;
  }
  _typographyCss(value, fontImports) {
    if (!value) return "";
    const props = ["font-size", "font-weight", "text-transform", "font-style", "text-decoration", "line-height", "letter-spacing"];
    let css = "";
    const family = value["font-family"];
    if (typeof family === "string" && family) {
      css += `font-family:"${family}", sans-serif;`;
    } else if (family && typeof family === "object") {
      if (family.name) css += `font-family:"${family.name}", sans-serif;`;
      if (family.value && fontImports) fontImports.add(family.value);
    }
    for (const prop of props) {
      const v = value[prop];
      if (v !== void 0 && v !== null && v !== "") css += `${prop}:${v};`;
    }
    return css;
  }
  resolveTextTemplate(value, replacements = {}, fallback = "") {
    const template = this._resolveLocaleValue(value, fallback);
    return String(template).replace(
      /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
      (match, key) => Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key] ?? "") : match
    );
  }
  /** Stylesheet for the product-card markup below (`renderProductCard`,
   * `renderVariantSelector`, `renderProductQuickView`,
   * `renderPendingQtyStepper`). Lives here rather than in each widget so a
   * widget reusing the card markup cannot ship it without its CSS.
   * Subclasses append their own: `super.getStyles() + myStyles`. */
  getStyles() {
    return productCardStyles;
  }
  /** Generic product-card markup — layout (`cardLayoutClass`), badge, rating,
   * quick-view trigger, variant selector and qty stepper are all opt-in via
   * params so any widget extending BaseWidget can reuse the same card
   * (styles in share-extensions/base/ProductCard.css). Selection/quantity
   * state stays owned by the calling widget — this method only renders. */
  renderProductCard({
    key,
    title,
    image,
    hoverImage = "",
    vendor = "",
    priceCents,
    compareAtCents = null,
    savingsLabel = null,
    addLabel = "Add",
    soldOutLabel = "Sold out",
    outOfStockLabel = "Out of stock",
    cardStyle = "",
    cardLayoutClass = "",
    isSelected = false,
    disabled = false,
    soldOut = false,
    saleBadgeLabel = null,
    badgeLabel = null,
    badgeStyle = "",
    titleColor = "",
    priceColor = "",
    addButtonBackground = "",
    addButtonTextColor = "",
    addButtonHoverBackground = "",
    addButtonHoverText = "",
    showRating = false,
    rating = null,
    showQuickView = false,
    showQty = true,
    qty = 1,
    variantSelectorHtml = "",
    groupId = "",
    compId = ""
  }) {
    const addButtonStyle = (addButtonBackground ? `--cro-card-add-bg:${addButtonBackground};` : "") + (addButtonTextColor ? `--cro-card-add-text:${addButtonTextColor};` : "") + (addButtonHoverBackground ? `--cro-card-add-hover-bg:${addButtonHoverBackground};` : "") + (addButtonHoverText ? `--cro-card-add-hover-text:${addButtonHoverText};` : "");
    return `
            <article class="cro-card ${cardLayoutClass}${isSelected ? " is-selected" : ""}" style="${this.styleAttr(badgeStyle + cardStyle)}">
                <div class="cro-card-media">
                    <img src="${this.escapeHtml(image)}" alt="${this.escapeHtml(title)}" loading="lazy">
                    ${hoverImage ? `<img class="cro-card-media-hover" src="${this.escapeHtml(hoverImage)}" alt="" loading="lazy">` : ""}
                    ${soldOut ? `<span class="cro-card-flag cro-card-flag--soldout">${this.escapeHtml(outOfStockLabel)}</span>` : saleBadgeLabel ? `<span class="cro-card-flag cro-card-flag--sale">${this.escapeHtml(saleBadgeLabel)}</span>` : badgeLabel ? `<span class="cro-card-flag">${this.escapeHtml(badgeLabel)}</span>` : ""}
                    ${showQuickView ? `
                        <button type="button" class="cro-card-quickview" data-action="open-quick-view" data-item-key="${this.escapeHtml(key)}" data-comp-id="${this.escapeHtml(compId)}" data-show-rating="${showRating ? "true" : "false"}" aria-label="Quick view">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    ` : ""}
                </div>
                <div class="cro-card-body">
                    ${vendor ? `<div class="cro-card-vendor">${this.escapeHtml(vendor)}</div>` : ""}
                    <div class="cro-card-title" style="${this.styleAttr(titleColor ? `color:${titleColor};` : "")}">${this.escapeHtml(title)}</div>
                    <div class="cro-card-price" style="${this.styleAttr(priceColor ? `color:${priceColor};` : "")}">
                        ${this.formatMoney(priceCents)}
                        ${compareAtCents && compareAtCents > priceCents ? `<span class="cro-card-compare">${this.formatMoney(compareAtCents)}</span>` : ""}
                    </div>
                    ${savingsLabel ? `<div class="cro-card-savings">${this.escapeHtml(savingsLabel)}</div>` : ""}
                    ${showRating && rating ? this.renderRatingStars(rating) : ""}
                    ${variantSelectorHtml}
                    <div class="cro-card-add-row">
                        ${showQty ? this.renderPendingQtyStepper(key, qty) : ""}
                        <button
                            type="button"
                            class="cro-card-add"
                            style="${this.styleAttr(addButtonStyle)}"
                            data-action="add-item"
                            data-group-id="${this.escapeHtml(groupId)}"
                            data-item-key="${this.escapeHtml(key)}"
                            ${disabled ? "disabled" : ""}
                        >
                            ${this.escapeHtml(soldOut ? soldOutLabel : addLabel)}
                        </button>
                    </div>
                </div>
            </article>
        `;
  }
  /** Star row for a product's `reviews.rating` metafield. Rendered only when
   * the product actually has a rating — a product with no reviews shows
   * nothing rather than an empty or placeholder star row. */
  renderRatingStars({ value, count = 0 }) {
    const filled = Math.round(Math.max(0, Math.min(5, value)));
    const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
    const countLabel = count > 0 ? ` <span class="cro-card-rating-count">(${count})</span>` : "";
    return `<div class="cro-card-rating">${stars}${countLabel}</div>`;
  }
  /** One row per product option (Color, Size, …) so picking a value narrows
   * down to a specific variant — except `variantStyle === "flat"`, which
   * lists every resolved variant in a single dropdown (picking one sets all
   * of its options at once via `select-variant-full`). `selections`/`isPopoverOpen`
   * are resolved by the caller (this method is stateless) — see
   * MixMatchBundleWidget's getOptionSelections()/_openVariantPopoverKey for
   * the concrete state. */
  renderVariantSelector(key, item, variantStyle, selections, isPopoverOpen = false) {
    const variants = item.variants || [];
    const options = item.options || [];
    if (variants.length < 2 || options.length === 0) return "";
    const optionRow = (option, style) => {
      if (style === "select") {
        const choices = option.values.map((value) => `<option value="${this.escapeHtml(value)}" ${value === selections[option.name] ? "selected" : ""}>${this.escapeHtml(value)}</option>`).join("");
        return `
                    <select class="cro-card-variant" data-action="select-variant-option"
                        data-item-key="${this.escapeHtml(key)}" data-option-name="${this.escapeHtml(option.name)}">${choices}</select>
                `;
      }
      const pills = option.values.map((value) => `
                    <span class="cro-card-variant-pill${value === selections[option.name] ? " is-active" : ""}"
                        data-action="select-variant-option" data-item-key="${this.escapeHtml(key)}"
                        data-option-name="${this.escapeHtml(option.name)}" data-value="${this.escapeHtml(value)}">
                        ${this.escapeHtml(value)}
                    </span>
                `).join("");
      return `<div class="cro-card-variant-option-row"><div class="cro-card-variant-option-name">${this.escapeHtml(option.name)}</div><div class="cro-card-variant-pills">${pills}</div></div>`;
    };
    if (variantStyle === "select") {
      return `<div class="cro-card-variant-options">${options.map((o) => optionRow(o, "select")).join("")}</div>`;
    }
    if (variantStyle === "pill") {
      return `<div class="cro-card-variant-options">${options.map((o) => optionRow(o, "pill")).join("")}</div>`;
    }
    if (variantStyle === "flat") {
      const selectedVariant = variants.find((v) => (v.selectedOptions || []).every((so) => selections[so.name] === so.value));
      const choices = variants.map((v) => {
        const label = v.title || (v.selectedOptions || []).map((so) => so.value).join(" / ");
        return `<option value="${this.escapeHtml(v.id)}" ${selectedVariant && v.id === selectedVariant.id ? "selected" : ""}>${this.escapeHtml(label)}</option>`;
      }).join("");
      return `
                <div class="cro-card-variant-options">
                    <select class="cro-card-variant" data-action="select-variant-full"
                        data-item-key="${this.escapeHtml(key)}">${choices}</select>
                </div>
            `;
    }
    if (variantStyle === "popover") {
      const summary = options.map((o) => selections[o.name]).filter(Boolean).join(" / ");
      return `
                <div class="cro-card-variant-popover-wrap">
                    <div class="cro-card-variant-popover" data-action="toggle-variant-popover" data-item-key="${this.escapeHtml(key)}">
                        <span>${this.escapeHtml(summary || "Select options")}</span>
                        <span class="cro-card-variant-popover-caret"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
                    </div>
                    ${isPopoverOpen ? `<div class="cro-card-variant-popover-menu">${options.map((o) => optionRow(o, "pill")).join("")}</div>` : ""}
                </div>
            `;
    }
    return "";
  }
  /** Quantity-to-add stepper — pure render, `qty` is owned by the caller
   * (e.g. MixMatchBundleWidget's `_pendingQty` map). */
  renderPendingQtyStepper(key, qty = 1) {
    return `
            <div class="cro-card-qty">
                <button type="button" data-action="pending-qty-decrease" data-item-key="${this.escapeHtml(key)}" aria-label="Decrease">−</button>
                <span>${qty}</span>
                <button type="button" data-action="pending-qty-increase" data-item-key="${this.escapeHtml(key)}" aria-label="Increase">+</button>
            </div>
        `;
  }
  /** Quick-view modal for a single product card. Rendered as a sibling of
   * the widget's own scroll container — a `position:fixed` overlay needs to
   * sit outside any scrolling ancestor to cover the whole widget frame
   * instead of scrolling away with it. All derived values (price, images,
   * selected variant, ...) are resolved by the caller. */
  renderProductQuickView({
    key,
    title,
    images,
    activeImageIndex = 0,
    showRating = false,
    rating = null,
    priceCents,
    compareAtCents = null,
    soldOut = false,
    description = "",
    descriptionExpanded = false,
    variantSelectorHtml = "",
    qty = 1,
    groupId = "",
    addDisabled = false,
    addLabel = "Add to bundle",
    soldOutLabel = "Sold out",
    showMoreLabel = "Show more",
    showLessLabel = "Show less",
    cardStyle = "",
    addButtonBackground = "",
    addButtonTextColor = "",
    addButtonHoverBackground = "",
    addButtonHoverText = ""
  }) {
    const addButtonStyle = (addButtonBackground ? `--cro-card-add-bg:${addButtonBackground};` : "") + (addButtonTextColor ? `--cro-card-add-text:${addButtonTextColor};` : "") + (addButtonHoverBackground ? `--cro-card-add-hover-bg:${addButtonHoverBackground};` : "") + (addButtonHoverText ? `--cro-card-add-hover-text:${addButtonHoverText};` : "");
    return `
            <div class="cro-card-quickview-overlay" data-action="close-quick-view" popover="manual">
                <div class="cro-card-quickview-wrap" style="${this.styleAttr(cardStyle)}">
                    <button type="button" class="cro-card-quickview-close" data-action="close-quick-view" aria-label="Close">✕</button>
                    <div class="cro-card-quickview-modal">
                        <div class="cro-card-quickview-layout">
                            <div class="cro-card-quickview-gallery">
                                <div class="cro-card-quickview-media">
                                    <img src="${this.escapeHtml(images[activeImageIndex])}" alt="${this.escapeHtml(title)}" loading="lazy">
                                </div>
                                ${images.length > 1 ? `
                                    <div class="cro-card-quickview-thumbs">
                                        ${images.map((src, i) => `
                                            <button type="button" class="cro-card-quickview-thumb${i === activeImageIndex ? " is-active" : ""}"
                                                data-action="quick-view-select-image" data-item-key="${this.escapeHtml(key)}" data-index="${i}">
                                                <img src="${this.escapeHtml(src)}" alt="" loading="lazy">
                                            </button>
                                        `).join("")}
                                    </div>
                                ` : ""}
                            </div>
                            <div class="cro-card-quickview-body">
                                <div class="cro-card-quickview-scroll">
                                    <div class="cro-card-quickview-title">${this.escapeHtml(title)}</div>
                                    ${showRating && rating ? `
                                        <div class="cro-card-quickview-rating">
                                            <span class="cro-card-quickview-rating-star">★</span> ${rating.value.toFixed(1)}
                                            <span class="cro-card-quickview-rating-count">(${rating.count})</span>
                                        </div>
                                    ` : ""}
                                    <div class="cro-card-quickview-price-row">
                                        <span class="cro-card-quickview-price">${this.formatMoney(priceCents)}</span>
                                        ${compareAtCents && compareAtCents > priceCents ? `<span class="cro-card-quickview-compare">${this.formatMoney(compareAtCents)}</span>` : ""}
                                    </div>
                                    ${soldOut ? `<div class="cro-card-quickview-soldout">${this.escapeHtml(soldOutLabel)}</div>` : ""}
                                    ${description ? `
                                        <div class="cro-card-quickview-description${descriptionExpanded ? " is-expanded" : ""}">${this.escapeHtml(description)}</div>
                                        <button type="button" class="cro-card-quickview-description-toggle" data-action="toggle-quickview-description" data-item-key="${this.escapeHtml(key)}">
                                            ${this.escapeHtml(descriptionExpanded ? showLessLabel : showMoreLabel)}
                                        </button>
                                    ` : ""}
                                    ${variantSelectorHtml}
                                </div>
                                <div class="cro-card-quickview-add-row">
                                    ${this.renderPendingQtyStepper(key, qty)}
                                    <button
                                        type="button"
                                        class="cro-card-add"
                                        style="${this.styleAttr(addButtonStyle)}"
                                        data-action="add-item"
                                        data-group-id="${this.escapeHtml(groupId)}"
                                        data-item-key="${this.escapeHtml(key)}"
                                        ${addDisabled ? "disabled" : ""}
                                    >
                                        ${this.escapeHtml(soldOut ? soldOutLabel : addLabel)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }
  render() {
  }
}
const fixedBundleStyles = '*,\n*::before,\n*::after {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n}\n\n:host {\n    display: block;\n    width: 100%;\n}\n\n:host([data-editing]) {\n    position: relative;\n    z-index: 2147483000;\n}\n\nbutton,\nselect,\ninput {\n    font: inherit;\n    color: inherit;\n}\n\n.cro-fbw {\n\n    --cro-fg: #17191c;\n    --cro-muted: #71767c;\n    --cro-bg: #ffffff;\n    --cro-surface: #f6f7f8;\n    --cro-line-2: #cfd2d5;\n    --cro-faint: color-mix(in srgb, var(--cro-fg) 45%, var(--cro-bg));\n    --cro-line: color-mix(in srgb, var(--cro-border-subtle) 45%, transparent);\n    --cro-sel: #17191c;\n    --cro-sel-fg: #ffffff;\n    --cro-cta-bg: #17191c;\n    --cro-cta-fg: #ffffff;\n    --cro-arrow-bg: #ffffff;\n    --cro-arrow-fg: #17191c;\n    --cro-save-color: #BB0606;\n    --cro-border-subtle: #00000033;\n    --cro-header-bg: var(--cro-surface);\n    --cro-header-fg: var(--cro-muted);\n    --cro-note: #000000;\n    --cro-badge-bg: var(--cro-sel);\n    --cro-badge-fg: var(--cro-sel-fg);\n\n    --cro-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n    --cro-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n    --cro-fs-base: 16px;\n    --cro-fs-xl: calc(var(--cro-fs-base) * 1.25);\n    --cro-fs-lg: calc(var(--cro-fs-base) * 1.125);\n    --cro-fs-md: calc(var(--cro-fs-base) * 0.875);\n    --cro-fs-sm: calc(var(--cro-fs-base) * 0.75);\n    --cro-fs-xs: calc(var(--cro-fs-base) * 0.625);\n\n    --cro-fw-medium: 500;\n    --cro-fw-semibold: 600;\n    --cro-fw-bold: 700;\n\n    --cro-lh-base: 1;\n    --cro-lh-text: 1.35;\n    --cro-ls-flat: 0;\n\n    --cro-card-title-fs: var(--cro-fs-md);\n    --cro-card-price-fs: var(--cro-fs-md);\n    --cro-cta-fs: var(--cro-fs-lg);\n    --cro-control-fs: var(--cro-fs-sm);\n    --cro-badge-fs: var(--cro-fs-xs);\n    --cro-badge-tracking: .04em;\n    --cro-badge-case: uppercase;\n    --cro-header-align: center;\n\n    --cro-radius: 10px;\n    --cro-radius-sm: 4px;\n    --cro-radius-md: 8px;\n    --cro-radius-full: 50%;\n    --cro-card-radius: 12px;\n    --cro-image-radius: var(--cro-radius-sm);\n    --cro-badge-radius: 5px;\n    --cro-btn-radius: var(--cro-radius-md);\n    --cro-control-radius: 7px;\n    --cro-container-border-w: 2px;\n    --cro-inner-radius: max(0px, calc(var(--cro-radius) - var(--cro-container-border-w)));\n    --cro-card-border-w: 1px;\n    --cro-divider-w: 1px;\n\n    --cro-space: 8px;\n    --cro-container-margin: 0px;\n    --cro-content-padding: 20px;\n    --cro-header-pad: 16px;\n    --cro-row-pad: 18px;\n    --cro-grid-gap: 12px;\n    --cro-slide-gap: 10px;\n    --cro-card-pad: 5px;\n    --cro-card-body-pad: 10px;\n    --cro-card-body-gap: 12px;\n    --cro-foot-gap: 12px;\n    --cro-foot-pad: 12px 20px;\n    --cro-cta-pad: 19px;\n    --cro-cta-gap: 8px;\n    --cro-cta-min-h: 52px;\n    --cro-badge-pad: 3px 8px;\n    --cro-control-pad: 8px 10px;\n    --cro-sheet-pad: 14px;\n    --cro-change-pad: 10px;\n\n    --cro-card-min-w: 200px;\n    --cro-slide-card-w: 262px;\n    --cro-img-ratio: 200 / 180;\n    --cro-img-h-w: 105px;\n    --cro-img-h-h: 124px;\n    --cro-qty-size: 27px;\n    --cro-thumb-size: 31px;\n    --cro-chevron-size: 24px;\n    --cro-chevron-icon: 14px;\n    --cro-arrow-size: 30px;\n    --cro-arrow-offset: 0;\n    --cro-arrow-shadow: 0 1px 3px rgba(0, 0, 0, .12);\n    --cro-control-h: 40px;\n    --cro-radio-dot: 15px;\n    --cro-option-min-w: 92px;\n    --cro-spinner-size: 15px;\n\n    position: relative;\n    container-type: inline-size;\n    width: 100%;\n    min-width: min(100%, 320px);\n    margin: var(--cro-container-margin);\n    background-color: var(--cro-bg);\n    color: var(--cro-fg);\n    border-radius: var(--cro-radius);\n    border: var(--cro-container-border-w) solid var(--cro-border-subtle);\n    font-family: var(--cro-font);\n    line-height: var(--cro-lh-base);\n}\n\n.cro-fbw__header {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 19px;\n    padding: var(--cro-header-pad);\n    background: var(--cro-header-bg);\n    border-radius: var(--cro-inner-radius) var(--cro-inner-radius) 0 0;\n}\n\n.cro-fbw__header::before,\n.cro-fbw__header::after {\n    content: "";\n    flex: none;\n    width: 37px;\n    height: 1px;\n    background: var(--cro-header-fg);\n}\n\n.cro-fbw__header-text {\n    text-align: center;\n    color: var(--cro-header-fg);\n    font-size: var(--cro-fs-xl);\n    font-weight: var(--cro-fw-semibold);\n    letter-spacing: .04em;\n    text-transform: uppercase;\n}\n\n.cro-fbw__list {\n    display: flex;\n    flex-direction: column;\n}\n\n.cro-fbw__bundle+.cro-fbw__bundle::before {\n    content: "";\n    display: block;\n    border-top: var(--cro-divider-w) solid var(--cro-border-subtle);\n    margin-inline: var(--cro-content-padding);\n}\n\n.cro-fbw__head {\n    width: 100%;\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    background: none;\n    border: 0;\n    text-align: left;\n    cursor: pointer;\n    color: inherit;\n    padding: var(--cro-row-pad) var(--cro-content-padding);\n    margin-bottom: 13px;\n}\n\n.cro-fbw__head--static {\n    cursor: default;\n}\n\n.cro-fbw__chevron-wrap {\n    width: var(--cro-chevron-size);\n    height: var(--cro-chevron-size);\n    border-radius: var(--cro-radius-full);\n    display: grid;\n    place-items: center;\n    flex: none;\n    text-decoration: none;\n    transition: background .15s ease, border-color .15s ease;\n}\n\n.cro-fbw__bundle--open .cro-fbw__chevron-wrap {\n    background: var(--cro-cta-bg);\n    border: 1.5px solid var(--cro-cta-bg);\n}\n\n.cro-fbw__chevron {\n    width: var(--cro-chevron-icon);\n    height: var(--cro-chevron-icon);\n    flex: none;\n    color: var(--cro-muted);\n    transform: rotate(-90deg);\n    transition: transform .2s ease;\n}\n\n.cro-fbw__bundle--open .cro-fbw__chevron {\n    color: var(--cro-cta-fg);\n    transform: rotate(0deg);\n}\n\n.cro-fbw__head-copy {\n    flex: 1;\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    gap: 9px;\n}\n\n.cro-fbw__bundle-title-wrapper {\n    display: flex;\n    align-items: center;\n    gap: 9px;\n    flex-wrap: wrap;\n}\n\n.cro-fbw__bundle-title {\n    font-size: var(--cro-fs-lg);\n    font-weight: var(--cro-fw-medium);\n    letter-spacing: -.02em;\n    overflow-wrap: anywhere;\n}\n\na.cro-fbw__bundle-title {\n    color: inherit;\n    text-decoration: none;\n    cursor: pointer;\n}\n\na.cro-fbw__bundle-title:hover {\n    text-decoration: underline;\n}\n\n.cro-fbw__flag {\n    font-size: var(--cro-badge-fs);\n    font-weight: var(--cro-fw-bold);\n    text-transform: var(--cro-badge-case);\n    letter-spacing: var(--cro-badge-tracking);\n    color: var(--cro-badge-fg);\n    background: var(--cro-badge-bg);\n    border-radius: var(--cro-badge-radius);\n    padding: var(--cro-badge-pad);\n}\n\n.cro-fbw__thumbs {\n    display: flex;\n    align-items: center;\n}\n\n.cro-fbw__head:not(.cro-fbw__head--static) .cro-fbw__thumbs {\n    padding-left: 33px;\n}\n\n.cro-fbw__thumb {\n    width: var(--cro-thumb-size);\n    height: var(--cro-thumb-size);\n    border-radius: var(--cro-radius-full);\n    overflow: hidden;\n    border: 1px solid var(--cro-border-subtle);\n    margin-right: calc(var(--cro-thumb-size) * -.5);\n}\n\n.cro-fbw__thumb img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    display: block;\n}\n\n.cro-fbw__thumb-more {\n    font-size: var(--cro-fs-md);\n    color: var(--cro-fg);\n    font-weight: var(--cro-fw-medium);\n    margin-left: 20px;\n}\n\n.cro-fbw__price {\n    text-align: right;\n    flex: none;\n    display: flex;\n    flex-direction: column;\n    align-items: flex-end;\n    gap: 11px;\n}\n\n.cro-fbw__price-now {\n    font-size: var(--cro-fs-lg);\n    font-weight: var(--cro-fw-medium);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__price-was {\n    font-size: var(--cro-fs-md);\n    color: var(--cro-muted);\n    text-decoration: line-through;\n    font-weight: var(--cro-fw-medium);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__save {\n    font-size: var(--cro-fs-sm);\n    color: var(--cro-save-color);\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__bundle--unavailable .cro-fbw__bundle-title,\n.cro-fbw__bundle--unavailable .cro-fbw__price {\n    opacity: .5;\n}\n\n.cro-fbw__panel[hidden] {\n    display: none;\n}\n\n.cro-fbw__panel {\n    padding: 0 var(--cro-content-padding);\n}\n\n.cro-fbw__bundle--products .cro-fbw__panel {\n    padding-bottom: var(--cro-content-padding);\n}\n\n.cro-fbw__cards--grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(var(--cro-card-min-w), 1fr));\n    gap: var(--cro-grid-gap);\n}\n\n.cro-fbw__cards--grid:has(.cro-fbw__card--h) {\n    grid-template-columns: repeat(auto-fill, minmax(calc(var(--cro-card-min-w) + 80px), 1fr));\n}\n\n.cro-fbw__slider {\n    position: relative;\n}\n\n.cro-fbw__cards--slide {\n    display: flex;\n    gap: var(--cro-slide-gap);\n    overflow-x: auto;\n    scroll-snap-type: x mandatory;\n    padding-bottom: 2px;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n}\n\n.cro-fbw__cards--slide::-webkit-scrollbar {\n    display: none;\n}\n\n.cro-fbw__cards--slide .cro-fbw__card {\n    flex: 0 0 auto;\n    scroll-snap-align: start;\n    width: var(--cro-slide-card-w);\n}\n\n.cro-fbw__arrow {\n    position: absolute;\n    top: calc(50% - var(--cro-arrow-size) * 0.8);\n    width: var(--cro-arrow-size);\n    height: var(--cro-arrow-size);\n    border-radius: var(--cro-radius-full);\n    border: 1px solid var(--cro-border-subtle);\n    background: var(--cro-arrow-bg);\n    cursor: pointer;\n    display: grid;\n    place-items: center;\n    color: var(--cro-arrow-fg);\n    font-size: calc(var(--cro-arrow-size) * .6);\n    line-height: 1;\n    z-index: 4;\n    box-shadow: var(--cro-arrow-shadow);\n}\n\n.cro-fbw__arrow svg {\n    display: block;\n}\n\n.cro-fbw__arrow--prev {\n    left: var(--cro-arrow-offset);\n    transform: translateX(-50%);\n}\n\n.cro-fbw__arrow--next {\n    right: var(--cro-arrow-offset);\n    transform: translateX(50%);\n}\n\n.cro-fbw__arrow--prev svg {\n    transform: rotate(180deg);\n}\n\n.cro-fbw__arrow[disabled] {\n    opacity: 0;\n    pointer-events: none;\n}\n\n.cro-fbw__card {\n    border: var(--cro-card-border-w) solid var(--cro-border-subtle);\n    border-radius: var(--cro-card-radius);\n    padding: var(--cro-card-pad);\n    display: flex;\n    overflow: hidden;\n}\n\n.cro-fbw__card--v {\n    flex-direction: column;\n}\n\n.cro-fbw__card--h {\n    flex-direction: row;\n    gap: var(--cro-card-body-gap);\n    align-items: stretch;\n}\n\n.cro-fbw__card--unavailable {\n    opacity: .7;\n}\n\n.cro-fbw__media {\n    position: relative;\n    border-radius: var(--cro-image-radius);\n    overflow: hidden;\n    background: var(--cro-surface);\n    border: 1px solid var(--cro-line);\n}\n\n.cro-fbw__card--v .cro-fbw__media {\n    width: 100%;\n    aspect-ratio: var(--cro-img-ratio);\n}\n\n.cro-fbw__card--h .cro-fbw__media {\n    flex: none;\n    width: var(--cro-img-h-w);\n    height: var(--cro-img-h-h);\n}\n\n.cro-fbw__img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    display: block;\n}\n\n.cro-fbw__img--ph {\n    background: var(--cro-surface);\n}\n\n.cro-fbw__qty {\n    position: absolute;\n    top: 8px;\n    right: 8px;\n    min-width: var(--cro-qty-size);\n    height: var(--cro-qty-size);\n    padding: 9px;\n    border-radius: var(--cro-radius-sm);\n    background: var(--cro-fg);\n    color: var(--cro-bg);\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-semibold);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.cro-fbw__card-body {\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-card-body-gap);\n    padding: var(--cro-card-body-pad);\n}\n\n.cro-fbw__card--h .cro-fbw__card-body {\n    flex: 1;\n    padding: 0;\n    gap: calc(var(--cro-card-body-gap) * .7);\n    justify-content: center;\n}\n\n.cro-fbw__card--h .cro-fbw__name,\n.cro-fbw__card--h .cro-fbw__variant {\n    -webkit-line-clamp: 1;\n}\n\n.cro-fbw__name {\n    font-size: var(--cro-card-title-fs);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-text);\n    display: -webkit-box;\n    -webkit-line-clamp: 2;\n    -webkit-box-orient: vertical;\n    overflow: hidden;\n    color: var(--cro-fg);\n}\n\na.cro-fbw__name {\n    text-decoration: none;\n}\n\na.cro-fbw__name:hover {\n    text-decoration: underline;\n}\n\n.cro-fbw__card-price {\n    font-size: var(--cro-card-price-fs);\n    line-height: var(--cro-lh-base);\n}\n\n.cro-fbw__card-was {\n    color: var(--cro-muted);\n    text-decoration: line-through;\n    margin-right: 6px;\n    font-size: var(--cro-card-price-fs);\n}\n\n.cro-fbw__card-now {\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__variant {\n    font-size: var(--cro-fs-sm);\n    color: var(--cro-muted);\n    line-height: var(--cro-lh-text);\n    display: -webkit-box;\n    -webkit-line-clamp: 2;\n    -webkit-box-orient: vertical;\n    font-weight: 400;\n    overflow: hidden;\n}\n\n.cro-fbw__change {\n    width: 100%;\n    background: var(--cro-bg);\n    border: 1px solid var(--cro-border-subtle);\n    border-radius: var(--cro-control-radius);\n    padding: var(--cro-change-pad);\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 6px;\n\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-base);\n}\n\n.cro-fbw__card--v .cro-fbw__change {\n    margin-top: auto;\n}\n\n.cro-fbw__card--h .cro-fbw__qty {\n    top: 6px;\n    right: 6px;\n    min-width: calc(var(--cro-qty-size) * .8);\n    height: calc(var(--cro-qty-size) * .8);\n    padding: 0 6px;\n    font-size: var(--cro-fs-xs);\n}\n\n.cro-fbw__card--h .cro-fbw__change {\n    padding: calc(var(--cro-change-pad) * .8) calc(var(--cro-change-pad) * 1.4);\n}\n\n.cro-fbw__change:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw__ico {\n    width: 14px;\n    height: 14px;\n}\n\n.cro-fbw__oos {\n    margin-top: 8px;\n    font-family: var(--cro-mono);\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-bold);\n    color: var(--cro-muted);\n}\n\n.cro-fbw__foot {\n    display: flex;\n    flex-direction: column;\n    gap: var(--cro-foot-gap);\n    padding-block: var(--cro-foot-pad);\n}\n\n.cro-fbw__cta {\n    width: 100%;\n    min-height: var(--cro-cta-min-h);\n    border: 0;\n    border-radius: var(--cro-btn-radius);\n    padding: var(--cro-cta-pad);\n\n    background: var(--cro-cta-bg);\n    color: var(--cro-cta-fg);\n    font-size: var(--cro-cta-fs);\n    font-weight: var(--cro-fw-semibold);\n    line-height: var(--cro-lh-base);\n    letter-spacing: var(--cro-ls-flat);\n\n    cursor: pointer;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: var(--cro-cta-gap);\n}\n\n.cro-fbw__cta:not([disabled]):hover,\n.cro-fbw__sheet-done:hover {\n    opacity: .90;\n}\n\n.cro-fbw__sheet-close:hover {\n    background: var(--cro-line-2);\n}\n\n.cro-fbw__cta[disabled] {\n    cursor: not-allowed;\n}\n\n.cro-fbw__cta--unavailable {\n    opacity: .5;\n}\n\n.cro-fbw__cta--loading {\n    opacity: .8;\n}\n\n.cro-fbw__cta--success {\n    background: var(--cro-bg);\n    color: var(--cro-fg);\n    border: 1.5px solid var(--cro-sel);\n}\n\n.cro-fbw__spinner {\n    width: var(--cro-spinner-size);\n    height: var(--cro-spinner-size);\n    border: 2px solid color-mix(in srgb, var(--cro-cta-fg) 35%, transparent);\n    border-top-color: var(--cro-cta-fg);\n    border-radius: var(--cro-radius-full);\n    animation: cro-fbw-spin .7s linear infinite;\n}\n\n@keyframes cro-fbw-spin {\n    to {\n        transform: rotate(360deg);\n    }\n}\n\n.cro-fbw__note {\n    font-size: var(--cro-fs-md);\n    text-align: center;\n    color: var(--cro-note);\n    line-height: var(--cro-lh-base);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__note-save {\n    color: var(--cro-save-color);\n    font-weight: var(--cro-fw-medium);\n    line-height: var(--cro-lh-base);\n    letter-spacing: var(--cro-ls-flat);\n}\n\n.cro-fbw__editor {\n    position: absolute;\n    inset: 0;\n    z-index: 30;\n}\n\n.cro-fbw__editor[hidden] {\n    display: none;\n}\n\n.cro-fbw__backdrop {\n    position: absolute;\n    inset: 0;\n    background: transparent;\n    border-radius: var(--cro-inner-radius);\n}\n\n.cro-fbw__sheet {\n    position: absolute;\n    left: var(--cro-pop-left, 16px);\n    top: var(--cro-pop-top, 60px);\n    width: var(--cro-pop-w, 288px);\n    max-height: 74%;\n    display: flex;\n    flex-direction: column;\n    overflow: hidden;\n    background: var(--cro-bg);\n    border: 1px solid var(--cro-line-2);\n    border-radius: var(--cro-radius);\n    padding: var(--cro-sheet-pad);\n    box-shadow: 0 12px 34px rgba(0, 0, 0, .22);\n}\n\n.cro-fbw__sheet-head {\n    flex: none;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n    margin-bottom: 8px;\n}\n\n.cro-fbw__sheet-body {\n    flex: 1 1 auto;\n    min-height: 0;\n    overflow: auto;\n}\n\n.cro-fbw__sheet-title {\n    margin: 0;\n    font-size: var(--cro-fs-md);\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__sheet-close {\n    border: 0;\n    background: var(--cro-surface);\n    width: 30px;\n    height: 30px;\n    border-radius: var(--cro-radius-md);\n    cursor: pointer;\n    font-size: 16px;\n    color: var(--cro-fg);\n    flex: none;\n}\n\n.cro-fbw__sheet-done {\n    flex: none;\n    width: 100%;\n    margin-top: 12px;\n    border: 0;\n    border-radius: var(--cro-btn-radius);\n    background: var(--cro-cta-bg);\n    color: var(--cro-cta-fg);\n    font-weight: var(--cro-fw-bold);\n    padding: calc(var(--cro-cta-pad) * .6);\n    min-height: 44px;\n    cursor: pointer;\n}\n\n.cro-fbw__opt {\n    margin-top: 10px;\n    border: 0;\n    padding: 0;\n}\n\n.cro-fbw__opt-label {\n    position: sticky;\n    top: 0;\n    z-index: 1;\n    background: var(--cro-bg);\n    font-size: var(--cro-fs-sm);\n    font-weight: var(--cro-fw-bold);\n    color: var(--cro-muted);\n    text-transform: uppercase;\n    letter-spacing: .04em;\n    padding-bottom: 6px;\n    display: block;\n}\n\n.cro-fbw__radios {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(var(--cro-option-min-w), 1fr));\n    gap: 6px;\n}\n\n.cro-fbw__radio {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    border: 1px solid var(--cro-line-2);\n    border-radius: var(--cro-control-radius);\n    padding: var(--cro-control-pad);\n    min-height: var(--cro-control-h);\n    cursor: pointer;\n    background: var(--cro-bg);\n    font-size: var(--cro-control-fs);\n}\n\n.cro-fbw__radio:hover {\n    border-color: var(--cro-faint);\n}\n\n.cro-fbw__radio-input {\n    position: absolute;\n    opacity: 0;\n    width: 0;\n    height: 0;\n}\n\n.cro-fbw__radio-dot {\n    width: var(--cro-radio-dot);\n    height: var(--cro-radio-dot);\n    border-radius: var(--cro-radius-full);\n    box-shadow: inset 0 0 0 1.5px var(--cro-line-2);\n    flex: none;\n    display: grid;\n    place-items: center;\n}\n\n.cro-fbw__radio:has(.cro-fbw__radio-input:checked) {\n    border-color: var(--cro-sel);\n    background: var(--cro-surface);\n}\n\n.cro-fbw__radio:has(.cro-fbw__radio-input:checked) .cro-fbw__radio-dot {\n    box-shadow: inset 0 0 0 1.5px var(--cro-sel);\n    background: radial-gradient(circle at center,\n            var(--cro-sel) 0 calc(var(--cro-radio-dot) * .235),\n            transparent calc(var(--cro-radio-dot) * .235));\n}\n\n.cro-fbw__radio:has(.cro-fbw__radio-input:checked) .cro-fbw__radio-text {\n    font-weight: var(--cro-fw-bold);\n}\n\n.cro-fbw__radio--sold {\n    opacity: .4;\n    cursor: not-allowed;\n}\n\n.cro-fbw__radio--sold .cro-fbw__radio-text {\n    text-decoration: line-through;\n}\n\n.cro-fbw__head:focus-visible,\n.cro-fbw__change:focus-visible,\n.cro-fbw__cta:focus-visible,\n.cro-fbw__arrow:focus-visible,\n.cro-fbw__radio:has(:focus-visible),\n.cro-fbw__sheet-close:focus-visible,\n.cro-fbw__sheet-done:focus-visible {\n    outline: 2px solid var(--cro-fg);\n    outline-offset: 2px;\n}\n\n@container (max-width:430px) {\n    .cro-fbw__radios {\n        grid-template-columns: 1fr 1fr;\n    }\n}\n\n@media (prefers-reduced-motion:reduce) {\n\n    *,\n    *::before,\n    *::after {\n        transition: none !important;\n        animation: none !important;\n        scroll-behavior: auto !important;\n    }\n}\n\n.cro-fbw__sk {\n    display: inline-block;\n    border-radius: 6px;\n    vertical-align: middle;\n    opacity: .85;\n    background: linear-gradient(90deg, #e9eaed 25%, #f3f4f6 37%, #e9eaed 63%);\n    background-size: 400% 100%;\n    animation: cro-fbw-sk 1.2s ease infinite\n}\n\n@keyframes cro-fbw-sk {\n    0% {\n        background-position: 100% 0\n    }\n\n    100% {\n        background-position: 0 0\n    }\n}\n\n.cro-fbw__sheet,\n.cro-fbw__sheet-body {\n    scrollbar-width: thin;\n    scrollbar-color: rgba(0, 0, 0, .28) transparent\n}\n\n.cro-fbw__sheet::-webkit-scrollbar,\n.cro-fbw__sheet-body::-webkit-scrollbar {\n    width: 3px;\n    height: 3px\n}\n\n.cro-fbw__sheet::-webkit-scrollbar-thumb,\n.cro-fbw__sheet-body::-webkit-scrollbar-thumb {\n    background: rgba(0, 0, 0, .28);\n    border-radius: 9px\n}\n\n.cro-fbw__sheet::-webkit-scrollbar-track,\n.cro-fbw__sheet-body::-webkit-scrollbar-track {\n    background: transparent\n}\n\n.cro-fbw__head-copy {\n    min-width: 0\n}\n\n.cro-fbw__bundle-title-wrapper {\n    display: flex;\n    align-items: center;\n    flex-wrap: nowrap;\n    min-width: 0\n}\n\n.cro-fbw__bundle-title-wrapper .cro-fbw__chevron-wrap,\n.cro-fbw__bundle-title-wrapper .cro-fbw__flag {\n    flex-shrink: 0\n}\n\n.cro-fbw__bundle-title {\n    min-width: 0;\n    display: -webkit-box;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 2;\n    line-clamp: 2;\n    overflow: hidden;\n    line-height: var(--cro-lh-text);\n}';
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
const sendPixelEvent = ({ name, storeId, extensionType, ruleId, ruleName, pageId, data = {} }) => {
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
const publishCroContext = (shopCurrency) => {
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
const EXTENSION_TYPE = "cro_fixed_bundle";
const DEFAULT_TEXT = Object.freeze({
  header_text: "Bundle deal",
  included_products_text: "All products included in bundle",
  save_price_text: "Save {{amount}}",
  change_variant_text: "Change",
  picker_title_text: "{{product_title}}",
  picker_done_text: "Done",
  add_to_cart_text: "Add bundle to cart • {{price}}",
  summary_text: "({{items}} items) you save {{saved}}",
  adding_text: "Adding…",
  added_text: "Added to cart",
  retry_text: "Couldn’t add — try again",
  unavailable_text: "Currently unavailable",
  out_of_stock_text: "Out of stock"
});
const DEFAULT_TITLE_RE = /^default\s*title$/i;
const SUCCESS_RESET_MS = 1601;
const STYLE_TOKENS = [
  ["space", "--cro-space", "6px"],
  ["content_padding", "--cro-content-padding", "14px"],
  ["row_padding", "--cro-row-pad", "12px"],
  ["header_padding", "--cro-header-pad", "12px"],
  ["grid_gap", "--cro-grid-gap", "8px"],
  ["slide_gap", "--cro-slide-gap", "8px"],
  ["foot_gap", "--cro-foot-gap", "8px"],
  ["foot_padding", "--cro-foot-pad", "8px 14px"],
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
  ["cta_padding", "--cro-cta-pad", "13px"],
  ["cta_font_size", "--cro-cta-fs", "calc(var(--cro-fs-base) * 0.9375)"],
  ["cta_gap", "--cro-cta-gap", "6px"],
  ["cta_min_height", "--cro-cta-min-h", "44px"],
  ["spinner_size", "--cro-spinner-size", "13px"],
  ["chevron_size", "--cro-chevron-size", "20px"],
  ["chevron_icon_size", "--cro-chevron-icon", "12px"],
  ["arrow_size", "--cro-arrow-size", "26px"],
  ["arrow_offset", "--cro-arrow-offset", "-2px"],
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
const ARROW_ICON = `<svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0.753715 8L5 4L0.753715 1.34975e-07L-4.54269e-07 0.71L3.49257 4L-2.45114e-07 7.29L0.753715 8Z" fill="currentColor" /> </svg>`;
class FixedBundleWidget extends BaseWidget {
  constructor() {
    super();
    this._expandedBundles = /* @__PURE__ */ new Set();
    this._expandedInitialized = false;
    this._eventsAttached = false;
    this._selection = {};
    this._productMap = /* @__PURE__ */ new Map();
    this._hydrated = false;
    this._hydrating = false;
    this._variantCache = /* @__PURE__ */ new Map();
    this._variantPending = /* @__PURE__ */ new Set();
    this._editor = null;
    this._addState = "idle";
    this._addBundleId = null;
    this._nativeCartItems = null;
    this._nativeCroSigns = {};
    this._nativeForms = /* @__PURE__ */ new Set();
    this._onReposition = this._onReposition.bind(this);
    this._onNativeAddToCartClick = this._onNativeAddToCartClick.bind(this);
  }
  static get observedAttributes() {
    return [...super.observedAttributes, "widget-data", "widgetdata"];
  }
  connectedCallback() {
    super.connectedCallback?.();
    if (typeof window !== "undefined") window.addEventListener("resize", this._onReposition, { passive: true });
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => {
        if (this.isConnected && this.embeddedData.bundles) this._hydrate();
      });
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback?.();
    if (typeof window !== "undefined") window.removeEventListener("resize", this._onReposition);
    this._impressionObserver?.disconnect();
    this._nativeFormObserver?.disconnect();
    document.removeEventListener("click", this._onNativeAddToCartClick, true);
    this._nativeAddToCartClickAttached = false;
  }
  set widgetData(value) {
    const val = typeof value === "object" ? JSON.stringify(value) : value;
    this.setAttribute("widget-data", val);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "widget-data" || name === "widgetdata") {
      const prev = this._prevSettings || {};
      const next = this.settings;
      if (prev.allow_collapse !== next.allow_collapse || prev.default_bundle_state !== next.default_bundle_state || prev.max_bundles_display !== next.max_bundles_display) {
        this._expandedBundles?.clear();
        this._expandedInitialized = false;
      }
      this._prevSettings = next;
    }
    super.attributeChangedCallback?.(name, oldValue, newValue);
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
    return this.readJsonAttribute("widget-data") ?? this.embeddedData?.fixedWidget ?? {};
  }
  get settings() {
    return this._resolvedFixedWidget?.settings || {};
  }
  get styleSettings() {
    return this._resolvedFixedWidget?.styles || {};
  }
  get pickerLayout() {
    const layout = this.settings.variant_picker_layout;
    return layout === "none" ? "none" : "buttons";
  }
  get _widgetSectionId() {
    return this.getAttribute("section-id") || null;
  }
  _bundleProductOf(bundle) {
    return this.embeddedData?.bundleProducts?.[bundle.bundleHandle] || null;
  }
  _isHighVariant(product) {
    if (this.isBuilderMode) return false;
    return Number(product?.variantsCount) > 250;
  }
  _orderedComponents(bundle) {
    const components = bundle.components || [];
    const currentId = this.embeddedData?.currentProductId;
    if (currentId == null) return components;
    const index = components.findIndex((component) => component.productId === currentId);
    if (index <= 0) return components;
    return [components[index], ...components.slice(0, index), ...components.slice(index + 1)];
  }
  _openEcomposerAjaxCart(addedItem) {
    const ec = typeof window !== "undefined" ? window.EComposer : null;
    if (!ec?.configs?.ajax_cart?.enable || typeof ec.ajaxCartSuccess !== "function") return false;
    try {
      ec.ajaxCartSuccess(addedItem || null);
      return true;
    } catch (error) {
      console.error("[cro-fixed-bundle] EComposer ajax cart open failed:", error);
      return false;
    }
  }
  _bundleDesired(bundle, selection = this._selection[bundle.id] || {}) {
    const desired = {};
    for (const comp of bundle.components || []) {
      for (const opt of comp.options || []) {
        if (!opt.parentName) continue;
        const val = selection[comp.productId]?.[opt.name] ?? ((opt.values || []).length === 1 ? opt.values[0] : null);
        if (val != null) desired[opt.parentName] = val;
      }
    }
    return desired;
  }
  _optionValueIds(optionValues, desiredByName) {
    return (optionValues || []).map((option) => {
      const wanted = desiredByName[option.name];
      return (option.values || []).find((value) => value.value === wanted)?.id ?? null;
    });
  }
  _sectionVariantKey(handle, ids) {
    return `${handle}::${ids.join(",")}`;
  }
  _readCurrentVariant(doc) {
    try {
      const el = doc.querySelector(`script[type="application/json"][data-cro-current="${CSS.escape(this.widgetId)}"]`);
      return el ? JSON.parse(el.textContent) : void 0;
    } catch {
      return void 0;
    }
  }
  async _resolveViaSectionRender(handle, ids) {
    const key = this._sectionVariantKey(handle, ids);
    if (this._variantCache.has(key) || this._variantPending.has(key)) return;
    const sectionId = this._widgetSectionId;
    if (!sectionId || !handle || ids.some((id) => id == null)) return;
    this._variantPending.add(key);
    try {
      const root = window.Shopify?.routes?.root || "/";
      const url = `${root}products/${encodeURIComponent(handle)}?section_id=${encodeURIComponent(sectionId)}&option_values=${encodeURIComponent(ids.join(","))}`;
      const response = await fetch(url);
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      this._variantCache.set(key, { variant: this._readCurrentVariant(doc) || null });
    } catch (error) {
      console.error("[cro-fixed-bundle] section render resolve failed:", error);
      this._variantCache.set(key, { variant: null });
    } finally {
      this._variantPending.delete(key);
      if (this.isConnected) this.render();
    }
  }
  _bundleVariantKey(bundle, selection) {
    const bundleProduct = this._bundleProductOf(bundle);
    if (!bundleProduct) return null;
    const ids = this._optionValueIds(bundleProduct.optionValues, this._bundleDesired(bundle, selection));
    if (ids.some((id) => id == null)) return null;
    return { handle: bundleProduct.handle, ids, key: this._sectionVariantKey(bundleProduct.handle, ids) };
  }
  _ensureBundleVariantResolved(bundle) {
    const bundleProduct = this._bundleProductOf(bundle);
    if (!this._isHighVariant(bundleProduct)) return;
    const resolved = this._bundleVariantKey(bundle);
    if (resolved && !this._variantCache.has(resolved.key)) {
      this._resolveViaSectionRender(resolved.handle, resolved.ids);
    }
  }
  _bundleVariantPending(bundle) {
    const bundleProduct = this._bundleProductOf(bundle);
    if (!this._isHighVariant(bundleProduct)) return false;
    const resolved = this._bundleVariantKey(bundle);
    return Boolean(resolved) && !this._variantCache.has(resolved.key);
  }
  _sk(width, height = "1em") {
    return `<span class="cro-fbw__sk" style="width:${width};height:${height}"></span>`;
  }
  async _hydrate() {
    if (this._hydrating || this._hydrated) return;
    this._hydrating = true;
    if (this.isBuilderMode) {
      const products2 = this.embeddedData?.products || [];
      this._productMap = new Map(products2.map((product) => [product.id, product]));
      this._hydrated = true;
      this._hydrating = false;
      this.render();
      return;
    }
    const handles = [...new Set(
      (this.embeddedData?.bundles || []).flatMap((bundle) => (bundle.components || []).map((component) => component.handle)).filter(Boolean)
    )];
    const products = await Promise.all(handles.map((handle) => this._fetchComponentProduct(handle)));
    this._productMap = new Map(products.filter(Boolean).map((product) => [product.id, product]));
    this._hydrated = true;
    this._hydrating = false;
    if (this.isConnected) this.render();
  }
  async _fetchComponentProduct(handle) {
    window.__croFixedProductCache ||= /* @__PURE__ */ new Map();
    const cache = window.__croFixedProductCache;
    if (cache.has(handle)) return cache.get(handle);
    const root = window.Shopify?.routes?.root || "/";
    const request = fetch(`${root}products/${encodeURIComponent(handle)}.js`, { headers: { Accept: "application/json" } }).then((response) => response.ok ? response.json() : null).then((raw) => raw ? this._normalizeAjaxProduct(raw) : null).catch(() => null);
    cache.set(handle, request);
    return request;
  }
  _normalizeAjaxProduct(raw) {
    const variants = raw.variants || [];
    return {
      id: raw.id,
      handle: raw.handle,
      title: raw.title,
      imageUrl: raw.featured_image || null,
      price: raw.price,
      compare_at_price: raw.compare_at_price,
      available: raw.available,
      variantsCount: variants.length >= 250 ? 1e5 : variants.length,
      optionNames: (raw.options || []).map((option) => typeof option === "string" ? option : option.name),
      variants: variants.map((variant) => ({
        id: variant.id,
        values: variant.options || [],
        price: variant.price,
        compareAtPrice: variant.compare_at_price,
        available: variant.available,
        imageUrl: variant.featured_image?.src || raw.featured_image || null
      }))
    };
  }
  _toggleBundle(bundleId) {
    if (this.settings.allow_collapse === false) return;
    const open = this._expandedBundles.has(bundleId);
    this._expandedBundles.clear();
    this._editor = null;
    this._addState = "idle";
    if (!open) this._expandedBundles.add(bundleId);
    this.render();
  }
  _openEditor(bundleId, productId) {
    this._editor = { bundleId, productId: String(productId) };
    this.render();
  }
  _closeEditor() {
    if (!this._editor) return;
    this._editor = null;
    this.render();
  }
  _pickVariant(bundleId, productId, optionName, value) {
    const numericId = Number(productId);
    this._selection[bundleId] ||= {};
    this._selection[bundleId][numericId] ||= {};
    if (this._selection[bundleId][numericId][optionName] === value) return;
    this._selection[bundleId][numericId][optionName] = value;
    if (this._addState !== "idle") {
      this._addState = "idle";
      this._addBundleId = null;
    }
    const bundle = (this.embeddedData?.bundles || []).find((b) => String(b.id) === String(bundleId));
    if (bundle) this._ensureBundleVariantResolved(bundle);
    this.render();
  }
  async _addBundleToCart(bundle, button) {
    if (this.isBuilderMode) return;
    const variant = this._resolveBundleVariant(bundle);
    if (!variant || variant.available === false) return;
    const root = window.Shopify?.routes?.root || "/";
    const id = Number(String(variant.id).split("/").pop());
    if (!id) return;
    this._addState = "adding";
    this._addBundleId = bundle.id;
    this.render();
    try {
      const properties = { _cro_ext: EXTENSION_TYPE, _cro_campaign: String(bundle.id) };
      const cartItems = await this._fetchCartItems();
      const croSign = this._croSignFromCart(cartItems || [], bundle.id, id);
      if (croSign !== null) properties._cro_sign = croSign;
      const response = await fetch(`${root}cart/add.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          id,
          quantity: 1,
          properties
        })
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(`Cart add failed: ${response.status} ${errorBody?.description || ""}`.trim());
      }
      const lineItem = await response.json().catch(() => null);
      const body = lineItem ? { items: [lineItem] } : null;
      document.dispatchEvent(new CustomEvent("cro:cart-mutated", { detail: body }));
      this.dispatchEvent(new CustomEvent("bundle:add", {
        detail: { bundle, variantId: id },
        bubbles: true,
        composed: true
      }));
      if (!this._openEcomposerAjaxCart(body?.items?.[0])) {
        window.location.href = `${root}cart`;
      }
      const addedItems = Array.isArray(body?.items) ? body.items : [];
      const presentmentUpsellValue = addedItems.reduce((sum, item) => sum + (Number(item.line_price) || 0), 0) / 100;
      const upsellQuantity = addedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      this._fireOfferAccepted(bundle, { presentmentUpsellValue, upsellQuantity });
      this._addState = "success";
      this.render();
      setTimeout(() => {
        if (this._addBundleId === bundle.id) {
          this._addState = "idle";
          this._addBundleId = null;
          this.render();
        }
      }, SUCCESS_RESET_MS);
    } catch (error) {
      console.error("[cro-fixed-bundle] add to cart failed:", error);
      this._addState = "error";
      this.render();
    }
  }
  _bundleRuleName(bundle) {
    return this.embeddedData?.bundleProducts?.[bundle.bundleHandle]?.title || void 0;
  }
  _fireOfferAccepted(bundle, { presentmentUpsellValue, upsellQuantity }) {
    const money = getCurrencyContext(this.getAttribute("shop-currency"));
    const source = getTrafficSource();
    const device = getDevice();
    sendPixelEvent({
      name: "ext_offer_accepted",
      storeId: this.getAttribute("store-id"),
      extensionType: EXTENSION_TYPE,
      ruleId: String(bundle.id),
      ruleName: this._bundleRuleName(bundle),
      pageId: "product-main",
      data: {
        upsell_value: money.toBase(presentmentUpsellValue),
        upsell_quantity: upsellQuantity,
        currency: money.baseCurrency,
        original_price: presentmentUpsellValue,
        original_currency: money.activeCurrency,
        exchange_rate: money.exchangeRate,
        accept_time: this._impressionAtByBundle?.[bundle.id] ? Math.round((Date.now() - this._impressionAtByBundle[bundle.id]) / 1e3) : void 0,
        source,
        device
      }
    });
  }
  _tagNativeAddToCartForms(bundle) {
    this._nativeFormBundle = bundle;
    this._loadNativeCartSnapshot();
    this._applyNativeFormTags(bundle);
    this._observeNativeAddToCartForms();
    this._observeNativeAddToCartButtonClicks();
    publishCroContext(this.getAttribute("shop-currency"));
  }
  /**
   * Form native do theme tự submit và chỉ đọc hidden input đồng bộ, nên không
   * thể đọc giỏ ngay lúc bấm. Đọc một lần khi gắn tag rồi giữ sign cố định cho
   * từng variant suốt vòng đời trang: lần add đầu tạo dòng mang sign đó, các
   * lần sau gửi lại đúng sign nên Shopify gộp vào cùng dòng. Checkout xong là
   * rời trang, lần tải sau đọc lại giỏ đã trống và sinh sign mới.
   */
  _loadNativeCartSnapshot() {
    if (this._nativeCartRequest || this.isBuilderMode) return;
    this._nativeCartRequest = this._fetchCartItems().then((items) => {
      this._nativeCartItems = items || [];
      if (this._nativeFormBundle) this._applyNativeFormTags(this._nativeFormBundle);
    });
  }
  /** `undefined` khi giỏ chưa đọc xong — form tạm chưa có sign, gắn lại khi đọc xong. */
  _nativeCroSign(bundleId, variantId) {
    const key = `${bundleId}:${variantId}`;
    if (key in this._nativeCroSigns) return this._nativeCroSigns[key];
    if (!this._nativeCartItems) return void 0;
    this._nativeCroSigns[key] = this._croSignFromCart(this._nativeCartItems, bundleId, variantId);
    return this._nativeCroSigns[key];
  }
  /**
   * Giỏ đã có dòng cùng variant + cùng `_cro_campaign` thì dùng lại đúng
   * `_cro_sign` của nó để properties khớp và Shopify gộp dòng thay vì tách
   * line item mới; dòng đó không có sign (thêm từ build cũ) thì trả `null`
   * để lần add này cũng bỏ property. Không có dòng nào mới sinh sign mới.
   */
  _croSignFromCart(items, bundleId, variantId) {
    const existing = items.find(
      (item) => String(item.variant_id) === String(variantId) && String(item.properties?._cro_campaign) === String(bundleId)
    );
    if (!existing) return String(Date.now());
    return existing.properties._cro_sign || null;
  }
  async _fetchCartItems() {
    try {
      const root = window.Shopify?.routes?.root || "/";
      const response = await fetch(`${root}cart.js`, { headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      const cart = await response.json();
      return Array.isArray(cart?.items) ? cart.items : null;
    } catch {
      return null;
    }
  }
  _applyNativeFormTags(bundle) {
    const bundleProduct = this.embeddedData?.bundleProducts?.[bundle.bundleHandle];
    const variantIds = new Set((bundleProduct?.variants || []).map((variant) => String(variant.id)));
    if (!variantIds.size) return;
    const forms = document.querySelectorAll('form[action*="/cart/add"]');
    for (const form of forms) {
      const idInput = form.querySelector('[name="id"]');
      if (!idInput || !variantIds.has(String(idInput.value))) continue;
      this._setHiddenFormInput(form, "properties[_cro_ext]", EXTENSION_TYPE);
      this._setHiddenFormInput(form, "properties[_cro_campaign]", String(bundle.id));
      const croSign = this._nativeCroSign(bundle.id, idInput.value);
      if (croSign === null) form.querySelector('input[name="properties[_cro_sign]"]')?.remove();
      else if (croSign !== void 0) this._setHiddenFormInput(form, "properties[_cro_sign]", croSign);
      this._nativeForms.add(form);
      this._attachNativeFormSubmitListener(form, bundle, bundleProduct);
    }
  }
  _attachNativeFormSubmitListener(form, bundle, bundleProduct) {
    if (form.dataset.croOfferListenerAttached) return;
    form.dataset.croOfferListenerAttached = "true";
    form.addEventListener("submit", () => this._reportNativeFormOffer(form, bundle, bundleProduct));
  }
  /** Shared by the form's own `submit` event and the click path below —
   * both resolve to the same variant/quantity read and the same pixel
   * event. A theme page-builder can intercept the button's `click` and add
   * to cart via its own `fetch` without ever calling `form.submit()` /
   * `requestSubmit()`, so a real native submit is not guaranteed even for a
   * `type="submit"` button sitting inside the form. When a native submit DOES
   * follow the click, `_nativeOfferReported` stops it from reporting the same
   * add-to-cart twice — cleared on a macrotask (not a microtask), same as
   * Volume Discount's `runPassthroughSync`, because the browser dispatches
   * that `submit` after the click handler's microtask checkpoint. */
  _reportNativeFormOffer(form, bundle, bundleProduct) {
    if (this._nativeOfferReported) return;
    this._nativeOfferReported = true;
    setTimeout(() => {
      this._nativeOfferReported = false;
    }, 0);
    const idInput = form.querySelector('[name="id"]');
    const variant = bundleProduct?.variants?.find((v) => String(v.id) === String(idInput?.value));
    if (!variant) return;
    const qtyInput = form.querySelector('[name="quantity"]');
    const quantity = Math.max(1, Number(qtyInput?.value) || 1);
    const presentmentUpsellValue = (Number(variant.price) || 0) / 100 * quantity;
    this._fireOfferAccepted(bundle, { presentmentUpsellValue, upsellQuantity: quantity });
  }
  /**
   * A custom add-to-cart control — a theme's sticky/floating bar outside
   * the product `<form>`, or a page-builder button that sits inside the
   * form but intercepts the click itself and adds to cart via its own
   * `fetch` — never reliably produces the form's `submit` event, so
   * `_attachNativeFormSubmitListener` alone silently drops
   * `ext_offer_accepted` for it. Mirrors Volume Discount's
   * `resolveAddToCartGesture`/`ownsFormElement` in VolumeDiscountWidget.js:
   * listen for clicks on the document (capture, so a theme's own handler
   * further down can't stop it first) and match the same broad
   * add-to-cart-button selector, in-form or not — `_reportNativeFormOffer`'s
   * own guard is what keeps an in-form click that DOES also submit natively
   * from double-counting.
   */
  _observeNativeAddToCartButtonClicks() {
    if (this._nativeAddToCartClickAttached) return;
    this._nativeAddToCartClickAttached = true;
    document.addEventListener("click", this._onNativeAddToCartClick, true);
  }
  _onNativeAddToCartClick(event) {
    if (!this._nativeFormBundle || !this._nativeForms.size) return;
    const trigger = event.target.closest?.(
      '[type="submit"], [name="add"], :is(button, a, [role="button"]):is([class*="add-to-cart" i], [class*="add_to_cart" i])'
    );
    if (!trigger || trigger.disabled) return;
    const bundleProduct = this.embeddedData?.bundleProducts?.[this._nativeFormBundle.bundleHandle];
    const triggerVariantId = trigger.getAttribute("data-variant-id");
    if (triggerVariantId && !bundleProduct?.variants?.some((v) => String(v.id) === triggerVariantId)) return;
    const form = this._matchNativeFormForTrigger(trigger);
    if (!form) return;
    this._reportNativeFormOffer(form, this._nativeFormBundle, bundleProduct);
  }
  /**
   * A button nested inside a form belongs to that form — and counts only if
   * it's one we tagged. A button with no form at all (sticky/floating bar)
   * is matched to the product form on the page, except inside a product
   * card / quick-add wrapper, where a formless add-to-cart button belongs to
   * some other product (upsell apps, related-product carousels).
   *
   * Several tagged forms is the normal case, not an edge case: Dawn and its
   * derivatives render a Shop Pay installment form that is also
   * `action="/cart/add"` with the same `name="id"`, and a theme re-render
   * leaves the old, detached form in `_nativeForms`. So stale forms are
   * dropped, then the one with a real submit button wins — the installment
   * form has none.
   */
  _matchNativeFormForTrigger(trigger) {
    const ownForm = trigger.closest("form");
    if (ownForm) return this._nativeForms.has(ownForm) ? ownForm : null;
    const QUICK_ADD_WRAPPER = ".card, .card-wrapper, .product-card, .quick-add, quick-add-modal, [data-quick-add]";
    if (trigger.closest(QUICK_ADD_WRAPPER)) return null;
    for (const form of this._nativeForms) {
      if (!form.isConnected) this._nativeForms.delete(form);
    }
    const connectedForms = [...this._nativeForms];
    if (connectedForms.length <= 1) return connectedForms[0] || null;
    return connectedForms.find((form) => form.querySelector('[type="submit"], [name="add"]')) || connectedForms[0];
  }
  _setHiddenFormInput(form, name, value) {
    let input = form.querySelector(`input[name="${CSS.escape(name)}"]`);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }
  _observeNativeAddToCartForms() {
    if (this._nativeFormObserver || typeof MutationObserver === "undefined") return;
    this._nativeFormObserver = new MutationObserver(() => {
      if (this._nativeFormRetagScheduled) return;
      this._nativeFormRetagScheduled = true;
      const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
      schedule(() => {
        this._nativeFormRetagScheduled = false;
        if (this._nativeFormBundle) this._applyNativeFormTags(this._nativeFormBundle);
      });
    });
    this._nativeFormObserver.observe(document.body, { childList: true, subtree: true });
  }
  _syncImpressionObserver() {
    if (typeof IntersectionObserver === "undefined" || this.isBuilderMode) return;
    if (this.getAttribute("design-mode") === "true") return;
    this._impressionObserver?.disconnect();
    const roots = this.shadowRoot.querySelectorAll(".cro-fbw__bundle[data-bundle-id]");
    if (!roots.length) return;
    this._impressionAtByBundle ||= {};
    window.__croFixedBundleFired = window.__croFixedBundleFired || /* @__PURE__ */ new Set();
    this._impressionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const bundleId = entry.target.getAttribute("data-bundle-id");
        this._impressionObserver.unobserve(entry.target);
        this._fireImpression(bundleId);
      }
    }, { threshold: 0.5 });
    roots.forEach((root) => this._impressionObserver.observe(root));
  }
  _fireImpression(bundleId) {
    publishCroContext(this.getAttribute("shop-currency"));
    if (window.__croFixedBundleFired.has(bundleId)) return;
    window.__croFixedBundleFired.add(bundleId);
    this._impressionAtByBundle[bundleId] = Date.now();
    const bundle = (this.embeddedData?.bundles || []).find((b) => String(b.id) === String(bundleId));
    if (!bundle) return;
    sendPixelEvent({
      name: "ext_impression",
      storeId: this.getAttribute("store-id"),
      extensionType: EXTENSION_TYPE,
      ruleId: String(bundle.id),
      ruleName: this._bundleRuleName(bundle),
      pageId: "product-main",
      data: {
        source: getTrafficSource(),
        device: getDevice()
      }
    });
  }
  _rawOptionName(product, optionName) {
    const title = product?.title;
    if (title && optionName.startsWith(`${title} (`) && optionName.endsWith(")")) {
      return optionName.slice(title.length + 2, -1);
    }
    return optionName;
  }
  _optionIndex(product, optionName) {
    const names = product?.optionNames || [];
    const direct = names.indexOf(optionName);
    if (direct >= 0) return direct;
    const raw = this._rawOptionName(product, optionName);
    return raw === optionName ? -1 : names.indexOf(raw);
  }
  _liveValuesForOption(product, optionName) {
    const idx = this._optionIndex(product, optionName);
    if (idx < 0) return [];
    const seen = [];
    for (const v of product?.variants || []) {
      const val = v.values?.[idx];
      if (val != null && !seen.includes(val)) seen.push(val);
    }
    return seen;
  }
  _pickerOptions(component, product) {
    const result = [];
    const high = this._isHighVariant(product);
    for (const opt of component.options || []) {
      const allowed = opt.values || [];
      if (allowed.length < 2) continue;
      if (high) {
        result.push({ name: opt.name, parentName: opt.parentName, values: allowed });
        continue;
      }
      const live = this._liveValuesForOption(product, opt.name);
      const values = allowed.filter((v) => live.includes(v));
      if (values.length >= 2) result.push({ name: opt.name, parentName: opt.parentName, values });
    }
    return result;
  }
  _componentDesired(bundleId, component) {
    const desired = {};
    const sel = this._selection[bundleId]?.[component.productId] || {};
    for (const opt of component.options || []) {
      const allowed = opt.values || [];
      if (allowed.length >= 2) {
        if (sel[opt.name] != null) desired[opt.name] = sel[opt.name];
      } else if (allowed.length === 1) {
        desired[opt.name] = allowed[0];
      }
    }
    return desired;
  }
  _matchVariant(product, desiredByName) {
    const variants = product?.variants || [];
    const matches = (v) => Object.entries(desiredByName).every(([name, val]) => {
      const idx = this._optionIndex(product, name);
      return idx < 0 ? true : v.values?.[idx] === val;
    });
    return variants.find((v) => v.available !== false && matches(v)) || variants.find((v) => matches(v)) || variants.find((v) => v.available !== false) || variants[0] || null;
  }
  _resolveComponentVariant(bundleId, component, product) {
    if (this._isHighVariant(product)) return null;
    if (!product?.variants?.length) return null;
    return this._matchVariant(product, this._componentDesired(bundleId, component));
  }
  _valueAvailable(bundleId, component, product, optionName, value) {
    if (this._isHighVariant(product)) return true;
    const desired = { ...this._componentDesired(bundleId, component), [optionName]: value };
    return (product?.variants || []).some((v) => v.available !== false && Object.entries(desired).every(([name, val]) => {
      const idx = this._optionIndex(product, name);
      return idx < 0 ? true : v.values?.[idx] === val;
    }));
  }
  _defaultValue(product, optionName, values) {
    const idx = this._optionIndex(product, optionName);
    const firstAvail = values.find((val) => (product?.variants || []).some((v) => v.available !== false && v.values?.[idx] === val));
    return firstAvail || values[0];
  }
  _ensureSelection(bundle) {
    this._selection[bundle.id] ||= {};
    const sel = this._selection[bundle.id];
    for (const comp of bundle.components || []) {
      const product = this._productMap.get(comp.productId);
      if (!product) continue;
      const pickerOpts = this._pickerOptions(comp, product);
      if (!pickerOpts.length) continue;
      sel[comp.productId] ||= {};
      for (const opt of pickerOpts) {
        const current = sel[comp.productId][opt.name];
        if (current == null || !opt.values.includes(current)) {
          sel[comp.productId][opt.name] = this._defaultValue(product, opt.name, opt.values);
        }
      }
    }
    this._syncSelectionToAvailableBundleVariant(bundle);
    this._ensureBundleVariantResolved(bundle);
  }
  _syncSelectionToAvailableBundleVariant(bundle) {
    const bundleProduct = this._bundleProductOf(bundle);
    if (this._isHighVariant(bundleProduct)) return;
    if (!bundleProduct?.variants?.length) return;
    const optionNames = bundleProduct.optionNames || [];
    const mappings = [];
    for (const component of bundle.components || []) {
      for (const option of component.options || []) {
        if (!option.parentName) continue;
        const bundleOptionIndex = optionNames.indexOf(option.parentName);
        if (bundleOptionIndex < 0) continue;
        mappings.push({ component, option, bundleOptionIndex });
      }
    }
    const candidates = bundleProduct.variants.filter((variant) => variant.available !== false && mappings.every(({ option, bundleOptionIndex }) => !option.values?.length || option.values.includes(variant.values?.[bundleOptionIndex])));
    if (!candidates.length) return;
    const selection = this._selection[bundle.id] || {};
    const score = (variant) => mappings.reduce((total, { component, option, bundleOptionIndex }) => {
      const selected = selection[component.productId]?.[option.name];
      return total + (selected != null && selected === variant.values?.[bundleOptionIndex] ? 1 : 0);
    }, 0);
    const selectedVariant = candidates.reduce((best, candidate) => score(candidate) > score(best) ? candidate : best, candidates[0]);
    for (const { component, option, bundleOptionIndex } of mappings) {
      if ((option.values || []).length < 2) continue;
      const value = selectedVariant.values?.[bundleOptionIndex];
      if (value == null || !option.values.includes(value)) continue;
      selection[component.productId] ||= {};
      selection[component.productId][option.name] = value;
    }
  }
  _resolveBundleVariant(bundle, selection = this._selection[bundle.id] || {}) {
    const bundleProduct = this._bundleProductOf(bundle);
    if (!bundleProduct) return null;
    if (this._isHighVariant(bundleProduct)) {
      const resolved = this._bundleVariantKey(bundle, selection);
      if (!resolved) return null;
      const cached = this._variantCache.get(resolved.key);
      return cached ? cached.variant : null;
    }
    if (!bundleProduct.variants?.length) return null;
    const desired = this._bundleDesired(bundle, selection);
    const names = bundleProduct.optionNames || [];
    const matches = (v) => Object.entries(desired).every(([name, val]) => {
      const idx = names.indexOf(name);
      return idx < 0 ? true : v.values?.[idx] === val;
    });
    return bundleProduct.variants.find((v) => v.available !== false && matches(v)) || bundleProduct.variants.find((v) => matches(v)) || null;
  }
  _bundleTotals(bundle, components, productMap) {
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
  }
  _resolveTotals(bundle, components) {
    const bundleVariant = this._resolveBundleVariant(bundle);
    const fallback = this._bundleTotals(bundle, components, this._productMap);
    let totals = fallback;
    if (bundleVariant) {
      const now = bundleVariant.price ?? fallback.now;
      const original = bundleVariant.compareAtPrice != null && bundleVariant.compareAtPrice > now ? bundleVariant.compareAtPrice : Math.max(now, fallback.original);
      const saved = Math.max(0, original - now);
      const pct = original > 0 ? Math.round(saved / original * 100) : 0;
      totals = { now, original, saved, pct };
    }
    const addable = Boolean(bundleVariant) && bundleVariant.available !== false;
    return { totals, addable, pending: this._bundleVariantPending(bundle) };
  }
  _t(value, vars, fallback) {
    return this.resolveTextTemplate(value, vars || {}, fallback).trim();
  }
  _text(name, vars) {
    return this._t(this.settings[name], vars, DEFAULT_TEXT[name]);
  }
  _textHtml(name, vars) {
    const template = this.escapeHtml(this._resolveLocaleValue(this.settings[name], DEFAULT_TEXT[name])).trim();
    return this.resolveTextTemplate(template, vars || {}, "");
  }
  _safeImg(url) {
    return url ? url.startsWith("//") ? "https:" + url : url : "";
  }
  _variantSummaryText(product, variant) {
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
  }
  _icoChevron() {
    return `<svg class="cro-fbw__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
  }
  _icoPencil() {
    return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M9.91585 4.89302L11.177 3.63184C11.5597 3.24913 11.7515 3.05742 11.854 2.85097C11.95 2.65714 12 2.44373 12 2.2274C12 2.01107 11.95 1.79767 11.854 1.60383C11.7515 1.39738 11.5597 1.20567 11.177 0.822963C10.7943 0.440254 10.6026 0.248548 10.3962 0.146024C10.2023 0.0499738 9.98893 0 9.7726 0C9.55627 0 9.34286 0.0499738 9.14903 0.146024C8.94258 0.248548 8.75087 0.440254 8.36816 0.822963L7.09083 2.1003C7.77032 3.2636 8.74481 4.22695 9.91585 4.89302ZM6.0698 3.12133L1.24555 7.94557C0.946409 8.24472 0.797538 8.39359 0.699228 8.57757C0.600917 8.76014 0.559486 8.9673 0.477327 9.38161L0.0447596 11.5423C-0.00158681 11.7755 -0.0254623 11.892 0.0412485 11.9588C0.107959 12.0255 0.223825 12.0016 0.457664 11.9552L2.61839 11.5227C3.0327 11.4405 3.23986 11.3991 3.42314 11.3008C3.60641 11.2025 3.75529 11.0536 4.05373 10.7551L8.89202 5.91686C7.75585 5.20558 6.7917 4.25102 6.0691 3.12203" fill="black" style="fill:black;fill-opacity:1;"/> </svg>`;
  }
  _icoCheck() {
    return `<svg class="cro-fbw__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>`;
  }
  _renderPicker(bundle, component, product) {
    const layout = this.pickerLayout;
    if (layout === "none") return "";
    const pickerOpts = this._pickerOptions(component, product);
    if (!pickerOpts.length) return "";
    const sel = this._selection[bundle.id]?.[component.productId] || {};
    return pickerOpts.map((opt) => {
      const attrs = `data-bundle-id="${this.escapeHtml(bundle.id)}" data-product-id="${this.escapeHtml(component.productId)}" data-option="${this.escapeHtml(opt.name)}"`;
      const radios = opt.values.map((val) => {
        const selected = sel[opt.name] === val;
        const available = this._valueAvailable(bundle.id, component, product, opt.name, val);
        return `<label class="cro-fbw__radio${!available ? " cro-fbw__radio--sold" : ""}">
                    <input type="radio" class="cro-fbw__radio-input" name="${this.escapeHtml(`${bundle.id}:${component.productId}:${opt.name}`)}" value="${this.escapeHtml(val)}" ${selected ? "checked" : ""} ${!available ? "disabled" : ""} data-action="pick" ${attrs} data-value="${this.escapeHtml(val)}">
                    <span class="cro-fbw__radio-dot" aria-hidden="true"></span>
                    <span class="cro-fbw__radio-text">${this.escapeHtml(val)}</span>
                </label>`;
      }).join("");
      return `<fieldset class="cro-fbw__opt">
                <legend class="cro-fbw__opt-label">${this.escapeHtml(opt.name)}</legend>
                <div class="cro-fbw__radios">${radios}</div>
            </fieldset>`;
    }).join("");
  }
  _renderCard(bundle, component, product, readOnly = false) {
    const variant = this._resolveComponentVariant(bundle.id, component, product);
    const title = product?.title || this._formatHandle(product?.handle || component.handle);
    const linkHandle = product?.handle || component.handle || "";
    const img = this._safeImg(variant?.imageUrl || product?.imageUrl);
    const qty = component.quantity ?? 1;
    const price = variant?.price ?? product?.price ?? 0;
    const compare = variant?.compareAtPrice ?? product?.compare_at_price ?? 0;
    const hasCompare = compare > 0 && compare > price;
    const summary = this._variantSummaryText(product, variant);
    const orient = this.settings.card_layout === "horizontal" ? "cro-fbw__card--h" : "cro-fbw__card--v";
    const hasPicker = this.pickerLayout !== "none" && product && this._pickerOptions(component, product).length > 0;
    const unavailable = variant ? variant.available === false : false;
    const settings = this.settings;
    const showPrice = settings.show_product_price !== false && !!product;
    const showCompare = showPrice && settings.show_product_compare_price !== false && hasCompare;
    const showSummary = !readOnly && settings.show_product_variant_summary !== false && summary;
    const showQty = settings.show_product_quantity !== false;
    const media = img ? `<img class="cro-fbw__img" src="${this.escapeHtml(img)}" alt="${this.escapeHtml(title)}" loading="lazy">` : `<span class="cro-fbw__img cro-fbw__img--ph" role="img" aria-label="${this.escapeHtml(title)}"></span>`;
    const oosLabel = `<span class="cro-fbw__oos">${this.escapeHtml(this._text("out_of_stock_text"))}</span>`;
    const changeBtn = `<button type="button" class="cro-fbw__change" data-action="edit" data-bundle-id="${this.escapeHtml(bundle.id)}" data-product-id="${this.escapeHtml(component.productId)}">${this._icoPencil()}<span>${this.escapeHtml(this._text("change_variant_text"))}</span></button>`;
    const action = !readOnly && hasPicker ? unavailable ? `${oosLabel}${changeBtn}` : changeBtn : unavailable ? oosLabel : "";
    return `<div class="cro-fbw__card ${orient}${unavailable ? " cro-fbw__card--unavailable" : ""}" data-bundle-id="${this.escapeHtml(bundle.id)}" data-product-id="${this.escapeHtml(component.productId)}">
            <div class="cro-fbw__media">
                ${media}
            ${showQty ? `<span class="cro-fbw__qty">${this.escapeHtml(String(qty))}</span>` : ""}</div>

            <div class="cro-fbw__card-body">
                ${linkHandle ? `<a class="cro-fbw__name" href="/products/${this.escapeHtml(linkHandle)}">${this.escapeHtml(title)}</a>` : `<span class="cro-fbw__name">${this.escapeHtml(title)}</span>`}
                ${showPrice ? `<span class="cro-fbw__card-price">
                    ${showCompare ? `<span class="cro-fbw__card-was">${this.escapeHtml(this.formatMoney(compare))}</span>` : ""}
                    <span class="cro-fbw__card-now">${this.escapeHtml(this.formatMoney(price))}</span>
                </span>` : ""}
                ${showSummary ? `<span class="cro-fbw__variant">${this.escapeHtml(summary)}</span>` : ""}
                ${action}
            </div>
        </div>`;
  }
  _renderBundle(bundle, index, allowCollapse) {
    const components = this._orderedComponents(bundle);
    this._ensureSelection(bundle);
    const { totals, addable, pending } = this._resolveTotals(bundle, components);
    const isOpen = allowCollapse ? this._expandedBundles.has(bundle.id) : true;
    const hasSaving = totals.saved > 0;
    const count = components.reduce((s, c) => s + (c.quantity ?? 1), 0);
    const id = `cro-fbw-b${index}`;
    const thumbs = this.settings.show_bundle_thumbnails === false ? "" : components.slice(0, 3).map((c) => {
      const img = this._safeImg(this._productMap.get(c.productId)?.imageUrl);
      return `<span class="cro-fbw__thumb">${img ? `<img src="${this.escapeHtml(img)}" alt="" loading="lazy">` : ""}</span>`;
    }).join("") + (components.length > 3 ? `<span class="cro-fbw__thumb-more">+${components.length - 3}</span>` : "");
    const badge = bundle.badge ? `<span class="cro-fbw__flag">${this.escapeHtml(bundle.badge)}</span>` : "";
    const saveText = hasSaving ? this._text("save_price_text", { amount: this.formatMoney(totals.saved), discount: `${totals.pct || 0}%` }) : "";
    const priceBlock = pending ? `<span class="cro-fbw__price">
                <span class="cro-fbw__price-now">${this._sk("68px", "1.05em")}</span>
                <span class="cro-fbw__price-was">${this._sk("44px", "0.85em")}</span>
                <span class="cro-fbw__save">${this._sk("58px", "0.85em")}</span>
            </span>` : `<span class="cro-fbw__price">
                <span class="cro-fbw__price-now">${this.escapeHtml(this.formatMoney(totals.now))}</span>
                ${hasSaving ? `<span class="cro-fbw__price-was">${this.escapeHtml(this.formatMoney(totals.original))}</span>` : ""}
                ${saveText ? `<span class="cro-fbw__save">${this.escapeHtml(saveText)}</span>` : ""}
            </span>`;
    const cards = components.map((c) => this._renderCard(bundle, c, this._productMap.get(c.productId))).join("");
    const list = this.settings.product_layout === "slider" ? `<div class="cro-fbw__slider">
                    <button type="button" class="cro-fbw__arrow cro-fbw__arrow--prev" data-action="slide" data-dir="-1" aria-label="Previous" disabled>${ARROW_ICON}</button>
                    <div class="cro-fbw__cards cro-fbw__cards--slide">${cards}</div>
                    <button type="button" class="cro-fbw__arrow cro-fbw__arrow--next" data-action="slide" data-dir="1" aria-label="More">${ARROW_ICON}</button>
               </div>` : `<div class="cro-fbw__cards cro-fbw__cards--grid">${cards}</div>`;
    const panel = isOpen ? `<div class="cro-fbw__panel" id="${id}-panel" role="region" aria-labelledby="${id}">
            ${list}
            ${this._renderCta(bundle, totals, count, addable, pending)}
        </div>` : `<div class="cro-fbw__panel" id="${id}-panel" hidden></div>`;
    const head = `<div class="cro-fbw__head${allowCollapse ? "" : " cro-fbw__head--static"}"
            ${allowCollapse ? `data-action="toggle" data-bundle-id="${this.escapeHtml(bundle.id)}" role="button" tabindex="0"` : ""}
            aria-expanded="${isOpen}" aria-controls="${id}-panel" id="${id}">
            <span class="cro-fbw__head-copy">
                <div class="cro-fbw__bundle-title-wrapper">
                    ${allowCollapse ? `<span class="cro-fbw__chevron-wrap">${this._icoChevron()}</span>` : ""}
                    <a class="cro-fbw__bundle-title" href="/products/${this.escapeHtml(bundle.bundleHandle)}">${this.escapeHtml(this.embeddedData?.bundleProducts?.[bundle.bundleHandle]?.title || "")}</a>
                    ${badge}
                </div>
                ${thumbs ? `<span class="cro-fbw__thumbs">${thumbs}</span>` : ""}
            </span>
            ${priceBlock}
        </div>`;
    return `<section class="cro-fbw__bundle${isOpen ? " cro-fbw__bundle--open" : ""}${addable ? "" : " cro-fbw__bundle--unavailable"}" data-bundle-id="${this.escapeHtml(bundle.id)}">
            ${head}${panel}
        </section>`;
  }
  _renderCta(bundle, totals, count, addable, pending) {
    const state = pending ? "resolving" : !addable ? "unavailable" : this._addBundleId === bundle.id ? this._addState : "idle";
    const discount = `${totals.pct || 0}%`;
    const savedHtml = `<span class="cro-fbw__note-save">${this.escapeHtml(this.formatMoney(totals.saved))}</span>`;
    const summary = totals.saved > 0 ? this._textHtml("summary_text", { items: count, saved: savedHtml, discount }) : "";
    const label = this._text("add_to_cart_text", { price: this.formatMoney(totals.now), items: count });
    let button, note = summary;
    switch (state) {
      case "resolving":
        button = `<button type="button" class="cro-fbw__cta" disabled>${this._textHtml("add_to_cart_text", { price: this._sk("52px", "0.9em"), items: count })}</button>`;
        note = `<span class="cro-fbw__sk" style="width:70%;height:0.85em"></span>`;
        break;
      case "unavailable":
        button = `<button type="button" class="cro-fbw__cta cro-fbw__cta--unavailable" disabled>${this.escapeHtml(this._text("unavailable_text"))}</button>`;
        note = "";
        break;
      case "adding":
        button = `<button type="button" class="cro-fbw__cta cro-fbw__cta--loading" disabled><span class="cro-fbw__spinner"></span>${this.escapeHtml(this._text("adding_text"))}</button>`;
        break;
      case "success":
        button = `<button type="button" class="cro-fbw__cta cro-fbw__cta--success" disabled>${this._icoCheck()}<span>${this.escapeHtml(this._text("added_text"))}</span></button>`;
        break;
      case "error":
        button = `<button type="button" class="cro-fbw__cta" data-action="add" data-bundle-id="${this.escapeHtml(bundle.id)}">${this.escapeHtml(this._text("retry_text"))}</button>`;
        break;
      default:
        button = `<button type="button" class="cro-fbw__cta" data-action="add" data-bundle-id="${this.escapeHtml(bundle.id)}">${this.escapeHtml(label)}</button>`;
    }
    return `<div class="cro-fbw__foot" data-bundle-id="${this.escapeHtml(bundle.id)}" aria-live="polite">${button}${note ? `<p class="cro-fbw__note">${note}</p>` : ""}</div>`;
  }
  _renderEditor() {
    const ed = this._editor;
    if (!ed) return `<div class="cro-fbw__editor" data-editor hidden></div>`;
    const bundle = (this.embeddedData?.bundles || []).find((b) => String(b.id) === String(ed.bundleId));
    const component = bundle?.components?.find((c) => String(c.productId) === String(ed.productId));
    const product = this._productMap.get(Number(ed.productId));
    if (!bundle || !component || !product) return `<div class="cro-fbw__editor" data-editor hidden></div>`;
    const title = this._text("picker_title_text", { product_title: product.title || this._formatHandle(product.handle) });
    return `<div class="cro-fbw__editor cro-fbw__editor--open" data-editor>
            <div class="cro-fbw__backdrop" data-action="close-editor"></div>
            <div class="cro-fbw__sheet" role="dialog" aria-modal="true" aria-label="${this.escapeHtml(title)}">
                <div class="cro-fbw__sheet-head">
                    <h4 class="cro-fbw__sheet-title">${this.escapeHtml(title)}</h4>
                    <button type="button" class="cro-fbw__sheet-close" data-action="close-editor" aria-label="Close">×</button>
                </div>
                <div class="cro-fbw__sheet-body">${this._renderPicker(bundle, component, product)}</div>
                <button type="button" class="cro-fbw__sheet-done" data-action="close-editor">${this.escapeHtml(this._text("picker_done_text"))}</button>
            </div>
        </div>`;
  }
  _renderCurrentBundleView(bundle) {
    const components = this._orderedComponents(bundle);
    this._ensureSelection(bundle);
    const cards = components.map((c) => this._renderCard(bundle, c, this._productMap.get(c.productId), true)).join("");
    const list = this.settings.product_layout === "slider" ? `<div class="cro-fbw__slider">
                    <button type="button" class="cro-fbw__arrow cro-fbw__arrow--prev" data-action="slide" data-dir="-1" aria-label="Previous" disabled>${ARROW_ICON}</button>
                    <div class="cro-fbw__cards cro-fbw__cards--slide">${cards}</div>
                    <button type="button" class="cro-fbw__arrow cro-fbw__arrow--next" data-action="slide" data-dir="1" aria-label="More">${ARROW_ICON}</button>
               </div>` : `<div class="cro-fbw__cards cro-fbw__cards--grid">${cards}</div>`;
    const badge = bundle.badge ? `<span class="cro-fbw__flag">${this.escapeHtml(bundle.badge)}</span>` : "";
    const head = `<div class="cro-fbw__head cro-fbw__head--static cro-fbw__head--products">
            <span class="cro-fbw__head-copy">
                <div class="cro-fbw__bundle-title-wrapper">
                    <span class="cro-fbw__bundle-title">${this.escapeHtml(this._text("included_products_text"))}</span>
                    ${badge}
                </div>
            </span>
        </div>`;
    return `<section class="cro-fbw__bundle cro-fbw__bundle--open cro-fbw__bundle--products" data-bundle-id="${this.escapeHtml(bundle.id)}">
            ${head}
            <div class="cro-fbw__panel">${list}</div>
        </section>`;
  }
  _captureScroll() {
    if (!this.shadowRoot) return null;
    const sliders = {};
    this.shadowRoot.querySelectorAll(".cro-fbw__cards--slide").forEach((row) => {
      const key = row.closest("[data-bundle-id]")?.getAttribute("data-bundle-id") ?? "0";
      sliders[key] = row.scrollLeft;
    });
    const sheet = this.shadowRoot.querySelector(".cro-fbw__sheet");
    const sheetBody = this.shadowRoot.querySelector(".cro-fbw__sheet-body");
    return { sliders, sheet: sheet ? sheet.scrollTop : null, sheetBody: sheetBody ? sheetBody.scrollTop : null };
  }
  _restoreScroll(state) {
    if (!state || !this.shadowRoot) return;
    for (const [key, left] of Object.entries(state.sliders)) {
      const section = this.shadowRoot.querySelector(`[data-bundle-id="${CSS.escape(key)}"]`);
      const row = section?.querySelector(".cro-fbw__cards--slide") || this.shadowRoot.querySelector(".cro-fbw__cards--slide");
      if (row) row.scrollLeft = left;
    }
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
    this._pendingScroll = this._captureScroll();
    const { bundles, isCurrentProductBundle } = this.embeddedData || {};
    if (!bundles?.length) {
      this.shadowRoot.innerHTML = "";
      return;
    }
    if (!this._hydrated) {
      this.shadowRoot.innerHTML = "";
      return;
    }
    this.toggleAttribute("data-editing", Boolean(this._editor));
    if (isCurrentProductBundle) {
      this.shadowRoot.innerHTML = `${this.styles}
                <div class="cro-fbw cro-fbw--products">
                    <div class="cro-fbw__list" role="group" aria-label="Bundle products">
                        ${this._renderCurrentBundleView(bundles[0])}
                    </div>
                </div>`;
      this._attachEvents();
      this._afterRender();
      this._tagNativeAddToCartForms(bundles[0]);
      return;
    }
    const settings = this.settings || {};
    const maxBundles = Math.max(1, Number(settings.max_bundles_display) || 3);
    const visibleBundles = bundles.slice(0, maxBundles);
    const allowCollapse = settings.allow_collapse !== false && visibleBundles.length > 1;
    if (!this._expandedInitialized && visibleBundles.length > 0) {
      this._expandedInitialized = true;
      const defaultState = settings.default_bundle_state || "first_expanded";
      if (allowCollapse && defaultState === "first_expanded") this._expandedBundles.add(visibleBundles[0].id);
    }
    const headerText = this._text("header_text");
    const header = headerText ? `<div class="cro-fbw__header">
            <span class="cro-fbw__header-text">${this.escapeHtml(headerText)}</span>
        </div>` : "";
    this.shadowRoot.innerHTML = `${this.styles}
            <div class="cro-fbw">
                ${header}
                <div class="cro-fbw__list" role="group" aria-label="Available bundles">
                    ${visibleBundles.map((b, i) => this._renderBundle(b, i, allowCollapse)).join("")}
                </div>
                ${this._renderEditor()}
            </div>`;
    this._attachEvents();
    this._afterRender();
  }
  _afterRender() {
    this._restoreScroll(this._pendingScroll);
    this._pendingScroll = null;
    this._positionEditor();
    this._syncSlider();
    this._syncImpressionObserver();
  }
  _onReposition() {
    this._positionEditor();
  }
  _positionEditor() {
    if (!this._editor || !this.shadowRoot) return;
    const root = this.shadowRoot.querySelector(".cro-fbw");
    const sheet = this.shadowRoot.querySelector(".cro-fbw__sheet");
    const card = this.shadowRoot.querySelector(`.cro-fbw__card[data-bundle-id="${CSS.escape(this._editor.bundleId)}"][data-product-id="${CSS.escape(this._editor.productId)}"]`);
    if (!root || !sheet || !card) return;
    const W = 288, rr = root.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const left = Math.max(8, Math.min(cr.left - rr.left, root.clientWidth - W - 8));
    sheet.style.setProperty("--cro-pop-left", Math.round(left) + "px");
    sheet.style.setProperty("--cro-pop-top", Math.round(cr.bottom - rr.top + 6) + "px");
    sheet.style.setProperty("--cro-pop-w", W + "px");
  }
  _syncSlider() {
    const row = this.shadowRoot?.querySelector(".cro-fbw__cards--slide");
    if (!row) return;
    const prev = this.shadowRoot.querySelector(".cro-fbw__arrow--prev");
    const next = this.shadowRoot.querySelector(".cro-fbw__arrow--next");
    const update = () => {
      const max = row.scrollWidth - row.clientWidth - 2;
      const fits = max <= 2;
      row.style.overflowX = fits ? "unset" : "";
      if (prev) prev.disabled = row.scrollLeft <= 2;
      if (next) next.disabled = row.scrollLeft >= max || fits;
    };
    row.addEventListener("scroll", update, { passive: true });
    if (typeof window !== "undefined") window.requestAnimationFrame(update);
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
      const slide = e.target.closest("[data-action='slide']");
      if (slide) {
        const row = this.shadowRoot.querySelector(".cro-fbw__cards--slide");
        if (row) row.scrollBy({ left: Number(slide.dataset.dir) * row.clientWidth * 0.8, behavior: "smooth" });
        return;
      }
      const add = e.target.closest("[data-action='add']");
      if (add) {
        if (add.disabled) return;
        const bundle = (this.embeddedData?.bundles || []).find((b) => String(b.id) === String(add.dataset.bundleId));
        if (bundle) this._addBundleToCart(bundle, add);
        return;
      }
    });
    this.shadowRoot.addEventListener("change", (e) => {
      const el = e.target.closest?.("[data-action='pick']");
      if (!el || el.disabled) return;
      this._pickVariant(el.dataset.bundleId, el.dataset.productId, el.dataset.option, el.dataset.value);
    });
    this.shadowRoot.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._editor) this._closeEditor();
      if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-action='toggle']")) {
        e.preventDefault();
        const toggle = e.target.closest("[data-action='toggle']");
        if (toggle) this._toggleBundle(toggle.dataset.bundleId);
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
      const css = this._typographyCss(styleSettings[field]);
      return css ? `.cro-fbw ${selector} { ${css} }` : "";
    }).filter(Boolean).join("\n");
    const overrides = `.cro-fbw {
    ${declarations}
}
${typographyRules}`;
    const customCss = String(styleSettings.custom_css || "").replace(/<\/style/gi, "");
    return `<style>${fixedBundleStyles}
${overrides}</style>${customCss ? `<style>${customCss}</style>` : ""}`;
  }
}
if (typeof customElements !== "undefined" && !customElements.get("cro-fixed-bundle-widget")) {
  customElements.define("cro-fixed-bundle-widget", FixedBundleWidget);
}
export {
  FixedBundleWidget as default
};
