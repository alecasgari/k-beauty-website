# K-Beauty Academy — گزارش پروژه و دستورالعمل عملیاتی

> **دامنه:** [k-beauty.academy](https://k-beauty.academy)  
> **ریپوی GitHub:** [github.com/alecasgari/k-beauty-website](https://github.com/alecasgari/k-beauty-website)  
> **سرور:** `207.180.228.11` (Contabo — `pharma_admin`)  
> **تاریخ راه‌اندازی:** خرداد ۱۴۰۵ (ژوئن ۲۰۲۶)

---

## فهرست مطالب

1. [خلاصه پروژه](#خلاصه-پروژه)
2. [معماری سیستم](#معماری-سیستم)
3. [ساختار فایل‌ها](#ساختار-فایل‌ها)
4. [صفحات و قابلیت‌ها](#صفحات-و-قابلیت‌ها)
5. [راه‌اندازی اولیه (گزارش کار)](#راه‌اندازی-اولیه-گزارش-کار)
6. [دستورالعمل به‌روزرسانی محتوا](#دستورالعمل-به‌روزرسانی-محتوا)
7. [دستورالعمل Deploy](#دستورالعمل-deploy)
8. [GitHub Actions (CI/CD)](#github-actions-cicd)
9. [تنظیمات سرور](#تنظیمات-سرور)
10. [DNS و Cloudflare](#dns-و-cloudflare)
11. [Nginx Proxy Manager](#nginx-proxy-manager)
12. [عیب‌یابی](#عیب‌یابی)
13. [چک‌لیست نگهداری](#چک‌لیست-نگهداری)

---

## خلاصه پروژه

وب‌سایت رسمی **کی‌بیوتی آکادمی** — آکادمی پزشکی زیبایی با تمرکز بر بیوتکنولوژی کره‌ای (K-Beauty).

| مورد | جزئیات |
|------|--------|
| نوع | سایت استاتیک (Static) |
| فناوری | HTML5، CSS3 (Flexbox/Grid)، Vanilla JavaScript |
| فونت | Vazirmatn (Google Fonts) |
| زبان رابط | فارسی (RTL) |
| هاست | Docker + Nginx روی سرور Contabo |
| پروکسی/SSL | Nginx Proxy Manager + Cloudflare |
| CI/CD | GitHub Actions (deploy خودکار با push) |

**بدون استفاده از:** React، TypeScript، Tailwind، فریم‌ورک‌های پیچیده.

---

## معماری سیستم

```
کاربر (مرورگر)
      ↓
Cloudflare (DNS + CDN + SSL)
      ↓
Nginx Proxy Manager (npm-app-1) — پورت 80/443
      ↓
kbeauty_web (nginx:alpine) — شبکه npm_default
      ↓
/opt/docker/kbeauty/html/  ← فایل‌های سایت (کلون GitHub)
```

### جریان توسعه و Deploy

```
لوکال (Cursor / VS Code)
      ↓  git add → commit → push
GitHub (ریپو: k-beauty-website)
      ↓  GitHub Actions (خودکار)
SSH به سرور → اجرای deploy.sh
      ↓
git pull + chmod + docker restart
      ↓
k-beauty.academy (live)
```

---

## ساختار فایل‌ها

```
k-beauty-academy-website/
├── index.html          # صفحه اصلی
├── novanad.html        # محصول NovaNAD+
├── pncell.html         # محصول PN CELL
├── agf39.html          # محصول AGF39 Forte
├── academy.html        # وبینارها و دوره‌ها
├── verify.html         # استعلام گواهینامه
├── contact.html        # تماس با ما + فرم
├── style.css           # استایل جامع
├── main.js             # منوی موبایل، فرم، استعلام
├── deploy.sh           # اسکریپت deploy روی سرور
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions
├── images/
│   ├── hero/           # تصویر هیرو صفحه اصلی
│   ├── logo/           # لوگو، favicon
│   ├── products/       # تصاویر ۳ محصول
│   ├── pages/          # بنر صفحات داخلی
│   └── og/             # تصویر اشتراک‌گذاری
└── docs/               # مستندات (این فایل)
```

---

## صفحات و قابلیت‌ها

### صفحات

| صفحه | فایل | توضیح |
|------|------|--------|
| خانه | `index.html` | هیرو، معرفی ۳ محصول، CTA |
| NovaNAD+ | `novanad.html` | NAD+، فناوری نانو، MFDS |
| PN CELL | `pncell.html` | PDRN، انجماد خشک، نتایج بالینی |
| AGF39 | `agf39.html` | سایتوکاین تراپی مو |
| آکادمی | `academy.html` | وبینار PDRN، دوره‌ها |
| استعلام | `verify.html` | چک کد گواهینامه |
| تماس | `contact.html` | فرم + اطلاعات تماس |

### تم رنگی

- سفید کلینیکال `#FAFBFC`
- نقره‌ای `#9CA3AF`
- بنفش عمیق `#2D1B4E` / `#1A0F2E`
- Accent `#7C5CBF`

### یکپارچگی‌ها

| سرویس | آدرس / مقدار |
|--------|----------------|
| ایمیل | info@k-beauty.academy |
| ربات تلگرام | [t.me/nadplus_webinar_bot](https://t.me/nadplus_webinar_bot) |
| Webhook فرم تماس (n8n) | `https://n8n.alecasgari.com/webhook/83a059c5-7260-4956-9d4c-40442611c076` |

### فرم تماس (`contact.html`)

فیلدها: نام، تخصص (لیست کشویی)، تلفن، پیام

**تخصص‌ها:**
- پزشک عمومی
- زیبایی، پوست و مو
- جراح زیبایی
- سایر → فیلد متنی باز می‌شود

پس از ارسال موفق: پیام تشکر + مخفی شدن فرم.  
داده‌ها + پارامترهای UTM به webhook n8n ارسال می‌شوند.

### استعلام گواهینامه (`verify.html`)

کدهای نمونه (Mock):
- `KBA-2026-101`
- `KBA-2026-102`
- `KBA-2026-103`

---

## راه‌اندازی اولیه (گزارش کار)

### مرحله ۱ — توسعه لوکال

- ساخت ۷ صفحه HTML + `style.css` + `main.js`
- طراحی لوکس بیوتکنولوژی، موبایل‌فرست (RTL)
- اضافه کردن تصاویر در پوشه `images/`
- اتصال فرم تماس به webhook n8n
- Push اولیه به GitHub

### مرحله ۲ — DNS (Cloudflare)

| نوع | نام | مقدار | Proxy |
|-----|-----|--------|-------|
| A | `k-beauty.academy` | `207.180.228.11` | Proxied |
| CNAME | `www` | `k-beauty.academy` | Proxied |

### مرحله ۳ — سرور (Docker)

مسیر روی سرور: `/opt/docker/kbeauty/`

```
/opt/docker/kbeauty/
├── docker-compose.yml
├── nginx.conf
└── html/          ← محتوای سایت (کلون Git)
```

**docker-compose.yml:**
- Image: `nginx:alpine`
- Container: `kbeauty_web`
- Network: `npm_default` (مشترک با NPM)
- Restart: `unless-stopped`

### مرحله ۴ — Nginx Proxy Manager

| فیلد | مقدار |
|------|--------|
| Domain | `k-beauty.academy`, `www.k-beauty.academy` |
| Forward | `kbeauty_web:80` |
| SSL | Let's Encrypt + Force SSL |

### مرحله ۵ — Git + CI/CD

- ریپو: `alecasgari/k-beauty-website`
- `deploy.sh` روی سرور
- GitHub Secrets: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`
- SSH Key مخصوص: `~/.ssh/github_actions_kbeauty`
- sudoers: `/etc/sudoers.d/kbeauty-deploy` (بدون پسورد برای deploy)
- Workflow: `.github/workflows/deploy.yml`

---

## دستورالعمل به‌روزرسانی محتوا

> **مهم:** سایت استاتیک است. تغییر متن/طراحی فقط از طریق ویرایش فایل‌های HTML/CSS/JS انجام می‌شود — نه از مرورگر.

### تغییر متن یا استایل

1. فایل مربوطه را در Cursor باز کنید (مثلاً `index.html`)
2. `Ctrl+F` برای پیدا کردن متن
3. ویرایش و ذخیره
4. Deploy (بخش بعد)

### لوگو

متن لوگو در همه صفحات: `<span>کی‌بیوتی آکادمی</span>` داخل `.logo-text`  
تصویر لوگو: `images/logo/logo.png`

### تصاویر جدید

- قرار دادن در پوشه مناسب زیر `images/`
- ارجاع در HTML با مسیر نسبی: `images/products/novanad.webp`
- Commit و push

---

## دستورالعمل Deploy

### روش ۱ — خودکار (پیشنهادی)

```powershell
# در PowerShell — پوشه پروژه
cd "c:\Users\aleca\OneDrive\Documents\00 - Abu Dhabi\PharmaTech\01 - K-Beauty\01 - WebSite\k-beauty-academy-website"

git add .
git commit -m "توضیح تغییر"
git push
```

سپس در GitHub → **Actions** → بررسی تیک سبز (~۲۰ ثانیه).

### روش ۲ — دستی روی سرور (SSH)

```bash
bash /opt/docker/kbeauty/html/deploy.sh
```

یا گام‌به‌گام:

```bash
sudo git -C /opt/docker/kbeauty/html pull origin main
sudo chmod -R a+rX /opt/docker/kbeauty/html/
sudo docker compose -f /opt/docker/kbeauty/docker-compose.yml restart kbeauty_web
```

### روش ۳ — Re-run از GitHub

Actions → آخرین workflow → **Re-run jobs**

---

## GitHub Actions (CI/CD)

### فایل Workflow

مسیر: `.github/workflows/deploy.yml`

**Trigger:** هر `push` به برنچ `main`

**عملکرد:**
1. اتصال SSH به سرور
2. اجرای `bash /opt/docker/kbeauty/html/deploy.sh`

### Secrets (Settings → Secrets → Actions)

| نام | مقدار |
|-----|--------|
| `SSH_HOST` | `207.180.228.11` |
| `SSH_USER` | `pharma_admin` |
| `SSH_PRIVATE_KEY` | کلید خصوصی `github_actions_kbeauty` |

> **امنیت:** کلید خصوصی را هرگز در کد commit نکنید.

### SSH Key روی سرور

```
~/.ssh/github_actions_kbeauty      (private)
~/.ssh/github_actions_kbeauty.pub  (در authorized_keys)
```

---

## تنظیمات سرور

### مسیرهای مهم

| مسیر | کاربرد |
|------|--------|
| `/opt/docker/kbeauty/html/` | فایل‌های سایت (Git repo) |
| `/opt/docker/kbeauty/docker-compose.yml` | تعریف کانتینر |
| `/opt/docker/kbeauty/nginx.conf` | تنظیمات nginx |
| `/etc/sudoers.d/kbeauty-deploy` | مجوز sudo بدون پسورد |
| `~/.ssh/github_actions_kbeauty` | کلید CI/CD |

### کانتینرها (مرتبط)

| کانتینر | نقش |
|---------|------|
| `kbeauty_web` | سرو وب‌سایت k-beauty |
| `npm-app-1` | Nginx Proxy Manager |
| `pharmatech_web` | سایت دیگر (دست نخورده) |

### دستورات مفید

```bash
# وضعیت کانتینر
docker ps --filter name=kbeauty_web

# لاگ nginx
docker logs kbeauty_web --tail 50

# تست HTTP از داخل شبکه Docker
docker run --rm --network npm_default curlimages/curl:latest -s -o /dev/null -w "%{http_code}" http://kbeauty_web
```

### sudoers (kbeauty-deploy)

فقط این دستورات بدون پسورد:

- `git -C /opt/docker/kbeauty/html pull`
- `chmod -R a+rX /opt/docker/kbeauty/html`
- `docker compose -f /opt/docker/kbeauty/docker-compose.yml restart kbeauty_web`

---

## DNS و Cloudflare

- دامنه: `k-beauty.academy`
- Registrar DNS: Cloudflare
- SSL Mode پیشنهادی: **Full (strict)** (بعد از صدور گواهی NPM)

اگر SSL در NPM خطا داد:
1. موقتاً DNS را **DNS only** (ابر خاکستری) کنید
2. گواهی Let's Encrypt بگیرید
3. دوباره **Proxied** کنید

---

## Nginx Proxy Manager

- پنل: `http://npm.pharmatech.ae:81` (یا IP:81)
- Proxy Host: `k-beauty.academy` → `kbeauty_web:80`
- SSL: Let's Encrypt

---

## عیب‌یابی

### سایت بالا نمی‌آید

```bash
docker ps --filter name=kbeauty_web    # باید Up باشد
docker logs kbeauty_web --tail 30
```

### تصاویر 404

```bash
sudo chmod -R a+rX /opt/docker/kbeauty/html/
sudo docker compose -f /opt/docker/kbeauty/docker-compose.yml restart kbeauty_web
```

### GitHub Actions قرمز شد

1. Actions → لاگ step «Deploy via SSH»
2. بررسی Secrets
3. تست SSH دستی:
   ```bash
   ssh -i ~/.ssh/github_actions_kbeauty pharma_admin@localhost "echo OK"
   ```
4. تست deploy دستی: `bash /opt/docker/kbeauty/html/deploy.sh`

### فرم تماس ارسال نمی‌شود

- خطای CORS در Console مرورگر → CORS را در n8n برای `k-beauty.academy` فعال کنید
- webhook: `https://n8n.alecasgari.com/webhook/83a059c5-7260-4956-9d4c-40442611c076`

### تغییرات در سایت دیده نمی‌شود

- Hard refresh: `Ctrl+Shift+R`
- Cloudflare cache را Purge کنید
- بررسی کنید push به `main` انجام شده و Actions سبز است

---

## چک‌لیست نگهداری

### بعد از هر تغییر محتوا

- [ ] `git commit` + `git push`
- [ ] Actions سبز
- [ ] بررسی live: [k-beauty.academy](https://k-beauty.academy)

### ماهانه

- [ ] بررسی گواهی SSL (NPM)
- [ ] بررسی فضای دیسک سرور
- [ ] بررسی به‌روزرسانی‌های امنیتی Ubuntu

### قبل از تغییرات بزرگ

- [ ] بکاپ: `sudo cp -r /opt/docker/kbeauty/html /opt/docker/kbeauty/html.bak-$(date +%Y%m%d)`
- [ ] تست در لوکال (باز کردن `index.html` در مرورگر)

---

## پیوست — دستورات سریع (Cheat Sheet)

```powershell
# === لوکال (Windows) ===
cd "c:\Users\aleca\OneDrive\Documents\00 - Abu Dhabi\PharmaTech\01 - K-Beauty\01 - WebSite\k-beauty-academy-website"
git status
git add .
git commit -m "پیام"
git push
```

```bash
# === سرور (SSH) ===
ssh pharma_admin@207.180.228.11

# Deploy دستی
bash /opt/docker/kbeauty/html/deploy.sh

# وضعیت
docker ps --filter name=kbeauty_web
```

---

## تماس و لینک‌های کلیدی

| منبع | لینک |
|------|------|
| سایت live | https://k-beauty.academy |
| GitHub | https://github.com/alecasgari/k-beauty-website |
| GitHub Actions | https://github.com/alecasgari/k-beauty-website/actions |
| ربات تلگرام | https://t.me/nadplus_webinar_bot |
| NPM | http://207.180.228.11:81 |

---

*آخرین به‌روزرسانی مستند: خرداد ۱۴۰۵ — پس از راه‌اندازی CI/CD و تغییر لوگو به «کی‌بیوتی آکادمی»*
