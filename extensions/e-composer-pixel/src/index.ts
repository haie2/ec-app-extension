import { register } from "@shopify/web-pixels-extension";
import { registerCroPixels } from "./pixel-registry";

const logJson = (label: string, data: any) => {
    try {
        console.log(label, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(label, data);
    }
};

const createEventId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
        const random = Math.floor(Math.random() * 16);
        return (Number(c) ^ (random >> (Number(c) / 4))).toString(16);
    });
};

register(async ({ settings, analytics, browser }) => {
    // CRO Hub's Fixed Bundle / Mix & Match Bundle pixel modules (synced from
    // cro-hub's share-extensions/pixel-modules) — wired in here because a Web
    // Pixel extension only runs a single `register()` call, so they share this
    // sandbox's `analytics`/`browser`/`settings` instead of getting their own.
    registerCroPixels({ settings, analytics, browser });

    // Data structures for tracking multiple campaigns
    let campaignHistory: any[] = []; // All campaigns user has seen
    let cartItems: any[] = []; // Track which campaign each cart item belongs to
    let ec_client_id: string | null = null;
    var ec_data: any = {};
    let currencyInfo = {
        base_currency: "USD",
        active_currency: "USD",
        exchange_rate: 1,
    };
    const CART_TRACKING_KEY = "ec_cart_tracking";
    const PAGE_VIEWED_KEY = "ec_page_viewed";
    const THANK_YOU_DRAFT_TRACKING_KEY = "ec_ty_draft_tracking";
    const CART_TRACKING_TTL = 24 * 60 * 60 * 1000; // 24 hours
    const THANK_YOU_DRAFT_TRACKING_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Initialize client ID
    const initClientId = async () => {
        ec_client_id = await browser.localStorage.getItem("ec_client_id");
        if (!ec_client_id) {
            ec_client_id =
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);
            await browser.localStorage.setItem("ec_client_id", ec_client_id);
        }
    };

    const convertToBaseCurrency = (price: number): number => {
        // If already in base currency, no conversion
        if (currencyInfo.active_currency === currencyInfo.base_currency) {
            return price;
        }

        // If invalid rate, return original
        if (!currencyInfo.exchange_rate || currencyInfo.exchange_rate <= 0) {
            console.warn(
                "[EComposer Pixel] Invalid exchange rate, using original price"
            );
            return price;
        }

        // Convert: base_price = current_price / rate
        const converted = price / currencyInfo.exchange_rate;


        return converted;
    };

    const saveCartTracking = async (cartData: any) => {
        try {
            const stored = await browser.localStorage.getItem(
                CART_TRACKING_KEY
            );
            let cartItems = stored ? JSON.parse(stored) : [];

            const now = Date.now();

            // Filter expired items
            cartItems = cartItems.filter(
                (item: any) => now - item.added_at < CART_TRACKING_TTL
            );

            cartItems.push({
                ...cartData,
                added_at: now,
                ec_client_id: ec_client_id,
            });

            await browser.localStorage.setItem(
                CART_TRACKING_KEY,
                JSON.stringify(cartItems)
            );
        } catch (error) {
            console.error(
                "[EComposer Pixel] Error saving cart tracking:",
                error
            );
        }
    };

    const hasCartItems = async () => {
        try {
            const stored = await browser.localStorage.getItem(
                CART_TRACKING_KEY
            );
            if (!stored) return false;

            const cartItems = JSON.parse(stored);
            const now = Date.now();

            // Filter valid items
            const validItems = cartItems.filter(
                (item: any) => now - item.added_at < CART_TRACKING_TTL
            );

            return validItems.length > 0;
        } catch (error) {
            return false;
        }
    };

    const getTrackedCartItems = async () => {
        try {
            const stored = await browser.localStorage.getItem(
                CART_TRACKING_KEY
            );
            if (!stored) return [];

            const cartItems = JSON.parse(stored);
            const now = Date.now();

            return cartItems.filter(
                (item: any) => now - item.added_at < CART_TRACKING_TTL
            );
        } catch (error) {
            console.error(
                "[EComposer Pixel] Error getting cart tracking:",
                error
            );
            return [];
        }
    };

    // Normalize variant/product ID to plain numeric string regardless of format:
    // - GID string: "gid://shopify/ProductVariant/40144081322007" → "40144081322007"
    // - Number: 40144081322007 → "40144081322007"
    // - Numeric string: "40144081322007" → "40144081322007"
    // Needed because ec_buy_now custom event sends numeric IDs while checkout
    // standard events use GID strings.
    const normalizeId = (id: any): string => {
        if (!id && id !== 0) return '';
        const str = id.toString();
        const match = str.match(/(\d+)$/);
        return match ? match[1] : str;
    };

    const getThankYouDraftTracking = async () => {
        try {
            const stored = await browser.localStorage.getItem(
                THANK_YOU_DRAFT_TRACKING_KEY
            );
            if (!stored) return [];

            const now = Date.now();
            const parsedItems = JSON.parse(stored);
            const items = Array.isArray(parsedItems) ? parsedItems : [];
            const validItems = items
                ? items.filter((item: any) => now - item.created_at < THANK_YOU_DRAFT_TRACKING_TTL)
                : [];

            if (validItems.length !== items.length) {
                await browser.localStorage.setItem(
                    THANK_YOU_DRAFT_TRACKING_KEY,
                    JSON.stringify(validItems)
                );
            }

            return validItems;
        } catch (error) {
            console.error("[EComposer Pixel] Error getting TY draft tracking:", error);
            return [];
        }
    };

    const saveThankYouDraftTracking = async (draftData: any) => {
        try {
            const items = await getThankYouDraftTracking();
            const trackingId = draftData.tracking_id || `ty-${Date.now()}`;
            const nextItems = items.filter((item: any) => item.tracking_id !== trackingId);

            nextItems.push({
                ...draftData,
                tracking_id: trackingId,
                product_id: normalizeId(draftData.product_id),
                variant_id: normalizeId(draftData.variant_id),
                created_at: Date.now(),
                ec_client_id,
            });

            await browser.localStorage.setItem(
                THANK_YOU_DRAFT_TRACKING_KEY,
                JSON.stringify(nextItems)
            );
        } catch (error) {
            console.error("[EComposer Pixel] Error saving TY draft tracking:", error);
        }
    };

    const removeThankYouDraftTracking = async (trackingIds: string[]) => {
        if (!trackingIds.length) return;

        try {
            const items = await getThankYouDraftTracking();
            const nextItems = items.filter((item: any) => !trackingIds.includes(item.tracking_id));
            await browser.localStorage.setItem(
                THANK_YOU_DRAFT_TRACKING_KEY,
                JSON.stringify(nextItems)
            );
        } catch (error) {
            console.error("[EComposer Pixel] Error removing TY draft tracking:", error);
        }
    };

    const sendThankYouExtensionEvent = async (eventName: string, args: any, sourceEvent: any) => {
        const accountID = args.account_id || settings.accountID;
        const shopDomain = args.shopify_domain || settings.shopify_domain || "";
        const pixelEndpoint = (args.pixel_endpoint || "https://pixel.ecomposer.app/v1/analytic").replace(/\/$/, "");

        if (!accountID) {
            console.warn("[EComposer Pixel] TY extension event blocked: missing account ID", eventName);
            return;
        }

        const context = sourceEvent.context || {};
        const navigatorData = context.navigator || {};
        const windowData = context.window || {};
        const documentData = context.document || {};

        const payload = {
            id: createEventId(),
            name: eventName,
            type: "custom",
            source: "er_thank_you",
            store_id: parseInt(String(accountID), 10),
            client_id: sourceEvent.clientId || args.client_id || ec_client_id || `${accountID}.${accountID}`,
            timestamp: new Date().toISOString(),
            context: {
                shopify_domain: shopDomain,
                userAgent: navigatorData.userAgent || "",
                url: windowData.location?.href || "",
                referrer: documentData.referrer || "",
                title: documentData.title || "",
                device: getDeviceType(navigatorData.userAgent || ""),
                ec_client_id,
            },
            data: args,
            extension_type: args.extension_type || "thankyou",
            rule_id: args.rule_id || "",
            rule_name: args.rule_name || "",
            page_id: args.page_id || "upsell_product",
        };

        await fetch(`${pixelEndpoint}?id=${accountID}&shopify_domain=${shopDomain}`, {
            method: "POST",
            cache: "no-cache",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json",
            },
            keepalive: true,
            body: JSON.stringify(payload),
        });

        logJson("[EComposer Pixel] TY extension event sent:", {
            event: eventName,
            endpoint: pixelEndpoint,
            shop: shopDomain,
            payload,
        });
    };

    const processThankYouCheckoutCompleted = async (event: any) => {
        const pendingDrafts = await getThankYouDraftTracking();
        if (!pendingDrafts.length) return;

        const checkout = event.data?.checkout || {};
        const checkoutLineItems = checkout.lineItems || [];
        const remainingByVariant = new Map();

        for (const lineItem of checkoutLineItems) {
            const variantId = normalizeId(lineItem.variant?.id);
            if (!variantId) continue;
            remainingByVariant.set(
                variantId,
                (remainingByVariant.get(variantId) || 0) + (Number(lineItem.quantity) || 0)
            );
        }

        const completedTrackingIds: string[] = [];

        for (const pending of pendingDrafts.sort((a: any, b: any) => a.created_at - b.created_at)) {
            const variantId = normalizeId(pending.variant_id);
            const remainingQuantity = remainingByVariant.get(variantId) || 0;
            if (!variantId || remainingQuantity <= 0) continue;

            const pendingQuantity = Number(pending.upsell_quantity || pending.quantity || 1);
            const attributedQuantity = Math.min(remainingQuantity, pendingQuantity);
            if (attributedQuantity <= 0) continue;

            remainingByVariant.set(variantId, remainingQuantity - attributedQuantity);

            logJson("[EComposer Pixel] TY checkout_completed matched pending draft:", {
                tracking_id: pending.tracking_id,
                rule_id: pending.rule_id,
                product_id: pending.product_id,
                variant_id: pending.variant_id,
                attributed_quantity: attributedQuantity,
            });

            await sendThankYouExtensionEvent("ext_revenue", {
                ...pending,
                event_source: "checkout_completed",
                checkout_id: checkout.id || "",
                checkout_token: checkout.token || "",
                order_id: checkout.order?.id || "",
                order_name: checkout.order?.name || "",
                upsell_quantity: attributedQuantity,
                upsell_value: Number(pending.upsell_value || 0) * (attributedQuantity / pendingQuantity),
                checkout_total: checkout.totalPrice?.amount || "",
                checkout_currency: checkout.currencyCode || pending.currency || "",
            }, event);

            completedTrackingIds.push(pending.tracking_id);
        }

        await removeThankYouDraftTracking(completedTrackingIds);
    };

    const matchCheckoutItems = async (checkoutLineItems: any[]) => {
        const trackedItems = await getTrackedCartItems();
        const matched: any[] = [];

        // Group tracked items by normalized variant_id
        // Handles: numeric (from ec_buy_now), GID string (from product_added_to_cart)
        const trackedByVariant = new Map();
        for (const item of trackedItems) {
            if (!item.layout_id || item.layout_id === "") {
                console.warn(
                    "[EComposer Pixel] ⚠️ Skipping item without layout_id:",
                    item.variant_id
                );
                continue;
            }
            const variantId = normalizeId(item.variant_id);
            if (!trackedByVariant.has(variantId)) {
                trackedByVariant.set(variantId, []);
            }
            trackedByVariant.get(variantId).push(item);
        }

        for (const lineItem of checkoutLineItems) {
            const rawVariantId = lineItem.variant?.id;
            if (!rawVariantId) continue;
            const variantId = normalizeId(rawVariantId);

            const variantTrackedItems = trackedByVariant.get(variantId) || [];

            if (variantTrackedItems.length === 0) continue;

            let remainingQuantity = lineItem.quantity;

            for (const trackedItem of variantTrackedItems.sort(
                (a, b) => a.added_at - b.added_at
            )) {
                if (remainingQuantity <= 0) break;

                const attributedQty = Math.min(
                    remainingQuantity,
                    trackedItem.quantity
                );

                matched.push({
                    variant_id: variantId,
                    product_id: trackedItem.product_id,
                    quantity: attributedQty,
                    price: trackedItem.price,
                    currency: trackedItem.currency,
                    client_id: trackedItem.client_id,
                    store_id: trackedItem.store_id,
                    layout_id: trackedItem.layout_id,
                    layout_type: trackedItem.layout_type,
                    page_type: trackedItem.page_type,
                    timestamp: trackedItem.timestamp,
                });

                remainingQuantity -= attributedQty;
            }
        }

        return matched;
    };

    // Load existing data from localStorage
    const loadStoredData = async () => {
        try {
            const storedCampaigns = await browser.localStorage.getItem(
                "ab_campaign_history"
            );
            const storedCartItems = await browser.localStorage.getItem(
                "ab_cart_items"
            );

            if (storedCampaigns) {
                campaignHistory = JSON.parse(storedCampaigns);
            }
            if (storedCartItems) {
                cartItems = JSON.parse(storedCartItems);
            }
        } catch (error) {
            console.error("[AB Test] Error loading stored data:", error);
        }
    };

    // Save data to localStorage
    const saveDataToStorage = async () => {
        try {
            await browser.localStorage.setItem(
                "ab_campaign_history",
                JSON.stringify(campaignHistory)
            );
            await browser.localStorage.setItem(
                "ab_cart_items",
                JSON.stringify(cartItems)
            );
        } catch (error) {
            console.error("[AB Test] Error saving data:", error);
        }
    };

    // Device detection function
    // Device detection function - Enhanced iPad detection
    const getDeviceType = (ua: string): string => {
        // iPad modern detection (iOS 13+)
        const isIPad =
            /iPad/i.test(ua) ||
            (typeof navigator !== "undefined" &&
                navigator.maxTouchPoints &&
                navigator.maxTouchPoints > 2 &&
                /MacIntel/.test(navigator.platform));

        // Tablet detection
        const isTablet =
            isIPad || /(tablet|playbook|silk)|(android(?!.*mobi))/i.test(ua);

        // Mobile detection
        const isMobile =
            !isTablet &&
            /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
                ua
            );

        if (isTablet) return "tablet";
        if (isMobile) return "mobile";
        return "desktop";
    };

    const sendToGA4 = async (
        eventName: string,
        campaignData: any,
        eventData: any,
        context: any,
        clientId?: string
    ) => {
        try {
            const GA4_MEASUREMENT_ID = settings.ga4ID;
            if (!GA4_MEASUREMENT_ID) {
                return;
            }

            const gaClientId = clientId || ec_client_id;

            if (!gaClientId) {
                console.error("[AB Test] No client ID available");
                return;
            }

            // Base parameters that all events need
            const baseParams = {
                v: "2",
                tid: GA4_MEASUREMENT_ID,
                cid: gaClientId,
                t: "event",
                en: eventName,
                sid: Math.floor(Date.now() / 1000).toString(),
                sct: "1",
                dl: context.window?.location?.href || "",
                dr: context.document?.referrer || "",
                dt: context.document?.title || "",

                // Core AB test dimensions (mapped to your custom dimensions)
                "ep.campaign_id": campaignData?.campaign_id || "",
                "ep.variant_name": campaignData?.variant_name || "",
                "ep.is_control": campaignData?.is_control ? "true" : "false",
                "ep.layout_id": campaignData?.layout_id || "",
                "ep.layout_type": campaignData?.layout_type || "",
                "ep.test_page": campaignData?.test_page || "",
                "ep.test_type": eventData["ep.test_type"] || "",
                "ep.device_type": getDeviceType(
                    context.navigator?.userAgent || ""
                ),
                "ep.shop_domain": settings.shopify_domain || "",
                "ep.shopify_client_id": clientId || "",
            };

            // Event-specific dimensions and metrics mapped to your GA4 setup
            let eventSpecificParams = {};

            switch (eventName) {
                case "ab_test_view":
                    eventSpecificParams = {
                        "epn.ab_test_view_count": "1",
                    };
                    break;

                case "ab_test_add_to_cart":
                    const quantity = parseInt(eventData["ep.quantity"] || "1");
                    const price = parseFloat(eventData["ep.price"] || "0");

                    eventSpecificParams = {
                        "ep.product_id": eventData["ep.product_id"] || "",
                        "ep.variant_id": eventData["ep.variant_id"] || "",
                        "ep.product_title": eventData["ep.product_title"] || "",
                        "ep.currency":
                            eventData["ep.currency"] || "USD",
                        "epn.ab_test_add_to_cart_count": "1",
                        "epn.ab_test_product_price": (
                            price * quantity
                        ).toString(),
                    };
                    break;

                case "ab_test_engagement":
                    const timeOnPageSeconds =
                        parseFloat(eventData["ep.total_time_on_page"] || "0") /
                        1000;
                    const engagementScore = calculateEngagementScore(eventData);
                    const scrollDepth = parseFloat(
                        eventData["ep.scroll_depth"] || "0"
                    );

                    eventSpecificParams = {
                        "epn.ab_test_engagement_score":
                            engagementScore.toString(),
                        "epn.ab_test_time_on_page":
                            timeOnPageSeconds.toString(),
                        "epn.ab_test_scroll_depth": scrollDepth.toString(),
                    };
                    break;

                case "ab_test_click":
                    const clickTimeOnPage =
                        parseFloat(eventData["ep.time_on_page"] || "0") / 1000;
                    const clickEngagementScore =
                        calculateEngagementScore(eventData);
                    const clickCount = parseInt(
                        eventData["ep.click_count"] || "1"
                    );

                    eventSpecificParams = {
                        "ep.element_type": eventData["ep.element_type"] || "",
                        "ep.element_text": eventData["ep.element_text"] || "",
                        "ep.element_href": eventData["ep.element_href"] || "",
                        "ep.element_classes":
                            eventData["ep.element_classes"] || "",
                        "epn.ab_test_click_count": clickCount.toString(),
                        "epn.ab_test_engagement_score":
                            clickEngagementScore.toString(),
                        "epn.ab_test_time_on_page": clickTimeOnPage.toString(),
                    };
                    break;

                case "ab_test_scroll":
                    const scrollDepthValue = parseFloat(
                        eventData["ep.scroll_depth"] || "0"
                    );

                    eventSpecificParams = {
                        "epn.ab_test_scroll_count": "1",
                        "epn.ab_test_scroll_depth": scrollDepthValue.toString(),
                        "epn.ab_test_engagement_score": Math.min(
                            scrollDepthValue,
                            100
                        ).toString(),
                    };
                    break;

                case "ab_test_checkout_started":
                    const checkoutValue = parseFloat(
                        eventData["ep.checkout_value"] || "0"
                    );
                    const checkoutItemsCount = parseInt(
                        eventData["ep.checkout_items_count"] || "0"
                    );

                    eventSpecificParams = {
                        "ep.currency":
                            eventData["ep.currency"] || "USD",
                        "epn.ab_test_checkout_started_count": "1",
                        "epn.ab_test_checkout_items_count":
                            checkoutItemsCount.toString(),
                        "epn.ab_test_checkout_value": checkoutValue.toString(),
                    };
                    break;

                case "ab_test_purchase":
                    const purchaseValue = parseFloat(
                        eventData["ep.purchase_value"] || "0"
                    );
                    const purchaseItemsCount = parseInt(
                        eventData["ep.purchase_items_count"] || "0"
                    );

                    eventSpecificParams = {
                        "ep.transaction_id":
                            eventData["ep.transaction_id"] || "",
                        "ep.currency":
                            eventData["ep.currency"] || "USD",
                        "epn.ab_test_purchase_count": "1",
                        "epn.ab_test_purchase_items_count":
                            purchaseItemsCount.toString(),
                        "epn.ab_test_purchase_value": purchaseValue.toString(),
                    };
                    break;

                case "ab_test_session_end":
                    const sessionTimeOnPage =
                        parseFloat(eventData["ep.total_time_on_page"] || "0") /
                        1000;
                    const finalEngagementScore =
                        calculateEngagementScore(eventData);
                    const finalScrollDepth = parseFloat(
                        eventData["ep.final_scroll_depth"] || "0"
                    );

                    eventSpecificParams = {
                        "epn.ab_test_session_end_count": "1",
                        "epn.ab_test_engagement_score":
                            finalEngagementScore.toString(),
                        "epn.ab_test_time_on_page":
                            sessionTimeOnPage.toString(),
                        "epn.ab_test_scroll_depth": finalScrollDepth.toString(),
                    };
                    break;
            }

            // Combine base params with event-specific params
            const allParams = { ...baseParams, ...eventSpecificParams };

            const params = new URLSearchParams(allParams);
            const ga4Endpoint = `https://www.google-analytics.com/g/collect?${params.toString()}`;

            await fetch(ga4Endpoint, {
                method: "POST",
                mode: "no-cors",
                cache: "no-cache",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                keepalive: true,
            });
            console.log(`[AB Test] Sent ${eventName} to GA4:`, allParams);
        } catch (error) {
            console.error(`[AB Test] Error sending ${eventName}:`, error);
        }
    };

    // Calculate engagement score based on user interactions
    const calculateEngagementScore = (eventData: any): number => {
        const timeOnPage =
            parseFloat(eventData["ep.total_time_on_page"] || "0") / 1000; // seconds
        const scrollDepth = parseFloat(eventData["ep.scroll_depth"] || "0");
        const totalClicks = parseInt(eventData["ep.total_clicks"] || "0");
        const totalInteractions = parseInt(
            eventData["ep.total_interactions"] || "0"
        );

        // Engagement score algorithm (0-100)
        let score = 0;

        // Time component (0-40 points)
        if (timeOnPage > 0) {
            score += Math.min((timeOnPage / 60) * 40, 40); // Max 40 points for 1+ minute
        }

        // Scroll component (0-25 points)
        score += (scrollDepth / 100) * 25;

        // Interaction component (0-35 points)
        score += Math.min((totalClicks + totalInteractions) * 5, 35);

        return Math.round(Math.min(score, 100));
    };

    function getPageType(loc: string): string {
        const regex = /\/([\w]{3,})/;
        const match = loc.match(regex);
        if (match) {
            let tmp = match[1];
            if (tmp === "collections" && loc.indexOf("/products") > -1) {
                tmp = "products";
            }
        }
        return "home";
    }

    const hasViewedPage = async () => {
        try {
            const viewed = await browser.localStorage.getItem(PAGE_VIEWED_KEY);
            return viewed === "true";
        } catch (error) {
            return false;
        }
    };

    const markPageViewed = async () => {
        try {
            await browser.localStorage.setItem(PAGE_VIEWED_KEY, "true");
        } catch (error) {
            console.error(
                "[EComposer Pixel] Error marking page viewed:",
                error
            );
        }
    };

    async function sendData(data: any): Promise<void> {
        if (
            (!ec_data || !ec_data?.layout_id) &&
            !["checkout_started", "checkout_completed"].includes(data.name)
        ) {
            return;
        }
        const page_type = getPageType(data.context.window.location.pathname);
        let context = data.context;
        data.context = {
            userAgent: context.navigator.userAgent,
            url: context.window.location.href,
            referrer: context.document.referrer,
            title: context.document.title,
            device: getDeviceType(context.navigator.userAgent),
            ec_client_id: ec_client_id,
        };

        data.client_id = data.clientId || ec_client_id;
        delete data.clientId;
        if (!data.client_id) {
            console.error("[EComposer Pixel] Cannot send event without client_id:", data.name);
            return;
        }
        let dt = {
            ...data,
            ...ec_data,
            page_type,
            store_id: parseInt(settings.accountID),
        };

        try {
            const pixelEndpoint = `https://pixel.ecomposer.app/v1/analytic?id=${settings.accountID}&shopify_domain=${settings.shopify_domain}`;
            await fetch(pixelEndpoint, {
                method: "POST",
                cache: "no-cache",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json",
                },
                keepalive: true,
                body: JSON.stringify(dt),
            });
            console.log("[EComposer Pixel] Data sent:", dt);
        } catch (error) {
            console.error("[EComposer Pixel] Error sending data:", error);
        }
    }

    // ---- POPUP ANALYTICS: Separate send function, independent of ec_data ----
    async function sendPopupData(event: any): Promise<void> {
        const popupData = event.customData || {};

        if (!popupData.layout_id) {
            console.warn("[EComposer Pixel] Popup event missing layout_id, skipping");
            return;
        }

        const context = event.context;
        const client_id = event.clientId || ec_client_id;

        if (!client_id) {
            console.error("[EComposer Pixel] Popup event missing client_id, skipping");
            return;
        }

        let dt = {
            // Spread popup custom fields first (button_id, tracking_id, popup_event_show, etc.)
            ...popupData,
            // Critical fields AFTER spread to prevent override
            name: event.name,
            timestamp: event.timestamp,
            id: event.id,
            client_id: client_id,
            context: {
                userAgent: context?.navigator?.userAgent || '',
                url: context?.window?.location?.href || '',
                referrer: context?.document?.referrer || '',
                title: context?.document?.title || '',
                device: getDeviceType(context?.navigator?.userAgent || ''),
                ec_client_id: ec_client_id,
            },
            layout_id: popupData.layout_id,
            layout_type: popupData.layout_type || 'popup',
            handle: popupData.handle || '',
            page_type: 'popup',
            store_id: parseInt(settings.accountID),
        };

        try {
            const pixelEndpoint = `https://pixel.ecomposer.app/v1/analytic?id=${settings.accountID}&shopify_domain=${settings.shopify_domain}`;
            await fetch(pixelEndpoint, {
                method: "POST",
                cache: "no-cache",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json",
                },
                keepalive: true,
                body: JSON.stringify(dt),
            });
            console.log("[EComposer Pixel] Popup data sent:", dt);
        } catch (error) {
            console.error("[EComposer Pixel] Error sending popup data:", error);
        }
    }

    /**
     * Process checkout started event for AB Testing
     * Simple approach: Use actual checkout data
     */
    async function processCheckoutStartedForABTest(event: any) {
        const checkoutData = event.data?.checkout;
        const checkoutItems = checkoutData?.lineItems || [];
        const checkoutCurrency = checkoutData?.currencyCode || "USD";

        const subtotalBeforeDiscount = parseFloat(
            checkoutData?.subtotalPrice?.amount || "0"
        );
        const totalAfterDiscount = parseFloat(
            checkoutData?.totalPrice?.amount || "0"
        );
        const totalDiscount = subtotalBeforeDiscount - totalAfterDiscount;

        const productRevenue = checkoutItems.reduce(
            (sum: number, item: any) => {
                const finalPrice = parseFloat(
                    item.finalLinePrice?.amount ||
                        item.variant?.price?.amount ||
                        "0"
                );
                return sum + finalPrice;
            },
            0
        );

        const shippingCost = parseFloat(
            checkoutData?.shippingLine?.price?.amount || "0"
        );
        const totalTax = parseFloat(checkoutData?.totalTax?.amount || "0");

        if (cartItems.length === 0) {
            try {
                const storedCartItems = await browser.localStorage.getItem(
                    "ab_cart_items"
                );
                if (storedCartItems) {
                    cartItems = JSON.parse(storedCartItems);
                }
            } catch (e) {
                console.error("❌ Could not load from storage:", e);
            }

            if (cartItems.length === 0) {
                return;
            }
        }

        // SIMPLE: Filter items có trong checkout
        const checkoutVariantIds = new Set(
            checkoutItems
                .map((item: any) => item.variant?.id?.toString())
                .filter(Boolean)
        );

        const validCartItems = cartItems.filter((item) => {
            return checkoutVariantIds.has(item.variant_id?.toString());
        });

        if (validCartItems.length === 0) {
            return;
        }

        // Group by campaign
        const campaignGroups = validCartItems.reduce((groups, item) => {
            const key = `${item.campaign_id}_${item.test_page || "unknown"}`;
            if (!groups[key]) {
                groups[key] = {
                    campaignData: {
                        campaign_id: item.campaign_id,
                        variant_name: item.variant_name,
                        is_control: item.is_control,
                        test_page: item.test_page,
                        page_type: item.page_type,
                        template_id: item.template_id,
                    },
                    items: [],
                    actualRevenue: 0,
                    originalRevenue: 0,
                    totalDiscount: 0,
                    totalItems: 0,
                };
            }
            groups[key].items.push(item);
            return groups;
        }, {} as any);

        for (const [campaignKey, groupData] of Object.entries(campaignGroups)) {
            const group = groupData as any;
            let actualRevenue = 0;
            let originalRevenue = 0;
            let itemsCount = 0;

            const processedVariants = new Set();

            for (const trackedItem of group.items) {
                const variantId = trackedItem.variant_id?.toString();

                if (processedVariants.has(variantId)) {
                    continue;
                }

                const matchingCheckoutItem = checkoutItems.find(
                    (checkoutItem: any) =>
                        checkoutItem.variant?.id?.toString() === variantId
                );

                if (matchingCheckoutItem) {
                    processedVariants.add(variantId);

                    // Quantity từ checkout
                    const quantity = matchingCheckoutItem.quantity;

                    const originalPrice = parseFloat(
                        matchingCheckoutItem.variant?.price?.amount || "0"
                    );

                    const finalLinePrice = parseFloat(
                        matchingCheckoutItem.finalLinePrice?.amount || "0"
                    );
                    const finalPricePerUnit =
                        finalLinePrice / matchingCheckoutItem.quantity;

                    const originalLineTotal = originalPrice * quantity;
                    const actualLineTotal = finalPricePerUnit * quantity;
                    const lineDiscount = originalLineTotal - actualLineTotal;

                    actualRevenue += actualLineTotal;
                    originalRevenue += originalLineTotal;
                    itemsCount += quantity;
                }
            }

            group.actualRevenue = actualRevenue;
            group.originalRevenue = originalRevenue;
            group.totalDiscount = originalRevenue - actualRevenue;
            group.totalItems = itemsCount;

            const ga4Payload = {
                "ep.test_type": "ab_test_checkout_started",
                "ep.checkout_items_count": itemsCount.toString(),
                "ep.checkout_value": actualRevenue.toFixed(2),
                "ep.original_value": originalRevenue.toFixed(2),
                "ep.discount_amount": group.totalDiscount.toFixed(2),
                "ep.discount_rate":
                    originalRevenue > 0
                        ? (
                              (group.totalDiscount / originalRevenue) *
                              100
                          ).toFixed(2)
                        : "0",
                "ep.checkout_total": totalAfterDiscount.toFixed(2),
                "ep.shipping_cost": shippingCost.toFixed(2),
                "ep.total_tax": totalTax.toFixed(2),
                "ep.currency": checkoutCurrency,
            };

            await sendToGA4(
                "ab_test_checkout_started",
                group.campaignData,
                ga4Payload,
                event.context,
                event.clientId
            );
        }
    }

    /**
     * Process checkout completed event for AB Testing
     * Simple approach: Use actual order data
     */
    async function processCheckoutCompletedForABTest(event: any) {
        const orderData = event.data?.checkout;
        const orderId = orderData?.order?.id || "";
        const orderCurrency = orderData?.currencyCode || "USD";
        const orderItems = orderData?.lineItems || [];

        const subtotalBeforeDiscount = parseFloat(
            orderData?.subtotalPrice?.amount || "0"
        );
        const totalAfterDiscount = parseFloat(
            orderData?.totalPrice?.amount || "0"
        );
        const totalDiscount = subtotalBeforeDiscount - totalAfterDiscount;

        const productRevenue = orderItems.reduce((sum: number, item: any) => {
            const finalPrice = parseFloat(
                item.finalLinePrice?.amount ||
                    item.variant?.price?.amount ||
                    "0"
            );
            return sum + finalPrice;
        }, 0);

        const shippingCost = parseFloat(
            orderData?.shippingLine?.price?.amount || "0"
        );
        const totalTax = parseFloat(orderData?.totalTax?.amount || "0");
        if (cartItems.length === 0) {
            console.warn("⚠️ No cart items tracked");
            return;
        }

        // SIMPLE: Chỉ filter items có trong order
        const orderVariantIds = new Set(
            orderItems
                .map((item: any) => item.variant?.id?.toString())
                .filter(Boolean)
        );

        const validCartItems = cartItems.filter((item) => {
            return orderVariantIds.has(item.variant_id?.toString());
        });

        if (validCartItems.length === 0) {
            console.error("❌ No valid cart items");
            return;
        }

        // Group by campaign (có thể có duplicate, nhưng không sao)
        const campaignGroups = validCartItems.reduce((groups, item) => {
            const key = `${item.campaign_id}_${item.test_page || "unknown"}`;

            if (!groups[key]) {
                groups[key] = {
                    campaignData: {
                        campaign_id: item.campaign_id,
                        variant_name: item.variant_name,
                        is_control: item.is_control,
                        test_page: item.test_page,
                    },
                    items: [],
                    actualRevenue: 0,
                    originalRevenue: 0,
                    totalDiscount: 0,
                    totalItems: 0,
                };
            }

            groups[key].items.push(item);

            return groups;
        }, {} as any);

        let totalActualRevenue = 0;
        let totalOriginalRevenue = 0;

        for (const [campaignKey, groupData] of Object.entries(campaignGroups)) {
            const group = groupData as any;
            let actualRevenue = 0;
            let originalRevenue = 0;
            let itemsCount = 0;

            // Tạo Set để track unique variants đã xử lý
            const processedVariants = new Set();

            for (const trackedItem of group.items) {
                const variantId = trackedItem.variant_id?.toString();

                // ⚠️ Skip nếu variant này đã được xử lý
                if (processedVariants.has(variantId)) {
                    continue;
                }

                const matchingOrderItem = orderItems.find(
                    (orderItem: any) =>
                        orderItem.variant?.id?.toString() === variantId
                );

                if (matchingOrderItem) {
                    processedVariants.add(variantId);

                    // Lấy quantity TỪ ORDER (không từ tracked item)
                    const quantity = matchingOrderItem.quantity;

                    const originalPrice = parseFloat(
                        matchingOrderItem.variant?.price?.amount || "0"
                    );

                    const finalLinePrice = parseFloat(
                        matchingOrderItem.finalLinePrice?.amount || "0"
                    );
                    const finalPricePerUnit =
                        finalLinePrice / matchingOrderItem.quantity;

                    const originalLineTotal = originalPrice * quantity;
                    const actualLineTotal = finalPricePerUnit * quantity;
                    const lineDiscount = originalLineTotal - actualLineTotal;

                    actualRevenue += actualLineTotal;
                    originalRevenue += originalLineTotal;
                    itemsCount += quantity;
                }
            }

            group.actualRevenue = actualRevenue;
            group.originalRevenue = originalRevenue;
            group.totalDiscount = originalRevenue - actualRevenue;
            group.totalItems = itemsCount;

            totalActualRevenue += actualRevenue;
            totalOriginalRevenue += originalRevenue;

            // Send to GA4
            const ga4Payload = {
                "ep.test_type": "ab_test_purchase",
                "ep.transaction_id": orderId,
                "ep.purchase_items_count": itemsCount.toString(), // Từ order
                "ep.purchase_value": actualRevenue.toFixed(2),
                "ep.original_revenue": originalRevenue.toFixed(2),
                "ep.discount_amount": group.totalDiscount.toFixed(2),
                "ep.discount_rate":
                    originalRevenue > 0
                        ? (
                              (group.totalDiscount / originalRevenue) *
                              100
                          ).toFixed(2)
                        : "0",
                "ep.order_total": totalAfterDiscount.toFixed(2),
                "ep.shipping_cost": shippingCost.toFixed(2),
                "ep.total_tax": totalTax.toFixed(2),
                "ep.currency": orderCurrency,
            };

            await sendToGA4(
                "ab_test_purchase",
                group.campaignData,
                ga4Payload,
                event.context,
                event.clientId
            );
        }

        // Cleanup
        campaignHistory = [];
        cartItems = [];
        await browser.localStorage.removeItem("ab_campaign_history");
        await browser.localStorage.removeItem("ab_cart_items");
    }

    // Initialize
    await initClientId();
    await loadStoredData();

    // Page viewed - Consolidated handler
    analytics.subscribe("page_viewed", (event: any) => {
        // Original pixel functionality
        setTimeout(() => {
            sendData(event);
        }, 500);
    });

    // A/B Test viewed events - Add to campaign history
    analytics.subscribe("ec_ab_test_viewed", async (event: any) => {
        try {
            const newCampaignData = event.customData || {};
            const currentPath = event.context?.window?.location?.pathname || "";

            newCampaignData.test_page = currentPath;
            newCampaignData.viewed_at = Date.now();

            const existingIndex = campaignHistory.findIndex(
                (campaign) =>
                    campaign.campaign_id === newCampaignData.campaign_id &&
                    campaign.test_page === newCampaignData.test_page
            );

            if (existingIndex >= 0) {
                campaignHistory[existingIndex] = {
                    ...campaignHistory[existingIndex],
                    ...newCampaignData,
                };
            } else {
                campaignHistory.push(newCampaignData);
            }

            await saveDataToStorage();
            await sendToGA4(
                "ab_test_view",
                newCampaignData,
                {
                    "ep.test_type": "ab_test_page_view",
                },
                event.context,
                event.clientId
            );
        } catch (error) {
            console.error("[AB Test] Error processing ab test viewed:", error);
        }
    });

    // Product viewed - Track for Top Products analytics
    analytics.subscribe("product_viewed", async (event: any) => {
        const productVariant = event.data?.productVariant;
        const product = productVariant?.product;
        if (!product?.id) return;

        const hasViewed = await hasViewedPage();
        if (hasViewed && ec_data?.layout_id) {
            event.data = {
                ...event.data,
                product_id: product.id,
                product_title: product.title || "",
                variant_id: productVariant?.id || "",
            };
            sendData(event);
        }
    });

    // Product added to cart - Consolidated handler
    analytics.subscribe("product_added_to_cart", async (event: any) => {
        const cartLine = event.data?.cartLine;
        const merchandise = cartLine?.merchandise;

        // Capture context and clientId BEFORE sendData() mutates/deletes them
        const currentPath = event.context?.window?.location?.pathname || "";
        const currentHref = event.context?.window?.location?.href || "";
        const shopifyClientId = event.clientId;

        const hasViewed = await hasViewedPage();
        if (hasViewed && ec_data?.layout_id) {
            if (merchandise) {
                const rawPriceAmount = merchandise.price?.amount;
                const rawPriceCurrency = merchandise.price?.currencyCode;

                const originalPrice = parseFloat(rawPriceAmount || "0");
                const originalCurrency =
                    rawPriceCurrency || currencyInfo.active_currency;

                let finalPrice = originalPrice;
                let finalCurrency = originalCurrency;

                if (originalCurrency !== currencyInfo.base_currency) {
                    finalPrice = convertToBaseCurrency(originalPrice);
                    finalCurrency = currencyInfo.base_currency;
                }

                const cartTrackingData = {
                    variant_id: merchandise.id,
                    product_id: merchandise.product?.id,
                    quantity: cartLine.quantity,
                    price: finalPrice,
                    currency: finalCurrency,
                    original_price: originalPrice,
                    original_currency: originalCurrency,
                    exchange_rate: currencyInfo.exchange_rate,
                    client_id: event.clientId,
                    store_id: parseInt(settings.accountID),
                    layout_id: ec_data?.layout_id || "",
                    layout_type: ec_data?.layout_type || "",
                    page_type: getPageType(
                        event.context.window.location.pathname
                    ),
                    timestamp: event.timestamp,
                };

                await saveCartTracking(cartTrackingData);

            }

            sendData(event);
        }

        try {
            const currentCampaign = campaignHistory.find(
                (campaign) => campaign.test_page === currentPath
            );
            const productData = event.data?.cartLine?.merchandise;

            if (currentCampaign && productData) {
                const cartItem = {
                    product_id: productData.product?.id,
                    variant_id: productData.id,
                    product_title: productData.product?.title,
                    quantity: event.data.cartLine.quantity,
                    price: parseFloat(productData.price?.amount || "0"),
                    currency:
                        event.data.cartLine.cost?.totalAmount?.currencyCode ||
                        "USD",
                    campaign_id: currentCampaign.campaign_id,
                    campaign_type: currentCampaign.campaign_type,
                    variant_name: currentCampaign.variant_name,
                    is_control: currentCampaign.is_control,
                    layout_id: currentCampaign.layout_id,
                    test_page: currentCampaign.test_page,
                    page_type: currentCampaign.page_type,
                    template_id: currentCampaign.template_id,
                    added_at: Date.now(),
                    source_url: currentHref,
                    source_path: currentPath,
                };

                const existingIndex = cartItems.findIndex(
                    (item) =>
                        item.variant_id === cartItem.variant_id &&
                        item.campaign_id === cartItem.campaign_id &&
                        Date.now() - item.added_at < 5000
                );

                if (existingIndex >= 0) {
                    cartItems[existingIndex].quantity += cartItem.quantity;
                } else {
                    cartItems.push(cartItem);
                }

                await saveDataToStorage();

                await sendToGA4(
                    "ab_test_add_to_cart",
                    currentCampaign,
                    {
                        "ep.test_type": "ab_test_add_to_cart",
                        "ep.product_id": cartItem.product_id,
                        "ep.variant_id": cartItem.variant_id,
                        "ep.product_title": cartItem.product_title,
                        "ep.quantity": cartItem.quantity.toString(),
                        "ep.price": cartItem.price.toString(),
                        "ep.currency": cartItem.currency,
                    },
                    event.context,
                    shopifyClientId
                );
            }
        } catch (error) {
            console.error("[AB Test] Error processing add to cart:", error);
        }
    });

    analytics.subscribe("ec_ty_draft_created", async (event: any) => {
        const draftData = event.customData || {};

        await saveThankYouDraftTracking({
            ...draftData,
            client_id: event.clientId || ec_client_id,
            timestamp: event.timestamp,
        });

        logJson("[EComposer Pixel] TY draft tracking saved:", {
            tracking_id: draftData.tracking_id,
            rule_id: draftData.rule_id,
            product_id: draftData.product_id,
            variant_id: draftData.variant_id,
            upsell_value: draftData.upsell_value,
            upsell_quantity: draftData.upsell_quantity,
        });
    });

    // Checkout started - Consolidated handler
    analytics.subscribe("checkout_started", async (event: any) => {
        try {
            // AB Test logic
            if (cartItems.length === 0) {
                try {
                    const storedCartItems = await browser.localStorage.getItem(
                        "ab_cart_items"
                    );
                    if (storedCartItems) {
                        cartItems = JSON.parse(storedCartItems);
                    }
                } catch (e) {
                    console.error(
                        "[AB Test] Could not load cart items from storage:",
                        e
                    );
                }

                if (cartItems.length === 0) {
                    console.log(
                        "[AB Test] Still no cart items, skipping checkout started"
                    );
                } else {
                    await processCheckoutStartedForABTest(event);
                }
            } else {
                await processCheckoutStartedForABTest(event);
            }

            // Original pixel functionality
            const hasCart = await hasCartItems();
            if (!hasCart) {
                console.warn(
                    "[EComposer Pixel] ❌ Checkout blocked: No tracked cart items"
                );
                return;
            }
            const checkoutLineItems = event.data?.checkout?.lineItems || [];

            const matchedItems = await matchCheckoutItems(checkoutLineItems);

            if (matchedItems.length === 0) {
                console.warn(
                    "[EComposer Pixel] ❌ Checkout blocked: No matched items"
                );
                return;
            }

            event.data.matched_cart_items = matchedItems;

            const layoutGroups = matchedItems.reduce((acc, item) => {
                acc[item.layout_id] = (acc[item.layout_id] || 0) + 1;
                return acc;
            }, {});

            setTimeout(() => sendData(event), 500);
        } catch (error) {
            console.error(
                "[AB Test] Error processing checkout started:",
                error
            );
        }
    });

    // Checkout completed - Consolidated handler
    analytics.subscribe("checkout_completed", async (event: any) => {
        try {
            // AB Test logic
            if (cartItems.length === 0) {
                try {
                    const storedCartItems = await browser.localStorage.getItem(
                        "ab_cart_items"
                    );
                    if (storedCartItems) {
                        cartItems = JSON.parse(storedCartItems);
                    }
                } catch (e) {
                    console.error(
                        "[AB Test] Could not load cart items from storage for purchase:",
                        e
                    );
                }

                if (cartItems.length === 0) {
                } else {
                    await processCheckoutCompletedForABTest(event);
                }
            } else {
                await processCheckoutCompletedForABTest(event);
            }

            try {
                await processThankYouCheckoutCompleted(event);
            } catch (error) {
                console.error("[EComposer Pixel] Error processing TY checkout completed:", error);
            }

            // Original pixel functionality
            const hasCart = await hasCartItems();
            if (!hasCart) {
                console.warn(
                    "[EComposer Pixel] ❌ Purchase blocked: No tracked cart items"
                );
                return; // ❌ Don't send to backend
            }

            const orderLineItems = event.data?.checkout?.lineItems || [];

            // Match with tracked items
            const matchedItems = await matchCheckoutItems(orderLineItems);

            if (matchedItems.length === 0) {
                console.warn(
                    "[EComposer Pixel] ❌ Purchase blocked: No matched items"
                );
                return; // ❌ Don't send to backend
            }

            event.data.matched_cart_items = matchedItems;

            setTimeout(async () => {
                sendData(event);

                // Cleanup after successful order
                await browser.localStorage.removeItem(CART_TRACKING_KEY);
                await browser.localStorage.removeItem(PAGE_VIEWED_KEY);

                ec_client_id =
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15);
                await browser.localStorage.setItem(
                    "ec_client_id",
                    ec_client_id
                );

                console.log("[EComposer Pixel] Session reset");
            }, 500);
        } catch (error) {
            console.error(
                "[AB Test] Error processing checkout completed:",
                error
            );
        }
    });

    analytics.subscribe("ec_ab_test_click", async (event: any) => {
        try {
            const eventData: any = event.customData || {};
            const context: any = event.context || {};

            let campaignData = {
                campaign_id: eventData.campaign_id,
                variant_name: eventData.variant_name,
                is_control: eventData.is_control,
                test_page: eventData.test_page,
                page_type: eventData.page_type,
                template_id: eventData.template_id,
                layout_id: eventData.layout_id,
                layout_type: eventData.layout_type,
            };

            if (
                !campaignData.campaign_id ||
                campaignData.variant_name === undefined
            ) {
                const currentPath = context.window?.location?.pathname || "";
                const currentCampaign = campaignHistory.find(
                    (campaign) => campaign.test_page === currentPath
                );

                if (!currentCampaign) {
                    console.warn(
                        "[AB Test Pixel] No campaign data available for click event"
                    );
                    return;
                }

                campaignData = currentCampaign;
            }

            await sendToGA4(
                "ab_test_click",
                campaignData,
                {
                    "ep.test_type": "click",
                    "ep.click_count": eventData.clicks?.toString() || "1",
                    "ep.time_on_page":
                        eventData.time_on_page?.toString() || "0",
                    "ep.element_type": eventData.element_type || "",
                    "ep.element_text": eventData.element_text || "",
                    "ep.element_href": eventData.element_href || "",
                    "ep.element_classes": eventData.element_classes || "",
                },
                context,
                event.clientId
            );
        } catch (error) {
            console.error(
                "[AB Test Pixel] Error processing click event:",
                error
            );
        }
    });

    // FIXED: Scroll Event
    analytics.subscribe("ec_ab_test_scroll", async (event: any) => {
        try {
            const eventData: any = event.customData || {};
            const context: any = event.context || {};

            let campaignData = {
                campaign_id: eventData.campaign_id,
                variant_name: eventData.variant_name,
                is_control: eventData.is_control,
                test_page: eventData.test_page,
                page_type: eventData.page_type,
                template_id: eventData.template_id,
            };

            // Fallback to campaignHistory
            if (!campaignData.campaign_id) {
                const currentPath = context.window?.location?.pathname || "";
                const currentCampaign = campaignHistory.find(
                    (campaign) => campaign.test_page === currentPath
                );

                if (!currentCampaign) {
                    console.warn("[AB Test Pixel] No campaign data for scroll");
                    return;
                }

                campaignData = currentCampaign;
            }

            await sendToGA4(
                "ab_test_scroll",
                campaignData, // Correct is_control
                {
                    "ep.test_type": "scroll_milestone",
                    "ep.scroll_depth":
                        eventData.scroll_depth?.toString() || "0",
                    "ep.time_to_scroll":
                        eventData.time_to_scroll?.toString() || "0",
                },
                context,
                event.clientId
            );
        } catch (error) {
            console.error(
                "[AB Test Pixel] Error processing scroll event:",
                error
            );
        }
    });

    analytics.subscribe("ec_ab_test_exit", async (event: any) => {
        try {
            const eventData: any = event.customData || {};
            const context: any = event.context || {};

            let campaignData = {
                campaign_id: eventData.campaign_id,
                variant_name: eventData.variant_name,
                is_control: eventData.is_control,
                test_page: eventData.test_page,
                page_type: eventData.page_type,
                template_id: eventData.template_id,
            };

            // Fallback to campaignHistory
            if (!campaignData.campaign_id) {
                const currentPath = context.window?.location?.pathname || "";
                const currentCampaign = campaignHistory.find(
                    (campaign) => campaign.test_page === currentPath
                );

                if (!currentCampaign) {
                    console.warn("[AB Test Pixel] No campaign data for exit");
                    return;
                }

                campaignData = currentCampaign;
            }

            await sendToGA4(
                "ab_test_session_end",
                campaignData,
                {
                    "ep.test_type": "session_end",
                    "ep.total_time_on_page":
                        eventData.total_time_on_page?.toString() || "0",
                    "ep.final_scroll_depth":
                        eventData.final_scroll_depth?.toString() || "0",
                    "ep.total_clicks": eventData.clicks?.toString() || "0",
                    "ep.total_interactions":
                        eventData.interactions?.toString() || "0",
                    "ep.ctr": eventData.ctr?.toString() || "0",
                },
                context,
                event.clientId
            );
        } catch (error) {
            console.error(
                "[AB Test Pixel] Error processing session end event:",
                error
            );
        }
    });

    // Original EComposer events (no duplicates)
    analytics.subscribe("ec_page_viewed", async (event: any) => {
        ec_data = event.customData;

        if (ec_data.base_currency) {
            currencyInfo.base_currency = ec_data.base_currency;
        }
        if (ec_data.active_currency) {
            currencyInfo.active_currency = ec_data.active_currency;
        }
        if (ec_data.exchange_rate) {
            currencyInfo.exchange_rate = parseFloat(ec_data.exchange_rate);
        }

        await markPageViewed();
    });

    analytics.subscribe("ec_bounce_rate", (event: any) => {
        event.data = event.customData;
        sendData(event);
    });

    analytics.subscribe("ec_buy_now", async function (event: any) {
        const hasViewed = await hasViewedPage();
        if (!hasViewed || !ec_data?.layout_id) {
            console.warn(
                "[EComposer Pixel] ❌ Buy Now blocked: No page context"
            );
            return;
        }

        // Save to browser.localStorage so checkout_started / checkout_completed
        // can match this Buy Now item. Must be done here (in pixel scope) because
        // browser.localStorage is namespaced and separate from window.localStorage.
        const cartLine = event.customData?.cartLine;

        if (cartLine) {
            const merchandise = cartLine.merchandise;
            // BuyItNow.vue publishes variant.price from Shopify product JSON
            // which is in CENTS (e.g. 8999 = $89.99), unlike standard Shopify
            // pixel events which use decimal dollars (89.99). Divide by 100.
            const rawAmount = parseFloat(merchandise?.price?.amount || "0");
            const originalPrice = rawAmount > 100 ? rawAmount / 100 : rawAmount;
            const originalCurrency =
                merchandise?.price?.currencyCode || currencyInfo.active_currency;

            let finalPrice = originalPrice;
            let finalCurrency = originalCurrency;
            if (originalCurrency !== currencyInfo.base_currency) {
                finalPrice = convertToBaseCurrency(originalPrice);
                finalCurrency = currencyInfo.base_currency;
            }

            await saveCartTracking({
                variant_id: merchandise?.id,
                product_id: merchandise?.product?.id,
                quantity: cartLine.quantity,
                price: finalPrice,
                currency: finalCurrency,
                original_price: originalPrice,
                original_currency: originalCurrency,
                exchange_rate: currencyInfo.exchange_rate,
                client_id: event.clientId,
                store_id: parseInt(settings.accountID),
                layout_id: ec_data?.layout_id || "",
                layout_type: ec_data?.layout_type || "",
                page_type: getPageType(
                    event.context?.window?.location?.pathname || ""
                ),
                timestamp: event.timestamp,
            });
        } else {
            console.warn("[EComposer Pixel] ec_buy_now: NO cartLine in customData - cannot save tracking");
        }

        event.data = event.customData;
        delete event.customData;
        event.name = "product_added_to_cart";
        event.data.event_name = "ec_buy_now";
        sendData(event);
    });

    analytics.subscribe("ec_custom_events", (event: any) => {
        event.data = event.customData;
        delete event.customData;
        event.name = "events";
        // Không dùng setTimeout — nếu button là thẻ <a> navigate sang page khác,
        // pixel sandbox bị destroy trước khi setTimeout 500ms chạy → fetch không gửi được.
        // fetch với keepalive:true đảm bảo request hoàn thành kể cả khi page unload,
        // nhưng chỉ khi fetch đã được GỌI trước khi sandbox bị terminate.
        sendData(event);
    });

    // ---- POPUP ANALYTICS: Separate subscriptions, independent of ec_data ----
    analytics.subscribe("ec_popup_viewed", async (event: any) => {
        event.name = "page_viewed"; // Reuse page_viewed table with page_type='popup'
        await sendPopupData(event);
    });

    analytics.subscribe("ec_popup_custom_events", async (event: any) => {
        event.name = "popup_events";
        await sendPopupData(event);
    });

    analytics.subscribe("ec_popup_closed", async (event: any) => {
        event.name = "popup_closed";
        await sendPopupData(event);
    });
});
