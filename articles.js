/**
 * K-Beauty Academy — Scientific Articles
 * Listing filter/search + individual article page loader
 */

(function () {
  'use strict';

  var articlesData = null;
  var activeCategory = 'all';
  var searchQuery = '';

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('articles-grid')) {
      initArticlesList();
    }
    if (document.getElementById('article-page')) {
      initArticleDetail();
    }
  });

  function loadArticlesData() {
    if (articlesData) {
      return Promise.resolve(articlesData);
    }
    return fetch('data/articles.json')
      .then(function (res) {
        if (!res.ok) throw new Error('load_failed');
        return res.json();
      })
      .then(function (data) {
        articlesData = data;
        return data;
      });
  }

  function encodePdfPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function getCategoryLabel(data, category) {
    var cat = data.categories[category];
    return cat ? cat.labelFa : category;
  }

  function normalizeText(text) {
    return (text || '').toLowerCase().trim();
  }

  function matchesSearch(article, query) {
    if (!query) return true;
    var haystack = [
      article.titleFa,
      article.titleEn,
      article.journalFa,
      article.journalEn
    ].map(normalizeText).join(' ');
    return haystack.indexOf(query) !== -1;
  }

  function matchesCategory(article, category) {
    return category === 'all' || article.category === category;
  }

  /* --- Articles Listing --- */
  function initArticlesList() {
    var grid = document.getElementById('articles-grid');
    var emptyEl = document.getElementById('articles-empty');
    var searchDesktop = document.getElementById('articles-search');
    var filterDesktopBtns = document.querySelectorAll('[data-article-filter]');
    var listState = {
      data: null,
      grid: grid,
      emptyEl: emptyEl
    };

    loadArticlesData()
      .then(function (data) {
        listState.data = data;

        var countEl = document.getElementById('articles-count');
        if (countEl) {
          countEl.textContent = data.articles.length + ' مقاله';
        }

        applyListFilters(listState);

        if (searchDesktop) {
          searchDesktop.addEventListener('input', function () {
            searchQuery = normalizeText(searchDesktop.value);
            syncFilterUi();
            applyListFilters(listState);
          });
        }

        filterDesktopBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            activeCategory = btn.getAttribute('data-article-filter');
            syncFilterUi();
            applyListFilters(listState);
          });
        });

        initMobileFilterSheet(listState);
      })
      .catch(function () {
        grid.innerHTML = '<p class="articles-error">خطا در بارگذاری مقالات. لطفاً صفحه را رفرش کنید.</p>';
      });
  }

  function applyListFilters(state) {
    renderArticlesList(state.data, state.grid, state.emptyEl);
    updateActiveFiltersBar();
    updateFabBadge();
  }

  function syncFilterUi() {
    var searchDesktop = document.getElementById('articles-search');
    var searchMobile = document.getElementById('articles-search-mobile');

    if (searchDesktop) searchDesktop.value = searchQuery;
    if (searchMobile) searchMobile.value = searchQuery;

    document.querySelectorAll('[data-article-filter]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-article-filter') === activeCategory);
    });

    document.querySelectorAll('[data-article-filter-mobile]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-article-filter-mobile') === activeCategory);
    });
  }

  function getCategoryLabelById(category) {
    var labels = {
      all: 'همه',
      nad: 'NAD+',
      pdrn: 'PDRN',
      agf: 'AGF',
      other: 'سایر'
    };
    return labels[category] || category;
  }

  function updateActiveFiltersBar() {
    var bar = document.getElementById('articles-active-filters');
    if (!bar) return;

    var chips = [];
    if (activeCategory !== 'all') {
      chips.push('<span class="articles-chip">' + escapeHtml(getCategoryLabelById(activeCategory)) + '</span>');
    }
    if (searchQuery) {
      chips.push('<span class="articles-chip">«' + escapeHtml(searchQuery) + '»</span>');
    }

    if (chips.length === 0) {
      bar.hidden = true;
      bar.innerHTML = '';
      return;
    }

    bar.hidden = false;
    bar.innerHTML = '<span class="articles-active-filters__label">فیلتر فعال:</span>' + chips.join('');
  }

  function updateFabBadge() {
    var badge = document.getElementById('articles-fab-badge');
    if (!badge) return;

    var count = 0;
    if (activeCategory !== 'all') count += 1;
    if (searchQuery) count += 1;

    if (count === 0) {
      badge.hidden = true;
      return;
    }

    badge.hidden = false;
    badge.textContent = String(count);
  }

  function initMobileFilterSheet(state) {
    var fab = document.getElementById('articles-fab');
    var sheet = document.getElementById('articles-sheet');
    var searchMobile = document.getElementById('articles-search-mobile');
    var applyBtn = document.getElementById('articles-filter-apply');
    var resetBtn = document.getElementById('articles-filter-reset');
    var mobileFilterBtns = document.querySelectorAll('[data-article-filter-mobile]');
    var pendingCategory = activeCategory;
    var pendingSearch = searchQuery;

    if (!fab || !sheet) return;

    function syncPendingFromActive() {
      pendingCategory = activeCategory;
      pendingSearch = searchQuery;
      if (searchMobile) searchMobile.value = pendingSearch;
      mobileFilterBtns.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-article-filter-mobile') === pendingCategory);
      });
    }

    function openSheet() {
      syncPendingFromActive();
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      fab.setAttribute('aria-expanded', 'true');
      document.body.classList.add('articles-sheet-open');
      if (searchMobile) {
        setTimeout(function () { searchMobile.focus(); }, 280);
      }
    }

    function closeSheet() {
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
      fab.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('articles-sheet-open');
    }

    fab.addEventListener('click', openSheet);

    sheet.querySelectorAll('[data-sheet-close]').forEach(function (el) {
      el.addEventListener('click', closeSheet);
    });

    mobileFilterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        pendingCategory = btn.getAttribute('data-article-filter-mobile');
        mobileFilterBtns.forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    if (searchMobile) {
      searchMobile.addEventListener('input', function () {
        pendingSearch = normalizeText(searchMobile.value);
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        activeCategory = pendingCategory;
        searchQuery = pendingSearch;
        syncFilterUi();
        applyListFilters(state);
        closeSheet();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        pendingCategory = 'all';
        pendingSearch = '';
        if (searchMobile) searchMobile.value = '';
        mobileFilterBtns.forEach(function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-article-filter-mobile') === 'all');
        });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) {
        closeSheet();
      }
    });
  }

  function renderArticlesList(data, grid, emptyEl) {
    var filtered = data.articles.filter(function (article) {
      return matchesCategory(article, activeCategory) && matchesSearch(article, searchQuery);
    });

    filtered.sort(function (a, b) {
      var yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = searchQuery
          ? 'مقاله‌ای با این جستجو یافت نشد.'
          : 'مقاله‌ای در این دسته‌بندی یافت نشد.';
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    grid.innerHTML = filtered.map(function (article) {
      return buildArticleCard(article, data);
    }).join('');
  }

  function buildArticleCard(article, data) {
    var label = getCategoryLabel(data, article.category);
    return (
      '<a href="article.html?id=' + escapeAttr(article.id) + '" class="article-card article-card--' + escapeAttr(article.category) + '">' +
        '<div class="article-card__stripe" aria-hidden="true"></div>' +
        '<div class="article-card__body">' +
          '<span class="article-card__badge">' + escapeHtml(label) + '</span>' +
          '<h2 class="article-card__title-en" dir="ltr" lang="en">' + escapeHtml(article.titleEn) + '</h2>' +
          '<p class="article-card__title-fa" lang="fa">' + escapeHtml(article.titleFa) + '</p>' +
          '<div class="article-card__footer">' +
            '<span class="article-card__year">سال انتشار: ' + escapeHtml(String(article.year)) + '</span>' +
            '<span class="article-card__cta" aria-hidden="true">←</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  /* --- Article Detail Page --- */
  function initArticleDetail() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var container = document.getElementById('article-page');

    if (!id) {
      showArticleError(container, 'مقاله‌ای انتخاب نشده است.');
      return;
    }

    loadArticlesData()
      .then(function (data) {
        var article = data.articles.find(function (a) { return a.id === id; });
        if (!article) {
          showArticleError(container, 'مقاله مورد نظر یافت نشد.');
          return;
        }
        renderArticleDetail(article, data, container);
        initArticleShare(article);
        document.title = article.titleFa + ' | K-Beauty Academy';
      })
      .catch(function () {
        showArticleError(container, 'خطا در بارگذاری مقاله.');
      });
  }

  function renderArticleDetail(article, data, container) {
    var label = getCategoryLabel(data, article.category);
    var pdfUrl = encodePdfPath(article.pdf);
    var downloadName = article.id + '.pdf';

    container.innerHTML =
      '<header class="article-page__top">' +
        '<a href="articles.html" class="article-page__back">← بازگشت به مقالات</a>' +
      '</header>' +
      '<article class="article-page__content">' +
        '<span class="article-page__badge article-page__badge--' + escapeAttr(article.category) + '">' + escapeHtml(label) + '</span>' +
        '<h1 class="article-page__title-en" dir="ltr" lang="en">' + escapeHtml(article.titleEn) + '</h1>' +
        '<p class="article-page__title-fa" lang="fa">' + escapeHtml(article.titleFa) + '</p>' +
        '<dl class="article-page__meta">' +
          '<div><dt>سال انتشار</dt><dd>' + escapeHtml(String(article.year)) + '</dd></div>' +
          '<div><dt>ژورنال</dt><dd>' + escapeHtml(article.journalFa) + ' <span dir="ltr">(' + escapeHtml(article.journalEn) + ')</span></dd></div>' +
        '</dl>' +
        '<div class="article-page__summary">' +
          '<p>' + escapeHtml(article.summaryFa) + '</p>' +
          (article.summaryEn ? '<p class="article-page__summary-en" dir="ltr">' + escapeHtml(article.summaryEn) + '</p>' : '') +
        '</div>' +
        '<div class="article-page__actions">' +
          '<a href="' + escapeAttr(pdfUrl) + '" download="' + escapeAttr(downloadName) + '" class="btn btn--primary">دانلود PDF</a>' +
          '<div class="article-share">' +
            '<button type="button" class="btn btn--outline article-share__toggle" aria-expanded="false" aria-controls="article-share-menu">' +
              'اشتراک‌گذاری' +
            '</button>' +
            '<div class="article-share__menu" id="article-share-menu" hidden>' +
              '<button type="button" class="article-share__item" data-share="copy">کپی متن</button>' +
              '<a class="article-share__item" data-share="whatsapp" href="#" target="_blank" rel="noopener noreferrer">واتساپ</a>' +
              '<a class="article-share__item" data-share="telegram" href="#" target="_blank" rel="noopener noreferrer">تلگرام</a>' +
              '<a class="article-share__item" data-share="email" href="#">ایمیل</a>' +
              '<a class="article-share__item" data-share="linkedin" href="#" target="_blank" rel="noopener noreferrer">لینکدین</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="article-share__toast" id="article-share-toast" role="status" aria-live="polite" hidden>متن کپی شد</p>' +
        '<section class="article-page__preview" aria-label="پیش‌نمایش PDF">' +
          '<h2>پیش‌نمایش</h2>' +
          '<div class="article-page__preview-frame">' +
            '<iframe src="' + escapeAttr(pdfUrl) + '#toolbar=1&navpanes=0" title="پیش‌نمایش ' + escapeAttr(article.titleFa) + '"></iframe>' +
          '</div>' +
          '<p class="article-page__preview-note">اگر پیش‌نمایش نمایش داده نشد، از دکمه دانلود استفاده کنید.</p>' +
        '</section>' +
      '</article>';
  }

  function buildShareText(titleFa) {
    var url = window.location.href.split('#')[0];
    return (
      'من مقاله با عنوان «' + titleFa + '» را در وب‌سایت کی‌بیوتی آکادمی دیدم و به نظرم جالب آمد. این لینک آن مقاله است:\n' +
      url
    );
  }

  function initArticleShare(article) {
    var toggle = document.querySelector('.article-share__toggle');
    var menu = document.getElementById('article-share-menu');
    var toast = document.getElementById('article-share-toast');
    if (!toggle || !menu) return;

    var shareText = buildShareText(article.titleFa);
    var shareUrl = window.location.href.split('#')[0];
    var emailSubject = 'مقاله علمی — کی‌بیوتی آکادمی';
    var telegramText = 'من مقاله «' + article.titleFa + '» را در کی‌بیوتی آکادمی دیدم.';

    var whatsappLink = menu.querySelector('[data-share="whatsapp"]');
    var telegramLink = menu.querySelector('[data-share="telegram"]');
    var emailLink = menu.querySelector('[data-share="email"]');
    var linkedinLink = menu.querySelector('[data-share="linkedin"]');
    var copyBtn = menu.querySelector('[data-share="copy"]');

    if (whatsappLink) {
      whatsappLink.href = 'https://wa.me/?text=' + encodeURIComponent(shareText);
    }
    if (telegramLink) {
      telegramLink.href =
        'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) +
        '&text=' + encodeURIComponent(telegramText);
    }
    if (emailLink) {
      emailLink.href =
        'mailto:?subject=' + encodeURIComponent(emailSubject) +
        '&body=' + encodeURIComponent(shareText);
    }
    if (linkedinLink) {
      linkedinLink.href =
        'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl);
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menu.hidden;
      menu.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.classList.toggle('article-share__toggle--open', isOpen);
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.article-share')) {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('article-share__toggle--open');
      }
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyShareText(shareText, toast);
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('article-share__toggle--open');
      });
    }
  }

  function copyShareText(text, toastEl) {
    function showToast() {
      if (!toastEl) return;
      toastEl.hidden = false;
      clearTimeout(copyShareText._timer);
      copyShareText._timer = setTimeout(function () {
        toastEl.hidden = true;
      }, 2500);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast).catch(function () {
        fallbackCopy(text, showToast);
      });
      return;
    }

    fallbackCopy(text, showToast);
  }

  function fallbackCopy(text, onSuccess) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch (err) {
      /* clipboard unavailable */
    }
    document.body.removeChild(textarea);
  }

  function showArticleError(container, message) {
    container.innerHTML =
      '<header class="article-page__top">' +
        '<a href="articles.html" class="article-page__back">← بازگشت به مقالات</a>' +
      '</header>' +
      '<div class="article-page__error"><p>' + escapeHtml(message) + '</p></div>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }
})();
