(function () {
    "use strict";
    this.isCrawler = function () {
        var ua = navigator.userAgent;
        return /bot|crawl|spider|slurp|bingbot|googlebot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt|claudebot/i.test(ua);
    };

    this.isInIframe = function () {
        try {
            return window.self !== window.top;
        } catch (e) {
            // If accessing window.top throws (cross-origin), we are in an iframe
            return true;
        }
    };

    this.handleABTestingEvent = function () {
        try {
            // Skip A/B testing for crawlers and iframes
            if (this.isCrawler()) {
                console.log("[AB Test] Skipped: crawler detected");
                return;
            }
            if (this.isInIframe()) {
                console.log("[AB Test] Skipped: page is inside an iframe");
                return;
            }

            // Get A/B testing data from window.EComposer
            const abTestingData = this.abTestingData || {};
            const abData = abTestingData.campaigns;
            if (!abData || !Array.isArray(abData) || abData.length === 0) {
                return;
            }

            const currentUrl =
                window.location.pathname + window.location.search;
            const currentPath = window.location.pathname;

            // ===== LOGIC MỚI: TÌM CAMPAIGN DỰA TRÊN URL PARAMETER =====
            const urlParams = new URLSearchParams(window.location.search);
            const campaignIdFromUrl = urlParams.get("ab_campaign");

            let matchingCampaign = null;
            let currentVariant = null;

            if (campaignIdFromUrl) {
                // Tìm campaign theo ID từ URL parameter
                matchingCampaign = abData.find(
                    (campaign) =>
                        campaign &&
                        campaign.id &&
                        campaign.id.toString() === campaignIdFromUrl
                );

                if (matchingCampaign) {
                    console.log("[AB Test] Found campaign by ID:", {
                        campaignId: campaignIdFromUrl,
                        campaignName: matchingCampaign.name,
                        campaignType: matchingCampaign.type,
                    });

                    // ===== XÁC ĐỊNH VARIANT DỰA TRÊN TEST TYPE =====
                    currentVariant = this.determineCurrentVariant(
                        matchingCampaign,
                        currentUrl,
                        currentPath
                    );
                }
            }

            if (!matchingCampaign || !currentVariant) {
                console.log("[AB Test] No matching campaign or variant found");
                return;
            }

            console.log("[AB Test] Campaign and variant determined:", {
                campaignId: matchingCampaign.id,
                campaignType: matchingCampaign.type,
                variantName: currentVariant.name,
                isControl: currentVariant.is_control,
            });

            // Prepare enhanced data with custom dimensions and metrics
            let dt =
                window.EComposer.PAGE ||
                window.EComposer.TEMPLATE ||
                window.EComposer.SECTION ||
                window.EComposer.BLOCK ||
                {};

            if (dt.type) {
                dt.layout_type = dt.type;
                delete dt.type;
            }
            if (dt.template_id) {
                dt.layout_id = dt.template_id;
                delete dt.template_id;
            }

            // Get current page info for tracking
            const { pageType: currentPageType, templateId: currentTemplateId } =
                this.getCurrentPageInfo();

            // Enhanced A/B testing data with custom dimensions and metrics
            const abTestData = {
                ...dt,
                // Core AB test dimensions
                campaign_id: matchingCampaign.id,
                campaign_type: matchingCampaign.type,
                variant_name: currentVariant.name,
                is_control: currentVariant.is_control,
                test_page: currentPath,
                test_type: "ab_test_page_view",

                // Additional dimensions
                page_type: currentPageType,
                template_id: currentTemplateId,
                redirect_behavior: matchingCampaign.redirect_behavior,
                traffic_allocation: matchingCampaign.traffic_allocation,
                device_type: this.getDeviceType(navigator.userAgent),
                shop_domain: window.location.hostname,

                // Custom metrics for page view
                ab_test_view_count: 1,
                ab_test_engagement_score: 0, // Will be updated by engagement tracking
                ab_test_time_on_page: 0, // Will be updated by time tracking
                ab_test_conversion_rate: 0, // Will be calculated later
                ab_test_bounce_rate: 0, // Will be calculated on exit
            };

            // Send page view event to Shopify analytics
            if (window.Shopify && !this.isAdmin()) {
                if (window.Shopify.analytics) {
                    window.Shopify.analytics.publish(
                        "ec_ab_test_viewed",
                        abTestData
                    );
                } else {
                    var c = 0;
                    let itv = setInterval(function () {
                        if (window.Shopify.analytics) {
                            window.Shopify.analytics.publish(
                                "ec_ab_test_viewed",
                                abTestData
                            );
                            clearInterval(itv);
                        }
                        c++;
                        if (c > 200) clearInterval(itv);
                    }, 100);
                }
            }

            console.log("[AB Test] Event sent with custom metrics:", {
                campaign_id: matchingCampaign.id,
                variant_name: currentVariant.name,
                is_control: currentVariant.is_control,
                will_clean_url:
                    window.location.search.includes("ab_campaign=") ||
                    window.location.search.includes("view="),
                custom_metrics_included: Object.keys(abTestData).filter((k) =>
                    k.startsWith("ab_test_")
                ).length,
            });

            // ===== CLEAN UP TẤT CẢ AB TEST PARAMETERS =====
            this.cleanUpAbTestUrl();

            // Initialize engagement tracking with custom metrics
            this.initEngagementTracking(matchingCampaign, currentVariant);
        } catch (error) {
            console.error("[AB Test] Error handling event:", error);
        }
    };

    // ===== XÁC ĐỊNH VARIANT DỰA TRÊN TEST TYPE =====
    this.determineCurrentVariant = function (
        campaign,
        currentUrl,
        currentPath
    ) {
        if (!campaign || !campaign.variants) {
            return null;
        }

        const urlParams = new URLSearchParams(window.location.search);

        // Xác định variant dựa trên test type
        switch (campaign.type) {
            case "template_test":
                return this.determineTemplateTestVariant(campaign, urlParams);

            case "url_test":
            case "page_test":
                return this.determineUrlPageTestVariant(
                    campaign,
                    currentUrl,
                    currentPath
                );

            default:
                console.warn("[AB Test] Unknown campaign type:", campaign.type);
                return null;
        }
    };

    // ===== XÁC ĐỊNH VARIANT CHO TEMPLATE TEST =====
    this.determineTemplateTestVariant = function (campaign, urlParams) {
        const viewParam = urlParams.get("view");

        for (let variant of campaign.variants) {
            if (variant.is_control) {
                // Control variant: không có view parameter HOẶC view parameter rỗng
                if (!viewParam) {
                    return variant;
                }
            } else {
                // Test variant: có view parameter và match với template_id
                if (viewParam && variant.template_id) {
                    const templateParts = variant.template_id.split(".");
                    if (templateParts.length > 1) {
                        const variantSuffix = templateParts[1];
                        if (variantSuffix === viewParam) {
                            return variant;
                        }
                    }
                }
            }
        }

        // Fallback: Nếu không tìm thấy variant nào match, check current template
        // Điều này xảy ra khi URL đã được cleaned nhưng vẫn đang ở template variant
        const { templateId: currentTemplateId } = this.getCurrentPageInfo();

        for (let variant of campaign.variants) {
            if (
                !variant.is_control &&
                variant.template_id === currentTemplateId
            ) {
                console.log(
                    "[AB Test] Template variant detected via current template:",
                    {
                        variantName: variant.name,
                        currentTemplateId: currentTemplateId,
                        variantTemplateId: variant.template_id,
                    }
                );
                return variant;
            }
        }

        // Nếu vẫn không tìm thấy, return control variant
        return campaign.variants.find((v) => v.is_control) || null;
    };

    // ===== XÁC ĐỊNH VARIANT CHO URL/PAGE TEST =====
    this.determineUrlPageTestVariant = function (
        campaign,
        currentUrl,
        currentPath
    ) {
        // Evaluate test variant (Variant B) first
        for (let variant of campaign.variants) {
            if (!variant.is_control && variant.url) {
                const cleanCurrentUrl = this.removeAbCampaignParam(currentUrl);
                const cleanVariantUrl = this.removeAbCampaignParam(variant.url);

                try {
                    const currentObj = new URL(cleanCurrentUrl, window.location.origin);
                    const variantObj = new URL(cleanVariantUrl, window.location.origin);

                    if (currentObj.pathname === variantObj.pathname) {
                        let allParamsMatch = true;
                        variantObj.searchParams.forEach((value, key) => {
                            if (currentObj.searchParams.get(key) !== value) {
                                allParamsMatch = false;
                            }
                        });

                        if (allParamsMatch) {
                            return variant;
                        }
                    }
                } catch (e) {
                    if (cleanCurrentUrl === cleanVariantUrl) {
                        return variant;
                    }
                }
            }
        }

        // Evaluate control variant second
        for (let variant of campaign.variants) {
            if (variant.is_control) {
                if (variant.url) {
                    const cleanCurrentUrl = this.removeAbCampaignParam(currentUrl);
                    const cleanVariantUrl = this.removeAbCampaignParam(variant.url);

                    try {
                        const currentObj = new URL(cleanCurrentUrl, window.location.origin);
                        const variantObj = new URL(cleanVariantUrl, window.location.origin);

                        if (currentObj.pathname === variantObj.pathname) {
                            let allParamsMatch = true;
                            variantObj.searchParams.forEach((value, key) => {
                                if (currentObj.searchParams.get(key) !== value) {
                                    allParamsMatch = false;
                                }
                            });

                            if (allParamsMatch) {
                                return variant;
                            }
                        }
                    } catch (e) {
                        if (cleanCurrentUrl === cleanVariantUrl) {
                            return variant;
                        }
                    }
                } else {
                    if (campaign.test_pages === currentPath) {
                        return variant;
                    }
                }
            }
        }

        return null;
    };

    // ===== HELPER FUNCTION: XOÁ AB CAMPAIGN PARAMETER =====
    this.removeAbCampaignParam = function (url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            urlObj.searchParams.delete("ab_campaign");
            return urlObj.pathname + urlObj.search;
        } catch (e) {
            // Fallback nếu URL không valid
            return url.replace(/[?&]ab_campaign=[^&]*/, "").replace(/\?$/, "");
        }
    };

    // ===== FUNCTION CLEAN UP URL PARAMETERS =====
    this.cleanUpAbTestUrl = function () {
        try {
            const currentUrl = window.location.href;
            const url = new URL(currentUrl);
            let urlChanged = false;

            // Xóa ab_campaign parameter
            if (url.searchParams.has("ab_campaign")) {
                url.searchParams.delete("ab_campaign");
                urlChanged = true;
            }

            // Xóa view parameter (cho template test)
            if (url.searchParams.has("view")) {
                url.searchParams.delete("view");
                urlChanged = true;
            }

            // Chỉ update URL nếu có thay đổi
            if (urlChanged) {
                const newUrl = url.pathname + (url.search || "");

                if (
                    newUrl !==
                    window.location.pathname + window.location.search
                ) {
                    window.history.replaceState(null, "", newUrl);
                    console.log("[AB Test] URL completely cleaned:", {
                        from: window.location.pathname + window.location.search,
                        to: newUrl,
                    });
                }
            }
        } catch (error) {
            console.error("[AB Test] Error cleaning URL:", error);
        }
    };

    // ===== GET CURRENT PAGE INFO =====
    this.getCurrentPageInfo = function () {
        const pageTypeMeta = document.querySelector('meta[name="page-type"]');
        const templateMeta = document.querySelector('meta[name="template-id"]');

        if (pageTypeMeta && templateMeta) {
            return {
                pageType: pageTypeMeta.content,
                templateId: templateMeta.content,
            };
        }

        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get("view");
        let pageType = "";
        let templateId = "";

        if (currentPath.startsWith("/products/")) {
            pageType = "product";
            templateId = viewParam ? `product.${viewParam}` : "product";
        } else if (currentPath.startsWith("/collections/")) {
            pageType = "collection";
            templateId = viewParam ? `collection.${viewParam}` : "collection";
        } else if (currentPath.startsWith("/pages/")) {
            pageType = "page";
            templateId = viewParam ? `page.${viewParam}` : "page";
        } else if (
            currentPath.startsWith("/blogs/") &&
            currentPath.includes("/articles/")
        ) {
            pageType = "article";
            templateId = viewParam ? `article.${viewParam}` : "article";
        } else if (currentPath.startsWith("/blogs/")) {
            pageType = "blog";
            templateId = viewParam ? `blog.${viewParam}` : "blog";
        } else if (currentPath === "/" || currentPath === "") {
            pageType = "index";
            templateId = "index";
        } else if (currentPath.startsWith("/cart")) {
            pageType = "cart";
            templateId = viewParam ? `cart.${viewParam}` : "cart";
        } else if (currentPath.startsWith("/search")) {
            pageType = "search";
            templateId = viewParam ? `search.${viewParam}` : "search";
        }

        return { pageType, templateId };
    };

    // Updated initEngagementTracking with custom metrics
    this.initEngagementTracking = function (matchingCampaign, currentVariant) {
        try {
            const trackingData = {
                campaign_id: matchingCampaign.id,
                campaign_type: matchingCampaign.type,
                variant_name: currentVariant.name,
                is_control: currentVariant.is_control,
                test_page:
                    matchingCampaign.test_pages ||
                    matchingCampaign.template_test?.page_type,
                page_start_time: Date.now(),
                clicks: 0,
                interactions: 0,
                max_scroll_depth: 0,
                engagement_milestones: [],
            };

            console.log(
                "[AB Test] Engagement tracking initialized:",
                trackingData.campaign_id
            );

            try {
                sessionStorage.setItem(
                    `ab_engagement_${matchingCampaign.id}`,
                    JSON.stringify(trackingData)
                );
            } catch (e) {
                // Silent fail
            }

            const _this = this;

            // Click tracking - KHÔNG GỬI time_on_page
            const trackClick = function (event) {
                trackingData.clicks++;
                trackingData.interactions++;

                try {
                    sessionStorage.setItem(
                        `ab_engagement_${matchingCampaign.id}`,
                        JSON.stringify(trackingData)
                    );
                } catch (e) {
                    // Silent fail
                }

                let dt =
                    window.EComposer.PAGE ||
                    window.EComposer.TEMPLATE ||
                    window.EComposer.SECTION ||
                    window.EComposer.BLOCK ||
                    {};

                if (dt.type) {
                    dt.layout_type = dt.type;
                    delete dt.type;
                }
                if (dt.template_id) {
                    dt.layout_id = dt.template_id;
                    delete dt.template_id;
                }

                // Traverse up to find the meaningful clickable ancestor
                const meaningfulEl =
                    event.target?.closest('a, button, [role="button"]') ||
                    event.target;

                // Resolve best label: tracking-id > text > aria-label > title > id
                const resolvedText = (
                    meaningfulEl?.dataset?.ecTrackingId ||
                    meaningfulEl?.textContent?.trim() ||
                    meaningfulEl?.getAttribute("aria-label") ||
                    meaningfulEl?.getAttribute("title") ||
                    meaningfulEl?.id ||
                    ""
                ).substring(0, 100);

                const clickData = {
                    ...dt,
                    ...trackingData,
                    event_type: "click",
                    test_type: "click",
                    element_type:
                        meaningfulEl?.tagName?.toLowerCase() || "unknown",
                    element_text: resolvedText,
                    element_href:
                        meaningfulEl?.href ||
                        meaningfulEl?.closest("a")?.href ||
                        "",
                    element_classes: meaningfulEl?.className || "",
                    ab_test_click_count: trackingData.clicks,
                };

                if (window.Shopify && !_this.isAdmin()) {
                    if (window.Shopify.analytics) {
                        window.Shopify.analytics.publish(
                            "ec_ab_test_click",
                            clickData
                        );
                    } else {
                        var c = 0;
                        let itv = setInterval(function () {
                            if (window.Shopify.analytics) {
                                window.Shopify.analytics.publish(
                                    "ec_ab_test_click",
                                    clickData
                                );
                                clearInterval(itv);
                            }
                            c++;
                            if (c > 200) clearInterval(itv);
                        }, 100);
                    }
                }
            };

            const trackScroll = () => {
                const scrollDepth = Math.min(
                    100,
                    Math.round(
                        ((window.pageYOffset + window.innerHeight) /
                            document.body.scrollHeight) *
                            100
                    )
                );

                if (scrollDepth > trackingData.max_scroll_depth) {
                    trackingData.max_scroll_depth = scrollDepth;
                    trackingData.interactions++;

                    if ([25, 50, 75, 100].includes(scrollDepth)) {
                        let dt =
                            window.EComposer.PAGE ||
                            window.EComposer.TEMPLATE ||
                            window.EComposer.SECTION ||
                            window.EComposer.BLOCK ||
                            {};

                        if (dt.type) {
                            dt.layout_type = dt.type;
                            delete dt.type;
                        }
                        if (dt.template_id) {
                            dt.layout_id = dt.template_id;
                            delete dt.template_id;
                        }

                        const scrollData = {
                            ...dt,
                            ...trackingData,
                            event_type: "scroll_milestone",
                            test_type: "scroll_milestone",
                            scroll_depth: scrollDepth,
                            ab_test_scroll_count: 1,
                            ab_test_scroll_depth: scrollDepth,
                        };

                        if (window.Shopify && !_this.isAdmin()) {
                            if (window.Shopify.analytics) {
                                window.Shopify.analytics.publish(
                                    "ec_ab_test_scroll",
                                    scrollData
                                );
                            }
                        }
                    }
                }
            };

            const sendFinalTracking = () => {
                const finalTimeOnPageMs =
                    Date.now() - trackingData.page_start_time;
                const finalTimeOnPageSec = Math.round(finalTimeOnPageMs / 1000);
                const engagementScore = _this.calculateEngagementScore(
                    finalTimeOnPageMs,
                    trackingData.max_scroll_depth,
                    trackingData.clicks,
                    trackingData.interactions
                );
                const bounceRate = _this.calculateBounceRate(
                    finalTimeOnPageMs,
                    trackingData.max_scroll_depth,
                    trackingData.clicks,
                    trackingData.interactions
                );

                let dt =
                    window.EComposer.PAGE ||
                    window.EComposer.TEMPLATE ||
                    window.EComposer.SECTION ||
                    window.EComposer.BLOCK ||
                    {};

                if (dt.type) {
                    dt.layout_type = dt.type;
                    delete dt.type;
                }
                if (dt.template_id) {
                    dt.layout_id = dt.template_id;
                    delete dt.template_id;
                }

                const finalData = {
                    ...dt,
                    ...trackingData,
                    event_type: "session_end",
                    test_type: "session_end",
                    total_time_on_page: finalTimeOnPageMs,
                    final_scroll_depth: trackingData.max_scroll_depth,
                    total_clicks: trackingData.clicks,
                    total_interactions: trackingData.interactions,
                    ctr:
                        trackingData.clicks > 0
                            ? (
                                  (trackingData.clicks /
                                      trackingData.interactions) *
                                  100
                              ).toFixed(2)
                            : 0,

                    ab_test_session_end_count: 1,
                    ab_test_engagement_score: engagementScore,
                    ab_test_time_on_page: finalTimeOnPageSec,
                    ab_test_scroll_depth: trackingData.max_scroll_depth,
                    ab_test_bounce_rate: bounceRate,
                    ab_test_click_count: trackingData.clicks,
                    ab_test_interaction_count: trackingData.interactions,
                };

                try {
                    localStorage.setItem(
                        `ab_final_${matchingCampaign.id}_${Date.now()}`,
                        JSON.stringify(finalData)
                    );
                } catch (e) {
                    // Silent fail
                }

                if (window.Shopify && !_this.isAdmin()) {
                    if (window.Shopify.analytics) {
                        window.Shopify.analytics.publish(
                            "ec_ab_test_exit",
                            finalData
                        );
                    }
                }
            };

            // Event listeners
            const trackableSelectors = [
                "a",
                "button",
                '[role="button"]',
                ".btn",
                ".button",
                ".ecom-product-single__add-to-cart--submit",
                ".ecom-ajax-cart-simple",
                ".add-to-cart",
                ".atc-button",
                ".product-link",
                ".collection-link",
                ".header-link",
                ".nav-link",
                ".cta",
                ".call-to-action",
            ];

            const addClickTracking = () => {
                trackableSelectors.forEach((selector) => {
                    document.querySelectorAll(selector).forEach((element) => {
                        if (!element.dataset.abEngagementTracked) {
                            element.addEventListener("click", trackClick, true);
                            element.dataset.abEngagementTracked = "true";
                        }
                    });
                });
            };

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", addClickTracking);
            } else {
                addClickTracking();
            }

            const observer = new MutationObserver(() => {
                addClickTracking();
            });
            observer.observe(document.body, { childList: true, subtree: true });

            let scrollTimeout;
            window.addEventListener("scroll", () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(trackScroll, 100);
            });

            window.addEventListener("beforeunload", sendFinalTracking);
            window.addEventListener("pagehide", sendFinalTracking);
        } catch (error) {
            console.error(
                "[AB Test] Error initializing engagement tracking:",
                error
            );
        }
    };

    // Helper functions
    this.calculateEngagementScore = function (
        timeOnPage,
        scrollDepthPercent,
        clicks,
        interactions
    ) {
        let score = 0;
        if (timeOnPage > 0) {
            score += Math.min((timeOnPage / 60000) * 40, 40); // Max 40 points for 1+ minute
        }
        // scrollDepthPercent is now 0-100, so divide by 100 to get ratio
        score += (scrollDepthPercent / 100) * 25; // Max 25 points for scroll
        score += Math.min((clicks + interactions) * 5, 35); // Max 35 points for interactions
        return Math.round(Math.min(score, 100));
    };

    this.calculateBounceRate = function (
        timeOnPage,
        scrollDepthPercent,
        clicks,
        interactions
    ) {
        // scrollDepthPercent is now 0-100
        const isBounce =
            timeOnPage < 10000 &&
            scrollDepthPercent < 25 &&
            clicks === 0 &&
            interactions === 0;
        return isBounce ? 100 : 0;
    };

    this.getDeviceType = function (userAgent) {
        const ua = userAgent || navigator.userAgent;

        // iPad modern detection
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

    this.isAdmin = function () {
        return (
            window.location.hostname.includes(".myshopify.com") &&
            (window.location.pathname.startsWith("/admin") ||
                (window.Shopify && window.Shopify.designMode))
        );
    };
}).bind(window.EComposer || {})();
