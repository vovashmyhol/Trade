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

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const prices = STATE.priceHistory;
    if (prices.length < 2) return;

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

    // Draw crisp clean price line (no blur/glow)
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
    setTimeout(renderCanvasChart, 50);
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
