# cro-cart-transform-extension

Shopify Function `cart.transform.run` của CRO, viết bằng **Rust**. Nhận các line
mà widget đã gắn `_cro_data` và gộp mỗi bộ thành một line cha bằng `linesMerge`,
kèm phần trăm giảm giá nếu có.

| Loại | Trạng thái |
|------|-----------|
| BXGY (`type: "bxgy"`) | Đã chuyển sang Rust, tương đương bản JS cũ |
| Mix & Match (`type: "mixMatch"`) | Đã chuyển sang Rust, tương đương bản JS cũ |

Bản JS cũ (cả BXGY lẫn Mix & Match) được giữ ở
`share-extensions/extensions/cro-cart-transform-extension-js/` để tham chiếu.

## Vì sao là Rust

Mỗi lần cart đổi, Shopify chạy lại function trên **toàn bộ** line gốc và phải
merge lại mọi bộ; nếu vượt trần 11 triệu lệnh thì mọi operation bị bỏ và mọi bộ
trong cart bị bung ra. Bản JS chạy qua trình thông dịch QuickJS (Javy) nên tốn
lệnh ngay cả với line không thuộc bộ nào. Cùng input, Rust tốn ít hơn khoảng 4–7
lần (đo bằng `function-runner`):

| Cart (line bộ + line thường) | JS | Rust |
|---|---|---|
| 25 + 0 | 6,96M | 1,49M |
| 25 + 1 | 7,03M | 1,51M |
| 25 + 50 | 10,62M | 2,03M |
| 25 + 200 | 21,64M | 3,64M |

## Cấu trúc

```
cro-cart-transform-extension/
├── shopify.extension.toml        # build bằng cargo, export cart_transform_run
├── Cargo.toml
├── schema.graphql                # schema Function API (api_version trong toml)
├── locales/
└── src/
    ├── main.rs                   # typegen schema + query, khai báo module
    ├── cart_transform_run.graphql
    ├── cart_transform_run.rs     # điểm vào: gom line theo (type, bundle) → gọi handler → gom operation
    ├── cro_data.rs               # parse `_cro_data` MỘT lần mỗi line → CroLine::{Bxgy, MixMatch}
    ├── common/
    │   ├── js_value.rs           # đọc giá trị JSON theo kiểu JS: Number(), String(), truthy, Math.round
    │   └── line.rs               # kiểm line gộp được (selling plan, parent, ProductVariant) + bundle multiplier
    ├── bxgy/
    │   ├── mod.rs                # read_line, run
    │   ├── campaign.rs           # index metafield bxgyRules, item theo product, lịch
    │   ├── pricing.rs            # trigger, reward, discount, repeat limit, phần trăm
    │   └── tests.rs              # test hành vi (cargo test)
    └── mix_match/
        ├── mod.rs                # read_line, run: gom line của một instance, per-set quantity, linesMerge
        ├── campaign.rs           # index metafield mixMatchRules, id theo đuôi số, lịch (fail closed), group id
        ├── eligibility.rs        # khách: logged_in / new / tagged, quốc gia — chỉ đọc khi tìm thấy campaign
        ├── membership.rs         # line thuộc group (product/collection/vendor/product_type/tag), quà tặng, Min/Max
        ├── pricing.rs            # 6 cách giảm giá → một phần trăm của subtotal
        └── tests.rs
```

Quy ước:

- Handler được chọn bằng `match` trên `CroLine`, không có trait/registry. Thêm loại
  mới = thêm biến thể vào `CroLine` (`cro_data.rs`) và `Job` (`cart_transform_run.rs`).
- Chỉ đưa vào `common/` những gì **giống hệt** nhau giữa các loại. Quy tắc tính
  tiền để riêng trong từng module, vì BXGY và Mix & Match đang khác nhau (làm
  tròn phần trăm, số lần làm tròn khi đổi tiền tệ, cách đọc id).
- Đọc giá trị metafield và `_cro_data` theo kiểu dễ dãi như JS (`common/js_value.rs`):
  metafield sai kiểu chỉ làm bộ đó không được gộp, không làm hỏng cả lần chạy.
- Phần trăm giảm ghi ra dạng chuỗi `{:.6}` (giống `toFixed(6)`):
  `PriceAdjustmentValue.value` được override sang `String` trong `main.rs`, vì
  `Decimal` của crate in số nhỏ dạng `1e-6`.

## Mix & Match

- Input query cần `buyerIdentity`, `localization`, `product.vendor/productType/hasTags`,
  `inCollections` và metafield `mixMatchRules`; biến `$collectionIds`/`$tags`/`$customerTags`
  lấy từ chính metafield đó qua `[extensions.input.variables]` trong toml.
- Chi phí: mảng `hasTags`/`inCollections` nằm trên **mọi** line và vẫn tốn lệnh
  trong Rust dù code không đọc tới. Với 100 tag + 100 collection, 25 line bộ + 50
  line thường tốn khoảng 22,9M (vượt trần), nên cần hạ trần số tag/collection hoặc
  đổi cách lấy dữ liệu nếu shop dùng nhiều.

## Build, test, đo

Cần Rust và target wasm:

```bash
brew install rustup && rustup default stable && rustup target add wasm32-unknown-unknown
```

```bash
export PATH=/opt/homebrew/opt/rustup/bin:$PATH
```

Test hành vi (chạy native, không cần wasm):

```bash
cargo test
```

Build để deploy luôn đi qua Shopify CLI ở app cha (`shopify app dev`,
`shopify app deploy`, `shopify app function build`). CLI chạy thêm bước
**trampoline** viết lại import `shopify_function_v2` của wasm; file từ
`cargo build` trần **không** chạy được trên `function-runner` hay Shopify.

Đo instruction count với một input JSON:

```bash
shopify app function run --path extensions/cro-cart-transform-extension --input input.json
```

## Sync sang app cha

`npm run sync_ext` copy thư mục này sang app cha, bỏ qua `target/`. App cha cần
ignore `extensions/*/target` trong `.gitignore` của nó. Sync chỉ ghi đè, không xoá
file cũ: lần sync đầu sau khi chuyển sang Rust, xoá tay các file JS cũ trong
`extensions/cro-cart-transform-extension/` của app cha (`src/*.js`, `src/handlers/`,
`src/lib/`, `package.json`, `vite.config.js`, `dist/`, `generated/`).
