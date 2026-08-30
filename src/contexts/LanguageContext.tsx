import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.json';
import ar from '../i18n/ar.json';

type Language = 'en' | 'ar';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, any> = { en, ar };

const arabicDictionary: Record<string, string> = {
  // Navigation
  "home": "الرئيسية",
  "shop": "المتجر",
  "about": "من نحن",
  "contact": "اتصل بنا",
  "admin": "الإدارة",
  "login": "تسجيل الدخول",
  "profile": "الملف الشخصي",
  "track accounts": "تتبع الحسابات",
  "account lookup": "البحث عن حساب",
  "customer lookup": "البحث عن عميل",
  "logout": "تسجيل الخروج",
  "admin panel": "لوحة التحكم",

  // Sections
  "store management": "إدارة المتجر",
  "catalog management": "إدارة الكتالوج",
  "commerce": "التجارة والبيع",
  "customers": "العملاء والدعم",
  "analytics & legal": "التحليلات والمحاسبة",
  "operation console": "لوحة التحكم الرئيسية",

  // Buttons & Actions
  "add to cart": "إضافة للسلة",
  "add to wishlist": "إضافة للمفضلة",
  "quick view": "عرض سريع",
  "view details": "عرض التفاصيل",
  "checkout": "الدفع والطلب",
  "buy now": "شراء الآن",
  "secure checkout": "دفع آمن",
  "search": "بحث",
  "filter": "تصفية",
  "filters": "خيارات التصفية",
  "clear": "مسح",
  "save": "حفظ",
  "save changes": "حفظ التغييرات",
  "edit": "تعديل",
  "delete": "حذف",
  "update": "تحديث",
  "bulk update": "تعديل جماعي",
  "bulk import": "استيراد جماعي",
  "close": "إغلاق",
  "back to shop": "العودة للمتجر",
  "add": "إضافة",
  "cancel": "إلغاء",
  "confirm": "تأكيد",
  "place order": "إرسال الطلب",
  "track order": "تتبع الطلب",

  // Product Fields
  "price": "السعر",
  "category": "الفئة",
  "platform": "المنصة",
  "genre": "النوع",
  "hardware": "أجهزة وملحقات",
  "subcategory": "الفئة الفرعية",
  "stock status": "حالة المخزون",
  "in stock": "✅ متوفر في المخزون",
  "out of stock": "❌ نفد المخزون",
  "available": "متوفر",
  "unavailable": "غير متوفر",
  "version": "النسخة",
  "ps4 primary": "بلايستيشن 4 رئيسي",
  "ps5 primary": "بلايستيشن 5 رئيسي",
  "secondary": "حساب ثانوي",
  "digital logins": "حسابات رقمية",
  "hardware stock": "مخزون الأجهزة",
  "quantity": "الكمية",
  "total": "الإجمالي",
  "subtotal": "المجموع الفرعي",

  // Checkout & Cart
  "order summary": "ملخص الطلب",
  "shopping cart": "سلة التسوق",
  "your cart is empty": "سلة التسوق فارغة",
  "products": "المنتجات",
  "discount": "الخصم",
  "tax": "الضريبة",
  "payment method": "طريقة الدفع",
  "credit card": "بطاقة ائتمان / فيزا",
  "instapay": "إنستاباي",
  "vodafone cash": "فودافون كاش",
  "cash on delivery": "الدفع عند الاستلام",
  "full name": "الاسم الكامل",
  "email": "البريد الإلكتروني",
  "phone number": "رقم الهاتف",
  "billing address": "عنوان الفواتير",
  "payment details": "تفاصيل عملية الدفع",

  // Admin modules
  "dashboard": "لوحة التحليل",
  "site config": "إعدادات الموقع",
  "payment methods": "وسائل الدفع",
  "syseng diagnostics": "تشخيص الأجهزة والنظام",
  "game catalog": "كتالوج الألعاب",
  "categories": "الأقسام والفئات",
  "platforms": "المنصات والأجهزة",
  "genres": "أنواع الألعاب",
  "collections": "المجموعات الحصرية",
  "sales orders": "طلبات المبيعات",
  "homepage sections": "أقسام الصفحة الرئيسية",
  "banner manager": "إدارة الإعلانات",
  "client crm": "إدارة علاقات العملاء",
  "claims / tickets": "الشكاوى والدعم الفني",
  "receipt maker": "منشئ الفواتير",
  "sla contracts": "عقود الضمان والخدمة",
  "erp reports": "تقارير النظام والتحليل",
  "active": "نشط",
  "status": "الحالة",
  "action": "الإجراء",
  "view": "عرض",

  // Search Placeholder & Common
  "search games": "البحث عن الألعاب...",
  "search games...": "البحث عن الألعاب...",
  "translate search...": "البحث في المتجر...",
  "loading...": "جاري التحميل...",
  "error detected": "حدث خطأ غير متوقع",
  "all": "الكل"
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('language') as Language) || 'en'
  );

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let result = translations[language];
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        if (language === 'ar') {
          return arabicDictionary[path] || arabicDictionary[path.toLowerCase()] || path;
        }
        return path;
      }
    }
    return result as string;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
