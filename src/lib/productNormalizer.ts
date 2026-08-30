import { Product } from '../types';

export interface PlayStationGenerationConfig {
  enabled: boolean;
  primary: {
    enabled: boolean;
    price: number;
    stock: number;
  };
  secondary: {
    enabled: boolean;
    price: number;
    stock: number;
  };
}

export interface GamePlayStationConfig {
  enabled: boolean;
  ps5: PlayStationGenerationConfig;
  ps4: PlayStationGenerationConfig;
}

export interface GamePCEdition {
  id: string;
  name: string;
  price: number;
  stock: number;
  region?: string;
  type?: string; // 'Standard' | 'Deluxe' | 'Steam Key' | 'Epic Key' | 'Account'
}

export interface GamePCConfig {
  enabled: boolean;
  editions: GamePCEdition[];
}

export interface GameXboxEdition {
  id: string;
  name: string;
  price: number;
  stock: number;
  generation?: string; // 'Xbox Series X/S' | 'Xbox One' | 'All Xbox'
  type?: string;
}

export interface GameXboxConfig {
  enabled: boolean;
  editions: GameXboxEdition[];
}

export interface GamePlatformsConfig {
  playstation?: GamePlayStationConfig;
  pc?: GamePCConfig;
  xbox?: GameXboxConfig;
}

export interface DenominationPackage {
  id: string;
  name: string;
  amount?: string;
  price: number;
  stock: number;
  bonus?: string;
  region?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  stock: number;
  region?: string;
}

export interface HardwareConfig {
  condition?: 'New' | 'Open Box' | 'Refurbished';
  warranty?: string;
  specs?: string;
  stock: number;
  price: number;
}

export interface NormalizedProductStructure {
  categoryType: 'Game' | 'Top Up' | 'Gift Cards' | 'Subscription' | 'Hardware';
  gameConfig: {
    playstation: GamePlayStationConfig;
    pc: GamePCConfig;
    xbox: GameXboxConfig;
  };
  topUpPackages: DenominationPackage[];
  subscriptionPlans: SubscriptionPlan[];
  hardwareConfig: HardwareConfig;
  activePlatforms: Array<'PlayStation' | 'PC' | 'Xbox'>;
}

/**
 * Normalizes any product document (legacy or new format) into a unified structure.
 * This guarantees 100% backwards-compatibility without modifying existing database items.
 */
export function normalizeProductConfig(product: any): NormalizedProductStructure {
  if (!product) {
    return {
      categoryType: 'Game',
      gameConfig: {
        playstation: {
          enabled: true,
          ps5: { enabled: true, primary: { enabled: true, price: 0, stock: 0 }, secondary: { enabled: true, price: 0, stock: 0 } },
          ps4: { enabled: true, primary: { enabled: true, price: 0, stock: 0 }, secondary: { enabled: true, price: 0, stock: 0 } }
        },
        pc: { enabled: false, editions: [] },
        xbox: { enabled: false, editions: [] }
      },
      topUpPackages: [],
      subscriptionPlans: [],
      hardwareConfig: { stock: 0, price: 0 },
      activePlatforms: ['PlayStation']
    };
  }

  const rawCat = (product.category || '').trim();
  let categoryType: 'Game' | 'Top Up' | 'Gift Cards' | 'Subscription' | 'Hardware' = 'Game';

  if (rawCat === 'Hardware') {
    categoryType = 'Hardware';
  } else if (rawCat === 'Top Up') {
    categoryType = 'Top Up';
  } else if (rawCat === 'Gift Cards') {
    categoryType = 'Gift Cards';
  } else if (rawCat === 'Subscriptions' || rawCat === 'Subscription') {
    categoryType = 'Subscription';
  } else {
    categoryType = 'Game';
  }

  // 1. Hardware Config
  const hardwareConfig: HardwareConfig = {
    condition: product.hardwareConfig?.condition || 'New',
    warranty: product.hardwareConfig?.warranty || '1 Year Official Agency Warranty',
    specs: product.hardwareConfig?.specs || product.subcategory || '',
    stock: typeof product.hardwareConfig?.stock === 'number' 
      ? product.hardwareConfig.stock 
      : (product.ps4PrimaryStock ?? (product.stockStatus === 'Out of Stock' ? 0 : 10)),
    price: typeof product.hardwareConfig?.price === 'number' ? product.hardwareConfig.price : (product.price || 0)
  };

  // 2. Top-Up & Gift Card Denomination Packages
  let topUpPackages: DenominationPackage[] = [];
  if (Array.isArray(product.topUpPackages) && product.topUpPackages.length > 0) {
    topUpPackages = product.topUpPackages.map((p: any, idx: number) => ({
      id: p.id || `pkg_${idx}`,
      name: p.name || `${p.amount || 'Package'}`,
      amount: p.amount || '',
      price: Number(p.price) || 0,
      stock: typeof p.stock === 'number' ? p.stock : 999,
      bonus: p.bonus || '',
      region: p.region || product.region || 'Global'
    }));
  } else if (categoryType === 'Top Up' || categoryType === 'Gift Cards') {
    topUpPackages = [
      { id: 'pkg_1', name: product.name || 'Standard Package', price: product.price || 250, stock: 999, region: product.region || 'Global' }
    ];
  }

  // 3. Subscriptions
  let subscriptionPlans: SubscriptionPlan[] = [];
  if (Array.isArray(product.subscriptionPlans) && product.subscriptionPlans.length > 0) {
    subscriptionPlans = product.subscriptionPlans.map((s: any, idx: number) => ({
      id: s.id || `sub_${idx}`,
      name: s.name || 'Subscription Plan',
      duration: s.duration || '12 Months',
      price: Number(s.price) || 0,
      stock: typeof s.stock === 'number' ? s.stock : 10,
      region: s.region || 'Global'
    }));
  } else if (categoryType === 'Subscription') {
    subscriptionPlans = [
      { id: 'sub_12m', name: `${product.name || 'Subscription'} - 12 Months`, duration: '12 Months', price: product.price || 1200, stock: 10 },
      { id: 'sub_3m', name: `${product.name || 'Subscription'} - 3 Months`, duration: '3 Months', price: Math.round((product.price || 1200) * 0.4), stock: 10 },
      { id: 'sub_1m', name: `${product.name || 'Subscription'} - 1 Month`, duration: '1 Month', price: Math.round((product.price || 1200) * 0.18), stock: 10 }
    ];
  }

  // 4. Game Platforms Config
  // Check if modern structured platformsConfig exists
  const rawPlatforms = product.platformsConfig || product.gamePlatforms;

  const defaultPS5PrimaryPrice = Number(product.pricePS5Primary) || Number(product.price) || 0;
  const defaultPS4PrimaryPrice = Number(product.pricePS4Primary) || Number(product.price) || 0;
  const defaultSecondaryPrice = Number(product.priceSecondary) || (product.price ? Math.round(product.price * 0.75) : 0);

  const defaultPS5PrimaryStock = product.ps5PrimaryStock !== undefined ? Number(product.ps5PrimaryStock) : (product.stockStatus === 'Out of Stock' ? 0 : 5);
  const defaultPS4PrimaryStock = product.ps4PrimaryStock !== undefined ? Number(product.ps4PrimaryStock) : (product.stockStatus === 'Out of Stock' ? 0 : 5);
  const defaultSecondaryStock = product.secondaryStock !== undefined ? Number(product.secondaryStock) : (product.stockStatus === 'Out of Stock' ? 0 : 5);

  let playstation: GamePlayStationConfig;
  let pc: GamePCConfig;
  let xbox: GameXboxConfig;

  if (rawPlatforms) {
    // Read from structured configuration
    const rawPS = rawPlatforms.playstation;
    if (rawPS) {
      playstation = {
        enabled: rawPS.enabled !== false,
        ps5: {
          enabled: rawPS.ps5?.enabled !== false,
          primary: {
            enabled: rawPS.ps5?.primary?.enabled !== false,
            price: Number(rawPS.ps5?.primary?.price ?? defaultPS5PrimaryPrice),
            stock: Number(rawPS.ps5?.primary?.stock ?? defaultPS5PrimaryStock)
          },
          secondary: {
            enabled: rawPS.ps5?.secondary?.enabled !== false,
            price: Number(rawPS.ps5?.secondary?.price ?? defaultSecondaryPrice),
            stock: Number(rawPS.ps5?.secondary?.stock ?? defaultSecondaryStock)
          }
        },
        ps4: {
          enabled: rawPS.ps4?.enabled !== false,
          primary: {
            enabled: rawPS.ps4?.primary?.enabled !== false,
            price: Number(rawPS.ps4?.primary?.price ?? defaultPS4PrimaryPrice),
            stock: Number(rawPS.ps4?.primary?.stock ?? defaultPS4PrimaryStock)
          },
          secondary: {
            enabled: rawPS.ps4?.secondary?.enabled !== false,
            price: Number(rawPS.ps4?.secondary?.price ?? defaultSecondaryPrice),
            stock: Number(rawPS.ps4?.secondary?.stock ?? defaultSecondaryStock)
          }
        }
      };
    } else {
      playstation = {
        enabled: false,
        ps5: { enabled: true, primary: { enabled: true, price: defaultPS5PrimaryPrice, stock: defaultPS5PrimaryStock }, secondary: { enabled: true, price: defaultSecondaryPrice, stock: defaultSecondaryStock } },
        ps4: { enabled: true, primary: { enabled: true, price: defaultPS4PrimaryPrice, stock: defaultPS4PrimaryStock }, secondary: { enabled: true, price: defaultSecondaryPrice, stock: defaultSecondaryStock } }
      };
    }

    const rawPC = rawPlatforms.pc;
    if (rawPC) {
      pc = {
        enabled: !!rawPC.enabled,
        editions: Array.isArray(rawPC.editions) ? rawPC.editions.map((ed: any, idx: number) => ({
          id: ed.id || `pc_ed_${idx}`,
          name: ed.name || 'Standard Edition',
          price: Number(ed.price) || Number(product.price) || 0,
          stock: typeof ed.stock === 'number' ? ed.stock : 10,
          region: ed.region || 'Global',
          type: ed.type || 'Key'
        })) : []
      };
    } else {
      pc = { enabled: false, editions: [] };
    }

    const rawXbox = rawPlatforms.xbox;
    if (rawXbox) {
      xbox = {
        enabled: !!rawXbox.enabled,
        editions: Array.isArray(rawXbox.editions) ? rawXbox.editions.map((ed: any, idx: number) => ({
          id: ed.id || `xbox_ed_${idx}`,
          name: ed.name || 'Standard Edition',
          price: Number(ed.price) || Number(product.price) || 0,
          stock: typeof ed.stock === 'number' ? ed.stock : 10,
          generation: ed.generation || 'Xbox Series X/S',
          type: ed.type || 'Key'
        })) : []
      };
    } else {
      xbox = { enabled: false, editions: [] };
    }
  } else {
    // Backwards compatibility legacy mapping
    const legacyPlatform = (product.platform || '').toUpperCase();
    const isOnlyPC = legacyPlatform === 'PC' || legacyPlatform === 'STEAM';
    const isOnlyXbox = legacyPlatform === 'XBOX' || legacyPlatform === 'XBOX SERIES X/S';
    const isPS5Only = legacyPlatform === 'PS5' && (product.pricePS4Primary === undefined || product.pricePS4Primary === 0);
    const isPS4Only = legacyPlatform === 'PS4' && (product.pricePS5Primary === undefined || product.pricePS5Primary === 0);

    if (isOnlyPC) {
      playstation = {
        enabled: false,
        ps5: { enabled: false, primary: { enabled: false, price: 0, stock: 0 }, secondary: { enabled: false, price: 0, stock: 0 } },
        ps4: { enabled: false, primary: { enabled: false, price: 0, stock: 0 }, secondary: { enabled: false, price: 0, stock: 0 } }
      };
      pc = {
        enabled: true,
        editions: [
          { id: 'pc_std', name: 'Standard Edition (Steam Key)', price: Number(product.price) || 0, stock: Number(product.ps4PrimaryStock ?? 10), region: 'Global', type: 'Steam Key' }
        ]
      };
      xbox = { enabled: false, editions: [] };
    } else if (isOnlyXbox) {
      playstation = {
        enabled: false,
        ps5: { enabled: false, primary: { enabled: false, price: 0, stock: 0 }, secondary: { enabled: false, price: 0, stock: 0 } },
        ps4: { enabled: false, primary: { enabled: false, price: 0, stock: 0 }, secondary: { enabled: false, price: 0, stock: 0 } }
      };
      pc = { enabled: false, editions: [] };
      xbox = {
        enabled: true,
        editions: [
          { id: 'xbox_std', name: 'Standard Edition (Xbox Series X/S)', price: Number(product.price) || 0, stock: Number(product.ps4PrimaryStock ?? 10), generation: 'Xbox Series X/S', type: 'Digital' }
        ]
      };
    } else {
      // Default PlayStation Game
      const hasPS5 = isPS5Only || (!isPS4Only && (defaultPS5PrimaryPrice > 0 || legacyPlatform.includes('PS5') || legacyPlatform === 'PLAYSTATION' || legacyPlatform === 'GAMES' || legacyPlatform === ''));
      const hasPS4 = isPS4Only || (!isPS5Only && (defaultPS4PrimaryPrice > 0 || legacyPlatform.includes('PS4') || legacyPlatform === 'PLAYSTATION' || legacyPlatform === 'GAMES' || legacyPlatform === ''));

      playstation = {
        enabled: true,
        ps5: {
          enabled: hasPS5,
          primary: {
            enabled: hasPS5 && (defaultPS5PrimaryPrice > 0 || defaultPS5PrimaryStock > 0 || isPS5Only),
            price: defaultPS5PrimaryPrice,
            stock: defaultPS5PrimaryStock
          },
          secondary: {
            enabled: hasPS5 && (defaultSecondaryPrice > 0 || defaultSecondaryStock > 0),
            price: defaultSecondaryPrice,
            stock: defaultSecondaryStock
          }
        },
        ps4: {
          enabled: hasPS4,
          primary: {
            enabled: hasPS4 && (defaultPS4PrimaryPrice > 0 || defaultPS4PrimaryStock > 0 || isPS4Only),
            price: defaultPS4PrimaryPrice,
            stock: defaultPS4PrimaryStock
          },
          secondary: {
            enabled: hasPS4 && (defaultSecondaryPrice > 0 || defaultSecondaryStock > 0),
            price: defaultSecondaryPrice,
            stock: defaultSecondaryStock
          }
        }
      };
      pc = { enabled: false, editions: [] };
      xbox = { enabled: false, editions: [] };
    }
  }

  // Calculate activePlatforms list
  const activePlatforms: Array<'PlayStation' | 'PC' | 'Xbox'> = [];
  if (playstation.enabled && (playstation.ps5.enabled || playstation.ps4.enabled)) {
    activePlatforms.push('PlayStation');
  }
  if (pc.enabled && pc.editions.length > 0) {
    activePlatforms.push('PC');
  }
  if (xbox.enabled && xbox.editions.length > 0) {
    activePlatforms.push('Xbox');
  }

  // Fallback if none explicitly enabled in Game category
  if (categoryType === 'Game' && activePlatforms.length === 0) {
    activePlatforms.push('PlayStation');
    playstation.enabled = true;
    playstation.ps5.enabled = true;
    playstation.ps4.enabled = true;
  }

  return {
    categoryType,
    gameConfig: {
      playstation,
      pc,
      xbox
    },
    topUpPackages,
    subscriptionPlans,
    hardwareConfig,
    activePlatforms
  };
}

export interface VariantStockResolution {
  stock: number;
  label: string;
  isAvailable: boolean;
  platform: string;
  price: number;
}

/**
 * Universal inventory resolver for any product, variant, platform, or denomination package.
 * Seamlessly connects database documents to cart, checkout, and storefront logic.
 */
export function resolveVariantStock(product: any, item: any): VariantStockResolution {
  if (!product) {
    return { stock: 0, label: 'Unknown', isAvailable: false, platform: 'Unknown', price: 0 };
  }

  // Global out of stock status override
  if (product.stockStatus === 'Out of Stock') {
    return {
      stock: 0,
      label: item?.selectedVersion || product.name || 'Out of Stock',
      isAvailable: false,
      platform: product.platform || 'Game',
      price: item?.price || product.price || 0
    };
  }

  const normalized = normalizeProductConfig(product);
  const slotKey = (item?.selectedSlotType || '').trim();
  const category = (product.category || item?.category || '').trim();
  const platform = item?.selectedPlatform || product.platform || 'PlayStation';

  // 1. HARDWARE
  if (category === 'Hardware' || slotKey === 'HARDWARE' || normalized.categoryType === 'Hardware') {
    const stock = Math.max(0, normalized.hardwareConfig.stock);
    const label = item?.selectedVersion || (normalized.hardwareConfig.condition ? `${normalized.hardwareConfig.condition} Hardware` : 'Hardware Unit');
    return {
      stock,
      label,
      isAvailable: stock > 0,
      platform: 'Hardware',
      price: normalized.hardwareConfig.price || product.price || 0
    };
  }

  // 2. TOP UP / GIFT CARDS
  if (category === 'Top Up' || category === 'Gift Cards' || slotKey.startsWith('PKG-') || normalized.categoryType === 'Top Up' || normalized.categoryType === 'Gift Cards') {
    const pkgId = slotKey.replace(/^PKG-/, '');
    const pkg = normalized.topUpPackages.find(p => p.id === pkgId) || normalized.topUpPackages[0];
    const stock = pkg ? Math.max(0, pkg.stock) : 999;
    const label = item?.selectedVersion || pkg?.name || `${product.name} Package`;
    return {
      stock,
      label,
      isAvailable: stock > 0,
      platform: category,
      price: pkg?.price || product.price || 0
    };
  }

  // 3. SUBSCRIPTIONS
  if (category === 'Subscription' || category === 'Subscriptions' || slotKey.startsWith('SUB-') || normalized.categoryType === 'Subscription') {
    const planId = slotKey.replace(/^SUB-/, '');
    const plan = normalized.subscriptionPlans.find(s => s.id === planId) || normalized.subscriptionPlans[0];
    const stock = plan ? Math.max(0, plan.stock) : 10;
    const label = item?.selectedVersion || plan?.name || `${product.name} (${plan?.duration || '12 Months'})`;
    return {
      stock,
      label,
      isAvailable: stock > 0,
      platform: 'Subscription',
      price: plan?.price || product.price || 0
    };
  }

  // 4. PC GAMES
  if (slotKey.startsWith('PC-') || (normalized.gameConfig.pc.enabled && !normalized.gameConfig.playstation.enabled && platform === 'PC')) {
    const edId = slotKey.replace(/^PC-/, '');
    const edition = normalized.gameConfig.pc.editions.find(e => e.id === edId) || normalized.gameConfig.pc.editions[0];
    const stock = edition ? Math.max(0, edition.stock) : (typeof product.ps4PrimaryStock === 'number' ? Math.max(0, product.ps4PrimaryStock) : 10);
    const label = item?.selectedVersion || (edition ? `PC ${edition.name}` : 'PC Standard Edition');
    return {
      stock,
      label,
      isAvailable: stock > 0,
      platform: 'PC',
      price: edition?.price || product.price || 0
    };
  }

  // 5. XBOX GAMES
  if (slotKey.startsWith('XBOX-') || (normalized.gameConfig.xbox.enabled && !normalized.gameConfig.playstation.enabled && platform === 'Xbox')) {
    const edId = slotKey.replace(/^XBOX-/, '');
    const edition = normalized.gameConfig.xbox.editions.find(e => e.id === edId) || normalized.gameConfig.xbox.editions[0];
    const stock = edition ? Math.max(0, edition.stock) : (typeof product.ps4PrimaryStock === 'number' ? Math.max(0, product.ps4PrimaryStock) : 10);
    const label = item?.selectedVersion || (edition ? `Xbox ${edition.name}` : 'Xbox Standard Edition');
    return {
      stock,
      label,
      isAvailable: stock > 0,
      platform: 'Xbox',
      price: edition?.price || product.price || 0
    };
  }

  // 6. PLAYSTATION GAMES
  const ps = normalized.gameConfig.playstation;

  // Exact Match on structured slotKey
  if (slotKey === 'PS-PS5-PRIMARY' || slotKey === 'PS5_PRIMARY') {
    const stock = Math.max(0, ps.ps5.primary.stock);
    return {
      stock,
      label: item?.selectedVersion || 'PlayStation PS5 Primary Slot',
      isAvailable: stock > 0 && ps.ps5.primary.enabled,
      platform: 'PS5',
      price: ps.ps5.primary.price || product.pricePS5Primary || product.price || 0
    };
  }

  if (slotKey === 'PS-PS5-SECONDARY' || slotKey === 'PS5_SECONDARY') {
    const stock = Math.max(0, ps.ps5.secondary.stock);
    return {
      stock,
      label: item?.selectedVersion || 'PlayStation PS5 Secondary Slot',
      isAvailable: stock > 0 && ps.ps5.secondary.enabled,
      platform: 'PS5',
      price: ps.ps5.secondary.price || product.priceSecondary || product.price || 0
    };
  }

  if (slotKey === 'PS-PS4-PRIMARY' || slotKey === 'PS4_PRIMARY') {
    const stock = Math.max(0, ps.ps4.primary.stock);
    return {
      stock,
      label: item?.selectedVersion || 'PlayStation PS4 Primary Slot',
      isAvailable: stock > 0 && ps.ps4.primary.enabled,
      platform: 'PS4',
      price: ps.ps4.primary.price || product.pricePS4Primary || product.price || 0
    };
  }

  if (slotKey === 'PS-PS4-SECONDARY' || slotKey === 'PS4_SECONDARY') {
    const stock = Math.max(0, ps.ps4.secondary.stock);
    return {
      stock,
      label: item?.selectedVersion || 'PlayStation PS4 Secondary Slot',
      isAvailable: stock > 0 && ps.ps4.secondary.enabled,
      platform: 'PS4',
      price: ps.ps4.secondary.price || product.priceSecondary || product.price || 0
    };
  }

  // Legacy slot matching: 'SECONDARY'
  if (slotKey === 'SECONDARY') {
    const isPS4 = item?.selectedPlatform === 'PS4';
    const s5 = ps.ps5.secondary.enabled ? Math.max(0, ps.ps5.secondary.stock) : 0;
    const s4 = ps.ps4.secondary.enabled ? Math.max(0, ps.ps4.secondary.stock) : 0;
    const usedGen = isPS4 ? 'PS4' : (s5 > 0 || !ps.ps4.secondary.enabled ? 'PS5' : 'PS4');
    const stock = usedGen === 'PS5' ? s5 : s4;
    return {
      stock,
      label: item?.selectedVersion || `PlayStation ${usedGen} Secondary Slot`,
      isAvailable: stock > 0,
      platform: usedGen,
      price: (usedGen === 'PS5' ? ps.ps5.secondary.price : ps.ps4.secondary.price) || product.priceSecondary || product.price || 0
    };
  }

  // Legacy slot matching: 'PRIMARY'
  if (slotKey === 'PRIMARY') {
    const isPS4 = item?.selectedPlatform === 'PS4';
    const p5 = ps.ps5.primary.enabled ? Math.max(0, ps.ps5.primary.stock) : 0;
    const p4 = ps.ps4.primary.enabled ? Math.max(0, ps.ps4.primary.stock) : 0;
    const usedGen = isPS4 ? 'PS4' : (p5 > 0 || !ps.ps4.primary.enabled ? 'PS5' : 'PS4');
    const stock = usedGen === 'PS5' ? p5 : p4;
    return {
      stock,
      label: item?.selectedVersion || `PlayStation ${usedGen} Primary Slot`,
      isAvailable: stock > 0,
      platform: usedGen,
      price: (usedGen === 'PS5' ? ps.ps5.primary.price : ps.ps4.primary.price) || product.price || 0
    };
  }

  // 7. Fallback for unspecified slot (e.g., added from Card overview)
  const totalPSStock = (ps.ps5.primary.enabled ? ps.ps5.primary.stock : 0) +
                       (ps.ps5.secondary.enabled ? ps.ps5.secondary.stock : 0) +
                       (ps.ps4.primary.enabled ? ps.ps4.primary.stock : 0) +
                       (ps.ps4.secondary.enabled ? ps.ps4.secondary.stock : 0);
  
  const totalPCStock = normalized.gameConfig.pc.editions.reduce((sum, e) => sum + Math.max(0, e.stock), 0);
  const totalXboxStock = normalized.gameConfig.xbox.editions.reduce((sum, e) => sum + Math.max(0, e.stock), 0);
  const totalPkgStock = normalized.topUpPackages.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
  const totalSubStock = normalized.subscriptionPlans.reduce((sum, s) => sum + Math.max(0, s.stock), 0);

  const calculatedTotal = totalPSStock + totalPCStock + totalXboxStock + totalPkgStock + totalSubStock;
  const directStock = typeof item?.variantStock === 'number' && item.variantStock > 0 
    ? item.variantStock 
    : (calculatedTotal > 0 ? calculatedTotal : (product.slotsAvailable ?? 5));

  return {
    stock: Math.max(0, directStock),
    label: item?.selectedVersion || 'Standard Edition',
    isAvailable: directStock > 0,
    platform: platform || 'Game',
    price: item?.price || product.price || 0
  };
}

/**
 * Decrements the stock of the appropriate variant of a product.
 * Returns the updated product object ready for Firestore saving.
 */
export function applyInventoryDecrement(product: any, cartItem: any, quantity: number = 1): any {
  if (!product) return product;
  const qty = Math.max(1, quantity);
  const updated = JSON.parse(JSON.stringify(product));
  const normalized = normalizeProductConfig(updated);
  const catType = normalized.categoryType;
  const slotKey = (cartItem?.selectedSlotType || '').trim();

  // 1. Hardware
  if (catType === 'Hardware' || slotKey === 'HARDWARE') {
    const curStock = typeof updated.hardwareConfig?.stock === 'number'
      ? updated.hardwareConfig.stock
      : (updated.ps4PrimaryStock ?? 0);
    const newStock = Math.max(0, curStock - qty);
    if (!updated.hardwareConfig) {
      updated.hardwareConfig = { ...normalized.hardwareConfig };
    }
    updated.hardwareConfig.stock = newStock;
    updated.ps4PrimaryStock = newStock;
    if (newStock === 0) {
      updated.stockStatus = 'Out of Stock';
    }
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  // 2. Top-Up & Gift Cards
  if (catType === 'Top Up' || catType === 'Gift Cards' || slotKey.startsWith('PKG-')) {
    const pkgId = cartItem?.selectedPackageId || slotKey.replace('PKG-', '');
    if (Array.isArray(updated.topUpPackages) && updated.topUpPackages.length > 0) {
      updated.topUpPackages = updated.topUpPackages.map((pkg: any, idx: number) => {
        if (pkg.id === pkgId || `pkg_${idx}` === pkgId || pkg.name === cartItem?.name || pkg.name === cartItem?.selectedVersion) {
          const s = Math.max(0, (typeof pkg.stock === 'number' ? pkg.stock : 999) - qty);
          return { ...pkg, stock: s };
        }
        return pkg;
      });
    }
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  // 3. Subscriptions
  if (catType === 'Subscription' || slotKey.startsWith('SUB-')) {
    const planId = cartItem?.selectedPlanId || slotKey.replace('SUB-', '');
    if (Array.isArray(updated.subscriptionPlans) && updated.subscriptionPlans.length > 0) {
      updated.subscriptionPlans = updated.subscriptionPlans.map((plan: any, idx: number) => {
        if (plan.id === planId || `sub_${idx}` === planId || plan.name === cartItem?.name || plan.name === cartItem?.selectedVersion) {
          const s = Math.max(0, (typeof plan.stock === 'number' ? plan.stock : 10) - qty);
          return { ...plan, stock: s };
        }
        return plan;
      });
    }
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  // 4. PC Game
  if (slotKey.startsWith('PC-')) {
    const edId = cartItem?.selectedEditionId || slotKey.replace('PC-', '');
    if (updated.platformsConfig?.pc?.editions) {
      updated.platformsConfig.pc.editions = updated.platformsConfig.pc.editions.map((ed: any, idx: number) => {
        if (ed.id === edId || `pc_ed_${idx}` === edId || ed.name === cartItem?.selectedVersion) {
          return { ...ed, stock: Math.max(0, (ed.stock ?? 10) - qty) };
        }
        return ed;
      });
    }
    if (updated.gamePlatforms?.pc?.editions) {
      updated.gamePlatforms.pc.editions = updated.gamePlatforms.pc.editions.map((ed: any, idx: number) => {
        if (ed.id === edId || `pc_ed_${idx}` === edId || ed.name === cartItem?.selectedVersion) {
          return { ...ed, stock: Math.max(0, (ed.stock ?? 10) - qty) };
        }
        return ed;
      });
    }
    updated.ps4PrimaryStock = Math.max(0, (updated.ps4PrimaryStock ?? 10) - qty);
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  // 5. Xbox Game
  if (slotKey.startsWith('XBOX-')) {
    const edId = cartItem?.selectedEditionId || slotKey.replace('XBOX-', '');
    if (updated.platformsConfig?.xbox?.editions) {
      updated.platformsConfig.xbox.editions = updated.platformsConfig.xbox.editions.map((ed: any, idx: number) => {
        if (ed.id === edId || `xbox_ed_${idx}` === edId || ed.name === cartItem?.selectedVersion) {
          return { ...ed, stock: Math.max(0, (ed.stock ?? 10) - qty) };
        }
        return ed;
      });
    }
    if (updated.gamePlatforms?.xbox?.editions) {
      updated.gamePlatforms.xbox.editions = updated.gamePlatforms.xbox.editions.map((ed: any, idx: number) => {
        if (ed.id === edId || `xbox_ed_${idx}` === edId || ed.name === cartItem?.selectedVersion) {
          return { ...ed, stock: Math.max(0, (ed.stock ?? 10) - qty) };
        }
        return ed;
      });
    }
    updated.ps4PrimaryStock = Math.max(0, (updated.ps4PrimaryStock ?? 10) - qty);
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  // 6. PlayStation Slots
  if (slotKey === 'PS-PS5-PRIMARY' || slotKey === 'PS5_PRIMARY') {
    updated.ps5PrimaryStock = Math.max(0, (updated.ps5PrimaryStock ?? 0) - qty);
    if (updated.platformsConfig?.playstation?.ps5?.primary) {
      updated.platformsConfig.playstation.ps5.primary.stock = Math.max(0, (updated.platformsConfig.playstation.ps5.primary.stock ?? 0) - qty);
    }
    if (updated.gamePlatforms?.playstation?.ps5?.primary) {
      updated.gamePlatforms.playstation.ps5.primary.stock = Math.max(0, (updated.gamePlatforms.playstation.ps5.primary.stock ?? 0) - qty);
    }
  } else if (slotKey === 'PS-PS5-SECONDARY' || slotKey === 'PS5_SECONDARY') {
    updated.secondaryStock = Math.max(0, (updated.secondaryStock ?? 0) - qty);
    if (updated.platformsConfig?.playstation?.ps5?.secondary) {
      updated.platformsConfig.playstation.ps5.secondary.stock = Math.max(0, (updated.platformsConfig.playstation.ps5.secondary.stock ?? 0) - qty);
    }
    if (updated.gamePlatforms?.playstation?.ps5?.secondary) {
      updated.gamePlatforms.playstation.ps5.secondary.stock = Math.max(0, (updated.gamePlatforms.playstation.ps5.secondary.stock ?? 0) - qty);
    }
  } else if (slotKey === 'PS-PS4-PRIMARY' || slotKey === 'PS4_PRIMARY') {
    updated.ps4PrimaryStock = Math.max(0, (updated.ps4PrimaryStock ?? 0) - qty);
    if (updated.platformsConfig?.playstation?.ps4?.primary) {
      updated.platformsConfig.playstation.ps4.primary.stock = Math.max(0, (updated.platformsConfig.playstation.ps4.primary.stock ?? 0) - qty);
    }
    if (updated.gamePlatforms?.playstation?.ps4?.primary) {
      updated.gamePlatforms.playstation.ps4.primary.stock = Math.max(0, (updated.gamePlatforms.playstation.ps4.primary.stock ?? 0) - qty);
    }
  } else if (slotKey === 'PS-PS4-SECONDARY' || slotKey === 'PS4_SECONDARY' || slotKey === 'SECONDARY') {
    updated.secondaryStock = Math.max(0, (updated.secondaryStock ?? 0) - qty);
    if (updated.platformsConfig?.playstation?.ps4?.secondary) {
      updated.platformsConfig.playstation.ps4.secondary.stock = Math.max(0, (updated.platformsConfig.playstation.ps4.secondary.stock ?? 0) - qty);
    }
    if (updated.gamePlatforms?.playstation?.ps4?.secondary) {
      updated.gamePlatforms.playstation.ps4.secondary.stock = Math.max(0, (updated.gamePlatforms.playstation.ps4.secondary.stock ?? 0) - qty);
    }
  } else if (slotKey === 'PRIMARY') {
    updated.ps4PrimaryStock = Math.max(0, (updated.ps4PrimaryStock ?? 0) - qty);
    if (updated.platformsConfig?.playstation?.ps4?.primary) {
      updated.platformsConfig.playstation.ps4.primary.stock = Math.max(0, (updated.platformsConfig.playstation.ps4.primary.stock ?? 0) - qty);
    }
    if (updated.gamePlatforms?.playstation?.ps4?.primary) {
      updated.gamePlatforms.playstation.ps4.primary.stock = Math.max(0, (updated.gamePlatforms.playstation.ps4.primary.stock ?? 0) - qty);
    }
  } else {
    // Default fallback: decrement ps4PrimaryStock or secondaryStock
    const isPS5 = cartItem?.platform === 'PS5' || cartItem?.selectedPlatform === 'PS5';
    if (isPS5) {
      updated.ps5PrimaryStock = Math.max(0, (updated.ps5PrimaryStock ?? 0) - qty);
    } else {
      updated.secondaryStock = Math.max(0, (updated.secondaryStock ?? 0) - qty);
    }
  }

  // Check remaining total stock across all variants
  const postStockResolution = resolveVariantStock(updated, updated);
  if (postStockResolution.stock <= 0) {
    updated.stockStatus = 'Out of Stock';
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

/**
 * Universal human-readable version formatter for cart, receipts, and order summaries.
 */
export function formatItemVersion(item: any): string {
  if (!item) return 'Standard';
  if (item.selectedVersion && typeof item.selectedVersion === 'string' && item.selectedVersion.trim()) {
    return item.selectedVersion.trim();
  }
  const slot = (item.selectedSlotType || '').trim();
  if (slot === 'PS-PS5-PRIMARY' || slot === 'PS5_PRIMARY') return 'PlayStation PS5 Primary';
  if (slot === 'PS-PS5-SECONDARY' || slot === 'PS5_SECONDARY') return 'PlayStation PS5 Secondary';
  if (slot === 'PS-PS4-PRIMARY' || slot === 'PS4_PRIMARY') return 'PlayStation PS4 Primary';
  if (slot === 'PS-PS4-SECONDARY' || slot === 'PS4_SECONDARY') return 'PlayStation PS4 Secondary';
  if (slot === 'HARDWARE') return 'Hardware Unit';
  if (slot.startsWith('PC-')) return 'PC Edition';
  if (slot.startsWith('XBOX-')) return 'Xbox Edition';
  if (slot.startsWith('PKG-')) return 'Top-Up Package';
  if (slot.startsWith('SUB-')) return 'Subscription Plan';
  if (slot === 'SECONDARY') return 'Secondary Slot';
  if (slot === 'PRIMARY') return 'Primary Slot';
  return slot.replace(/[-_]/g, ' ') || 'Standard';
}
