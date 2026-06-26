/**
 * K-Beauty Academy — GTM dataLayer helpers
 * Event names must match GTM Custom Event triggers.
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  function push(eventName, params) {
    var data = { event: eventName };

    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (key) {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          data[key] = params[key];
        }
      });
    }

    window.dataLayer.push(data);
  }

  function getPageFile() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getPageType() {
    var page = getPageFile();
    if (page === '' || page === 'index.html') return 'home';
    if (page === 'article.html') return 'article';
    if (page === 'articles.html') return 'articles';
    if (page === 'contact.html') return 'contact';
    if (page === 'verify.html') return 'verify';
    if (page === 'academy.html') return 'academy';
    if (page === 'novanad.html' || page === 'pncell.html' || page === 'agf39.html') return 'product';
    return 'other';
  }

  window.kbAnalytics = {
    push: push,

    trackPageView: function (extra) {
      push('kbeauty_page_view', Object.assign({
        page_type: getPageType(),
        page_path: window.location.pathname + window.location.search,
        page_location: window.location.href,
        page_title: document.title
      }, extra || {}));
    },

    trackCtaClick: function (params) {
      push('kbeauty_cta_click', Object.assign({
        page_location: window.location.href
      }, params || {}));
    },

    trackFormStart: function (formName) {
      push('kbeauty_form_start', {
        form_name: formName,
        page_location: window.location.href
      });
    },

    trackFormSubmit: function (formName, extra) {
      push('kbeauty_form_submit', Object.assign({
        form_name: formName,
        page_location: window.location.href
      }, extra || {}));
    },

    trackFormError: function (formName, errorType, errorMessage) {
      push('kbeauty_form_error', {
        form_name: formName,
        error_type: errorType || 'unknown',
        error_message: errorMessage || '',
        page_location: window.location.href
      });
    },

    trackConversion: function (conversionType, extra) {
      push('kbeauty_conversion', Object.assign({
        conversion_type: conversionType || 'lead',
        page_location: window.location.href
      }, extra || {}));
    },

    trackOutboundClick: function (url, linkText) {
      push('kbeauty_outbound_click', {
        link_url: url,
        link_text: linkText || '',
        page_location: window.location.href
      });
    },

    trackArticleShare: function (method, articleId, articleTitle) {
      push('kbeauty_article_share', {
        method: method,
        article_id: articleId,
        article_title: articleTitle || '',
        page_location: window.location.href
      });
    },

    trackFileDownload: function (fileName, articleId) {
      push('kbeauty_file_download', {
        file_name: fileName,
        article_id: articleId || '',
        page_location: window.location.href
      });
    },

    trackCertificateVerify: function (result) {
      push('kbeauty_certificate_verify', {
        result: result,
        page_location: window.location.href
      });
    }
  };
})();
