"use strict";

window.EComPopup = (function () {
    // Định nghĩa cachedFetch ngay từ đầu để tránh lỗi hoisting
    const cachedFetch = async (...params) => {
        if (window.location.host === 'admin.shopify.com') return;

        const [url, options, CACHE_SPACE, popupVersion] = params;

        if (
            !("caches" in window) ||
            (window.Shopify && window.Shopify.designMode) ||
            document.querySelector("#admin-bar-iframe")
        ) {
            return fetch(url, options).then((response) => {
                return response;
            });
        }

        // Tạo cache key với version để đảm bảo cache mới khi version thay đổi
        const cacheKey = popupVersion ? `${url}?v=${popupVersion}` : url;

        return caches.open(CACHE_SPACE).then((cache) => {
            return cache
                .match(cacheKey)
                .then((response) => {
                    if (response) {
                        const date = new Date(response.headers.get("date"));
                        // Cache in 1 day
                        if (Date.now() < date.getTime() + 1000 * 60 * 60 * 24) {
                            return response;
                        }
                    }
                    return fetch(url, options).then((response) => {
                        if (response.status < 400) {
                            cache.put(cacheKey, response.clone());
                        }

                        return response;
                    });
                })
                .catch((error) => {
                    console.error("  Error in fetch handler:", error.message);
                    throw error;
                });
        });
    };

    // Queue để quản lý popup hiển thị từng cái một
    let popupQueue = [];
    let isShowingPopup = false;
    let currentPopup = null;
    // let currentPopupElement = null;
    let currentDevice = window.innerWidth < 768 ? 'mobile' : (window.innerWidth < 1025 ? 'tablet' : 'desktop');

    const popupDataElement = document.querySelector('#ecom-popup-data');
    const variablesEl = document.querySelector('#ecom-popup-variables');

    if (!popupDataElement || !variablesEl) {
        console.warn('Ecom popup data element not found');
        return;
    }

    const dataPopupContainer = JSON.parse(popupDataElement.innerHTML);
    const variables = JSON.parse(variablesEl.innerHTML);
    if (dataPopupContainer && variables) {
        handleShowPopup(dataPopupContainer, variables);
    }
    function handleShowPopup(dataPopupContainer, variables) {
        const { page_type, page_title, country, language, handle } = variables;
        const sortedPopups = sortPopupsByPriority([...dataPopupContainer]);
        sortedPopups.forEach((popupItem) => {
            //Nếu status không phải là public thì không hiển thị
            if (popupItem.settings?.status !== 'public') return;
            const showOn = popupItem.settings?.show_on;
            const popupEventShow = popupItem.settings?.popup_event_show;
            const pageType = popupItem.settings?.custom_show_on ?? [];

            let checkConSpecPageType = true,
                checkConSpecUser = true,
                checkConSpecLang = true,
                checkConSpecCountry = true,
                checkDevice = true;
            //Kiểm tra nếu showon là custom thì kiểm tra sâu hơn
            if (showOn === 'custom' && popupEventShow !== 'click') {
                //Kiểm tra xem page type đã có trong pageType chưa?
                if (pageType && pageType.includes(page_type)) {

                    let dataVariableSpec = 'specific_' + page_type + 's';
                    let arraySpec = [];
                    //Nếu đã có thì kiểm tra xem page speci đã được chọn có nằm trong arraySpec không?
                    //Thêm các page speci vào arraySpec
                    if (popupItem.settings[dataVariableSpec]) {
                        popupItem.settings[dataVariableSpec].forEach((item) => {
                            arraySpec.push(item.value);
                        });
                    }

                    //Kiểm tra speci data.
                    let dataVariableValue = arraySpec.length > 0 ? arraySpec : ['all'];

                    if (['blog', 'page', 'product', 'collection', 'article'].includes(page_type)) {
                        if (!dataVariableValue.includes(handle) && !dataVariableValue.includes('all')) checkConSpecPageType = false;
                    }
                } else {
                    // Nếu page type không match, ẩn popup
                    checkConSpecPageType = false;
                }
            }

            //Kiểm tra field all_user là false hiện specUser mới kiểm tra
            //Kiểm tra thêm condition user đã đăng nhập hay guest
            let arraySpecUser = popupItem.settings?.all_user;
            if (arraySpecUser && arraySpecUser !== "all") {
                //Nếu có thì check user guest hay customer
                let userID = null;
                if (typeof ShopifyAnalytics !== 'undefined' && ShopifyAnalytics.meta?.page?.customerId) {
                    userID = ShopifyAnalytics.meta.page.customerId;
                }
                //Kiểm tra là customer
                if (arraySpecUser === 'customer') {
                    if (!userID) checkConSpecUser = false;
                } else {
                    //Kiểm tra là guest
                    if (userID) checkConSpecUser = false;
                }
            }

            //Kiểm tra thêm condition language
            if (!popupItem.settings?.all_lang) {
                let arrayLang = popupItem.settings?.specific_lang ?? ['all'];
                if (!arrayLang.includes('all') && !arrayLang.includes(language)) checkConSpecLang = false;
            }

            //Kiểm tra thêm condition
            if (!popupItem.settings?.all_country) {
                let arrayCountrys = popupItem.settings?.specific_country ?? ['all'];
                if (!arrayCountrys.includes('all') && !arrayCountrys.includes(country)) checkConSpecCountry = false;
            }
            if (popupItem.settings?.devices) {
                if (!popupItem.settings?.devices.includes(currentDevice)) {
                    checkDevice = false;
                }
            }
            let composerPreview = '';
            if (typeof EComposer !== 'undefined' && EComposer.proxy_path) {
                composerPreview = `${EComposer.proxy_path}/preview/`;
            }
            let pathName = window.location.pathname;
            if (composerPreview === pathName) {
                // Kiểm tra nếu window.location.search có chứa popupItem.handle
                let searchParams = window.location.search;
                let handle = popupItem.settings?.handle ?? popupItem.settings?.slug ?? popupItem.id;
                let hasPopupIdInSearch = searchParams.includes(handle);
                if (hasPopupIdInSearch) {
                    const popup = document.querySelector('.ecom-popups-container');
                    if (popup) {
                        popup.showModal();
                        return;
                    }
                    addToPopupQueue(popupItem, 'preview');
                }
            } else if (
                checkConSpecPageType === true &&
                checkConSpecUser === true &&
                checkConSpecLang === true &&
                checkConSpecCountry === true &&
                checkDevice === true
            ) {
                //Trước khi show kiểm tra cookie
                let COOKIE_NAME = popupItem.id + '+' + popupItem.settings?.popup_version;

                //Mở popup lên
                // Kiểm tra xem có chọn time delay hay không? Nếu có thì add setTimeout để show chậm trong khoản thời gian đã set còn không thì show luôn.
                if (popupEventShow === 'time_delay') {
                    if (!getCookie(COOKIE_NAME)) {
                        addToPopupQueue(popupItem)
                    }
                } else if (popupEventShow === 'scroll') {
                    if (!getCookie(COOKIE_NAME)) {
                        let scrollDistance = parseFloat(popupItem.settings?.scroll_distance ?? 10); // percent
                        let popupShow = false;
                        const onScroll = () => {
                            const doc = document.documentElement;
                            const maxScrollable = doc.scrollHeight - window.innerHeight;
                            const thresholdPx = Math.max(0, (scrollDistance / 100) * maxScrollable);
                            const scrolledPx = window.scrollY || doc.scrollTop || 0;
                            if (!popupShow && scrolledPx >= thresholdPx) {
                                addToPopupQueue(popupItem);
                                popupShow = true;
                                window.removeEventListener('scroll', onScroll);
                            }
                        };
                        window.addEventListener('scroll', onScroll, { passive: true });
                        // Trigger once in case user has already scrolled past threshold
                        onScroll();
                    }
                }
            }
        });
    }
    // Hàm thêm popup vào queue
    function addToPopupQueue(popupItem, preview = '') {
        popupQueue.push({ popupItem, preview });
        processNextPopup();
    }

    // Hàm xử lý popup tiếp theo trong queue
    function processNextPopup() {
        if (isShowingPopup || popupQueue.length === 0) {
            return;
        }

        const { popupItem, preview } = popupQueue.shift();
        isShowingPopup = true;
        currentPopup = popupItem;

        popupContainerHandler(popupItem, preview);
    }

    // Hàm được gọi khi popup được đóng
    function onPopupClosed() {
        isShowingPopup = false;
        currentPopup = null;

        // Xử lý popup tiếp theo trong queue
        setTimeout(() => {
            processNextPopup();
        }, 100); // Delay nhỏ để tránh conflict
    }

    // Sắp xếp popup theo priority
    function sortPopupsByPriority(popups) {
        return popups.sort((a, b) => {
            // Lấy priority từ settings, nếu không có thì mặc định là 0
            const priorityA = a.settings?.popup_priority || 0;
            const priorityB = b.settings?.popup_priority || 0;

            // Sắp xếp theo thứ tự: priority cao nhất (số nhỏ nhất) sẽ hiển thị trước
            // Nếu priority bằng nhau, giữ nguyên thứ tự ban đầu
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // Nếu không có priority hoặc priority bằng nhau, giữ thứ tự ban đầu
            return 0;
        });
    }

    async function popupContainerHandler(popupItem, preview = '', create = false) {
        try {
            let COOKIE_NAME = popupItem.id + '+' + popupItem.settings?.popup_version;
            if (getCookie(COOKIE_NAME)) return;
            if (window.location.host === 'admin.shopify.com') return;
            if (popupItem.settings?.status !== 'public') return;

            let handerSlug = popupItem.settings.handle ?? popupItem.settings.slug;
            let popupVersion = popupItem.settings?.popup_version;

            const sectionID = '?section_id=ecom-' + handerSlug + '-popup';

            let url = window.location.origin + Shopify.routes.root + sectionID;

            if (window.location.href.includes('customer_posted=true')) {
                url = url + "&customer_posted=true'";
            }

            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/html',
                }
            };
            
            const response = await cachedFetch(url, requestOptions, 'ecom-popup-cache-' + popupItem.id, popupVersion);
            if (response.status === 200) {
                const content = await response.text();
                if (content) {
                    return ecomPopup(content, popupItem, preview, create);
                }
            } else {
                onPopupClosed(); // Gọi hàm này nếu có lỗi
                return null;
            }
        } catch (error) {
            console.error('Error fetching popup content:', error);
            onPopupClosed(); // Gọi hàm này nếu có lỗi
        }
        return null;
    }


    function ecomPopup(contentPopup, popupItem, preview, create = false) {
        const ecom_popupContainer = document.createElement('div');
        let classPopupTemplate = 'ecom-popup-container-template-html-' + popupItem.id;
        if (create) {
            classPopupTemplate += '-' + Date.now();
        }
        ecom_popupContainer.classList.add(classPopupTemplate);
        document.body.appendChild(ecom_popupContainer);
        const popupTemplate = document.querySelector('.' + classPopupTemplate);


        popupTemplate.innerHTML = contentPopup;
        // Execute scripts sau khi innerHTML
        const scripts = popupTemplate.querySelectorAll('script');
        const loadScriptSequentially = async () => {
            for (const oldScript of scripts) {
                const newScript = document.createElement('script');

                // Copy attributes
                [...oldScript.attributes].forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                if (oldScript.src) {
                    newScript.src = oldScript.src;
                    newScript.async = false;

                    await new Promise(resolve => {
                        newScript.onload = resolve;
                        newScript.onerror = resolve;
                        document.body.appendChild(newScript);
                    });
                } else {
                    newScript.textContent = oldScript.textContent;
                    document.body.appendChild(newScript);
                }

                oldScript.remove();
            }
        };

        loadScriptSequentially();

        let popupContainerInit = new CustomEvent('ecom:popupContainer:init', { detail: { wrapper: popupTemplate } });
        document.dispatchEvent(popupContainerInit);

        let currentPopupElement = document.querySelector('.' + classPopupTemplate + ' .ecom-popups-container');
        if (!currentPopupElement) {
            return null;
        }
        if (currentPopupElement) {
            let config = {
                hideOnly: create,
                dontShowAgain: false
            }
            currentPopupElement.onClose = function () {
                config.dontShowAgain = false;
                closePopup(currentPopupElement, popupItem, config);
            }
            currentPopupElement.setCookie = function (time = 9999999999) {
                let classPopupTemplate = 'ecom-popup-container-template-html-' + popupItem.id;
                let COOKIE_NAME = popupItem.id + '+' + popupItem.settings?.popup_version;
                setCookie(COOKIE_NAME, classPopupTemplate, {
                    maxAgeSeconds: time,
                    path: "/",
                    sameSite: "Lax",
                });
            }
            if (preview !== 'preview') {
                currentPopupElement.addEventListener("click", function (e) {
                    if (e.target === currentPopupElement) {
                        closePopup(currentPopupElement, popupItem, config);
                    }
                });

                currentPopupElement.addEventListener("keydown", function (e) {
                    if (e.key === "Escape") {
                        closePopup(currentPopupElement, popupItem, config);
                    }
                });

                const currentCloseButton = currentPopupElement.querySelector(".ecom-popup-close-button");
                if (currentCloseButton) {
                    currentCloseButton.addEventListener("click", () => {
                        closePopup(currentPopupElement, popupItem, config);
                    });
                }

                const currentDontShowAgainBtns = currentPopupElement.querySelectorAll(".ecom-close-not-show");
                currentDontShowAgainBtns.forEach(function(btn) {
                    btn.addEventListener("click", () => {
                        config.dontShowAgain = true;
                        closePopup(currentPopupElement, popupItem, config);
                    });
                });
            }

            // ---- POPUP ANALYTICS: Init click tracking for buttons inside popup ----
            if (preview !== 'preview' && window.Shopify && !window.EComposer?.isAdmin?.()) {
                const popupButtons = currentPopupElement.querySelectorAll('[ec-tracking-custom-id]');
                popupButtons.forEach(function ($button) {
                    $button.addEventListener('click', function () {
                        if (window.Shopify.analytics) {
                            const data = {
                                layout_id: popupItem.id,
                                layout_type: 'popup',
                                handle: popupItem.settings?.handle || popupItem.settings?.slug || '',
                                button_id: $button.id,
                                tracking_id: $button.getAttribute('ec-tracking-custom-id'),
                            };
                            Shopify.analytics.publish('ec_popup_custom_events', data);
                        }
                    }, { once: true });
                });
            }

            if (create) {
                // Setup event listeners
                // setupPopupEventListeners(currentPopupElement, popupItem);

                // Return popup instance with methods
                return {
                    show: () => {
                        requestAnimationFrame(() => {
                            currentPopupElement.showModal();
                            document.body.classList.add("ecom-lock-scroll");
                            // ---- POPUP ANALYTICS: Publish popup viewed event ----
                            if (window.Shopify && window.Shopify.analytics && !window.EComposer?.isAdmin?.()) {
                                Shopify.analytics.publish('ec_popup_viewed', {
                                    layout_id: popupItem.id,
                                    layout_type: 'popup',
                                    handle: popupItem.settings?.handle || popupItem.settings?.slug || '',
                                    popup_event_show: popupItem.settings?.popup_event_show || '',
                                });
                            }
                        });
                    },
                    hide: () => {
                        closePopup(currentPopupElement, popupItem, { hideOnly: create });
                    },
                    close: () => {
                        closePopup(currentPopupElement, popupItem, { hideOnly: false });
                    },
                    getElement: () => currentPopupElement,
                    getContainer: () => popupTemplate,
                    isVisible: () => currentPopupElement && currentPopupElement.open
                }
            }
            else {
                requestAnimationFrame(() => {
                    let timetoShow = popupItem.settings?.time_delay ?? 1;
                    timetoShow = parseInt(timetoShow) * 1000;
                    if (timetoShow < 1000 || popupItem.settings?.popup_event_show !== 'time_delay') {
                        timetoShow = 1000;
                    }
                    setTimeout(() => {
                        currentPopupElement.showModal();
                        document.body.classList.add("ecom-lock-scroll");
                        // ---- POPUP ANALYTICS: Publish popup viewed event ----
                        if (window.Shopify && window.Shopify.analytics && !window.EComposer?.isAdmin?.()) {
                            Shopify.analytics.publish('ec_popup_viewed', {
                                layout_id: popupItem.id,
                                layout_type: 'popup',
                                handle: popupItem.settings?.handle || popupItem.settings?.slug || '',
                                popup_event_show: popupItem.settings?.popup_event_show || '',
                            });
                        }
                    }, timetoShow);
                });

            }
        }
    }

    function closePopup(currentPopupElement, popupItem, config) {
        // ---- POPUP ANALYTICS: Publish popup closed event ----
        if (window.Shopify && window.Shopify.analytics && !window.EComposer?.isAdmin?.()) {
            Shopify.analytics.publish('ec_popup_closed', {
                layout_id: popupItem.id,
                layout_type: 'popup',
                handle: popupItem.settings?.handle || popupItem.settings?.slug || '',
            });
        }

        const { hideOnly, dontShowAgain } = config || {};
        let classPopupTemplate = 'ecom-popup-container-template-html-' + popupItem.id;
        let COOKIE_NAME = popupItem.id + '+' + popupItem.settings?.popup_version;
        let time_cookie_expires = popupItem.settings?.time_cookie_expires ?? 0;
        let COOKIE_MAX_AGE_SECONDS = parseInt(time_cookie_expires) * 60 * 60; // 1 ngày = 86400 giây
        if (dontShowAgain) COOKIE_MAX_AGE_SECONDS = 9999999999
        currentPopupElement.classList.add('ecom-popup-animation-' + popupItem.settings?.popup_animation + 'Close');
        currentPopupElement.classList.add('hide');
        const timeClosePopup = popupItem.settings?.time_delay_animation ?? 300;

        setTimeout(() => {
            currentPopupElement.close();
            document.body.classList.remove("ecom-lock-scroll");
            currentPopupElement.classList.remove('ecom-popup-animation-' + popupItem.settings?.popup_animation + 'Close');
            currentPopupElement.classList.remove('hide');
            if (hideOnly) return;
            currentPopupElement.closest('.' + classPopupTemplate).remove();
            if ((['time_delay', 'scroll'].includes(popupItem.settings?.popup_event_show) && COOKIE_MAX_AGE_SECONDS > 0) || dontShowAgain) {
                setCookie(COOKIE_NAME, classPopupTemplate, {
                    maxAgeSeconds: COOKIE_MAX_AGE_SECONDS,
                    path: "/",
                    sameSite: "Lax",
                    // secure: true,    
                });
            }
            onPopupClosed(); // Gọi hàm này khi popup được đóng
        }, timeClosePopup - 50);
    }

    function getCookie(name) {
        const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
        return match ? decodeURIComponent(match.split('=')[1]) : null;
    }

    function setCookie(name, value, { maxAgeSeconds, path = "/", sameSite = "Lax", secure = false, domain } = {}) {
        let cookie = `${name}=${encodeURIComponent(value)}`;
        if (typeof maxAgeSeconds === "number") cookie += `; max-age=${maxAgeSeconds}`;
        if (path) cookie += `; path=${path}`;
        if (sameSite) cookie += `; samesite=${sameSite}`;
        if (secure) cookie += `; secure`;
        if (domain) cookie += `; domain=${domain}`;
        document.cookie = cookie;
    }
    async function addEventToButton(dom = null) {
        let buttons = dom ? dom.querySelectorAll('a[data-ecom-popup]') : document.querySelectorAll('a[data-ecom-popup]');
        buttons.forEach((button) => {
            (async function () {
                let popupId = button.getAttribute('data-ecom-popup');
                let popupItem = dataPopupContainer.find(item => item.id === popupId);
                if (popupItem) {
                    let popupInstance = await popupContainerHandler(popupItem, '', true);
                    if (popupInstance) {
                        button.addEventListener('click', async (event) => {
                            event.preventDefault();
                            popupInstance.show();
                        });
                    }
                }
            })()
        });
    }
    addEventToButton();

    // Hàm kiểm tra và re-render popup khi resize
    function handleDeviceChange() {
        const newDevice = window.innerWidth < 768 ? 'mobile' : (window.innerWidth < 1025 ? 'tablet' : 'desktop');

        // Chỉ xử lý khi device thực sự thay đổi
        if (newDevice !== currentDevice) {
            currentDevice = newDevice;

            // Đóng popup hiện tại nếu không phù hợp với device mới
            if (currentPopup && currentPopup.settings?.devices) {
                if (!currentPopup.settings.devices.includes(newDevice)) {
                    // Close current popup without triggering next in queue
                    const currentPopupElements = document.querySelectorAll('.ecom-popup-container-template-html-' + currentPopup.id);
                    currentPopupElements.forEach(el => {
                        const dialog = el.querySelector('.ecom-popups-container');
                        if (dialog && dialog.open) {
                            dialog.close();
                            document.body.classList.remove("ecom-lock-scroll");
                        }
                        el.remove();
                    });

                    onPopupClosed();
                }
            }

            // Clear queue và rebuild
            popupQueue = [];

            // Re-check tất cả popup và thêm lại vào queue nếu phù hợp
            if (dataPopupContainer && variables) {
                handleShowPopup(dataPopupContainer, variables);
            }
        }
    }

    // Debounce resize để tránh call quá nhiều
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleDeviceChange, 300);
    });

    // Public API
    return {
        addToQueue: addToPopupQueue,
        getCurrentPopup: () => currentPopup,
        getQueue: () => popupQueue,
        closeCurrentPopup: onPopupClosed,
        popupContainerHandler: popupContainerHandler,
        popupData: dataPopupContainer,
        setCookie: setCookie,
        // currentPopupElement: () => currentPopupElement
    };
})();