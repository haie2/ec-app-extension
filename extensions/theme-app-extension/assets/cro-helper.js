(function() {
  if (window.CRO_HUB) {
    console.warn("[cro-hub locale] window.CRO_HUB already exists, skipping reinit", window.CRO_HUB);
    return;
  }
  var activeMoneyFormat = function() {
    var host = window.EComposer || {};
    return (host.currencyCodeEnabled ? host.money_with_currency_format : host.money_format) || "";
  };
  var formatMoney = function(amount) {
    if (!window.EComposer || typeof window.EComposer.formatMoney !== "function") return amount;
    try {
      return window.EComposer.formatMoney(amount);
    } catch (err) {
      console.error("[cro-hub locale] EComposer.formatMoney failed", err);
      return amount;
    }
  };
  window.CRO_HUB = {
    currentLocale: window.Shopify && window.Shopify.locale || "en",
    formatMoney,
    /* Shop currency → active presentment currency. Widgets need it because
       merchant-configured money (a bundle price, a "spend $50" threshold)
       is stored in the shop currency while everything they price a cart
       against is presentment. Read on every access: `window.Shopify.currency`
       is set by the theme and can land after this file has run. */
    get currencyRate() {
      var rate = Number(window.Shopify && window.Shopify.currency && window.Shopify.currency.rate);
      return isFinite(rate) && rate > 0 ? rate : 1;
    },
    /* Widgets that need to keep a Subtotal/Discount/Total row additive (e.g.
       "Subtotal − Discount == Total") round to this grain in cents *before*
       formatting each value, instead of letting `formatMoney` round each one
       independently — see `BaseWidget.roundMoneyCents`. Read on every access
       rather than computed once: the host embed is an async script, so its
       money format can land after this file has run. */
    get moneyDecimals() {
      return /no_decimals/.test(activeMoneyFormat()) ? 0 : 2;
    }
  };
})();
