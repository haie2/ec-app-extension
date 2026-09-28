"use strict";

(function () {
    this.ajaxCartSuccess = function (data, form, action = 'add') {
        if (window.omegaCallBackAddToCart && typeof window.omegaCallBackAddToCart === "function") {
            window.omegaCallBackAddToCart();
        }

        const cartUrl = `${this.routes.cart_url}?section_id=ecom-ajax-cart${data && data.key ? `&key=${data.key}` : ""}`;

        window.fetch(cartUrl, {
            method: "GET",
            headers: { "Content-Type": "text/html" }
        })
        .then(response => response.text())
        .then(response => {
            const old = document.querySelector(".ecom-cart-popup");
            const dom = document.createElement("div");
            dom.classList.add("ecom-cart-popup");

            const html = new DOMParser()
                .parseFromString(response, "text/html")
                .querySelector("#shopify-section-ecom-ajax-cart");

            if (!html) {
                window.location.href = this.routes.cart_url;
                return false;
            }

            dom.appendChild(html);
            document.body.appendChild(dom);
            this.handleCartPopup(dom);

            if (data && data.key) {
                const $line = dom.querySelector(`.ecom-ajax-cart-line-item[data-key="${data.key}"]`);
                if ($line) {
                    const body = document.querySelector('.ecom-ajax-cart-body');
                    if (body) {
                        const first = body.querySelector('.ecom-ajax-cart-line-item');
                        if (first) {
                            const scroll = body.getBoundingClientRect().top - first.getBoundingClientRect().top;
                            body.scrollTop = scroll;
                        }
                    }
                }
            }

            if (old) old.remove();

            if (action === 'update') {
                const status = document.querySelector('.ecom-ajax-cart-status span');
                if (status) status.innerHTML = status.dataset.textUpdate;
            }

            this.onAjaxPopupLoaded();
        })
        .catch(e => {
            console.log(e);
            alert(e.message);
        });
    };

    this.onAjaxPopupLoaded = () => {
        const checkout_btn = document.querySelector('.ecom-ajax-cart-checkout-button');
        const term_checkbox = document.querySelector('#terms');
        const term_error = document.querySelector('.terms-error');

        if (checkout_btn && term_checkbox && term_error) {
            checkout_btn.removeAttribute('name');

            checkout_btn.addEventListener('click', function(e) {
                if (!term_checkbox.checked) {
                    e.preventDefault();
                    term_error.classList.remove('terms-dn');
                } else {
                    term_error.classList.add('terms-dn');
                }
            });

            term_checkbox.addEventListener('change', function() {
                term_error.classList.add('terms-dn');
                if (term_checkbox.checked) {
                    checkout_btn.setAttribute('name', 'checkout');
                } else {
                    checkout_btn.removeAttribute('name');
                }
            });
        }
    };

    this.handleCartPopup = function (dom) {
        const _this = this;

        dom.addEventListener("click", function (e) {
            if (e.target === dom || e.target.closest('[data-ecom-action="close"]')) {
                dom.remove();
            }
        });

        const changeQuantityButton = function() {
            if (this.name === "minus") {
                this.nextElementSibling.stepDown();
                this.nextElementSibling.dispatchEvent(new window.Event("change"));
            } else if (this.name === "plus") {
                this.previousElementSibling.stepUp();
                this.previousElementSibling.dispatchEvent(new window.Event("change"));
            }
        };

        const updateQuantity = function() {
            const value = this.value;
            const key = this.dataset.key;
            const line = this.dataset.index;
            const items = this.closest(".ecom-ajax-cart-line-item");

            if (items) items.classList.add("ecom-item-loading");

            _this.cartItemChange(key, parseInt(value), line)
                .then(response => {
                    const foundLine = response.items ? response.items.find(val => val.key === key) : null;

                    if (foundLine) {
                        _this.ajaxCartSuccess(foundLine, null, 'update');
                    } else {
                        if (response.errors) {
                            _this.showToast(response.errors, "error");
                            const body = items.closest('.ecom-ajax-cart-body');
                            if (body) {
                                const first = body.querySelector('.ecom-ajax-cart-line-item');
                                if (first) {
                                    const scroll = body.getBoundingClientRect().top - first.getBoundingClientRect().top;
                                    setTimeout(() => {
                                        const updatedBody = document.querySelector('.ecom-ajax-cart-body');
                                        updatedBody.scrollTo({ top: scroll, behavior: 'smooth' });
                                    }, 450);
                                }
                            }
                        }
                        _this.ajaxCartSuccess(null, null, 'update');
                    }

                    if (items) items.classList.remove("ecom-item-loading");
                })
                .catch(e => {
                    console.error(e);
                    _this.ajaxCartError(e);
                });
        };

        dom.querySelectorAll(".ecom-ajax-cart-line-item-quantity-button").forEach(elm => {
            elm.addEventListener("click", changeQuantityButton);
        });

        dom.querySelectorAll(".ecom-ajax-cart-line-item-quantity-input").forEach(elm => {
            elm.addEventListener("change", updateQuantity);
        });

        const ecomm_cart_note = dom.querySelector("#ecom-ajax-cart-note");
        if (ecomm_cart_note) {
            ecomm_cart_note.addEventListener("change", function () {
                _this.cartUpdate({ note: this.value });
            });
        }

        dom.querySelectorAll(".ecom-ajax-cart-line-item-button-remove").forEach(elm => {
            elm.addEventListener("click", function (e) {
                e.preventDefault();
                this.value = 0;
                updateQuantity.bind(this)(e);
            });
        });
    };

    this.ajaxCartError = function (data) {
        alert("Error" + data.message);
    };

    this.beforeAjaxCartSend = function () {};

    this.checkProperties = function(form) {
        if(!form) return false;

        // Only check inputs within EComposer's Property element
        const propertyContainers = form.querySelectorAll('.ecom-product-single__properties');
        if(!propertyContainers.length) return true;

        let result = true;

        propertyContainers.forEach(function(container) {
            const requiredCheckBoxList = container.querySelectorAll('.ecom-required--checkbox');
            requiredCheckBoxList.forEach(function(checkboxGroup) {
                let checkbox_items = checkboxGroup.querySelectorAll('input[type=checkbox]');
                if(checkbox_items.length == 0) return;
                let isChecked = false;

                checkbox_items.forEach(function(checkbox) {
                    if(checkbox.checked) {
                        isChecked = true;
                    }
                });

                checkbox_items.forEach(function(checkbox) {
                    checkbox.required = !isChecked;
                });

                if(!isChecked) result = false;
            });

            const requireds = container.querySelectorAll('input[required], select[required], textarea[required]');
            requireds.forEach(item => {
                if(item.type === 'radio') {
                    const isChecked = Array.from(container.querySelectorAll('input[type=radio][name="' + item.name + '"]')).some(radio => radio.checked);
                    if(!isChecked) {
                        result = false;
                    }
                    return;
                }
                if(item.type === 'checkbox' && !item.checked) {
                    result = false;
                    return;
                }
                if(item.type === 'file' && (!item.files || !item.files.length)) {
                    result = false;
                    return;
                }
                if(!item.value) result = false;
            });
        });

        return result;
    };

    this.ajaxCart = function () {
        if(!this.configs.ajax_cart.enable) return;
        const _this = this;

        const handleEvent = form => {
            if (!form.querySelector('[name="id"]')) {
                if (window.document.querySelector("#admin-bar-iframe")) {
                    alert('Please drag Variant picker element to this section to allow the "Add to cart" feature working. This message only show for owner\'s store');
                }
                return false;
            }

            let submitButton = form.querySelector(".ecom-product-single__add-to-cart--submit.ecom-clicked");
            if (!submitButton) {
                submitButton = form.querySelector(".ecom-product-single__add-to-cart--submit");
            }

            if (submitButton) {
                submitButton.style.cursor = "not-allowed";
                submitButton.style.pointerEvents = "none";
                submitButton.classList.add("ecom-ajax-loading", "ecom-loading");
            }

            this.beforeAjaxCartSend(form);

            const formData = new FormData(form);
            formData.append("sections", "cart-notification-product,cart-notification-button,cart-icon-bubble,cart-drawer");

            window.fetch(this.routes.cart_add_url, {
                method: "POST",
                headers: {
                    Accept: "application/javascript",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: formData,
            })
            .then(res => res.json())
            .then(response => {
                if (response.errors) {
                    throw new Error(response.errors);
                }

                if (response.status > 200) {
                    _this.showToast(response.description, 'error');
                    if (submitButton) {
                        submitButton.style.cursor = "pointer";
                        submitButton.style.pointerEvents = "auto";
                        submitButton.classList.remove("ecom-ajax-loading", "ecom-loading");
                    }
                    document.dispatchEvent(new CustomEvent('ec-cart-error', { detail: response }));
                    return;
                }

                const { action, href, textAddedCart, target, messageAddedCart } = submitButton.dataset;

                if (submitButton) {
                    submitButton.style.cursor = "pointer";
                    submitButton.style.pointerEvents = "auto";
                    submitButton.classList.remove("ecom-ajax-loading", "ecom-loading");

                    if (submitButton.querySelector(".ecom-add-to-cart-text")) {
                        submitButton.setAttribute('data-added-to-cart', '');
                        if (textAddedCart && textAddedCart !== '') {
                            submitButton.querySelector(".ecom-add-to-cart-text").innerHTML = textAddedCart;
                        }
                    }
                }

                document.dispatchEvent(new CustomEvent('ec-cart-added', { detail: response }));

                const routes = this.routes;
                switch (action) {
                    case "cart":
                        setTimeout(() => window.location.href = routes.cart_url, 500);
                        break;
                    case "reload":
                        setTimeout(() => window.location.reload(), 500);
                        break;
                    case "checkout":
                        setTimeout(() => {
                            window.location.href = routes.root_url + (routes.root_url === "/" ? "" : "/") + "checkout";
                        }, 500);
                        break;
                    case "message":
                        this.showToast(messageAddedCart);
                        break;
                    case "link":
                        if (href) {
                            setTimeout(() => {
                                if (target === "_blank") {
                                    window.open(href);
                                } else {
                                    window.location.href = href;
                                }
                            }, 500);
                        }
                        break;
                    default:
                        this.ajaxCartSuccess(response, form);
                        break;
                }
            })
            .catch(e => {
                if (submitButton) {
                    submitButton.style.cursor = "pointer";
                    submitButton.style.pointerEvents = "auto";
                    submitButton.classList.remove("ecom-ajax-loading", "ecom-loading");
                }
                this.ajaxCartError(e, form);
            });

            return false;
        };

        const submitButtons = document.querySelectorAll(".ecom-product-single__add-to-cart--submit:not(.ecom-initialized)");

        if (submitButtons.length) {
            submitButtons.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    submitButtons.forEach(b => b.classList.remove('ecom-clicked'));

                    const form = this.closest('form.ecom-product-form');
                    if (!_this.checkProperties(form)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if(form && form.reportValidity) {
                            form.reportValidity();
                        }
                        return;
                    }

                    e.preventDefault();
                    btn.classList.add('ecom-clicked');
                    form.addEventListener('submit', event => event.preventDefault());
                    handleEvent.bind(document.body)(form);
                });
                btn.classList.add('ecom-initialized');
            });
        }

        this.handleATCList();
        const $elements = document.querySelectorAll(".ecom-ajax-cart-simple[data-id]:not(.ecom-initialized)");
        $elements.forEach($element => {
            $element.addEventListener("click", function (e) {
                _this.handleClickEvent(this, e);
            });
            $element.classList.add('ecom-initialized');
        });
    };

    this.handleClickEvent = function (btn, event, list = false) {
        event.preventDefault();

        const wrapper = btn.closest('.ecom-collection__product-form__actions');
        let quantity = 1;

        if (wrapper) {
            const el_quantity = wrapper.querySelector('.ecom-collection__product-quantity-input');
            if (el_quantity) quantity = el_quantity.value;
        }

        const submitButton = btn;
        const _this = this;

        if (submitButton) {
            submitButton.style.cursor = "pointer";
            submitButton.style.pointerEvents = "auto";
            submitButton.classList.add("ecom-ajax-loading");
        }

        _this.beforeAjaxCartSend(event.target);

        window.fetch(_this.routes.cart_add_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/javascript",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({
                id: submitButton.dataset.id,
                quantity: quantity,
                sections: "cart-notification-product,cart-notification-button,cart-icon-bubble,cart-drawer"
            }),
        })
        .then(res => res.json())
        .then(response => {
            if (response.errors) {
                throw new Error(response.errors);
            }

            if (response.status > 200) {
                _this.showToast(response.description, 'error');
                if (submitButton) {
                    submitButton.style.cursor = "pointer";
                    submitButton.style.pointerEvents = "auto";
                    submitButton.classList.remove("ecom-ajax-loading", "ecom-loading");
                }
                document.dispatchEvent(new CustomEvent('ec-cart-error', { detail: response }));
                return;
            }

            const { action, href, textAddedCart, target, messageAddedCart } = submitButton.dataset;

            if (submitButton) {
                submitButton.style.cursor = "pointer";
                submitButton.style.pointerEvents = "auto";
                submitButton.classList.remove("ecom-ajax-loading", "ecom-loading");
                submitButton.setAttribute('data-added-to-cart', '');

                if (textAddedCart && textAddedCart !== '') {
                    submitButton.querySelector(".ecom-add-to-cart-text").innerHTML = textAddedCart;
                }
            }

            if (_this.onAjaxCartSuccess) {
                _this.onAjaxCartSuccess(response, event.target);
            }

            if (list && !_this.configs.ajax_cart.enable) {
                setTimeout(() => window.location.href = _this.routes.cart_url, 500);
                return;
            }

            document.dispatchEvent(new CustomEvent('ec-cart-added', { detail: response }));

            switch (action) {
                case "cart":
                    setTimeout(() => window.location.href = _this.routes.cart_url, 500);
                    break;
                case "reload":
                    setTimeout(() => window.location.reload(), 500);
                    break;
                case "checkout":
                    setTimeout(() => window.location.href = _this.routes.root_url + "checkout", 500);
                    break;
                case "message":
                    _this.showToast(messageAddedCart);
                    break;
                case "link":
                    if (href) {
                        setTimeout(() => {
                            if (target === "_blank") {
                                window.open(href);
                            } else {
                                window.location.href = href;
                            }
                        }, 500);
                    }
                    break;
                default:
                    _this.ajaxCartSuccess(response, event.target);
                    break;
            }
        })
        .catch(e => {
            window.alert(e.message);
            console.error(e);
            if (submitButton) {
                submitButton.style.cursor = "pointer";
                submitButton.style.pointerEvents = "auto";
                submitButton.classList.remove("ecom-ajax-loading", "ecom-loading");
            }
            _this.ajaxCartError(e, event.target);
        });
    };

    this.cartItemChange = function (key, quantity, line = null) {
        return window.fetch(this.routes.cart_change_url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ quantity, line }),
        }).then(res => res.json());
    };

    this.handleATCList = function () {
        const $doms = document.querySelectorAll(".ecom-collection__product-item .ecom-product-form:not(.ecom-ajax-cart), .ecom-collection__product-submit:not(.ecom-ajax-cart)");
        const _this = this;

        $doms.forEach($dom => {
            const button = $dom.querySelector(".ecom-ajax-cart-submit");
            const select = $dom.querySelector('[name="variant_id"]');

            if (button && select) {
                button.addEventListener("click", function (e) {
                    e.preventDefault();
                    this.dataset.id = select.value;
                    _this.handleClickEvent(this, e, true);
                });
            } else if ($dom.classList.contains("ecom-collection__product-submit") && $dom.dataset.id) {
                $dom.addEventListener("click", function (e) {
                    e.preventDefault();
                    _this.handleClickEvent(this, e, true);
                });
            }
            $dom.classList.add("ecom-ajax-cart");
        });
    };

    this.cartUpdate = function (params) {
        return window.fetch(this.routes.cart_update_url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(params),
        }).then(res => res.json());
    };

    this.showToast = function (message, status) {
        const $desc = document.querySelector("#ecom-toast-desc");
        const $toast = document.querySelector("#ecom-toast");
        const $icon = document.querySelector("#ecom-toast-icon");

        if (status === "error") {
            $toast.style.cssText = `background-color: red;overflow: hidden; z-index: 10000000;`;
            $icon.style.cssText = `background-color: red;`;
            $toast.classList.add('ecom-toast-error');
        } else {
            $toast.classList.remove('ecom-toast-error');
            $toast.style.cssText = `background-color: #333;overflow: hidden; z-index: 10000000;`;
            $icon.style.cssText = `background-color: #333; border-radius: 2px;`;
        }

        if ($toast && $desc && $icon) {
            $desc.innerHTML = message;
            $toast.classList.add("ecom-toast-show");
            $toast.style.setProperty("--ecom-max-width", $desc.clientWidth + 50 + "px");
            setTimeout(() => $toast.classList.remove("ecom-toast-show"), 5000);
        }
    };

    this.initToastTemplate = function () {
        const template = document.querySelector("#ecom-template-html");
        if (template) {
            const dom = document.createElement("div");
            dom.innerHTML = template.innerHTML;
            document.body.appendChild(dom);
        }
    };

    this.initCustomTracking = function () {
        const dt = window.EComposer.PAGE || window.EComposer.TEMPLATE || window.EComposer.SECTION || window.EComposer.BLOCK || {};
        if (!dt || !Object.keys(dt).length) return;

        const buttons = document.querySelectorAll('[ec-tracking-custom-id]');
        buttons.forEach(function ($button) {
            $button.addEventListener('click', function (e) {
                if (window.Shopify && window.Shopify.analytics) {
                    e.preventDefault();
                    const dom = document.createElement('div');
                    document.body.appendChild(dom);
                    dom.click();

                    const data = Object.assign({
                        "button_id": $button.id,
                        "tracking_id": $button.getAttribute('ec-tracking-custom-id'),
                    }, dt);
                    Shopify.analytics.publish("ec_custom_events", data);

                    const clone = $button.cloneNode(true);
                    clone.click();
                }
            }, { once: true });
        });
    };

    this.isAdmin = function () {
        return document.querySelector("#admin-bar-iframe") || window.Shopify.designMode;
    };

    this.isBot = function () {
        const botPatterns = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|crawl|bot|spider|scraper|curl|wget|python/i;
        return botPatterns.test(navigator.userAgent);
    };

    // Function to load popup script dynamically
    this.loadPopupScript = function() {
        // Skip loading popup script for bots
        if (this.isBot()) {
            return;
        }

        if (window.EComposer && window.EComposer.popupScriptUrl) {
            const script = document.createElement('script');
            script.src = window.EComposer.popupScriptUrl;
            script.async = true;
            script.type = 'text/javascript';
            script.id = 'ecom-popup-script';

            script.onerror = function() {
                console.error('Failed to load popup script');
            };

            document.head.appendChild(script);
        }
    };

    this.normalizeSwiperSettings = function(settings, defaults = {}) {
        const data = {
            slider_items: 1,
            slider_group: 1,
            slider_spacing: 0,
            slider_style: 'horizontal',
            slider_effect: 'slide',
            slider_loop: true,
            slider_autoplay: false,
            slider_autoplay_speed: 6000,
            slider_pause: false,
            autoplay_rtl: false,
            free_mode: false,
            slider_speed: 500,
            slider_center: false,
            slider_pagination_style: 'classic',
            isCustomHeight: true,
            disable_touch_move: true
        };

        [defaults, settings].forEach(source => {
            Object.keys(source || {}).forEach(key => {
                if (typeof source[key] !== 'undefined') {
                    data[key] = source[key];
                }
            });
        });

        return data;
    };

    // WCAG: aria-roledescription đã đọc "carousel"/"slide" rồi, nên nhãn không được lặp lại
    // các từ đó nữa (screen reader sẽ đọc "Sản phẩm carousel, carousel").
    this.sanitizeA11yLabel = function(value) {
        if (!value) return '';
        return value
            .toString()
            .replace(/\b(carousels?|sliders?)\b/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, '')
            .trim();
    };

    this.buildSwiperA11yConfig = function(settings) {
        settings = settings || {};

        if (settings.a11y_enabled === false) {
            return { a11y: { enabled: false }, ecomA11y: { enabled: false } };
        }

        const itemName = (settings.a11y_item_name || '').toString().trim();
        const label = this.sanitizeA11yLabel(settings.a11y_label);

        return {
            a11y: {
                enabled: true,
                // Container: aria-roledescription="carousel" + aria-label mô tả nội dung.
                containerRoleDescriptionMessage: 'carousel',
                containerMessage: label || null,
                // Slide: role="group" + aria-roledescription="slide" + "1 of 8".
                slideRole: 'group',
                itemRoleDescriptionMessage: 'slide',
                slideLabelMessage: '{{index}} of {{slidesLength}}',
                // Nút điều hướng: nhãn theo ngữ cảnh thay vì "Previous slide" chung chung.
                prevSlideMessage: itemName ? 'Previous ' + itemName : 'Previous slide',
                nextSlideMessage: itemName ? 'Next ' + itemName : 'Next slide',
                paginationBulletMessage: 'Go to slide {{index}}'
            },
            ecomA11y: {
                enabled: true,
                label: label,
                itemName: itemName,
                // WCAG 2.2.2 (Pause, Stop, Hide) - bắt buộc khi có autoplay.
                autoplayControl: settings.a11y_autoplay_control !== false,
                autoplayControlPosition: settings.a11y_autoplay_control_position || 'bottom-right',
                // Chặn focus bàn phím rơi vào slide đang ẩn ngoài viewport.
                manageFocus: settings.a11y_manage_focus !== false
            }
        };
    };

    this.buildSwiperConfig = function(settings, defaults = {}) {
        settings = this.normalizeSwiperSettings(settings, defaults);

        const breakpoints = {};
        const ops = [
            { key: 'slider_items', name: 'slidesPerView' },
            { key: 'slider_group', name: 'slidesPerGroup' },
            { key: 'slider_spacing', name: 'spaceBetween' }
        ];
        const screenMinWidths = [
            { name: 'mobile', width: 0 },
            { name: 'tablet', width: 768 },
            { name: 'desktop', width: 1025 }
        ];

        screenMinWidths.forEach(screen => {
            ops.forEach(op => {
                const suffix = screen.name === 'desktop' ? '' : '__' + screen.name;
                const settingKey = op.key + suffix;
                const keys = Object.keys(settings).filter(key => key.indexOf(op.key) === 0);

                if (keys.length === 1 && settings[op.key]) {
                    breakpoints[op.name] = settings[keys[0]];
                } else if (settingKey in settings) {
                    breakpoints.breakpoints = breakpoints.breakpoints || {};
                    breakpoints.breakpoints[screen.width] = breakpoints.breakpoints[screen.width] || {};
                    breakpoints.breakpoints[screen.width][op.name] = settings[settingKey];
                }
            });
        });

        let sliderEffect = settings.slider_effect || 'slide';
        let creative = {};
        const direction = settings.slider_style || 'horizontal';
        const isHorizontal = direction === 'horizontal';

        switch (settings.slider_effect) {
            case 'creative':
                creative = isHorizontal
                    ? { prev: { shadow: true, translate: [0, 0, -400] }, next: { translate: ['100%', 0, 0] } }
                    : { prev: { shadow: true, translate: [0, 0, -400] }, next: { translate: [0, '100%', 0] } };
                break;
            case 'creative2':
                sliderEffect = 'creative';
                creative = isHorizontal
                    ? { prev: { shadow: true, translate: ['-120%', 0, -500] }, next: { shadow: true, translate: ['120%', 0, -500] } }
                    : { prev: { shadow: true, translate: [0, '-120%', -500] }, next: { shadow: true, translate: [0, '120%', -500] } };
                break;
            case 'creative3':
                sliderEffect = 'creative';
                creative = isHorizontal
                    ? { prev: { shadow: true, translate: ['-20%', 0, -1] }, next: { translate: ['100%', 0, 0] } }
                    : { prev: { shadow: true, translate: [0, '-20%', -1] }, next: { translate: [0, '100%', 0] } };
                break;
            case 'creative4':
                sliderEffect = 'creative';
                creative = isHorizontal
                    ? { prev: { shadow: true, translate: [0, 0, -800], rotate: [180, 0, 0] }, next: { shadow: true, translate: [0, 0, -800], rotate: [-180, 0, 0] } }
                    : { prev: { shadow: true, translate: [0, 0, -800], rotate: [0, 180, 0] }, next: { shadow: true, translate: [0, 0, -800], rotate: [0, -180, 0] } };
                break;
            case 'creative5':
                sliderEffect = 'creative';
                creative = isHorizontal
                    ? { prev: { shadow: true, translate: ['-125%', 0, -800], rotate: [0, 0, -90] }, next: { shadow: true, translate: ['125%', 0, -800], rotate: [0, 0, 90] } }
                    : { prev: { shadow: true, translate: [0, '-125%', -800], rotate: [0, 0, -90] }, next: { shadow: true, translate: [0, '125%', -800], rotate: [0, 0, 90] } };
                break;
            case 'creative6':
                sliderEffect = 'creative';
                creative = isHorizontal
                    ? { prev: { shadow: true, origin: 'left center', translate: ['-5%', 0, -200], rotate: [0, 100, 0] }, next: { origin: 'right center', translate: ['5%', 0, -200], rotate: [0, -100, 0] } }
                    : { prev: { shadow: true, origin: 'bottom center', translate: [0, '-5%', -200], rotate: [100, 0, 0] }, next: { origin: 'top center', translate: [0, '5%', -200], rotate: [-100, 0, 0] } };
                break;
        }

        let paginationType = 'bullets';
        if (settings.slider_pagination_style_have_image === 'progress' || settings.slider_pagination_style === 'progress') {
            paginationType = 'progressbar';
        }

        const data = {
            direction,
            freeMode: settings.free_mode || false,
            loop: settings.slider_loop,
            loopAddBlankSlides: false,
            breakpoints,
            autoplay: {
                enabled: settings.slider_autoplay || false,
                delay: settings.slider_autoplay_speed || 0,
                pauseOnMouseEnter: settings.slider_pause || false,
                disableOnInteraction: false,
                reverseDirection: settings.autoplay_rtl || false
            },
            speed: settings.slider_speed,
            effect: sliderEffect,
            grabCursor: true,
            slideActiveClass: 'ecom-box-active',
            centeredSlides: settings.slider_center || false,
            watchOverflow: true,
            // Cần cho swiper.visibleSlides -> dùng để inert các slide ngoài viewport.
            watchSlidesProgress: true,
            autoHeight: settings.isCustomHeight ? false : true,
            cubeEffect: { slideShadows: true, shadowOffset: 20 },
            creativeEffect: creative,
            fadeEffect: { crossFade: true },
            pagination: {
                el: '.ecom-swiper-pagination',
                type: paginationType,
                clickable: true
            },
            navigation: {
                nextEl: '.ecom-swiper-button-next',
                prevEl: '.ecom-swiper-button-prev'
            }
        };

        if (settings.items && settings.items.length < settings.slider_group + settings.slider_items) {
            data.loop = false;
        }

        Object.keys(breakpoints).forEach(key => {
            data[key] = breakpoints[key];
        });

        Object.assign(data, this.buildSwiperA11yConfig(settings));

        return data;
    };

    /**
     * Bổ sung phần a11y mà module A11y của Swiper không tự làm:
     *  - role="region" / role="group" trên container
     *  - aria-label fallback suy ra từ heading gần nhất khi merchant chưa đặt
     *  - nút pause/play autoplay (WCAG 2.2.2 Pause, Stop, Hide)
     *  - inert cho slide nằm ngoài viewport để focus bàn phím không rơi vào
     *
     * Chạy ở runtime nên áp dụng được cho cả những page đã publish từ trước,
     * merchant không cần mở builder save lại từng page.
     */
    this.initSwiperA11y = function() {
        const self = this;
        const SELECTOR = '.ecom-swiper-container';
        const DONE_ATTR = 'data-ecom-a11y';
        const supportsInert = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

        const STRINGS = {
            pause: 'Pause automatic slide show',
            play: 'Start automatic slide show'
        };
        const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>';
        const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>';

        const injectStyles = function() {
            if (document.getElementById('ecom-swiper-a11y-css')) return;
            const style = document.createElement('style');
            style.id = 'ecom-swiper-a11y-css';
            style.textContent = [
                '.ecom-swiper-a11y-host{position:relative}',
                '.ecom-swiper-autoplay-toggle{position:absolute;z-index:6;display:flex;align-items:center;justify-content:center;',
                'width:36px;height:36px;padding:0;margin:0;border:1px solid rgba(0,0,0,.35);border-radius:50%;',
                'background:#fff;color:#111;cursor:pointer;line-height:0;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
                '.ecom-swiper-autoplay-toggle:hover{background:#f4f4f4}',
                '.ecom-swiper-autoplay-toggle:focus-visible{outline:2px solid #005bd3;outline-offset:2px}',
                '.ecom-swiper-autoplay-toggle svg{width:15px;height:15px;fill:currentColor;pointer-events:none}',
                '.ecom-swiper-autoplay-toggle[data-position="top-left"]{top:12px;left:12px}',
                '.ecom-swiper-autoplay-toggle[data-position="top-right"]{top:12px;right:12px}',
                '.ecom-swiper-autoplay-toggle[data-position="bottom-left"]{bottom:12px;left:12px}',
                '.ecom-swiper-autoplay-toggle[data-position="bottom-right"]{bottom:12px;right:12px}',
                '@media (forced-colors:active){.ecom-swiper-autoplay-toggle{border:1px solid ButtonText;background:ButtonFace;color:ButtonText}}'
            ].join('');
            document.head.appendChild(style);
        };

        // Suy ra nhãn từ heading gần nhất nằm NGOÀI slider, để không lấy nhầm
        // tiêu đề của một slide bất kỳ bên trong.
        const deriveLabel = function(el) {
            const scope = el.closest('.ecom-section, .ecom-core, .ecom-sections') || el.parentElement;
            if (!scope) return '';
            const headings = scope.querySelectorAll('h1,h2,h3,h4,h5,h6');
            for (let i = 0; i < headings.length; i++) {
                if (el.contains(headings[i])) continue;
                const text = self.sanitizeA11yLabel((headings[i].textContent || '').replace(/\s+/g, ' '));
                if (text) return text.slice(0, 120);
            }
            return '';
        };

        // Page publish trước khi buildSwiperConfig có a11y sẽ nhúng config cũ,
        // module A11y của Swiper chạy với default nên thiếu aria-roledescription
        // và dùng "1 / 8" thay vì "1 of 8". Vá lại ở tầng DOM cho nhóm page đó.
        // force = true khi đã xác định Swiper không tự xử lý, cần ghi đè lại mỗi
        // lần loop/update đổi thứ tự slide.
        const applySlideLabels = function(slides, force) {
            const total = slides.length;
            if (!total) return;
            // Swiper bản mới đã gắn đúng rồi thì không đụng vào nữa.
            if (!force
                && slides[0].getAttribute('aria-roledescription') === 'slide'
                && / of /.test(slides[0].getAttribute('aria-label') || '')) {
                return;
            }
            for (let i = 0; i < total; i++) {
                const slide = slides[i];
                if (!slide) continue;
                if (!slide.getAttribute('role')) slide.setAttribute('role', 'group');
                slide.setAttribute('aria-roledescription', 'slide');
                // Khi loop, Swiper đánh index thật lên data-attribute này.
                const raw = slide.getAttribute('data-ecom-swiper-slide-index');
                const index = (raw === null ? i : parseInt(raw, 10)) + 1;
                slide.setAttribute('aria-label', index + ' of ' + total);
            }
        };

        const patchSlidesFromDom = function(el) {
            applySlideLabels(el.querySelectorAll('.ecom-swiper-slide'), false);
        };

        // Có instance thì gắn thêm listener để nhãn cập nhật theo loop/update.
        const patchLegacySlides = function(swiper) {
            const a11yParams = (swiper.params && swiper.params.a11y) || {};
            if (a11yParams.itemRoleDescriptionMessage) return; // config mới, Swiper tự lo

            const apply = function() {
                if (swiper.destroyed || !swiper.slides) return;
                applySlideLabels(swiper.slides, true);
            };

            ['update', 'slidesLengthChange', 'observerUpdate'].forEach(function(evt) {
                swiper.on(evt, apply);
            });
            apply();
        };

        const addAutoplayToggle = function(el, swiper, opts) {
            const host = el.parentElement || el;
            if (host.querySelector('.ecom-swiper-autoplay-toggle')) return;
            host.classList.add('ecom-swiper-a11y-host');

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ecom-swiper-autoplay-toggle';
            btn.setAttribute('data-position', opts.autoplayControlPosition || 'bottom-right');

            // Toggle button đổi nhãn theo trạng thái -> không dùng aria-pressed
            // để screen reader không đọc chồng hai thông tin mâu thuẫn.
            const render = function(isPlaying) {
                btn.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
                btn.setAttribute('aria-label', isPlaying ? STRINGS.pause : STRINGS.play);
            };

            btn.addEventListener('click', function() {
                if (!swiper.autoplay) return;
                if (swiper.autoplay.running) {
                    // stop() chứ không pause(): pause() sẽ bị resume() của
                    // pauseOnMouseEnter bật lại, người dùng bấm dừng thì phải dừng hẳn.
                    swiper.autoplay.stop();
                    render(false);
                } else {
                    swiper.autoplay.start();
                    render(true);
                }
            });

            render(!!(swiper.autoplay && swiper.autoplay.running));
            host.appendChild(btn);
        };

        const manageFocus = function(swiper) {
            if (!supportsInert) return;

            const update = function() {
                if (swiper.destroyed || !swiper.slides) return;
                const visible = swiper.visibleSlides && swiper.visibleSlides.length
                    ? Array.prototype.slice.call(swiper.visibleSlides)
                    : [swiper.slides[swiper.activeIndex]];

                for (let i = 0; i < swiper.slides.length; i++) {
                    const slide = swiper.slides[i];
                    if (!slide) continue;
                    const isVisible = visible.indexOf(slide) !== -1;
                    // Không inert slide đang giữ focus, tránh làm mất focus về body.
                    if (!isVisible && slide.contains(document.activeElement)) continue;

                    if (isVisible) {
                        slide.inert = false;
                        slide.removeAttribute('aria-hidden');
                    } else {
                        slide.inert = true;
                        slide.setAttribute('aria-hidden', 'true');
                    }
                }
            };

            ['transitionEnd', 'slideChangeTransitionEnd', 'resize', 'update', 'observerUpdate'].forEach(function(evt) {
                swiper.on(evt, update);
            });
            // Slide đang giữ focus được tha inert ở trên; khi focus rời đi phải
            // chạy lại để nó không bị kẹt ở trạng thái vào được bằng bàn phím.
            if (swiper.el && swiper.el.addEventListener) {
                swiper.el.addEventListener('focusout', function() {
                    setTimeout(update, 0);
                });
            }
            update();
        };

        // Container role + nhãn + nhãn slide đều suy ra được từ DOM, không cần
        // Swiper instance. Tách riêng để nếu không lấy được instance (page publish
        // đã lâu, slider init trễ, hoặc build Swiper gắn instance lên tên khác)
        // thì phần này vẫn chạy.
        const enhanceFromDom = function(el) {
            if (!el.getAttribute('aria-roledescription')) {
                el.setAttribute('aria-roledescription', 'carousel');
            }

            let hasName = !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
            if (!hasName) {
                const label = deriveLabel(el);
                if (label) {
                    el.setAttribute('aria-label', label);
                    hasName = true;
                }
            }
            if (!el.getAttribute('role')) {
                // region không có accessible name thì AT bỏ qua -> hạ xuống group.
                el.setAttribute('role', hasName ? 'region' : 'group');
            }

            patchSlidesFromDom(el);
        };

        const enhance = function(el) {
            const state = el.getAttribute(DONE_ATTR);
            if (state === 'done' || state === 'skipped') return;

            // Tuỳ build mà instance được gắn lên el.swiper hay el.EComSwiper.
            const swiper = el.swiper || el.EComSwiper || null;
            const opts = (swiper && swiper.params && swiper.params.ecomA11y) || {};
            if (opts.enabled === false) {
                el.setAttribute(DONE_ATTR, 'skipped');
                return;
            }

            if (state !== 'dom') {
                enhanceFromDom(el);
                el.setAttribute(DONE_ATTR, 'dom');
            }

            // Chưa có instance -> giữ trạng thái 'dom', lần quét sau vào làm tiếp.
            if (!swiper) return;
            el.setAttribute(DONE_ATTR, 'done');

            patchLegacySlides(swiper);

            if (swiper.params.autoplay && swiper.params.autoplay.enabled && opts.autoplayControl !== false) {
                addAutoplayToggle(el, swiper, opts);
            }
            if (opts.manageFocus !== false) {
                manageFocus(swiper);
            }
        };

        const scan = function() {
            const nodes = document.querySelectorAll(SELECTOR);
            for (let i = 0; i < nodes.length; i++) {
                try {
                    enhance(nodes[i]);
                } catch (e) {
                    /* một slider lỗi không được làm chết các slider còn lại */
                }
            }
        };

        injectStyles();
        scan();

        // Slider init trễ (poll buildSwiperConfig 200ms x 20). Quét lại có giới hạn.
        let rounds = 0;
        const timer = setInterval(function() {
            rounds++;
            scan();
            if (rounds >= 25) clearInterval(timer);
        }, 400);

        window.addEventListener('load', scan);
        document.addEventListener('ecom-products-init-slider', scan);
        document.addEventListener('shopify:section:load', scan);

        // Slider sinh sau: quickview, ajax load more, popup...
        if (typeof MutationObserver !== 'undefined' && document.body) {
            try {
                let pending = null;
                new MutationObserver(function(mutations) {
                    let relevant = false;
                    for (let i = 0; i < mutations.length && !relevant; i++) {
                        const added = mutations[i].addedNodes;
                        for (let j = 0; j < added.length; j++) {
                            const node = added[j];
                            if (node.nodeType !== 1) continue;
                            if (node.matches(SELECTOR) || node.querySelector(SELECTOR)) {
                                relevant = true;
                                break;
                            }
                        }
                    }
                    if (!relevant) return;
                    clearTimeout(pending);
                    pending = setTimeout(scan, 300);
                }).observe(document.body, { childList: true, subtree: true });
            } catch (e) {
                /* mất phần bắt slider sinh sau, nhưng không được chết cả cụm */
            }
        }
    };

    this.bootSwiperA11y = function() {
        if (this.__swiperA11yBooted) return;
        this.__swiperA11yBooted = true;
        const self = this;
        const boot = function() {
            try {
                self.initSwiperA11y();
            } catch (e) {
                console.warn('EComposer: slider accessibility init failed', e);
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    };

    this.init = function () {
        // Chạy sớm và tách biệt: lỗi ở bất kỳ bước nào sau đây trong init()
        // cũng không được làm mất phần accessibility của slider.
        try {
            this.bootSwiperA11y();
        } catch (e) {
            console.warn('EComposer: slider accessibility boot failed', e);
        }

        this.initToastTemplate();

        if (window.Shopify && !this.isAdmin()) {
            let dt = window.EComposer.PAGE || window.EComposer.TEMPLATE || window.EComposer.SECTION || window.EComposer.BLOCK || {};

            if (dt && Object.keys(dt).length) {
                if (dt.type) {
                    dt.layout_type = dt.type;
                    delete dt.type;
                }
                if (dt.template_id) {
                    dt.layout_id = dt.template_id;
                    delete dt.template_id;
                }

                const activeCurrency = window.Shopify.currency?.active || baseCurrency;
                const baseCurrency = window.shopCurrency || activeCurrency;
                const exchangeRate = parseFloat(window.Shopify.currency?.rate || '1');

                dt.base_currency = baseCurrency; // Currency mặc định của store
                dt.active_currency = activeCurrency; // Currency user đang xem
                dt.exchange_rate = exchangeRate; // Rate để convert

                if (window.Shopify.analytics) {
                    Shopify.analytics.publish("ec_page_viewed", dt);
                } else {
                    let c = 0;
                    const itv = setInterval(() => {
                        if (window.Shopify.analytics) {
                            Shopify.analytics.publish("ec_page_viewed", dt);
                            clearInterval(itv);
                        }
                        c++;
                        if (c > 200) clearInterval(itv);
                    }, 100);
                }

                const initTime = new Date().getTime();
                let fired = false;

                document.addEventListener("click", () => { fired = true; }, { once: true });

                window.addEventListener("beforeunload", () => {
                    if (!fired) {
                        const closeTime = new Date().getTime();
                        const elapsedTime = closeTime - initTime;
                        if (window.Shopify.analytics) {
                            Shopify.analytics.publish("ec_bounce_rate", {
                                ...dt,
                                elapsed_time: (elapsedTime / 1000).toFixed(2),
                            });
                        }
                    }
                });
            }
        }

        if (this.abTestingData && this.abTestingData.campaigns && this.abTestingData.campaigns.length) {
            if (document.readyState === "loading") {
                document.addEventListener(
                    "DOMContentLoaded",
                    this.handleABTestingEvent.bind(this)
                );
            } else {
                setTimeout(this.handleABTestingEvent.bind(this), 100);
            }
        }
        if (this.configs && this.configs.ajax_cart && this.configs.ajax_cart.enable) {
            this.ajaxCart();
        } else {
            this.handleATCList();
            document.body.addEventListener("submit", e => {
                if (e.target.classList.contains("ecom-product-form") && e.target.nodeName === "FORM") {
                    if (window.omegaCallBackAddToCart && typeof window.omegaCallBackAddToCart === "function") {
                        window.omegaCallBackAddToCart();
                    }
                }
            });
        }

        // Load popup script after initialization
        this.loadPopupScript();

        this.initCustomTracking();
    };

    this.init();
}).bind(window.EComposer || {})();

(function () {
    let timeout;

    const isVisible = ele => {
        const { top, bottom } = ele.getBoundingClientRect();
        const vHeight = window.innerHeight || document.documentElement.clientHeight;
        return (top > 0 || bottom > 0) && top < vHeight;
    };

    const handleScroll = () => {
        const videos = document.querySelectorAll(".ecom-sections .ecom-video-background");
        videos.forEach(video => {
            const source = video.dataset.source || 'html5';
            if (video.dataset.playPauseInview === "true") {
                if (isVisible(video)) {
                    if(video.tagName.toLowerCase() === 'video') {
                        // HTML5 video - xử lý autoplay policy
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {
                                video.muted = true;
                                video.play().catch(e => {
                                    console.warn('Video autoplay failed:', e);
                                });
                            });
                        }
                    }
                    else {
                        if(source == 'vimeo') {
                            video.contentWindow.postMessage(
                                JSON.stringify({ method: "play" }),
                                "https://player.vimeo.com"
                            );
                        }
                        else {
                            video.contentWindow.postMessage(
                                JSON.stringify({
                                    event: "command",
                                    func: "playVideo",
                                    args: []
                                }),
                                "https://www.youtube.com"
                            );
                        }
                    }
                } else {
                    if(video.tagName.toLowerCase() === 'video') {
                        video.pause();
                    } else {
                        if(source == 'vimeo') {
                            video.contentWindow.postMessage(
                                JSON.stringify({ method: "pause" }),
                                "https://player.vimeo.com"
                            );
                        }
                        else {
                            video.contentWindow.postMessage(
                                JSON.stringify({
                                    event: "command",
                                    func: "pauseVideo",
                                    args: []
                                }),
                                "https://www.youtube.com"
                            );
                        }
                    }
                }
            }
        });
    };

    window.addEventListener("scroll", () => {
        clearTimeout(timeout);
        timeout = setTimeout(handleScroll, 500);
    });

    const stretchedSections = () => {
        clearTimeout(window.stretchedTimmer);
        window.stretchedTimmer = setTimeout(() => {
            const sections = document.querySelectorAll(".ecom-core.ecom-section");
            const swipers = document.querySelectorAll(".ecom-swiper-container");
            const ecomSections = document.querySelectorAll(".ecom-sections");
            // Dùng clientWidth thay innerWidth để loại trừ scrollbar width
            const windowWidth = document.documentElement.clientWidth;

            if (sections.length > 0) {
                ecomSections.forEach(s => s.style.width = "");

                const containerWidth = ecomSections[0].offsetWidth;
                const mleft = (windowWidth - containerWidth) / 2;
                sections.forEach(section => {
                    if (section.classList.contains("ecom-section__stretched")) {
                        section.style.width = windowWidth + "px";
                        // Chỉ apply marginLeft âm khi mleft > 0, tránh mobile bị margin-left dương
                        section.style.marginLeft = mleft > 0 ? -mleft + "px" : "0px";
                    } else {
                        section.style.width = "";
                        section.style.marginLeft = "";
                    }
                });
            }

            if (swipers.length > 0) {
                swipers.forEach(swiper => {
                    if (swiper.EComSwiper) {
                        swiper.EComSwiper.update();
                    }
                });
            }
        }, 50);
    };

    stretchedSections();
    window.addEventListener("resize", stretchedSections);
    window.addEventListener("load", stretchedSections);

    document.addEventListener("DOMContentLoaded", () => {
        if (typeof window.EComposer.initQuickview === "function") {
            window.EComposer.initQuickview();
        }
        const overLayVideos = document.querySelectorAll('.ecom-section__overlay > .ecom-video-background');
        if (overLayVideos.length) {
            overLayVideos.forEach((video) => {
                video.addEventListener('click', function() {
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                });
            });
        }
    });

    // The element that OWNS an element-level SR grid must not run its own entrance animation:
    // both animations sit on the same pixels and the host's opacity multiplies the cards', so the
    // stagger would play behind a fading box. The nested SR wins — same doctrine as SR > Entrance
    // on a single node. Sequencing them instead was rejected: the host would fade in an empty box
    // (its cards are still opacity:0 from the FOUC rule) and only add dead time before the stagger.
    //
    // "Owns" = nearest `.ecom-animation` ancestor of the grid, i.e. the Product Grid / Blog
    // Articles block itself. Deliberately NOT every ancestor that contains a grid: an inner Row /
    // FlexContainer wrapping that block keeps its own entrance, and so does the section. Those sit
    // further out, animate as a whole, and dropping them silently stripped animations the merchant
    // had set on layout they think of as unrelated to the grid.
    //
    // Nesting depth is irrelevant — `closest` finds the nearest animated ancestor however many
    // Rows / FlexContainers sit in between. `.ecom-block` is the hard ceiling: it is the element's
    // own wrapper (emitted unconditionally by Block.vue and BlockGrid.vue), so a grid can never
    // promote a Row / FlexContainer / section into its host. Without that ceiling, a Product Grid
    // or Blog Articles block with NO entrance animation of its own makes `closest` skip straight
    // past it and land on the wrapping Row — silently killing an animation the merchant set on
    // layout, which is exactly what happened with a Blog Articles block.
    const srGridHost = (grid) => {
        const host = grid.closest('.ecom-animation');
        if (!host) return null;
        const block = grid.closest('.ecom-block');
        // contains() is inclusive, so host === block passes; only an ancestor of the block fails.
        if (block && !block.contains(host)) return null;
        return host;
    };

    // ALL grids in the subtree have to be checked, not just the first: a Row can hold one grid
    // whose host is its own animated block and another whose block has no animation, and testing
    // only the first grid in document order would answer for the wrong one.
    const isSrGridHost = (el) => {
        const grids = el.querySelectorAll('[data-ec-sr-items]');
        for (let i = 0; i < grids.length; i++) {
            if (srGridHost(grids[i]) === el) return true;
        }
        return false;
    };

    const scrollTrigger = (selector, options = {}) => {
        const els = Array.from(document.querySelectorAll(selector));
        // One document-wide probe instead of one subtree walk per entrance target (see the
        // hasItemSR guard in addObserver). Read at the same moment as the querySelectorAll above,
        // so it observes exactly the DOM that produced `els` — it cannot be more stale than the
        // list it filters. Grids that get `data-ec-sr-items` later (inheritGridSR, which runs in
        // initScrollReveal) live inside `[data-ec-sr]`, where the first guard already returns.
        const hasItemSR = !!document.querySelector('[data-ec-sr-items]');
        els.forEach(el => addObserver(el, options, hasItemSR));
    };

    // hasItemSR defaults to true so a caller that omits it keeps the unconditional behaviour.
    const addObserver = (el, options, hasItemSR = true) => {
        // Skip entrance animation for elements inside an SR section — SR controls reveal timing.
        // If the element itself is the SR host ([data-ec-sr].ecom-animation), also skip:
        // SR owns that node; Entrance must not hide it via opacity:0.
        if (el.closest('[data-ec-sr]')) return;

        // Same doctrine one level down: a node that WRAPS an element-level SR grid must not run
        // its own entrance. Both animations sit on the same pixels and the wrapper's opacity
        // multiplies the cards', so the stagger would play behind a fading box. This branch is
        // what catches the case where no section SR exists at all (`data-ec-sr-items` turned on
        // in the Product Grid / Blog Articles settings while page + section SR are off) — there
        // is no SR item to defer to, so triggerEntranceOnSrItem never sees this node.
        // Release it visible by hand instead of adding `ecom-animated`: that class flips
        // animation-name to the element's own keyframes and the browser starts them immediately.
        // `.ecom-sr-done { opacity: 1 }` is the release (same class triggerEntranceUnlessSrHost
        // uses; it ships in app-embed.liquid AND in the injected sheet, and in both it sits after
        // `.ecom-animation { opacity: 0 }` at equal specificity, so it wins on order).
        // `ecom-animated-end` is the marker the parentAnim chain below waits on, so descendants
        // do not hang waiting for an animationend that never fires.
        if (hasItemSR && isSrGridHost(el)) {
            el.classList.add('ecom-sr-done', 'ecom-animated-end');
            return;
        }

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (options.cb) {
                        options.cb(el);
                    } else {
                        const delayAttr = entry.target.getAttribute("ec-delay") || entry.target.getAttribute("data-animation-delay");
                        const delayVal = parseInt(delayAttr) || 10;

                        const runAnimation = () => {
                            setTimeout(() => {
                                entry.target.classList.add("ecom-animated", "animated");
                                entry.target.addEventListener("animationend", () => {
                                    entry.target.classList.add("ecom-animated-end");
                                }, { once: true });
                            }, delayVal);
                        };

                        const parentAnim = entry.target.closest(".ecom-animation");

                        if (parentAnim && parentAnim !== entry.target) {
                            if (!parentAnim.classList.contains("ecom-animated-end")) {
                                parentAnim.addEventListener("animationend", runAnimation, { once: true });
                            } else {
                                runAnimation();
                            }
                        } else {
                            runAnimation();
                        }
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, options);
        observer.observe(el);
    };

    scrollTrigger(".ecom-animation");

    const scrollAnimation = function () {
        const self = this;
        this.defaultValue = [];

        this.init = function () {
            const selectors = document.querySelectorAll("[ecom-scrolling-animation]");
            if (!selectors.length) return;

            selectors.forEach((element) => {
                try {
                    element.ecomScrollingOptions = JSON.parse(element.getAttribute("ecom-scrolling-animation"));
                } catch (e) {
                    element.ecomScrollingOptions = null;
                }
                element.ecomScrollingRawAttr = element.getAttribute("ecom-scrolling-animation");
            });

            let isTicking = false;
            window.addEventListener("scroll", () => {
                if (!isTicking) {
                    window.requestAnimationFrame(() => {
                        self.handleScrollAnimation(selectors);
                        isTicking = false;
                    });
                    isTicking = true;
                }
            }, { passive: true });

            self.handleScrollAnimation(selectors);
        };

        this.handleScrollAnimation = function (selectors) {
            selectors.forEach((element, index) => {
                self.animation(element, index);
            });
        };

        this.animation = function (element, index) {
            const rawAttr = element.getAttribute("ecom-scrolling-animation");
            if (element.ecomScrollingRawAttr !== rawAttr) {
                try {
                    element.ecomScrollingOptions = JSON.parse(rawAttr);
                } catch (e) {
                    element.ecomScrollingOptions = null;
                }
                element.ecomScrollingRawAttr = rawAttr;
            }
            const options = element.ecomScrollingOptions;

            if (!options) return;

            const view_percent = this.getViewPercentage(element);
            const css = this.getOptions(options, view_percent, element, index);

            let transform = "", rotate = "", filter = "";

            Object.keys(css).forEach(key => {
                if (["translateX", "translateY"].includes(key)) {
                    transform += `${key}(${css[key]}) `;
                    delete css[key];
                } else if (["blur"].includes(key)) {
                    filter += `${key}(${css[key]}) `;
                    delete css[key];
                } else if (["rotate"].includes(key)) {
                    rotate = `${key}(${css[key]}) `;
                    delete css[key];
                }
            });

            if (Object.keys(css).length) {
                Object.assign(element.style, css);
            }

            if (transform) {
                element.style.transform = transform.trim();
                element.ecomCSSTransform = true;
            } else if (element.ecomCSSTransform) {
                element.style.transform = '';
                element.ecomCSSTransform = false;
            }

            if (filter) {
                element.style.filter = filter.trim();
                element.ecomCSSFilter = true;
            } else if (element.ecomCSSFilter) {
                element.style.filter = '';
                element.ecomCSSFilter = false;
            }

            if (rotate) {
                const firstChild = element.querySelector(":first-child");
                if (firstChild) {
                    firstChild.style.transform = rotate.trim();
                }
                element.ecomCSSRotate = true;
            } else if (element.ecomCSSRotate) {
                const firstChild = element.firstElementChild;
                if (firstChild) {
                    firstChild.style.transform = '';
                }
                element.ecomCSSRotate = false;
            }
        };

        this.getStyleValue = function (name, style) {
            if (!style) return "";
            const regex = new RegExp(`${name}\\(([\\d\\-.a-z]+)\\)`);
            const v = style.match(regex);
            return v ? v[1] : "";
        };

        this.getOptions = function (options, view_percent, element, index) {
            const style = {};
            let clamped_percent = view_percent;
            if (clamped_percent < 0) clamped_percent = 0;
            if (clamped_percent > 100) clamped_percent = 100;

            options.forEach(option => {
                const option_value = option.value;
                if (!option_value) return;

                let value;

                if (self.defaultValue[index]) {
                    if (self.defaultValue[index][option.css] === undefined) {
                        let temp_value = element.style[option.css] || '';
                        if (["translateX", "translateY"].includes(option.css)) {
                            temp_value = self.getStyleValue(option.css, element.style.transform) || 0;
                        }
                        if (["blur"].includes(option.css)) {
                            temp_value = self.getStyleValue(option.css, element.style.filter) || 0;
                        }
                        self.defaultValue[index][option.css] = temp_value;
                    }
                } else {
                    self.defaultValue[index] = {};
                    let temp_value = element.style[option.css] || '';
                    if (["translateX", "translateY"].includes(option.css)) {
                        temp_value = self.getStyleValue(option.css, element.style.transform) || 0;
                    }
                    if (["blur"].includes(option.css)) {
                        temp_value = self.getStyleValue(option.css, element.style.filter) || 0;
                    }
                    self.defaultValue[index][option.css] = temp_value;
                }

                if (option_value.trigger_start || option_value.trigger_end) {
                    let trigger_start = option_value.trigger_start || 0;
                    let trigger_end = option_value.trigger_end || 100;

                    if (trigger_start > trigger_end) {
                        [trigger_start, trigger_end] = [trigger_end, trigger_start];
                    }

                    let new_percent;
                    if (trigger_start > clamped_percent) {
                        new_percent = 0;
                    } else if (trigger_end < clamped_percent) {
                        new_percent = 100;
                    } else {
                        const diff = trigger_end - trigger_start;
                        new_percent = ((clamped_percent - trigger_start) / diff) * 100;
                    }
                    value = self.caculateCss(new_percent, option_value);
                } else {
                    value = self.caculateCss(clamped_percent, option_value);
                }

                style[option.css] = value;
            });

            return style;
        };

        this.caculateCss = function (percent, value) {
            if (value.hasOwnProperty("start") && value.hasOwnProperty("end")) {
                let cal;
                if (value.hasOwnProperty("middle")) {
                    const start = this.toInt(value.start);
                    const middle = this.toInt(value.middle);
                    const end = this.toInt(value.end);
                    const minus_start = start - middle;
                    const minus_end = middle - end;

                    if (percent <= 50) {
                        cal = minus_start * (percent / 100 / 0.5);
                        cal = start - cal;
                    } else {
                        cal = minus_end * (1 - percent / 100 / 0.5);
                        cal = middle + cal;
                    }
                } else {
                    const diff = this.toInt(value.start) - this.toInt(value.end);
                    cal = diff * (percent / 100);
                    cal = this.toInt(value.start) - cal;
                }
                return cal + this.getUnit(value.start);
            } else if (value.middle && percent === 50) {
                return this.toInt(value.middle) + this.getUnit(value.middle);
            }
        };

        this.toInt = function (value) {
            return typeof value === "number" ? value : parseFloat(value);
        };

        this.getUnit = function (value) {
            return typeof value === "number" ? "" : value.replace(/^-?[\d.]+/, "");
        };

        this.getViewPercentage = function (element) {
            const elementBoundingRect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const scrollTop = window.scrollY;
            const elementOffsetTop = elementBoundingRect.y + window.pageYOffset;
            const elementHeight = elementBoundingRect.height;
            const distance = scrollTop + viewportHeight - elementOffsetTop;
            const percentage = distance / ((viewportHeight + elementHeight) / 100);
            return percentage;
        };

        this.init();
    };

    scrollAnimation.bind({}).call();

    const imagesParallax = document.querySelectorAll(".ecom-use-parallax .ecom-parallax-background img");

    const parallaxImg = image => {
        if (!image) return;

        const imageParent = image.closest('.ecom-use-parallax');
        const speed = -1.5;
        const imgY = imageParent.getBoundingClientRect().top + window.scrollY;
        const winY = window.scrollY;
        const winH = window.innerHeight;
        const parentH = imageParent.clientHeight;
        const winBottom = winY + winH;

        if (winBottom > imgY && winY < imgY + parentH) {
            const imgBottom = (winBottom - imgY) * speed;
            const imgTop = winH + parentH;
            const imgPercent = (imgBottom / imgTop) * 100 + (50 - speed * 50);
            image.style.top = imgPercent + '%';
            image.style.transform = `translate(-50%, -${imgPercent}%)`;
        }
    };

    const handleScrollParallax = () => {
        imagesParallax.forEach(img => parallaxImg(img));
    };

    if (imagesParallax.length > 0) {
        document.addEventListener('scroll', handleScrollParallax);
        window.addEventListener('load', handleScrollParallax);
    }

    // Scroll Reveal — CSS lives in app-embed.liquid (`<style class="ecom-theme-helper">`):
    // FOUC-hide rules, `.ecom-sr-done`, the `ecom-sr-*` keyframes and the `.ecom-sr-visible`
    // driver. It used to be injected from here too while the feature was being debugged; that
    // duplicate is gone. Static CSS also means a section arriving via `shopify:section:load`
    // is styled before its first frame, which a runtime injection could not guarantee.

    // Scroll Reveal — core logic

    // Matches .ecom-sr-visible { animation-duration: 0.6s } — used only as fallback.
    const SR_ANIM_DURATION_MS = 600;

    const parseEntranceDelay = (el) => {
        const raw = el.getAttribute('ec-delay') ?? el.getAttribute('data-animation-delay');
        if (raw === null || raw === '') return 0;
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const ENTRANCE_DEFAULT_DURATION = '0.75s';

    const triggerEntrance = (el, extraDelay = 0) => {
        const entranceDelay = parseEntranceDelay(el);
        const totalDelay = extraDelay + entranceDelay;
        setTimeout(() => {
            // Restart cleanly: remove stale classes + force reflow so the browser
            // always begins a fresh entrance animation after SR transform ends.
            el.classList.remove('ecom-animated', 'animated', 'ecom-animated-end');
            void el.offsetWidth;

            const onEnd = (e) => {
                if (e.target !== el) {
                    return;
                }
                el.removeEventListener('animationend', onEnd);
                el.classList.add('ecom-animated-end');
            };
            el.addEventListener('animationend', onEnd);
            el.classList.add('ecom-animated', 'animated');

            // Defense for already-exported pages: animation_duration: 0 !important
            // overrides entrance default (.75s) → shake ends in ~0ms (invisible).
            const cs = getComputedStyle(el);
            const dur = parseFloat(cs.animationDuration) || 0;
            if (dur === 0 && cs.animationName && cs.animationName !== 'none') {
                el.style.setProperty('animation-duration', ENTRANCE_DEFAULT_DURATION, 'important');
            }
        }, totalDelay);
    };

    // Priority SR > Entrance: wait until THIS SR item's reveal animation actually
    // finishes, then run entrance on the item / its descendants.
    // Fixed +600ms is not enough for later stagger items (transform conflict with
    // still-running sibling SR + same-frame race with SR end).
    const waitForSrThen = (item, cb) => {
        // Two frames: one for the animation's final commit, one so the entrance starts from a
        // settled style. Every path below funnels through here.
        const run = () => {
            requestAnimationFrame(() => requestAnimationFrame(cb));
        };

        const anims = typeof item.getAnimations === 'function' ? item.getAnimations() : [];
        if (anims.length) {
            Promise.all(anims.map(a => a.finished.catch(() => {}))).then(run);
            return;
        }

        // Same frame as classList.add('ecom-sr-visible') — animation may not exist yet.
        requestAnimationFrame(() => {
            const anims2 = typeof item.getAnimations === 'function' ? item.getAnimations() : [];
            if (anims2.length) {
                Promise.all(anims2.map(a => a.finished.catch(() => {}))).then(run);
                return;
            }
            const onEnd = (e) => {
                if (e.target !== item) {
                    return;
                }
                item.removeEventListener('animationend', onEnd);
                clearTimeout(fallback);
                run();
            };
            item.addEventListener('animationend', onEnd);
            const fallback = setTimeout(() => {
                item.removeEventListener('animationend', onEnd);
                run();
            }, SR_ANIM_DURATION_MS + 50);
        });
    };

    // Drop SR animation-name !important so Entrance can run on the same node
    // (Grid item / Flex block / Column). Keep opacity via .ecom-sr-done so FOUC
    // hide rules do not re-apply while waiting for ec-delay.
    const releaseSrStyles = (item) => {
        item.classList.add('ecom-sr-done');
        item.style.opacity = '1';
        item.classList.remove('ecom-sr-visible');
        item.removeAttribute('data-sr-anim');
    };

    // Visible, but without animating. Re-adding .ecom-animated would switch animation-name
    // back to the element's own entrance keyframes, which the browser starts immediately —
    // .ecom-sr-done just holds opacity:1.
    const triggerEntranceUnlessSrHost = (el) => {
        if (isSrGridHost(el)) {
            el.classList.add('ecom-sr-done');
            return;
        }
        triggerEntrance(el, 0);
    };

    const triggerEntranceOnSrItem = (item) => {
        waitForSrThen(item, () => {
            releaseSrStyles(item);
            if (item.classList.contains('ecom-animation') && !item.classList.contains('ecom-animated')) {
                triggerEntranceUnlessSrHost(item);
            }
            item.querySelectorAll('.ecom-animation:not(.ecom-animated)').forEach(el => {
                triggerEntranceUnlessSrHost(el);
            });
            // This item is now visible — nested grids may start their own stagger.
            initDeferredSrContainers(item);
        });
    };

    // threshold 0: any visible pixel counts. threshold 0.15 breaks tall Grid/Flex
    // items on mobile (itemHeight >> viewport → max ratio < 0.15 → never reveals).
    const SR_IO_OPTIONS = { threshold: 0 };

    // Elements the section-level observer actually owns (its direct SR items:
    // columns / flex blocks / grid items). Only these may receive SR classes.
    // A .ecom-block nested deeper (e.g. inside a nested flex row) is NOT an SR
    // item — giving it .ecom-sr-visible would stack the section animation on top
    // of that block's own Entrance animation.
    const srSectionItems = new WeakSet();

    // Nearest ancestor that the section observer owns as an SR item, or null.
    // Stops at the section itself — never escapes into a parent section.
    const findSrOwnerItem = (node, section) => {
        let cur = node.parentElement;
        while (cur && cur !== section) {
            if (srSectionItems.has(cur)) return cur;
            cur = cur.parentElement;
        }
        return null;
    };

    // Owning SR item of an element-level container, or null when it is free to
    // reveal immediately (no SR section, or no SR item between it and the section).
    const srContainerOwner = (container) => {
        const section = container.closest('[data-ec-sr]');
        if (!section) return null;
        return findSrOwnerItem(container, section);
    };

    // If section-level IO never fires (tall block on small viewport), unhide the
    // SR item that owns this [data-ec-sr-item] when the item is revealed.
    // MUST target the section's own SR item — NOT any .ecom-block ancestor.
    // A nested block (inside a nested flex row) is hidden by .ecom-animation
    // {opacity:0}, not by SR FOUC; marking it .ecom-sr-visible would run the
    // section animation on it AND permanently override its Entrance
    // animation-name (.ecom-sr-visible sets animation-name !important and
    // nothing ever releases it, since only real SR items get released).
    const revealParentSectionBlock = (srItem) => {
        const section = srItem.closest('[data-ec-sr]');
        if (!section) return;
        const owner = findSrOwnerItem(srItem, section);
        if (!owner) return;
        if (owner.classList.contains('ecom-sr-visible') || owner.classList.contains('ecom-sr-done')) return;
        // Only unhide items actually still hidden by SR FOUC (opacity:0).
        if (getComputedStyle(owner).opacity !== '0') return;
        const animType = section.getAttribute('data-ec-sr') || 'fade-up';
        owner.setAttribute('data-sr-anim', animType);
        owner.style.opacity = '';
        owner.classList.add('ecom-sr-visible');
    };

    const initScrollReveal = (root) => {
        root = root || document;

        // Grid inheritance: a grid element (Product Grid, Blog Articles) inside an
        // SR section adopts the section's SR settings (anim type + stagger delay) so
        // its items reveal one-by-one — UNLESS the grid has its own SR
        // (data-ec-sr-items), which always wins. Slider layout is excluded.
        const SR_INHERIT_GRIDS = [
            {
                // Product Grid
                wrapper: '.ecom-collection__product--wrapper-items:not(.ecom-collection-product__layout-slider)',
                item: '.ecom-collection__product-item',
            },
            {
                // Blog Articles (slider wrapper is .ecom-swiper-wrapper — excluded)
                wrapper: '.ecom-shopify__blog--posts:not(.ecom-swiper-wrapper)',
                item: '.ecom-shopify__blog--post',
            },
        ];
        const inheritGridSR = (section, animType, delay) => {
            SR_INHERIT_GRIDS.forEach(({ wrapper, item }) => {
                section.querySelectorAll(wrapper).forEach(grid => {
                    // Own grid SR wins (and prevents re-processing).
                    if (grid.hasAttribute('data-ec-sr-items')) return;
                    // Belongs to a nested SR section? Let that closer section own it.
                    if (grid.closest('[data-ec-sr]') !== section) return;
                    const items = grid.querySelectorAll(':scope > ' + item);
                    if (!items.length) return;
                    grid.setAttribute('data-ec-sr-items', animType);
                    grid.setAttribute('data-ec-sr-delay', String(delay));
                    items.forEach(el => {
                        if (!el.hasAttribute('data-ec-sr-item')) el.setAttribute('data-ec-sr-item', '');
                    });
                });
            });
        };

        // Section / Row level: animate direct columns (Row) or blocks (FlexContainer)
        const sectionEls = root.querySelectorAll('[data-ec-sr]:not([data-sr-init])');

        sectionEls.forEach(section => {
            section.setAttribute('data-sr-init', '1');
            const animType = section.getAttribute('data-ec-sr') || 'fade-up';
            const delay    = parseInt(section.getAttribute('data-ec-sr-delay')) || 100;

            // Propagate section SR to grids (Product Grid, Blog Articles) that have
            // no SR of their own. Runs before the element-level pass below picks up
            // the newly-marked [data-ec-sr-items].
            inheritGridSR(section, animType, delay);

            // Defense for already-exported pages: SR host must not stay hidden by Entrance CSS.
            // Priority SR > Entrance — strip ecom-animation from the same node that has data-ec-sr.
            if (section.classList.contains('ecom-animation')) {
                section.classList.remove('ecom-animation');
                section.style.opacity = '';
                section.removeAttribute('ec-delay');
            }

            const isFlexContainer = section.classList.contains('ec-flex-wp');
            const isGrid          = !!section.querySelector(':scope > .ecom-grid-layout');

            const items = isGrid
                ? section.querySelectorAll(':scope > .ecom-grid-layout > .ecom-grid-item')
                : isFlexContainer
                    // Direct .ecom-block OR nested flex wrappers (.ec-flex-wp.core__block).
                    // Full-width flex has no .ecom-inner — nested flex rows are direct children.
                    ? section.querySelectorAll([
                        ':scope > .ecom-inner > .ecom-block',
                        ':scope > .ecom-inner > .ec-flex-wp.core__block',
                        ':scope > .ecom-block:not(.ecom-section__overlay)',
                        ':scope > .ec-flex-wp.core__block',
                    ].join(', '))
                    : section.querySelectorAll(':scope > .core__row--columns > .ecom-column');

            if (!items.length) {
                return;
            }

            // Single observer for all items: callback receives the whole batch at once,
            // sort by DOM order, then stagger in correct sequence.
            const observer = new IntersectionObserver((entries) => {
                const visible = entries.filter(e => e.isIntersecting).map(e => e.target);
                if (!visible.length) return;
                visible.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
                visible.forEach((item, i) => {
                    observer.unobserve(item);
                    if (item.classList.contains('ecom-sr-visible')) {
                        return;
                    }
                    item.setAttribute('data-sr-anim', animType);
                    const staggerAt = i * delay;
                    setTimeout(() => {
                        item.style.opacity = '';
                        item.classList.add('ecom-sr-visible');
                        triggerEntranceOnSrItem(item);
                    }, staggerAt);
                });
            }, SR_IO_OPTIONS);

            items.forEach(item => {
                // Register before observing: revealParentSectionBlock resolves the
                // owning SR item through this registry.
                srSectionItems.add(item);
                observer.observe(item);
            });
        });

        // Element level: animate individual items (Product Grid, Articles).
        // A container nested inside an SR item must WAIT for that item to reveal —
        // its own IO would otherwise stagger the items while the whole subtree is
        // still opacity:0 (IntersectionObserver ignores opacity), burning the
        // stagger off-screen. Deferred containers are flushed by
        // triggerEntranceOnSrItem once the owning item is released.
        const itemEls = root.querySelectorAll('[data-ec-sr-items]:not([data-sr-init])');

        itemEls.forEach(container => {
            const owner = srContainerOwner(container);
            if (owner && !owner.classList.contains('ecom-sr-done')) {
                // Mark init so a later initScrollReveal pass does not double-handle it.
                container.setAttribute('data-sr-init', '1');
                container.setAttribute('data-sr-deferred', '1');
                armDeferredFallback(container, owner);
                return;
            }
            initSrItemsContainer(container);
        });
    };

    // Wire up element-level SR for one container: stagger its [data-ec-sr-item]s.
    function initSrItemsContainer(container) {
        container.setAttribute('data-sr-init', '1');
        const animType = container.getAttribute('data-ec-sr-items') || 'fade-up';
        const delay    = parseInt(container.getAttribute('data-ec-sr-delay')) || 100;
        const items    = container.querySelectorAll('[data-ec-sr-item]');
        if (!items.length) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter(e => e.isIntersecting).map(e => e.target);
            if (!visible.length) return;
            visible.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
            visible.forEach((item, i) => {
                observer.unobserve(item);
                item.setAttribute('data-sr-anim', animType);
                const staggerAt = i * delay;
                setTimeout(() => {
                    revealParentSectionBlock(item);
                    item.style.opacity = '';
                    item.classList.add('ecom-sr-visible');
                    triggerEntranceOnSrItem(item);
                }, staggerAt);
            });
        }, SR_IO_OPTIONS);

        items.forEach(item => observer.observe(item));
    }

    // Deferring makes revealParentSectionBlock unreachable for owned containers
    // (their items no longer reveal first), so the "section IO never fired" net has
    // to move here — otherwise a deferred container would stay opacity:0 forever.
    // Watch the container itself; once on screen, give the owner a grace period,
    // then push it through the normal reveal path.
    const SR_DEFER_FALLBACK_MS = 1500;

    function armDeferredFallback(container, owner) {
        const io = new IntersectionObserver((entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            io.disconnect();
            setTimeout(() => {
                // Owner revealed normally in the meantime — nothing to do.
                if (!container.hasAttribute('data-sr-deferred')) return;
                if (owner.classList.contains('ecom-sr-visible') || owner.classList.contains('ecom-sr-done')) {
                    // Owner is visible but never released (e.g. reveal came from the
                    // legacy fallback path, which skips triggerEntranceOnSrItem).
                    container.removeAttribute('data-sr-deferred');
                    initSrItemsContainer(container);
                    return;
                }
                const section = owner.closest('[data-ec-sr]');
                owner.setAttribute('data-sr-anim', (section && section.getAttribute('data-ec-sr')) || 'fade-up');
                owner.style.opacity = '';
                owner.classList.add('ecom-sr-visible');
                // Releases the owner and flushes this container via the normal path.
                triggerEntranceOnSrItem(owner);
            }, SR_DEFER_FALLBACK_MS);
        }, SR_IO_OPTIONS);
        io.observe(container);
    }

    // Flush containers that were waiting on this SR item. Re-check ownership: a
    // container under a nested SR section belongs to that section's item, not this one.
    function initDeferredSrContainers(srItem) {
        srItem.querySelectorAll('[data-ec-sr-items][data-sr-deferred]').forEach(container => {
            const owner = srContainerOwner(container);
            if (owner && owner !== srItem && !owner.classList.contains('ecom-sr-done')) return;
            container.removeAttribute('data-sr-deferred');
            initSrItemsContainer(container);
        });
    }

    initScrollReveal();

    document.addEventListener('shopify:section:load', e => {
        const section = JSON.parse(unescape(e.target.dataset.shopifyEditorSection));
        let ecomSection = null;

        if (section.type && section.type.includes('ecom-')) {
            ecomSection = e.target;
        }

        if (!ecomSection) return;

        const scripts = ecomSection.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src) {
                ecomSection.removeChild(script);
                const _script = document.createElement('script');
                _script.src = script.src;
                ecomSection.prepend(_script);
            }
        });

        initScrollReveal(ecomSection);
    });
})();
