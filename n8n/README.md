# K-Beauty — استعلام گواهینامه (n8n)

## فایل import

`kbeauty-certificate-lookup.json`

در n8n: **Workflows → Import from File**

---

## ساختار Data Table

ستون‌های مورد انتظار (مطابق CSV شما):

| ستون | کاربرد در استعلام |
|------|-------------------|
| `certNo` | کلید جستجو (مثال: `PN/NAD6958906`) |
| `name` | نام نمایش داده‌شده |
| `webinar` | نوع وبینار (مثال: `PN+NAD`) |
| `status` | وضعیت (`Generated` یا `✅ DONE ...`) |

ستون‌های `chatId`, `username`, `phoneNumber`, `email`, `etc` در پاسخ وب‌سایت **نمایش داده نمی‌شوند** (حریم خصوصی).

---

## مراحل راه‌اندازی در n8n

### ۱. Import workflow
فایل `kbeauty-certificate-lookup.json` را import کنید.

### ۲. نود «Get Certificate Row»
- **Data Table:** جدول گواهینامه‌های خودتان را انتخاب کنید
- **Operation:** Row → Get
- **Filter:** `certNo` equals `{{ $json.body.certNo.trim() }}`
- **Always Output Data:** فعال (تا workflow متوقف نشود)

### ۳. فعال‌سازی
- Workflow را **Active** کنید
- URL نهایی باید باشد:
  `https://n8n.alecasgari.com/webhook/kbeauty-certificate-lookup`

### ۴. CORS (مهم برای تست لوکال)

نود **Respond to Webhook** هدر CORS دارد:
```
Access-Control-Allow-Origin: *
```

همچنین در نود **Webhook** → Options → **Allowed Origins (CORS):** `*`

> روی سایت live (`k-beauty.academy`) بعد از deploy بدون مشکل کار می‌کند.  
> تست لوکال (`file://` یا `localhost`) بدون `*` در CORS خطا می‌دهد.

**اگر workflow را قبلاً import کرده‌اید:** دستی در n8n نود Respond to Webhook → Response Headers → `Access-Control-Allow-Origin` را `*` کنید و Webhook → Allowed Origins را `*` بگذارید.

---

## جریان workflow

```
Webhook (POST)
    ↓  body: { "certNo": "PN/NAD6958906" }
Get Certificate Row (Data Table)
    ↓  فیلتر روی certNo
Format Response (Code)
    ↓  JSON استاندارد
Respond to Webhook
    ↓  پاسخ به مرورگر
```

---

## قرارداد API

### Request

```http
POST /webhook/kbeauty-certificate-lookup
Content-Type: application/json

{
  "certNo": "PN/NAD6958906"
}
```

### Response — پیدا شد

```json
{
  "valid": true,
  "certNo": "PN/NAD6958906",
  "name": "Alec Asgari",
  "webinar": "PN+NAD",
  "status": "صادر شده"
}
```

### Response — پیدا نشد

```json
{
  "valid": false,
  "message": "کد گواهینامه یافت نشد"
}
```

---

## تست دستی

در n8n روی Webhook → **Listen for test event** بزنید، سپس:

```bash
curl -X POST https://n8n.alecasgari.com/webhook/kbeauty-certificate-lookup \
  -H "Content-Type: application/json" \
  -d "{\"certNo\":\"PN/NAD6958906\"}"
```

---

## نکات

- اگر workflow قبلی با همین path دارید، یا ادغام کنید یا path جدید بدهید.
- `certNo` در CSV حساس به حروف بزرگ/کوچک نیست (در Code نرمال‌سازی شده).
- بعد از تست موفق n8n، فایل‌های `verify.html` و `main.js` را deploy کنید.
