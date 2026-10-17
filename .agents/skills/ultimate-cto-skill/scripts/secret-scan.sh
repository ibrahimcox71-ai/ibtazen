#!/usr/bin/env bash
# secret-scan.sh — look for hard-coded secrets. Read-only. Never prints the secret value itself.
#
# Usage: bash secret-scan.sh [path]
# Exit code: 1 if anything suspicious was found, 0 otherwise.
#
# Heuristic only: expect some false positives (test fixtures, placeholders) and some misses.
# If a real secret is found: ROTATE it first, then remove it. Deleting it from code does not
# remove it from git history.

set -u
ROOT="${1:-.}"
[ -d "$ROOT" ] || { echo "Not a directory: $ROOT"; exit 1; }
cd "$ROOT" || exit 1

EXCL=(--exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=.git --exclude-dir=dist
      --exclude-dir=build --exclude-dir=.next --exclude-dir=coverage --exclude-dir=venv
      --exclude-dir=.venv --exclude=*.min.js --exclude=*.map --exclude=*.lock
      --exclude=package-lock.json --exclude=*.png --exclude=*.jpg --exclude=*.jpeg
      --exclude=*.gif --exclude=*.webp --exclude=*.woff* --exclude=*.ttf --exclude=*.pdf)

FOUND=0
check() { # check "name" "regex"
  local name="$1" re="$2" hits
  hits=$(grep -rIlE "${EXCL[@]}" -e "$re" . 2>/dev/null | grep -vE '(\.env\.example|\.env\.sample|\.md$)' | head -n 8)
  if [ -n "$hits" ]; then
    FOUND=1
    echo "[SECRET?] $name"
    while IFS= read -r f; do
      ln=$(grep -nE "$re" "$f" 2>/dev/null | head -1 | cut -d: -f1)
      echo "      $f:${ln:-?}   (value hidden)"
    done <<< "$hits"
  fi
}

check "Private key block"                'BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY'
check "AWS access key id"                '\bAKIA[0-9A-Z]{16}\b'
check "Google API key"                   '\bAIza[0-9A-Za-z_-]{35}\b'
check "GitHub token"                     '\bgh[pousr]_[A-Za-z0-9]{30,}\b'
check "Slack token"                      '\bxox[baprs]-[A-Za-z0-9-]{10,}\b'
check "Stripe live key"                  '\b(sk|rk)_live_[0-9A-Za-z]{16,}\b'
check "SendGrid key"                     '\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b'
check "Anthropic / OpenAI style key"     '\bsk-(ant-)?[A-Za-z0-9_-]{32,}\b'
check "JWT-like token hard-coded"        '\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b'
check "Password / secret assigned a literal" \
  '(password|passwd|secret|api_?key|access_?token|auth_?token|client_?secret|DB_PASS(WORD)?)["'"'"']?\s*[:=]>?\s*["'"'"'][^"'"'"'$\{ ]{8,}["'"'"']'
check "Credentials inside a URL"         '[a-zA-Z][a-zA-Z0-9+.-]*://[^/\s:@]+:[^/\s:@]{4,}@[^/\s]+'

# Committed .env style files (real env files, not examples)
for f in .env .env.local .env.production .env.prod; do
  if [ -f "$f" ] && [ -d .git ] && git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    FOUND=1; echo "[SECRET?] $f is tracked by git"
  fi
done

if [ $FOUND -eq 0 ]; then echo "No obvious secrets found (heuristic scan)."; exit 0; fi
echo "Review each hit. If real: rotate the credential first, then remove from code and history."
exit 1
