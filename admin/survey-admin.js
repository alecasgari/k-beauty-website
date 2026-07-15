/**
 * K-Beauty Academy — Survey Admin Panel
 * Auth + CRUD + results via n8n admin webhook (Google Sheets backend).
 */
(function () {
  'use strict';

  var ADMIN_WEBHOOK_URL = 'https://n8n.alecasgari.com/webhook/kbeauty-survey-admin';
  var SITE_ORIGIN = 'https://k-beauty.academy';
  var STORAGE_KEY = 'kb_survey_admin_token';
  var STORAGE_NAME = 'kb_survey_admin_name';

  var token = sessionStorage.getItem(STORAGE_KEY) || '';
  var adminName = sessionStorage.getItem(STORAGE_NAME) || '';
  var editingSurveyId = null;
  var surveysCache = [];

  var loginView = document.getElementById('admin-login-view');
  var appView = document.getElementById('admin-app-view');
  var topActions = document.getElementById('admin-top-actions');
  var userLabel = document.getElementById('admin-user-label');
  var listEl = document.getElementById('admin-list');
  var editorEl = document.getElementById('admin-editor');
  var resultsEl = document.getElementById('admin-results');
  var questionsEl = document.getElementById('editor-questions');
  var feedbackEl = document.getElementById('editor-feedback');

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindEvents();
    if (token) {
      showApp();
      refreshList();
    } else {
      showLogin();
    }
  }

  function bindEvents() {
    var loginForm = document.getElementById('admin-login-form');
    if (loginForm) loginForm.addEventListener('submit', onLogin);

    var logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    var newBtn = document.getElementById('admin-new-survey');
    if (newBtn) newBtn.addEventListener('click', function () {
      openEditor(null);
    });

    var closeEditor = document.getElementById('editor-close');
    if (closeEditor) closeEditor.addEventListener('click', hideEditor);

    var closeResults = document.getElementById('results-close');
    if (closeResults) closeResults.addEventListener('click', function () {
      resultsEl.hidden = true;
    });

    var addQ = document.getElementById('editor-add-question');
    if (addQ) addQ.addEventListener('click', function () {
      addQuestionBlock();
    });

    var editorForm = document.getElementById('survey-editor-form');
    if (editorForm) editorForm.addEventListener('submit', onSave);

    var copyLink = document.getElementById('editor-copy-link');
    if (copyLink) copyLink.addEventListener('click', onCopyLink);

    if (questionsEl) {
      questionsEl.addEventListener('click', function (e) {
        var removeQ = e.target.closest('[data-remove-question]');
        if (removeQ) {
          var block = removeQ.closest('.editor-question');
          if (block) block.remove();
          renumberQuestions();
          return;
        }
        var addOpt = e.target.closest('[data-add-option]');
        if (addOpt) {
          var opts = addOpt.closest('.editor-question').querySelector('.editor-options');
          if (opts) opts.appendChild(createOptionRow());
          return;
        }
        var removeOpt = e.target.closest('[data-remove-option]');
        if (removeOpt) {
          var row = removeOpt.closest('.editor-option-row');
          if (row) row.remove();
        }
      });
    }
  }

  function onLogin(e) {
    e.preventDefault();
    var input = document.getElementById('admin_password');
    var err = document.getElementById('admin_password-error');
    var password = String((input && input.value) || '').trim();
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
    if (!password) {
      if (err) {
        err.hidden = false;
        err.textContent = 'رمز عبور را وارد کنید';
      }
      return;
    }

    var btn = document.getElementById('admin-login-submit');
    setBtnLoading(btn, true, 'ورود...', 'ورود');

    api({ action: 'login', password: password }).then(function (data) {
      setBtnLoading(btn, false, 'ورود...', 'ورود');
      if (!data || !data.ok || !data.token) {
        if (err) {
          err.hidden = false;
          err.textContent = (data && data.message) || 'ورود ناموفق بود';
        }
        return;
      }
      token = data.token;
      adminName = (data.admin && data.admin.name) || 'Admin';
      sessionStorage.setItem(STORAGE_KEY, token);
      sessionStorage.setItem(STORAGE_NAME, adminName);
      showApp();
      refreshList();
    }).catch(function () {
      setBtnLoading(btn, false, 'ورود...', 'ورود');
      if (err) {
        err.hidden = false;
        err.textContent = 'خطا در اتصال به سرور';
      }
    });
  }

  function logout() {
    token = '';
    adminName = '';
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_NAME);
    showLogin();
  }

  function showLogin() {
    if (loginView) loginView.hidden = false;
    if (appView) appView.hidden = true;
    if (topActions) topActions.hidden = true;
  }

  function showApp() {
    if (loginView) loginView.hidden = true;
    if (appView) appView.hidden = false;
    if (topActions) topActions.hidden = false;
    if (userLabel) userLabel.textContent = adminName ? ('سلام، ' + adminName) : '';
  }

  function refreshList() {
    if (listEl) listEl.innerHTML = '<p class="survey-admin-muted">در حال بارگذاری...</p>';
    api({ action: 'list', token: token }).then(function (data) {
      if (!data || !data.ok) {
        if (data && data.code === 'UNAUTHORIZED') {
          logout();
          return;
        }
        listEl.innerHTML = '<p class="survey-admin-error">' + escapeHtml((data && data.message) || 'خطا') + '</p>';
        return;
      }
      surveysCache = data.surveys || [];
      renderList(surveysCache);
    }).catch(function () {
      listEl.innerHTML = '<p class="survey-admin-error">خطا در اتصال به سرور</p>';
    });
  }

  function renderList(surveys) {
    if (!listEl) return;
    if (!surveys.length) {
      listEl.innerHTML = '<div class="survey-admin-empty">هنوز نظرسنجی‌ای نیست. «نظرسنجی جدید» را بزنید.</div>';
      return;
    }

    var html = '<div class="survey-admin-table">';
    surveys.forEach(function (s) {
      html += '<article class="survey-admin-row">';
      html += '<div class="survey-admin-row__main">';
      html += '<h3>' + escapeHtml(s.title) + '</h3>';
      html += '<p><code dir="ltr">' + escapeHtml(s.id) + '</code> · ' + statusLabel(s.status);
      html += ' · ' + toFaDigit(s.responseCount || 0) + ' پاسخ</p>';
      html += '</div>';
      html += '<div class="survey-admin-row__actions">';
      html += '<button type="button" class="btn btn--outline" data-edit="' + escapeAttr(s.id) + '">ویرایش</button>';
      html += '<button type="button" class="btn btn--outline" data-results="' + escapeAttr(s.id) + '">نتایج</button>';
      if (s.status === 'open') {
        html += '<button type="button" class="btn btn--ghost" data-status="' + escapeAttr(s.id) + '" data-next="closed">بستن</button>';
      } else {
        html += '<button type="button" class="btn btn--ghost" data-status="' + escapeAttr(s.id) + '" data-next="open">باز کردن</button>';
      }
      html += '<button type="button" class="btn btn--ghost" data-copy="' + escapeAttr(s.id) + '">کپی لینک</button>';
      html += '</div></article>';
    });
    html += '</div>';
    listEl.innerHTML = html;

    listEl.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadAndEdit(btn.getAttribute('data-edit'));
      });
    });
    listEl.querySelectorAll('[data-results]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadResults(btn.getAttribute('data-results'));
      });
    });
    listEl.querySelectorAll('[data-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStatus(btn.getAttribute('data-status'), btn.getAttribute('data-next'));
      });
    });
    listEl.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(publicUrl(btn.getAttribute('data-copy')));
      });
    });
  }

  function openEditor(survey) {
    hideResults();
    editorEl.hidden = false;
    feedbackEl.hidden = true;
    editingSurveyId = survey ? survey.id : null;

    document.getElementById('editor-title').textContent = survey ? 'ویرایش نظرسنجی' : 'نظرسنجی جدید';
    document.getElementById('edit_id').value = survey ? survey.id : '';
    document.getElementById('edit_id').readOnly = !!survey;
    document.getElementById('edit_title').value = survey ? (survey.title || '') : '';
    document.getElementById('edit_description').value = survey ? (survey.description || '') : '';
    document.getElementById('edit_status').value = survey ? (survey.status || 'open') : 'open';

    questionsEl.innerHTML = '';
    var qs = survey && Array.isArray(survey.questions) ? survey.questions : [];
    if (!qs.length) {
      addQuestionBlock({
        text: 'نظر شما مخاطب گرامی برای موضوع برگزاری وبینار بعدی چیست؟',
        options: [
          { text: 'آشنایی و مرور مجدد روی Nad+' },
          { text: 'آشنایی و مرور مجدد روی PDRN - PN CELL' },
          { text: 'آشنایی و مرور مجدد روی AGF39' },
          { text: 'آشنایی و مرور مجدد روی هر سه محصول' }
        ]
      });
      addQuestionBlock({
        text: 'زمانش چقدر باشد؟',
        options: [
          { text: '30 دقیقه' },
          { text: '45 دقیقه' },
          { text: 'یک ساعت' },
          { text: 'بیشتر از یک ساعت' }
        ]
      });
      addQuestionBlock({
        text: 'تاریخ پیشنهادی را انتخاب کنید',
        options: [
          { text: 'جمعه 26 تیر 1405' },
          { text: 'سه‌شنبه 30 تیر 1405' },
          { text: 'جمعه 2 مرداد 1405' }
        ]
      });
    } else {
      qs.forEach(function (q) {
        addQuestionBlock(q);
      });
    }

    editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideEditor() {
    editorEl.hidden = true;
    editingSurveyId = null;
  }

  function hideResults() {
    resultsEl.hidden = true;
  }

  function loadAndEdit(id) {
    api({ action: 'get', token: token, surveyId: id }).then(function (data) {
      if (!data || !data.ok) {
        if (data && data.code === 'UNAUTHORIZED') return logout();
        alert((data && data.message) || 'بارگذاری ناموفق بود');
        return;
      }
      openEditor(data.survey);
    }).catch(function () {
      alert('خطا در اتصال به سرور');
    });
  }

  function addQuestionBlock(data) {
    data = data || {};
    var block = document.createElement('div');
    block.className = 'editor-question';
    block.innerHTML =
      '<div class="editor-question__head">' +
        '<strong class="editor-question__label">سوال</strong>' +
        '<button type="button" class="btn btn--ghost" data-remove-question>حذف</button>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>متن سوال</label>' +
        '<input type="text" class="editor-q-text" required maxlength="300" value="' + escapeAttr(data.text || '') + '">' +
        '<input type="hidden" class="editor-q-id" value="' + escapeAttr(data.id || '') + '">' +
      '</div>' +
      '<div class="editor-options"></div>' +
      '<button type="button" class="btn btn--outline" data-add-option>افزودن گزینه</button>';

    questionsEl.appendChild(block);
    var optsWrap = block.querySelector('.editor-options');
    var opts = Array.isArray(data.options) ? data.options : [{ text: '' }, { text: '' }];
    opts.forEach(function (o) {
      optsWrap.appendChild(createOptionRow(o));
    });
    renumberQuestions();
  }

  function createOptionRow(data) {
    data = data || {};
    var row = document.createElement('div');
    row.className = 'editor-option-row';
    row.innerHTML =
      '<input type="text" class="editor-o-text" placeholder="متن گزینه" maxlength="200" value="' + escapeAttr(data.text || '') + '">' +
      '<input type="hidden" class="editor-o-id" value="' + escapeAttr(data.id || '') + '">' +
      '<button type="button" class="btn btn--ghost" data-remove-option aria-label="حذف گزینه">×</button>';
    return row;
  }

  function renumberQuestions() {
    var blocks = questionsEl.querySelectorAll('.editor-question');
    blocks.forEach(function (block, i) {
      var label = block.querySelector('.editor-question__label');
      if (label) label.textContent = 'سوال ' + toFaDigit(i + 1);
    });
  }

  function collectEditorSurvey() {
    var idInput = document.getElementById('edit_id');
    var title = String(document.getElementById('edit_title').value || '').trim();
    var description = String(document.getElementById('edit_description').value || '').trim();
    var status = document.getElementById('edit_status').value;
    var id = String((idInput && idInput.value) || '').trim();

    var questions = [];
    questionsEl.querySelectorAll('.editor-question').forEach(function (block, qi) {
      var qText = String(block.querySelector('.editor-q-text').value || '').trim();
      var qId = String(block.querySelector('.editor-q-id').value || '').trim();
      var options = [];
      block.querySelectorAll('.editor-option-row').forEach(function (row, oi) {
        var oText = String(row.querySelector('.editor-o-text').value || '').trim();
        var oId = String(row.querySelector('.editor-o-id').value || '').trim();
        if (!oText) return;
        options.push({
          id: oId || undefined,
          text: oText,
          sortOrder: oi + 1
        });
      });
      if (!qText || options.length < 2) return;
      questions.push({
        id: qId || undefined,
        text: qText,
        sortOrder: qi + 1,
        options: options
      });
    });

    return {
      id: id || undefined,
      title: title,
      description: description,
      status: status,
      questions: questions
    };
  }

  function onSave(e) {
    e.preventDefault();
    var survey = collectEditorSurvey();
    if (!survey.title) {
      showFeedback('عنوان الزامی است', true);
      return;
    }
    if (!survey.questions.length) {
      showFeedback('حداقل یک سوال با دو گزینه لازم است', true);
      return;
    }

    var btn = document.getElementById('editor-save');
    setBtnLoading(btn, true, 'در حال ذخیره...', 'ذخیره نظرسنجی');

    api({
      action: 'save',
      token: token,
      survey: survey
    }).then(function (data) {
      setBtnLoading(btn, false, 'در حال ذخیره...', 'ذخیره نظرسنجی');
      if (!data || !data.ok) {
        if (data && data.code === 'UNAUTHORIZED') return logout();
        showFeedback((data && data.message) || 'ذخیره ناموفق بود', true);
        return;
      }
      editingSurveyId = data.surveyId;
      document.getElementById('edit_id').value = data.surveyId;
      document.getElementById('edit_id').readOnly = true;
      showFeedback((data.message || 'ذخیره شد') + ' — لینک: ' + publicUrl(data.surveyId), false);
      refreshList();
    }).catch(function () {
      setBtnLoading(btn, false, 'در حال ذخیره...', 'ذخیره نظرسنجی');
      showFeedback('خطا در اتصال به سرور', true);
    });
  }

  function setStatus(id, status) {
    api({
      action: 'setStatus',
      token: token,
      surveyId: id,
      status: status
    }).then(function (data) {
      if (!data || !data.ok) {
        if (data && data.code === 'UNAUTHORIZED') return logout();
        alert((data && data.message) || 'به‌روزرسانی وضعیت ناموفق بود');
        return;
      }
      refreshList();
    }).catch(function () {
      alert('خطا در اتصال به سرور');
    });
  }

  function loadResults(id) {
    hideEditor();
    resultsEl.hidden = false;
    document.getElementById('results-body').innerHTML = '<p class="survey-admin-muted">در حال بارگذاری نتایج...</p>';
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    api({ action: 'results', token: token, surveyId: id }).then(function (data) {
      if (!data || !data.ok) {
        if (data && data.code === 'UNAUTHORIZED') return logout();
        document.getElementById('results-body').innerHTML =
          '<p class="survey-admin-error">' + escapeHtml((data && data.message) || 'خطا') + '</p>';
        return;
      }
      renderResults(data);
    }).catch(function () {
      document.getElementById('results-body').innerHTML =
        '<p class="survey-admin-error">خطا در اتصال به سرور</p>';
    });
  }

  function renderResults(data) {
    document.getElementById('results-title').textContent =
      'نتایج: ' + ((data.survey && data.survey.title) || '');

    var html = '';
    html += '<p class="survey-lead">مجموع پاسخ‌ها: <strong>' + toFaDigit(data.totalResponses || 0) + '</strong></p>';

    (data.questions || []).forEach(function (q, qi) {
      html += '<div class="results-question">';
      html += '<h3>' + toFaDigit(qi + 1) + '. ' + escapeHtml(q.text) + '</h3>';
      html += '<ul class="results-bars">';
      (q.options || []).forEach(function (o) {
        html += '<li>';
        html += '<div class="results-bars__label"><span>' + escapeHtml(o.text) + '</span>';
        html += '<span>' + toFaDigit(o.count) + ' (' + toFaDigit(o.percent) + '٪)</span></div>';
        html += '<div class="results-bars__track"><span style="width:' + Math.min(100, Number(o.percent) || 0) + '%"></span></div>';
        html += '</li>';
      });
      html += '</ul></div>';
    });

    html += '<h3 class="results-raw-title">پاسخ‌های خام</h3>';
    if (!(data.responses || []).length) {
      html += '<p class="survey-admin-muted">هنوز پاسخی ثبت نشده است.</p>';
    } else {
      html += '<div class="results-raw">';
      data.responses.forEach(function (r) {
        html += '<article class="results-raw__item">';
        html += '<header><strong>' + escapeHtml(r.name || '—') + '</strong>';
        html += '<span>' + escapeHtml(formatDate(r.submittedAt)) + '</span></header>';
        html += '<p class="results-raw__meta">منبع: ' + escapeHtml(r.source || '—');
        if (r.chatId) html += ' · chatId: <code dir="ltr">' + escapeHtml(r.chatId) + '</code>';
        html += '</p>';
        html += '<ul>' + renderAnswerLabels(r.answersText) + '</ul>';
        html += '</article>';
      });
      html += '</div>';
    }

    document.getElementById('results-body').innerHTML = html;
  }

  function renderAnswerLabels(answersText) {
    var parsed = {};
    try {
      parsed = JSON.parse(answersText || '{}');
    } catch (e) {
      return '<li>پاسخ قابل نمایش نیست</li>';
    }
    var keys = Object.keys(parsed);
    if (!keys.length) return '<li>—</li>';
    return keys.map(function (k) {
      var item = parsed[k] || {};
      return '<li><strong>' + escapeHtml(item.question || k) + ':</strong> ' + escapeHtml(item.option || '') + '</li>';
    }).join('');
  }

  function onCopyLink() {
    var id = document.getElementById('edit_id').value.trim() || editingSurveyId;
    if (!id) {
      showFeedback('ابتدا نظرسنجی را ذخیره کنید', true);
      return;
    }
    copyText(publicUrl(id));
    showFeedback('لینک عمومی کپی شد', false);
  }

  function publicUrl(id) {
    return SITE_ORIGIN + '/survey.html?id=' + encodeURIComponent(id);
  }

  function telegramTemplate(id) {
    return SITE_ORIGIN + '/survey.html?id=' + encodeURIComponent(id) + '&name={{name}}&cid={{chatId}}';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        window.prompt('لینک را کپی کنید:', text);
      });
      return;
    }
    window.prompt('لینک را کپی کنید:', text);
  }

  function showFeedback(message, isError) {
    if (!feedbackEl) return;
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.classList.toggle('is-error', !!isError);
  }

  function api(payload) {
    return fetch(ADMIN_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () {
        return { ok: false, message: 'پاسخ نامعتبر از سرور' };
      });
    });
  }

  function statusLabel(status) {
    if (status === 'open') return 'باز';
    if (status === 'closed') return 'بسته';
    if (status === 'draft') return 'پیش‌نویس';
    return status || '—';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fa-IR');
    } catch (e) {
      return iso;
    }
  }

  function setBtnLoading(btn, loading, loadingText, idleText) {
    if (!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? loadingText : idleText;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function toFaDigit(n) {
    return String(n).replace(/\d/g, function (d) {
      return '۰۱۲۳۴۵۶۷۸۹'[Number(d)];
    });
  }

  // Expose template helper for console debugging if needed
  window.kbSurveyAdminTelegramTemplate = telegramTemplate;
})();
