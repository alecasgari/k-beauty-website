# K-Beauty — سیستم نظرسنجی (n8n Data Tables)

سایت استاتیک است. تعریف نظرسنجی، ثبت رأی، احراز هویت ادمین و آمار همگی از webhookهای n8n و **Data Table** داخل n8n انجام می‌شود.

---

## Data Tables (از قبل ساخته‌شده)

| جدول | Data Table ID |
|------|----------------|
| Surveys | `31hDDjJqGtCVb8EJ` |
| Questions | `jnY4tM908NlpE7aA` |
| Options | `Bbc0jmj8o9LOlkDb` |
| Responses | `QewUR3JU77ee4jS7` |
| Admins | `yh9YgO2GRaOP95np` |

ورکفلوها این IDها را دارند. بعد از import نیازی به وصل کردن Google Sheets نیست.

---

## فایل‌های Import

| فایل | Webhook |
|------|---------|
| `kbeauty-survey-public.json` | `POST /webhook/kbeauty-survey` |
| `kbeauty-survey-admin.json` | `POST /webhook/kbeauty-survey-admin` |

1. اگر نسخهٔ قبلی با Google Sheets دارید، آن را غیرفعال/حذف کنید.
2. این دو فایل را Import کنید.
3. هر دو را **Active** کنید.
4. در مسیرهای خطا، نودهای `Respond … Error` پاسخ JSON برمی‌گردانند تا مرورگر hang نکند.

URL:
```
https://n8n.alecasgari.com/webhook/kbeauty-survey
https://n8n.alecasgari.com/webhook/kbeauty-survey-admin
```

---

## ستون‌های هر Data Table

### Surveys
`id` | `title` | `description` | `status` (`open`/`closed`/`draft`) | `definitionJson` | `createdAt` | `updatedAt`

### Questions
`id` | `surveyId` | `text` | `sortOrder` | `active` (`TRUE`/`FALSE`)

### Options
`id` | `questionId` | `surveyId` | `text` | `sortOrder` | `active`

### Responses
`id` | `surveyId` | `name` (اختیاری/خالی) | `source` | `answersJson` | `answersText` | `submittedAt`

> محدودیت رأی تکراری نداریم؛ چندبار رأی دادن مجاز است.

### Admins
`id` | `name` | `email` | `password` | `token` | `active`

یک ردیف ادمین با `password` و `token` تصادفی و `active=TRUE` کافی است.

---

## لینک‌ها

| صفحه | آدرس |
|------|------|
| نظرسنجی | `https://k-beauty.academy/survey.html?id=webinar-next` |
| ادمین | `https://k-beauty.academy/admin/surveys.html` |

برای تلگرام broadcast فقط همین لینک کافی است:
```
https://k-beauty.academy/survey.html?id=webinar-next
```
فرم نام/شناسه تلگرام نمی‌پرسد؛ رأی‌ها ناشناس‌اند.

---

## API خلاصه

### عمومی — `kbeauty-survey`
- `{ "action": "get", "surveyId": "webinar-next" }`
- `{ "action": "submit", "surveyId": "...", "source": "telegram", "answers": { "q_id": "opt_id" } }`

### ادمین — `kbeauty-survey-admin`
`login` | `list` | `get` | `save` | `setStatus` | `results`  
(همه به‌جز login نیاز به `token` دارند)

---

## Seed سریع

۱. ردیف Admins را دستی بساز.  
۲. از `admin/surveys.html` لاگین کن و نظرسنجی را Save کن تا Surveys/Questions/Options پر شوند.
