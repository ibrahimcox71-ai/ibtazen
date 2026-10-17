# Stack Rules & Common Bug Patterns

Read the section for the stack you detected (see `project-triage.md` §1). Each section lists:
conventions to follow, the mistakes that actually happen in real projects, and what to check
first. Always match the project's existing framework version and style.

---

## Laravel (extends SKILL.md §23)

**Detect:** `artisan`, `composer.json` with `laravel/framework`. Check the version before giving advice; APIs differ between 8/9/10/11/12.

**Conventions**

- Validation in `FormRequest`; authorization in Policies/Gates (`$this->authorize()`), not in views.
- Business logic in Services/Actions, thin controllers, no queries in Blade.
- Config via `config()`, never `env()` outside config files (breaks under `config:cache`).
- Queues for mail, SMS, PDF, image work, webhooks. A queue worker must actually be running.
- Money: `DECIMAL(12,2)` or integer minor units; never `float`.

**Common real bugs**

| Pattern                                                     | Problem                                         | Fix                                                             |
| ----------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `env('X')` in app code                                      | returns `null` after `config:cache`             | read via `config('file.key')`                                   |
| `Model::create($request->all())`                            | mass assignment (user sets `is_admin`, `price`) | `$request->validated()` + `$fillable`                           |
| `$guarded = []` on sensitive models                         | same as above                                   | explicit `$fillable`                                            |
| `{!! $x !!}` with user data                                 | XSS                                             | `{{ }}`; sanitize if HTML is required                           |
| `foreach ($posts as $p) { $p->author->name }`               | N+1                                             | `with('author')`; consider `Model::preventLazyLoading()` in dev |
| `Order::find($id)` in controller with no ownership check    | IDOR                                            | `$request->user()->orders()->findOrFail($id)` or Policy         |
| Stock `decrement` without transaction                       | overselling                                     | `DB::transaction` + `lockForUpdate()`                           |
| `->get()` on huge tables                                    | memory/timeouts                                 | `paginate()` / `chunkById()`                                    |
| Missing indexes on FK / filter columns                      | slow queries                                    | add index in a migration                                        |
| Routes without `auth` / `throttle` middleware               | open endpoints                                  | group middleware; throttle login/OTP                            |
| `APP_DEBUG=true` in production                              | stack traces leak secrets                       | set `false`                                                     |
| `.env` / `storage` publicly reachable                       | secret leak                                     | web root must be `public/` only                                 |
| Catching `\Exception` and returning silently                | hidden failures                                 | log with context, return proper error                           |
| Running migrations with `--force` on live DB with no backup | data loss                                       | Safety Gate: backup + rollback first                            |

**First commands:** `php artisan about`, `php artisan route:list`, `php artisan migrate:status`, `tail storage/logs/laravel.log`, `composer audit`, `./vendor/bin/pint --test`, `php artisan test`.

**Deploy checklist:** `composer install --no-dev -o`, `php artisan config:cache route:cache view:cache`, `migrate --force` (after backup), storage symlink, queue worker (Supervisor), scheduler cron, correct permissions on `storage` + `bootstrap/cache`.

---

## Plain PHP (no framework)

- PDO prepared statements only; `password_hash`/`password_verify`; `session_regenerate_id(true)` on login.
- One front controller; code and `.env`/config outside the web root.
- Escape all output with `htmlspecialchars($x, ENT_QUOTES, 'UTF-8')`.
- CSRF token on every state-changing form; validate server-side always.
- Upload handling: check real MIME (`finfo`), extension allow-list, size, random filename, store outside web root.
- Common bugs: `mysqli_query` with concatenated `$_GET/$_POST`, `md5()`/`sha1()` passwords, `extract($_POST)`, `include $_GET['page']`, `display_errors=On` in production, mixed tabs of `error_reporting` hiding notices.

---

## Next.js / React (TypeScript)

**Detect:** `next.config.*`, `app/` or `pages/` dir. Know whether it's App Router or Pages Router.

**Conventions**

- Server Components by default; add `"use client"` only where state/effects/browser APIs are needed.
- Validate all input on the server (route handlers / server actions) with a schema (e.g. zod). Client validation is UX only.
- Secrets only in server code; only `NEXT_PUBLIC_*` reaches the browser.
- Use `next/image`, `next/font`; set `metadata` for SEO; dynamic routes need `generateStaticParams`/revalidation thought-through.

**Common real bugs**

| Pattern                                          | Problem                                                           | Fix                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Hydration mismatch                               | `Date.now()`, `Math.random()`, `window`, `localStorage` in render | move to `useEffect`, or `suppressHydrationWarning` only for known-safe cases |
| `useEffect` fetch with missing deps / no cleanup | stale data, double calls, memory leaks                            | fix deps, abort controller, or use server fetching/React Query               |
| Server action / API route without auth check     | anyone can call it                                                | verify session + ownership server-side                                       |
| Secret in `NEXT_PUBLIC_`                         | exposed to everyone                                               | move server-side                                                             |
| `dangerouslySetInnerHTML` with user content      | XSS                                                               | sanitize (DOMPurify) or avoid                                                |
| Fetch caching surprises                          | stale or never-cached data                                        | set explicit `cache`/`revalidate`                                            |
| Huge client bundle                               | slow on mobile                                                    | dynamic import, remove heavy libs, check `next build` output                 |
| Middleware doing heavy work                      | slow every request                                                | keep it light; auth checks still need to be in handlers                      |

**First commands:** `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build` (read the route size table), `npm audit --omit=dev`.

---

## Node.js (Express / NestJS / Fastify)

- Validate every request (zod/joi/class-validator); central error handler; no unhandled promise rejections.
- Helmet, CORS with explicit origins (never `*` with credentials), rate limit auth routes.
- ORM/parameterized queries only; never interpolate into SQL/Mongo filters (NoSQL injection: reject objects where strings are expected).
- Config via env with validation at boot; fail fast if missing.
- Common bugs: missing `await`, forgetting `return` after `res.send` (double response), no timeout on outbound HTTP, unbounded `Promise.all`, secrets in logs, in-memory sessions/rate-limit on multi-instance deploys, no graceful shutdown.
- **First commands:** `npm ci`, `npm test`, `npm audit --omit=dev`, check Node version vs `engines`.

---

## Django / FastAPI / Flask

- Django: keep `DEBUG=False`, set `ALLOWED_HOSTS`, `SECRET_KEY` from env, use ORM (avoid `.raw()` with f-strings), CSRF on, `select_related`/`prefetch_related` for N+1, `migrate` only after backup on live data.
- FastAPI: Pydantic models for input/output, dependency-injected auth, async only for truly async I/O (blocking calls inside `async def` freeze the loop), explicit CORS origins.
- Common bugs: `DEBUG=True` in prod, missing `permission_classes` (DRF default allows more than you think), mass-assignment through `fields = '__all__'`, N+1 in serializers, blocking I/O in async handlers.
- **First commands:** `python -m venv`, `pip install -r requirements.txt`, `pytest`, `pip-audit`, `python manage.py check --deploy`.

---

## Flutter / React Native

- Don't port a web layout 1:1; use platform navigation patterns and safe areas.
- Never store secrets/API keys in the app bundle (they can be extracted). Anything sensitive goes through your backend.
- Token storage in secure storage (Keychain/Keystore), not plain prefs.
- Handle offline/slow network, permission denial, and app lifecycle (background/resume).
- Common bugs: unawaited async in `initState`/effects, rebuilding huge lists without virtualization (`ListView.builder` / `FlatList`), memory leaks from uncancelled listeners/streams, hardcoded base URLs for dev, missing null-safety handling on API fields.
- Release: version/build number bump, signing config, store privacy labels, permission descriptions, test on a low-end device.
- **First commands:** `flutter doctor`, `flutter analyze`, `flutter test` / `npx expo-doctor`, `npm test`.

---

## WordPress (very common in client work)

- Never edit core or a third-party plugin directly. Use a child theme or a small custom plugin.
- Security: keep core/plugins/themes updated; remove unused plugins/themes; strong admin creds + 2FA; limit login attempts; disable file editing (`DISALLOW_FILE_EDIT`); hide `wp-config.php` from web access.
- Custom code: sanitize input (`sanitize_text_field`, etc.), escape output (`esc_html`, `esc_attr`, `esc_url`), nonces on forms/AJAX, `$wpdb->prepare()` for queries, capability checks (`current_user_can`).
- Performance: page cache + object cache, image optimization, limit plugin count, avoid page-builder bloat on key landing pages.
- Common bugs: plugin conflicts (disable all, re-enable one by one), white screen (enable `WP_DEBUG_LOG`, read `wp-content/debug.log`), mixed content after SSL move, wrong `siteurl`/`home`, huge `wp_options` autoload, nulled/pirated themes with backdoors (scan before trusting).
- **First checks:** `wp core version`, `wp plugin list`, `wp core verify-checksums` (if WP-CLI exists), review `wp-content/plugins` for unknown/abandoned items.

---

## Databases (any stack)

- Every FK and every column used in `WHERE`/`ORDER BY`/`JOIN` on large tables should be considered for an index. Check with `EXPLAIN`.
- Constraints: `NOT NULL`, `UNIQUE`, FKs, and `CHECK` where supported. DB is the last line of defense.
- Money = `DECIMAL`/integer minor units. Timestamps stored in UTC.
- Migrations: reversible when possible; destructive ones (drop/rename column, bulk update) follow Safety Gates: backup, test restore, rollback plan.
- Backups: automated, off-server, and a restore that has actually been tested.
