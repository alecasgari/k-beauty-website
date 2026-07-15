# K-Beauty — سیستم نظرسنجی (n8n + Google Sheets)

سایت استاتیک است؛ تعریف نظرسنجی، ثبت رأی، احراز هویت ادمین و آمار همگی از طریق webhookهای n8n و Google Sheets انجام می‌شود.

**Spreadsheet ID:** `1mRJFme3GuIkIAlqN0OBRMuwyfK5A706eQ-McYHTfaSQ`

---

## فایل‌های Import

| فایل | نام Workflow | Webhook Path |
|------|--------------|--------------|
| `kbeauty-survey-public.json` | K-Beauty Survey Public | `POST /webhook/kbeauty-survey` |
| `kbeauty-survey-admin.json` | K-Beauty Survey Admin | `POST /webhook/kbeauty-survey-admin` |

در n8n: **Workflows → Import from File** برای هر دو فایل.

بعد از import:

1. روی هر نود Google Sheets، credential حساب گوگل را وصل کنید.
2. Document را Confirm کنید (همان Sheet ID بالا).
3. نام شیت‌ها را Confirm کنید (`Surveys`, `Questions`, `Options`, `Responses`, `Admins`).
4. هر دو workflow را **Active** کنید.
5. در نود Webhook، CORS / Allowed Origins روی `*` است.

URL نهایی:

```
https://n8n.alecasgari.com/webhook/kbeauty-survey
https://n8n.alecasgari.com/webhook/kbeauty-survey-admin
```

---

## ستون‌های Google Sheets (دقیق)

ردیف اول هر شیت باید **دقیقاً** همین هدرها باشد (حساس به حروف).

### ۱) `Surveys`

| ستون | توضیح | مثال |
|------|--------|------|
| `id` | شناسه یکتا (لاتین، بدون فاصله) | `webinar-next` |
| `title` | عنوان | `نظرسنجی وبینار بعدی` |
| `description` | توضیح کوتاه (اختیاری) | `لطفاً موضوع، زمان و تاریخ را انتخاب کنید` |
| `status` | `open` / `closed` / `draft` | `open` |
| `definitionJson` | JSON کامل سوال‌ها (منبع حقیقت فرم) | رجوع به بخش Seed |
| `createdAt` | ISO datetime | `2026-07-15T10:00:00.000Z` |
| `updatedAt` | ISO datetime | `2026-07-15T10:00:00.000Z` |

> `draft` برای مخاطب دیده نمی‌شود. `closed` پیام بسته شدن می‌دهد.

### ۲) `Questions`

| ستون | توضیح | مثال |
|------|--------|------|
| `id` | شناسه سوال | `q_topic` |
| `surveyId` | ارجاع به Surveys.id | `webinar-next` |
| `text` | متن سوال | `موضوع وبینار بعدی چیست؟` |
| `sortOrder` | ترتیب (عدد) | `1` |
| `active` | `TRUE` / `FALSE` | `TRUE` |

### ۳) `Options`

| ستون | توضیح | مثال |
|------|--------|------|
| `id` | شناسه گزینه | `opt_nad` |
| `questionId` | ارجاع به Questions.id | `q_topic` |
| `surveyId` | ارجاع به Surveys.id | `webinar-next` |
| `text` | متن گزینه | `آشنایی و مرور مجدد روی Nad+` |
| `sortOrder` | ترتیب | `1` |
| `active` | `TRUE` / `FALSE` | `TRUE` |

> پنل ادمین هنگام Save هم `definitionJson` را می‌نویسد و هم Questions/Options را upsert می‌کند. سطرهای قدیمی همان نظرسنجی که دیگر در تعریف نیستند `active=FALSE` می‌شوند.

### ۴) `Responses`

| ستون | توضیح | مثال |
|------|--------|------|
| `id` | شناسه پاسخ | `rsp_...` |
| `surveyId` | نظرسنجی | `webinar-next` |
| `chatId` | چت‌آیدی تلگرام (اگر باشد) | `123456789` |
| `name` | نام شرکت‌کننده | `علی رضایی` |
| `source` | `telegram` / `web` / … | `telegram` |
| `answersJson` | `{ "q_topic": "opt_nad", ... }` | |
| `answersText` | نسخه خوانا با متن سوال/گزینه | |
| `submittedAt` | ISO datetime | |

> اگر `chatId` پر باشد، رأی دوم برای همان `surveyId` رد می‌شود.

### ۵) `Admins`

| ستون | توضیح | مثال |
|------|--------|------|
| `id` | شناسه | `1` |
| `name` | نام نمایشی | `Alec` |
| `email` | ایمیل (اختیاری) | `asgarialec@gmail.com` |
| `password` | رمز ورود پنل | یک رمز قوی بگذار |
| `token` | توکن نشست (بلند و تصادفی) | `kb_adm_7f3c9e2a1b...` |
| `active` | `TRUE` / `FALSE` | `TRUE` |

فقط **یک ادمین** کافی است. پنل با `password` لاگین می‌کند و بعد با `token` کار می‌کند.

### ۶) `Survey_Updated`

لازم نیست. می‌توانی خالی بگذاری یا حذفش کنی. سیستم از آن استفاده نمی‌کند.

---

## Seed پیشنهادی — نظرسنجی اول

### ردیف Admins (۱ سطر)

| id | name | email | password | token | active |
|----|------|-------|----------|-------|--------|
| 1 | Alec | asgarialec@gmail.com | *(رمز خودت)* | `kb_adm_change_me_to_long_random` | TRUE |

### ردیف Surveys

`definitionJson` را در یک سلول بگذار (یا از پنل ادمین بساز؛ راحت‌تر است):

```json
{"questions":[{"id":"q_topic","text":"نظر شما مخاطب گرامی برای موضوع برگزاری وبینار بعدی چیست؟","sortOrder":1,"options":[{"id":"opt_nad","text":"آشنایی و مرور مجدد روی Nad+","sortOrder":1},{"id":"opt_pdrn","text":"آشنایی و مرور مجدد روی PDRN - PN CELL","sortOrder":2},{"id":"opt_agf","text":"آشنایی و مرور مجدد روی AGF39","sortOrder":3},{"id":"opt_all","text":"آشنایی و مرور مجدد روی هر سه محصول","sortOrder":4}]},{"id":"q_duration","text":"زمانش چقدر باشد؟","sortOrder":2,"options":[{"id":"opt_30","text":"30 دقیقه","sortOrder":1},{"id":"opt_45","text":"45 دقیقه","sortOrder":2},{"id":"opt_60","text":"یک ساعت","sortOrder":3},{"id":"opt_more","text":"بیشتر از یک ساعت","sortOrder":4}]},{"id":"q_date","text":"تاریخ پیشنهادی را انتخاب کنید","sortOrder":3,"options":[{"id":"opt_d1","text":"جمعه 26 تیر 1405","sortOrder":1},{"id":"opt_d2","text":"سه‌شنبه 30 تیر 1405","sortOrder":2},{"id":"opt_d3","text":"جمعه 2 مرداد 1405","sortOrder":3}]}]}
```

| id | title | description | status | definitionJson | createdAt | updatedAt |
|----|-------|-------------|--------|----------------|-----------|-----------|
| webinar-next | نظرسنجی وبینار بعدی | موضوع، مدت و تاریخ پیشنهادی وبینار بعدی را مشخص کنید | open | *(JSON بالا)* | 2026-07-15T10:00:00.000Z | 2026-07-15T10:00:00.000Z |

> توصیه: بعد از راه‌اندازی n8n، از پنل `admin/surveys.html` نظرسنجی را Save کن تا Questions/Options هم پر شوند.

---

## API عمومی — `kbeauty-survey`

### دریافت نظرسنجی

```http
POST /webhook/kbeauty-survey
Content-Type: application/json

{
  "action": "get",
  "surveyId": "webinar-next",
  "chatId": "123456789"
}
```

`chatId` اختیاری است؛ اگر قبلاً رأی داده باشد `ALREADY_VOTED` برمی‌گردد.

### ثبت رأی

```json
{
  "action": "submit",
  "surveyId": "webinar-next",
  "name": "علی رضایی",
  "chatId": "123456789",
  "source": "telegram",
  "answers": {
    "q_topic": "opt_nad",
    "q_duration": "opt_45",
    "q_date": "opt_d1"
  }
}
```

---

## API ادمین — `kbeauty-survey-admin`

| action | توضیح |
|--------|--------|
| `login` | `{ password }` → `{ token, admin }` |
| `list` | لیست نظرسنجی‌ها + تعداد پاسخ |
| `get` | جزئیات برای ویرایش |
| `save` | ساخت/ویرایش کامل (سوال + گزینه) |
| `setStatus` | `open` / `closed` / `draft` |
| `results` | آمار درصدی + لیست خام پاسخ‌ها |

همه اکشن‌ها به‌جز `login` به `token` نیاز دارند.

---

## لینک‌های فرانت

| صفحه | آدرس |
|------|------|
| نظرسنجی عمومی | `https://k-beauty.academy/survey.html?id=webinar-next` |
| شخصی‌سازی‌شده (تلگرام) | `.../survey.html?id=webinar-next&name=علی&cid=123456789` |
| پنل ادمین | `https://k-beauty.academy/admin/surveys.html` |

### مهم: دکمه Inline تلگرام

دکمهٔ **Inline Keyboard با URL** لینک را به‌صورت **ثابت** باز می‌کند.  
نوشتن `{{name}}` یا `{{chatId}}` داخل URL **جایگزین نمی‌شود** و همان متن خام به مرورگر می‌رود (`%7B%7Bname%7D%7D`).

ربات باید هنگام ساخت دکمه، مقدار واقعی را بگذارد:

**n8n (Expression روی فیلد URL):**
```
={{ 'https://k-beauty.academy/survey.html?id=webinar-next&name=' + encodeURIComponent($json.firstName || $json.name || '') + '&cid=' + String($json.chatId || $json.id) }}
```

**Python (مثال aiogram/python-telegram-bot):**
```python
from urllib.parse import quote

url = (
  "https://k-beauty.academy/survey.html"
  f"?id=webinar-next&name={quote(user_full_name)}&cid={chat_id}"
)
# InlineKeyboardButton(text="شرکت در نظرسنجی", url=url)
```

اگر لینک بدون `name`/`cid` فرستاده شود، صفحه از کاربر نام می‌گیرد؛ فقط محدودیت «یک‌بار رأی با chatId» غیرفعال می‌ماند.

---

## تست سریع

```bash
# لاگین ادمین
curl -X POST https://n8n.alecasgari.com/webhook/kbeauty-survey-admin \
  -H 'Content-Type: application/json' \
  -d '{"action":"login","password":"YOUR_PASSWORD"}'

# خواندن نظرسنجی
curl -X POST https://n8n.alecasgari.com/webhook/kbeauty-survey \
  -H 'Content-Type: application/json' \
  -d '{"action":"get","surveyId":"webinar-next"}'
```

---

## نکات

- منبع حقیقت ساختار فرم: ستون `definitionJson` در `Surveys` (شیت‌های Questions/Options برای خوانایی و همگام‌سازی ادمین هستند).
- CORS مثل استعلام گواهینامه روی `*` تنظیم شده است.
- اگر workflow را قبلاً import کرده‌ای و Sheet عوض شده، Document ID را در همه نودهای Sheets به `1mRJFme3GuIkIAlqN0OBRMuwyfK5A706eQ-McYHTfaSQ` به‌روز کن.
