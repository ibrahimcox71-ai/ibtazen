#!/usr/bin/env bash
# diagnose.sh — read-only project triage.
#
# Usage:
#   bash diagnose.sh [project-path]            # static scan only (safe, changes nothing)
#   bash diagnose.sh [project-path] --run      # also run audit / test / build if tools exist
#
# Output: stack detection, hygiene checks, risky-pattern findings with file:line, and (with --run)
# command results. Findings are labeled [CRITICAL] [HIGH] [MEDIUM] [LOW] [INFO].
# This script never modifies project files. --run may create build artifacts (e.g. node_modules, dist).

set -u
ROOT="."
RUN=0
for a in "$@"; do
  case "$a" in
    --run) RUN=1 ;;
    *) ROOT="$a" ;;
  esac
done

[ -d "$ROOT" ] || { echo "Not a directory: $ROOT"; exit 1; }
cd "$ROOT" || exit 1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EXCL=(--exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=.git --exclude-dir=storage
      --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=.nuxt
      --exclude-dir=coverage --exclude-dir=__pycache__ --exclude-dir=venv --exclude-dir=.venv
      --exclude-dir=public/build --exclude-dir=bootstrap/cache --exclude=*.min.js --exclude=*.map
      --exclude=*.lock --exclude=package-lock.json --exclude=*.log)

COUNT_C=0; COUNT_H=0; COUNT_M=0; COUNT_L=0
say()  { printf '%s\n' "$*"; }
head1(){ printf '\n== %s ==\n' "$*"; }
flag() { # flag SEVERITY "message"
  case "$1" in
    CRITICAL) COUNT_C=$((COUNT_C+1));; HIGH) COUNT_H=$((COUNT_H+1));;
    MEDIUM) COUNT_M=$((COUNT_M+1));; LOW) COUNT_L=$((COUNT_L+1));;
  esac
  printf '[%s] %s\n' "$1" "$2"
}
# scan SEVERITY "title" "include-glob(s) comma-separated" "regex"
scan() {
  local sev="$1" title="$2" globs="$3" re="$4" inc=() g out
  IFS=',' read -ra gl <<< "$globs"
  for g in "${gl[@]}"; do inc+=(--include="$g"); done
  out=$(grep -rInE "${EXCL[@]}" "${inc[@]}" -e "$re" . 2>/dev/null | head -n 5)
  if [ -n "$out" ]; then
    flag "$sev" "$title"
    printf '%s\n' "$out" | cut -c1-200 | sed 's/^/      /'
  fi
}
have() { command -v "$1" >/dev/null 2>&1; }

say "Project triage: $(pwd)"
say "Date: $(date -u +%Y-%m-%dT%H:%MZ)   Mode: $([ $RUN -eq 1 ] && echo 'static + run' || echo 'static only')"

# ---------- 1. Stack detection ----------
head1 "1. Stack detection"
STACK=()
if [ -f composer.json ]; then
  if [ -f artisan ]; then
    v=$(grep -oE '"laravel/framework"\s*:\s*"[^"]+"' composer.json | head -1 | sed -E 's/.*:\s*"//; s/"//')
    STACK+=("laravel"); say "Laravel (framework constraint: ${v:-unknown})"
  else STACK+=("php"); say "PHP (composer project, no artisan)"; fi
  grep -oE '"php"\s*:\s*"[^"]+"' composer.json | head -1 | sed 's/^/  requires /'
fi
if [ -f package.json ]; then
  for k in next nuxt react vue svelte express nestjs @nestjs/core fastify vite tailwindcss expo react-native; do
    grep -qE "\"$k\"\s*:" package.json && { STACK+=("$k"); say "Node dep: $k"; }
  done
  grep -oE '"node"\s*:\s*"[^"]+"' package.json | head -1 | sed 's/^/  engines /'
  [ ${#STACK[@]} -eq 0 ] && STACK+=("node")
fi
[ -f requirements.txt ] || [ -f pyproject.toml ] && {
  STACK+=("python"); say "Python project"
  grep -qiE 'django' requirements.txt pyproject.toml 2>/dev/null && say "  Django"
  grep -qiE 'fastapi' requirements.txt pyproject.toml 2>/dev/null && say "  FastAPI"
  grep -qiE 'flask' requirements.txt pyproject.toml 2>/dev/null && say "  Flask"
}
[ -f pubspec.yaml ] && { STACK+=("flutter"); say "Flutter"; }
{ [ -f wp-config.php ] || [ -d wp-content ]; } && { STACK+=("wordpress"); say "WordPress"; }
[ -f index.html ] && [ ${#STACK[@]} -eq 0 ] && { STACK+=("static"); say "Static HTML site"; }
[ ${#STACK[@]} -eq 0 ] && say "Could not detect a known stack. Read the folder structure by hand."
[ -d .git ] && say "Git repo: yes ($(git rev-list --count HEAD 2>/dev/null || echo '?') commits)" || say "Git repo: no"

# ---------- 2. Hygiene ----------
head1 "2. Project hygiene"
[ -f README.md ] || [ -f README ] || flag LOW "No README"
[ -f .gitignore ] || flag MEDIUM "No .gitignore"
if [ -f .env ] ; then
  if [ -d .git ] && git ls-files --error-unmatch .env >/dev/null 2>&1; then
    flag CRITICAL ".env is tracked by git (secrets are in repo history). Rotate secrets, untrack it."
  elif [ -f .gitignore ] && ! grep -qE '^\s*/?\.env\s*$|^\s*\.env\*' .gitignore; then
    flag HIGH ".env exists but is not listed in .gitignore"
  fi
  grep -qiE '^APP_DEBUG\s*=\s*true' .env && flag MEDIUM "APP_DEBUG=true in .env (must be false in production)"
  grep -qiE '^APP_ENV\s*=\s*local' .env && flag INFO "APP_ENV=local in .env (fine for dev; confirm production differs)"
fi
{ [ -f composer.json ] || [ -f package.json ]; } && [ ! -f .env.example ] && [ -f .env ] && flag LOW "No .env.example documenting required variables"
[ -f composer.json ] && [ ! -f composer.lock ] && flag MEDIUM "composer.lock missing (versions not pinned)"
[ -f package.json ] && [ ! -f package-lock.json ] && [ ! -f yarn.lock ] && [ ! -f pnpm-lock.yaml ] && [ ! -f bun.lockb ] && flag MEDIUM "No JS lockfile (versions not pinned)"
if ls -d tests test __tests__ spec 2>/dev/null | grep -q .; then say "Tests dir: present"
else flag MEDIUM "No tests directory found"; fi
[ -d .github/workflows ] || [ -f .gitlab-ci.yml ] || [ -f Jenkinsfile ] || flag LOW "No CI config found"
[ -f artisan ] && [ -d public ] && [ -f public/.env ] && flag CRITICAL "public/.env exists (web-readable secrets)"
find . -maxdepth 3 \( -name '*.sql' -o -name '*.sql.gz' -o -name 'backup*.zip' -o -name '*.bak' \) \
  -not -path './node_modules/*' -not -path './vendor/*' -not -path './.git/*' 2>/dev/null | head -5 | while read -r f; do
  flag HIGH "Possible DB dump / backup inside project: $f (must not be web-accessible)"; done

# ---------- 3. Secrets ----------
head1 "3. Secret scan"
if [ -f "$HERE/secret-scan.sh" ]; then bash "$HERE/secret-scan.sh" . || flag CRITICAL "Possible secrets found (see above). Rotate them; don't just delete."
else say "secret-scan.sh not found next to this script, skipped."; fi

# ---------- 4. Risky patterns ----------
head1 "4. Risky code patterns (top 5 hits each, file:line)"
# PHP
scan CRITICAL "SQL built from request input (SQL injection risk)" "*.php" \
  '(query|exec|execute|mysqli_query|mysql_query|whereRaw|selectRaw|orderByRaw|DB::raw|DB::select|DB::statement)\s*\(.*(\$_(GET|POST|REQUEST|COOKIE)|\$request->(input|get|all|query)\()'
scan HIGH "SQL string concatenation with a variable" "*.php" \
  '(SELECT|INSERT|UPDATE|DELETE)[^;]*["'"'"']\s*\.\s*\$[a-zA-Z_]'
scan CRITICAL "Dynamic include/require from request input (file inclusion)" "*.php" \
  '(include|require)(_once)?\s*\(?\s*\$_(GET|POST|REQUEST)'
scan HIGH "Command/code execution function (check for user input)" "*.php" \
  '\b(eval|shell_exec|passthru|system|proc_open|popen)\s*\('
scan HIGH "Weak password hashing (md5/sha1)" "*.php" \
  '(md5|sha1)\s*\(\s*\$[a-zA-Z_]*pass'
scan HIGH "Mass assignment risk (guarded = [] or create(all()))" "*.php" \
  '(\$guarded\s*=\s*\[\s*\]|::(create|update)\(\s*\$request->all\(\)|->fill\(\s*\$request->all\(\))'
scan MEDIUM "Unescaped Blade output {!! !!} (XSS if user data)" "*.blade.php" '\{!!'
scan MEDIUM "float used for money-like column" "*.php" \
  "(->float\(\s*['\"](price|amount|total|balance|fee|cost)|float\s+\\\$(price|amount|total|balance))"
scan MEDIUM "DEBUG left on / debug helpers in code" "*.php" '\b(dd|dump|var_dump|print_r)\s*\(|APP_DEBUG.{0,12}true'
scan MEDIUM "display_errors enabled in code" "*.php" "ini_set\(\s*['\"]display_errors['\"]\s*,\s*['\"]?(1|On|true)"
# JS / TS
scan HIGH "innerHTML / dangerouslySetInnerHTML / v-html (XSS if user data)" "*.js,*.jsx,*.ts,*.tsx,*.vue,*.svelte,*.html" \
  'innerHTML\s*=|dangerouslySetInnerHTML|v-html='
scan HIGH "eval / new Function in JS" "*.js,*.jsx,*.ts,*.tsx" '\beval\s*\(|new Function\s*\('
scan HIGH "Secret exposed through public env prefix" "*.js,*.jsx,*.ts,*.tsx,.env*" \
  '(NEXT_PUBLIC|VITE|REACT_APP|NUXT_PUBLIC)_[A-Z_]*(SECRET|PRIVATE|PASSWORD|SERVICE_ROLE)'
scan MEDIUM "CORS wildcard origin" "*.js,*.ts,*.php,*.py" \
  "(origin\s*:\s*['\"]\*['\"]|Access-Control-Allow-Origin['\"]?\s*[:,]\s*['\"]\*|allowed_origins['\"]?\s*=>\s*\[\s*['\"]\*)"
scan MEDIUM "TLS verification disabled" "*.js,*.ts,*.php,*.py" \
  'rejectUnauthorized\s*:\s*false|CURLOPT_SSL_VERIFYPEER\s*,\s*(false|0)|verify\s*=\s*False'
scan LOW "console.log left in source" "*.js,*.jsx,*.ts,*.tsx,*.vue" 'console\.log\('
# Python
scan HIGH "Python DEBUG=True / raw SQL f-string / shell=True" "*.py" \
  '^\s*DEBUG\s*=\s*True|\.(execute|raw)\(\s*f["'"'"']|shell\s*=\s*True'
scan HIGH "Python eval/exec/pickle.loads on data" "*.py" '\b(eval|exec)\s*\(|pickle\.loads?\('
# WordPress
scan HIGH "WordPress: \$wpdb query without prepare()" "*.php" '\$wpdb->(query|get_results|get_row|get_var)\(\s*["'"'"'].*\$'
# Generic
scan LOW "TODO / FIXME / HACK markers" "*.php,*.js,*.jsx,*.ts,*.tsx,*.py,*.vue,*.dart" '\b(TODO|FIXME|HACK|XXX)\b'

# ---------- 5. Run mode ----------
if [ $RUN -eq 1 ]; then
  head1 "5. Executing checks (--run)"
  run() { # run "label" cmd...
    local label="$1"; shift
    printf '\n-- %s --\n' "$label"
    if have timeout; then timeout 300 "$@" 2>&1 | tail -n 25; rc=${PIPESTATUS[0]}; else "$@" 2>&1 | tail -n 25; rc=${PIPESTATUS[0]}; fi
    [ "$rc" -eq 0 ] && say "=> OK" || { flag MEDIUM "$label failed (exit $rc). Read the first real error above."; }
  }
  if [ -f composer.json ] && have composer; then
    [ -d vendor ] || run "composer install" composer install --no-interaction --prefer-dist
    run "composer audit" composer audit
    [ -f artisan ] && have php && run "php artisan test" php artisan test
    [ -x vendor/bin/pint ] && run "pint --test" vendor/bin/pint --test
    [ -x vendor/bin/phpstan ] && run "phpstan" vendor/bin/phpstan analyse --no-progress
  elif [ -f composer.json ]; then say "composer not installed here: skipped PHP checks."; fi
  if [ -f package.json ] && have npm; then
    [ -d node_modules ] || run "npm ci" npm ci --no-audit --no-fund
    run "npm audit (prod)" npm audit --omit=dev
    grep -q '"lint"' package.json && run "npm run lint" npm run lint --silent
    grep -q '"test"' package.json && run "npm test" npm test --silent
    grep -q '"build"' package.json && run "npm run build" npm run build --silent
  elif [ -f package.json ]; then say "npm not installed here: skipped JS checks."; fi
  if [ -f requirements.txt ] && have python3; then
    have pip-audit && run "pip-audit" pip-audit -r requirements.txt
    have pytest && run "pytest" pytest -q
  fi
fi

# ---------- Summary ----------
head1 "Summary"
say "CRITICAL: $COUNT_C   HIGH: $COUNT_H   MEDIUM: $COUNT_M   LOW: $COUNT_L"
say "Static scan is a starting point. Hits need human confirmation (false positives happen) and"
say "absence of hits does not mean the project is safe. Read the code paths for auth, payments, and uploads."
[ $RUN -eq 0 ] && say "Re-run with --run to execute audit/test/build."
exit 0
