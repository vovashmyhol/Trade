/**
 * GRAM Trade Wallet Mini App
 * Telegram WebApp Integration & Trading Engine
 */

(function () {
  'use strict';

  // ==================== CONFIG & STATE ====================
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
    try {
      if (tg.setHeaderColor) tg.setHeaderColor('#0f1015');
    } catch (e) {}
    try {
      if (tg.setBackgroundColor) tg.setBackgroundColor('#0f1015');
    } catch (e) {}
  }

  // App State: 25 Stars = 0.5 GRAM (1 Star = 0.02 GRAM, 1 GRAM = $1.00 USD)
  const STATE = {
    gramBalance: 0.00,
    gramPrice: 1.0000,
    priceChange24h: 5.84,
    starUsdRate: 0.02, // 1 Star = $0.02, 25 Stars = 0.50 GRAM ($0.50 USD)
    activeTimeframe: '15m',
    selectedOrderType: 'long', // 'long' or 'short'
    selectedLeverage: 10,
    selectedPackageIndex: 0,
    hasDeposited: false,
    openPositions: [],
    priceHistory: [],
    chartAnimationId: null
  };

  // Predefined Star Packages with Telegram Stars invoice links
  const STAR_PACKAGES = [
    { stars: 25, url: 'https://t.me/$7cH8P3BVyVADBgAA3H4TAyzstKk' },
    { stars: 50, url: 'https://t.me/$wacQrHBVyVAEBgAAEJeU_nO3Pyg' },
    { stars: 100, url: 'https://t.me/$F51JxnBVyVAFBgAAMmMdUxWDfrM' },
    { stars: 200, url: 'https://t.me/$E69PsnBVyVAGBgAAff4tw8TZVc0' },
    { stars: 350, url: 'https://t.me/$DAX093BVyVAHBgAAEKFWRFNqRwQ' },
    { stars: 500, url: 'https://t.me/$lmD84XBVyVAIBgAAh7YYY8Folvs' },
    { stars: 1000, url: 'https://t.me/$rMHZFXBVyVAJBgAAPmwKqa1FR-g' },
    { stars: 2500, url: 'https://t.me/$6yeVU3BVyVAKBgAAl348VGoPB4Q' },
    { stars: 5000, url: 'https://t.me/$73nRZnBVyVALBgAA17VoIx4PNCU' },
    { stars: 10000, url: 'https://t.me/$iPxPiXBVyVAMBgAAoWBZp2XD2yo' }
  ];

  // Gifts Catalog Data (6 Gifts as requested)
  const GIFTS_DATA = [
    { id: 'eternal_rose', name: 'Eternal Rose', price: 100, exchange: 85, image: 'Gifts/Eternal Rose.png' },
    { id: 'hex_pot', name: 'Hex Pot', price: 15, exchange: 13, image: 'Gifts/Hex Pot.png' },
    { id: 'lol_pop', name: 'Lol Pop', price: 15, exchange: 13, image: 'Gifts/Lol Pop.png' },
    { id: 'record_player', name: 'Record Player', price: 50, exchange: 42, image: 'Gifts/Record Player.png' },
    { id: 'sakura_flower', name: 'Sakura Flower', price: 15, exchange: 13, image: 'Gifts/Sakura Flower.png' },
    { id: 'spy_agaric', name: 'Spy Agaric', price: 15, exchange: 13, image: 'Gifts/Spy Agaric.png' }
  ];

  let selectedGiftForBuy = null;

  // ==================== DOM ELEMENTS ====================
  const el = {
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    cardHolderName: document.getElementById('cardHolderName'),
    cardGramAmount: document.getElementById('cardGramAmount'),
    cardUsdAmount: document.getElementById('cardUsdAmount'),
    tickerPrice: document.getElementById('tickerPrice'),
    tickerChange: document.getElementById('tickerChange'),
    marketTickerCard: document.getElementById('marketTickerCard'),
    
    // Top Nav Switcher (Gifts | Wallet)
    navGiftsBtn: document.getElementById('navGiftsBtn'),
    navWalletBtn: document.getElementById('navWalletBtn'),
    walletTabView: document.getElementById('walletTabView'),
    giftsTabView: document.getElementById('giftsTabView'),
    
    // Gifts Subnav & Sections
    subnavCatalogBtn: document.getElementById('subnavCatalogBtn'),
    subnavInventoryBtn: document.getElementById('subnavInventoryBtn'),
    giftsCatalogSection: document.getElementById('giftsCatalogSection'),
    giftsInventorySection: document.getElementById('giftsInventorySection'),
    catalogCountBadge: document.getElementById('catalogCountBadge'),
    inventoryCountBadge: document.getElementById('inventoryCountBadge'),
    giftsGrid: document.getElementById('giftsGrid'),
    inventoryGrid: document.getElementById('inventoryGrid'),
    inventoryEmptyState: document.getElementById('inventoryEmptyState'),
    btnGoToShop: document.getElementById('btnGoToShop'),

    // Gift Buy Modal
    giftBuyBackdrop: document.getElementById('giftBuyBackdrop'),
    giftBuySheet: document.getElementById('giftBuySheet'),
    btnCloseGiftBuy: document.getElementById('btnCloseGiftBuy'),
    giftModalTopTitle: document.getElementById('giftModalTopTitle'),
    giftModalImg: document.getElementById('giftModalImg'),
    giftModalTitle: document.getElementById('giftModalTitle'),
    giftModalExchangeStars: document.getElementById('giftModalExchangeStars'),
    btnSpotlightPreview: document.getElementById('btnSpotlightPreview'),
    giftMessageInput: document.getElementById('giftMessageInput'),
    giftHideNameToggle: document.getElementById('giftHideNameToggle'),
    btnConfirmBuyGift: document.getElementById('btnConfirmBuyGift'),

    // Gift Detail / Upgrade Modal (Inventory)
    giftDetailBackdrop: document.getElementById('giftDetailBackdrop'),
    giftDetailSheet: document.getElementById('giftDetailSheet'),
    btnCloseGiftDetail: document.getElementById('btnCloseGiftDetail'),
    giftDetailTopTitle: document.getElementById('giftDetailTopTitle'),
    inventoryGiftHero: document.getElementById('inventoryGiftHero'),
    giftQmarkPattern: document.getElementById('giftQmarkPattern'),
    giftSerialTag: document.getElementById('giftSerialTag'),
    giftStatusTag: document.getElementById('giftStatusTag'),
    giftDetailImg: document.getElementById('giftDetailImg'),
    giftDetailName: document.getElementById('giftDetailName'),
    giftDetailPrice: document.getElementById('giftDetailPrice'),
    giftDetailExchange: document.getElementById('giftDetailExchange'),
    btnUpgradeGift: document.getElementById('btnUpgradeGift'),
    btnWithdrawGift: document.getElementById('btnWithdrawGift'),
    btnTransferGift: document.getElementById('btnTransferGift'),

    // Bottom Sheet (Top Up Lines)
    btnOpenAddFunds: document.getElementById('btnOpenAddFunds'),
    btnCloseAddFunds: document.getElementById('btnCloseAddFunds'),
    addFundsBackdrop: document.getElementById('addFundsBackdrop'),
    addFundsSheet: document.getElementById('addFundsSheet'),
    starsPackagesGrid: document.getElementById('starsPackagesGrid'),
    btnSubmitTopUp: document.getElementById('btnSubmitTopUp'),
    
    // Promo Welcome Modal
    promoBackdrop: document.getElementById('promoBackdrop'),
    promoCard: document.getElementById('promoCard'),
    btnClosePromo: document.getElementById('btnClosePromo'),
    btnClaimPromo: document.getElementById('btnClaimPromo'),

    // Trade Screen
    btnOpenTrade: document.getElementById('btnOpenTrade'),
    btnBackFromTrade: document.getElementById('btnBackFromTrade'),
    tradeScreen: document.getElementById('tradeScreen'),
    tradeLivePrice: document.getElementById('tradeLivePrice'),
    tradePriceChange: document.getElementById('tradePriceChange'),
    tradeAvailableGram: document.getElementById('tradeAvailableGram'),
    priceChart: document.getElementById('priceChart'),
    statHigh: document.getElementById('statHigh'),
    statLow: document.getElementById('statLow'),
    statVol: document.getElementById('statVol'),
    
    // Order Controls
    tabLongBtn: document.getElementById('tabLongBtn'),
    tabShortBtn: document.getElementById('tabShortBtn'),
    tradeAmountInput: document.getElementById('tradeAmountInput'),
    selectedLevDisplay: document.getElementById('selectedLevDisplay'),
    summaryPosSize: document.getElementById('summaryPosSize'),
    summaryLiqPrice: document.getElementById('summaryLiqPrice'),
    btnSubmitOrder: document.getElementById('btnSubmitOrder'),
    positionsList: document.getElementById('positionsList'),
    positionsCount: document.getElementById('positionsCount'),
    
    // Notifications & Confetti
    toast: document.getElementById('toast'),
    toastTitle: document.getElementById('toastTitle'),
    toastDesc: document.getElementById('toastDesc'),
    confettiOverlay: document.getElementById('confettiOverlay')
  };

  // ==================== INITIALIZATION ====================
  function init() {
    loadSavedState();
    setupTelegramUser();
    renderStarsPackages();
    renderGiftsGrid();
    renderInventory();
    setupEventListeners();
    fetchSplitTgRates();
    initPriceChart();
    startPriceTickerEngine();
    updateUI();
    checkAndShowWelcomePromo();
  }

  // Load state from localStorage
  function loadSavedState() {
    try {
      const savedBal = localStorage.getItem('trade_gram_balance');
      if (savedBal !== null) {
        STATE.gramBalance = parseFloat(savedBal);
      } else {
        STATE.gramBalance = 0.00;
      }
      STATE.hasDeposited = localStorage.getItem('trade_has_deposited') === 'true';

      const savedPositions = localStorage.getItem('trade_open_positions');
      if (savedPositions) {
        STATE.openPositions = JSON.parse(savedPositions);
      }
    } catch (e) {
      console.warn('Could not load localStorage state', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem('trade_gram_balance', STATE.gramBalance.toString());
      localStorage.setItem('trade_open_positions', JSON.stringify(STATE.openPositions));
      localStorage.setItem('trade_has_deposited', STATE.hasDeposited ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not save localStorage state', e);
    }
  }

  // Welcome Promo Modal Popup
  function checkAndShowWelcomePromo() {
    if (!STATE.hasDeposited) {
      setTimeout(() => {
        if (!STATE.hasDeposited && el.promoBackdrop) {
          el.promoBackdrop.classList.add('active');
          triggerHaptic('medium');
        }
      }, 2000);
    }
  }

  // Setup Telegram User Info
  function setupTelegramUser() {
    const user = tg?.initDataUnsafe?.user;
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      if (el.userName) el.userName.textContent = fullName || user.username || 'Alicia Torreaux';
      if (el.cardHolderName) el.cardHolderName.textContent = (fullName || user.username || 'ALICIA TORREAUX').toUpperCase();
      
      const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || 'T');
      if (el.userAvatar) el.userAvatar.textContent = initials.toUpperCase() || 'AT';
    }
  }

  // Split.tg API Fetch — check live TON rate for analytics
  async function fetchSplitTgRates() {
    try {
      const response = await fetch('https://api.split.tg/buy/ton_rate');
      if (response.ok) {
        const data = await response.json();
        const tonUsd = parseFloat(data?.message || data?.price || data?.rate);
        if (tonUsd && tonUsd > 0) {
          console.log(`Split.tg TON rate: $${tonUsd}`);
        }
      }
    } catch (err) {
      console.log('Using fixed rate: 25 Stars = 0.5 GRAM');
    }
  }

  // ==================== UI RENDERING ====================
  function formatNumber(num, decimals = 2) {
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function updateUI() {
    const usdValue = STATE.gramBalance * STATE.gramPrice;
    
    // Main Card
    if (el.cardGramAmount) el.cardGramAmount.textContent = formatNumber(STATE.gramBalance, 2);
    if (el.cardUsdAmount) el.cardUsdAmount.textContent = `$${formatNumber(usdValue, 2)}`;
    
    // Ticker (Trade Screen)
    if (el.tickerPrice) el.tickerPrice.textContent = `$${formatNumber(STATE.gramPrice, 4)}`;
    if (el.tradeLivePrice) el.tradeLivePrice.textContent = `$${formatNumber(STATE.gramPrice, 4)}`;
    
    const sign = STATE.priceChange24h >= 0 ? '+' : '';
    if (el.tickerChange) el.tickerChange.textContent = `${sign}${STATE.priceChange24h.toFixed(2)}%`;
    if (el.tradePriceChange) {
      el.tradePriceChange.innerHTML = `<span>${STATE.priceChange24h >= 0 ? '▲' : '▼'} ${sign}${STATE.priceChange24h.toFixed(2)}%</span>`;
    }
    
    // Trade Screen Available
    if (el.tradeAvailableGram) {
      el.tradeAvailableGram.textContent = formatNumber(STATE.gramBalance, 2);
    }

    updateOrderSummary();
    renderPositions();
  }

  // Render Horizontal Lines in Bottom Sheet (as in photo)
  function renderStarsPackages() {
    if (!el.starsPackagesGrid) return;
    el.starsPackagesGrid.innerHTML = '';

    STAR_PACKAGES.forEach((pkg, index) => {
      const usdEquivalent = pkg.stars * STATE.starUsdRate;
      const gramEquivalent = usdEquivalent / STATE.gramPrice;

      const line = document.createElement('div');
      line.className = `topup-line ${index === STATE.selectedPackageIndex ? 'selected' : ''}`;
      
      line.innerHTML = `
        <div class="line-left">
          <div class="radio-indicator">
            <div class="radio-dot"></div>
          </div>
          <div class="line-stars-group">
            <img src="stars-icon.png" class="line-star-icon" alt="Star">
            <span class="line-stars-val">${pkg.stars.toLocaleString()}</span>
          </div>
        </div>
        <div class="line-right">
          <span class="line-gram-val">+${formatNumber(gramEquivalent, 2)} GRAM</span>
          <span class="line-usd-val">≈ $${usdEquivalent.toFixed(2)} USD</span>
        </div>
      `;

      line.addEventListener('click', () => {
        STATE.selectedPackageIndex = index;
        document.querySelectorAll('.topup-line').forEach(l => l.classList.remove('selected'));
        line.classList.add('selected');
        triggerHaptic('selection');
        updateTopUpButton();
      });

      el.starsPackagesGrid.appendChild(line);
    });

    updateTopUpButton();
  }

  function updateTopUpButton() {
    const pkg = STAR_PACKAGES[STATE.selectedPackageIndex] || STAR_PACKAGES[0];
    if (el.btnSubmitTopUp) {
      el.btnSubmitTopUp.textContent = `Top Up ★ ${pkg.stars.toLocaleString()}`;
    }
  }

  // Handle Stars Top-up Submit via Telegram WebApp openInvoice
  function handleTopUpSubmit() {
    const pkg = STAR_PACKAGES[STATE.selectedPackageIndex] || STAR_PACKAGES[0];
    const invoiceUrl = pkg.url;

    function onPaymentSuccess() {
      const usdEquivalent = pkg.stars * STATE.starUsdRate;
      let gramEquivalent = usdEquivalent / STATE.gramPrice;

      let bonusNote = '';
      if (!STATE.hasDeposited) {
        // First deposit bonus: $10 worth of GRAM!
        const bonusGram = 10 / STATE.gramPrice;
        gramEquivalent += bonusGram;
        STATE.hasDeposited = true;
        localStorage.setItem('trade_has_deposited', 'true');
        bonusNote = ' (+10$ БОНУС!)';
      }

      triggerHaptic('success');
      
      // Add GRAM to balance
      STATE.gramBalance += gramEquivalent;
      saveState();
      updateUI();
      
      // Trigger confetti
      createConfetti();
      
      // Close bottom sheet & promo
      closeAddFunds();
      if (el.promoBackdrop) el.promoBackdrop.classList.remove('active');

      // Show toast
      showToast(
        'Пополнение успешно!',
        `Зачислено +${formatNumber(gramEquivalent, 2)} GRAM (${pkg.stars} ⭐️)${bonusNote}`
      );
    }

    if (tg && typeof tg.openInvoice === 'function') {
      triggerHaptic('light');
      tg.openInvoice(invoiceUrl, (status) => {
        console.log('Telegram Invoice status:', status);
        if (status === 'paid') {
          onPaymentSuccess();
        } else if (status === 'cancelled') {
          triggerHaptic('warning');
          showToast('Оплата отменена', 'Счет закрыт без оплаты');
        } else if (status === 'failed') {
          triggerHaptic('error');
          showToast('Ошибка', 'Не удалось провести оплату Stars');
        }
      });
    } else {
      // Fallback for browser outside Telegram
      triggerHaptic('light');
      window.open(invoiceUrl, '_blank');
      onPaymentSuccess();
    }
  }

  // ==================== GIFTS STORE & INVENTORY ====================

  // Render Gifts Catalog Grid (Matching Image 2)
  function renderGiftsGrid() {
    if (!el.giftsGrid) return;
    el.giftsGrid.innerHTML = '';

    GIFTS_DATA.forEach(gift => {
      const card = document.createElement('div');
      card.className = 'gift-card';
      
      card.innerHTML = `
        <div class="gift-card-img-wrap">
          <img src="${encodeURI(gift.image)}" alt="${gift.name}" class="gift-card-img" loading="lazy">
        </div>
        <div class="gift-price-pill">
          <div class="sparkle-emitter">
            <span class="tg-sparkle spk-tl"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffd752"/></svg></span>
            <span class="tg-sparkle spk-t"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffea88"/></svg></span>
            <span class="tg-sparkle spk-tr"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffd752"/></svg></span>
            <span class="tg-sparkle spk-r"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#fff1a8"/></svg></span>
            <span class="tg-sparkle spk-br"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffd752"/></svg></span>
            <span class="tg-sparkle spk-b"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffea88"/></svg></span>
            <span class="tg-sparkle spk-bl"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffd752"/></svg></span>
            <span class="tg-sparkle spk-l"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#fff1a8"/></svg></span>
            <span class="tg-sparkle spk-c1"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffe082"/></svg></span>
            <span class="tg-sparkle spk-c2"><svg viewBox="0 0 16 16"><path d="M8 0 C8 4.5 11.5 8 16 8 C11.5 8 8 11.5 8 16 C8 11.5 4.5 8 0 8 C4.5 8 8 4.5 8 0 Z" fill="#ffec99"/></svg></span>
          </div>
          <img src="stars-icon.png" class="badge-star-icon" alt="Stars">
          <span class="badge-star-val">${gift.price}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        triggerHaptic('light');
        openGiftBuyModal(gift);
      });

      el.giftsGrid.appendChild(card);
    });

    updateInventoryCountBadge();
  }

  // Open Gift Purchase Modal (Matching Image 3)
  function openGiftBuyModal(gift) {
    selectedGiftForBuy = gift;
    if (el.giftModalTopTitle) el.giftModalTopTitle.textContent = `Купить подарок за ${gift.price} звёзд`;
    if (el.giftModalImg) el.giftModalImg.src = encodeURI(gift.image);
    if (el.giftModalTitle) el.giftModalTitle.textContent = gift.name;
    if (el.giftModalExchangeStars) el.giftModalExchangeStars.textContent = gift.exchange;
    if (el.btnConfirmBuyGift) {
      el.btnConfirmBuyGift.innerHTML = `Купить подарок за <img src="stars-icon.png" class="btn-star-icon" alt="Stars"> ${gift.price}`;
    }
    if (el.giftMessageInput) el.giftMessageInput.value = '';
    if (el.giftHideNameToggle) el.giftHideNameToggle.checked = true;

    if (el.giftBuyBackdrop) el.giftBuyBackdrop.classList.add('active');
    if (el.giftBuySheet) el.giftBuySheet.classList.add('active');
  }

  function closeGiftBuyModal() {
    if (el.giftBuyBackdrop) el.giftBuyBackdrop.classList.remove('active');
    if (el.giftBuySheet) el.giftBuySheet.classList.remove('active');
    selectedGiftForBuy = null;
  }

  // Real Telegram Stars invoice slugs mapped by price
  const INVOICE_SLUGS = {
    15:  'mNSl69vn4VDrAwAAoZEQ4Vsuf6s',
    50:  'ToZCS9vn4VDqAwAAQeIS5XUZJhA',
    100: 't1ca19vn4VDpAwAARDJrmw892aU',
  };
  const UPGRADE_INVOICE_SLUG = 'eEaWIdvn4VDsAwAAgwYnSWrB028';
  const WITHDRAW_INVOICE_SLUG = 'aCcmstvn4VDtAwAAb9T-qjiiKn0';

  // Confirm Buy Gift — opens real Telegram invoice
  function handleConfirmBuyGift() {
    if (!selectedGiftForBuy) return;
    const gift = selectedGiftForBuy;
    const message = el.giftMessageInput ? el.giftMessageInput.value.trim() : '';
    const isAnonymous = el.giftHideNameToggle ? el.giftHideNameToggle.checked : true;

    const slug = INVOICE_SLUGS[gift.price];

    if (slug && tg?.openInvoice) {
      // Native Telegram invoice popup
      tg.openInvoice(slug, (status) => {
        if (status === 'paid') {
          completePurchase(gift, message, isAnonymous);
        } else if (status === 'cancelled') {
          showToast('Отменено', 'Оплата не была завершена');
        } else if (status === 'failed') {
          showToast('Ошибка оплаты', 'Попробуйте ещё раз');
          triggerHaptic('error');
        }
      });
    } else {
      // Fallback: open invoice link in Telegram (for browser preview)
      const url = `https://t.me/$${slug || ''}`;
      if (tg?.openLink) {
        tg.openLink(url);
      } else {
        window.open(url, '_blank');
      }
      // In browser/preview mode, complete purchase after 1s delay for testing
      if (!tg?.openInvoice) {
        setTimeout(() => completePurchase(gift, message, isAnonymous), 1000);
      }
    }

    closeGiftBuyModal();
  }

  function completePurchase(gift, message, isAnonymous) {
    triggerHaptic('success');
    try {
      const userGifts = JSON.parse(localStorage.getItem('trade_user_gifts') || '[]');
      userGifts.unshift({
        id: Date.now(),
        giftId: gift.id,
        name: gift.name,
        price: gift.price,
        exchange: gift.exchange,
        image: gift.image,
        message: message,
        anonymous: isAnonymous,
        date: new Date().toLocaleDateString('ru-RU')
      });
      localStorage.setItem('trade_user_gifts', JSON.stringify(userGifts));
    } catch (e) {
      console.warn('Could not save gift to localStorage', e);
    }

    createConfetti();
    updateInventoryCountBadge();
    renderInventory();
    showToast('Подарок куплен!', `"${gift.name}" добавлен в ваш инвентарь.`);
  }

  // Update Inventory count badge
  function updateInventoryCountBadge() {
    try {
      const userGifts = JSON.parse(localStorage.getItem('trade_user_gifts') || '[]');
      if (el.inventoryCountBadge) {
        el.inventoryCountBadge.textContent = userGifts.length;
      }
    } catch (e) {}
  }

  // Render User's Inventory
  function renderInventory() {
    let userGifts = [];
    try {
      userGifts = JSON.parse(localStorage.getItem('trade_user_gifts') || '[]');
    } catch (e) {}

    updateInventoryCountBadge();

    if (!el.inventoryEmptyState || !el.inventoryGrid) return;

    if (userGifts.length === 0) {
      el.inventoryEmptyState.style.display = 'flex';
      el.inventoryGrid.style.display = 'none';
      return;
    }

    el.inventoryEmptyState.style.display = 'none';
    el.inventoryGrid.style.display = 'grid';
    el.inventoryGrid.innerHTML = '';

    userGifts.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'inventory-card';
      
      card.innerHTML = `
        <div class="inventory-card-badge">МОЙ</div>
        <div class="gift-card-img-wrap">
          <img src="${encodeURI(item.image)}" alt="${item.name}" class="gift-card-img" loading="lazy">
        </div>
        <div class="gift-price-pill" style="background: rgba(36, 139, 254, 0.15); border-color: rgba(36, 139, 254, 0.3); gap: 4px;">
          <img src="stars-icon.png" class="badge-star-icon" alt="Stars" style="width: 14px; height: 14px;">
          <span class="badge-star-val" style="color: #66b5ff; font-size: 13px;">${item.price}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        triggerHaptic('light');
        openGiftDetailModal(item);
      });

      el.inventoryGrid.appendChild(card);
    });
  }

  // ==================== GIFT DETAIL / UPGRADE / TRANSFER ====================
  let currentDetailItem = null;

  function openGiftDetailModal(item) {
    currentDetailItem = item;

    // Populate basic info
    if (el.giftDetailImg) el.giftDetailImg.src = encodeURI(item.image);
    if (el.giftDetailName) el.giftDetailName.textContent = item.name;
    if (el.giftDetailPrice) el.giftDetailPrice.innerHTML = `${item.price} <img src="stars-icon.png" class="mini-star-icon" alt="⭐️">`;
    if (el.giftDetailExchange) el.giftDetailExchange.innerHTML = `${item.exchange} <img src="stars-icon.png" class="mini-star-icon" alt="⭐️">`;
    if (el.giftDetailTopTitle) el.giftDetailTopTitle.textContent = item.name;

    const isUpgraded = !!item.upgraded;

    // Hero state
    if (el.inventoryGiftHero) {
      el.inventoryGiftHero.classList.toggle('upgraded', isUpgraded);
    }

    // Serial number (only if upgraded)
    if (el.giftSerialTag) {
      if (isUpgraded && item.serialNumber) {
        el.giftSerialTag.textContent = `#${String(item.serialNumber).padStart(5, '0')}`;
        el.giftSerialTag.style.display = '';
      } else {
        el.giftSerialTag.style.display = 'none';
      }
    }

    // Status tag
    if (el.giftStatusTag) {
      el.giftStatusTag.textContent = isUpgraded ? '✦ Улучшенный' : 'Обычный';
    }

    // Upgrade button state
    if (el.btnUpgradeGift) {
      if (isUpgraded) {
        el.btnUpgradeGift.style.display = 'none'; // Hide upgrade button when already upgraded
      } else {
        el.btnUpgradeGift.style.display = 'flex';
        el.btnUpgradeGift.classList.remove('already-upgraded');
        el.btnUpgradeGift.innerHTML = `<span>Улучшить</span><span class="btn-upgrade-price">25 <img src="stars-icon.png" class="btn-star-icon" alt="Stars"></span>`;
        el.btnUpgradeGift.disabled = false;
      }
    }

    // Instant Withdraw button state (only visible when upgraded)
    if (el.btnWithdrawGift) {
      el.btnWithdrawGift.style.display = isUpgraded ? 'flex' : 'none';
    }

    // Transfer button state (only visible when upgraded)
    if (el.btnTransferGift) {
      el.btnTransferGift.style.display = isUpgraded ? 'flex' : 'none';
    }

    // Show modal
    if (el.giftDetailBackdrop) el.giftDetailBackdrop.classList.add('active');
    if (el.giftDetailSheet) el.giftDetailSheet.classList.add('active');
  }

  function closeGiftDetailModal() {
    if (el.giftDetailBackdrop) el.giftDetailBackdrop.classList.remove('active');
    if (el.giftDetailSheet) el.giftDetailSheet.classList.remove('active');
    currentDetailItem = null;
  }

  function handleUpgradeGift() {
    if (!currentDetailItem || currentDetailItem.upgraded) return;

    const itemSnapshot = currentDetailItem;

    if (tg?.openInvoice) {
      tg.openInvoice(UPGRADE_INVOICE_SLUG, (status) => {
        if (status === 'paid') {
          applyUpgrade(itemSnapshot);
        } else if (status === 'cancelled') {
          showToast('Отменено', 'Оплата улучшения не была завершена');
        } else if (status === 'failed') {
          showToast('Ошибка оплаты', 'Попробуйте ещё раз');
          triggerHaptic('error');
        }
      });
    } else {
      // Fallback for browser preview
      const url = `https://t.me/$${UPGRADE_INVOICE_SLUG}`;
      if (tg?.openLink) {
        tg.openLink(url);
      } else {
        window.open(url, '_blank');
      }
      // Complete upgrade after delay in browser mode
      setTimeout(() => applyUpgrade(itemSnapshot), 1000);
    }
  }

  function applyUpgrade(item) {
    triggerHaptic('success');

    const serial = Math.floor(Math.random() * 30000) + 1;

    try {
      let userGifts = JSON.parse(localStorage.getItem('trade_user_gifts') || '[]');
      const idx = userGifts.findIndex(g => g.id === item.id);
      if (idx !== -1) {
        userGifts[idx].upgraded = true;
        userGifts[idx].serialNumber = serial;
        localStorage.setItem('trade_user_gifts', JSON.stringify(userGifts));
        currentDetailItem = userGifts[idx];
      }
    } catch (e) {}

    createConfetti();

    if (el.inventoryGiftHero) el.inventoryGiftHero.classList.add('upgraded');
    if (el.giftSerialTag) {
      el.giftSerialTag.textContent = `#${String(serial).padStart(5, '0')}`;
      el.giftSerialTag.style.display = '';
    }
    if (el.giftStatusTag) el.giftStatusTag.textContent = '✦ Улучшенный';
    if (el.btnUpgradeGift) {
      el.btnUpgradeGift.style.display = 'none';
    }
    if (el.btnWithdrawGift) {
      el.btnWithdrawGift.style.display = 'flex';
    }
    if (el.btnTransferGift) {
      el.btnTransferGift.style.display = 'flex';
    }

    renderInventory();
    showToast('Подарок улучшен! ✦', `${item.name} получил номер #${String(serial).padStart(5, '0')}`);
  }

  // Instant Withdraw for Upgraded Gifts
  function handleWithdrawGift() {
    if (!currentDetailItem || !currentDetailItem.upgraded) return;
    const item = currentDetailItem;

    if (tg?.openInvoice) {
      tg.openInvoice(WITHDRAW_INVOICE_SLUG, (status) => {
        if (status === 'paid') {
          completeWithdrawGift(item);
        } else if (status === 'cancelled') {
          showToast('Отменено', 'Оплата вывода отменена');
        } else if (status === 'failed') {
          showToast('Ошибка', 'Не удалось оплатить инвойс');
          triggerHaptic('error');
        }
      });
    } else {
      const url = `https://t.me/$${WITHDRAW_INVOICE_SLUG}`;
      if (tg?.openLink) {
        tg.openLink(url);
      } else {
        window.open(url, '_blank');
      }
      setTimeout(() => completeWithdrawGift(item), 1000);
    }
  }

  function completeWithdrawGift(item) {
    triggerHaptic('success');
    closeGiftDetailModal();
    showToast('Заявка принята', `Мгновенный вывод "${item.name}" #${String(item.serialNumber || '').padStart(5, '0')} обрабатывается.`);
  }

  function handleTransferGift() {
    triggerHaptic('light');
    showToast('Передача недоступна', 'Подарок можно передать по истечению 21 дня');
  }

  // ==================== TRADING & FUTURES ENGINE ====================
  function updateOrderSummary() {
    const margin = parseFloat(el.tradeAmountInput.value) || 0;
    const lev = STATE.selectedLeverage;
    const posSizeGram = margin * lev;
    const posSizeUsd = posSizeGram * STATE.gramPrice;
    
    el.summaryPosSize.textContent = `${formatNumber(posSizeGram, 2)} GRAM ($${formatNumber(posSizeUsd, 2)})`;

    // Estimate liquidation price
    let liqPrice = 0;
    if (STATE.selectedOrderType === 'long') {
      liqPrice = STATE.gramPrice * (1 - (0.9 / lev));
    } else {
      liqPrice = STATE.gramPrice * (1 + (0.9 / lev));
    }
    el.summaryLiqPrice.textContent = `$${formatNumber(Math.max(0, liqPrice), 4)}`;

    // Submit button label
    const typeLabel = STATE.selectedOrderType === 'long' ? 'Открыть Long ↗' : 'Открыть Short ↘';
    el.btnSubmitOrder.textContent = `${typeLabel} (${margin} GRAM)`;
    
    if (STATE.selectedOrderType === 'long') {
      el.btnSubmitOrder.className = 'order-submit-btn btn-long-submit';
    } else {
      el.btnSubmitOrder.className = 'order-submit-btn btn-short-submit';
    }
  }

  function handleOrderSubmit() {
    const margin = parseFloat(el.tradeAmountInput.value) || 0;
    
    if (margin <= 0) {
      showToast('Ошибка', 'Введите корректную сумму маржи');
      triggerHaptic('error');
      return;
    }

    if (margin > STATE.gramBalance) {
      showToast('Недостаточно средств', `У вас доступно: ${formatNumber(STATE.gramBalance, 2)} GRAM`);
      triggerHaptic('error');
      return;
    }

    // Deduct margin from available balance
    STATE.gramBalance -= margin;
    
    const newPosition = {
      id: Date.now().toString(),
      type: STATE.selectedOrderType,
      leverage: STATE.selectedLeverage,
      margin: margin,
      size: margin * STATE.selectedLeverage,
      entryPrice: STATE.gramPrice,
      timestamp: Date.now()
    };

    STATE.openPositions.unshift(newPosition);
    saveState();
    updateUI();
    
    triggerHaptic('success');
    showToast(
      'Позиция открыта!',
      `${newPosition.type.toUpperCase()} ${newPosition.leverage}x на ${margin} GRAM`
    );
  }

  function handleClosePosition(posId) {
    const index = STATE.openPositions.findIndex(p => p.id === posId);
    if (index === -1) return;

    const pos = STATE.openPositions[index];
    const pnlData = calculatePnL(pos);
    
    // Return margin + PnL to balance
    const returnedAmount = Math.max(0, pos.margin + pnlData.pnlGram);
    STATE.gramBalance += returnedAmount;
    
    STATE.openPositions.splice(index, 1);
    saveState();
    updateUI();
    
    triggerHaptic('medium');
    const sign = pnlData.pnlGram >= 0 ? '+' : '';
    showToast(
      'Позиция закрыта',
      `Результат: ${sign}${formatNumber(pnlData.pnlGram, 2)} GRAM (${sign}$${formatNumber(pnlData.pnlUsd, 2)})`
    );
  }

  function calculatePnL(pos) {
    const currentPrice = STATE.gramPrice;
    let priceDiffRatio = 0;
    
    if (pos.type === 'long') {
      priceDiffRatio = (currentPrice - pos.entryPrice) / pos.entryPrice;
    } else {
      priceDiffRatio = (pos.entryPrice - currentPrice) / pos.entryPrice;
    }

    const pnlPercent = priceDiffRatio * pos.leverage * 100;
    const pnlGram = pos.margin * (priceDiffRatio * pos.leverage);
    const pnlUsd = pnlGram * currentPrice;

    return {
      pnlPercent,
      pnlGram,
      pnlUsd
    };
  }

  function renderPositions() {
    el.positionsCount.textContent = STATE.openPositions.length;

    if (STATE.openPositions.length === 0) {
      el.positionsList.innerHTML = `
        <div class="no-positions">
          Нет открытых позиций.<br>Выберите сумму и откройте сделку Long или Short.
        </div>
      `;
      return;
    }

    el.positionsList.innerHTML = '';
    STATE.openPositions.forEach(pos => {
      const pnl = calculatePnL(pos);
      const isPositive = pnl.pnlGram >= 0;
      const sign = isPositive ? '+' : '';
      
      const card = document.createElement('div');
      card.className = 'position-card';
      card.innerHTML = `
        <div class="pos-header">
          <div class="pos-badge-group">
            <span class="pos-type-badge ${pos.type}">${pos.type.toUpperCase()}</span>
            <span class="pos-lev-badge">${pos.leverage}x</span>
            <span style="font-size: 13px; font-weight: 600;">GRAM / USDT</span>
          </div>
          <div class="pos-pnl ${isPositive ? 'positive' : 'negative'}">
            ${sign}${pnl.pnlPercent.toFixed(2)}% (${sign}${formatNumber(pnl.pnlGram, 2)} G)
          </div>
        </div>

        <div class="pos-details-grid">
          <div class="pos-detail-col">
            <span class="pos-label">Вход</span>
            <span class="pos-value">$${formatNumber(pos.entryPrice, 4)}</span>
          </div>
          <div class="pos-detail-col">
            <span class="pos-label">Маржа</span>
            <span class="pos-value">${formatNumber(pos.margin, 2)} GRAM</span>
          </div>
          <div class="pos-detail-col">
            <span class="pos-label">PnL ($)</span>
            <span class="pos-value" style="color: ${isPositive ? 'var(--accent-green)' : 'var(--accent-red)'}">
              ${sign}$${formatNumber(pnl.pnlUsd, 2)}
            </span>
          </div>
        </div>

        <button class="pos-close-btn" data-pos-id="${pos.id}">
          Закрыть позицию
        </button>
      `;

      card.querySelector('.pos-close-btn').addEventListener('click', () => {
        handleClosePosition(pos.id);
      });

      el.positionsList.appendChild(card);
    });
  }

  // ==================== REAL-TIME PRICE ENGINE & CHART ====================
  function initPriceChart() {
    generateInitialPriceHistory();
    renderCanvasChart();
  }

  function generateInitialPriceHistory() {
    const pointsCount = 45;
    let price = 1.5200;
    STATE.priceHistory = [];

    for (let i = 0; i < pointsCount; i++) {
      const delta = (Math.random() - 0.48) * 0.015;
      price = Math.max(1.42, price + delta);
      STATE.priceHistory.push(price);
    }
    // Set current price as last
    STATE.priceHistory[STATE.priceHistory.length - 1] = STATE.gramPrice;
  }

  function startPriceTickerEngine() {
    setInterval(() => {
      // Simulate micro market fluctuation
      const change = (Math.random() - 0.495) * 0.006;
      STATE.gramPrice = Math.max(1.10, STATE.gramPrice + change);
      
      // Keep price history moving
      STATE.priceHistory.push(STATE.gramPrice);
      if (STATE.priceHistory.length > 50) {
        STATE.priceHistory.shift();
      }

      // Update 24h change & stats
      STATE.priceChange24h += (Math.random() - 0.49) * 0.05;

      const minPrice = Math.min(...STATE.priceHistory);
      const maxPrice = Math.max(...STATE.priceHistory);
      if (el.statLow) el.statLow.textContent = `$${formatNumber(minPrice, 4)}`;
      if (el.statHigh) el.statHigh.textContent = `$${formatNumber(maxPrice, 4)}`;

      // Live price visual flash
      el.tradeLivePrice.classList.remove('price-up', 'price-down');
      if (change >= 0) {
        el.tradeLivePrice.classList.add('price-up');
      } else {
        el.tradeLivePrice.classList.add('price-down');
      }

      updateUI();
      renderCanvasChart();
    }, 1600);
  }

  function renderCanvasChart() {
    const canvas = el.priceChart;
    if (!canvas) return;

    // Get actual dimensions; fallback to parent container if canvas rect is 0
    let width = canvas.clientWidth || canvas.offsetWidth;
    let height = canvas.clientHeight || canvas.offsetHeight;

    if (!width || !height) {
      const container = canvas.parentElement;
      if (container) {
        width = container.clientWidth || container.offsetWidth;
        height = container.clientHeight || container.offsetHeight;
      }
    }

    if (!width || width <= 0 || !height || height <= 0) {
      return; // Still not visible or laying out
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance on mobile
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Crisp scaling reset

    ctx.clearRect(0, 0, width, height);

    const prices = STATE.priceHistory;
    if (!prices || prices.length < 2) return;

    const min = Math.min(...prices) * 0.998;
    const max = Math.max(...prices) * 1.002;
    const range = max - min || 1;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Chart points
    const stepX = width / (prices.length - 1);
    const points = prices.map((p, idx) => ({
      x: idx * stepX,
      y: height - ((p - min) / range) * (height - 30) - 15
    }));

    // Draw Area (soft subtle fill)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(36, 139, 254, 0.15)');
    gradient.addColorStop(1, 'rgba(36, 139, 254, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw crisp clean price line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#248bfe';
    ctx.lineWidth = 2;
    ctx.stroke();

    // End point indicator
    const lastPoint = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#238bfd';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ==================== EVENT LISTENERS ====================
  function setupEventListeners() {
    // Top Nav Switcher: Gifts | Wallet (Matching Image 1)
    if (el.navGiftsBtn) {
      el.navGiftsBtn.addEventListener('click', () => {
        el.navGiftsBtn.classList.add('active');
        if (el.navWalletBtn) el.navWalletBtn.classList.remove('active');
        if (el.giftsTabView) el.giftsTabView.classList.add('active');
        if (el.walletTabView) el.walletTabView.classList.remove('active');
        triggerHaptic('selection');
      });
    }

    if (el.navWalletBtn) {
      el.navWalletBtn.addEventListener('click', () => {
        el.navWalletBtn.classList.add('active');
        if (el.navGiftsBtn) el.navGiftsBtn.classList.remove('active');
        if (el.walletTabView) el.walletTabView.classList.add('active');
        if (el.giftsTabView) el.giftsTabView.classList.remove('active');
        triggerHaptic('selection');
      });
    }

    // Gifts Subnav (Catalog | Inventory)
    if (el.subnavCatalogBtn) {
      el.subnavCatalogBtn.addEventListener('click', () => {
        el.subnavCatalogBtn.classList.add('active');
        if (el.subnavInventoryBtn) el.subnavInventoryBtn.classList.remove('active');
        if (el.giftsCatalogSection) el.giftsCatalogSection.style.display = 'block';
        if (el.giftsInventorySection) el.giftsInventorySection.style.display = 'none';
        triggerHaptic('selection');
      });
    }

    if (el.subnavInventoryBtn) {
      el.subnavInventoryBtn.addEventListener('click', () => {
        el.subnavInventoryBtn.classList.add('active');
        if (el.subnavCatalogBtn) el.subnavCatalogBtn.classList.remove('active');
        if (el.giftsCatalogSection) el.giftsCatalogSection.style.display = 'none';
        if (el.giftsInventorySection) el.giftsInventorySection.style.display = 'block';
        renderInventory();
        triggerHaptic('selection');
      });
    }

    if (el.btnGoToShop) {
      el.btnGoToShop.addEventListener('click', () => {
        if (el.subnavCatalogBtn) el.subnavCatalogBtn.click();
      });
    }

    // Gift Buy Modal Listeners (Matching Image 3)
    if (el.btnCloseGiftBuy) el.btnCloseGiftBuy.addEventListener('click', closeGiftBuyModal);
    if (el.giftBuyBackdrop) {
      el.giftBuyBackdrop.addEventListener('click', (e) => {
        if (e.target === el.giftBuyBackdrop) closeGiftBuyModal();
      });
    }
    if (el.btnConfirmBuyGift) el.btnConfirmBuyGift.addEventListener('click', handleConfirmBuyGift);
    if (el.btnSpotlightPreview) {
      el.btnSpotlightPreview.addEventListener('click', () => {
        triggerHaptic('light');
        if (selectedGiftForBuy) {
          showToast(selectedGiftForBuy.name, `Стоимость: ${selectedGiftForBuy.price} ⭐️ (Обмен: ${selectedGiftForBuy.exchange} ⭐️)`);
        }
      });
    }

    // Gift Detail / Upgrade / Transfer Modal
    if (el.btnCloseGiftDetail) el.btnCloseGiftDetail.addEventListener('click', closeGiftDetailModal);
    if (el.giftDetailBackdrop) {
      el.giftDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === el.giftDetailBackdrop) closeGiftDetailModal();
      });
    }
    if (el.btnUpgradeGift) el.btnUpgradeGift.addEventListener('click', handleUpgradeGift);
    if (el.btnWithdrawGift) el.btnWithdrawGift.addEventListener('click', handleWithdrawGift);
    if (el.btnTransferGift) el.btnTransferGift.addEventListener('click', handleTransferGift);

    // Bottom Sheet: Add Funds / Top Up
    if (el.btnOpenAddFunds) el.btnOpenAddFunds.addEventListener('click', openAddFunds);
    if (el.btnCloseAddFunds) el.btnCloseAddFunds.addEventListener('click', closeAddFunds);
    if (el.addFundsBackdrop) {
      el.addFundsBackdrop.addEventListener('click', (e) => {
        if (e.target === el.addFundsBackdrop) closeAddFunds();
      });
    }
    if (el.btnSubmitTopUp) el.btnSubmitTopUp.addEventListener('click', handleTopUpSubmit);

    // Promo Welcome Bonus Modal
    if (el.btnClaimPromo) {
      el.btnClaimPromo.addEventListener('click', () => {
        if (el.promoBackdrop) el.promoBackdrop.classList.remove('active');
        openAddFunds();
      });
    }
    if (el.btnClosePromo) {
      el.btnClosePromo.addEventListener('click', () => {
        if (el.promoBackdrop) el.promoBackdrop.classList.remove('active');
      });
    }
    if (el.promoBackdrop) {
      el.promoBackdrop.addEventListener('click', (e) => {
        if (e.target === el.promoBackdrop) el.promoBackdrop.classList.remove('active');
      });
    }

    // Trade Navigation
    if (el.btnOpenTrade) el.btnOpenTrade.addEventListener('click', openTradeScreen);
    if (el.marketTickerCard) el.marketTickerCard.addEventListener('click', openTradeScreen);
    if (el.btnBackFromTrade) el.btnBackFromTrade.addEventListener('click', closeTradeScreen);

    // Order Long/Short Tabs
    el.tabLongBtn.addEventListener('click', () => {
      STATE.selectedOrderType = 'long';
      el.tabLongBtn.className = 'order-tab-btn active tab-long';
      el.tabShortBtn.className = 'order-tab-btn tab-short';
      triggerHaptic('light');
      updateOrderSummary();
    });

    el.tabShortBtn.addEventListener('click', () => {
      STATE.selectedOrderType = 'short';
      el.tabShortBtn.className = 'order-tab-btn active tab-short';
      el.tabLongBtn.className = 'order-tab-btn tab-long';
      triggerHaptic('light');
      updateOrderSummary();
    });

    // Leverage Selection
    document.querySelectorAll('.lev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lev-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.selectedLeverage = parseInt(btn.getAttribute('data-lev'), 10);
        el.selectedLevDisplay.textContent = `${STATE.selectedLeverage}x`;
        triggerHaptic('selection');
        updateOrderSummary();
      });
    });

    // Percentage Quick Buttons
    document.querySelectorAll('.pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseInt(btn.getAttribute('data-pct'), 10);
        const calculated = (STATE.gramBalance * (pct / 100)).toFixed(2);
        el.tradeAmountInput.value = calculated;
        triggerHaptic('selection');
        updateOrderSummary();
      });
    });

    // Margin Input Change
    el.tradeAmountInput.addEventListener('input', updateOrderSummary);

    // Submit Order
    el.btnSubmitOrder.addEventListener('click', handleOrderSubmit);

    // Timeframes
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.activeTimeframe = btn.getAttribute('data-tf');
        triggerHaptic('selection');
        generateInitialPriceHistory();
        renderCanvasChart();
      });
    });

    // Resize handler for chart
    window.addEventListener('resize', renderCanvasChart);
  }

  // Sheet Controls
  function openAddFunds() {
    triggerHaptic('light');
    el.addFundsBackdrop.classList.add('active');
    el.addFundsSheet.classList.add('active');
  }

  function closeAddFunds() {
    el.addFundsBackdrop.classList.remove('active');
    el.addFundsSheet.classList.remove('active');
  }

  // Trade Screen Controls
  function openTradeScreen() {
    triggerHaptic('medium');
    el.tradeScreen.classList.add('active');
    
    // Multiple delayed renders so canvas picks up full dimensions as slide-in transition finishes
    requestAnimationFrame(renderCanvasChart);
    setTimeout(renderCanvasChart, 100);
    setTimeout(renderCanvasChart, 300);
    setTimeout(renderCanvasChart, 450);
  }

  function closeTradeScreen() {
    triggerHaptic('light');
    el.tradeScreen.classList.remove('active');
  }

  // ==================== HELPERS & EFFECTS ====================
  function triggerHaptic(type) {
    if (!tg?.HapticFeedback) return;
    try {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (type === 'light' || type === 'medium' || type === 'heavy') {
        tg.HapticFeedback.impactOccurred(type);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      }
    } catch (e) {}
  }

  function showToast(title, desc) {
    el.toastTitle.textContent = title;
    el.toastDesc.textContent = desc;
    el.toast.classList.add('active');

    setTimeout(() => {
      el.toast.classList.remove('active');
    }, 3200);
  }

  function createConfetti() {
    el.confettiOverlay.innerHTML = '';
    const colors = ['#238bfd', '#00d084', '#ffc107', '#ff4757', '#bce1ff', '#ffffff'];

    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = `${Math.random() * 8 + 6}px`;
      piece.style.height = `${Math.random() * 10 + 6}px`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.animationDuration = `${Math.random() * 1.5 + 1.8}s`;

      el.confettiOverlay.appendChild(piece);
    }

    setTimeout(() => {
      el.confettiOverlay.innerHTML = '';
    }, 3000);
  }

  // Start on load
  document.addEventListener('DOMContentLoaded', init);
})();
