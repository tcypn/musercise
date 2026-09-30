#!/usr/bin/env bash
# Updates the Musercise server on PythonAnywhere in one go:
#
#     bash ~/musercise/backend/update.sh
#
# It pulls the latest code, installs dependencies, backs up the database, applies
# database changes, checks the settings, and reloads the site. If any step fails it
# stops right there and the site keeps running the previous version.
#
# Optional settings (environment variables):
#   VENV=<path>           virtualenv to use             (default ~/.virtualenvs/musercise)
#   DATABASE_PATH=<file>  the SQLite database           (default ~/musercise-data/db.sqlite3)
#   WSGI_FILE=<file>      file to touch to reload site  (default: found in /var/www)
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$BACKEND_DIR")"
VENV="${VENV:-$HOME/.virtualenvs/musercise}"
export DATABASE_PATH="${DATABASE_PATH:-$HOME/musercise-data/db.sqlite3}"
BACKUP_DIR="$(dirname "$DATABASE_PATH")/backups"
KEEP_BACKUPS=5

step() { printf '\n==> %s\n' "$1"; }

trap 'status=$?; echo >&2; echo "Update stopped (see the error above). The site was NOT reloaded and keeps running the previous version." >&2; exit $status' ERR

step "Getting the latest code"
git -C "$REPO_DIR" pull --ff-only

step "Installing dependencies"
if [ ! -f "$VENV/bin/activate" ]; then
  echo "No virtualenv found at $VENV. Set VENV=<path> and run again." >&2
  false
fi
# shellcheck disable=SC1091
. "$VENV/bin/activate"
python -m pip install --quiet -r "$BACKEND_DIR/requirements.txt"
echo "Dependencies are up to date."

step "Backing up the database"
if [ -f "$DATABASE_PATH" ]; then
  mkdir -p "$BACKUP_DIR"
  backup="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sqlite3"
  # SQLite's own backup call gives a consistent copy even if the site is being used right now.
  python - "$DATABASE_PATH" "$backup" <<'PY'
import sqlite3, sys
source, target = sqlite3.connect(sys.argv[1]), sqlite3.connect(sys.argv[2])
source.backup(target)
target.close()
source.close()
PY
  echo "Saved $backup"
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR"/db-*.sqlite3 | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
else
  echo "No database yet, nothing to back up."
fi

step "Applying database changes"
cd "$BACKEND_DIR"
# The real SECRET_KEY lives in the web app's WSGI file. These commands only need any value.
export SECRET_KEY="${SECRET_KEY:-update-script-only}"
python manage.py migrate --noinput
python manage.py check

step "Reloading the site"
wsgi="${WSGI_FILE:-}"
if [ -z "$wsgi" ]; then
  # PythonAnywhere reloads a site when its WSGI file is touched: /var/www/<user>_pythonanywhere_com_wsgi.py
  wsgi="$(ls -1 /var/www/"${USER:-$(id -un)}"_*wsgi.py 2>/dev/null | head -n 1 || true)"
fi
if [ -n "$wsgi" ] && [ -f "$wsgi" ] && touch "$wsgi" 2>/dev/null; then
  echo "Reloaded ($wsgi)."
else
  echo "Could not reload automatically. Open the Web tab and click the green Reload button."
fi

printf '\nDone. Now running: %s\n' "$(git -C "$REPO_DIR" log -1 --format='%h %s')"
