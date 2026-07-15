#!/usr/bin/env python3
"""Generate n8n survey workflows backed by Data Tables (not Google Sheets)."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "n8n" / "survey"

TABLES = {
    "Surveys": "31hDDjJqGtCVb8EJ",
    "Questions": "jnY4tM908NlpE7aA",
    "Options": "Bbc0jmj8o9LOlkDb",
    "Responses": "QewUR3JU77ee4jS7",
    "Admins": "yh9YgO2GRaOP95np",
}

CORS = {
    "responseHeaders": {
        "entries": [
            {"name": "Access-Control-Allow-Origin", "value": "*"},
            {"name": "Access-Control-Allow-Methods", "value": "POST, OPTIONS"},
            {"name": "Access-Control-Allow-Headers", "value": "Content-Type"},
        ]
    }
}

PUBLIC_PROCESS = r'''
try {
  const body = ($('Webhook').first().json.body) || {};
  const action = String(body.action || '').trim().toLowerCase();

  const surveys = $('Read Surveys').all().map(i => i.json).filter(r => r && r.id);
  const questions = $('Read Questions').all().map(i => i.json).filter(r => r && r.id);
  const options = $('Read Options').all().map(i => i.json).filter(r => r && r.id);

  function flagActive(v) {
    const s = String(v ?? 'TRUE').trim().toUpperCase();
    return s === '' || s === 'TRUE' || s === '1' || s === 'YES' || s === 'بله';
  }

  function parseDefinition(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(String(raw)); } catch (e) { return null; }
  }

  function buildFromTables(surveyId) {
    return questions
      .filter(q => String(q.surveyId).trim() === surveyId && flagActive(q.active))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map(q => {
        const qid = String(q.id).trim();
        return {
          id: qid,
          text: String(q.text || '').trim(),
          sortOrder: Number(q.sortOrder || 0),
          options: options
            .filter(o => String(o.questionId).trim() === qid && flagActive(o.active))
            .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
            .map(o => ({
              id: String(o.id).trim(),
              text: String(o.text || '').trim(),
              sortOrder: Number(o.sortOrder || 0)
            }))
        };
      });
  }

  function buildQuestions(survey) {
    const def = parseDefinition(survey.definitionJson);
    if (def && Array.isArray(def.questions) && def.questions.length) {
      return def.questions.map((q, qi) => ({
        id: String(q.id || ('q_' + (qi + 1))).trim(),
        text: String(q.text || '').trim(),
        sortOrder: Number(q.sortOrder != null ? q.sortOrder : qi + 1),
        options: (Array.isArray(q.options) ? q.options : []).map((o, oi) => ({
          id: String(o.id || ('o_' + (qi + 1) + '_' + (oi + 1))).trim(),
          text: String(o.text || '').trim(),
          sortOrder: Number(o.sortOrder != null ? o.sortOrder : oi + 1)
        }))
      }));
    }
    return buildFromTables(String(survey.id).trim());
  }

  if (action === 'get') {
    const surveyId = String(body.surveyId || body.id || '').trim();
    if (!surveyId) {
      return [{ json: { ok: false, code: 'MISSING_ID', message: 'شناسه نظرسنجی مشخص نشده است', doAppend: false } }];
    }

    const survey = surveys.find(s => String(s.id).trim() === surveyId);
    if (!survey) {
      return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', doAppend: false } }];
    }

    const status = String(survey.status || 'open').trim().toLowerCase();
    if (status === 'draft') {
      return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', doAppend: false } }];
    }
    if (status === 'closed') {
      return [{ json: {
        ok: false,
        code: 'CLOSED',
        message: 'این نظرسنجی بسته شده است',
        survey: { id: surveyId, title: String(survey.title || '').trim() },
        doAppend: false
      } }];
    }

    return [{ json: {
      ok: true,
      doAppend: false,
      survey: {
        id: surveyId,
        title: String(survey.title || '').trim(),
        description: String(survey.description || '').trim(),
        status: 'open',
        questions: buildQuestions(survey)
      }
    } }];
  }

  if (action === 'submit') {
    const surveyId = String(body.surveyId || body.id || '').trim();
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const source = String(body.source || 'web').trim().slice(0, 40) || 'web';
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

    if (!surveyId) {
      return [{ json: { ok: false, code: 'MISSING_ID', message: 'شناسه نظرسنجی مشخص نشده است', doAppend: false } }];
    }

    const survey = surveys.find(s => String(s.id).trim() === surveyId);
    if (!survey) {
      return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', doAppend: false } }];
    }

    const status = String(survey.status || 'open').trim().toLowerCase();
    if (status !== 'open') {
      return [{ json: { ok: false, code: 'CLOSED', message: 'این نظرسنجی بسته شده است', doAppend: false } }];
    }

    const qs = buildQuestions(survey);
    if (!qs.length) {
      return [{ json: { ok: false, code: 'EMPTY_SURVEY', message: 'این نظرسنجی هنوز سوالی ندارد', doAppend: false } }];
    }

    const normalized = {};
    const labels = {};
    for (const q of qs) {
      const selected = String(answers[q.id] || '').trim();
      if (!selected) {
        return [{ json: { ok: false, code: 'INCOMPLETE', message: 'لطفاً به همه سوال‌ها پاسخ دهید', doAppend: false } }];
      }
      const opt = (q.options || []).find(o => o.id === selected);
      if (!opt) {
        return [{ json: { ok: false, code: 'INVALID_OPTION', message: 'گزینه انتخاب‌شده معتبر نیست', doAppend: false } }];
      }
      normalized[q.id] = opt.id;
      labels[q.id] = { question: q.text, optionId: opt.id, option: opt.text };
    }

    const now = new Date().toISOString();
    const responseId = 'rsp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

    return [{ json: {
      ok: true,
      doAppend: true,
      appendRow: {
        id: responseId,
        surveyId,
        name: name || '',
        source,
        answersJson: JSON.stringify(normalized),
        answersText: JSON.stringify(labels),
        submittedAt: now
      },
      responsePayload: {
        ok: true,
        code: 'SUBMITTED',
        message: 'نظر شما با موفقیت ثبت شد',
        responseId
      }
    } }];
  }

  return [{ json: { ok: false, code: 'BAD_ACTION', message: 'عملیات نامعتبر است', doAppend: false } }];
} catch (err) {
  return [{ json: {
    ok: false,
    code: 'SERVER_ERROR',
    message: 'خطای داخلی سرور در پردازش نظرسنجی',
    detail: String(err && err.message ? err.message : err),
    doAppend: false
  } }];
}
'''.strip()

ADMIN_PROCESS = r'''
try {
  const body = ($('Webhook').first().json.body) || {};
  const action = String(body.action || '').trim().toLowerCase();
  const token = String(body.token || '').trim();

  const surveys = $('Read Surveys').all().map(i => i.json).filter(r => r && r.id);
  const questions = $('Read Questions').all().map(i => i.json).filter(r => r && r.id);
  const options = $('Read Options').all().map(i => i.json).filter(r => r && r.id);
  const responses = $('Read Responses').all().map(i => i.json).filter(r => r && (r.id || r.surveyId));
  const admins = $('Read Admins').all().map(i => i.json).filter(r => r && (r.password || r.token));

  function flagActive(v) {
    const s = String(v ?? 'TRUE').trim().toUpperCase();
    return s === '' || s === 'TRUE' || s === '1' || s === 'YES' || s === 'بله';
  }

  function parseDefinition(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(String(raw)); } catch (e) { return null; }
  }

  function authAdmin() {
    if (!token) return null;
    return admins.find(a => flagActive(a.active) && String(a.token || '').trim() === token) || null;
  }

  function buildFromTables(surveyId) {
    return questions
      .filter(q => String(q.surveyId).trim() === surveyId && flagActive(q.active))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map(q => {
        const qid = String(q.id).trim();
        return {
          id: qid,
          text: String(q.text || '').trim(),
          sortOrder: Number(q.sortOrder || 0),
          options: options
            .filter(o => String(o.questionId).trim() === qid && flagActive(o.active))
            .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
            .map(o => ({
              id: String(o.id).trim(),
              text: String(o.text || '').trim(),
              sortOrder: Number(o.sortOrder || 0)
            }))
        };
      });
  }

  function buildQuestions(survey) {
    const def = parseDefinition(survey.definitionJson);
    if (def && Array.isArray(def.questions) && def.questions.length) {
      return def.questions.map((q, qi) => ({
        id: String(q.id || ('q_' + (qi + 1))).trim(),
        text: String(q.text || '').trim(),
        sortOrder: Number(q.sortOrder != null ? q.sortOrder : qi + 1),
        options: (Array.isArray(q.options) ? q.options : []).map((o, oi) => ({
          id: String(o.id || ('o_' + (qi + 1) + '_' + (oi + 1))).trim(),
          text: String(o.text || '').trim(),
          sortOrder: Number(o.sortOrder != null ? o.sortOrder : oi + 1)
        }))
      }));
    }
    return buildFromTables(String(survey.id).trim());
  }

  function slugify(input) {
    return String(input || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_+]/g, '')
      .replace(/\-+/g, '-')
      .slice(0, 48) || ('survey_' + Date.now().toString(36));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function unauthorized() {
    return [{ json: {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'دسترسی مجاز نیست. دوباره وارد شوید.',
      writeMode: 'none'
    } }];
  }

  if (action === 'login') {
    const password = String(body.password || '').trim();
    if (!password) {
      return [{ json: { ok: false, code: 'MISSING_PASSWORD', message: 'رمز عبور را وارد کنید', writeMode: 'none' } }];
    }
    const admin = admins.find(a => flagActive(a.active) && String(a.password || '') === password);
    if (!admin) {
      return [{ json: { ok: false, code: 'BAD_CREDENTIALS', message: 'رمز عبور اشتباه است', writeMode: 'none' } }];
    }
    return [{ json: {
      ok: true,
      writeMode: 'none',
      token: String(admin.token || '').trim(),
      admin: {
        name: String(admin.name || 'Admin').trim(),
        email: String(admin.email || '').trim()
      }
    } }];
  }

  const admin = authAdmin();
  if (!admin) return unauthorized();

  if (action === 'list') {
    const list = surveys
      .map(s => {
        const id = String(s.id).trim();
        const count = responses.filter(r => String(r.surveyId).trim() === id).length;
        return {
          id,
          title: String(s.title || '').trim(),
          description: String(s.description || '').trim(),
          status: String(s.status || 'open').trim().toLowerCase(),
          createdAt: String(s.createdAt || '').trim(),
          updatedAt: String(s.updatedAt || '').trim(),
          responseCount: count
        };
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));

    return [{ json: { ok: true, writeMode: 'none', surveys: list } }];
  }

  if (action === 'get') {
    const surveyId = String(body.surveyId || body.id || '').trim();
    const survey = surveys.find(s => String(s.id).trim() === surveyId);
    if (!survey) {
      return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', writeMode: 'none' } }];
    }
    return [{ json: {
      ok: true,
      writeMode: 'none',
      survey: {
        id: String(survey.id).trim(),
        title: String(survey.title || '').trim(),
        description: String(survey.description || '').trim(),
        status: String(survey.status || 'open').trim().toLowerCase(),
        createdAt: String(survey.createdAt || '').trim(),
        updatedAt: String(survey.updatedAt || '').trim(),
        questions: buildQuestions(survey)
      }
    } }];
  }

  if (action === 'setstatus') {
    const surveyId = String(body.surveyId || body.id || '').trim();
    const status = String(body.status || '').trim().toLowerCase();
    if (!['open', 'closed', 'draft'].includes(status)) {
      return [{ json: { ok: false, code: 'BAD_STATUS', message: 'وضعیت نامعتبر است', writeMode: 'none' } }];
    }
    const survey = surveys.find(s => String(s.id).trim() === surveyId);
    if (!survey) {
      return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', writeMode: 'none' } }];
    }
    const now = new Date().toISOString();
    return [{ json: {
      ok: true,
      writeMode: 'survey',
      surveyRow: {
        id: surveyId,
        title: String(survey.title || '').trim(),
        description: String(survey.description || '').trim(),
        status,
        definitionJson: String(survey.definitionJson || ''),
        createdAt: String(survey.createdAt || now),
        updatedAt: now
      },
      questionRows: [],
      optionRows: [],
      payload: { ok: true, surveyId, status, message: 'وضعیت نظرسنجی به‌روز شد' }
    } }];
  }

  if (action === 'results') {
    const surveyId = String(body.surveyId || body.id || '').trim();
    const survey = surveys.find(s => String(s.id).trim() === surveyId);
    if (!survey) {
      return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', writeMode: 'none' } }];
    }
    const qs = buildQuestions(survey);
    const rows = responses
      .filter(r => String(r.surveyId).trim() === surveyId)
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

    const questionsStats = qs.map(q => {
      const counts = {};
      for (const o of q.options) counts[o.id] = 0;
      let answered = 0;
      for (const r of rows) {
        let parsed = {};
        try { parsed = JSON.parse(String(r.answersJson || '{}')); } catch (e) { parsed = {}; }
        const optId = parsed[q.id];
        if (optId && counts[optId] != null) {
          counts[optId] += 1;
          answered += 1;
        }
      }
      return {
        id: q.id,
        text: q.text,
        totalAnswers: answered,
        options: q.options.map(o => ({
          id: o.id,
          text: o.text,
          count: counts[o.id] || 0,
          percent: answered ? Math.round(((counts[o.id] || 0) / answered) * 1000) / 10 : 0
        }))
      };
    });

    return [{ json: {
      ok: true,
      writeMode: 'none',
      survey: {
        id: surveyId,
        title: String(survey.title || '').trim(),
        status: String(survey.status || 'open').trim().toLowerCase()
      },
      totalResponses: rows.length,
      questions: questionsStats,
      responses: rows.map(r => ({
        id: String(r.id || '').trim(),
        name: String(r.name || '').trim(),
        source: String(r.source || '').trim(),
        answersJson: String(r.answersJson || ''),
        answersText: String(r.answersText || ''),
        submittedAt: String(r.submittedAt || '').trim()
      }))
    } }];
  }

  if (action === 'save') {
    const incoming = body.survey && typeof body.survey === 'object' ? body.survey : {};
    let surveyId = String(incoming.id || body.surveyId || '').trim();
    const isNew = !surveyId || !surveys.some(s => String(s.id).trim() === surveyId);
    if (!surveyId) surveyId = slugify(incoming.title || incoming.slug || 'survey');
    if (isNew && surveys.some(s => String(s.id).trim() === surveyId)) {
      surveyId = surveyId + '_' + Date.now().toString(36);
    }

    const title = String(incoming.title || '').trim();
    if (!title) {
      return [{ json: { ok: false, code: 'MISSING_TITLE', message: 'عنوان نظرسنجی الزامی است', writeMode: 'none' } }];
    }

    const status = String(incoming.status || 'open').trim().toLowerCase();
    if (!['open', 'closed', 'draft'].includes(status)) {
      return [{ json: { ok: false, code: 'BAD_STATUS', message: 'وضعیت نامعتبر است', writeMode: 'none' } }];
    }

    const rawQuestions = Array.isArray(incoming.questions) ? incoming.questions : [];
    if (!rawQuestions.length) {
      return [{ json: { ok: false, code: 'MISSING_QUESTIONS', message: 'حداقل یک سوال لازم است', writeMode: 'none' } }];
    }

    const normalizedQuestions = [];
    const questionRows = [];
    const optionRows = [];

    rawQuestions.forEach((q, qi) => {
      const qid = String(q.id || uid('q')).trim();
      const qtext = String(q.text || '').trim();
      const qOrder = Number(q.sortOrder != null ? q.sortOrder : qi + 1);
      const qOpts = Array.isArray(q.options) ? q.options : [];
      if (!qtext || qOpts.length < 2) return;

      const normOpts = [];
      qOpts.forEach((o, oi) => {
        const oid = String(o.id || uid('o')).trim();
        const otext = String(o.text || '').trim();
        if (!otext) return;
        const oOrder = Number(o.sortOrder != null ? o.sortOrder : oi + 1);
        normOpts.push({ id: oid, text: otext, sortOrder: oOrder });
        optionRows.push({
          id: oid,
          questionId: qid,
          surveyId,
          text: otext,
          sortOrder: oOrder,
          active: 'TRUE'
        });
      });

      if (normOpts.length < 2) return;
      normalizedQuestions.push({ id: qid, text: qtext, sortOrder: qOrder, options: normOpts });
      questionRows.push({
        id: qid,
        surveyId,
        text: qtext,
        sortOrder: qOrder,
        active: 'TRUE'
      });
    });

    if (!normalizedQuestions.length) {
      return [{ json: { ok: false, code: 'INVALID_QUESTIONS', message: 'سوال‌ها یا گزینه‌ها ناقص هستند', writeMode: 'none' } }];
    }

    for (const q of questions) {
      if (String(q.surveyId).trim() !== surveyId) continue;
      if (!questionRows.some(nq => nq.id === String(q.id).trim())) {
        questionRows.push({
          id: String(q.id).trim(),
          surveyId,
          text: String(q.text || '').trim(),
          sortOrder: Number(q.sortOrder || 0),
          active: 'FALSE'
        });
      }
    }
    for (const o of options) {
      if (String(o.surveyId).trim() !== surveyId) continue;
      if (!optionRows.some(no => no.id === String(o.id).trim())) {
        optionRows.push({
          id: String(o.id).trim(),
          questionId: String(o.questionId || '').trim(),
          surveyId,
          text: String(o.text || '').trim(),
          sortOrder: Number(o.sortOrder || 0),
          active: 'FALSE'
        });
      }
    }

    const existing = surveys.find(s => String(s.id).trim() === surveyId);
    const now = new Date().toISOString();
    const definitionJson = JSON.stringify({ questions: normalizedQuestions });

    return [{ json: {
      ok: true,
      writeMode: 'full',
      surveyRow: {
        id: surveyId,
        title,
        description: String(incoming.description || '').trim(),
        status,
        definitionJson,
        createdAt: existing ? String(existing.createdAt || now) : now,
        updatedAt: now
      },
      questionRows,
      optionRows,
      payload: {
        ok: true,
        message: isNew ? 'نظرسنجی ساخته شد' : 'نظرسنجی ذخیره شد',
        surveyId,
        publicUrl: 'https://k-beauty.academy/survey.html?id=' + encodeURIComponent(surveyId)
      }
    } }];
  }

  return [{ json: { ok: false, code: 'BAD_ACTION', message: 'عملیات نامعتبر است', writeMode: 'none' } }];
} catch (err) {
  return [{ json: {
    ok: false,
    code: 'SERVER_ERROR',
    message: 'خطای داخلی سرور در پنل ادمین',
    detail: String(err && err.message ? err.message : err),
    writeMode: 'none'
  } }];
}
'''.strip()


def table_id(name: str) -> dict:
    return {
        "__rl": True,
        "mode": "id",
        "value": TABLES[name],
        "cachedResultName": f"K Beauty Survey {name}",
    }


def dt_get(node_id: str, name: str, table: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "resource": "row",
            "operation": "get",
            "dataTableId": table_id(table),
            "returnAll": True,
            "filters": {"conditions": []},
            "options": {"alwaysOutputData": True},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.dataTable",
        "typeVersion": 1,
        "position": [x, y],
        "alwaysOutputData": True,
        "onError": "continueRegularOutput",
        "notes": f"Data Table ID: {TABLES[table]}",
    }


def dt_insert(node_id: str, name: str, table: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "resource": "row",
            "operation": "insert",
            "dataTableId": table_id(table),
            "columns": {
                "mappingMode": "autoMapInputData",
                "value": {},
            },
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.dataTable",
        "typeVersion": 1,
        "position": [x, y],
        "onError": "continueErrorOutput",
        "notes": f"Data Table ID: {TABLES[table]}",
    }


def dt_upsert(node_id: str, name: str, table: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "resource": "row",
            "operation": "upsert",
            "dataTableId": table_id(table),
            "matchType": "allConditions",
            "filters": {
                "conditions": [
                    {
                        "keyName": "id",
                        "condition": "equals",
                        "keyValue": "={{ $json.id }}",
                    }
                ]
            },
            "columns": {
                "mappingMode": "autoMapInputData",
                "value": {},
            },
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.dataTable",
        "typeVersion": 1,
        "position": [x, y],
        "onError": "continueErrorOutput",
        "notes": f"Data Table ID: {TABLES[table]}",
    }


def webhook(node_id: str, path: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "httpMethod": "POST",
            "path": path,
            "responseMode": "responseNode",
            "options": {"allowedOrigins": "*"},
        },
        "id": node_id,
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [x, y],
        "webhookId": path,
    }


def code(node_id: str, name: str, js: str, x: int, y: int, execute_once: bool = False) -> dict:
    node = {
        "parameters": {"jsCode": js},
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, y],
        "onError": "continueRegularOutput",
    }
    if execute_once:
        node["executeOnce"] = True
    return node


def respond(node_id: str, name: str, body: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "respondWith": "json",
            "responseBody": body,
            "options": CORS,
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [x, y],
    }


def respond_fixed(node_id: str, name: str, payload: dict, x: int, y: int) -> dict:
    return {
        "parameters": {
            "respondWith": "json",
            "responseBody": json.dumps(payload, ensure_ascii=False),
            "options": CORS,
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [x, y],
    }


def if_bool(node_id: str, name: str, expr: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "loose",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": "c1",
                        "leftValue": expr,
                        "rightValue": "",
                        "operator": {
                            "type": "boolean",
                            "operation": "true",
                            "singleValue": True,
                        },
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [x, y],
    }


def if_ne(node_id: str, name: str, left: str, right: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "loose",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": "c1",
                        "leftValue": left,
                        "rightValue": right,
                        "operator": {"type": "string", "operation": "notEquals"},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [x, y],
    }


def merge_append(node_id: str, name: str, x: int, y: int) -> dict:
    return {
        "parameters": {"mode": "append"},
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.merge",
        "typeVersion": 3,
        "position": [x, y],
    }


def build_public() -> dict:
    nodes = [
        webhook("pub-wh", "kbeauty-survey", 220, 380),
        code(
            "pub-val",
            "Validate Request",
            r'''
const body = ($json.body) || {};
const action = String(body.action || '').trim().toLowerCase();
if (!action) {
  return [{ json: { ok: false, code: 'MISSING_ACTION', message: 'پارامتر action الزامی است', valid: false } }];
}
if (!['get', 'submit'].includes(action)) {
  return [{ json: { ok: false, code: 'BAD_ACTION', message: 'عملیات نامعتبر است', valid: false } }];
}
return [{ json: { ...$json, valid: true, action } }];
'''.strip(),
            440,
            380,
        ),
        if_bool("pub-vif", "Request Valid?", "={{ $json.valid }}", 660, 380),
        respond("pub-rbad", "Respond Bad Request", "={{ $json }}", 900, 560),
        dt_get("pub-s", "Read Surveys", "Surveys", 900, 120),
        dt_get("pub-q", "Read Questions", "Questions", 900, 280),
        dt_get("pub-o", "Read Options", "Options", 900, 440),
        merge_append("pub-m1", "Merge SQ", 1140, 200),
        merge_append("pub-m2", "Merge All", 1360, 320),
        code("pub-code", "Process Public", PUBLIC_PROCESS, 1580, 320, execute_once=True),
        if_bool("pub-if", "Need Append?", "={{ $json.doAppend }}", 1800, 320),
        code(
            "pub-prep",
            "Prepare Append Row",
            "const row = $json.appendRow;\nif (!row || !row.id) {\n  return [{ json: { ok: false, code: 'APPEND_PREP_FAILED', message: 'آماده‌سازی ردیف پاسخ ناموفق بود' } }];\n}\nreturn [{ json: row }];",
            2020,
            200,
        ),
        dt_insert("pub-ins", "Insert Response", "Responses", 2240, 200),
        code(
            "pub-ok",
            "Build Success Payload",
            "const prev = $('Process Public').first().json;\nreturn [{ json: prev.responsePayload || { ok: true, message: 'ثبت شد' } }];",
            2460,
            120,
        ),
        respond("pub-rok", "Respond Success", "={{ $json }}", 2680, 120),
        respond_fixed(
            "pub-rins-err",
            "Respond Insert Error",
            {
                "ok": False,
                "code": "INSERT_FAILED",
                "message": "ثبت نظر با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
            },
            2460,
            300,
        ),
        code(
            "pub-clean",
            "Clean Response",
            "const j = $json || {};\nconst { doAppend, appendRow, responsePayload, ...rest } = j;\nif (!Object.keys(rest).length && responsePayload) return [{ json: responsePayload }];\nreturn [{ json: rest.ok === undefined ? { ok: false, code: 'EMPTY', message: 'پاسخ خالی از سرور' } : rest }];",
            2020,
            460,
        ),
        respond("pub-rdirect", "Respond Direct", "={{ $json }}", 2240, 460),
    ]

    connections = {
        "Webhook": {"main": [[{"node": "Validate Request", "type": "main", "index": 0}]]},
        "Validate Request": {"main": [[{"node": "Request Valid?", "type": "main", "index": 0}]]},
        "Request Valid?": {
            "main": [
                [
                    {"node": "Read Surveys", "type": "main", "index": 0},
                    {"node": "Read Questions", "type": "main", "index": 0},
                    {"node": "Read Options", "type": "main", "index": 0},
                ],
                [{"node": "Respond Bad Request", "type": "main", "index": 0}],
            ]
        },
        "Read Surveys": {"main": [[{"node": "Merge SQ", "type": "main", "index": 0}]]},
        "Read Questions": {"main": [[{"node": "Merge SQ", "type": "main", "index": 1}]]},
        "Read Options": {"main": [[{"node": "Merge All", "type": "main", "index": 1}]]},
        "Merge SQ": {"main": [[{"node": "Merge All", "type": "main", "index": 0}]]},
        "Merge All": {"main": [[{"node": "Process Public", "type": "main", "index": 0}]]},
        "Process Public": {"main": [[{"node": "Need Append?", "type": "main", "index": 0}]]},
        "Need Append?": {
            "main": [
                [{"node": "Prepare Append Row", "type": "main", "index": 0}],
                [{"node": "Clean Response", "type": "main", "index": 0}],
            ]
        },
        "Prepare Append Row": {"main": [[{"node": "Insert Response", "type": "main", "index": 0}]]},
        "Insert Response": {
            "main": [
                [{"node": "Build Success Payload", "type": "main", "index": 0}],
                [{"node": "Respond Insert Error", "type": "main", "index": 0}],
            ]
        },
        "Build Success Payload": {"main": [[{"node": "Respond Success", "type": "main", "index": 0}]]},
        "Clean Response": {"main": [[{"node": "Respond Direct", "type": "main", "index": 0}]]},
    }

    return {
        "name": "K-Beauty Survey Public",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "meta": {"templateCredsSetupCompleted": True},
        "tags": [],
    }


def build_admin() -> dict:
    build_payload = r'''
const src = $('Process Admin').first().json;
if (!src) {
  return [{ json: { ok: false, code: 'EMPTY', message: 'پاسخ خالی از پردازشگر' } }];
}
if (src.payload) return [{ json: src.payload }];
const { writeMode, surveyRow, questionRows, optionRows, ...rest } = src;
return [{ json: rest }];
'''.strip()

    nodes = [
        webhook("adm-wh", "kbeauty-survey-admin", 220, 400),
        code(
            "adm-val",
            "Validate Admin Request",
            r'''
const body = ($json.body) || {};
const action = String(body.action || '').trim().toLowerCase();
if (!action) {
  return [{ json: { ok: false, code: 'MISSING_ACTION', message: 'پارامتر action الزامی است', valid: false } }];
}
const allowed = ['login','list','get','save','setstatus','results'];
if (!allowed.includes(action)) {
  return [{ json: { ok: false, code: 'BAD_ACTION', message: 'عملیات نامعتبر است', valid: false } }];
}
return [{ json: { ...$json, valid: true, action } }];
'''.strip(),
            440,
            400,
        ),
        if_bool("adm-vif", "Admin Request Valid?", "={{ $json.valid }}", 660, 400),
        respond("adm-rbad", "Respond Bad Request", "={{ $json }}", 900, 700),
        dt_get("adm-s", "Read Surveys", "Surveys", 900, 40),
        dt_get("adm-q", "Read Questions", "Questions", 900, 180),
        dt_get("adm-o", "Read Options", "Options", 900, 320),
        dt_get("adm-r", "Read Responses", "Responses", 900, 460),
        dt_get("adm-a", "Read Admins", "Admins", 900, 600),
        merge_append("adm-m1", "Merge S Q", 1140, 110),
        merge_append("adm-m2", "Merge O R", 1140, 390),
        merge_append("adm-m3", "Merge OR A", 1360, 500),
        merge_append("adm-m4", "Merge All", 1580, 300),
        code("adm-code", "Process Admin", ADMIN_PROCESS, 1800, 300, execute_once=True),
        if_ne("adm-if", "Needs Write?", "={{ $json.writeMode }}", "none", 2020, 300),
        code(
            "adm-ps",
            "Prepare Survey Row",
            "const src = $('Process Admin').first().json;\nif (!src.surveyRow || !src.surveyRow.id) {\n  return [{ json: { ok: false, code: 'WRITE_PREP_FAILED', message: 'آماده‌سازی نظرسنجی ناموفق بود', _fail: true } }];\n}\nreturn [{ json: src.surveyRow }];",
            2240,
            160,
        ),
        dt_upsert("adm-us", "Upsert Survey", "Surveys", 2460, 160),
        code(
            "adm-gate",
            "Gate Questions",
            r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || '') !== 'full') {
  return [{ json: { _skipQo: true } }];
}
return (src.questionRows || []).map(r => ({ json: { ...r, _skipQo: false } }));
'''.strip(),
            2680,
            160,
        ),
        if_bool("adm-skipq", "Skip QO?", "={{ $json._skipQo }}", 2900, 160),
        code(
            "adm-stripq",
            "Strip Question Meta",
            "return $input.all().map(i => { const { _skipQo, ...row } = i.json; return { json: row }; });",
            3120,
            40,
        ),
        dt_upsert("adm-uq", "Upsert Questions", "Questions", 3340, 40),
        code(
            "adm-po",
            "Prepare Options After Q",
            "const src = $('Process Admin').first().json;\nreturn (src.optionRows || []).map(r => ({ json: r }));",
            3560,
            40,
            execute_once=True,
        ),
        dt_upsert("adm-uo", "Upsert Options", "Options", 3780, 40),
        code("adm-pl", "Build Admin Payload", build_payload, 4000, 160, execute_once=True),
        respond("adm-rw", "Respond After Write", "={{ $json }}", 4220, 160),
        respond_fixed(
            "adm-rwrite-err",
            "Respond Write Error",
            {
                "ok": False,
                "code": "WRITE_FAILED",
                "message": "ذخیره در Data Table با خطا مواجه شد. دوباره تلاش کنید.",
            },
            2900,
            360,
        ),
        code("adm-pl2", "Build Direct Payload", build_payload, 2240, 480),
        respond("adm-rd", "Respond Direct", "={{ $json }}", 2460, 480),
    ]

    connections = {
        "Webhook": {"main": [[{"node": "Validate Admin Request", "type": "main", "index": 0}]]},
        "Validate Admin Request": {"main": [[{"node": "Admin Request Valid?", "type": "main", "index": 0}]]},
        "Admin Request Valid?": {
            "main": [
                [
                    {"node": "Read Surveys", "type": "main", "index": 0},
                    {"node": "Read Questions", "type": "main", "index": 0},
                    {"node": "Read Options", "type": "main", "index": 0},
                    {"node": "Read Responses", "type": "main", "index": 0},
                    {"node": "Read Admins", "type": "main", "index": 0},
                ],
                [{"node": "Respond Bad Request", "type": "main", "index": 0}],
            ]
        },
        "Read Surveys": {"main": [[{"node": "Merge S Q", "type": "main", "index": 0}]]},
        "Read Questions": {"main": [[{"node": "Merge S Q", "type": "main", "index": 1}]]},
        "Read Options": {"main": [[{"node": "Merge O R", "type": "main", "index": 0}]]},
        "Read Responses": {"main": [[{"node": "Merge O R", "type": "main", "index": 1}]]},
        "Merge O R": {"main": [[{"node": "Merge OR A", "type": "main", "index": 0}]]},
        "Read Admins": {"main": [[{"node": "Merge OR A", "type": "main", "index": 1}]]},
        "Merge S Q": {"main": [[{"node": "Merge All", "type": "main", "index": 0}]]},
        "Merge OR A": {"main": [[{"node": "Merge All", "type": "main", "index": 1}]]},
        "Merge All": {"main": [[{"node": "Process Admin", "type": "main", "index": 0}]]},
        "Process Admin": {"main": [[{"node": "Needs Write?", "type": "main", "index": 0}]]},
        "Needs Write?": {
            "main": [
                [{"node": "Prepare Survey Row", "type": "main", "index": 0}],
                [{"node": "Build Direct Payload", "type": "main", "index": 0}],
            ]
        },
        "Prepare Survey Row": {"main": [[{"node": "Upsert Survey", "type": "main", "index": 0}]]},
        "Upsert Survey": {
            "main": [
                [{"node": "Gate Questions", "type": "main", "index": 0}],
                [{"node": "Respond Write Error", "type": "main", "index": 0}],
            ]
        },
        "Gate Questions": {"main": [[{"node": "Skip QO?", "type": "main", "index": 0}]]},
        "Skip QO?": {
            "main": [
                [{"node": "Build Admin Payload", "type": "main", "index": 0}],
                [{"node": "Strip Question Meta", "type": "main", "index": 0}],
            ]
        },
        "Strip Question Meta": {"main": [[{"node": "Upsert Questions", "type": "main", "index": 0}]]},
        "Upsert Questions": {
            "main": [
                [{"node": "Prepare Options After Q", "type": "main", "index": 0}],
                [{"node": "Respond Write Error", "type": "main", "index": 0}],
            ]
        },
        "Prepare Options After Q": {"main": [[{"node": "Upsert Options", "type": "main", "index": 0}]]},
        "Upsert Options": {
            "main": [
                [{"node": "Build Admin Payload", "type": "main", "index": 0}],
                [{"node": "Respond Write Error", "type": "main", "index": 0}],
            ]
        },
        "Build Admin Payload": {"main": [[{"node": "Respond After Write", "type": "main", "index": 0}]]},
        "Build Direct Payload": {"main": [[{"node": "Respond Direct", "type": "main", "index": 0}]]},
    }

    return {
        "name": "K-Beauty Survey Admin",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "meta": {"templateCredsSetupCompleted": True},
        "tags": [],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    public = build_public()
    admin = build_admin()
    (OUT / "kbeauty-survey-public.json").write_text(
        json.dumps(public, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "kbeauty-survey-admin.json").write_text(
        json.dumps(admin, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote public nodes={len(public['nodes'])}")
    print(f"Wrote admin nodes={len(admin['nodes'])}")


if __name__ == "__main__":
    main()
