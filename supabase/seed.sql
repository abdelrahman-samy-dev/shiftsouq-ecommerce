-- ============================================================
-- ShiftSouq – Seed Data (COMPLETE)
-- Profiles, Stores, Categories, 20 Products, Images, Variants
-- ============================================================

-- ── PROFILES ──────────────────────────────────────────────────
INSERT INTO profiles (id, auth_user_id, full_name, role, phone, country, city) VALUES
  ('11111111-0000-0000-0000-000000000001', NULL, 'Admin ShiftSouq', 'admin', '+966500000001', 'Saudi Arabia', 'Riyadh'),
  ('11111111-0000-0000-0000-000000000002', NULL, 'Ahmed Hassan', 'customer', '+966500000002', 'Saudi Arabia', 'Jeddah'),
  ('11111111-0000-0000-0000-000000000003', NULL, 'Omar Ali', 'customer', '+966500000003', 'Egypt', 'Cairo')
ON CONFLICT (id) DO NOTHING;

-- ── STORES ────────────────────────────────────────────────────
INSERT INTO stores (id, owner_id, name, slug, description_en, description_ar, rating, total_orders, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'ShiftSouq Official', 'shiftsouq-official', 'Premium lifestyle store', 'متجر الأناقة الرسمي', 4.80, 154, true),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Urban Gear', 'urban-gear', 'Streetwear and sneakers', 'ملابس وأحذية شبابية', 4.60, 89, true)
ON CONFLICT (id) DO NOTHING;

-- ── CATEGORIES ────────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name_en, name_ar, slug, description_en, description_ar, sort_order) VALUES
  ('33333333-0000-0000-0000-000000000001', NULL, 'Men', 'رجال', 'men', 'Premium menswear collection', 'مجموعة الأزياء الرجالية', 1),
  ('33333333-0000-0000-0000-000000000002', NULL, 'Kids', 'أطفال', 'kids', 'Kids clothing and essentials', 'ملابس وأساسيات الأطفال', 2),
  ('33333333-0000-0000-0000-000000000003', NULL, 'Sneakers', 'سنيكرز', 'sneakers', 'Exclusive sneaker drops', 'أحدث إصدارات السنيكرز', 3),
  ('33333333-0000-0000-0000-000000000004', NULL, 'Accessories', 'إكسسوارات', 'accessories', 'Watches, wallets, and more', 'ساعات، محافظ، والمزيد', 4),
  ('33333333-0000-0000-0000-000000000005', NULL, 'Collections', 'تشكيلات', 'collections', 'Curated seasonal collections', 'تشكيلات موسمية مختارة', 5),
  ('33333333-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', 'Polo', 'بولو', 'polo', 'Men polo shirts', 'قمصان بولو رجالية', 1)
ON CONFLICT (id) DO NOTHING;

-- ── PRODUCTS (1 to 20) ─────────────────────────────────────────
INSERT INTO products (id, category_id, store_id, name_en, name_ar, slug, description_en, description_ar, base_price, sale_price, brand, is_featured, is_new, is_active) VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 'Classic Navy Polo', 'بولو كحلي كلاسيكي', 'classic-navy-polo', 'Premium cotton pique polo shirt.', 'قميص بولو من القطن الفاخر.', 150.00, 120.00, 'ShiftSouq', true, true, true),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 'Essential White Polo', 'بولو أبيض أساسي', 'essential-white-polo', 'Everyday essential white polo.', 'قميص بولو أبيض أساسي للاستخدام اليومي.', 150.00, NULL, 'ShiftSouq', false, false, true),
  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Linen Summer Shirt', 'قميص كتان صيفي', 'linen-summer-shirt', 'Breathable linen shirt for hot days.', 'قميص كتان مسامي للأيام الحارة.', 180.00, 145.00, 'ShiftSouq', true, true, true),
  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Chino Trousers Beige', 'بنطلون تشينو بيج', 'chino-trousers-beige', 'Comfortable stretch chino trousers.', 'بنطلون تشينو مريح وقابل للتمدد.', 200.00, NULL, 'ShiftSouq', false, false, true),
  ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Kids Denim Jacket', 'جاكيت جينز أطفال', 'kids-denim-jacket', 'Classic washed denim jacket for kids.', 'جاكيت جينز كلاسيكي للأطفال.', 160.00, 130.00, 'KidsCraft', true, false, true),
  ('44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Kids Graphic Tee', 'تيشيرت أطفال مطبوع', 'kids-graphic-tee', 'Soft cotton tee with fun graphic.', 'تيشيرت قطني ناعم بطبعة مرحة.', 60.00, NULL, 'KidsCraft', false, true, true),
  ('44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Urban Runner X', 'أوربان رنر إكس', 'urban-runner-x', 'High performance running sneakers.', 'حذاء رياضي عالي الأداء للركض.', 450.00, 399.00, 'AeroStep', true, true, true),
  ('44444444-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Classic Canvas Low', 'حذاء قماش كلاسيكي', 'classic-canvas-low', 'Timeless low top canvas sneakers.', 'حذاء قماشي كلاسيكي برقبة منخفضة.', 220.00, NULL, 'AeroStep', false, false, true),
  ('44444444-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Leather Wallet Black', 'محفظة جلدية سوداء', 'leather-wallet-black', 'Slim bi-fold leather wallet.', 'محفظة جلدية رفيعة ثنائية الطي.', 120.00, 99.00, 'ShiftSouq', true, false, true),
  ('44444444-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Aviator Sunglasses', 'نظارات شمسية طيار', 'aviator-sunglasses', 'Polarized aviator sunglasses with metal frame.', 'نظارات شمسية بعدسات مستقطبة وإطار معدني.', 350.00, NULL, 'Optima', false, true, true),
  ('44444444-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Formal Oxford Shoes', 'حذاء أكسفورد رسمي', 'formal-oxford-shoes', 'Classic leather oxford shoes for formal occasions.', 'حذاء أكسفورد جلدي كلاسيكي للمناسبات الرسمية.', 350.00, 290.00, 'ShiftSouq', true, false, true),
  ('44444444-0000-0000-0000-000000000012', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Everyday Zip-Up Hoodie', 'هودي بسحاب يومي', 'everyday-zip-up-hoodie', 'Comfortable cotton blend hoodie.', 'هودي مريح بمزيج القطن.', 120.00, NULL, 'ShiftSouq', false, true, true),
  ('44444444-0000-0000-0000-000000000013', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Kids Cotton Shorts', 'شورت قطني أطفال', 'kids-cotton-shorts', 'Lightweight summer shorts for kids.', 'شورت صيفي خفيف الوزن للأطفال.', 75.00, 55.00, 'KidsCraft', true, false, true),
  ('44444444-0000-0000-0000-000000000014', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Kids Slip-on Sneakers', 'سنيكرز سهل الارتداء أطفال', 'kids-slip-on-sneakers', 'Easy to wear slip-on shoes.', 'حذاء سهل الارتداء ومريح.', 90.00, NULL, 'KidsCraft', false, true, true),
  ('44444444-0000-0000-0000-000000000015', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Retro High-Tops', 'حذاء رياضي مرتفع', 'retro-high-tops', 'Vintage inspired high top sneakers.', 'حذاء رياضي مرتفع مستوحى من الطراز القديم.', 280.00, 240.00, 'AeroStep', true, false, true),
  ('44444444-0000-0000-0000-000000000016', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Slip-Resistant Trainers', 'حذاء تدريب مقاوم للانزلاق', 'slip-resistant-trainers', 'Gym trainers with advanced grip.', 'حذاء رياضي للتدريب بقبضة متقدمة.', 310.00, NULL, 'AeroStep', false, true, true),
  ('44444444-0000-0000-0000-000000000017', '33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Summer Resort Shirt', 'قميص صيفي منتجع', 'summer-resort-shirt', 'Short sleeve shirt with tropical print.', 'قميص بأكمام قصيرة وطبعة استوائية.', 190.00, 150.00, 'ShiftSouq', true, true, true),
  ('44444444-0000-0000-0000-000000000018', '33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Winter Puffer Coat', 'معطف شتوي منتفخ', 'winter-puffer-coat', 'Insulated puffer coat for extreme cold.', 'معطف شتوي معزول للبرد الشديد.', 450.00, 390.00, 'ShiftSouq', true, false, true),
  ('44444444-0000-0000-0000-000000000019', '33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Classic Leather Belt', 'حزام جلدي كلاسيكي', 'classic-leather-belt', 'Genuine leather belt with silver buckle.', 'حزام من الجلد الطبيعي بإبزيم فضي.', 85.00, NULL, 'ShiftSouq', false, false, true),
  ('44444444-0000-0000-0000-000000000020', '33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Essential Cargo Pants', 'بنطلون كارغو أساسي', 'essential-cargo-pants', 'Durable cargo pants with multiple pockets.', 'بنطلون كارغو متين بجيوب متعددة.', 210.00, 180.00, 'ShiftSouq', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- ── PRODUCT IMAGES ────────────────────────────────────────────
INSERT INTO product_images (product_id, url, alt_text_en, alt_text_ar, is_primary, sort_order) VALUES
  ('44444444-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80', 'Navy Polo Front', 'بولو كحلي - أمامي', true, 0),
  ('44444444-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80', 'White Polo Front', 'بولو أبيض - أمامي', true, 0),
  ('44444444-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&q=80', 'Linen Shirt Front', 'قميص كتان - أمامي', true, 0),
  ('44444444-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80', 'Chino Trousers', 'بنطلون تشينو', true, 0),
  ('44444444-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600&q=80', 'Denim Jacket', 'جاكيت جينز', true, 0),
  ('44444444-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80', 'Graphic Tee', 'تيشيرت مطبوع', true, 0),
  ('44444444-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', 'Runner X', 'رنر إكس', true, 0),
  ('44444444-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80', 'Canvas Low', 'قماش كلاسيكي', true, 0),
  ('44444444-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80', 'Wallet', 'محفظة', true, 0),
  ('44444444-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80', 'Sunglasses', 'نظارات شمسية', true, 0),
  ('44444444-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1614252339475-531eba835eb1?w=600&q=80', 'Oxford Shoes', 'أكسفورد رسمي', true, 0),
  ('44444444-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', 'Hoodie', 'هودي', true, 0),
  ('44444444-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&q=80', 'Shorts', 'شورت', true, 0),
  ('44444444-0000-0000-0000-000000000014', 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=600&q=80', 'Slip-on Sneakers', 'سنيكرز بدون رباط', true, 0),
  ('44444444-0000-0000-0000-000000000015', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80', 'High-Tops', 'حذاء رياضي مرتفع', true, 0),
  ('44444444-0000-0000-0000-000000000016', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80', 'Trainers', 'حذاء تدريب', true, 0),
  ('44444444-0000-0000-0000-000000000017', 'https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=600&q=80', 'Resort Shirt', 'قميص منتجع', true, 0),
  ('44444444-0000-0000-0000-000000000018', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', 'Puffer Coat', 'معطف منتفخ', true, 0),
  ('44444444-0000-0000-0000-000000000019', 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&q=80', 'Leather Belt', 'حزام جلدي', true, 0),
  ('44444444-0000-0000-0000-000000000020', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80', 'Cargo Pants', 'بنطلون كارغو', true, 0)
ON CONFLICT (id) DO NOTHING;

-- ── PRODUCT VARIANTS ──────────────────────────────────────────
INSERT INTO product_variants (product_id, size, color_en, color_ar, color_hex, sku, stock) VALUES
  ('44444444-0000-0000-0000-000000000001', 'M', 'Navy', 'كحلي', '#000080', 'POL-NVY-M', 25),
  ('44444444-0000-0000-0000-000000000002', 'L', 'White', 'أبيض', '#FFFFFF', 'POL-WHT-L', 30),
  ('44444444-0000-0000-0000-000000000003', 'M', 'Beige', 'بيج', '#F5F5DC', 'SHR-BEI-M', 15),
  ('44444444-0000-0000-0000-000000000004', '32', 'Khaki', 'كاكي', '#C3B091', 'TRN-KHK-32', 20),
  ('44444444-0000-0000-0000-000000000005', '8Y', 'Blue', 'أزرق', '#0000FF', 'KDJ-BLU-8Y', 10),
  ('44444444-0000-0000-0000-000000000006', '6Y', 'Red', 'أحمر', '#FF0000', 'KGT-RED-6Y', 40),
  ('44444444-0000-0000-0000-000000000007', '42', 'Black/Red', 'أسود/أحمر', '#000000', 'URX-BKR-42', 12),
  ('44444444-0000-0000-0000-000000000008', '43', 'White', 'أبيض', '#FFFFFF', 'CCL-WHT-43', 28),
  ('44444444-0000-0000-0000-000000000009', 'OS', 'Black', 'أسود', '#000000', 'LWB-BLK-OS', 50),
  ('44444444-0000-0000-0000-000000000010', 'OS', 'Gold', 'ذهبي', '#FFD700', 'AVS-GLD-OS', 22),
  ('44444444-0000-0000-0000-000000000011', '41', 'Brown', 'بني', '#8B4513', 'FOS-BRN-41', 14),
  ('44444444-0000-0000-0000-000000000012', 'L', 'Grey', 'رمادي', '#808080', 'EZH-GRY-L', 35),
  ('44444444-0000-0000-0000-000000000013', '10Y', 'Navy', 'كحلي', '#000080', 'KCS-NVY-10Y', 18),
  ('44444444-0000-0000-0000-000000000014', '34', 'Black', 'أسود', '#000000', 'KSS-BLK-34', 25),
  ('44444444-0000-0000-0000-000000000015', '44', 'White/Blue', 'أبيض/أزرق', '#FFFFFF', 'RHT-WHB-44', 8),
  ('44444444-0000-0000-0000-000000000016', '42', 'Black', 'أسود', '#000000', 'SRT-BLK-42', 30),
  ('44444444-0000-0000-0000-000000000017', 'M', 'Green', 'أخضر', '#008000', 'SRS-GRN-M', 15),
  ('44444444-0000-0000-0000-000000000018', 'XL', 'Black', 'أسود', '#000000', 'WPC-BLK-XL', 5),
  ('44444444-0000-0000-0000-000000000019', '34', 'Brown', 'بني', '#8B4513', 'CLB-BRN-34', 45),
  ('44444444-0000-0000-0000-000000000020', '32', 'Olive', 'زيتوني', '#808000', 'ECP-OLV-32', 20)
ON CONFLICT (id) DO NOTHING;