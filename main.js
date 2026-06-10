/**
 * K-Beauty Academy — Main JavaScript
 * Mobile menu, certificate verification, contact form
 */

(function () {
  'use strict';

  const TELEGRAM_BOT_URL = 'https://t.me/nadplus_webinar_bot';
  const CONTACT_WEBHOOK_URL = 'https://n8n.alecasgari.com/webhook/83a059c5-7260-4956-9d4c-40442611c076';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  /* --- Mock Certificate Database --- */
  const CERTIFICATES = [
    {
      code: 'KBA-2026-101',
      name: 'دکتر سارا احمدی',
      specialty: 'متخصص پوست و مو',
      certificate: 'PDRN Certified'
    },
    {
      code: 'KBA-2026-102',
      name: 'دکتر محمد رضایی',
      specialty: 'پزشک زیبایی',
      certificate: 'NAD+ Therapy Certified'
    },
    {
      code: 'KBA-2026-103',
      name: 'دکتر نیلوفر کریمی',
      specialty: 'متخصص پوست',
      certificate: 'AGF39 Hair Restoration Certified'
    }
  ];

  /* --- DOM Ready --- */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initUtmCapture();
    initMobileMenu();
    initHeaderScroll();
    initActiveNav();
    initVerifyForm();
    initContactForm();
    setTelegramLinks();
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

  /* --- Active Navigation Highlight --- */
  function initActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.main-nav a, .mobile-nav a');

    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  /* --- Certificate Verification --- */
  function initVerifyForm() {
    const form = document.getElementById('verify-form');
    const resultEl = document.getElementById('verify-result');

    if (!form || !resultEl) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const input = document.getElementById('cert-code');
      const code = input.value.trim().toUpperCase();

      if (!code) {
        showVerifyResult(resultEl, false, 'لطفاً کد گواهینامه را وارد کنید.');
        return;
      }

      const cert = CERTIFICATES.find(function (c) {
        return c.code === code;
      });

      if (cert) {
        showVerifyResult(resultEl, true, null, cert);
      } else {
        showVerifyResult(resultEl, false, 'کد نامعتبر است');
      }
    });
  }

  function showVerifyResult(el, success, errorMsg, cert) {
    el.classList.remove('show', 'verify-result--success', 'verify-result--error');
    el.innerHTML = '';

    void el.offsetWidth;

    if (success && cert) {
      el.className = 'verify-result verify-result--success';
      el.innerHTML =
        '<h3>✓ گواهینامه معتبر است</h3>' +
        '<dl class="cert-details">' +
        '<dt>نام پزشک</dt><dd>' + escapeHtml(cert.name) + '</dd>' +
        '<dt>تخصص</dt><dd>' + escapeHtml(cert.specialty) + '</dd>' +
        '<dt>نوع گواهینامه</dt><dd>' + escapeHtml(cert.certificate) + '</dd>' +
        '<dt>کد گواهینامه</dt><dd style="direction:ltr;text-align:right">' + escapeHtml(cert.code) + '</dd>' +
        '</dl>' +
        '<span class="cert-badge">' + escapeHtml(cert.certificate) + '</span>';
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

  /* --- Contact Form --- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const specialtySelect = form.querySelector('[name="specialty"]');
    const otherGroup = document.getElementById('specialty-other-group');
    const otherInput = form.querySelector('[name="specialty_other"]');
    const submitBtn = document.getElementById('contact-submit');

    if (specialtySelect && otherGroup && otherInput) {
      specialtySelect.addEventListener('change', function () {
        const isOther = specialtySelect.value === 'سایر';
        otherGroup.hidden = !isOther;
        otherInput.required = isOther;

        if (!isOther) {
          otherInput.value = '';
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = form.querySelector('[name="name"]').value.trim();
      const specialty = form.querySelector('[name="specialty"]').value;
      const specialtyOther = form.querySelector('[name="specialty_other"]').value.trim();
      const phone = form.querySelector('[name="phone"]').value.trim();
      const message = form.querySelector('[name="message"]').value.trim();

      if (!name || !phone) {
        showToast('لطفاً نام و شماره تماس را وارد کنید.', false);
        return;
      }

      if (!specialty) {
        showToast('لطفاً تخصص خود را انتخاب کنید.', false);
        return;
      }

      if (specialty === 'سایر' && !specialtyOther) {
        showToast('لطفاً تخصص خود را بنویسید.', false);
        return;
      }

      const payload = {
        name: name,
        specialty: specialty,
        specialty_detail: specialty === 'سایر' ? specialtyOther : specialty,
        phone: phone,
        message: message,
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
          showContactSuccess();
        })
        .catch(function () {
          showToast('ارسال با خطا مواجه شد. لطفاً دوباره تلاش کنید.', false);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'ارسال پیام';
          }
        });
    });
  }

  function showContactSuccess() {
    const wrapper = document.getElementById('contact-form-wrapper');
    const success = document.getElementById('contact-success');

    if (wrapper) wrapper.hidden = true;
    if (success) success.hidden = false;
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

  /* --- Utility --- */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
