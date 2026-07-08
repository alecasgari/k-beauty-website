/**
 * K-Beauty Academy — Main JavaScript
 * Mobile menu, certificate verification, contact form
 */

(function () {
  'use strict';

  const TELEGRAM_BOT_URL = 'https://t.me/nadplus_webinar_bot';
  const TELEGRAM_CHANNEL_URL = 'https://t.me/kbeauty_academy';
  const CONTACT_WEBHOOK_URL = 'https://n8n.alecasgari.com/webhook/83a059c5-7260-4956-9d4c-40442611c076';
  const CERT_LOOKUP_WEBHOOK_URL = 'https://n8n.alecasgari.com/webhook/kbeauty-certificate-lookup';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  /* --- DOM Ready --- */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initAnalytics();
    initUtmCapture();
    initMobileMenu();
    initNavDropdowns();
    initHeaderScroll();
    initActiveNav();
    initVerifyForm();
    initContactForm();
    initProductCatalogDownloads();
    initGrowthFactorTooltips();
    initMobileDock();
    initTelegramDockModal();
    setTelegramLinks();
    setTelegramChannelLinks();
  }

  /* --- Growth Factor Tooltips (AGF39) --- */
  function initGrowthFactorTooltips() {
    var container = document.getElementById('growth-factors');
    var panel = document.getElementById('growth-factor-panel');
    if (!container || !panel) return;

    var abbrEl = document.getElementById('growth-factor-abbr');
    var nameEl = document.getElementById('growth-factor-name');
    var descEl = document.getElementById('growth-factor-desc');
    var buttons = container.querySelectorAll('[data-factor]');
    var activeFactor = null;

    var FACTORS = {
      'VEGF': {
        abbr: 'Vascular Endothelial Growth Factor',
        name: 'فاکتور رشد اندوتلیال عروقی',
        desc: 'رگ‌سازی اطراف فولیکول مو را تحریک می‌کند و خون‌رسانی بهتر به ریشه مو را فراهم می‌آورد.'
      },
      'IGF-1': {
        abbr: 'Insulin-like Growth Factor-1',
        name: 'فاکتور رشد شبه انسولین نوع ۱',
        desc: 'فاز رشد مو (آناژن) را طولانی‌تر می‌کند و به تقویت و ضخیم‌تر شدن تار مو کمک می‌کند.'
      },
      'FGF-2': {
        abbr: 'Fibroblast Growth Factor-2',
        name: 'فاکتور رشد فیبروبلاست نوع ۲',
        desc: 'تکثیر سلول‌های درم و ترمیم بافت اطراف فولیکول را پشتیبانی می‌کند و محیط رشد مو را بهبود می‌دهد.'
      },
      'KGF': {
        abbr: 'Keratinocyte Growth Factor (FGF-7)',
        name: 'فاکتور رشد کراتینوسیت',
        desc: 'به رشد و تمایز سلول‌های اپیتلیال فولیکول کمک می‌کند و در بازسازی پوست و مو نقش دارد.'
      },
      'PDGF': {
        abbr: 'Platelet-Derived Growth Factor',
        name: 'فاکتور رشد مشتق از پلاکت',
        desc: 'سلول‌های پشتیبان فولیکول را فعال می‌کند و در ترمیم و تحریک رشد ساختار ریشه مو مؤثر است.'
      },
      'TGF-β': {
        abbr: 'Transforming Growth Factor-Beta',
        name: 'فاکتور رشد تغییردهنده بتا',
        desc: 'تنظیم‌کننده مهم چرخه مو و بازسازی بافت است و تعادل سیگنال‌های رشد در فولیکول را حفظ می‌کند.'
      },
      'EGF': {
        abbr: 'Epidermal Growth Factor',
        name: 'فاکتور رشد اپیدرمی',
        desc: 'تقسیم و بازسازی سلول‌های پوست و فولیکول را تحریک می‌کند و روند ترمیم و سلامت پوست سر را بهبود می‌دهد.'
      }
    };

    function closePanel() {
      activeFactor = null;
      panel.hidden = true;
      buttons.forEach(function (btn) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-expanded', 'false');
      });
    }

    function openFactor(factorKey) {
      var data = FACTORS[factorKey];
      if (!data) return;

      activeFactor = factorKey;
      if (abbrEl) abbrEl.textContent = data.abbr;
      if (nameEl) nameEl.textContent = data.name;
      if (descEl) descEl.textContent = data.desc;
      panel.hidden = false;

      buttons.forEach(function (btn) {
        var isActive = btn.getAttribute('data-factor') === factorKey;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var factorKey = btn.getAttribute('data-factor');
        if (activeFactor === factorKey) {
          closePanel();
          return;
        }
        openFactor(factorKey);
      });
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.addEventListener('click', function () {
      if (activeFactor) closePanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && activeFactor) closePanel();
    });
  }

  /* --- Mobile Bottom Dock --- */
  function initMobileDock() {
    if (document.querySelector('.mobile-dock')) return;

    var page = window.location.pathname.split('/').pop() || 'index.html';
    var isVerify = page === 'verify.html';
    var isAcademy = page === 'academy.html';
    var isContact = page === 'contact.html';

    var icons = {
      verify: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12.5l2 2 4.5-4.5"/><path d="M12 3.5l7.5 3.75V12c0 4.35-3 7.55-7.5 8.25C7.5 19.55 4.5 16.35 4.5 12V7.25L12 3.5z"/></svg>',
      academy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>',
      contact: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z"/><path d="M4 7l8 6 8-6"/></svg>',
      telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 4.5L3.5 11.5l5 2 2 5.5 2.5-3.5 4.5 4.5 3.5-15.5z"/><path d="M8.5 13.5l7 4"/></svg>'
    };

    var dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'میانبرهای موبایل');
    dock.innerHTML =
      '<a href="verify.html" class="mobile-dock__item' + (isVerify ? ' mobile-dock__item--active' : '') + '">' +
        '<span class="mobile-dock__icon">' + icons.verify + '</span>' +
        '<span class="mobile-dock__label">استعلام</span>' +
      '</a>' +
      '<a href="academy.html" class="mobile-dock__item' + (isAcademy ? ' mobile-dock__item--active' : '') + '">' +
        '<span class="mobile-dock__icon">' + icons.academy + '</span>' +
        '<span class="mobile-dock__label">وبینارها</span>' +
      '</a>' +
      '<a href="contact.html" class="mobile-dock__item' + (isContact ? ' mobile-dock__item--active' : '') + '">' +
        '<span class="mobile-dock__icon">' + icons.contact + '</span>' +
        '<span class="mobile-dock__label">تماس</span>' +
      '</a>' +
      '<button type="button" class="mobile-dock__item" data-telegram-dock aria-haspopup="dialog">' +
        '<span class="mobile-dock__icon">' + icons.telegram + '</span>' +
        '<span class="mobile-dock__label">تلگرام</span>' +
      '</button>';

    document.body.appendChild(dock);
    document.body.classList.add('has-mobile-dock');
  }

  function initTelegramDockModal() {
    if (document.getElementById('telegram-dock-modal')) return;

    var modal = document.createElement('div');
    modal.className = 'telegram-dock-modal';
    modal.id = 'telegram-dock-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'telegram-dock-modal-title');
    modal.hidden = true;
    modal.innerHTML =
      '<div class="telegram-dock-modal__backdrop" data-telegram-modal-close></div>' +
      '<div class="telegram-dock-modal__panel">' +
        '<h2 class="telegram-dock-modal__title" id="telegram-dock-modal-title">تلگرام کی‌بیوتی</h2>' +
        '<p class="telegram-dock-modal__text">کدام را می‌خواهید باز کنید؟</p>' +
        '<div class="telegram-dock-modal__actions">' +
          '<a href="' + TELEGRAM_BOT_URL + '" class="telegram-dock-modal__option" target="_blank" rel="noopener noreferrer" data-telegram-choice="bot">' +
            '<span class="telegram-dock-modal__option-icon" aria-hidden="true">🤖</span>' +
            '<span class="telegram-dock-modal__option-text"><strong>ربات تلگرام</strong><small>ثبت‌نام وبینار و گواهینامه</small></span>' +
          '</a>' +
          '<a href="' + TELEGRAM_CHANNEL_URL + '" class="telegram-dock-modal__option" target="_blank" rel="noopener noreferrer" data-telegram-choice="channel">' +
            '<span class="telegram-dock-modal__option-icon" aria-hidden="true">📢</span>' +
            '<span class="telegram-dock-modal__option-text"><strong>کانال تلگرام</strong><small>اخبار و اطلاعیه‌ها</small></span>' +
          '</a>' +
        '</div>' +
        '<button type="button" class="telegram-dock-modal__close" data-telegram-modal-close>بستن</button>' +
      '</div>';

    document.body.appendChild(modal);

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-telegram-dock]');
      if (trigger) {
        e.preventDefault();
        openTelegramDockModal();
        return;
      }

      if (e.target.closest('[data-telegram-modal-close]')) {
        closeTelegramDockModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) {
        closeTelegramDockModal();
      }
    });

    modal.querySelectorAll('[data-telegram-choice]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.kbAnalytics) {
          window.kbAnalytics.trackCtaClick({
            cta_name: link.getAttribute('data-telegram-choice') === 'channel' ? 'telegram_channel' : 'telegram_bot',
            cta_text: link.querySelector('strong').textContent,
            link_url: link.href
          });
        }
        closeTelegramDockModal();
      });
    });
  }

  function openTelegramDockModal() {
    var modal = document.getElementById('telegram-dock-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('telegram-dock-modal-open');
    var firstLink = modal.querySelector('.telegram-dock-modal__option');
    if (firstLink) firstLink.focus();
  }

  function closeTelegramDockModal() {
    var modal = document.getElementById('telegram-dock-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('telegram-dock-modal-open');
  }

  /* --- Analytics (GTM dataLayer) --- */
  function initAnalytics() {
    if (!window.kbAnalytics) return;

    window.kbAnalytics.trackPageView();
    initCtaTracking();
    initOutboundTracking();
  }

  function initCtaTracking() {
    document.addEventListener('click', function (e) {
      if (!window.kbAnalytics) return;

      var telegramEl = e.target.closest('[data-telegram]');
      if (telegramEl) {
        window.kbAnalytics.trackCtaClick({
          cta_name: 'telegram_bot',
          cta_text: (telegramEl.textContent || '').trim(),
          link_url: telegramEl.href || ''
        });
        return;
      }

      var channelEl = e.target.closest('[data-telegram-channel]');
      if (channelEl) {
        window.kbAnalytics.trackCtaClick({
          cta_name: 'telegram_channel',
          cta_text: (channelEl.textContent || '').trim(),
          link_url: channelEl.href || ''
        });
        return;
      }

      var cta = e.target.closest('a.btn--primary[href]');
      if (!cta) return;

      var href = cta.getAttribute('href') || '';
      if (href.indexOf('academy.html') === -1 && href.indexOf('t.me') === -1) return;

      window.kbAnalytics.trackCtaClick({
        cta_name: href.indexOf('t.me') !== -1 ? 'telegram_register' : 'academy_registration',
        cta_text: (cta.textContent || '').trim(),
        link_url: cta.href || href
      });
    });
  }

  function initOutboundTracking() {
    document.addEventListener('click', function (e) {
      if (!window.kbAnalytics) return;

      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
      if (link.hasAttribute('data-telegram')) return;
      if (link.hasAttribute('data-telegram-channel')) return;
      if (link.closest('.article-share')) return;

      var url;
      try {
        url = new URL(href, window.location.origin);
      } catch (err) {
        return;
      }

      if (url.hostname === window.location.hostname) return;

      window.kbAnalytics.trackOutboundClick(url.href, (link.textContent || '').trim());
    });
  }

  /* --- Mobile Menu --- */
  function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.mobile-nav');
    const panel = document.querySelector('.mobile-nav-panel');
    const links = document.querySelectorAll('.mobile-nav a');

    if (!toggle || !overlay) return;

    function openMenu() {
      toggle.classList.add('active');
      overlay.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      toggle.classList.remove('active');
      overlay.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (overlay.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeMenu();
    });

    links.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  /* --- Header Scroll Effect --- */
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          header.classList.toggle('scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* --- Nav Dropdowns --- */
  function initNavDropdowns() {
    document.querySelectorAll('.nav-dropdown__toggle').forEach(function (toggle) {
      var dropdown = toggle.closest('.nav-dropdown');
      if (!dropdown) return;

      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.nav-dropdown.open').forEach(function (item) {
          if (item !== dropdown) {
            item.classList.remove('open');
            var otherToggle = item.querySelector('.nav-dropdown__toggle');
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        });
        dropdown.classList.toggle('open', !isOpen);
        toggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });

    document.addEventListener('click', function () {
      document.querySelectorAll('.nav-dropdown.open').forEach(function (dropdown) {
        dropdown.classList.remove('open');
        var toggle = dropdown.querySelector('.nav-dropdown__toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.querySelectorAll('.mobile-nav-group__toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var group = toggle.closest('.mobile-nav-group');
        if (!group) return;
        var isOpen = group.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  /* --- Active Navigation Highlight --- */
  function initActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const productPages = ['novanad.html', 'pncell.html', 'agf39.html'];
    const navLinks = document.querySelectorAll(
      '.main-nav a, .mobile-nav a, .nav-dropdown__menu a, .mobile-nav-sub a'
    );

    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });

    if (productPages.indexOf(currentPage) !== -1) {
      document.querySelectorAll('.nav-dropdown__toggle, .mobile-nav-group__toggle').forEach(function (el) {
        el.classList.add('active');
      });

      var mobileGroup = document.querySelector('.mobile-nav-group');
      if (mobileGroup) {
        mobileGroup.classList.add('open');
        var mobileToggle = mobileGroup.querySelector('.mobile-nav-group__toggle');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
      }
    }
  }

  /* --- Certificate Verification --- */
  function initVerifyForm() {
    const form = document.getElementById('verify-form');
    const resultEl = document.getElementById('verify-result');
    const submitBtn = document.getElementById('verify-submit');
    const input = document.getElementById('cert-code');

    if (!form || !resultEl) return;

    prefillCertFromUrl(input);

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const certNo = input.value.trim();

      if (!certNo) {
        showVerifyResult(resultEl, false, 'لطفاً کد گواهینامه را وارد کنید.');
        if (window.kbAnalytics) {
          window.kbAnalytics.trackFormError('certificate', 'validation', 'empty_cert_code');
        }
        return;
      }

      if (window.kbAnalytics) {
        window.kbAnalytics.trackFormStart('certificate');
      }

      setVerifyLoading(form, submitBtn, true);
      hideVerifyResult(resultEl);

      fetch(CERT_LOOKUP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certNo: certNo })
      })
        .then(function (response) {
          return response.text().then(function (text) {
            var data = {};

            try {
              data = text ? JSON.parse(text) : {};
            } catch (err) {
              throw new Error('invalid_json');
            }

            if (Array.isArray(data)) {
              data = data[0] || {};
            }

            if (!response.ok && !data.valid && !data.message) {
              throw new Error('server');
            }

            return data;
          });
        })
        .then(function (data) {
          if (data.valid) {
            showVerifyResult(resultEl, true, null, data);
            if (window.kbAnalytics) {
              window.kbAnalytics.trackCertificateVerify('valid');
            }
          } else {
            showVerifyResult(resultEl, false, data.message || 'کد گواهینامه یافت نشد');
            if (window.kbAnalytics) {
              window.kbAnalytics.trackCertificateVerify('invalid');
            }
          }
        })
        .catch(function (err) {
          if (window.kbAnalytics) {
            window.kbAnalytics.trackCertificateVerify('error');
          }
          var isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isLocal) {
            showVerifyResult(resultEl, false, 'خطا در اتصال به سرور (احتمالاً CORS). از k-beauty.academy تست کنید یا CORS در n8n را * بگذارید.');
          } else {
            showVerifyResult(resultEl, false, 'خطا در استعلام. لطفاً چند لحظه بعد دوباره تلاش کنید.');
          }
        })
        .finally(function () {
          setVerifyLoading(form, submitBtn, false);
        });
    });
  }

  function prefillCertFromUrl(input) {
    if (!input) return;

    var params = new URLSearchParams(window.location.search);
    var certFromUrl = params.get('cert') || params.get('code') || params.get('certNo');

    if (!certFromUrl) return;

    certFromUrl = certFromUrl.trim();
    if (!certFromUrl) return;

    input.value = certFromUrl;

    if (params.get('auto') === '1') {
      input.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }

  function setVerifyLoading(form, submitBtn, isLoading) {
    const input = document.getElementById('cert-code');
    if (form) form.classList.toggle('verify-form--loading', isLoading);
    if (input) input.disabled = isLoading;
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'در حال بررسی...' : 'بررسی اعتبار';
    }
  }

  function hideVerifyResult(el) {
    el.classList.remove('show', 'verify-result--success', 'verify-result--error', 'verify-result--loading');
    el.innerHTML = '';
  }

  function showVerifyResult(el, success, errorMsg, cert) {
    el.classList.remove('show', 'verify-result--success', 'verify-result--error', 'verify-result--loading');
    el.innerHTML = '';

    void el.offsetWidth;

    if (success && cert) {
      el.className = 'verify-result verify-result--success';
      el.innerHTML =
        '<h3>✓ گواهینامه معتبر است</h3>' +
        '<dl class="cert-details">' +
        '<dt>نام</dt><dd>' + escapeHtml(cert.name || '—') + '</dd>' +
        '<dt>وبینار</dt><dd>' + escapeHtml(cert.webinar || '—') + '</dd>' +
        '<dt>وضعیت</dt><dd>' + escapeHtml(cert.status || '—') + '</dd>' +
        '<dt>کد گواهینامه</dt><dd style="direction:ltr;text-align:right">' + escapeHtml(cert.certNo || '—') + '</dd>' +
        '</dl>' +
        '<span class="cert-badge">' + escapeHtml(cert.webinar || 'کی‌بیوتی آکادمی') + '</span>';
    } else {
      el.className = 'verify-result verify-result--error';
      el.innerHTML = '<h3>✕ ' + escapeHtml(errorMsg) + '</h3>';
    }

    requestAnimationFrame(function () {
      el.classList.add('show');
    });
  }

  /* --- UTM Capture --- */
  function initUtmCapture() {
    const params = new URLSearchParams(window.location.search);

    UTM_KEYS.forEach(function (key) {
      const value = params.get(key);
      if (value) {
        sessionStorage.setItem(key, value);
      }
    });

    if (UTM_KEYS.some(function (key) { return params.get(key); })) {
      sessionStorage.setItem('utm_landing_page', window.location.href);
      sessionStorage.setItem('utm_captured_at', new Date().toISOString());
    }
  }

  function getUtmParams() {
    const utm = {};

    UTM_KEYS.forEach(function (key) {
      const value = sessionStorage.getItem(key);
      if (value) {
        utm[key] = value;
      }
    });

    const landingPage = sessionStorage.getItem('utm_landing_page');
    const capturedAt = sessionStorage.getItem('utm_captured_at');

    if (landingPage) utm.utm_landing_page = landingPage;
    if (capturedAt) utm.utm_captured_at = capturedAt;

    utm.submit_page = window.location.href;
    utm.referrer = document.referrer || '';

    return utm;
  }

  /* --- Product Catalog Downloads --- */
  function initProductCatalogDownloads() {
    document.querySelectorAll('.product-catalog-btn').forEach(function (link) {
      link.addEventListener('click', function () {
        if (!window.kbAnalytics) return;

        var fileName = link.getAttribute('download') || '';
        if (!fileName) {
          var parts = (link.getAttribute('href') || '').split('/');
          fileName = parts[parts.length - 1] || 'catalog.pdf';
        }

        window.kbAnalytics.trackFileDownload(fileName, link.getAttribute('data-product') || '');
      });
    });
  }

  /* --- Contact Form --- */
  const PERSIAN_TEXT_PATTERN = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u200c]/g;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const IRAN_MOBILE_PATTERN = /^09\d{9}$/;

  function normalizeDigits(value) {
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    let result = value || '';

    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(persian[i], 'g'), String(i));
      result = result.replace(new RegExp(arabic[i], 'g'), String(i));
    }

    return result.replace(/\D/g, '');
  }

  function sanitizePersianText(value, maxLength) {
    let text = (value || '').replace(PERSIAN_TEXT_PATTERN, '');
    if (maxLength && text.length > maxLength) {
      text = text.slice(0, maxLength);
    }
    return text;
  }

  function isValidEmail(value) {
    return EMAIL_PATTERN.test((value || '').trim());
  }

  function isIranMobile(value) {
    return IRAN_MOBILE_PATTERN.test(normalizeDigits(value));
  }

  function showFieldError(groupId, errorId, message) {
    const group = document.getElementById(groupId);
    const error = document.getElementById(errorId);

    if (group) group.classList.add('is-invalid');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }

  function clearFieldError(groupId, errorId) {
    const group = document.getElementById(groupId);
    const error = document.getElementById(errorId);

    if (group) group.classList.remove('is-invalid');
    if (error) {
      error.textContent = '';
      error.hidden = true;
    }
  }

  function clearContactFormErrors(form) {
    form.querySelectorAll('.form-group.is-invalid, fieldset.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
    form.querySelectorAll('.form-error').forEach(function (el) {
      el.textContent = '';
      el.hidden = true;
    });
  }

  function bindPersianInput(input, maxLength) {
    if (!input) return;

    input.addEventListener('input', function () {
      const sanitized = sanitizePersianText(input.value, maxLength);
      if (sanitized !== input.value) {
        input.value = sanitized;
      }
      const group = input.closest('.form-group');
      if (group && group.id) {
        clearFieldError(group.id, input.id + '-error');
      }
    });
  }

  function bindPhoneInput(input) {
    if (!input) return;

    input.addEventListener('input', function () {
      let digits = normalizeDigits(input.value).slice(0, 11);
      if (digits.length > 0 && digits[0] !== '0') {
        digits = '';
      } else if (digits.length > 1 && digits[1] !== '9') {
        digits = digits.slice(0, 1);
      }

      input.value = digits;
      clearFieldError('phone-group', 'phone-error');
    });
  }

  function getSelectedProducts(form) {
    return Array.from(form.querySelectorAll('[name="products"]:checked')).map(function (el) {
      return el.value;
    });
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const specialtySelect = form.querySelector('[name="specialty"]');
    const otherGroup = document.getElementById('specialty-other-group');
    const otherInput = form.querySelector('[name="specialty_other"]');
    const submitBtn = document.getElementById('contact-submit');
    const messageInput = form.querySelector('[name="message"]');
    const messageCount = document.getElementById('message-count');
    const emailInput = form.querySelector('[name="email"]');
    const emailConfirmInput = form.querySelector('[name="email_confirm"]');
    let formStarted = false;

    function trackContactStartOnce() {
      if (formStarted || !window.kbAnalytics) return;
      formStarted = true;
      window.kbAnalytics.trackFormStart('contact');
    }

    bindPersianInput(form.querySelector('[name="full_name"]'), 150);
    bindPersianInput(form.querySelector('[name="center_name"]'), 150);
    bindPersianInput(form.querySelector('[name="city"]'), 100);
    bindPersianInput(otherInput, 150);
    bindPhoneInput(form.querySelector('[name="phone"]'));

    if (specialtySelect && otherGroup && otherInput) {
      specialtySelect.addEventListener('change', function () {
        const isOther = specialtySelect.value === 'سایر';
        otherGroup.hidden = !isOther;
        otherInput.required = isOther;

        if (!isOther) {
          otherInput.value = '';
        }

        clearFieldError('specialty-group', 'specialty-error');
        clearFieldError('specialty-other-group', 'specialty_other-error');
      });
    }

    if (messageInput && messageCount) {
      messageInput.addEventListener('input', function () {
        if (messageInput.value.length > 300) {
          messageInput.value = messageInput.value.slice(0, 300);
        }
        messageCount.textContent = String(messageInput.value.length);
      });
    }

    function validateEmailMatch() {
      const email = emailInput.value.trim();
      const confirm = emailConfirmInput.value.trim();
      let valid = true;

      clearFieldError('email-group', 'email-error');
      clearFieldError('email-confirm-group', 'email_confirm-error');

      if (!email) {
        showFieldError('email-group', 'email-error', 'لطفاً آدرس ایمیل را وارد کنید.');
        valid = false;
      } else if (!isValidEmail(email)) {
        showFieldError('email-group', 'email-error', 'فرمت ایمیل معتبر نیست.');
        valid = false;
      }

      if (!confirm) {
        showFieldError('email-confirm-group', 'email_confirm-error', 'لطفاً تکرار ایمیل را وارد کنید.');
        valid = false;
      } else if (email && confirm && email !== confirm) {
        showFieldError('email-confirm-group', 'email_confirm-error', 'ایمیل و تکرار آن یکسان نیستند.');
        valid = false;
      }

      return valid;
    }

    emailInput.addEventListener('blur', validateEmailMatch);
    emailConfirmInput.addEventListener('blur', validateEmailMatch);

    form.querySelectorAll('[name="products"]').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        clearFieldError('products-group', 'products-error');
      });
    });

    form.addEventListener('focusin', trackContactStartOnce);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearContactFormErrors(form);

      const honeypot = form.querySelector('[name="website"]').value.trim();
      if (honeypot) {
        return;
      }

      const fullName = sanitizePersianText(form.querySelector('[name="full_name"]').value.trim(), 150);
      const centerName = sanitizePersianText(form.querySelector('[name="center_name"]').value.trim(), 150);
      const city = sanitizePersianText(form.querySelector('[name="city"]').value.trim(), 100);
      const email = emailInput.value.trim();
      const emailConfirm = emailConfirmInput.value.trim();
      const specialty = specialtySelect.value;
      const specialtyOther = sanitizePersianText(otherInput.value.trim(), 150);
      const phone = normalizeDigits(form.querySelector('[name="phone"]').value.trim());
      const message = (messageInput.value || '').trim().slice(0, 300);
      const products = getSelectedProducts(form);
      let hasError = false;

      if (!fullName) {
        showFieldError('full-name-group', 'full_name-error', 'لطفاً نام کامل را وارد کنید.');
        hasError = true;
      } else if (!/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u200c]+$/.test(fullName)) {
        showFieldError('full-name-group', 'full_name-error', 'فقط حروف فارسی مجاز است.');
        hasError = true;
      }

      if (!centerName) {
        showFieldError('center-name-group', 'center_name-error', 'لطفاً نام مرکز درمانی را وارد کنید.');
        hasError = true;
      } else if (!/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u200c]+$/.test(centerName)) {
        showFieldError('center-name-group', 'center_name-error', 'فقط حروف فارسی مجاز است.');
        hasError = true;
      }

      if (!city) {
        showFieldError('city-group', 'city-error', 'لطفاً شهر را وارد کنید.');
        hasError = true;
      } else if (!/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u200c]+$/.test(city)) {
        showFieldError('city-group', 'city-error', 'فقط حروف فارسی مجاز است.');
        hasError = true;
      }

      if (!validateEmailMatch()) {
        hasError = true;
      }

      if (!emailConfirm) {
        hasError = true;
      }

      if (!specialty) {
        showFieldError('specialty-group', 'specialty-error', 'لطفاً تخصص خود را انتخاب کنید.');
        hasError = true;
      }

      if (specialty === 'سایر' && !specialtyOther) {
        showFieldError('specialty-other-group', 'specialty_other-error', 'لطفاً تخصص خود را بنویسید.');
        hasError = true;
      }

      if (!phone) {
        showFieldError('phone-group', 'phone-error', 'لطفاً شماره تماس را وارد کنید.');
        hasError = true;
      } else if (!isIranMobile(phone)) {
        showFieldError('phone-group', 'phone-error', 'شماره باید ۱۱ رقم و با 09 شروع شود.');
        hasError = true;
      }

      if (!products.length) {
        showFieldError('products-group', 'products-error', 'حداقل یک محصول را انتخاب کنید.');
        hasError = true;
      }

      if (hasError) {
        if (window.kbAnalytics) {
          window.kbAnalytics.trackFormError('contact', 'validation', 'form_validation_failed');
        }
        return;
      }

      trackContactStartOnce();

      const specialtyDetail = specialty === 'سایر' ? specialtyOther : specialty;
      const payload = {
        full_name: fullName,
        name: fullName,
        center_name: centerName,
        city: city,
        email: email,
        email_confirm: emailConfirm,
        specialty: specialty,
        specialty_detail: specialtyDetail,
        phone: phone,
        products: products,
        message: message,
        website: honeypot,
        submitted_at: new Date().toISOString(),
        ...getUtmParams()
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'در حال ارسال...';
      }

      fetch(CONTACT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Request failed');
          }
          showContactSuccess(payload);
          if (window.kbAnalytics) {
            window.kbAnalytics.trackFormSubmit('contact', {
              specialty: specialty,
              products: products.join(', ')
            });
            window.kbAnalytics.trackConversion('contact_form');
          }
        })
        .catch(function () {
          showToast('ارسال با خطا مواجه شد. لطفاً دوباره تلاش کنید.', false);
          if (window.kbAnalytics) {
            window.kbAnalytics.trackFormError('contact', 'network', 'submit_failed');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'ارسال درخواست';
          }
        });
    });
  }

  function showContactSuccess(data) {
    const wrapper = document.getElementById('contact-form-wrapper');
    const success = document.getElementById('contact-success');
    const title = document.getElementById('contact-success-title');
    const lead = document.getElementById('contact-success-lead');
    const summary = document.getElementById('contact-success-summary');

    if (wrapper) wrapper.hidden = true;
    if (success) success.hidden = false;

    if (title) {
      title.textContent = (data.full_name || 'کاربر') + ' عزیز، از ثبت درخواست شما سپاسگزاریم';
    }

    if (lead) {
      lead.textContent = 'خلاصه درخواست ثبت‌شده شما:';
    }

    if (summary) {
      const items = [
        { label: 'نام کامل', value: data.full_name },
        { label: 'نام مرکز درمانی', value: data.center_name },
        { label: 'شهر', value: data.city },
        { label: 'ایمیل', value: data.email },
        { label: 'تخصص', value: data.specialty_detail || data.specialty },
        { label: 'شماره تماس', value: data.phone },
        { label: 'محصولات', value: (data.products || []).join('، ') }
      ];

      if (data.message) {
        items.push({ label: 'پیام', value: data.message });
      }

      summary.innerHTML = items.map(function (item) {
        return '<div><dt>' + escapeHtml(item.label) + '</dt><dd>' + escapeHtml(item.value || '—') + '</dd></div>';
      }).join('');
    }

    if (success) {
      success.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* --- Toast Notification --- */
  function showToast(message, isSuccess) {
    if (isSuccess === undefined) isSuccess = true;

    let container = document.querySelector('.toast-container');

    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'alert');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    container.innerHTML =
      '<div class="toast">' +
      '<span class="toast-icon" style="background:' + (isSuccess ? 'var(--success)' : 'var(--error)') + '">' +
      (isSuccess ? '✓' : '✕') +
      '</span>' +
      '<span>' + escapeHtml(message) + '</span>' +
      '</div>';

    requestAnimationFrame(function () {
      container.classList.add('show');
    });

    clearTimeout(container._toastTimer);
    container._toastTimer = setTimeout(function () {
      container.classList.remove('show');
    }, 4000);
  }

  /* --- Set Telegram Links --- */
  function setTelegramLinks() {
    document.querySelectorAll('[data-telegram]').forEach(function (el) {
      el.setAttribute('href', TELEGRAM_BOT_URL);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    });
  }

  function setTelegramChannelLinks() {
    document.querySelectorAll('[data-telegram-channel]').forEach(function (el) {
      el.setAttribute('href', TELEGRAM_CHANNEL_URL);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    });
  }

  window.kbRefreshTelegramLinks = function () {
    setTelegramLinks();
    setTelegramChannelLinks();
  };

  /* --- Utility --- */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
