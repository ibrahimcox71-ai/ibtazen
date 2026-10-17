# বাকি কাজের তালিকা — `check.md`

> **এই ফাইল কী:** রিপোতে আলাদা roadmap ফাইল নেই, তাই এটাই backlog। প্রতিটি আইটেমে **কাজ / ফাইল / শেষ হবে যখন** আছে — শুধু এই ফাইল খুলেই বোঝা যাবে কী বাকি।
>
> **কিভাবে কাজ করবে:** উপরের আইটেমগুলো আগে। একটা শেষ হলে স্ট্যাটাসে `done` + তারিখ + commit hash লিখে রাখো। নতুন কিছু বাকি পড়লে এখানেই যোগ করো।
>
> **স্ট্যাটাস কী:** `pending` = শুরু হয়নি · `in-progress` = চলছে · `done` = শেষ, verify করা।

---

## যেখানে এখন আছি (context)

- Phase 1–9, 11–25 + observability **সম্পূর্ণ** (Phase 10 কখনো চালু হয়নি — #17); তারপর
  **#3 `/admin/users` UI** (2026-09-28) —
  service `packages/leads/src/auth/service.ts` (`listCrmUsersForActor`, `createCrmUser`,
  `changeCrmUserRole`, `setCrmUserActive`), UI `apps/web/src/app/admin/(auth)/users/`,
  nav-এ admin-only link, test `packages/leads/tests/phase22.user-management.test.ts` (14)।
- **#5 Invoice/proposal PDF** (2026-09-28): zero-dep রেন্ডারার `packages/leads/src/pdf.ts`,
  portal/admin routes `…/[id]/pdf` + তিনটি "Download PDF" বোতাম, email attachment
  (`email.ts`-এ `attachments` + Resend base64), test
  `packages/leads/tests/phase23.document-pdf.test.ts` (9)।
- **#6 Case study image/media + sort order** (2026-09-28, phase 24): স্কিমা
  `imagePath`/`imageAlt`/`sortOrder` + migration
  `20260928070425_phase24_case_study_media`, স্টোরেজ `apps/web/src/lib/uploads.ts`
  (magic-byte চেক, 5 MB, `uploads/case-studies/`), সার্ভ `app/api/uploads/case-studies/[file]`,
  সার্ভিস `setCaseStudyImage`, admin ফর্মে image/alt/sort-order, landing + listing + detail
  পেজে ছবি, test `phase24.case-study-media.test.ts` (6) + `apps/web/tests/uploads.test.ts` (12)।
  সাথে `packages/leads/tests/prisma/test.db` git থেকে untrack (`.gitignore`-এ `*.db` আগেই ছিল),
  লোকাল আপলোড `apps/web/uploads/` ignore করা।
- **#7 Public API** (2026-09-28, phase: ARCHITECTURE §47): রুট
  `apps/web/src/app/api/leads/route.ts` (`POST /api/leads`, `source` =
  `contact`|`estimate`), সাধারণ সহায়ক `apps/web/src/lib/api.ts` (ApiError body,
  content-type/32 KB/object-root চেক, client IP), test `apps/web/tests/api.test.ts` (14),
  ডক ARCHITECTURE §47 + README।
- **#18 GEO `/llms.txt`** (2026-09-28): `packages/config/llms.ts` (config থেকে
  markdown: entity summary, services, process, positioning, global FAQ Q&A,
  canonical links) + রুট `apps/web/src/app/llms.txt/route.ts` (text/plain,
  1h revalidate), test `apps/web/tests/llms.test.ts` (7)।
- **#16 Web UI test coverage** (2026-09-28): নতুন `apps/web/tests/portal-actions.test.ts` (10)
  ও `apps/web/tests/admin-actions.test.ts` (8) — server action-এর seam (session actor,
  service refusal, revalidate set, error containment, `redirect()` digest) ধরে রাখে;
  #16 আগে ছিল "শুধু `telemetry.test.ts`"।
- **#9 Analytics provider** (2026-09-29): **Plausible** (cookieless — consent banner লাগে না);
  `packages/config/analytics.ts` (`ANALYTICS` + `ANALYTICS_SCRIPT_URL`, domain না থাকলে
  `null`), `(site)/layout.tsx`-এ `<script async data-domain>` (React async script হয়ে head-এ
  থাকে, env সেট না থাকলে tag-ই আসে না — build-time inlining), `packages/ui/src/analytics.ts`-এ
  `window.plausible`-কে `lead_*` event forward (+ dedup, `eventProps()` error clamp),
  `.env.example`-এ `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`/`_HOST`, cookie policy-তে আসল তারিখ ও
  Plausible বর্ণনা (privacy/terms এখনো counsel ফ্যাক্ট অপেক্ষায়), test
  `apps/web/tests/analytics.test.ts` (6)।
- **#18 og:image + GEO শেষ** (2026-09-29): `apps/web/public/og-image.png` (1200×630) +
  `OG_IMAGE` (`packages/config/seo.ts`); Next 16-এ child `openGraph` পুরো object রিপ্লেস করে
  বলে ১৪টি metadata block-ই নিজের `images: [OG_IMAGE]` বহন করে (blog/case-study detail fallback
  সহ), twitter card `summary_large_image`; `robots.ts`-এ `llmsTxt` ফিল্ড নেই বলে comment-এ
  ডক; test `apps/web/tests/og-image.test.ts` (3 — PNG magic/dimension + source scan)।
  `SITE` সাইক্লিক import ভাঙতে `packages/config/site.ts`-এ সরানো হয়েছে।
  commit `906b424` (feat) + `31f9eb3` (docs)।
- **#2 বুট গার্ডরেল** (2026-09-29): `packages/leads/src/env-guard.ts`
  (subpath `@ibtatech/leads/env-guard`) প্রোড বুটে `apps/web/src/instrumentation.ts` থেকে
  একবার চলে — ফাঁকা/দুর্বল `RESEND_API_KEY`·`AUTH_SECRET`·`ADMIN_BOOTSTRAP_*`·`EMAIL_FROM`·
  `LEAD_NOTIFY_EMAIL` বা ভুল `EMAIL_TRANSPORT` হলে `[env] …` সতর্কতা (fail-silent);
  test `packages/leads/tests/env-guard.test.ts` (10) + `apps/web/tests/instrumentation.test.ts` (3)।
- **#19 Blog cover image + video embed** (2026-09-29): স্কিমা `BlogPost.imagePath`/`imageAlt`/
  `videoEmbedUrl` + migration `phase26_blog_media`, storage `apps/web/src/lib/uploads.ts`
  (case-study-এর সাথে একই নিয়ম, আলাদা `uploads/blog/`), সার্ভ `app/api/uploads/blog/[file]`,
  সার্ভিস `setBlogPostImage` + https/host allow-list, ফর্মে "Cover image & video" fieldset,
  `/blog` কার্ড ও `/blog/[slug]`-এ cover + 16:9 embed, test `phase26.blog-media.test.ts` (9)।
  Shorts/`watch`/`youtu.be` লিংক এখন write+render-এ canonical `/embed/<id>`-এ rewrite হয়।
- **#20 Blog post delete** (2026-09-29): সার্ভিস `deleteBlogPost` (RBAC + আগে row পড়ে),
  action `deleteBlogPostAction` (cover ফাইল মুছে + ৮টি path revalidate), নতুন
  `blog-delete-button.tsx` (confirm + error alert) — লিস্টের Actions কলাম, mobile কার্ড ও
  edit পেজের "Delete this post" কার্ডে; test `phase25.blog.test.ts` +1, `admin-actions.test.ts` +2।
- **#21 Case study video embed** (2026-09-29): ব্লগের validator এখন `domain.ts`-এ shared
  `parseVideoEmbedUrl` (write ও render দুই জায়গায় একই নিয়ম), স্কিমা `CaseStudy.videoEmbedUrl`
  - migration `20260929103058_phase27_case_study_video`, ফর্মে "Image & video" fieldset-এ
    "Video link" ফিল্ড, `/case-studies/[slug]`-এ figure-এর পরে 16:9 embed, test
    `phase27.case-study-video.test.ts` (3) + `phase20` wire key +1।
- **#22 Site settings: logo + favicon upload** (2026-09-30): স্কিমা singleton `SiteSetting` +
  migration `phase28_site_settings`, সার্ভিস `getSiteSettings`/`setSiteAsset` (admin-only
  `canManageSiteSettings`), স্টোরেজ `uploads/brand/` (`uploads.ts`-এ brand সেকশন, raster-only),
  সার্ভ `app/api/uploads/brand/[file]` (লোগো keyed URL, ফেভিকন স্টেবল alias
  `/api/uploads/brand/favicon` + `public/favicon.svg` fallback), action
  `uploadSiteLogoAction`/`uploadSiteFaviconAction` (পুরনো ফাইল মুছে layout revalidate),
  UI `/admin/settings` (preview/remove, nav-এ admin-only link), হেডারে `logo` prop
  (না থাকলে টেক্সট ওয়ার্ডমার্ক); test `phase28.site-settings.test.ts` (7),
  `uploads.test.ts` → 30, `admin-actions.test.ts` → 24।
- Verify সব পাস: leads test **291**, web test **144**, `npm run lint`, `npm run typecheck`,
  `npm run build`, `npx prettier --check .` — কোনো error নেই।
- #19 + #20 + #21 + favicon root-icons commit `4d89235`-এ (2026-09-30)।
- **#2 বুট গার্ডরেল** commit `d2c34f1`-এ; `AGENTS.md` ও `.opencode/` (opencode config +
  `/verify`, `/next` কমান্ড) commit `63c640a`-এ, stray `.freebuff/project-id` সরানো
  `d9d46ff`-এ — `git status` এখন পরিষ্কার।
- Phase 17–21 + observability `88d412c`-এ, #3 `/admin/users` `08b4424`-এ, #5 PDF `23c84b1`-এ,
  #6 phase 24 media `36170fe`-এ, #7 public API `3ce4121`-এ, #18 GEO `49c13b1`-এ,
  #10 blog `1e13bd3`-এ, #2-এর delivery log `405617a`-এ, #17 phase doc cleanup `cd4d5d7`-এ,
  #15 global-error tokens `7d3c091`-এ commit হয়েছে।
- Verify কমান্ড: `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build` · `npx prettier --check .`

---

## P0 — এখনই (release/blocker)

### 1. আগের সব কাজ commit করো — `done` (2026-09-28, `88d412c`)

- **কাজ:** phase 17–21 + observability (portal, CRM emails, portal password, case-study slug,
  telemetry) এখনো staged/untracked। commit ছাড়া কোনো নতুন কাজ শুরু কোরো না।
- **ফাইল:** `git status`-এর সব `M`/`??` এন্ট্রি — মূলত
  `packages/leads/src/portal.ts`, `packages/leads/src/crm-notifications.ts`,
  `packages/leads/tests/phase18.crm-emails.test.ts`, `phase19.portal-password.test.ts`,
  `phase20.case-study-slug.test.ts`, `phase21.portal-proposal.test.ts`,
  `apps/web/src/app/portal/**`, `apps/web/src/app/api/**`, `apps/web/src/lib/telemetry/**`,
  `apps/web/src/instrumentation.ts`, `apps/web/src/app/global-error.tsx`,
  `packages/leads/prisma/migrations/20260927185500_phase17_client_portal/`,
  `packages/leads/prisma/migrations/20260927201500_phase20_case_study_slug/`
- **শেষ হবে যখন:** `git status` পরিষ্কার, `npm run test` আগের মতোই পাস।
- **নোট:** commit করার আগে user-এর explicit permission নিও।

### 2. প্রোডাকশন ইমেইল চালু করো — `in-progress`

- **কাজ:** `RESEND_API_KEY` সেট করতে হবে, না হলে সব ইমেইল `delivered: false` রিপোর্ট করবে
  (lead notice + acknowledgement + CRM event + portal invite)।
- **ফাইল:** `apps/web/.env.local` (নতুন, tracked নয়), `.env.example` (তথ্য),
  `packages/leads/src/email.ts` (transport seam), `packages/leads/src/notifications.ts`,
  `packages/leads/src/crm-notifications.ts`
- **শেষ হবে যখন:** একটা আসল lead submit করলে অ্যাডমিন ও ক্লায়েন্ট — দুজনেরই inbox-এ মেইল আসে,
  লগে `delivered: true` দেখায়।
- **সাথে:** `LEAD_NOTIFY_EMAIL`, `EMAIL_FROM`, আর `AUTH_SECRET` (≥32 chars) + `ADMIN_BOOTSTRAP_*`
  — প্রোডে `AUTH_SECRET` ছাড়া session hash dev-secret-এ চলবে (`.env.example`, `packages/leads/src/auth/password.ts` → `getAuthSecret`)।
- **হয়েছে (2026-09-28):** `notifyNewLead` এখন প্রতিটি lead submit-এ একটা লগ ছাপে —
  `[notifications] lead notice delivered: true|false (provider=…)` (আগে result discard হয়ে
  যেত, সোজ্জে success/failure দুটোই নীরব ছিল); test `packages/leads/tests/email.test.ts` (15);
  prod `next start -p 3311`-এ আসল `POST /api/leads` দিয়ে E2E যাচাই — console transport-এ
  `delivered: false (provider=console)` লগ আসছে।
- **হয়েছে (2026-09-29):** বুট গার্ডরেল — `packages/leads/src/env-guard.ts`
  (`collectProductionEnvWarnings`, subpath `@ibtatech/leads/env-guard`) প্রোড বুটে একবার
  চলে (`apps/web/src/instrumentation.ts`, শুধু `NODE_ENV=production`, fail-silent):
  `RESEND_API_KEY` ফাঁকা / `EMAIL_TRANSPORT` ভুল বা console, `EMAIL_FROM`·`LEAD_NOTIFY_EMAIL`
  কনফিগার-কৃত না হলে, `AUTH_SECRET` <32 অক্ষর বা ফাঁকা, অসম্পূর্ণ/দুর্বল `ADMIN_BOOTSTRAP_*` —
  সবই `[env] …` লাইনে ফুটে ওঠে (`openssl rand -hex 32` নির্দেশ সহ)। `.env.example`-এ এই
  সতর্কতার ডক। test `packages/leads/tests/env-guard.test.ts` (10) ও
  `apps/web/tests/instrumentation.test.ts` (3); prod smoke — `.env.local` রানটাইমে লোড
  হয় বলেই AUTH_SECRET/bootstrap সেট থাকলে কোনো সতর্কতা আসে না, `RESEND_API_KEY` ফাঁকা
  থাকলে ঠিক একটি আসে, আর কী বসানোর পর সেটি নিভে যায় (0 warnings)।
- **বাকি:** `apps/web/.env.local`-এ আসল `RESEND_API_KEY` (Resend account + verified sender
  বা onboarding ইনবক্স) বসানো, তারপর আসল submit → দুই inbox-এ মেইল + লগে
  `delivered: true (provider=resend)`; সাথে `LEAD_NOTIFY_EMAIL`/`EMAIL_FROM` ঠিক করা।

---

## P1 — ফিচার backlog (docs-এ non-goal হিসেবে রাখা আছে)

### 3. Admin user management UI (`/admin/users`) — `done` (2026-09-28, `08b4424`)

- **কাজ:** CRM role (`admin`/`staff`/`team`) আরকে user বানানো/ডিঅ্যাক্টিভেট করার কোনো UI নেই —
  শুধু portal access provisioning আছে clients/[id]-তে।
- **ফাইল:** নতুন `apps/web/src/app/admin/(auth)/users/` (route নেই আজকেও),
  nav-এ যোগ `apps/web/src/components/admin/admin-shell.tsx`,
  সার্ভিস `packages/leads/src/auth/service.ts`, রিপো `packages/leads/src/repository.ts`
  (`createAdminUser`, `listActiveCrmUsers`), গেট `packages/leads/src/auth/rbac.ts` (`canManageUsers`)
- **শেষ হবে যখন:** `/admin/users` থেকে user বানানো/role বদলানো যায়, test লেখা হয়
  (`packages/leads/tests/`-এ নতুন phase test)।

### 4. Billing — Stripe / invoice payment — `pending`

- **কাজ:** এখন `paid` হলো CRM actor-এর হাতে manual internal mark; gateway নেই।
- **ফাইল:** `.env.example`-এ `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (আজকেও commented),
  `packages/leads/src/invoices.ts`, `packages/leads/prisma/schema.prisma` (Invoice),
  `apps/web/src/app/admin/(auth)/invoices/invoice-actions.tsx`,
  `apps/web/src/app/portal/(auth)/invoices/[id]/page.tsx`, নতুন webhook route
  `apps/web/src/app/api/`
- **শেষ হবে যখন:** portal থেকে invoice pay → webhook → `sent → paid`, test সহ।
- **শুরু করার আগে:** `packages/leads/README.md`-তে Phase 14 non-goal আপডেট করতে হবে।

### 5. Invoice / proposal PDF — `done` (2026-09-28, `23c84b1`)

- **কাজ:** ক্লায়েন্ট ডাউনলোড করতে পারবে না; ইমেইলে attachment-ও যায় না।
- **ফাইল:** `packages/leads/src/invoices.ts`, `packages/leads/src/email-templates.ts`,
  `apps/web/src/app/portal/(auth)/invoices/[id]/page.tsx`,
  `apps/web/src/app/admin/(auth)/invoices/[id]/page.tsx`
- **শেষ হবে যখন:** portal-এ "Download PDF" বোতাম + email-এ attachment, test সহ।

### 6. Case study image / media upload — `done` (2026-09-28, `36170fe`)

- **কাজ:** Phase 16 non-goal — ছবি ছাড়া case study শুধু text/metrics।
- **ফাইল:** `packages/leads/src/case-studies.ts`, `packages/leads/prisma/schema.prisma`,
  `apps/web/src/app/admin/(auth)/case-studies/case-study-form.tsx`,
  `apps/web/src/components/selected-work.tsx`,
  `apps/web/src/app/(site)/case-studies/page.tsx` ও `[slug]/page.tsx`
- **শেষ হবে যখন:** admin থেকে ছবি আপলোড হয়, landing + detail পেজে দেখায়, test সহ।
- **সাথে:** slot-এর বাইরে ordering (Phase 16 non-goal, একই ফাইল) — `sortOrder` যোগ হয়েছে,
  লিস্ট `sortOrder → slotNumber` ক্রমে আসে, আলাদা index `@@index([status, sortOrder])`।

### 7. Public API surface (ARCHITECTURE §47) — `done` (2026-09-28, `3ce4121`)

- **কাজ:** `ApiError` contract আছে কিন্তু public route handler নেই — API ফাইল মাত্র ২টা।
- **ফাইল:** `packages/types/index.ts` (`ApiError`), বর্তমান `apps/web/src/app/api/client-errors/route.ts`
  ও `apps/web/src/app/api/health/route.ts`, নতুন routes `apps/web/src/app/api/`
- **শেষ হবে যখন:** কমপক্ষে lead/estimate একটা JSON endpoint `ApiError` shape-এ, test সহ।

### 8. i18n (ARCHITECTURE §58) — `pending`

- **কাজ:** সব copy এখন English; routing-এ `[locale]` পরে যোগ হবে।
- **ফাইল:** `packages/config/site-content.ts`, `packages/config/services.ts`,
  `packages/config/faqs.ts`, `packages/config/seo.ts`,
  `apps/web/src/app/(site)/**`, `apps/mobile/src/app/**`
- **শেষ হবে যখন:** একটা locale switch কাজ করে, logic-এ scattered string নেই।

### 9. Analytics provider + cookie policy শেষ — `done` (2026-09-29)

- **কাজ:** cookie policy-তে ছিল "To be completed when an analytics provider is chosen in a
  later phase", `updated` date `[DATE TO BE SET ON PUBLICATION]`।
- **হয়ে গেছে:** provider **Plausible** — cookieless, তাই consent banner লাগে না (user সিদ্ধান্ত);
  `packages/config/analytics.ts`, `(site)/layout.tsx`-এ `<script async data-domain>`
  (env সেট না থাকলে tag-ই আসে না, build-এ inline), `packages/ui/src/analytics.ts`-এ
  `window.plausible` forward, `.env.example`, cookie policy-তে আসল তারিখ (29 September 2026)
  ও provider নাম; test `apps/web/tests/analytics.test.ts` (6)। privacy/terms-এর date
  সিদ্ধান্ত এখনো বাকি — ওগুলো counsel ফ্যাক্ট চায়।
- **শেষ হবে যখন:** ✅ provider বাছাই + consent প্রশ্ন নেই (cookieless), policy-তে আসল তারিখ ও
  provider নাম। **ডিপ্লয়ে:** `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` build-time env দিতে হবে।

### 10. Blog / content hub (SEO) — `done` (2026-09-28, `1e13bd3`)

- **কাজ:** কোনো blog/article route নেই — organic traffic-এর জন্য বড় ফাঁক।
- **ফাইল:** নতুন `apps/web/src/app/(site)/blog/`, `apps/web/src/app/sitemap.ts`,
  `packages/config/seo.ts`, admin CRUD (case-study pattern মডেল:
  `apps/web/src/app/admin/(auth)/case-studies/`, `packages/leads/src/case-studies.ts`)
- **শেষ হবে যখন:** `/blog` + `/blog/[slug]` live, sitemap-এ আছে, admin থেকে পাবলিশ হয়।
- **সাথে:** `BlogPost` স্কিমা + migration `20260928091939_phase25_blog_post`,
  সার্ভিস `packages/leads/src/blog.ts` (RBAC, slug collision, publish-date stamping,
  published-only `PublishedBlogPost` DTO), সেফ মার্কডাউন সাবসেট
  `apps/web/src/lib/blog/markdown.ts`, `/blog/rss.xml` + sitemap এন্ট্রি,
  Article JSON-LD, admin CRUD `/admin/blog`, মোবাইলে `/blog` chip ওয়েবসাইটে খোলে;
  test `phase25.blog.test.ts` (11) + `blog-markdown.test.ts` (13) +
  `blog-rss.test.ts` (5), prod E2E smoke (`next start -p 3311`) 5/5।

### 11. Mobile app — marketing ছাড়া বাকি অংশ — `pending`

- **কাজ:** `apps/mobile/src/app/`-তে শুধু marketing screen (home, services, about, pricing,
  faq, contact) — CRM/portal অংশ নেই।
- **ফাইল:** `apps/mobile/src/app/*`, কন্টেন্ট আসে `packages/config/*` থেকে। ইন-অ্যাপ
  contact form `POST /api/leads` (#7) ব্যবহার করতে পারে — `apps/mobile/src/app/contact.tsx`
  এখনো বলছে ফর্ম "public API phase-এ আসবে", সেই copy আপডেট লাগবে।
- **শেষ হবে যখন:** সিদ্ধান্ত নিতে হবে — কী দরকার (lead notifications? portal read-only?)।
  **আগে user-কে জিজ্ঞেস করো**, spec নেই।

### 18. SEO / AEO / GEO — যা আছে আর যা বাকি — `done` (2026-09-29)

- **হয়ে গেছে:** SEO — `sitemap.ts` (dynamic, case-study slug সহ), `robots.ts`,
  প্রতিটি পেজে canonical + title/description + OpenGraph, `metadataBase`;
  AEO — `FAQPage` JSON-LD `/faq`·`/pricing`·`/services/[slug]`-এ,
  `Organization`/`WebSite`/`Service`/`BreadcrumbList` (`packages/config/seo.ts`);
  GEO — `/llms.txt` (`packages/config/llms.ts` + `apps/web/src/app/llms.txt/route.ts`)
  config থেকে markdown রেন্ডার করে, test `apps/web/tests/llms.test.ts` (7);
  #10 blog (`1e13bd3`) — `/blog` + `/blog/[slug]`-এ Article JSON-LD, sitemap/RSS এন্ট্রি,
  nav/footer/`llms.txt`-তে `/blog` লিংক।
- **আগের "বাকি" ৩টা — এবার শেষ:**
  1. **#9 analytics** — `done` (উপরে #9)।
  2. **og:image অ্যাসেট** — `apps/web/public/og-image.png` (1200×630, ink→brand gradient +
     wordmark + tagline + domain), `OG_IMAGE` (`packages/config/seo.ts`); Next 16-এ child
     `openGraph` পুরো object রিপ্লেস করে বলে প্রতিটি পেজের `openGraph`/`twitter`-এ
     `images: [OG_IMAGE]` বাধ্যতামূলক — ১৪টি metadata block আপডেট (blog/case-study detail-এ
     DB ইমেজ fallback), card `summary_large_image`; test `apps/web/tests/og-image.test.ts`
     (3: PNG magic/dimension, `OG_IMAGE` match, source-এ `openGraph:` থাকলে `images:` + `OG_IMAGE`
     আছে কি না scan)।
  3. **`/llms.txt` লিংক** — Next-এর `Robots` type-এ `llmsTxt` ফিল্ড নেই (v16.3.5),
     তাই `robots.ts`-এ comment-এ ডক করা (discovery কনভেনশন `/llms.txt`)।
- **শেষ হবে যখন:** ✅ #9 done + og:image এসেট আছে। **Prod smoke** (`next start -p 3311`):
  ৮টি পেজে og:image/twitter:image → `og-image.png`, `/robots.txt`+Sitemap, `/llms.txt`
  200 `text/plain`, `/og-image.png` 200 `image/png`, cookie policy-তে Plausible + তারিখ;
  env সেট থাকলে `<script data-domain>` আছে, unset থাকলে নেই।

### 19. Blog cover image + video embed — `done` (2026-09-29, `4d89235`)

- **কাজ:** `/admin/blog/new`-এ image/video upload-এর কোনো অপশন ছিল না (user request) —
  post শুধু text/markdown.
- **হয়ে গেছে (2026-09-29):**
  - স্কিমা `BlogPost.imagePath`/`imageAlt`/`videoEmbedUrl` + migration
    `20260929090553_phase26_blog_media`;
  - storage `apps/web/src/lib/uploads.ts` — case-study-এর সাথে **একই** magic-byte + 5 MB নিয়ম
    (shared internals, আলাদা `uploads/blog/` dir, env `BLOG_UPLOAD_DIR`),
    সার্ভ `app/api/uploads/blog/[file]/route.ts`, URL helper `lib/blog-image.ts`;
  - সার্ভিস `setBlogPostImage` (RBAC + filename pattern re-check) আর `BlogInput.imageAlt` /
    `videoEmbedUrl` — embed শুধু **https + host allow-list** (youtube.com/youtu.be/vimeo.com);
    রেন্ডারে `blogVideoEmbedSrc` আবার চেক করে (fail-closed);
  - অ্যাডমিন ফর্মে "Cover image & video" fieldset: upload (accept ফিল্টার), alt text,
    বর্তমান কভার preview + remove checkbox, YouTube/Vimeo URL field;
    create/update action-এ file → validate → store → link (link ফেললে orphan মুছে যায়,
    replace করলে পুরনো ফাইল মুছে যায়);
  - পাবলিক: `/blog` কার্ডে cover thumb, `/blog/[slug]`-এ cover figure + 16:9 `<iframe>`
    (title, `referrerPolicy`, `allowFullScreen`, lazy);
  - test `packages/leads/tests/phase26.blog-media.test.ts` (9),
    `apps/web/tests/uploads.test.ts` (12 → 20), `apps/web/tests/admin-actions.test.ts` (8 → 13)।
- **শেষ হবে যখন:** ✅ ফর্মে upload অপশন আছে, কভার `/blog` ও detail-এ দেখায়, video embed বসে,
  নিরাপত্তা (host allow-list + filename pattern) test-এ বাঁধা।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test` (web **123**, leads **278**),
  `npm run build`, `npx prettier --check .` — সব পাস; dev smoke (`next dev :3000`):
  `/blog` 200, `/api/uploads/blog/…` 404 (unsafe/missing), `/admin/blog/new` → login redirect।
- **নোট:** og:image-এ এখনো `OG_IMAGE` (1200×630) — cover দিয়ে social card বদলানো পরের ফেজে,
  কারণ আপলোড করা ছবির dimension আগে থেকে জানা যায় না।
- **ফলো-আপ (2026-09-29):** YouTube **Shorts** লিংক iframe--এ ফ্রেম হত না
  (`youtube.com/shorts/…` পেজ embed হয় না) — এখন write ও render **দুটোতেই**
  `normaliseBlogVideoEmbedUrl` canonical embed-এ rewrite করে: `watch|shorts|live|embed|v`
  ও `youtu.be/<id>` → `youtube.com/embed/<id>` (`t`/`start` → `?start=`, `list`/`index` রাখা),
  `vimeo.com/<id>` → `player.vimeo.com/video/<id>` (`?h=` hash রাখা); পুরনো রো-তে কাঁচা লিংক
  থাকলেও render-এ ঠিক হয় (DB migration ছাড়াই)। test leads **279**।

### 20. Blog post delete — `done` (2026-09-29, `4d89235`)

- **কাজ:** `/admin/blog`-এ প্রতিটি পোস্টে শুধু Edit ছিল, **Delete** অপশন নেই (user request)।
- **হয়ে গেছে (2026-09-29):**
  - সার্ভিস `deleteBlogPost` — RBAC `canMutateLeads`, cuid চেক, আগে row পড়ে
    (slug + cover key ফেরত দেয়), তারপর `deleteBlogPostRow`; পুরো CRM-এ এটাই প্রথম
    destructive service;
  - action `deleteBlogPostAction` — সার্ভিস সিদ্ধান্ত নেয়, তারপর cover ফাইল ডিস্ক থেকে
    মুছে (`removeBlogImage`) আর `revalidateBlogPaths` (registry, edit, `/`, `/blog`,
    `/blog/<slug>`, rss, sitemap, llms);
  - নতুন ক্লায়েন্ট কম্পোনেন্ট `blog/blog-delete-button.tsx` — `confirm()` ছাড়া কিছু
    মোছে না, `useActionState` ফেল দেখায়, সফল হলে `/admin/blog`-তে ফেরত;
  - UI: লিস্টের Actions কলাম (desktop + mobile card) এবং edit পেজের আলাদা
    "Delete this post" কার্ড — দুটোতেই আছে;
  - test: `phase25.blog.test.ts` +1 (RBAC/not_found/লুকানো হয়ে যাওয়া), `admin-actions.test.ts`
    +2 (cover ফাইল মোছা + ৮টি path revalidate; ফেল হলে disk/cache না ছোঁয়া)।
- **শেষ হবে যখন:** ✅ লিস্ট ও edit উভয় জায়গায় Delete, confirm-পরবর্তী কাজ সঠিক,
  মুছলে পাবলিক রিড থেকে সরে যায়।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test` (web **125**, leads **280**),
  `npm run build`, `npx prettier --check .` — সব পাস; dev smoke: `/admin/blog` → 307 login।
  লাইভ delete ধরে নিয়ে verify করা হয়নি (প্রকাশিত post মুছবে না) — service+action test-এ বাঁধা।

### 21. Case study video embed — `done` (2026-09-29, `4d89235`)

- **কাজ:** `/admin/case-studies/new`-এ image/alt/sort ছাড়া কিছু ছিল না — YouTube video link
  বসানোর কোনো ফিল্ড নেই (user request)।
- **হয়ে গেছে (2026-09-29):**
  - ব্লগের `videoEmbedUrl` validator এখন `packages/leads/src/domain.ts`-এ **shared**
    `parseVideoEmbedUrl` — blog.ts ও সেটাই ব্যবহার করে (এক জায়গায় নিয়ম: https + host
    allow-list, ব্ল্যাংক = null, সেভের সময়ই canonical embed-এ rewrite);
  - স্কিমা `CaseStudy.videoEmbedUrl String?` + migration
    `20260929103058_phase27_case_study_video` (dev server বন্ধ করে apply, তারপর আবার চালু);
  - repository create/update row-তে ফিল্ড, সার্ভিস `CaseStudyInput` → `NormalisedCaseStudy`
    → `PublishedCaseStudy` (রিডেও `videoEmbedUrl`);
  - অ্যাডমিন ফর্ম: "Image" fieldset → "Image & video", নতুন "Video link" ফিল্ড
    (`case-study-video-url`), edit পেজ `initial` বসায়, `caseStudyFormPayload` পাঠায়;
  - পাবলিক `/case-studies/[slug]`-এ figure-এর ঠিক পরে 16:9 `<iframe>` (ব্লগের একই মার্কআপ,
    `blogVideoEmbedSrc` রেন্ডারে আবার চেক করে — fail-closed);
  - test `packages/leads/tests/phase27.case-study-video.test.ts` (3),
    `phase20.case-study-slug.test.ts`-এর wire key-তে `videoEmbedUrl` (+1)।
- **শেষ হবে যখন:** ✅ ফর্মে ফিল্ড, সেভ করলে canonical embed সেভ হয়, পাবলিক ডিটেইলে embed
  বসে, খারাপ লিংক (http/ভুল host/অতিরিক্ত দৈর্ঘ্য) ধরা পড়ে।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test` (web **125**, leads **283**),
  `npm run build`, `npx prettier --check .` — সব পাস; dev smoke: `/case-studies` 200,
  `/admin/case-studies/new` → 307 login, অনুপস্থিত slug → 404।
- **নোট:** অ্যাডমিন UI-তে ফর্মটা ব্রাউজারে বসিয়ে verify করা হয়নি (লগইন ক্রেডেনশিয়াল আমার
  কাছে নেই) — ফর্ম payload + service + public read test-এ বাঁধা।

### 22. Site settings: logo + favicon upload — `done` (2026-09-30)

- **কাজ:** সাইট সেটিংস কোথাও নেই — লোগো/ফেভিকন আপলোডের অপশন নেই (user request)। স্কোপ
  confirm: লোগো শুধু **পাবলিক সাইটের হেডারে** (টেক্সট ওয়ার্ডমার্ক fallback সহ), ফেভিকন
  সাইট-ওয়াইড (না থাকলে বান্ডিল `public/favicon.svg`)।
- **হয়ে গেছে (2026-09-30):**
  - স্কিমা singleton `SiteSetting` (`id` = literal `"site"`, `logoPath`, `faviconPath`,
    `updatedAt`) + migration `20260930085652_phase28_site_settings` (dev server বন্ধ করে
    apply + `prisma generate`);
  - নতুন `packages/leads/src/settings.ts` (`getSiteSettings`, `setSiteAsset` → ফেরত
    `previousKey`), `SITE_ASSET_SLOTS`/`isSiteAssetSlot`/`SITE_ASSET_FILENAME_PATTERN`
    (`domain.ts`), RBAC `canManageSiteSettings` (admin-only), row helper
    `getSiteSettingRow`/`setSiteAssetRow` (`repository.ts`); export `src/index.ts` +
    `src/auth/index.ts`;
  - স্টোরেজ `apps/web/src/lib/uploads.ts`-এ brand সেকশন (magic-byte, 5 MB,
    `BRAND_UPLOAD_DIR` → `uploads/brand/`, কী `logo-<8hex>.<ext>`/`favicon-<8hex>.<ext>`,
    raster-only — SVG আপলোড নয়, XSS এড়াতে) + `lib/brand-image.ts` (URL হেল্পার);
  - সার্ভ `app/api/uploads/brand/[file]` — লোগো keyed URL `immutable`, ফেভিকন স্টেবল alias
    `/api/uploads/brand/favicon` (root `metadata.icons` build-এ bake হয় বলে key জানা যায় না),
    ফাইল না থাকলে `/favicon.svg`;
  - action `uploadSiteLogoAction`/`uploadSiteFaviconAction` (admin session → সার্ভিস → পুরনো
    ফাইল ডিস্ক থেকে মুছা → `revalidatePath("/", "layout")` + `/admin/settings`);
  - UI `/admin/settings` (`settings-form.tsx`: preview, remove, error/success alert,
    `data-testid` per slot) + `admin-shell.tsx`-এ admin-only "Settings" nav link;
  - পাবলিক দিক: `packages/ui` হেডারে `logo` prop (`next/image`, fallback টেক্সট
    ওয়ার্ডমার্ক), `(site)/layout.tsx` async হয়ে `getSiteSettings()` পড়ে বসায়, root
    `layout.tsx`-এর `icons` → `/api/uploads/brand/favicon`;
  - `.env.example`-এ `BRAND_UPLOAD_DIR` ডক; test `phase28.site-settings.test.ts` (7),
    `uploads.test.ts` → **30** (+18), `admin-actions.test.ts` → **24** (+10)।
- **শেষ হবে যখন:** ✅ অ্যাডমিন আপলোড করলে পাবলিক হেডারে লোগো ও ট্যাবে ফেভিকন দেখায়,
  রিমুভ করলে fallback-এ ফিরে যায়, অন্য role পায় না, পুরনো ফাইল মুছে যায়।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test` (web **144**, leads **291**),
  `npm run build`, `npx prettier --check .` — সব পাস।
- **নোট:** `prisma generate`-এর জন্য dev server বন্ধ করা হয়েছিল (query-engine DLL লক) —
  ব্রাউজারে smoke করতে `npm run dev:web` আবার চালু নিতে হবে; লাইভ আপলোড verify করা হয়নি
  (login credential নেই) — service + action + helper test-এ বাঁধা।

---

### 23. UI/UX + a11y + bugfix pass (রিপোজিটরি জুড়ে) — `done` (2026-10-03)

- **কাজ:** একটা পুরো সাইট/অ্যাডমিন/পোর্টাল জুড়ে audit — P1 bug আগে, তারপর UI/UX polish।
- **হয়েছে (2026-10-03):**
  - **P1 bug:** `/estimate` invalid submit-এ ভুল এখন ফর্মের উপরে error alert + step-এ field error
    list দেখায় (আগে কিছুই দেখাত না); consent checkbox দুই ফর্মেই `required` +
    `aria-invalid`/`aria-describedby`/`role="alert"`; success state-এ focus যায়
    (`successRef`) — estimate/audit/contact;
  - **navigation:** skip link + `tabIndex={-1}`/`focus:outline-none` — সাইট (`#main-content`),
    অ্যাডমিন (`#admin-main`), পোর্টাল (`#portal-main`); admin ও portal shell-এ mobile sheet
    খুললে focus sheet-এ, বন্ধ হলে toggle-এ, Escape/viewport widen/নেভিগেশনে বন্ধ,
    খোলা থাকলে `<main>`/`<aside>` `inert`, বন্ধ থাকলে sheet `hidden` (aria-controls
    শুধু খোলা অবস্থায়), sign-out `useFormStatus` pending state সহ;
  - **heading/semantics:** contact/faq/book/audit-এ h1 → h3 skip ঠিক (`CardTitle as="h2"`;
    `CardTitle`-এ `as`, `ErrorState`-এ `titleAs` prop);
  - **a11y/UX:** `Alert`-এ `role` prop (default `alert`) + স্ট্যাটিক banner এখন
    `role="status"` (legal, pricing, design-system demo, estimator info); `Field`-এর hint/error
    `aria-describedby` এখন dangling রাখে না; `ThemeToggle` roving tabindex + Arrow/Home/End;
    breadcrumbs `min-h-11` tap target; header hamburger conditional `aria-controls`;
    `--text-secondary`/`--text-muted` contrast ঠিক (4.16:1 → 5.9:1, `tokens.css` +
    `global-error.styles.ts` fallback);
  - **routes:** নতুন `(site)/loading.tsx`, `portal/(auth)/loading.tsx`, `(site)/error.tsx`,
    `(site)/not-found.tsx` + shared `not-found-view.tsx`/`route-error.tsx`; `app/error.tsx` ও
    `app/not-found.tsx` wrapper; `global-error`-এর `role="alert"` ভেতরের div-এ সরানো;
    `(site)/template.tsx`-এর নো-op `animate-in fade-in` আসল motion fade দিয়ে বদলানো;
    `.legal-prose` CSS যোগ;
  - **design system:** `Dialog`/`Dropdown`-এর মৃত `exit`/`forceMount` সরানো (Radix portal
    close হলে সাথে সাথে unmount করে — exit কখনো চলত না);
  - **security:** `next` + `eslint-config-next` 16.3.5 → **16.3.8** (critical RCE
    GHSA-vcvr-r3jv-pc5j); `npm audit` এখন critical 0 (বাকি 37 transitive dev-dep —
    expo/vitest/prisma major bump লাগবে);
  - শুরুতে `node_modules/@ibtatech/*` খালি → `npm install` দিয়ে relink (typecheck ঠিক করতে)।
- **শেষ হবে যখন:** ✅ lint/typecheck/test/build/prettier + prod smoke (`next start`:
  public route সব 200, `/admin`,`/portal` 307 login-এ, unknown path custom 404)।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test` (web **144**, leads **291**),
  `npm run build`, `npx prettier --check .` — সব পাস।
- **নোট:** Dialog/Dropdown exit animation এখনো নেই (ইচ্ছাকৃত — সঠিকভাবে চালাতে হলে Radix
  Root-এর open state + AnimatePresence লাগবে); কীবোর্ড/focus flow ব্রাউজারে manual verify
  করা হয়নি, HTML-স্তর smoke + test পর্যন্ত।

---

### 24. Scroll-reveal: কন্টেন্ট `opacity:0` থেকে যাওয়া — `done` (2026-10-05)

- **কাজ:** মোবাইল ফুল-পেজ স্ক্রিনশট/ক্রলারে section heading, card, FAQ content ফাঁকা
  দেখাচ্ছিল — `Reveal`/`StaggerGroup` `opacity:0` দিয়ে শুরু করে, observer কখনো fire করে না।
- **কারণ (দুটো, CDP দিয়ে প্রমাণিত):**
  1. `Reveal`/`StaggerGroup` নিজেরাই SSR-এ `initial="hidden"` পাঠাত (পুরো পেজে
     `opacity:0` ×42, `translateY` ×33)। observer armed হলে content hide হয়, কিন্তু
     **full-page capture viewport expand করে না** — CDP
     `Page.captureScreenshot({captureBeyondViewport:true})` চলাকালে `IntersectionObserver`
     callback একবারও fire করে না (element y=6582, `innerHeight` থাকে 844) → ফাঁকা স্ক্রিনশট।
  2. `apps/web/src/app/(site)/template.tsx:9`-এর `animate="visible"` পুরো subtree-তে
     variant context leak করে — তাই hydrate-এর ~1.5s পর সবকিছু নিজে থেকে visible হয়ে
     যেত এবং আসল bug লুকিয়ে রাখত (পুরনো repro-তে `hiddenBlocks=0` দেখাত)।
- **হয়েছে (2026-10-05):** `packages/ui/src/motion.tsx` উল্টে দেওয়া — visible-by-default:
  - `Reveal`/`StaggerGroup` এখন `initial={false}` + `animate={controls}` → SSR HTML-তে
    কোনো `opacity:0`/`translateY` নেই, আর `template.tsx`-এর variant leak এ যায় না
    (AnimationControls object variant context inheritance থামায়);
  - নিজের `IntersectionObserver` (`rootMargin: 0px 0px 240px 0px`, `threshold: 0`) + scroll/
    resize listener + 250ms poll; mount-এ সিদ্ধান্ত একবার — `immediate` / reduced-motion /
    IO না থাকলে / উপরে থাকলে observe করা হয় না;
  - শুধু নিচে থাকা element observe হয়; IO intersect করলে hide করে ≤0.5s fade, আর late
    observer কখনো দৃশ্যমান content মুছে দেয় না; IO কখনো না এলে lead-zone-এ পৌঁছানোর
    1200ms পর settle (কিছুই hide হয়নি → সবসময় visible); একবার reveal, আর hide নয়;
  - `StaggerItem` আগের মতোই — একটা `StaggerGroup`-এর একটাই observer/controls, children
    `staggerChildren` পায়।
- **শেষ হবে যখন:** ✅ 5-টা verify command + নতুন jsdom টেস্ট (8) + CDP পুনরায় পরীক্ষা।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test` (web **153**, leads **291**,
  ui **8**), `npm run build`, `npx prettier --check .` — সব পাস। CDP @390×844: A–E সব
  সিনারিওতে `hiddenBlocks=0`/`inlineOpacity0=0`, JS-off ও `prefers-reduced-motion` ও ঠিক;
  SSR HTML-তে `opacity:0` 42 → 15 (বাকিটা `template.tsx` + `PageHero`)। Observer probe-তে
  11টির 11টি গ্রুপই সত্যিকারে animate করে (নিচে থাকা সবটিই lead-zone-এ ঢুকে hide → fade;
  `Reveal` নিজের opacity ~0.48 পর্যন্ত নামে, `StaggerGroup`-এর descendant 0.01–0.20 পর্যন্ত)।
- **নোট (আলাদা, এই আইটেমে ঠিক করা হয়নি):**
  - `template.tsx:9` hydration-এর আগে পুরো পেজ `opacity:0` দেখায় (~500ms; `diag6`:
    `wrapOp:"0"` → `data-motion-ready` ~309ms) — আলাদা fix লাগবে;
  - JS off হলে homepage শুধু `(site)/loading.tsx` skeleton দেখায় (Next streaming
    `<template id="B:0">` + inline swap script চলে না) — pre-existing;
  - `PageHero` এখনো SSR-এ `opacity:0` পাঠায় (`<noscript>` CSS কভার করে)।

---

## P2 — robustness / infra

### 12. Rate limiter shared store — `pending`

- **কাজ:** limiter এখন per-process in-memory — multi-instance-এ কাজ করবে না।
- **ফাইল:** `packages/leads/src/rate-limit.ts`, `packages/leads/src/auth/login-rate-limit.ts`,
  `apps/web/src/lib/telemetry/ingest.ts` (20/min budget), ডক `packages/leads/RATE_LIMIT.md`
- **শেষ হবে যখন:** store seam abstract হয়ে যায় (Redis/DB drop-in), test সহ।

### 13. SQLite → Postgres — `pending`

- **কাজ:** এখন SQLite; portable বলে রাখা হয়েছে কিন্তু switch করা হয়নি।
- **ফাইল:** `packages/leads/prisma/schema.prisma` (datasource provider),
  `.env.example` (`DATABASE_URL`), `packages/leads/prisma/migrations/`
- **শেষ হবে যখন:** Postgres URL-এ `npm run db:deploy --workspace @ibtatech/leads` + সব test পাস।

### 14. Email queue + cc/bcc + per-event template edit — `pending`

- **কাজ:** এখন awaited inline send; volume বাড়লে queue লাগবে (ARCHITECTURE-এ লেখা আছে)।
- **ফাইল:** `packages/leads/src/email.ts`, `packages/leads/src/notifications.ts`,
  `packages/leads/src/crm-notifications.ts`, `packages/leads/src/email-templates.ts`
- **শেষ হবে যখন:** queue seam + retry, failure কখনো transition fail করে না (আগের contract ভাঙবে না)।

### 15. `global-error.tsx`-এ inline styles সরাও — `done` (2026-09-28, `7d3c091`)

- **কাজ:** root layout-এর CSS না থাকায় inline style ব্যবহার করা হয়েছে (documented known limit)।
- **ফাইল:** `apps/web/src/app/global-error.tsx`, তুলনা `apps/web/src/app/error.tsx`
- **শেষ হবে যখন:** design token ব্যবহার করে দেখতে মিলে যায়, test সহ।
- **হয়েছে (2026-09-28):** নতুন `apps/web/src/app/global-error.styles.ts` — সব রঙ/shape
  `var(--token, <টোকেনেরইআসল মান>)` (আগে হাতেলেখা `#0b1020`/`#ff7a7a`/`#1a2547`/`#3a4a7a`,
  কোনোটাই টোকেন ছিল না)। CSS না থাকলেও fallback = টোকেনের আসল মান; CSS থাকলে light/dark
  অনুসরণ করে — `tokens.css` নিজে import + layout-এর `THEME_BOOTSTRAP_SCRIPT`/`initThemeStore`
  আবার চালু। error.tsx-এর সাথে মিল: `danger-soft` tile, `accent` button, `rounded-md`,
  44px touch target। test `apps/web/tests/global-error.styles.test.ts` (4)আসল `tokens.css`
  পড়ে যাচাই করে।
- **Verify:** web test **80**, `npm run typecheck`, `npm run lint`, `npx prettier --check .`,
  `npm run build` — সব পাস।

### 16. Web (UI) test coverage — `done` (2026-09-28, `apps/web/tests/{portal,admin}-actions.test.ts`)

- **কাজ:** `apps/web/tests/`-এ শুধু `telemetry.test.ts` — portal/admin action গুলোর UI test নেই।
- **ফাইল:** `apps/web/vitest.config.ts`, `apps/web/tests/telemetry.test.ts`,
  টার্গেট `apps/web/src/lib/portal/actions.ts`, `apps/web/src/lib/admin/actions.ts`
- **শেষ হবে যখন:** portal proposal response + password change action-এর test যোগ হয়।
- **হয়েছে (2026-09-28):** দুটো নতুন ফাইল, সব action-কে তার seam-এ (session → service →
  revalidate) mock করে —
  `portal-actions.test.ts` (10): proposal accept/decline — session না থাকলে service-এর
  আগেই refuse, actor শুধু session থেকে, ৩টা portal route revalidate, service refusal অক্ষত,
  আকস্মিক throw `invalid`-এ, `redirect()` digest কখনো swallow হয় না; password change —
  payload-এ শুধু `currentPassword`/`newPassword` (id/role যায় না), context `{ip,
currentSessionToken}`, validation failure ফর্মে ফেরে।
  `admin-actions.test.ts` (8): `loginAction` — `next=//evil.example/phish` ধরে dashboard-এ
  fallback (open-redirect), refuse-এ cookie/redirect নেই, on-site `next` follow করে;
  `updateLeadStatusAction` — server-side actor + ৩টা admin route revalidate, refusal-এ
  revalidate নেই; `createCrmUserAction` — raw form field mapping + `/admin/users`
  revalidate, refusal-এ অক্ষত।
- **Verify:** web test **98** (80 + 18), `npm run lint`, `npm run typecheck`,
  `npx prettier --check .` — সব পাস।

### 17. Docs cleanup: Phase 10 অস্পষ্ট — `done` (2026-09-28, `cd4d5d7`)

- **কাজ:** `ARCHITECTURE.md` status line-এ "Phase 1–9 complete, Phase 11–16 complete" লেখা —
  **Phase 10 কোথাও উল্লেখ নেই** (সম্ভবত "architecture audit")। নম্বর মিলিয়ে দিতে হবে।
- **ফাইল:** `ARCHITECTURE.md` (line 3), `packages/leads/README.md` (phase numbering)
- **শেষ হবে যখন:** status line ধারাবাহিক (1–21), commit history-র সাথে মেলে।
- **হয়েছে (2026-09-28):** commit history মিলিয়ে দেখা গেছে শুধু Phase 10-এর commit নেই
  (`2f3f15d`=9, `dd6be24`=11 … `1e13bd3`=25; Phase 8 = `403011a` Expo Router mobile)।
  status line এখন **Phase 1–9, 11–25**, প্রতিটা বোল্ড ব্লকে phase number (17/19/21 portal,
  18 CRM emails, 20 case studies, 22 `/admin/users`, 23 PDF, 24 media, 25 blog), আর আলাদা
  বাক্যে "Phase 10 was never executed — numbering gap"। "architecture audit" আইটেমটা
  সরানো হয়েছে — কোনো commit-এ নেই, আর Phase 8-এর জায়গা দখল করে বসে ছিল।
  `packages/leads/README.md` intro-তে Phase 17/18/19/22/23/24 নম্বর যোগ + structure
  টেবিলে `phase7`/`phase22`/`phase23`/`phase24` টেস্ট রো।
- **Verify:** `npx prettier --check .` ও `npm run lint` পাস।

---

## Phase non-goals (এগুলো ইচ্ছাকৃত বাদ — মনে রাখো, ভুল বলো না)

| Non-goal                                                         | কোথায় লেখা                                |
| ---------------------------------------------------------------- | ------------------------------------------ |
| Contract e-sign                                                  | `packages/leads/README.md` (Phase 11)      |
| Per-client tenancy, contract edit/delete                         | `packages/leads/README.md` (Phase 15)      |
| Lead pipeline change by case-study                               | `packages/leads/README.md` (Phase 16)      |
| Portal: record editing, payments, multi-user per client          | `packages/leads/README.md` (Client portal) |
| Portal proposal: counter-offer, partial accept, comments, e-sign | `packages/leads/README.md` (Phase 21)      |
| Invoice: tax/discount/ledger, overdue state                      | `packages/leads/README.md` (Phase 14)      |

---

## P1 — Homepage conversion and trust refresh

### 30. Service cards and capability brand icons — `done` (2026-10-16)

- **কাজ:** Homepage ও `/services`-এর service card-কে এক accessible stretched link-এ রূপান্তর, বিদ্যমান service registry-র capability chip ও এক decorative arrow দেখানো; capability chip-এ real brand icon, typed brand-color map এবং unavailable brand-এর neutral generic icon ব্যবহার।
- **ফাইল:** `apps/web/src/components/service-cards.tsx`, homepage ও `/services` page, `packages/ui/src/sections/capability-grid.tsx`, `packages/ui/src/components/card.tsx`, `packages/ui/src/sections/feature-grid.tsx`, UI package exports, `apps/web/src/app/globals.css`, homepage tests।
- **শেষ হবে যখন:** প্রতিটি card-এ একটি `Explore <service name>` link ও ≥44px hit target থাকে; hover/focus/reduced-motion আচরণ যাচাই হয়; icon chips 13px text/16px icon-সহ সমান উচ্চতার হয়; trademark note যোগ হয়; পাঁচটি verify command ও 360/768/1024/1440px light/dark production smoke pass।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .`; production browser smoke, keyboard navigation, hover/focus/reduced-motion।
- **হয়েছে (2026-10-16):** Homepage ও `/services`-এ shared RSC card component; প্রতিটি card-এ title-এ accessible name-সহ একটি stretched link, registry থেকে 2টি chip এবং এক decorative 44px arrow। Token-based border/focus styling, `translateY(-2px)` lift ও arrow slide reduced-motion-এ নিষ্ক্রিয়। Capability chips-এ Simple Icons-এর named imports Server Component-এ render; typed map-এ brand color; 36px সমান chip height, 13px text, 16px icon। Trademark note হুবহু যোগ। Simple Icons-এ icon আছে: Next.js, React, TypeScript, Tailwind CSS, Node.js, Laravel, Flutter, Expo, Android, Apple (iOS), PostgreSQL, Prisma, Redis, Vercel, Mailchimp, Google Ads, Meta, Google Analytics (GA4 chip-এ এই mark ব্যবহৃত; আলাদা GA4 mark নয়)। নেই—neutral generic icon: React Native, AWS, Klaviyo, Customer.io। `simple-icons` আগেই dependency ছিল; নতুন dependency যোগ হয়নি। Icon SVG browser client chunks-এ নেই; dependency-জনিত bundle impact নেই, তবে মোট JS byte delta **not verified**।
- **Final verification (2026-10-16):** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .` — সব pass। Tests: web 16 files/181, leads 26 files/295, UI 3 files/15; মোট **491 tests** pass।
- **Production smoke (2026-10-16):** Port `3321`-এ production app; homepage ও `/services`, 360/768/1024/1440px × light/dark—সব **16** combination pass। Keyboard tab-এ চারটি card link সঠিক order/name-এ পাওয়া গেছে; hover lift `-2px`, arrow `+4px`, focus ring দৃশ্যমান এবং reduced-motion-এ lift বন্ধ। Browser client chunk-এ icon SVG path নেই।
- **Not verified:** মোট JavaScript bundle-এর আগের/পরের byte-পরিমাণ সরাসরি তুলনা করা হয়নি; নতুন dependency নেই বলে dependency bundle বৃদ্ধি নেই।

### 29. Homepage visual polish and theme control — `done` (2026-10-15)

- **কাজ:** Homepage-এর light/dark contrast, type hierarchy, 1200px content width, hero gradient, trust icon, touch/focus states এবং single-button system-aware theme toggle polish করা; কোনো নতুন client/metric/testimonial/fact যোগ নয়।
- **ফাইল:** `packages/ui/tokens.css`, shared UI components/layout, `apps/web/src/app/(site)/page.tsx`, `apps/web/src/app/globals.css`, homepage tests।
- **শেষ হবে যখন:** AA token contrast, body 16px/card ≥15px, section heading card title-এর চেয়ে বড়, hero-to-trust edge smooth, buttons ≥44px/focus visible, light/dark/theme system toggle কাজ করে; 360/768/1024/1440 production viewport check ও পাঁচটি verify command run হয়।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .`, production start + viewport/theme smoke।
- **হয়েছে (2026-10-15):** Section H2-তে tighter `clamp()` (সব tested viewport-এ ≤2 lines); body/table/card description অন্তত 16px; trust/services/clients/proof/process card title shared typography token; 1440px-এ 1200px outer container ও 1152px content width। Ownership ও weekly-demo copy এক section-এ রাখা, repeated hero tech list সরানো, audience heading-এ unsupported “real stakes” claim বাদ এবং দীর্ঘ case-study heading সংক্ষিপ্ত করা হয়েছে। Learn more, FAQ CTA এবং footer link-এ ≥44px target ও visible focus ring। 360/768/1024/1440px production view light/dark-এ চেক; 360px measurement section-এর light/dark screenshot-ও পরীক্ষা; 3312-এ `/` **200** (3311 আগে থেকেই occupied ছিল)।
- **শেষ polish (2026-10-15):** Homepage H1-এর semantic hero token 360px-এ 32px/3 lines থেকে 1440px-এ 56px পর্যন্ত scale করে; measured H1/H2 ratio 1.52–1.60। `CONTAINER` 1440px viewport-এ 1200px outer / **1152px content** (24px fluid side padding)। How-we-work process-এর পরে এক লাইনের call prompt ও primary "Book a Free Discovery Call" CTA যোগ। Sticky header-এর CTA এখন মোবাইলেও সংক্ষিপ্ত "Book a call" হিসেবে দৃশ্যমান; scroll-এ header-এর অবস্থান/উচ্চতা বদলায় না। Capabilities-এর সব চার কার্ডে দুই-কলামের chip grid—প্রতিটিতে তিনটি সারি ও 226px উচ্চতা।
- **Regression verification (2026-10-15):** Clean HEAD `8f2dfbc` worktree-তে `global-error.styles.test.ts` **4/4 pass**; পরিবর্তিত tree-তে fallback assertion-এর একটিমাত্র failure ছিল, কারণ `--text-title` ও `--text-secondary` fallback বর্তমান token-এর সঙ্গে মেলেনি। `apps/web/src/app/global-error.styles.ts`-এ fallback token-এর মানের সঙ্গে মিলিয়ে focused homepage/global-error tests **19/19 pass**; full `npm run test`-ও pass।
- **Prettier verification (2026-10-15):** আগের 12টি unrelated formatter target format করা হয়েছে; সেগুলো homepage changes নয়। 11টি Markdown file-এর content Prettier output-এর সঙ্গে মিলে, `mobile-reveal.spec.ts`-এর TypeScript AST অপরিবর্তিত। `npx prettier --check .` pass।
- **Build warning (2026-10-15):** `npm run build` pass হলেও Edge Runtime-এর 2 warning-ই আছে: `apps/web/src/instrumentation.ts:16` — “A Node.js API is used (process.version at line: 16) which is not supported in the Edge Runtime.”; `packages/leads/src/auth/password.ts:1` — “A Node.js module is loaded ('node:crypto' at line 1) which is not supported in the Edge Runtime.” Import trace `password.ts → env-guard.ts → instrumentation.ts`; warning-source files HEAD থেকে অপরিবর্তিত, তাই homepage polish-এর আগের warning।
- **Final verification (2026-10-15):** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .` — সব pass। Test summary: 16 files/179, 26 files/295, 3 files/15 (মোট **489 tests**) pass।
- **Production smoke (2026-10-15):** Free port `3313`-এ `npx next start`; 360/768/1024/1440px × light/dark সব 8 combination-এ browser check pass। H1 যথাক্রমে 32/33.6/42.1/56px; line count 3/2/2/2; H1/H2 ratio 1.52–1.60। 1440px-এ 1200px outer / **1152px inner** container; horizontal overflow নেই। Scroll-এ sticky header 65px থাকে এবং CTA 44px target-সহ দৃশ্যমান। `Learn more` cards ≥191px, FAQ call/full FAQ ও footer links ≥44px; keyboard focus ring 2px solid। Capability cards সমান 226px; chip rows 3টি, text 12px, icons 16px; iOS একবারই label হয় এবং `Smartphone` glyph, TypeScript-এ Simple Icons glyph render হয়। Browser console error নেই। Server startup-এ `RESEND_API_KEY` unset warning-ও ছিল।
- **Not verified:** Email notice delivery (`RESEND_API_KEY` unset; homepage scope-এর বাইরে)। Port 3000-এর পরিবর্তে free port 3313-এ homepage production smoke সম্পন্ন; commit করা হয়নি।

### 28. Homepage proof and measurement layout — `in-progress` (2026-10-11)

- **কাজ:** Proof section-এর ৩টি কার্ডে বড় আইকন/বোল্ড title ও readable body copy; Measurement section-কে desktop semantic table এবং mobile labelled card layout করা, wording/config source অক্ষত রেখে।
- **ফাইল:** `apps/web/src/app/(site)/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/tests/homepage-content.test.ts`।
- **শেষ হবে যখন:** desktop/tablet-এ তিন কলামের table, 375px-এ stacked labelled card, light/dark-এ AA text token; homepage wording, `llms.txt` ও JSON-LD একই config থেকে থাকে; verify commands ও responsive/theme check সম্পন্ন।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .`; 375px/tablet/desktop light/dark।
- **হয়েছে (2026-10-11):** Proof-এ 48px icon, bold বড় title ও 15px body; Measurement desktop-এ semantic তিন-column table, mobile CSS-এ labelled card rows। Copy/config অপরিবর্তিত, `homepage-content.test.ts`-এ semantic markup test যোগ। Light/dark `text-secondary` contrast surface-raised-এর উপর যথাক্রমে **8.46:1**/**8.38:1**। `npm run lint`, `npm run typecheck`, `npm run build` pass; web **169** + UI **9** tests pass. Full test command leads-এর **26** suite-এ Prisma test DB `Schema engine error`-এ fail, **295** skipped। Touched files prettier pass; repo-wide check শুধু pre-existing `apps/web/tests/e2e/mobile-reveal.spec.ts`-এ fail। Browser tool available নয় (browser list empty), তাই viewport/theme visual check বাকি; item in-progress।

### 27. Admin-managed People / Founder profiles — `in-progress` (2026-10-11)

- **কাজ:** Prisma-তে TeamMember CRUD + validation, `/admin/team` editor ও photo upload, published complete profiles homepage rendering এবং Organization Person schema-তে যুক্ত করা। Seeded Ibrahim Khan profile unpublished থাকবে।
- **ফাইল:** `packages/leads/**`, `apps/web/src/app/admin/**`, `apps/web/src/app/(site)/page.tsx`, `apps/web/src/lib/uploads.ts`, `packages/config/seo.ts`, `ARCHITECTURE.md`, migration, tests।
- **শেষ হবে যখন:** upload ও publish flow কাজ করে; incomplete/unpublished member public UI/schema-তে থাকে না; access checks, tests, পাঁচটি verify command এবং production smoke pass।
- **Verify:** lint, typecheck, test, build, prettier, production upload/publish/unpublish smoke।
- **Storage:** existing disk-backed convention: `apps/web/uploads/team/` (or `TEAM_UPLOAD_DIR` override). Deployment target repo-তে নির্দিষ্ট নয়; read-only/ephemeral filesystem হলে persistent volume বা object storage configure করতে হবে।
- **হয়েছে (2026-10-11):** `TeamMember` migration + unpublished Ibrahim Khan seed, validated CRUD/RBAC, generated-key 2 MB JPEG/PNG/WebP disk upload, `/admin/team` live preview/editor, DB-backed cached homepage cards + Person JSON-LD, route revalidation; Architecture updated. Web tests **168 passed**, UI **9 passed**; targeted upload/action/schema tests included. `npm run lint`, `npm run typecheck`, `npm run build` pass. Full `npm run test` still cannot initialize leads' throwaway SQLite (`prisma db push` blank Schema engine error; 295 skipped); `npx prettier --check .` flags pre-existing `apps/web/tests/e2e/mobile-reveal.spec.ts`, touched files are formatted. Production route smoke at `3311`: `/` **200** with default unpublished seed hidden, unknown team image **404**, `/admin/team` logged-out **307**. In-app browser is unavailable, so authenticated UI upload/publish/unpublish smoke remains outstanding; item stays in-progress.

### 26. Homepage measurement copy and People publishing guard — `in-progress` (2026-10-10)

- **কাজ:** GA4/Meta Ads/Klaviyo-এর পৃথক বাস্তব tracking/reporting copy typed config থেকে দেখানো এবং `llms.txt`/Organization schema-তে একই source ব্যবহার; typed optional Founder profile কেবল বাস্তব, সম্পূর্ণ data থাকলে public করা; placeholder/empty profile লুকানো; proof cards-এ icon, সমান height ও Capabilities-সামঞ্জস্যপূর্ণ treatment।
- **ফাইল:** `packages/config/site-content.ts`, `packages/config/llms.ts`, `packages/config/seo.ts`, `packages/config/index.ts`, `apps/web/src/app/(site)/page.tsx`, `apps/web/tests/homepage-content.test.ts`।
- **শেষ হবে যখন:** Empty/placeholder profile লুকায়, complete profile next/image-এ alt/aspect ratio সহ দেখায়, JSON-LD founder কেবল real profile-এ থাকে; test ও পাঁচটি repo verify command + production/browser smoke সম্পন্ন।
- **TODO — real data:** Founder name, role, photo URL/file + alt, এক লাইনের bio, এবং label/URL সহ profile links।
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .`, production smoke at 375px/desktop ও light/dark।
- **হয়েছে (2026-10-10):** config-backed per-tool tracking/report copy; same facts in homepage, `llms.txt`, Organization `knowsAbout`; optional typed `FOUNDER_PROFILE` guarded against empty/scaffold values; People section and Person JSON-LD omitted by default and rendered only for valid real data; `next/image` with alt, fixed square ratio and unoptimized source for supplied image paths; measurement/proof cards use icons, matching card height and 14px copy. Added `homepage-content.test.ts` (6). Latest full tests: web **159 passed**, UI **9 passed**; leads **25 suites failed at Prisma test DB setup**, **291 skipped**. `npm run lint`, `npm run typecheck`, `npm run build` pass (existing Edge warnings). Production `/`, `/llms.txt`, `/api/health` return **200**; all three tools appear; founder placeholder and People heading are absent. `prettier --check .` flags the existing untracked `apps/web/tests/e2e/mobile-reveal.spec.ts`; touched files pass after `prettier --write`. In-app browser is unavailable, so 375px/desktop plus light/dark visual inspection remains outstanding; status stays in-progress.

### 25. Homepage visual, trust and conversion pass — `in-progress` (2026-10-10)

- **কাজ:** Illustrative web/mobile product visual; real-only trust proof; sample deliverable and request CTA; founder/team placeholders; KPI/reporting explainer; tighter section rhythm; card consistency; contrast, focus, heading and FAQ accessibility; themed final CTA; restrained hover/header/anchor polish.
- **ফাইল:** `apps/web/src/app/(site)/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/components/selected-work.tsx`, `packages/ui/src/layout.ts`, `packages/ui/src/sections/cta-section.tsx`, `packages/ui/src/sections/faq-accordion.tsx`, `packages/ui/src/components/header.tsx`, `packages/ui/tokens.css`.
- **শেষ হবে যখন:** Responsive home page is smoke-checked in both themes and reduced motion; Lighthouse results are measured and reported; all five repository verify commands and production route smoke pass; placeholders remain explicit and no fabricated claims/metrics ship.
- **Verify:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx prettier --check .`, production smoke and Lighthouse.
- **হয়েছে (2026-10-10):** illustrative CSS dashboard/mobile preview; sample scope card + case-studies-on-request CTA; real delivery commitments, KPI/tool explainer and explicit founder/photo/profile TODO; shared section rhythm tightened; themed CTA reassurance; native FAQ controls labelled; PageHero converted to RSC/CSS entrance and route template made pass-through. No OG/schema metadata changed. `npm run lint`, `npm run typecheck`, `npm run build` pass. Web tests **153** and UI tests **9** pass; leads suite setup fails in `prisma db push` with a blank schema-engine error (291 skipped). Production routes: `/`, `/services`, `/api/health` **200**; `/admin`, `/portal` **307**. Lighthouse (mobile preset): Performance **38**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **5.1s**, TBT **3,020ms**, CLS **0**. Full `prettier --check .` flags the pre-existing untracked `apps/web/tests/e2e/mobile-reveal.spec.ts`; every touched file passes Prettier. In-app browser unavailable, so viewport/theme/reduced-motion visual inspection is outstanding. Performance target and the remaining manual checks keep this item in progress.

## সারসংক্ষেপ (দ্রুত দেখার জন্য)

| #   | আইটেম                                                 | Priority | Status      |
| --- | ----------------------------------------------------- | -------- | ----------- |
| 1   | Phase 17–21 + observability commit                    | P0       | done        |
| 2   | RESEND/AUTH_SECRET প্রোড env                          | P0       | in-progress |
| 3   | `/admin/users` UI                                     | P1       | done        |
| 4   | Stripe billing                                        | P1       | pending     |
| 5   | PDF download/attach                                   | P1       | done        |
| 6   | Case study media upload                               | P1       | done        |
| 7   | Public API (`ApiError`)                               | P1       | done        |
| 8   | i18n `[locale]`                                       | P1       | pending     |
| 9   | Analytics + cookie policy শেষ                         | P1       | done        |
| 10  | Blog/content hub                                      | P1       | done        |
| 11  | Mobile: CRM/portal (spec লাগবে)                       | P1       | pending     |
| 12  | Rate limiter shared store                             | P2       | pending     |
| 13  | Postgres                                              | P2       | pending     |
| 14  | Email queue + cc/bcc                                  | P2       | pending     |
| 15  | `global-error` inline styles                          | P2       | done        |
| 16  | Web UI test coverage                                  | P2       | done        |
| 17  | Phase 10 doc cleanup                                  | P2       | done        |
| 18  | SEO/AEO/GEO (llms.txt হয়েছে)                         | P1       | done        |
| 19  | Blog cover image + video embed                        | P1       | done        |
| 20  | Blog post delete                                      | P1       | done        |
| 21  | Case study video embed                                | P1       | done        |
| 22  | Site settings: logo + favicon                         | P1       | done        |
| 23  | UI/UX + a11y + bugfix pass                            | P1       | done        |
| 24  | Scroll-reveal ফাঁকা কন্টেন্ট                          | P1       | done        |
| 25  | Homepage visual, trust and conversion pass            | P1       | in-progress |
| 26  | Homepage measurement copy and People publishing guard | P1       | in-progress |
| 27  | Admin-managed People / Founder profiles               | P1       | in-progress |
| 28  | Homepage proof and measurement layout                 | P1       | in-progress |
| 29  | Homepage visual polish and theme control              | P1       | done        |
| 30  | Service cards and capability brand icons              | P1       | done        |
