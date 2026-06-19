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
    var searchInput = document.getElementById('articles-search');
    var filterBtns = document.querySelectorAll('[data-article-filter]');
    var emptyEl = document.getElementById('articles-empty');

    loadArticlesData()
        .then(function (data) {
          var countEl = document.getElementById('articles-count');
          if (countEl) {
            countEl.textContent = data.articles.length + ' مقاله';
          }

          renderArticlesList(data, grid, emptyEl);

        if (searchInput) {
          searchInput.addEventListener('input', function () {
            searchQuery = normalizeText(searchInput.value);
            renderArticlesList(data, grid, emptyEl);
          });
        }

        filterBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            activeCategory = btn.getAttribute('data-article-filter');
            filterBtns.forEach(function (b) {
              b.classList.toggle('active', b === btn);
            });
            renderArticlesList(data, grid, emptyEl);
          });
        });
      })
      .catch(function () {
        grid.innerHTML = '<p class="articles-error">خطا در بارگذاری مقالات. لطفاً صفحه را رفرش کنید.</p>';
      });
  }

  function renderArticlesList(data, grid, emptyEl) {
    var filtered = data.articles.filter(function (article) {
      return matchesCategory(article, activeCategory) && matchesSearch(article, searchQuery);
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
        '<span class="article-card__badge">' + escapeHtml(label) + '</span>' +
        '<h2 class="article-card__title-fa">' + escapeHtml(article.titleFa) + '</h2>' +
        '<p class="article-card__title-en" dir="ltr">' + escapeHtml(article.titleEn) + '</p>' +
        '<dl class="article-card__meta">' +
          '<div><dt>سال انتشار</dt><dd>' + escapeHtml(String(article.year)) + '</dd></div>' +
          '<div><dt>ژورنال</dt><dd>' + escapeHtml(article.journalFa) + '<span class="article-card__journal-en" dir="ltr">' + escapeHtml(article.journalEn) + '</span></dd></div>' +
        '</dl>' +
        '<span class="article-card__link">مشاهده مقاله ←</span>' +
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
        '<h1 class="article-page__title-fa">' + escapeHtml(article.titleFa) + '</h1>' +
        '<p class="article-page__title-en" dir="ltr">' + escapeHtml(article.titleEn) + '</p>' +
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
        '</div>' +
        '<section class="article-page__preview" aria-label="پیش‌نمایش PDF">' +
          '<h2>پیش‌نمایش</h2>' +
          '<div class="article-page__preview-frame">' +
            '<iframe src="' + escapeAttr(pdfUrl) + '#toolbar=1&navpanes=0" title="پیش‌نمایش ' + escapeAttr(article.titleFa) + '"></iframe>' +
          '</div>' +
          '<p class="article-page__preview-note">اگر پیش‌نمایش نمایش داده نشد، از دکمه دانلود استفاده کنید.</p>' +
        '</section>' +
      '</article>';
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
