#!/usr/bin/env python3
"""Generate importable n8n survey workflow JSON files."""

from __future__ import annotations

import json
from pathlib import Path

SHEET_ID = "1mRJFme3GuIkIAlqN0OBRMuwyfK5A706eQ-McYHTfaSQ"
OUT = Path(__file__).resolve().parents[1] / "n8n" / "survey"

PUBLIC_PROCESS = r'''
const body = ($('Webhook').first().json.body) || {};
const action = String(body.action || '').trim().toLowerCase();

const surveys = $('Read Surveys').all().map(i => i.json).filter(r => r && r.id);
const questions = $('Read Questions').all().map(i => i.json).filter(r => r && r.id);
const options = $('Read Options').all().map(i => i.json).filter(r => r && r.id);
const responses = $('Read Responses').all().map(i => i.json).filter(r => r && (r.id || r.surveyId));

function flagActive(v) {
  const s = String(v ?? 'TRUE').trim().toUpperCase();
  return s === '' || s === 'TRUE' || s === '1' || s === 'YES' || s === 'بله';
}

function parseDefinition(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw)); } catch (e) { return null; }
}

function buildFromSheets(surveyId) {
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
  const surveyId = String(survey.id).trim();
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
  return buildFromSheets(surveyId);
}

function alreadyVoted(surveyId, chatId) {
  if (!chatId) return false;
  return responses.some(r =>
    String(r.surveyId).trim() === surveyId &&
    String(r.chatId || '').trim() === chatId
  );
}

if (action === 'get') {
  const surveyId = String(body.surveyId || body.id || '').trim();
  const chatId = String(body.chatId || body.cid || '').trim();
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

  if (alreadyVoted(surveyId, chatId)) {
    return [{ json: {
      ok: false,
      code: 'ALREADY_VOTED',
      message: 'شما قبلاً در این نظرسنجی رأی داده‌اید',
      survey: { id: surveyId, title: String(survey.title || '').trim() },
      doAppend: false
    } }];
  }

  const qs = buildQuestions(survey);
  return [{ json: {
    ok: true,
    doAppend: false,
    survey: {
      id: surveyId,
      title: String(survey.title || '').trim(),
      description: String(survey.description || '').trim(),
      status: 'open',
      questions: qs
    }
  } }];
}

if (action === 'submit') {
  const surveyId = String(body.surveyId || body.id || '').trim();
  const chatId = String(body.chatId || body.cid || '').trim();
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const source = String(body.source || (chatId ? 'telegram' : 'web')).trim().slice(0, 40);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  if (!surveyId) {
    return [{ json: { ok: false, code: 'MISSING_ID', message: 'شناسه نظرسنجی مشخص نشده است', doAppend: false } }];
  }
  if (!name) {
    return [{ json: { ok: false, code: 'MISSING_NAME', message: 'لطفاً نام خود را وارد کنید', doAppend: false } }];
  }

  const survey = surveys.find(s => String(s.id).trim() === surveyId);
  if (!survey) {
    return [{ json: { ok: false, code: 'NOT_FOUND', message: 'نظرسنجی یافت نشد', doAppend: false } }];
  }

  const status = String(survey.status || 'open').trim().toLowerCase();
  if (status !== 'open') {
    return [{ json: { ok: false, code: 'CLOSED', message: 'این نظرسنجی بسته شده است', doAppend: false } }];
  }

  if (alreadyVoted(surveyId, chatId)) {
    return [{ json: {
      ok: false,
      code: 'ALREADY_VOTED',
      message: 'شما قبلاً در این نظرسنجی رأی داده‌اید',
      doAppend: false
    } }];
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
      chatId: chatId || '',
      name,
      source,
      answersJson: JSON.stringify(normalized),
      answersText: JSON.stringify(labels),
      submittedAt: now
    },
    responsePayload: {
      ok: true,
      code: 'SUBMITTED',
      message: 'نظر شما با موفقیت ثبت شد',
      name,
      responseId
    }
  } }];
}

return [{ json: { ok: false, code: 'BAD_ACTION', message: 'عملیات نامعتبر است', doAppend: false } }];
'''.strip()

ADMIN_PROCESS = r'''
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

function buildFromSheets(surveyId) {
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
  return buildFromSheets(String(survey.id).trim());
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
      chatId: String(r.chatId || '').trim(),
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

  // Soft-deactivate previous Q/O for this survey (keep history in sheet).
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
'''.strip()


def sheet_node(node_id: str, name: str, sheet: str, operation: str, x: int, y: int, extra: dict | None = None) -> dict:
    params = {
        "operation": operation,
        "documentId": {
            "__rl": True,
            "value": SHEET_ID,
            "mode": "id",
        },
        "sheetName": {
            "__rl": True,
            "value": sheet,
            "mode": "name",
        },
        "options": {},
    }
    if operation == "read":
        params["filtersUI"] = {"values": []}
    if operation in ("append", "appendOrUpdate", "update"):
        params["columns"] = {
            "mappingMode": "autoMapInputData",
            "value": {},
            "matchingColumns": ["id"] if operation == "appendOrUpdate" else [],
            "schema": [],
            "attemptToConvertTypes": False,
            "convertFieldsToString": False,
        }
        if operation == "appendOrUpdate":
            params["options"] = {"cellFormat": "USER_ENTERED"}
    if extra:
        params.update(extra)

    node = {
        "parameters": params,
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [x, y],
        "notes": "بعد از import، credential گوگل شیت را وصل کنید و Document/Sheet را یک‌بار Confirm کنید.",
        "credentials": {
            "googleSheetsOAuth2Api": {
                "id": "REPLACE_WITH_GOOGLE_SHEETS_CREDENTIAL_ID",
                "name": "Google Sheets account",
            }
        },
    }
    if operation == "read":
        node["alwaysOutputData"] = True
    return node


def webhook_node(node_id: str, path: str, x: int, y: int) -> dict:
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


def code_node(node_id: str, name: str, code: str, x: int, y: int, execute_once: bool = False) -> dict:
    node = {
        "parameters": {"jsCode": code},
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, y],
    }
    if execute_once:
        node["executeOnce"] = True
    return node


def respond_node(node_id: str, name: str, body_expr: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "respondWith": "json",
            "responseBody": body_expr,
            "options": {
                "responseHeaders": {
                    "entries": [
                        {"name": "Access-Control-Allow-Origin", "value": "*"},
                        {"name": "Access-Control-Allow-Methods", "value": "POST, OPTIONS"},
                        {"name": "Access-Control-Allow-Headers", "value": "Content-Type"},
                    ]
                }
            },
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [x, y],
    }


def if_node(node_id: str, name: str, left: str, right: str, x: int, y: int) -> dict:
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
                        "id": "cond1",
                        "leftValue": left,
                        "rightValue": right,
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


def switch_node(node_id: str, name: str, value_expr: str, cases: list[str], x: int, y: int) -> dict:
    rules = []
    for i, case in enumerate(cases):
        rules.append(
            {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "loose",
                        "version": 2,
                    },
                    "conditions": [
                        {
                            "id": f"c{i}",
                            "leftValue": value_expr,
                            "rightValue": case,
                            "operator": {"type": "string", "operation": "equals"},
                        }
                    ],
                    "combinator": "and",
                },
                "renameOutput": True,
                "outputKey": case,
            }
        )
    return {
        "parameters": {
            "rules": {"values": rules},
            "options": {"fallbackOutput": "extra"},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.switch",
        "typeVersion": 3.2,
        "position": [x, y],
    }


def merge_node(node_id: str, name: str, n: int, x: int, y: int) -> dict:
    return {
        "parameters": {
            "mode": "combine",
            "combineBy": "combineAll",
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.merge",
        "typeVersion": 3,
        "position": [x, y],
        # numberInputs is on parameters in newer versions
    }


def build_public() -> dict:
    # Parallel reads then Merge is fragile with 4 inputs.
    # Simpler: sequential chain of reads into Code via $('Name') references.
    # Webhook fans out to 4 reads; Code waits needs a Merge of 4.
    # Use Merge with 2+2 pattern.

    nodes = [
        webhook_node("pub-wh", "kbeauty-survey", 260, 400),
        sheet_node("pub-s", "Read Surveys", "Surveys", "read", 520, 160),
        sheet_node("pub-q", "Read Questions", "Questions", "read", 520, 320),
        sheet_node("pub-o", "Read Options", "Options", "read", 520, 480),
        sheet_node("pub-r", "Read Responses", "Responses", "read", 520, 640),
        {
            # append = wait for both branches without cartesian product
            "parameters": {"mode": "append"},
            "id": "pub-m1",
            "name": "Merge SQ",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [760, 240],
        },
        {
            "parameters": {"mode": "append"},
            "id": "pub-m2",
            "name": "Merge OR",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [760, 560],
        },
        {
            "parameters": {"mode": "append"},
            "id": "pub-m3",
            "name": "Merge All",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [980, 400],
        },
        code_node("pub-code", "Process Public", PUBLIC_PROCESS, 1200, 400, execute_once=True),
        if_node("pub-if", "Need Append?", "={{ $json.doAppend }}", "", 1440, 400),
        {
            "parameters": {
                "jsCode": "const row = $json.appendRow;\nreturn [{ json: row }];"
            },
            "id": "pub-prep",
            "name": "Prepare Append Row",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1660, 280],
        },
        sheet_node("pub-ap", "Append Response", "Responses", "append", 1880, 280),
        {
            "parameters": {
                "jsCode": "const prev = $('Process Public').first().json;\nreturn [{ json: prev.responsePayload || { ok: true, message: 'ثبت شد' } }];"
            },
            "id": "pub-ok",
            "name": "Build Success Payload",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2100, 280],
        },
        respond_node("pub-resp-a", "Respond Appended", "={{ $json }}", 2320, 280),
        {
            "parameters": {
                "jsCode": "const j = $json;\nconst { doAppend, appendRow, responsePayload, ...rest } = j;\nreturn [{ json: rest }];"
            },
            "id": "pub-clean",
            "name": "Clean Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1660, 520],
        },
        respond_node("pub-resp-b", "Respond Direct", "={{ $json }}", 1880, 520),
    ]

    connections = {
        "Webhook": {
            "main": [
                [
                    {"node": "Read Surveys", "type": "main", "index": 0},
                    {"node": "Read Questions", "type": "main", "index": 0},
                    {"node": "Read Options", "type": "main", "index": 0},
                    {"node": "Read Responses", "type": "main", "index": 0},
                ]
            ]
        },
        "Read Surveys": {"main": [[{"node": "Merge SQ", "type": "main", "index": 0}]]},
        "Read Questions": {"main": [[{"node": "Merge SQ", "type": "main", "index": 1}]]},
        "Read Options": {"main": [[{"node": "Merge OR", "type": "main", "index": 0}]]},
        "Read Responses": {"main": [[{"node": "Merge OR", "type": "main", "index": 1}]]},
        "Merge SQ": {"main": [[{"node": "Merge All", "type": "main", "index": 0}]]},
        "Merge OR": {"main": [[{"node": "Merge All", "type": "main", "index": 1}]]},
        "Merge All": {"main": [[{"node": "Process Public", "type": "main", "index": 0}]]},
        "Process Public": {"main": [[{"node": "Need Append?", "type": "main", "index": 0}]]},
        "Need Append?": {
            "main": [
                [{"node": "Prepare Append Row", "type": "main", "index": 0}],
                [{"node": "Clean Response", "type": "main", "index": 0}],
            ]
        },
        "Prepare Append Row": {"main": [[{"node": "Append Response", "type": "main", "index": 0}]]},
        "Append Response": {"main": [[{"node": "Build Success Payload", "type": "main", "index": 0}]]},
        "Build Success Payload": {"main": [[{"node": "Respond Appended", "type": "main", "index": 0}]]},
        "Clean Response": {"main": [[{"node": "Respond Direct", "type": "main", "index": 0}]]},
    }

    return {
        "name": "K-Beauty Survey Public",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "meta": {"templateCredsSetupCompleted": False},
        "tags": [],
    }


def build_admin() -> dict:
    # After Process Admin:
    # writeMode none -> respond payload
    # writeMode survey -> upsert survey then respond payload
    # writeMode full -> upsert survey, split questions, upsert Q, split options, upsert O, respond

    # To keep importable and reliable: always run Upsert Survey when writeMode != none,
    # then branch for questions/options.

    admin_finalize = r'''
const mode = String($json.writeMode || 'none');
if (mode === 'none') {
  const { writeMode, surveyRow, questionRows, optionRows, ...rest } = $json;
  return [{ json: { ...rest, _skipWrite: true } }];
}
return [{ json: $json }];
'''.strip()

    prepare_survey = r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || 'none') === 'none') {
  return [{ json: { _skip: true } }];
}
return [{ json: src.surveyRow }];
'''.strip()

    prepare_questions = r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || '') !== 'full') {
  return [];
}
return (src.questionRows || []).map(r => ({ json: r }));
'''.strip()

    prepare_options = r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || '') !== 'full') {
  return [];
}
return (src.optionRows || []).map(r => ({ json: r }));
'''.strip()

    build_payload = r'''
const src = $('Process Admin').first().json;
if (src.payload) return [{ json: src.payload }];
const { writeMode, surveyRow, questionRows, optionRows, ...rest } = src;
return [{ json: rest }];
'''.strip()

    nodes = [
        webhook_node("adm-wh", "kbeauty-survey-admin", 240, 420),
        sheet_node("adm-s", "Read Surveys", "Surveys", "read", 500, 120),
        sheet_node("adm-q", "Read Questions", "Questions", "read", 500, 280),
        sheet_node("adm-o", "Read Options", "Options", "read", 500, 440),
        sheet_node("adm-r", "Read Responses", "Responses", "read", 500, 600),
        sheet_node("adm-a", "Read Admins", "Admins", "read", 500, 760),
        {
            "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
            "id": "adm-m1",
            "name": "Merge S Q",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [760, 200],
        },
        {
            "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
            "id": "adm-m2",
            "name": "Merge O R",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [760, 520],
        },
        {
            "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
            "id": "adm-m3",
            "name": "Merge OR A",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [980, 640],
        },
        {
            "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
            "id": "adm-m4",
            "name": "Merge All",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [1200, 360],
        },
        code_node("adm-code", "Process Admin", ADMIN_PROCESS, 1440, 360),
        if_node("adm-if", "Needs Write?", "={{ $json.writeMode !== 'none' }}", "", 1680, 360),
        code_node("adm-ps", "Prepare Survey Row", prepare_survey, 1920, 200),
        sheet_node("adm-us", "Upsert Survey", "Surveys", "appendOrUpdate", 2140, 200),
        code_node("adm-pq", "Prepare Question Rows", prepare_questions, 1920, 360),
        sheet_node("adm-uq", "Upsert Questions", "Questions", "appendOrUpdate", 2140, 360),
        code_node("adm-po", "Prepare Option Rows", prepare_options, 1920, 520),
        sheet_node("adm-uo", "Upsert Options", "Options", "appendOrUpdate", 2140, 520),
        {
            "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
            "id": "adm-mw",
            "name": "Merge Writes",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [2380, 360],
        },
        code_node("adm-pl", "Build Admin Payload", build_payload, 2600, 360),
        respond_node("adm-rw", "Respond After Write", "={{ $json }}", 2820, 360),
        code_node("adm-pl2", "Build Direct Payload", build_payload, 1920, 700),
        respond_node("adm-rd", "Respond Direct", "={{ $json }}", 2140, 700),
    ]

    # Fix Needs Write IF: boolean expression.compare - use string equals on writeMode
    for n in nodes:
        if n["id"] == "adm-if":
            n["parameters"] = {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "loose",
                        "version": 2,
                    },
                    "conditions": [
                        {
                            "id": "w1",
                            "leftValue": "={{ $json.writeMode }}",
                            "rightValue": "none",
                            "operator": {
                                "type": "string",
                                "operation": "notEquals",
                            },
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            }

    connections = {
        "Webhook": {
            "main": [
                [
                    {"node": "Read Surveys", "type": "main", "index": 0},
                    {"node": "Read Questions", "type": "main", "index": 0},
                    {"node": "Read Options", "type": "main", "index": 0},
                    {"node": "Read Responses", "type": "main", "index": 0},
                    {"node": "Read Admins", "type": "main", "index": 0},
                ]
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
                [
                    {"node": "Prepare Survey Row", "type": "main", "index": 0},
                    {"node": "Prepare Question Rows", "type": "main", "index": 0},
                    {"node": "Prepare Option Rows", "type": "main", "index": 0},
                ],
                [{"node": "Build Direct Payload", "type": "main", "index": 0}],
            ]
        },
        "Prepare Survey Row": {"main": [[{"node": "Upsert Survey", "type": "main", "index": 0}]]},
        "Prepare Question Rows": {"main": [[{"node": "Upsert Questions", "type": "main", "index": 0}]]},
        "Prepare Option Rows": {"main": [[{"node": "Upsert Options", "type": "main", "index": 0}]]},
        "Upsert Survey": {"main": [[{"node": "Merge Writes", "type": "main", "index": 0}]]},
        "Upsert Questions": {"main": [[{"node": "Merge Writes", "type": "main", "index": 1}]]},
        # Options into a second merge stage - only 2 inputs on merge by default!
        # Fix: chain Merge Writes after Q waits for Survey, then another merge for Options
    }

    # Fix merge for 3 writes: Upsert Survey + Upsert Questions -> Merge W1; Merge W1 + Upsert Options -> Merge Writes
    # Rebuild that part of connections and add Merge W1 node.

    nodes = [n for n in nodes if n["id"] != "adm-mw"]
    nodes.extend(
        [
            {
                "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
                "id": "adm-mw1",
                "name": "Merge Survey Questions",
                "type": "n8n-nodes-base.merge",
                "typeVersion": 3,
                "position": [2380, 280],
            },
            {
                "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
                "id": "adm-mw2",
                "name": "Merge Writes",
                "type": "n8n-nodes-base.merge",
                "typeVersion": 3,
                "position": [2600, 400],
            },
        ]
    )
    # reposition payload/respond
    for n in nodes:
        if n["id"] == "adm-pl":
            n["position"] = [2820, 400]
        if n["id"] == "adm-rw":
            n["position"] = [3040, 400]

    connections.update(
        {
            "Upsert Survey": {"main": [[{"node": "Merge Survey Questions", "type": "main", "index": 0}]]},
            "Upsert Questions": {"main": [[{"node": "Merge Survey Questions", "type": "main", "index": 1}]]},
            "Upsert Options": {"main": [[{"node": "Merge Writes", "type": "main", "index": 1}]]},
            "Merge Survey Questions": {"main": [[{"node": "Merge Writes", "type": "main", "index": 0}]]},
            "Merge Writes": {"main": [[{"node": "Build Admin Payload", "type": "main", "index": 0}]]},
            "Build Admin Payload": {"main": [[{"node": "Respond After Write", "type": "main", "index": 0}]]},
            "Build Direct Payload": {"main": [[{"node": "Respond Direct", "type": "main", "index": 0}]]},
        }
    )

    # Problem: when writeMode=survey, Prepare Question/Option return [] empty - Upsert may not run and Merge hangs.
    # Fix Prepare Question/Option to always emit a dummy skip item when not full, and Upsert nodes onError continue,
    # OR use IF and separate paths.

    # Better fix: prepare nodes always return at least one placeholder row with _skip=true,
    # and put IF before upsert sheets.

    for n in nodes:
        if n["id"] == "adm-pq":
            n["parameters"]["jsCode"] = r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || '') !== 'full') {
  return [{ json: { id: '__skip__', surveyId: '', text: '', sortOrder: 0, active: 'FALSE', _skip: true } }];
}
return (src.questionRows || []).map(r => ({ json: r }));
'''.strip()
        if n["id"] == "adm-po":
            n["parameters"]["jsCode"] = r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || '') !== 'full') {
  return [{ json: { id: '__skip__', questionId: '', surveyId: '', text: '', sortOrder: 0, active: 'FALSE', _skip: true } }];
}
return (src.optionRows || []).map(r => ({ json: r }));
'''.strip()
        if n["id"] == "adm-ps":
            n["parameters"]["jsCode"] = r'''
const src = $('Process Admin').first().json;
return [{ json: src.surveyRow }];
'''.strip()

    # Filter skip before upsert with IF nodes - still complex for multi-item.
    # Use Code filter before each upsert:

    filter_q = {
        "parameters": {
            "jsCode": "return $input.all().filter(i => !i.json._skip && i.json.id && i.json.id !== '__skip__');"
        },
        "id": "adm-fq",
        "name": "Filter Questions",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [2030, 360],
    }
    filter_o = {
        "parameters": {
            "jsCode": "return $input.all().filter(i => !i.json._skip && i.json.id && i.json.id !== '__skip__');"
        },
        "id": "adm-fo",
        "name": "Filter Options",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [2030, 520],
    }
    # Empty filter returns no items → Upsert won't execute → Merge waits forever.
    # Ultimate robust approach: don't merge writes. Sequence them:
    # Upsert Survey → Prepare Q → Filter → Upsert Q (alwaysOutput) → Prepare O → Filter → Upsert O → Payload

    # Rebuild write path as sequential to avoid merge deadlock.

    nodes = [
        webhook_node("adm-wh", "kbeauty-survey-admin", 240, 400),
        sheet_node("adm-s", "Read Surveys", "Surveys", "read", 500, 80),
        sheet_node("adm-q", "Read Questions", "Questions", "read", 500, 240),
        sheet_node("adm-o", "Read Options", "Options", "read", 500, 400),
        sheet_node("adm-r", "Read Responses", "Responses", "read", 500, 560),
        sheet_node("adm-a", "Read Admins", "Admins", "read", 500, 720),
        {
            "parameters": {"mode": "append"},
            "id": "adm-m1",
            "name": "Merge S Q",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [760, 160],
        },
        {
            "parameters": {"mode": "append"},
            "id": "adm-m2",
            "name": "Merge O R",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [760, 480],
        },
        {
            "parameters": {"mode": "append"},
            "id": "adm-m3",
            "name": "Merge OR A",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [980, 600],
        },
        {
            "parameters": {"mode": "append"},
            "id": "adm-m4",
            "name": "Merge All",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [1200, 320],
        },
        code_node("adm-code", "Process Admin", ADMIN_PROCESS, 1440, 320, execute_once=True),
        {
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
                            "id": "w1",
                            "leftValue": "={{ $json.writeMode }}",
                            "rightValue": "none",
                            "operator": {"type": "string", "operation": "notEquals"},
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            },
            "id": "adm-if",
            "name": "Needs Write?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [1680, 320],
        },
        code_node(
            "adm-ps",
            "Prepare Survey Row",
            "const src = $('Process Admin').first().json;\nreturn [{ json: src.surveyRow }];",
            1920,
            200,
        ),
        sheet_node("adm-us", "Upsert Survey", "Surveys", "appendOrUpdate", 2140, 200),
        code_node(
            "adm-gate",
            "Gate Questions",
            r'''
const src = $('Process Admin').first().json;
if (String(src.writeMode || '') !== 'full') {
  // Pass a marker so flow continues without writing Q/O
  return [{ json: { _continue: true, _skipQo: true } }];
}
return (src.questionRows || []).map(r => ({ json: { ...r, _skipQo: false } }));
'''.strip(),
            2360,
            200,
        ),
        {
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
                            "id": "sk1",
                            "leftValue": "={{ $json._skipQo }}",
                            "rightValue": True,
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
            "id": "adm-skipq",
            "name": "Skip QO?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2580, 200],
        },
        sheet_node("adm-uq", "Upsert Questions", "Questions", "appendOrUpdate", 2800, 80),
        code_node(
            "adm-po2",
            "Prepare Options After Q",
            r'''
const src = $('Process Admin').first().json;
return (src.optionRows || []).map(r => ({ json: r }));
'''.strip(),
            3020,
            80,
        ),
        sheet_node("adm-uo", "Upsert Options", "Options", "appendOrUpdate", 3240, 80),
        code_node("adm-pl", "Build Admin Payload", build_payload, 3460, 200),
        respond_node("adm-rw", "Respond After Write", "={{ $json }}", 3680, 200),
        code_node("adm-pl2", "Build Direct Payload", build_payload, 1920, 480),
        respond_node("adm-rd", "Respond Direct", "={{ $json }}", 2140, 480),
    ]

    # Upsert Questions receives multiple items from Gate when not skip.
    # Skip branch goes directly to Build Admin Payload.
    # After Upsert Options -> Build Admin Payload.

    connections = {
        "Webhook": {
            "main": [
                [
                    {"node": "Read Surveys", "type": "main", "index": 0},
                    {"node": "Read Questions", "type": "main", "index": 0},
                    {"node": "Read Options", "type": "main", "index": 0},
                    {"node": "Read Responses", "type": "main", "index": 0},
                    {"node": "Read Admins", "type": "main", "index": 0},
                ]
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
        "Upsert Survey": {"main": [[{"node": "Gate Questions", "type": "main", "index": 0}]]},
        "Gate Questions": {"main": [[{"node": "Skip QO?", "type": "main", "index": 0}]]},
        "Skip QO?": {
            "main": [
                [{"node": "Build Admin Payload", "type": "main", "index": 0}],
                [{"node": "Upsert Questions", "type": "main", "index": 0}],
            ]
        },
        "Upsert Questions": {"main": [[{"node": "Prepare Options After Q", "type": "main", "index": 0}]]},
        "Prepare Options After Q": {"main": [[{"node": "Upsert Options", "type": "main", "index": 0}]]},
        "Upsert Options": {"main": [[{"node": "Build Admin Payload", "type": "main", "index": 0}]]},
        "Build Admin Payload": {"main": [[{"node": "Respond After Write", "type": "main", "index": 0}]]},
        "Build Direct Payload": {"main": [[{"node": "Respond Direct", "type": "main", "index": 0}]]},
    }

    # Bug: Gate Questions returns multiple question rows when full — Skip QO? runs per item.
    # First item has _skipQo false → goes to Upsert Questions for each. Good actually.
    # But when skip, one item with _skipQo true → Build Admin Payload. Good.
    #
    # When full: many items all with _skipQo false each hit Upsert Questions — each question upserts.
    # Then EACH triggers Prepare Options After Q which maps ALL optionRows — duplicate option upserts N times.
    # Fix: After Upsert Questions, only once prepare options.
    # Use "Execute Once" on Prepare Options After Q node.

    for n in nodes:
        if n["id"] == "adm-po2":
            n["executeOnce"] = True
        if n["id"] == "adm-pl":
            n["executeOnce"] = True
        if n["name"] == "Upsert Questions":
            # Strip _skipQo field before sheet write via intermediate code
            pass

    # Insert strip node before Upsert Questions
    strip_q = code_node(
        "adm-stripq",
        "Strip Question Meta",
        "return $input.all().map(i => { const { _skipQo, _continue, ...row } = i.json; return { json: row }; });",
        2700,
        40,
    )
    nodes.append(strip_q)
    for n in nodes:
        if n["id"] == "adm-uq":
            n["position"] = [2920, 40]
        if n["id"] == "adm-po2":
            n["position"] = [3140, 40]
        if n["id"] == "adm-uo":
            n["position"] = [3360, 40]
        if n["id"] == "adm-pl":
            n["position"] = [3580, 200]
        if n["id"] == "adm-rw":
            n["position"] = [3800, 200]

    connections["Skip QO?"] = {
        "main": [
            [{"node": "Build Admin Payload", "type": "main", "index": 0}],
            [{"node": "Strip Question Meta", "type": "main", "index": 0}],
        ]
    }
    connections["Strip Question Meta"] = {
        "main": [[{"node": "Upsert Questions", "type": "main", "index": 0}]]
    }

    return {
        "name": "K-Beauty Survey Admin",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "meta": {"templateCredsSetupCompleted": False},
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
    print(f"Wrote {OUT / 'kbeauty-survey-public.json'}")
    print(f"Wrote {OUT / 'kbeauty-survey-admin.json'}")
    print(f"public nodes={len(public['nodes'])} admin nodes={len(admin['nodes'])}")


if __name__ == "__main__":
    main()
