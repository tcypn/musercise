# Musercise

A personal ear-training and music-theory app for learning to play by ear, improvise and accompany. The home screen is a **map of everything to learn** (7 stages, 42 lessons); lessons that are not built yet are marked *Coming soon*. Two are ready: **intervals** and **chord quality**, each with ten levels across all 88 piano keys and progress tracking.

- **frontend/** React + Vite + TypeScript. Piano sound comes from Salamander Grand Piano samples (Tone.js), pitch-shifted to cover A0 to C8.
- **backend/** Django + Django REST Framework + SQLite. Stores sessions and computes your stats. Optional: the app also works with no server, keeping progress in the browser.

## The map

`frontend/src/theory/curriculum.ts` lists every stage and lesson: keyboard and pitch, keys and scales, chords, harmony and progressions, rhythm and song form, melody and improvisation, accompaniment. A lesson becomes *Ready* when it has an exercise (`exerciseId`); the map shows progress per lesson, a "You are here" marker, and a suggested route to accompanying a pop or R&B song. Nothing is locked between lessons.

Each exercise has ten levels of 20 questions. Score 80% or more to unlock the next level.

### Intervals

| Level | Intervals | Direction |
| --- | --- | --- |
| 1 | P4, P5, P8 | up |
| 2 | adds m3, M3 | up |
| 3 | adds m6, M6 | up |
| 4 | adds m2, M2, m7, M7 | up |
| 5 | adds the tritone (all 12) | up, wider register |
| 6 | all 12 | down |
| 7 | all 12 | up and down, bass to treble |
| 8 | P4, P5, P8, m3, M3, m6, M6 | both notes together |
| 9 | all 12 | together |
| 10 | all 12 | everything, all 88 keys |

### Chord quality

| Level | Chords | How they are played |
| --- | --- | --- |
| 1 | major, minor | together |
| 2 | adds diminished | together |
| 3 | adds augmented (the four triads) | together |
| 4 | the four triads | broken, one note at a time |
| 5 | the four triads, also turned upside down | together |
| 6 | adds sus2, sus4 | together |
| 7 | major 7th, dominant 7th, minor 7th | together |
| 8 | adds half-diminished and diminished 7th | together |
| 9 | triads, sus chords and sevenths mixed | together and broken |
| 10 | everything | all 88 keys |

Only the four triads are ever inverted: an inverted sus2 has the same notes as a sus4 on another root, and an inverted minor 7th matches a 6th chord, so those answers would be ambiguous.

Levels live in `frontend/src/theory/exercises/`. The pass rule is also in `backend/progress/rules.py`, together with the list of answers the server accepts; keep the two in sync.

## Run it locally

```bash
# backend (terminal 1)
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export DEBUG=1 API_TOKEN=devtoken
python manage.py migrate
python manage.py runserver          # http://localhost:8000

# frontend (terminal 2)
cd frontend
npm install
npm run dev                         # http://localhost:5173
```

In the app open **Settings**, enter `http://localhost:8000` and the token `devtoken`, then **Save and test**.
Without a server address the app still works and keeps progress in this browser.

Tests: `cd backend && DEBUG=1 python manage.py test` and `cd frontend && npm test`.

## Host it for free

You need two things: the frontend on GitHub Pages, and (optionally) the backend on PythonAnywhere.

### 1. Frontend on GitHub Pages

1. Push this repo to GitHub, then merge to `main`.
2. In the repo go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The workflow `.github/workflows/deploy-frontend.yml` builds and publishes on every push to `main` that touches `frontend/`.
4. Your app is at `https://<your-username>.github.io/musercise/`.

It uses hash routes (`/#/progress`), so refreshing any page works on Pages without extra config.

### 2. Backend on PythonAnywhere (free, always on)

1. Create a free account at pythonanywhere.com. Your API address will be `https://<username>.pythonanywhere.com`.
2. Open a **Bash console** and run:
   ```bash
   git clone https://github.com/<you>/musercise.git
   cd musercise/backend
   python3.11 -m venv ~/.virtualenvs/musercise
   . ~/.virtualenvs/musercise/bin/activate
   pip install -r requirements.txt
   ```
3. **Web** tab > **Add a new web app** > **Manual configuration** > Python 3.11. Set:
   - **Virtualenv**: `/home/<username>/.virtualenvs/musercise`
   - **Source code**: `/home/<username>/musercise/backend`
4. Click the **WSGI configuration file** link and replace its contents with:
   ```python
   import os, sys
   sys.path.insert(0, '/home/<username>/musercise/backend')
   os.environ['DJANGO_SETTINGS_MODULE'] = 'musercise.settings'
   os.environ['SECRET_KEY'] = '<long random string>'
   os.environ['API_TOKEN'] = '<another long random string, your password>'
   os.environ['ALLOWED_HOSTS'] = '<username>.pythonanywhere.com'
   os.environ['CORS_ALLOWED_ORIGINS'] = 'https://<your-github-username>.github.io'
   os.environ['DATABASE_PATH'] = '/home/<username>/musercise-data/db.sqlite3'
   from django.core.wsgi import get_wsgi_application
   application = get_wsgi_application()
   ```
   Generate the random strings with `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
5. In the Bash console: `mkdir -p ~/musercise-data && cd ~/musercise/backend && SECRET_KEY=x DATABASE_PATH=$HOME/musercise-data/db.sqlite3 python manage.py migrate`
6. On the **Web** tab click **Reload**.
7. Open your GitHub Pages app > **Settings**, enter `https://<username>.pythonanywhere.com` and your `API_TOKEN`, then **Save and test**.

Things to know about the free tier:
- Free web apps must be extended every 3 months: log in and click **Run until 3 months from today** on the Web tab. PythonAnywhere emails a reminder first.
- The database is a single SQLite file. Download `~/musercise-data/db.sqlite3` now and then as a backup.
- Updating: `cd ~/musercise && git pull`, then **Reload** on the Web tab (run `manage.py migrate` when models change).

Alternative: Render's free web service also runs Django, but it sleeps after 15 minutes idle and its free disk resets, so SQLite data would not survive. PythonAnywhere fits this app better.

### Updating after new versions

The frontend redeploys by itself when `main` changes. The backend does not, so after each update open a **Bash console** on PythonAnywhere and run one command:

```bash
bash ~/musercise/backend/update.sh
```

It pulls the latest code, installs dependencies, **backs up your database** (the last 5 copies are kept in `~/musercise-data/backups/`), applies database changes, checks the settings and reloads the site. If a step fails it stops without reloading and says which step failed; fix the problem and run it again. Running it twice does no harm.

The very first time, the script is not on your server yet, so fetch it first: `cd ~/musercise && git pull && bash backend/update.sh`.

If your username or paths differ from the guide, set `VENV=...`, `DATABASE_PATH=...` or `WSGI_FILE=...` in front of the command. If the last line says it could not reload automatically, click the green **Reload** button on the Web tab.

Do this soon after the site updates. If you practise in between, the app keeps your finished sessions on your device and uploads them once the server is updated (Settings shows a "Try uploading again" button if the server refused any).

To restore a backup, copy one of the files in `~/musercise-data/backups/` over `~/musercise-data/db.sqlite3` and reload.

### About the access token

GitHub Pages is public, so the token is never built into the site. You type it once in **Settings** and it is kept in your browser's local storage. Anyone without it gets a 403 from the API.

## Credits

Piano samples: Salamander Grand Piano by Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via the [Tone.js audio repo](https://github.com/Tonejs/audio).
