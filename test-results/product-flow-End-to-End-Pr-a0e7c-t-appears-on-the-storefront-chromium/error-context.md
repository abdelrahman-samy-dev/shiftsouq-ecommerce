# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product-flow.spec.ts >> End-to-End Product Flow >> Admin can create a product and it appears on the storefront
- Location: tests\e2e\product-flow.spec.ts:13:7

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  locator('form#productForm')
Expected: not visible
Received: visible
Timeout:  30000ms

Call log:
  - Expect "not toBeVisible" with timeout 30000ms
  - waiting for locator('form#productForm')
    34 × locator resolved to <form novalidate="" id="productForm" class="space-y-10 pb-10">…</form>
       - unexpected value "visible"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "ShiftSouq Home" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e5]:
          - img [ref=e6]
          - generic [ref=e12]: ShiftSouq
      - generic [ref=e14]:
        - button "All" [ref=e16] [cursor=pointer]:
          - generic [ref=e17]: All
          - img [ref=e18]
        - combobox "Type product name" [ref=e21]
        - button "Search" [ref=e22]:
          - img [ref=e23]
      - generic [ref=e26]:
        - generic [ref=e27]:
          - button "English" [ref=e29]:
            - img [ref=e30]
            - generic [ref=e33]: English
            - img [ref=e34]
          - button "Toggle Theme" [ref=e36] [cursor=pointer]:
            - img [ref=e38]
        - link "Wishlist (0)" [ref=e44] [cursor=pointer]:
          - /url: /wishlist
          - img [ref=e45]
          - generic [ref=e47]: "0"
        - link "Cart (0)" [ref=e49] [cursor=pointer]:
          - /url: /cart
          - img [ref=e50]
          - generic [ref=e53]: "0"
        - button "AS Abdelrahman Samy" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: AS
          - generic [ref=e58]: Abdelrahman Samy
          - img [ref=e59]
    - navigation "Product categories" [ref=e61]:
      - generic [ref=e62]:
        - link "Men" [ref=e64] [cursor=pointer]:
          - /url: /category/men
          - text: Men
        - link "Sneakers" [ref=e66] [cursor=pointer]:
          - /url: /category/sneakers
          - text: Sneakers
        - link "Accessories" [ref=e68] [cursor=pointer]:
          - /url: /category/accessories
          - text: Accessories
        - link "Tech" [ref=e70] [cursor=pointer]:
          - /url: /category/tech
          - text: Tech
        - link "Beauty" [ref=e72] [cursor=pointer]:
          - /url: /category/beauty
          - text: Beauty
        - link "Home" [ref=e74] [cursor=pointer]:
          - /url: /category/home
          - text: Home
  - main [ref=e75]:
    - generic [ref=e76]:
      - complementary [ref=e77]:
        - generic [ref=e78]:
          - link "S ShiftSouq Admin Dashboard" [ref=e79] [cursor=pointer]:
            - /url: /admin
            - generic [ref=e80]: S
            - generic [ref=e81]:
              - generic [ref=e82]: ShiftSouq
              - generic [ref=e83]: Admin Dashboard
          - button "Collapse" [ref=e84]:
            - img [ref=e85]
        - generic [ref=e87]:
          - generic [ref=e89]: Main Menu
          - link "Dashboard" [ref=e90] [cursor=pointer]:
            - /url: /admin
            - img [ref=e91]
            - generic [ref=e96]: Dashboard
          - link "Orders" [ref=e97] [cursor=pointer]:
            - /url: /admin/orders
            - img [ref=e98]
            - generic [ref=e101]: Orders
          - link "Products" [ref=e102] [cursor=pointer]:
            - /url: /admin/products
            - img [ref=e104]
            - generic [ref=e108]: Products
        - link "Exit Admin" [ref=e110] [cursor=pointer]:
          - /url: /
          - img [ref=e111]
          - generic [ref=e114]: Exit Admin
      - main [ref=e115]:
        - generic [ref=e116]:
          - generic [ref=e118]:
            - link "Dashboard" [ref=e120] [cursor=pointer]:
              - /url: /admin
            - generic [ref=e121]:
              - img [ref=e122]
              - link "Products" [ref=e124] [cursor=pointer]:
                - /url: /admin/products
          - generic [ref=e125]:
            - button "Search... ⌘ K" [ref=e126]:
              - generic [ref=e127]:
                - img [ref=e128]
                - generic [ref=e131]: Search...
              - generic [ref=e132]:
                - generic [ref=e133]: ⌘
                - text: K
            - button "Switch Language" [ref=e136]:
              - img [ref=e137]
            - button "Toggle Theme" [ref=e140]:
              - img [ref=e141]
            - button [ref=e144]:
              - img [ref=e145]
            - generic [ref=e150]:
              - generic [ref=e151]:
                - generic "abdelrahman.samy.creator@gmail.com" [ref=e152]: abdelrahman.samy.creator
                - generic [ref=e153]: Superadmin
              - img [ref=e155]
        - generic [ref=e159]:
          - generic [ref=e160]:
            - generic [ref=e161]:
              - generic [ref=e162]:
                - heading "Products" [level=1] [ref=e163]
                - paragraph [ref=e164]: Manage your store inventory (57 total).
              - generic [ref=e165]:
                - button "All Products" [ref=e167]:
                  - generic [ref=e168]: All Products
                  - img [ref=e169]
                - generic [ref=e171]:
                  - button "Export CSV" [ref=e172]:
                    - img [ref=e173]
                    - text: Export CSV
                  - button "Add Product" [ref=e176]:
                    - img [ref=e177]
                    - generic [ref=e178]: Add Product
            - generic [ref=e180]:
              - img [ref=e181]
              - textbox "Search products by name or SKU..." [ref=e184]
            - generic [ref=e185]:
              - table [ref=e187]:
                - rowgroup [ref=e188]:
                  - row "Product Name Category Price Status Actions" [ref=e189]:
                    - columnheader "Product Name" [ref=e190]
                    - columnheader "Category" [ref=e191]
                    - columnheader "Price" [ref=e192]
                    - columnheader "Status" [ref=e193]
                    - columnheader "Actions" [ref=e194]
                - rowgroup [ref=e195]:
                  - row "Wooden Bathroom Sink With Mirror حوض حمام خشبي مع مرآة Home EGP 39,999.50 EGP 36,479.54 Active" [ref=e196]:
                    - cell "Wooden Bathroom Sink With Mirror حوض حمام خشبي مع مرآة" [ref=e197]:
                      - generic [ref=e198]:
                        - img [ref=e200]
                        - generic [ref=e204]:
                          - generic [ref=e205]: Wooden Bathroom Sink With Mirror
                          - generic [ref=e206]: حوض حمام خشبي مع مرآة
                    - cell "Home" [ref=e207]:
                      - generic [ref=e208]: Home
                    - cell "EGP 39,999.50 EGP 36,479.54" [ref=e209]:
                      - generic [ref=e210]: EGP 39,999.50
                      - generic [ref=e211]: EGP 36,479.54
                    - cell "Active" [ref=e212]:
                      - generic [ref=e214]: Active
                    - cell [ref=e215]:
                      - generic [ref=e216]:
                        - link "Preview" [ref=e217] [cursor=pointer]:
                          - /url: /product/wooden-bathroom-sink-with-mirror-15
                          - img [ref=e218]
                        - button "Edit" [ref=e221]:
                          - img [ref=e222]
                        - button "Delete" [ref=e225]:
                          - img [ref=e226]
                  - row "Knoll Saarinen Executive Conference Chair نول سارينن رئيس المؤتمر التنفيذي Home EGP 24,999.50 Active" [ref=e229]:
                    - cell "Knoll Saarinen Executive Conference Chair نول سارينن رئيس المؤتمر التنفيذي" [ref=e230]:
                      - generic [ref=e231]:
                        - img [ref=e233]
                        - generic [ref=e237]:
                          - generic [ref=e238]: Knoll Saarinen Executive Conference Chair
                          - generic [ref=e239]: نول سارينن رئيس المؤتمر التنفيذي
                    - cell "Home" [ref=e240]:
                      - generic [ref=e241]: Home
                    - cell "EGP 24,999.50" [ref=e242]:
                      - generic [ref=e243]: EGP 24,999.50
                    - cell "Active" [ref=e244]:
                      - generic [ref=e246]: Active
                    - cell [ref=e247]:
                      - generic [ref=e248]:
                        - link "Preview" [ref=e249] [cursor=pointer]:
                          - /url: /product/knoll-saarinen-executive-conference-chair-14
                          - img [ref=e250]
                        - button "Edit" [ref=e253]:
                          - img [ref=e254]
                        - button "Delete" [ref=e257]:
                          - img [ref=e258]
                  - row "Bedside Table African Cherry طاولة بجانب السرير الكرز الأفريقي Home EGP 14,999.50 EGP 12,136.10 Active" [ref=e261]:
                    - cell "Bedside Table African Cherry طاولة بجانب السرير الكرز الأفريقي" [ref=e262]:
                      - generic [ref=e263]:
                        - img [ref=e265]
                        - generic [ref=e269]:
                          - generic [ref=e270]: Bedside Table African Cherry
                          - generic [ref=e271]: طاولة بجانب السرير الكرز الأفريقي
                    - cell "Home" [ref=e272]:
                      - generic [ref=e273]: Home
                    - cell "EGP 14,999.50 EGP 12,136.10" [ref=e274]:
                      - generic [ref=e275]: EGP 14,999.50
                      - generic [ref=e276]: EGP 12,136.10
                    - cell "Active" [ref=e277]:
                      - generic [ref=e279]: Active
                    - cell [ref=e280]:
                      - generic [ref=e281]:
                        - link "Preview" [ref=e282] [cursor=pointer]:
                          - /url: /product/bedside-table-african-cherry-13
                          - img [ref=e283]
                        - button "Edit" [ref=e286]:
                          - img [ref=e287]
                        - button "Delete" [ref=e290]:
                          - img [ref=e291]
                  - row "Annibale Colombo Sofa أريكة أنيبال كولومبو Home EGP 124,999.50 EGP 106,999.57 Active" [ref=e294]:
                    - cell "Annibale Colombo Sofa أريكة أنيبال كولومبو" [ref=e295]:
                      - generic [ref=e296]:
                        - img [ref=e298]
                        - generic [ref=e302]:
                          - generic [ref=e303]: Annibale Colombo Sofa
                          - generic [ref=e304]: أريكة أنيبال كولومبو
                    - cell "Home" [ref=e305]:
                      - generic [ref=e306]: Home
                    - cell "EGP 124,999.50 EGP 106,999.57" [ref=e307]:
                      - generic [ref=e308]: EGP 124,999.50
                      - generic [ref=e309]: EGP 106,999.57
                    - cell "Active" [ref=e310]:
                      - generic [ref=e312]: Active
                    - cell [ref=e313]:
                      - generic [ref=e314]:
                        - link "Preview" [ref=e315] [cursor=pointer]:
                          - /url: /product/annibale-colombo-sofa-12
                          - img [ref=e316]
                        - button "Edit" [ref=e319]:
                          - img [ref=e320]
                        - button "Delete" [ref=e323]:
                          - img [ref=e324]
                  - row "Annibale Colombo Bed سرير أنيبال كولومبو Home EGP 94,999.50 EGP 86,858.04 Active" [ref=e327]:
                    - cell "Annibale Colombo Bed سرير أنيبال كولومبو" [ref=e328]:
                      - generic [ref=e329]:
                        - img [ref=e331]
                        - generic [ref=e335]:
                          - generic [ref=e336]: Annibale Colombo Bed
                          - generic [ref=e337]: سرير أنيبال كولومبو
                    - cell "Home" [ref=e338]:
                      - generic [ref=e339]: Home
                    - cell "EGP 94,999.50 EGP 86,858.04" [ref=e340]:
                      - generic [ref=e341]: EGP 94,999.50
                      - generic [ref=e342]: EGP 86,858.04
                    - cell "Active" [ref=e343]:
                      - generic [ref=e345]: Active
                    - cell [ref=e346]:
                      - generic [ref=e347]:
                        - link "Preview" [ref=e348] [cursor=pointer]:
                          - /url: /product/annibale-colombo-bed-11
                          - img [ref=e349]
                        - button "Edit" [ref=e352]:
                          - img [ref=e353]
                        - button "Delete" [ref=e356]:
                          - img [ref=e357]
                  - row "Table Lamp مصباح الطاولة Home EGP 2,499.50 EGP 2,322.29 Active" [ref=e360]:
                    - cell "Table Lamp مصباح الطاولة" [ref=e361]:
                      - generic [ref=e362]:
                        - img [ref=e364]
                        - generic [ref=e368]:
                          - generic [ref=e369]: Table Lamp
                          - generic [ref=e370]: مصباح الطاولة
                    - cell "Home" [ref=e371]:
                      - generic [ref=e372]: Home
                    - cell "EGP 2,499.50 EGP 2,322.29" [ref=e373]:
                      - generic [ref=e374]: EGP 2,499.50
                      - generic [ref=e375]: EGP 2,322.29
                    - cell "Active" [ref=e376]:
                      - generic [ref=e378]: Active
                    - cell [ref=e379]:
                      - generic [ref=e380]:
                        - link "Preview" [ref=e381] [cursor=pointer]:
                          - /url: /product/table-lamp-47
                          - img [ref=e382]
                        - button "Edit" [ref=e385]:
                          - img [ref=e386]
                        - button "Delete" [ref=e389]:
                          - img [ref=e390]
                  - row "Plant Pot وعاء النبات Home EGP 749.50 EGP 698.23 Active" [ref=e393]:
                    - cell "Plant Pot وعاء النبات" [ref=e394]:
                      - generic [ref=e395]:
                        - img [ref=e397]
                        - generic [ref=e401]:
                          - generic [ref=e402]: Plant Pot
                          - generic [ref=e403]: وعاء النبات
                    - cell "Home" [ref=e404]:
                      - generic [ref=e405]: Home
                    - cell "EGP 749.50 EGP 698.23" [ref=e406]:
                      - generic [ref=e407]: EGP 749.50
                      - generic [ref=e408]: EGP 698.23
                    - cell "Active" [ref=e409]:
                      - generic [ref=e411]: Active
                    - cell [ref=e412]:
                      - generic [ref=e413]:
                        - link "Preview" [ref=e414] [cursor=pointer]:
                          - /url: /product/plant-pot-46
                          - img [ref=e415]
                        - button "Edit" [ref=e418]:
                          - img [ref=e419]
                        - button "Delete" [ref=e422]:
                          - img [ref=e423]
                  - row "House Showpiece Plant مصنع تحفة المنزل Home EGP 1,999.50 EGP 1,850.34 Active" [ref=e426]:
                    - cell "House Showpiece Plant مصنع تحفة المنزل" [ref=e427]:
                      - generic [ref=e428]:
                        - img [ref=e430]
                        - generic [ref=e434]:
                          - generic [ref=e435]: House Showpiece Plant
                          - generic [ref=e436]: مصنع تحفة المنزل
                    - cell "Home" [ref=e437]:
                      - generic [ref=e438]: Home
                    - cell "EGP 1,999.50 EGP 1,850.34" [ref=e439]:
                      - generic [ref=e440]: EGP 1,999.50
                      - generic [ref=e441]: EGP 1,850.34
                    - cell "Active" [ref=e442]:
                      - generic [ref=e444]: Active
                    - cell [ref=e445]:
                      - generic [ref=e446]:
                        - link "Preview" [ref=e447] [cursor=pointer]:
                          - /url: /product/house-showpiece-plant-45
                          - img [ref=e448]
                        - button "Edit" [ref=e451]:
                          - img [ref=e452]
                        - button "Delete" [ref=e455]:
                          - img [ref=e456]
                  - row "Family Tree Photo Frame إطار صورة شجرة العائلة Home EGP 1,499.50 EGP 1,276.52 Active" [ref=e459]:
                    - cell "Family Tree Photo Frame إطار صورة شجرة العائلة" [ref=e460]:
                      - generic [ref=e461]:
                        - img [ref=e463]
                        - generic [ref=e467]:
                          - generic [ref=e468]: Family Tree Photo Frame
                          - generic [ref=e469]: إطار صورة شجرة العائلة
                    - cell "Home" [ref=e470]:
                      - generic [ref=e471]: Home
                    - cell "EGP 1,499.50 EGP 1,276.52" [ref=e472]:
                      - generic [ref=e473]: EGP 1,499.50
                      - generic [ref=e474]: EGP 1,276.52
                    - cell "Active" [ref=e475]:
                      - generic [ref=e477]: Active
                    - cell [ref=e478]:
                      - generic [ref=e479]:
                        - link "Preview" [ref=e480] [cursor=pointer]:
                          - /url: /product/family-tree-photo-frame-44
                          - img [ref=e481]
                        - button "Edit" [ref=e484]:
                          - img [ref=e485]
                        - button "Delete" [ref=e488]:
                          - img [ref=e489]
                  - row "Decoration Swing أرجوحة الديكور Home EGP 2,999.50 EGP 2,687.25 Active" [ref=e492]:
                    - cell "Decoration Swing أرجوحة الديكور" [ref=e493]:
                      - generic [ref=e494]:
                        - img [ref=e496]
                        - generic [ref=e500]:
                          - generic [ref=e501]: Decoration Swing
                          - generic [ref=e502]: أرجوحة الديكور
                    - cell "Home" [ref=e503]:
                      - generic [ref=e504]: Home
                    - cell "EGP 2,999.50 EGP 2,687.25" [ref=e505]:
                      - generic [ref=e506]: EGP 2,999.50
                      - generic [ref=e507]: EGP 2,687.25
                    - cell "Active" [ref=e508]:
                      - generic [ref=e510]: Active
                    - cell [ref=e511]:
                      - generic [ref=e512]:
                        - link "Preview" [ref=e513] [cursor=pointer]:
                          - /url: /product/decoration-swing-43
                          - img [ref=e514]
                        - button "Edit" [ref=e517]:
                          - img [ref=e518]
                        - button "Delete" [ref=e521]:
                          - img [ref=e522]
              - generic [ref=e525]:
                - button [disabled] [ref=e526]:
                  - img [ref=e527]
                - generic [ref=e529]: Page 1 of 6
                - button [ref=e530]:
                  - img [ref=e531]
          - generic [ref=e535]:
            - generic [ref=e536]:
              - generic [ref=e537]:
                - heading "Add Product" [level=2] [ref=e538]
                - paragraph [ref=e539]: Fill in the details to list a new item
              - button [ref=e540]:
                - img [ref=e541]
            - generic [ref=e545]:
              - generic [ref=e546]:
                - generic [ref=e547]:
                  - generic [ref=e548]:
                    - generic [ref=e549]: EN
                    - heading "English Details" [level=3] [ref=e550]
                  - generic [ref=e551]:
                    - generic [ref=e552]: Product Name *
                    - textbox "e.g. Wireless Headphones" [ref=e553]: 88940412 E2E Product
                  - generic [ref=e554]:
                    - generic [ref=e555]: "Manage your store inventory ({count} total)."
                    - textbox "Detailed product description..." [ref=e556]
                - generic [ref=e557]:
                  - generic [ref=e558]:
                    - generic [ref=e559]: AR
                    - heading "التفاصيل بالعربية" [level=3] [ref=e560]
                  - generic [ref=e561]:
                    - generic [ref=e562]: اسم المنتج *
                    - 'textbox "مثال: سماعات لاسلكية" [ref=e563]': 88940412 منتج E2E
                  - generic [ref=e564]:
                    - generic [ref=e565]: الوصف
                    - textbox "وصف تفصيلي للمنتج..." [ref=e566]
              - generic [ref=e567]:
                - generic [ref=e568]:
                  - heading "Pricing" [level=3] [ref=e569]
                  - generic [ref=e570]:
                    - generic [ref=e571]:
                      - generic [ref=e572]: Base Price *
                      - generic [ref=e573]:
                        - generic [ref=e574]: $
                        - spinbutton [ref=e575]: "999.99"
                    - generic [ref=e576]:
                      - generic [ref=e577]: Sale Price
                      - generic [ref=e578]:
                        - generic [ref=e579]: $
                        - spinbutton [ref=e580]
                - generic [ref=e581]:
                  - heading "Organization" [level=3] [ref=e582]
                  - generic [ref=e583]:
                    - generic [ref=e584]: Category *
                    - combobox [ref=e585]:
                      - option "Select a category"
                      - option "Accessories" [selected]
                      - option "Beauty"
                      - option "Collections"
                      - option "E2E Test Category EN"
                      - option "E2E Test Category EN"
                      - option "Home"
                      - option "Kids"
                      - option "Men"
                      - option "Polo"
                      - option "Sneakers"
                      - option "Tech"
                      - option "+ Create New Category"
              - generic [ref=e586]:
                - heading "Images" [level=3] [ref=e587]
                - generic [ref=e589] [cursor=pointer]:
                  - img [ref=e590]
                  - generic [ref=e594]: Drag & drop image URLs here, or click to add manually
                - generic [ref=e595]:
                  - textbox "Enter image URL" [ref=e596]
                  - button "Add URL" [disabled] [ref=e597]
              - generic [ref=e598]:
                - generic [ref=e599]:
                  - generic [ref=e600]:
                    - heading "Options" [level=3] [ref=e601]
                    - paragraph [ref=e602]:
                      - img [ref=e603]
                      - text: Does this product have sizes, colors, or other options?
                  - button "Add Option" [ref=e605]:
                    - img [ref=e606]
                    - text: Add Option
                - generic [ref=e607]:
                  - generic [ref=e608]: Stock Quantity *
                  - spinbutton [active] [ref=e609]: "50"
            - generic [ref=e610]:
              - button "Cancel" [ref=e611]
              - button "Save Product" [ref=e612]:
                - img [ref=e613]
                - text: Save Product
  - contentinfo [ref=e617]:
    - generic [ref=e618]:
      - generic [ref=e619]:
        - generic [ref=e620]:
          - link "ShiftSouq Home" [ref=e621] [cursor=pointer]:
            - /url: /
            - generic [ref=e622]:
              - img [ref=e623]
              - generic [ref=e629]: ShiftSouq
          - paragraph [ref=e630]: Your ultimate destination for premium menswear and luxury accessories. Redefining modern elegance.
        - navigation "Shop links" [ref=e631]:
          - generic [ref=e632]:
            - heading "Shop" [level=4] [ref=e633]
            - list [ref=e634]:
              - listitem [ref=e635]:
                - link "Men" [ref=e636] [cursor=pointer]:
                  - /url: /category/men
              - listitem [ref=e637]:
                - link "Sneakers" [ref=e638] [cursor=pointer]:
                  - /url: /category/sneakers
              - listitem [ref=e639]:
                - link "Accessories" [ref=e640] [cursor=pointer]:
                  - /url: /category/accessories
              - listitem [ref=e641]:
                - link "Tech" [ref=e642] [cursor=pointer]:
                  - /url: /category/tech
              - listitem [ref=e643]:
                - link "Beauty" [ref=e644] [cursor=pointer]:
                  - /url: /category/beauty
              - listitem [ref=e645]:
                - link "Home" [ref=e646] [cursor=pointer]:
                  - /url: /category/home
        - navigation "Customer service links" [ref=e647]:
          - generic [ref=e648]:
            - heading "Customer Service" [level=4] [ref=e649]
            - list [ref=e650]:
              - listitem [ref=e651]:
                - link "Contact Us" [ref=e652] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e653]:
                - link "Shipping" [ref=e654] [cursor=pointer]:
                  - /url: /shipping
              - listitem [ref=e655]:
                - link "Returns" [ref=e656] [cursor=pointer]:
                  - /url: /refund-policy
        - generic [ref=e657]:
          - heading "Social" [level=4] [ref=e658]
          - navigation "Social media links" [ref=e659]:
            - link "Instagram" [ref=e660] [cursor=pointer]:
              - /url: "#"
              - img [ref=e661]
              - generic [ref=e663]: Instagram
            - link "Facebook" [ref=e664] [cursor=pointer]:
              - /url: "#"
              - img [ref=e665]
              - generic [ref=e667]: Facebook
            - link "X (Twitter)" [ref=e668] [cursor=pointer]:
              - /url: "#"
              - img [ref=e669]
              - generic [ref=e671]: X (Twitter)
      - generic [ref=e673]:
        - paragraph [ref=e674]: © 2026 ShiftSouq. All rights reserved.
        - generic [ref=e676]:
          - link "Terms & Conditions" [ref=e677] [cursor=pointer]:
            - /url: /terms
          - link "Privacy policy" [ref=e678] [cursor=pointer]:
            - /url: /privacy-policy
          - link "Refund Policy" [ref=e679] [cursor=pointer]:
            - /url: /refund-policy
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e685] [cursor=pointer]:
    - img [ref=e686]
  - alert [ref=e689]: Products | ShiftSouq Admin | ShiftSouq
```

# Test source

```ts
  7   |   // Generate a unique product name starting with the ID to avoid SKU collisions
  8   |   const uniqueId = Date.now().toString().slice(-8);
  9   |   const testProductNameEN = `${uniqueId} E2E Product`;
  10  |   const testProductNameAR = `${uniqueId} منتج E2E`;
  11  |   const testPrice = '999.99';
  12  | 
  13  |   test('Admin can create a product and it appears on the storefront', async ({ page }) => {
  14  |     // Listen for any alert/confirm dialogs (the ProductModal uses alert() on errors)
  15  |     const dialogMessages: string[] = [];
  16  |     page.on('dialog', async (dialog) => {
  17  |       dialogMessages.push(dialog.message());
  18  |       await dialog.dismiss();
  19  |     });
  20  | 
  21  |     // =========================================================================
  22  |     // 1. ADMIN LOGIN — Navigate to /login?redirect=/admin/products
  23  |     //    This avoids a separate page.goto after login (which was causing
  24  |     //    the server to crash with a segfault under load).
  25  |     // =========================================================================
  26  |     await test.step('Log into Admin Dashboard', async () => {
  27  |       await page.goto('/login?redirect=/admin/products');
  28  | 
  29  |       // Wait for the login form to fully render
  30  |       const emailInput = page.locator('input#login-email');
  31  |       await expect(emailInput).toBeVisible({ timeout: 10000 });
  32  | 
  33  |       // Fill in admin credentials
  34  |       await emailInput.fill('abdelrahman.samy.creator@gmail.com');
  35  |       await page.locator('input#login-password').fill('%%49737722Sa%%');
  36  | 
  37  |       // Submit login form
  38  |       await page.locator('button[type="submit"]').first().click();
  39  | 
  40  |       // loginAction reads ?redirect=/admin/products and redirects there
  41  |       await expect(page).toHaveURL(/\/admin\/products/, { timeout: 15000 });
  42  |     });
  43  | 
  44  |     // =========================================================================
  45  |     // 2. CREATE PRODUCT
  46  |     // =========================================================================
  47  |     await test.step('Create a new product in Admin Dashboard', async () => {
  48  |       // Wait for the products page to load
  49  |       const addProductBtn = page.getByRole('button', { name: /Add Product/i });
  50  |       await expect(addProductBtn).toBeVisible({ timeout: 15000 });
  51  | 
  52  |       // Click "Add Product" to open the slide-over modal
  53  |       await addProductBtn.click();
  54  | 
  55  |       // Wait for the slide-over panel to appear
  56  |       const productForm = page.locator('form#productForm');
  57  |       await expect(productForm).toBeVisible({ timeout: 5000 });
  58  | 
  59  |       // ── Fill English Name ──
  60  |       await page.getByPlaceholder('e.g. Wireless Headphones').fill(testProductNameEN);
  61  | 
  62  |       // ── Fill Arabic Name ──
  63  |       await page.getByPlaceholder('مثال: سماعات لاسلكية').fill(testProductNameAR);
  64  | 
  65  |       // ── Fill Base Price ──
  66  |       await page.getByPlaceholder('0.00').first().fill(testPrice);
  67  | 
  68  |       // ── Select Category ──
  69  |       // Pick the first real category (index 1, skipping the "Select a category" placeholder)
  70  |       const categorySelect = page.locator('form#productForm select').first();
  71  |       await expect(categorySelect).toBeVisible();
  72  |       const firstOption = categorySelect.locator('option').nth(1);
  73  |       const categoryValue = await firstOption.getAttribute('value');
  74  |       if (categoryValue && categoryValue !== '' && categoryValue !== 'ADD_NEW') {
  75  |         await categorySelect.selectOption(categoryValue);
  76  |       } else {
  77  |         // No categories exist — create one inline
  78  |         await categorySelect.selectOption({ value: 'ADD_NEW' });
  79  |         await page.getByPlaceholder('Category Name (EN)').fill('E2E Test Category');
  80  |         await page.getByPlaceholder('اسم الفئة (AR)').fill('فئة اختبار E2E');
  81  |         await page.locator('button').filter({ hasText: /Save Category/i }).click();
  82  |         await expect(page.getByPlaceholder('Category Name (EN)')).not.toBeVisible({ timeout: 10000 });
  83  |       }
  84  | 
  85  |       // ── Fill Stock Quantity ──
  86  |       // When there are no variants, a global stock input appears with placeholder "0".
  87  |       // Use click + clear + type to ensure React's onChange fires properly.
  88  |       const stockInput = productForm.locator('input[type="number"][placeholder="0"]');
  89  |       await expect(stockInput).toBeVisible({ timeout: 5000 });
  90  |       await stockInput.click();
  91  |       await stockInput.fill('50');
  92  | 
  93  |       // ── Save Product ──
  94  |       // The save button uses form="productForm" but is outside the <form>.
  95  |       // Add noValidate to bypass any native validation, then submit.
  96  |       await page.evaluate(() => {
  97  |         const form = document.getElementById('productForm') as HTMLFormElement;
  98  |         if (form) {
  99  |           form.noValidate = true;
  100 |           form.requestSubmit();
  101 |         }
  102 |       });
  103 | 
  104 |       // Wait for the server action to complete.
  105 |       // The modal calls onClose() on success, making the form disappear.
  106 |       // On error, it calls alert(). We capture dialogs above for debugging.
> 107 |       await expect(productForm).not.toBeVisible({ timeout: 30000 });
      |                                     ^ Error: expect(locator).not.toBeVisible() failed
  108 | 
  109 |       // If a dialog appeared, it means the server action failed
  110 |       if (dialogMessages.length > 0) {
  111 |         throw new Error(`Product creation failed with error: ${dialogMessages.join(', ')}`);
  112 |       }
  113 | 
  114 |       // Verify product name appears in the products table
  115 |       await expect(page.getByText(testProductNameEN).first()).toBeVisible({ timeout: 10000 });
  116 |     });
  117 | 
  118 |     // =========================================================================
  119 |     // 3. VERIFY ON STOREFRONT
  120 |     // =========================================================================
  121 |     await test.step('Verify product appears on the public shop page', async () => {
  122 |       await page.goto('/shop');
  123 | 
  124 |       // Wait for the shop grid to load and find the newly created product
  125 |       const newProductCard = page.getByText(testProductNameEN).first();
  126 |       await expect(newProductCard).toBeVisible({ timeout: 15000 });
  127 |     });
  128 |   });
  129 | });
  130 | 
```