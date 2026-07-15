/**
 * K-Beauty Academy — Public Survey Page
 * Loads survey definition from n8n and submits answers to Google Sheets via webhook.
 */
(function () {
  'use strict';

  var SURVEY_WEBHOOK_URL = 'https://n8n.alecasgari.com/webhook/kbeauty-survey';

  var params = new URLSearchParams(window.location.search);
  var surveyId = (params.get('id') || params.get('surveyId') || '').trim();
  var prefillName = (params.get('name') || '').trim();
  var chatId = (params.get('cid') || params.get('chatId') || '').trim();
  var sourceHint = (params.get('src') || params.get('source') || (chatId ? 'telegram' : 'web')).trim();

  var stateEl = document.getElementById('survey-state');
  var modalEl = document.getElementById('survey-thanks-modal');
  var thanksTextEl = document.getElementById('survey-thanks-text');
  var currentSurvey = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindModalClose();
    if (!surveyId) {
      renderMessage('error', 'نظرسنجی نامعتبر', 'شناسه نظرسنجی در لینک مشخص نشده است.');
      return;
    }
    loadSurvey();
  }

  function bindModalClose() {
    if (!modalEl) return;
    modalEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-survey-modal-close]')) closeThanksModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) closeThanksModal();
    });
  }

  function loadSurvey() {
    postWebhook({
      action: 'get',
      surveyId: surveyId,
      chatId: chatId
    }).then(function (data) {
      if (!data || !data.ok) {
        renderApiError(data);
        return;
      }
      currentSurvey = data.survey;
      renderSurveyForm(currentSurvey);
    }).catch(function () {
      renderMessage('error', 'خطا در اتصال', 'ارتباط با سرور برقرار نشد. کمی بعد دوباره تلاش کنید.');
    });
  }

  function renderApiError(data) {
    var code = data && data.code;
    var title = 'امکان شرکت در نظرسنجی نیست';
    var message = (data && data.message) || 'خطای ناشناخته';

    if (code === 'ALREADY_VOTED') {
      title = 'رأی شما قبلاً ثبت شده';
      message = 'شما قبلاً در این نظرسنجی رأی داده‌اید. از مشارکت‌تان سپاسگزاریم.';
    } else if (code === 'CLOSED') {
      title = 'نظرسنجی بسته شده';
      message = 'این نظرسنجی دیگر فعال نیست.';
    } else if (code === 'NOT_FOUND' || code === 'MISSING_ID') {
      title = 'نظرسنجی یافت نشد';
    }

    renderMessage(code === 'ALREADY_VOTED' ? 'info' : 'error', title, message);
  }

  function renderMessage(type, title, message) {
    if (!stateEl) return;
    stateEl.innerHTML =
      '<div class="survey-status survey-status--' + escapeAttr(type) + '">' +
        '<span class="eyebrow">Survey</span>' +
        '<h1>' + escapeHtml(title) + '</h1>' +
        '<p>' + escapeHtml(message) + '</p>' +
        '<a class="btn btn--outline" href="index.html">بازگشت به خانه</a>' +
      '</div>';
  }

  function renderSurveyForm(survey) {
    if (!stateEl) return;
    var questions = Array.isArray(survey.questions) ? survey.questions : [];
    if (!questions.length) {
      renderMessage('error', 'نظرسنجی خالی است', 'برای این نظرسنجی هنوز سوالی تعریف نشده است.');
      return;
    }

    var nameLocked = !!prefillName;
    var html = '';
    html += '<span class="eyebrow">Survey</span>';
    html += '<h1>' + escapeHtml(survey.title || 'نظرسنجی') + '</h1>';
    if (survey.description) {
      html += '<p class="survey-lead">' + escapeHtml(survey.description) + '</p>';
    }

    html += '<form id="survey-form" class="survey-form" novalidate>';
    html += '<div class="form-honeypot" aria-hidden="true">';
    html += '<label for="survey_website">وب‌سایت</label>';
    html += '<input type="text" id="survey_website" name="website" tabindex="-1" autocomplete="off">';
    html += '</div>';

    html += '<div class="form-group" id="survey-name-group">';
    html += '<label for="survey_name">نام شما</label>';
    html += '<input type="text" id="survey_name" name="name" maxlength="120" required autocomplete="name"';
    html += ' value="' + escapeAttr(prefillName) + '"';
    if (nameLocked) html += ' readonly';
    html += ' placeholder="نام و نام خانوادگی">';
    html += '<p class="form-error" id="survey_name-error" hidden></p>';
    html += '</div>';

    questions.forEach(function (q, index) {
      html += '<fieldset class="survey-question" data-question-id="' + escapeAttr(q.id) + '">';
      html += '<legend><span class="survey-question__index">' + toFaDigit(index + 1) + '</span> ' + escapeHtml(q.text) + '</legend>';
      html += '<div class="survey-options" role="radiogroup" aria-label="' + escapeAttr(q.text) + '">';
      (q.options || []).forEach(function (opt) {
        var inputId = 'opt_' + q.id + '_' + opt.id;
        html += '<label class="survey-option" for="' + escapeAttr(inputId) + '">';
        html += '<input type="radio" id="' + escapeAttr(inputId) + '" name="q_' + escapeAttr(q.id) + '" value="' + escapeAttr(opt.id) + '" required>';
        html += '<span class="survey-option__text">' + escapeHtml(opt.text) + '</span>';
        html += '</label>';
      });
      html += '</div>';
      html += '<p class="form-error" data-q-error="' + escapeAttr(q.id) + '" hidden></p>';
      html += '</fieldset>';
    });

    html += '<button type="submit" class="btn btn--primary btn--full" id="survey-submit">ثبت نظر</button>';
    html += '<p class="survey-form__hint">با ثبت نظر، به بهبود برنامه‌های آموزشی آکادمی کمک می‌کنید.</p>';
    html += '</form>';

    stateEl.innerHTML = html;

    var form = document.getElementById('survey-form');
    if (form) {
      form.addEventListener('submit', onSubmit);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target;
    clearFormErrors(form);

    var honeypot = (form.querySelector('[name="website"]') || {}).value || '';
    if (String(honeypot).trim()) return;

    var nameInput = form.querySelector('#survey_name');
    var name = String((nameInput && nameInput.value) || '').replace(/\s+/g, ' ').trim();
    if (!name) {
      showFieldError('survey_name-error', 'لطفاً نام خود را وارد کنید');
      if (nameInput) nameInput.focus();
      return;
    }

    if (!currentSurvey || !Array.isArray(currentSurvey.questions)) return;

    var answers = {};
    var firstMissing = null;
    currentSurvey.questions.forEach(function (q) {
      var selected = form.querySelector('input[name="q_' + q.id + '"]:checked');
      if (!selected) {
        showQuestionError(q.id, 'لطفاً یکی از گزینه‌ها را انتخاب کنید');
        if (!firstMissing) firstMissing = q.id;
        return;
      }
      answers[q.id] = selected.value;
    });

    if (firstMissing) {
      var el = form.querySelector('[data-question-id="' + firstMissing + '"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var submitBtn = document.getElementById('survey-submit');
    setLoading(submitBtn, true);

    postWebhook({
      action: 'submit',
      surveyId: surveyId,
      name: name,
      chatId: chatId,
      source: sourceHint,
      answers: answers
    }).then(function (data) {
      setLoading(submitBtn, false);
      if (!data || !data.ok) {
        if (data && data.code === 'ALREADY_VOTED') {
          renderApiError(data);
          return;
        }
        alert((data && data.message) || 'ثبت نظر با خطا مواجه شد.');
        return;
      }
      openThanksModal(data.name || name);
      renderMessage('success', 'ثبت شد', 'از مشارکت شما سپاسگزاریم.');
    }).catch(function () {
      setLoading(submitBtn, false);
      alert('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
    });
  }

  function openThanksModal(name) {
    if (!modalEl || !thanksTextEl) return;
    thanksTextEl.textContent = name + ' عزیز، نظرت ثبت شد. مرسی از همراهی‌ات.';
    modalEl.hidden = false;
    document.body.classList.add('survey-modal-open');
    var btn = modalEl.querySelector('[data-survey-modal-close]');
    if (btn) btn.focus();
  }

  function closeThanksModal() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.classList.remove('survey-modal-open');
  }

  function postWebhook(payload) {
    return fetch(SURVEY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () {
        return { ok: false, message: 'پاسخ نامعتبر از سرور' };
      });
    });
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.form-error').forEach(function (el) {
      el.hidden = true;
      el.textContent = '';
    });
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
  }

  function showFieldError(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    var group = el.closest('.form-group');
    if (group) group.classList.add('is-invalid');
  }

  function showQuestionError(qid, message) {
    var el = document.querySelector('[data-q-error="' + qid + '"]');
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    var fieldset = el.closest('.survey-question');
    if (fieldset) fieldset.classList.add('is-invalid');
  }

  function setLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'در حال ثبت...' : 'ثبت نظر';
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
})();
