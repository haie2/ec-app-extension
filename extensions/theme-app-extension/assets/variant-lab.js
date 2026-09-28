const shopRoot = () => (window.Shopify?.routes?.root || "/").replace(/\/$/, "") + "/";

const formatMoney = (cents) => {
    if (window.EComposer?.formatMoney) return window.EComposer.formatMoney(cents);
    return "$" + (Number(cents) / 100).toFixed(2);
};

const escapeAttr = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const priceHtml = (price, compareAt) => {
    const now = `<span class="vlab__now">${formatMoney(price)}</span>`;
    return compareAt && compareAt > price ? `<span class="vlab__was">${formatMoney(compareAt)}</span>${now}` : now;
};

const availHtml = (available) => available === false
    ? `<span class="vlab__avail vlab__avail--out">Sold out</span>`
    : `<span class="vlab__avail vlab__avail--in">In stock</span>`;

const optClass = (state) => `vlab__opt${state === "selected" ? " vlab__opt--on" : state === "unavailable" ? " vlab__opt--off" : ""}`;

const STYLES = `
:host { display:block; }
* { box-sizing:border-box; }
.vlab { max-width:768px; margin:24px auto; border:1px solid #e5e7eb; border-radius:16px; background:#fff;
    box-shadow:0 1px 3px rgba(0,0,0,.08); overflow:hidden;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#111827; }
.vlab__head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; border-bottom:1px solid #f3f4f6; }
.vlab__title { display:flex; align-items:center; gap:8px; font-weight:600; font-size:15px; }
.vlab__count { font-size:12px; font-weight:500; color:#6b7280; background:#f3f4f6; border-radius:999px; padding:4px 10px; }
.vlab__grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:16px; padding:20px; }
.vlab__card { display:flex; flex-direction:column; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff; transition:box-shadow .15s; }
.vlab__card:hover { box-shadow:0 4px 12px rgba(0,0,0,.08); }
.vlab__media { aspect-ratio:1/1; background:#f9fafb; display:flex; align-items:center; justify-content:center; }
.vlab__media img { width:100%; height:100%; object-fit:contain; display:block; }
.vlab__body { display:flex; flex-direction:column; gap:8px; padding:16px; flex:1; }
.vlab__row { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.vlab__name { font-size:14px; font-weight:500; line-height:1.35; }
.vlab__qty { flex-shrink:0; font-size:12px; color:#4b5563; background:#f3f4f6; border-radius:999px; padding:2px 8px; }
.vlab__meta { font-size:12px; color:#9ca3af; }
.vlab__meta--high { color:#d97706; }
.vlab__price { font-size:14px; }
.vlab__was { text-decoration:line-through; color:#9ca3af; margin-right:6px; }
.vlab__now { font-weight:600; color:#111827; }
.vlab__avail { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:500; }
.vlab__avail::before { content:""; width:6px; height:6px; border-radius:999px; background:currentColor; }
.vlab__avail--in { color:#059669; }
.vlab__avail--out { color:#e11d48; }
.vlab__optgroup { margin-top:4px; }
.vlab__optlabel { font-size:12px; font-weight:500; text-transform:uppercase; letter-spacing:.03em; color:#6b7280; margin-bottom:6px; }
.vlab__opts { display:flex; flex-wrap:wrap; gap:6px; }
.vlab__opt { padding:5px 12px; border:1px solid #d1d5db; border-radius:8px; background:#fff; color:#374151; font-size:14px; line-height:1; cursor:pointer; transition:.12s; }
.vlab__opt:hover { border-color:#111827; }
.vlab__opt--on { background:#111827; color:#fff; border-color:#111827; }
.vlab__opt--off { background:#f9fafb; color:#9ca3af; border-color:#e5e7eb; text-decoration:line-through; cursor:default; }
.vlab__single { font-size:12px; font-style:italic; color:#9ca3af; }
.vlab__status { margin-top:auto; padding-top:4px; font-size:12px; color:#9ca3af; }
.vlab__foot { display:flex; flex-direction:column; gap:8px; padding:16px 20px; border-top:1px solid #f3f4f6; background:#f9fafb; }
.vlab__foot-price { font-size:18px; font-weight:600; }
.vlab__foot-label { font-size:12px; text-transform:uppercase; letter-spacing:.03em; color:#9ca3af; }
.vlab__atc { border:0; border-radius:12px; background:#111827; color:#fff; padding:11px 24px; font-size:14px; font-weight:500; cursor:pointer; transition:.15s; }
.vlab__atc:hover:not(:disabled) { background:#000; }
.vlab__atc:disabled { opacity:.4; cursor:not-allowed; }
.vlab__foot-status { padding:0 20px 12px; font-size:12px; color:#9ca3af; }
.vlab__note { margin:12px; padding:12px 16px; border:1px solid #fde68a; background:#fffbeb; border-radius:12px; font-size:14px; color:#92400e; }
.t-green { color:#059669; }
.t-red { color:#e11d48; }
@media (min-width:640px) { .vlab__foot { flex-direction:row; align-items:center; justify-content:space-between; } }
`;

class VariantLab extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) this.attachShadow({ mode: "open" });
        this.blockId = this.getAttribute("data-block-id");
        this.bundle = this._readData("bundle");

        if (!this.bundle) {
            this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="vlab__note">Variant Lab: không có bundle data.</div>`;
            return;
        }
        this._renderBundle();
    }

    _readData(kind) {
        try {
            const el = document.getElementById(`ecom-vlab-${kind}-${this.blockId}`);
            const parsed = el ? JSON.parse(el.textContent) : null;
            return parsed && Object.keys(parsed).length ? parsed : null;
        } catch {
            return null;
        }
    }

    get _sectionId() {
        const section = this.closest('[id^="shopify-section-"]');
        return section ? section.id.slice("shopify-section-".length) : null;
    }

    _axisOptions(comp) {
        return (comp.options || []).filter((option) => option.values.length > 1);
    }

    _initSelection(comp) {
        const selection = {};
        const variantOptions = comp.selectedVariant?.options || [];
        (comp.options || []).forEach((option, index) => {
            const byVariant = option.values.find((value) => value.value === variantOptions[index]);
            const chosen = byVariant
                || option.values.find((value) => value.selected)
                || option.values.find((value) => value.available)
                || option.values[0];
            selection[option.position] = chosen?.id ?? null;
        });
        return selection;
    }

    _renderBundle() {
        this.bundleSel = this.bundle.components.map((comp) => this._initSelection(comp));
        const cards = this.bundle.components.map((comp, index) => this._componentCardHtml(comp, index)).join("");
        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
            <div class="vlab">
                <div class="vlab__head">
                    <span class="vlab__title"><span>📦</span>${escapeAttr(this.bundle.title)}</span>
                    <span class="vlab__count">${this.bundle.components.length} sản phẩm</span>
                </div>
                <div class="vlab__grid">${cards}</div>
                <div class="vlab__foot">
                    <div>
                        <div class="vlab__foot-label">Bundle variant</div>
                        <div data-role="bundle-price" class="vlab__foot-price">—</div>
                        <div data-role="bundle-avail" style="margin-top:2px"></div>
                    </div>
                    <button type="button" data-role="atc" class="vlab__atc" disabled>Add bundle to cart</button>
                </div>
                <div data-role="bundle-status" class="vlab__foot-status"></div>
            </div>`;
        this._wireBundle();
        this._resolveBundle();
    }

    _componentCardHtml(comp, index) {
        const isHigh = comp.variantsCount > 250;
        const pickers = this._axisOptions(comp).map((option) => {
            const buttons = option.values.map((value) => {
                const state = this.bundleSel[index][option.position] === value.id
                    ? "selected"
                    : (value.available ? "available" : "unavailable");
                return `<button type="button" class="${optClass(state)}"
                    data-comp="${index}" data-pos="${option.position}" data-id="${value.id}"
                    data-avail="${value.available ? 1 : 0}">${escapeAttr(value.value)}</button>`;
            }).join("");
            return `<div class="vlab__optgroup">
                <div class="vlab__optlabel">${escapeAttr(option.name)}</div>
                <div class="vlab__opts">${buttons}</div>
            </div>`;
        }).join("");

        const sv = comp.selectedVariant;
        return `<div class="vlab__card" data-comp="${index}" data-handle="${escapeAttr(comp.handle)}" data-vcount="${comp.variantsCount}">
            <div class="vlab__media">
                <img data-role="img" src="${escapeAttr(sv?.image || comp.image || "")}" alt="">
            </div>
            <div class="vlab__body">
                <div class="vlab__row">
                    <span class="vlab__name">${escapeAttr(comp.title)}</span>
                    <span class="vlab__qty">×${comp.quantity}</span>
                </div>
                <div class="vlab__meta${isHigh ? " vlab__meta--high" : ""}">${comp.variantsCount} variants${isHigh ? " · high-variant" : ""}</div>
                <div data-role="price" class="vlab__price">${priceHtml(sv?.price ?? comp.price, sv?.compareAtPrice ?? comp.compareAtPrice)}</div>
                <div data-role="avail">${availHtml(sv?.available ?? comp.available)}</div>
                ${pickers ? `<div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">${pickers}</div>` : `<div class="vlab__single">single variant</div>`}
                <div data-role="status" class="vlab__status"></div>
            </div>
        </div>`;
    }

    _wireBundle() {
        this.shadowRoot.querySelectorAll("button[data-comp][data-pos]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const index = Number(btn.dataset.comp);
                const position = Number(btn.dataset.pos);
                const valueId = Number(btn.dataset.id);
                if (this.bundleSel[index][position] === valueId) return;
                this.bundleSel[index][position] = valueId;

                this.shadowRoot.querySelectorAll(`button[data-comp="${index}"][data-pos="${position}"]`).forEach((sibling) => {
                    const isOn = Number(sibling.dataset.id) === valueId;
                    sibling.className = optClass(isOn ? "selected" : (sibling.dataset.avail === "1" ? "available" : "unavailable"));
                });
                this._resolveComponent(index);
                this._resolveBundle();
            });
        });

        const atc = this.shadowRoot.querySelector('[data-role="atc"]');
        if (atc) atc.addEventListener("click", () => this._addToCart());
    }

    _buildOptionValueIds(comp, index) {
        return (comp.options || []).map((option) =>
            option.values.length > 1 ? this.bundleSel[index][option.position] : option.values[0]?.id);
    }

    _selectedValueNamesFor(comp, index) {
        return (comp.options || []).map((option) => {
            if (option.values.length > 1) {
                const id = this.bundleSel[index][option.position];
                return option.values.find((value) => value.id === id)?.value;
            }
            return option.values[0]?.value;
        });
    }

    async _fetchComponentJs(handle) {
        this._compJs ||= new Map();
        if (this._compJs.has(handle)) return this._compJs.get(handle);
        const request = fetch(`${shopRoot()}products/${encodeURIComponent(handle)}.js`, { headers: { Accept: "application/json" } })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null);
        this._compJs.set(handle, request);
        return request;
    }

    async _resolveComponent(index) {
        const comp = this.bundle.components[index];
        const card = this.shadowRoot.querySelector(`[data-comp="${index}"][data-handle]`);
        if (!card || !this._axisOptions(comp).length) return;

        this._setCardBusy(card, true);
        this._setStatus(card, "resolving…");
        try {
            const variant = comp.variantsCount > 250
                ? await this._resolveViaSectionRender(comp, index)
                : await this._resolveViaJs(comp, index);
            this._updateCard(card, comp, variant);
        } catch (error) {
            this._updateCard(card, comp, null, error.message);
        } finally {
            this._setCardBusy(card, false);
        }
    }

    async _resolveViaJs(comp, index) {
        const data = await this._fetchComponentJs(comp.handle);
        const names = this._selectedValueNamesFor(comp, index);
        const found = (data?.variants || []).find((variant) =>
            names.every((name, i) => name == null || variant.options[i] === name));
        this._setStatus(this.shadowRoot.querySelector(`[data-comp="${index}"][data-handle]`),
            `.js: ${data?.variants?.length ?? 0} variants${found ? "" : " · combo ngoài danh sách"}`);
        return found
            ? { id: found.id, price: found.price, compareAtPrice: found.compare_at_price, available: found.available, image: found.featured_image?.src || null }
            : null;
    }

    async _resolveViaSectionRender(comp, index) {
        const sectionId = this._sectionId;
        if (!sectionId) throw new Error("no shopify-section wrapper");
        const ids = this._buildOptionValueIds(comp, index).filter(Boolean).join(",");
        const url = `${shopRoot()}products/${encodeURIComponent(comp.handle)}?section_id=${encodeURIComponent(sectionId)}&option_values=${encodeURIComponent(ids)}`;
        const html = await fetch(url).then((response) => response.text());
        const doc = new DOMParser().parseFromString(html, "text/html");
        const script = doc.getElementById(`ecom-vlab-current-${this.blockId}`);
        const variant = script ? JSON.parse(script.textContent) : null;
        this._setStatus(this.shadowRoot.querySelector(`[data-comp="${index}"][data-handle]`),
            `option_values (section-render): ${variant ? "variant " + variant.id : "null"}`);
        return variant;
    }

    _updateCard(card, comp, variant, error) {
        const priceEl = card.querySelector('[data-role="price"]');
        const availEl = card.querySelector('[data-role="avail"]');
        const imgEl = card.querySelector('[data-role="img"]');
        if (!variant) {
            if (priceEl) priceEl.innerHTML = priceHtml(comp.price, comp.compareAtPrice);
            if (availEl) availEl.innerHTML = `<span class="t-red" style="font-size:12px">tổ hợp không có variant${error ? " · " + escapeAttr(error) : ""}</span>`;
            return;
        }
        if (priceEl) priceEl.innerHTML = priceHtml(variant.price, variant.compareAtPrice);
        if (availEl) availEl.innerHTML = availHtml(variant.available);
        if (imgEl && variant.image) imgEl.src = variant.image;
    }

    _setCardBusy(card, busy) {
        card.style.opacity = busy ? "0.55" : "";
        card.style.pointerEvents = busy ? "none" : "";
    }

    _setStatus(card, message) {
        const el = card?.querySelector('[data-role="status"]');
        if (el) el.textContent = message;
    }

    _buildBundleOptionValueIds() {
        const chosenByParent = {};
        this.bundle.components.forEach((comp, index) => {
            (comp.options || []).forEach((option) => {
                if (option.values.length > 1 && option.parentName) {
                    const id = this.bundleSel[index][option.position];
                    const value = option.values.find((candidate) => candidate.id === id)?.value;
                    if (value != null) chosenByParent[option.parentName] = value;
                }
            });
        });
        return (this.bundle.bundleOptions || []).map((bundleOption) => {
            const wanted = chosenByParent[bundleOption.name];
            return bundleOption.values.find((value) => value.value === wanted)?.id;
        });
    }

    async _resolveBundle() {
        const atc = this.shadowRoot.querySelector('[data-role="atc"]');
        const priceEl = this.shadowRoot.querySelector('[data-role="bundle-price"]');
        const availEl = this.shadowRoot.querySelector('[data-role="bundle-avail"]');
        const statusEl = this.shadowRoot.querySelector('[data-role="bundle-status"]');
        const setStatus = (message) => { if (statusEl) statusEl.textContent = message; };

        const sectionId = this._sectionId;
        const ids = this._buildBundleOptionValueIds();
        if (!sectionId || ids.some((id) => id == null)) {
            this._bundleVariant = null;
            if (atc) atc.disabled = true;
            setStatus(!sectionId ? "no shopify-section wrapper" : "chưa đủ option để dựng bundle variant");
            return;
        }

        if (atc) atc.disabled = true;
        setStatus("resolving bundle variant…");
        try {
            const url = `${shopRoot()}products/${encodeURIComponent(this.bundle.handle)}?section_id=${encodeURIComponent(sectionId)}&option_values=${encodeURIComponent(ids.join(","))}`;
            const html = await fetch(url).then((response) => response.text());
            const doc = new DOMParser().parseFromString(html, "text/html");
            const script = doc.getElementById(`ecom-vlab-current-${this.blockId}`);
            const variant = script ? JSON.parse(script.textContent) : null;
            this._bundleVariant = variant;

            if (!variant) {
                if (priceEl) priceEl.textContent = "—";
                if (availEl) availEl.innerHTML = `<span class="t-red" style="font-size:12px">tổ hợp không có bundle variant</span>`;
                if (atc) atc.disabled = true;
                setStatus(`option_values=${ids.join(",")} → null`);
                return;
            }
            if (priceEl) priceEl.innerHTML = priceHtml(variant.price, variant.compareAtPrice);
            if (availEl) availEl.innerHTML = availHtml(variant.available);
            if (atc) atc.disabled = variant.available === false;
            setStatus(`bundle variant ${variant.id}${variant.available === false ? " · sold out" : ""}`);
        } catch (error) {
            this._bundleVariant = null;
            if (atc) atc.disabled = true;
            setStatus(`lỗi resolve bundle: ${error.message}`);
        }
    }

    async _addToCart() {
        const variant = this._bundleVariant;
        const statusEl = this.shadowRoot.querySelector('[data-role="bundle-status"]');
        const atc = this.shadowRoot.querySelector('[data-role="atc"]');
        if (!variant?.id || variant.available === false) return;

        if (atc) { atc.disabled = true; atc.textContent = "Adding…"; }
        try {
            const response = await fetch(`${shopRoot()}cart/add.js`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }] }),
            });
            if (!response.ok) throw new Error(`cart/add ${response.status}`);
            document.dispatchEvent(new CustomEvent("cro:cart-mutated"));
            if (statusEl) statusEl.innerHTML = `<span class="t-green">✅ đã thêm bundle vào giỏ (variant ${variant.id})</span>`;
        } catch (error) {
            if (statusEl) statusEl.innerHTML = `<span class="t-red">ATC lỗi: ${escapeAttr(error.message)}</span>`;
        } finally {
            if (atc) { atc.disabled = variant.available === false; atc.textContent = "Add bundle to cart"; }
        }
    }
}

if (!customElements.get("ecom-variant-lab")) customElements.define("ecom-variant-lab", VariantLab);
