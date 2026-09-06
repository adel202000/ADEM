/**
 * Internationalization (i18n) Engine
 * Supports: English ('en'), Arabic ('ar' with RTL), and French ('fr')
 * Persists user preference in localStorage for both Admin and Buyer
 */

(function () {
    const STORAGE_KEY = 'preferred_language';

    const translations = {
        en: {
            // General & Nav
            brandName: 'BRAND',
            navHome: 'Home',
            navShop: 'Shop',
            navAdmin: 'Admin',
            navDashboard: 'Dashboard',
            navAdminActive: 'Admin Active',
            navLock: 'Lock',
            navKey: 'Key',
            allRightsReserved: '© 2026 Brand Clothing Store. All rights reserved.',

            // Home
            heroTitle: 'Minimal. Essential. Quality.',
            heroSubtitle: 'Timeless clothing designed for everyday wear.',
            heroShopBtn: 'Shop Collection',
            heroAdminBtn: 'Admin Portal',
            featuredTitle: 'Featured Collection',
            catTShirts: 'T-Shirts',
            catTShirtsDesc: 'Premium basics & heavyweight tees',
            catHoodies: 'Hoodies',
            catHoodiesDesc: 'Comfort essentials & fleece',
            catBottoms: 'Bottoms',
            catBottomsDesc: 'Versatile joggers & denim',

            // Shop / Products
            collectionBadge: 'Autumn / Winter Minimal Collection',
            collectionTitle: 'Apparel Collection',
            collectionSubtitle: 'Timeless apparel crafted with premium heavyweight cotton and minimalist cuts.',
            announcementBanner: '✨ Free express shipping on orders over $100 • Direct to Home 🏠 or Stop Desk 🏢',
            searchPlaceholder: 'Search apparel by name or style...',
            sortLabel: 'Sort by:',
            sortDefault: 'Featured',
            sortPriceAsc: 'Price: Low to High',
            sortPriceDesc: 'Price: High to Low',
            filterAll: 'All',
            filterShirts: 'T-Shirts',
            filterHoodies: 'Hoodies',
            filterBottoms: 'Bottoms',
            badgeHeavyweight: 'Heavyweight 280 GSM',
            badgeDeliveryOptions: 'Home & Stop Desk',
            quickViewBtn: 'Quick View',
            quickViewTitle: 'Product Details',
            selectSizeLabel: 'Select Size:',
            deliveryNoticeModal: 'Choice of direct Home delivery or Stop Desk agency pickup at checkout.',
            cartLabel: 'Cart:',
            cartItems: 'items',
            cartCheckoutBtn: 'Checkout',
            cartEmpty: 'Your cart is empty',
            addToCart: 'Add to Cart',
            itemAddedSuccess: 'Added to Cart ✓',
            buyNow: 'Buy Now',
            itemAdded: 'Added to cart!',
            alreadyInCart: 'Quantity updated in cart!',
            trackOrderChip: 'Track Package',
            trackOrderTitle: 'Track Your Shipment',
            trackOrderSubtitle: 'Enter your tracking number (e.g. TRK-D1-849204) or Order ID (e.g. ORD-7842)',
            trackOrderPlaceholder: 'Enter tracking code or Order ID',
            trackOrderBtn: 'Track Order',

            // Checkout Modal
            checkoutTitle: 'Complete Your Order',
            checkoutSubtitle: 'Enter your contact details and select your preferred delivery destination.',
            custNameLabel: 'Customer Full Name',
            custNamePlaceholder: 'e.g. John Doe',
            custPhoneLabel: 'Phone Number',
            custPhonePlaceholder: 'e.g. +1 555-0192',
            deliveryOptionLabel: 'Delivery Option (Choose One)',
            optHouse: 'To Home',
            optHouseDesc: 'Direct delivery to your residential home address',
            optDesk: 'To Stop Desk',
            optDeskDesc: 'Direct pickup at Stop Desk agency or desk location',
            detailsHouseLabel: 'Home Address (Street, House/Apt, City) *',
            detailsHousePlaceholder: 'e.g. 742 Evergreen Terrace, Apt 4B, Springfield',
            detailsDeskLabel: 'Stop Desk Details (Agency, Station / Desk No.) *',
            detailsDeskPlaceholder: 'e.g. Stop Desk Downtown Agency, Station #4, Desk 12B',
            orderItemsSummary: 'Order Items:',
            subtotal: 'Subtotal:',
            total: 'Total:',
            placeOrderBtn: 'Place Order',
            processingOrder: 'Processing Order...',
            orderPlacedSuccess: 'Order Placed Successfully!',
            orderPlacedDesc: 'Your order has been recorded and submitted for fulfillment.',
            orderIdLabel: 'Order ID:',
            statusLabel: 'Status:',
            deliveryChoiceLabel: 'Delivery Destination:',
            continueShoppingBtn: 'Continue Shopping',
            goToAdminBtn: 'View in Admin',

            // Statuses (Exact 4)
            status_waiting: 'Waiting for confirmation',
            status_confirmed: 'Confirmed',
            status_delivered: 'Delivered',
            status_cancelled: 'Cancelled',

            // Delivery Options (Exact 2: To Home or To Stop Desk)
            delivery_house: 'To Home',
            delivery_desk: 'To Stop Desk',

            // Admin Authentication
            adminAuthTitle: 'Administrator Sign In',
            adminAuthDesc: 'Administrative access is restricted to store staff. Enter your administrator password to unlock orders and catalog controls.',
            adminPasswordLabel: 'Admin Password',
            adminPasswordPlaceholder: 'Enter administrative password',
            rememberSession: 'Remember session',
            unlockDashboardBtn: 'Unlock Dashboard →',
            defaultHint: 'Default: admin123',
            changePassword: 'Change Admin Password',
            currentPassword: 'Current Password',
            newPassword: 'New Password (min 4 chars)',
            confirmPassword: 'Confirm New Password',
            updatePasswordBtn: 'Update Password →',
            cancelBtn: 'Cancel',

            // Admin Dashboard & Orders
            adminDashTitle: 'Admin Orders & Store Management',
            adminDashDesc: 'View orders, manage delivery statuses between Waiting, Confirmed, Delivered, or Cancelled, and access each category.',
            
            // Required Statistics
            statOrderedMoney: 'Ordered Money',
            statOrderedMoneyDesc: 'Total sales revenue from all orders',
            statTotalOrders: 'Total Orders',
            statTotalOrdersDesc: 'All customer purchases placed',
            statWaiting: 'Waiting for confirmation',
            statWaitingDesc: 'Orders pending review',
            statConfirmed: 'Confirmed',
            statConfirmedDesc: 'Orders verified & in preparation',
            statDelivered: 'Delivered',
            statDeliveredDesc: 'Completed & delivered orders',
            statCancelled: 'Cancelled',
            statCancelledDesc: 'Rejected or cancelled orders',

            // Category Filtering Tabs
            filterCategoryAll: 'All Orders',
            filterCategoryWaiting: 'Waiting for confirmation',
            filterCategoryConfirmed: 'Confirmed',
            filterCategoryDelivered: 'Delivered',
            filterCategoryCancelled: 'Cancelled',

            // Orders Table Headers
            thOrderId: 'Order ID',
            thDate: 'Date & Time',
            thCustomer: 'Customer & Contact',
            thDeliveryOption: 'Delivery Option',
            thDeliveryDetails: 'Delivery Details / Location',
            thItemsTotal: 'Items & Total',
            thStatus: 'Current Status',
            thActions: 'Set Status',

            // Order Action Buttons
            btnSetWaiting: 'Set Waiting',
            btnSetConfirmed: 'Confirm',
            btnSetDelivered: 'Deliver',
            btnSetCancelled: 'Cancel',
            setStatusDropdown: 'Change status...',

            // Table Utilities
            searchPlaceholder: 'Search customer name, phone, or order ID...',
            noOrdersFound: 'No orders found matching this category or filter.',
            toastStatusUpdated: 'Order status updated successfully!',
            toastOrderPlaced: 'Order created successfully!',

            // Product Management
            productMgmtTitle: 'Product Catalog Management',
            addProductName: 'Product Name',
            addProductPrice: 'Price',
            addProductCategory: 'Category (shirts/hoodies/bottoms)',
            addProductImage: 'Image URL',
            addProductBtn: 'Add Product to Store',
            totalProducts: 'Total Products in Store',

            // Cloudflare R2 Gallery Upload
            r2UploadTitle: 'Add Picture from Gallery (Cloudflare R2)',
            r2UploadDesc: 'Select an image from your device gallery. It is securely uploaded to Cloudflare R2 and the public link is auto-pasted.',
            r2PickFromGalleryBtn: 'Choose from Gallery',
            r2DragDropHint: 'or drag & drop photo here',
            r2Uploading: 'Uploading picture to Cloudflare R2...',
            r2UploadSuccess: 'Uploaded to Cloudflare R2! Link automatically pasted.',
            r2UploadSuccessLocal: 'Image stored! Link automatically pasted.',
            r2ChangePicBtn: 'Change Photo',
            r2AutoPastedBadge: 'Auto-pasted R2 Link',
            r2BadgeLabel: 'Cloudflare R2 Storage',
            productPreviewTitle: 'Live Store Preview',
            catalogTitle: 'Store Products Catalog',
            catalogSubtitle: 'Manage active items displayed in your customer storefront.',
            refreshCatalogBtn: '🔄 Refresh Products'
        },

        ar: {
            // General & Nav
            brandName: 'براند',
            navHome: 'الرئيسية',
            navShop: 'المتجر',
            navAdmin: 'الإدارة',
            navDashboard: 'لوحة التحكم',
            navAdminActive: 'المسؤول متصل',
            navLock: 'قفل',
            navKey: 'المفتاح',
            allRightsReserved: '© 2026 متجر براند للملابس. جميع الحقوق محفوظة.',

            // Home
            heroTitle: 'بساطة. أساسيات. جودة عالية.',
            heroSubtitle: 'تشكيلات ملابس أنيقة مصممة للاستخدام اليومي العصري.',
            heroShopBtn: 'تسوق التشكيلة الآن',
            heroAdminBtn: 'بوابة الإدارة',
            featuredTitle: 'المجموعات المميزة',
            catTShirts: 'قمصان تي شيرت',
            catTShirtsDesc: 'قطع أساسية فاخرة وخامات قطنية متينة',
            catHoodies: 'كنزات هودي',
            catHoodiesDesc: 'أساسيات الراحة والصوف الفاخر',
            catBottoms: 'بنطلونات',
            catBottomsDesc: 'بناطيل رياضية وجينز عصري',

            // Shop / Products
            collectionBadge: 'تشكيلة الخريف والشتاء الأساسية الفاخرة',
            collectionTitle: 'تشكيلة الملابس العصرية',
            collectionSubtitle: 'أزياء راقية مصنوعة من أجود أنواع القطن الثقيل بقصات كلاسيكية بسيطة.',
            announcementBanner: '✨ شحن سريع مجاني للطلبات فوق 100$ • توصيل للمنزل 🏠 أو استلام ستوب ديسك 🏢',
            searchPlaceholder: 'ابحث عن قطعة بالاسم أو الموديل...',
            sortLabel: 'الترتيب:',
            sortDefault: 'المميز',
            sortPriceAsc: 'السعر: من الأقل للأعلى',
            sortPriceDesc: 'السعر: من الأعلى للأقل',
            filterAll: 'الكل',
            filterShirts: 'تي شيرت',
            filterHoodies: 'هودي',
            filterBottoms: 'بنطلونات',
            badgeHeavyweight: 'قطن ثقيل 280 غرام/م²',
            badgeDeliveryOptions: 'توصيل منزلي وستوب ديسك',
            quickViewBtn: 'معاينة سريعة',
            quickViewTitle: 'تفاصيل المنتج',
            selectSizeLabel: 'اختر المقاس:',
            deliveryNoticeModal: 'خيارات استلام مرنة: إلى باب منزلك أو من أقرب نقطة ستوب ديسك.',
            cartLabel: 'السلة:',
            cartItems: 'منتجات',
            cartCheckoutBtn: 'إتمام الشراء',
            cartEmpty: 'سلة التسوق فارغة',
            addToCart: 'أضف إلى السلة',
            itemAddedSuccess: 'تمت الإضافة ✓',
            buyNow: 'شراء فوري',
            itemAdded: 'تمت الإضافة إلى السلة!',
            alreadyInCart: 'تم تحديث الكمية في السلة!',
            trackOrderChip: 'تتبع الشحنة',
            trackOrderTitle: 'تتبع شحنتك المباشرة',
            trackOrderSubtitle: 'أدخل كود التتبع (مثل TRK-D1-849204) أو رقم الطلب (مثل ORD-7842)',
            trackOrderPlaceholder: 'أدخل كود التتبع أو رقم الطلب',
            trackOrderBtn: 'تتبع الطلب',

            // Checkout Modal
            checkoutTitle: 'إتمام الطلب',
            checkoutSubtitle: 'أدخل بيانات التواصل واختر خيار التوصيل المناسب لك.',
            custNameLabel: 'الاسم الكامل للعميل',
            custNamePlaceholder: 'مثال: محمد أحمد',
            custPhoneLabel: 'رقم الهاتف',
            custPhonePlaceholder: 'مثال: 0501234567',
            deliveryOptionLabel: 'طريقة التوصيل (اختر واحدة فقط)',
            optHouse: 'إلى المنزل',
            optHouseDesc: 'توصيل مباشر إلى باب عنوانك السكني',
            optDesk: 'إلى ستوب ديسك',
            optDeskDesc: 'استلام مباشر من وكالة أو مكتب ستوب ديسك (Stop Desk)',
            detailsHouseLabel: 'عنوان المنزل (الشارع، رقم المبنى/الشقة، المدينة) *',
            detailsHousePlaceholder: 'مثال: شارع الملك فيصل، بناية الياسمين، شقة 12',
            detailsDeskLabel: 'بيانات وكالة ستوب ديسك (الفرع، رقم المحطة / المكتب) *',
            detailsDeskPlaceholder: 'مثال: وكالة ستوب ديسك المركزية، محطة 4، مكتب 12B',
            orderItemsSummary: 'عناصر الطلب:',
            subtotal: 'المجموع الفرعي:',
            total: 'الإجمالي:',
            placeOrderBtn: 'تأكيد الطلب الآن',
            processingOrder: 'جاري تسجيل الطلب...',
            orderPlacedSuccess: 'تم تسجيل طلبك بنجاح!',
            orderPlacedDesc: 'تم حفظ طلبك بنجاح وإرساله إلى الإدارة للمراجعة.',
            orderIdLabel: 'رقم الطلب:',
            statusLabel: 'حالة الطلب:',
            deliveryChoiceLabel: 'جهة التوصيل:',
            continueShoppingBtn: 'متابعة التسوق',
            goToAdminBtn: 'عرض في لوحة الإدارة',

            // Statuses (Exact 4)
            status_waiting: 'في انتظار التأكيد',
            status_confirmed: 'تم التأكيد',
            status_delivered: 'تم التوصيل',
            status_cancelled: 'ملغى',

            // Delivery Options (Exact 2: To Home or To Stop Desk)
            delivery_house: 'إلى المنزل',
            delivery_desk: 'إلى ستوب ديسك',

            // Admin Authentication
            adminAuthTitle: 'تسجيل دخول المسؤول',
            adminAuthDesc: 'الدخول محمي للمشرفين فقط. يرجى إدخال كلمة المرور الإدارية للوصول إلى إدارة الطلبات والإحصائيات.',
            adminPasswordLabel: 'كلمة مرور المسؤول',
            adminPasswordPlaceholder: 'أدخل كلمة المرور الإدارية',
            rememberSession: 'تذكر الجلسة',
            unlockDashboardBtn: 'فتح لوحة التحكم ←',
            defaultHint: 'الافتراضية: admin123',
            changePassword: 'تغيير كلمة المرور',
            currentPassword: 'كلمة المرور الحالية',
            newPassword: 'كلمة المرور الجديدة (4 أحرف على الأقل)',
            confirmPassword: 'تأكيد كلمة المرور الجديدة',
            updatePasswordBtn: 'تحديث كلمة المرور ←',
            cancelBtn: 'إلغاء',

            // Admin Dashboard & Orders
            adminDashTitle: 'إدارة الطلبات والمتجر',
            adminDashDesc: 'متابعة وتحديث حالات الطلبات بين (في انتظار التأكيد، تم التأكيد، تم التوصيل، ملغى) والوصول السريع لكل فئة.',

            // Required Statistics
            statOrderedMoney: 'إجمالي الأموال المطلوبة',
            statOrderedMoneyDesc: 'مجموع مبالغ جميع الطلبات المسجلة',
            statTotalOrders: 'إجمالي الطلبات',
            statTotalOrdersDesc: 'إجمالي عدد الطلبات المقدمة',
            statWaiting: 'في انتظار التأكيد',
            statWaitingDesc: 'طلبات تحتاج مراجعة وتأكيد',
            statConfirmed: 'تم التأكيد',
            statConfirmedDesc: 'طلبات مؤكدة وجاهزة للتنفيذ',
            statDelivered: 'تم التوصيل',
            statDeliveredDesc: 'طلبات مستلمة ومكتملة بنجاح',
            statCancelled: 'ملغى',
            statCancelledDesc: 'طلبات تم إلغاؤها أو رفضها',

            // Category Filtering Tabs
            filterCategoryAll: 'كل الطلبات',
            filterCategoryWaiting: 'في انتظار التأكيد',
            filterCategoryConfirmed: 'تم التأكيد',
            filterCategoryDelivered: 'تم التوصيل',
            filterCategoryCancelled: 'ملغى',

            // Orders Table Headers
            thOrderId: 'رقم الطلب',
            thDate: 'التاريخ والوقت',
            thCustomer: 'العميل وبيانات الاتصال',
            thDeliveryOption: 'خيار التوصيل',
            thDeliveryDetails: 'عنوان / تفاصيل التوصيل',
            thItemsTotal: 'المنتجات والمبلغ',
            thStatus: 'الحالة الحالية',
            thActions: 'تغيير الحالة',

            // Order Action Buttons
            btnSetWaiting: 'قيد الانتظار',
            btnSetConfirmed: 'تأكيد',
            btnSetDelivered: 'تم التوصيل',
            btnSetCancelled: 'إلغاء',
            setStatusDropdown: 'تغيير الحالة...',

            // Table Utilities
            searchPlaceholder: 'البحث باسم العميل، الهاتف، أو رقم الطلب...',
            noOrdersFound: 'لا توجد طلبات في هذا القسم أو حسب هذا البحث.',
            toastStatusUpdated: 'تم تحديث حالة الطلب بنجاح!',
            toastOrderPlaced: 'تم إنشاء الطلب بنجاح!',

            // Product Management
            productMgmtTitle: 'إدارة كتالوج المنتجات',
            addProductName: 'اسم المنتج',
            addProductPrice: 'السعر',
            addProductCategory: 'الفئة (shirts/hoodies/bottoms)',
            addProductImage: 'رابط الصورة',
            addProductBtn: 'إضافة المنتج للمتجر',
            totalProducts: 'إجمالي المنتجات في المتجر',

            // Cloudflare R2 Gallery Upload
            r2UploadTitle: 'إضافة صورة من المعرض (Cloudflare R2)',
            r2UploadDesc: 'اختر صورة من معرض الصور بجهازك. يتم حفظها في Cloudflare R2 ولصق الرابط تلقائياً.',
            r2PickFromGalleryBtn: 'اختر من المعرض',
            r2DragDropHint: 'أو اسحب وأفلت الصورة هنا',
            r2Uploading: 'جاري رفع الصورة إلى Cloudflare R2...',
            r2UploadSuccess: 'تم الرفع إلى Cloudflare R2 ولصق الرابط تلقائياً!',
            r2UploadSuccessLocal: 'تم حفظ الصورة ولصق الرابط تلقائياً!',
            r2ChangePicBtn: 'تغيير الصورة',
            r2AutoPastedBadge: 'رابط R2 ملصوق تلقائياً',
            r2BadgeLabel: 'تخزين كلاود فلير R2',
            productPreviewTitle: 'معاينة مباشرة في المتجر',
            catalogTitle: 'كتالوج منتجات المتجر',
            catalogSubtitle: 'إدارة المنتجات المعروضة في واجهة المتجر للعملاء.',
            refreshCatalogBtn: '🔄 تحديث المنتجات'
        },

        fr: {
            // General & Nav
            brandName: 'BRAND',
            navHome: 'Accueil',
            navShop: 'Boutique',
            navAdmin: 'Administration',
            navDashboard: 'Tableau de bord',
            navAdminActive: 'Admin Actif',
            navLock: 'Verrouiller',
            navKey: 'Clé',
            allRightsReserved: '© 2026 Brand Clothing Store. Tous droits réservés.',

            // Home
            heroTitle: 'Minimal. Essentiel. Qualité.',
            heroSubtitle: 'Des vêtements intemporels pensés pour le quotidien.',
            heroShopBtn: 'Découvrir la collection',
            heroAdminBtn: 'Portail Admin',
            featuredTitle: 'Collection vedette',
            catTShirts: 'T-Shirts',
            catTShirtsDesc: 'Basiques premium et t-shirts épais',
            catHoodies: 'Sweats à capuche',
            catHoodiesDesc: 'Confort essentiel et polaire douce',
            catBottoms: 'Pantalons',
            catBottomsDesc: 'Joggings et jeans polyvalents',

            // Shop / Products
            collectionBadge: 'Collection Automne / Hiver Minimaliste',
            collectionTitle: 'Collection de vêtements',
            collectionSubtitle: 'Vêtements intemporels confectionnés en coton lourd haut de gamme et coupes épurées.',
            announcementBanner: '✨ Livraison express offerte dès 100$ • À domicile 🏠 ou en Stop Desk 🏢',
            searchPlaceholder: 'Rechercher par nom ou catégorie...',
            sortLabel: 'Trier par :',
            sortDefault: 'En vedette',
            sortPriceAsc: 'Prix : Croissant',
            sortPriceDesc: 'Prix : Décroissant',
            filterAll: 'Tous',
            filterShirts: 'T-Shirts',
            filterHoodies: 'Sweats',
            filterBottoms: 'Pantalons',
            badgeHeavyweight: 'Coton lourd 280 g/m²',
            badgeDeliveryOptions: 'Domicile & Stop Desk',
            quickViewBtn: 'Aperçu rapide',
            quickViewTitle: 'Détails du produit',
            selectSizeLabel: 'Choisir la taille :',
            deliveryNoticeModal: 'Livraison au choix directement à domicile ou en retrait Stop Desk.',
            cartLabel: 'Panier :',
            cartItems: 'articles',
            cartCheckoutBtn: 'Commander',
            cartEmpty: 'Votre panier est vide',
            addToCart: 'Ajouter au panier',
            itemAddedSuccess: 'Ajouté ✓',
            buyNow: 'Acheter maintenant',
            itemAdded: 'Ajouté au panier !',
            alreadyInCart: 'Quantité mise à jour dans le panier !',
            trackOrderChip: 'Suivi de colis',
            trackOrderTitle: 'Suivre votre envoi',
            trackOrderSubtitle: 'Entrez votre numéro de suivi (ex. TRK-D1-849204) ou numéro de commande',
            trackOrderPlaceholder: 'Entrez le code de suivi ou l\'ID',
            trackOrderBtn: 'Suivre le colis',

            // Checkout Modal
            checkoutTitle: 'Finaliser votre commande',
            checkoutSubtitle: 'Indiquez vos coordonnées et choisissez votre lieu de livraison préféré.',
            custNameLabel: 'Nom complet du client',
            custNamePlaceholder: 'ex. Jean Dupont',
            custPhoneLabel: 'Numéro de téléphone',
            custPhonePlaceholder: 'ex. 06 12 34 56 78',
            deliveryOptionLabel: 'Option de livraison (Choisissez-en une)',
            optHouse: 'À domicile',
            optHouseDesc: 'Livraison directe à votre domicile résidentiel',
            optDesk: 'En Stop Desk',
            optDeskDesc: 'Retrait direct en agence ou point relais Stop Desk',
            detailsHouseLabel: 'Adresse du domicile (Rue, Appartement, Ville) *',
            detailsHousePlaceholder: 'ex. 15 Rue de Rivoli, Bât B, Paris',
            detailsDeskLabel: 'Détails agence Stop Desk (Nom Agence, N° Guichet / Station) *',
            detailsDeskPlaceholder: 'ex. Agence Stop Desk Centre-Ville, Station #4, Guichet 2B',
            orderItemsSummary: 'Articles commandés :',
            subtotal: 'Sous-total :',
            total: 'Total :',
            placeOrderBtn: 'Passer la commande',
            processingOrder: 'Traitement en cours...',
            orderPlacedSuccess: 'Commande passée avec succès !',
            orderPlacedDesc: 'Votre commande a bien été enregistrée et transmise pour traitement.',
            orderIdLabel: 'N° de commande :',
            statusLabel: 'Statut :',
            deliveryChoiceLabel: 'Destination de livraison :',
            continueShoppingBtn: 'Continuer vos achats',
            goToAdminBtn: 'Voir dans l\'Administration',

            // Statuses (Exact 4)
            status_waiting: 'En attente de confirmation',
            status_confirmed: 'Confirmé',
            status_delivered: 'Livré',
            status_cancelled: 'Annulé',

            // Delivery Options (Exact 2: To Home or To Stop Desk)
            delivery_house: 'À domicile',
            delivery_desk: 'En Stop Desk',

            // Admin Authentication
            adminAuthTitle: 'Connexion Administrateur',
            adminAuthDesc: 'Accès réservé au personnel gérant la boutique. Saisissez votre mot de passe pour accéder aux commandes et aux statistiques.',
            adminPasswordLabel: 'Mot de passe administrateur',
            adminPasswordPlaceholder: 'Entrez le mot de passe',
            rememberSession: 'Mémoriser la session',
            unlockDashboardBtn: 'Déverrouiller le tableau de bord →',
            defaultHint: 'Par défaut : admin123',
            changePassword: 'Changer le mot de passe',
            currentPassword: 'Mot de passe actuel',
            newPassword: 'Nouveau mot de passe (min 4 car.)',
            confirmPassword: 'Confirmer le mot de passe',
            updatePasswordBtn: 'Mettre à jour le mot de passe →',
            cancelBtn: 'Annuler',

            // Admin Dashboard & Orders
            adminDashTitle: 'Gestion des commandes & Administration',
            adminDashDesc: 'Consultez les commandes, basculez les statuts entre En attente, Confirmé, Livré ou Annulé, et accédez à chaque catégorie.',

            // Required Statistics
            statOrderedMoney: 'Montant commandé',
            statOrderedMoneyDesc: 'Total des ventes de toutes les commandes',
            statTotalOrders: 'Total des commandes',
            statTotalOrdersDesc: 'Toutes les commandes passées',
            statWaiting: 'En attente de confirmation',
            statWaitingDesc: 'Commandes en attente de vérification',
            statConfirmed: 'Confirmé',
            statConfirmedDesc: 'Commandes validées & en préparation',
            statDelivered: 'Livré',
            statDeliveredDesc: 'Commandes livrées avec succès',
            statCancelled: 'Annulé',
            statCancelledDesc: 'Commandes annulées ou rejetées',

            // Category Filtering Tabs
            filterCategoryAll: 'Toutes les commandes',
            filterCategoryWaiting: 'En attente de confirmation',
            filterCategoryConfirmed: 'Confirmé',
            filterCategoryDelivered: 'Livré',
            filterCategoryCancelled: 'Annulé',

            // Orders Table Headers
            thOrderId: 'N° Commande',
            thDate: 'Date & Heure',
            thCustomer: 'Client & Téléphone',
            thDeliveryOption: 'Option de livraison',
            thDeliveryDetails: 'Détails de livraison / Lieu',
            thItemsTotal: 'Articles & Total',
            thStatus: 'Statut actuel',
            thActions: 'Modifier le statut',

            // Order Action Buttons
            btnSetWaiting: 'En attente',
            btnSetConfirmed: 'Confirmer',
            btnSetDelivered: 'Livrer',
            btnSetCancelled: 'Annuler',
            setStatusDropdown: 'Changer le statut...',

            // Table Utilities
            searchPlaceholder: 'Rechercher par client, tél. ou n° commande...',
            noOrdersFound: 'Aucune commande trouvée dans cette catégorie.',
            toastStatusUpdated: 'Statut de la commande mis à jour !',
            toastOrderPlaced: 'Commande créée avec succès !',

            // Product Management
            productMgmtTitle: 'Gestion du catalogue produits',
            addProductName: 'Nom du produit',
            addProductPrice: 'Prix',
            addProductCategory: 'Catégorie (shirts/hoodies/bottoms)',
            addProductImage: 'URL de l\'image',
            addProductBtn: 'Ajouter le produit au magasin',
            totalProducts: 'Total des produits',

            // Cloudflare R2 Gallery Upload
            r2UploadTitle: 'Ajouter une photo depuis la galerie (Cloudflare R2)',
            r2UploadDesc: 'Sélectionnez une photo depuis votre galerie. Elle est enregistrée sur Cloudflare R2 et le lien est collé automatiquement.',
            r2PickFromGalleryBtn: 'Choisir depuis la galerie',
            r2DragDropHint: 'ou glissez-déposez la photo ici',
            r2Uploading: 'Téléversement vers Cloudflare R2 en cours...',
            r2UploadSuccess: 'Photo enregistrée sur Cloudflare R2 ! Lien collé automatiquement.',
            r2UploadSuccessLocal: 'Photo enregistrée ! Lien collé automatiquement.',
            r2ChangePicBtn: 'Changer la photo',
            r2AutoPastedBadge: 'Lien R2 collé automatiquement',
            r2BadgeLabel: 'Stockage Cloudflare R2',
            productPreviewTitle: 'Aperçu en direct',
            catalogTitle: 'Catalogue des produits de la boutique',
            catalogSubtitle: 'Gérez les articles actifs affichés dans votre vitrine client.',
            refreshCatalogBtn: '🔄 Actualiser les produits'
        }
    };

    const productCatalogI18n = {
        'Classic White T-Shirt': {
            en: { name: 'Classic White T-Shirt', category: 'T-Shirts', desc: 'Crafted from 100% heavyweight 280 GSM combed cotton with a relaxed modern drape.' },
            ar: { name: 'تي شيرت أبيض كلاسيكي', category: 'تي شيرت', desc: 'مصنوع من قطن ممشط فاخر 100% بوزن 280 غرام/م² وبقصة عصرية مريحة.' },
            fr: { name: 'T-shirt blanc classique', category: 'T-Shirts', desc: 'Confectionné en pur coton peigné 280 g/m² avec un tombé contemporain décontracté.' }
        },
        'Black Hoodie': {
            en: { name: 'Black Minimalist Hoodie', category: 'Hoodies', desc: 'Ultra-dense French terry fleece featuring double-lined hood and concealed flatlock seams.' },
            ar: { name: 'هودي أسود فاخر', category: 'هودي وكنزات', desc: 'صوف فرنسي فائق النعومة والكثافة مع قلنسوة مبطنة وخياطة مخفية راقية.' },
            fr: { name: 'Sweat à capuche noir épuré', category: 'Sweats', desc: 'Molleton éponge ultra dense avec capuche doublée et finitions minimalistes soignées.' }
        },
        'Gray Joggers': {
            en: { name: 'Gray Structured Joggers', category: 'Bottoms', desc: 'Tapered athletic silhouette engineered with secure zip pockets and heavy ribbed cuffs.' },
            ar: { name: 'بنطال رياضي رمادي', category: 'بنطلونات', desc: 'قصة رياضية محكمة تجمع بين خفة الحركة وجيوب سرية بسحاب وأساور متينة.' },
            fr: { name: 'Pantalon de jogging gris', category: 'Pantalons', desc: 'Coupe fuselée élégante intégrant des poches zippées discrètes et bords-côtes renforcés.' }
        },
        'Navy Minimalist Tee': {
            en: { name: 'Navy Minimalist Tee', category: 'T-Shirts', desc: 'Deep indigo dye on premium organic jersey. Designed with clean blind stitched hems.' },
            ar: { name: 'تي شيرت كحلي بسيط', category: 'تي شيرت', desc: 'صبغة نيلية فاخرة تدوم طويلاً على قماش جيرسي قطني عضوي عالي الجودة.' },
            fr: { name: 'T-shirt bleu marine épuré', category: 'T-Shirts', desc: 'Teinte indigo profonde sur jersey biologique doux avec ourlets invisibles.' }
        },
        'Cream Heavyweight Hoodie': {
            en: { name: 'Cream Heavyweight Hoodie', category: 'Hoodies', desc: 'Natural undyed off-white heavyweight fleece providing structural warmth and premium softness.' },
            ar: { name: 'هودي ثقيل بلون كريمي', category: 'هودي وكنزات', desc: 'صوف ثقيل بلون كريمي طبيعي فاخر يمنحك دفئاً مثالياً ومظهراً متناسقاً.' },
            fr: { name: 'Sweat à capuche épais crème', category: 'Sweats', desc: 'Molleton lourd naturel écru non teinté assurant une tenue exemplaire et une grande douceur.' }
        },
        'Relaxed Fit Denim Jeans': {
            en: { name: 'Relaxed Fit Denim Jeans', category: 'Bottoms', desc: '13.5oz authentic selvedge cotton denim with relaxed straight leg proportions.' },
            ar: { name: 'بنطال جينز بقصة مريحة', category: 'بنطلونات', desc: 'دنيم سيلفدج قطني أصلي بوزن 13.5 أونصة بقصة مستقيمة ومريحة للاستخدام اليومي.' },
            fr: { name: 'Jean denim coupe décontractée', category: 'Pantalons', desc: 'Denim lisière véritable 13,5 oz avec une jambe droite intemporelle très confortable.' }
        },
        'Olive Oversized Crewneck': {
            en: { name: 'Olive Oversized Crewneck', category: 'T-Shirts', desc: 'Muted olive pigment on dense brushed loopback cotton with dropped shoulders.' },
            ar: { name: 'سويت شيرت زيتي فضفاض', category: 'تي شيرت', desc: 'لون زيتي أنيق مع أكتاف منسدلة وقطن معالج ناعم الملمس وفاخر المظهر.' },
            fr: { name: 'Sweat col rond olive ample', category: 'T-Shirts', desc: 'Pigment olive minéral sur molleton bouclé doux avec emmanchures basses modernes.' }
        },
        'Washed Black Cargo Pants': {
            en: { name: 'Washed Black Cargo Pants', category: 'Bottoms', desc: 'Military-grade ripstop cotton with articulated knee darts and adjustable hem drawstrings.' },
            ar: { name: 'بنطال كارجو أسود مغسول', category: 'بنطلونات', desc: 'نسيج ريبستوب مقاوم للتمزق مع جيوب شحن هندسية وأربطة مرنة عند الكاحل.' },
            fr: { name: 'Pantalon cargo noir délavé', category: 'Pantalons', desc: 'Toile ripstop haute résistance avec poches cargo ergonomiques et cordons aux chevilles.' }
        }
    };

    const I18N = {
        languages: [
            { code: 'en', label: 'English', flag: 'EN', dir: 'ltr' },
            { code: 'ar', label: 'العربية', flag: 'AR', dir: 'rtl' },
            { code: 'fr', label: 'Français', flag: 'FR', dir: 'ltr' }
        ],

        getLanguage: function () {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && (saved === 'en' || saved === 'ar' || saved === 'fr')) {
                return saved;
            }
            // Auto detect or default to 'en'
            const navLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
            if (navLang === 'ar') return 'ar';
            if (navLang === 'fr') return 'fr';
            return 'en';
        },

        setLanguage: function (lang) {
            if (!translations[lang]) lang = 'en';
            localStorage.setItem(STORAGE_KEY, lang);
            
            // Set Document dir and lang
            document.documentElement.lang = lang;
            document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

            // Visual feedback animation on language switchers
            document.querySelectorAll('.lang-switcher').forEach(sw => {
                sw.classList.add('lang-animating');
                setTimeout(() => sw.classList.remove('lang-animating'), 400);
            });

            // Apply all translation attributes
            this.translateDOM();

            // Notify listeners
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        },

        t: function (key, fallback = '') {
            const current = this.getLanguage();
            if (translations[current] && translations[current][key] !== undefined) {
                return translations[current][key];
            }
            if (translations.en && translations.en[key] !== undefined) {
                return translations.en[key];
            }
            return fallback || key;
        },

        translateStatus: function (status) {
            const map = {
                waiting: 'status_waiting',
                confirmed: 'status_confirmed',
                delivered: 'status_delivered',
                cancelled: 'status_cancelled'
            };
            const key = map[status] || 'status_waiting';
            return this.t(key);
        },

        translateDeliveryOption: function (option) {
            if (option === 'desk') return this.t('delivery_desk');
            return this.t('delivery_house');
        },

        getProductName: function (origName) {
            const lang = this.getLanguage();
            if (productCatalogI18n[origName] && productCatalogI18n[origName][lang]) {
                return productCatalogI18n[origName][lang].name;
            }
            return origName;
        },

        getProductCategory: function (origName, defaultCat = '') {
            const lang = this.getLanguage();
            if (productCatalogI18n[origName] && productCatalogI18n[origName][lang]) {
                return productCatalogI18n[origName][lang].category;
            }
            const catKey = 'filter' + (defaultCat.charAt(0).toUpperCase() + defaultCat.slice(1));
            return this.t(catKey, defaultCat);
        },

        getProductDesc: function (origName) {
            const lang = this.getLanguage();
            if (productCatalogI18n[origName] && productCatalogI18n[origName][lang]) {
                return productCatalogI18n[origName][lang].desc;
            }
            return '';
        },

        formatPrice: function (amount) {
            const lang = this.getLanguage();
            const val = Number(amount || 0).toFixed(2);
            if (lang === 'ar') return `${val} $`;
            return `$${val}`;
        },

        translateDOM: function () {
            // Translate text content
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    const text = this.t(key);
                    if (text) el.textContent = text;
                }
            });

            // Translate placeholder attributes
            const placeholderEls = document.querySelectorAll('[data-i18n-placeholder]');
            placeholderEls.forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (key) {
                    const text = this.t(key);
                    if (text) el.placeholder = text;
                }
            });

            // Update language switcher active states and aria attributes
            const current = this.getLanguage();
            document.querySelectorAll('.lang-btn').forEach(btn => {
                const lang = btn.getAttribute('data-lang');
                if (lang === current) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                }
            });
        },

        renderLanguageSwitcher: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const current = this.getLanguage();
            container.innerHTML = `
                <div class="lang-switcher" role="group" aria-label="Language selection">
                    <button type="button" class="lang-btn ${current === 'en' ? 'active' : ''}" data-lang="en" onclick="window.I18N.setLanguage('en')" title="English" aria-pressed="${current === 'en'}">
                        <span class="lang-flag" aria-hidden="true">🇺🇸</span>
                        <span class="lang-label">EN</span>
                    </button>
                    <button type="button" class="lang-btn ${current === 'ar' ? 'active' : ''}" data-lang="ar" onclick="window.I18N.setLanguage('ar')" title="العربية" aria-pressed="${current === 'ar'}">
                        <span class="lang-flag" aria-hidden="true">🇸🇦</span>
                        <span class="lang-label">عربي</span>
                    </button>
                    <button type="button" class="lang-btn ${current === 'fr' ? 'active' : ''}" data-lang="fr" onclick="window.I18N.setLanguage('fr')" title="Français" aria-pressed="${current === 'fr'}">
                        <span class="lang-flag" aria-hidden="true">🇫🇷</span>
                        <span class="lang-label">FR</span>
                    </button>
                </div>
            `;
        },

        init: function () {
            const current = this.getLanguage();
            document.documentElement.lang = current;
            document.documentElement.dir = (current === 'ar') ? 'rtl' : 'ltr';

            // Auto-render any placeholder containers
            this.renderLanguageSwitcher('headerLangSwitcherContainer');
            this.renderLanguageSwitcher('dashLangSwitcherContainer');
            this.renderLanguageSwitcher('shopLangSwitcherContainer');

            this.translateDOM();
        }
    };

    window.I18N = I18N;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => I18N.init());
    } else {
        I18N.init();
    }
})();
