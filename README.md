# Musercise

A personal ear-training and music-theory app for learning to play by ear, improvise and accompany. **Learn** (home) is a lesson path with today's cards around it; the **Map** tab shows everything to learn (7 stages, 42 lessons), with lessons that are not built yet marked *Coming soon*. Eleven are ready: **keyboard map and note names**, **intervals**, **major scale and key signatures**, **chord quality**, **chord spelling and symbols**, **chords on each scale note**, **scale degrees**, **9ths, 6ths and added notes**, **chord function**, **common progressions** and **pentatonic scale**, each with ten levels and progress tracking (more are added in small batches; the plan is at the bottom of this file).

- **frontend/** React + Vite + TypeScript. Piano sound comes from Salamander Grand Piano samples (Tone.js), pitch-shifted to cover A0 to C8.
- **backend/** Django + Django REST Framework + SQLite. Stores sessions and computes your stats. Optional: the app also works with no server, keeping progress in the browser.

## Learn (home)

**Learn** answers "what should I do today?" first and "how am I doing?" second. The look borrows from Duolingo: bright, rounded, with buttons that sit on a hard lower edge and sink when pressed.

- **The layout.** A menu on the left (icons only on tablets, a bottom tab bar on phones), the path in the middle, and a column of cards on the right: **Today's practice**, **Recommended today** (your weakest answer, your next level, the lesson left alone longest), **Accuracy** for the last 7 days and **Your ear, answer by answer** (radar or bars per answer). The flame and number at the top right is your streak; it opens the **streak page** (this week, a month calendar and how rest days work).
- **The path.** Each curriculum stage is a banner; the stage you are in is open and the others fold to a "Jump here?" card. Intervals and Chord quality show their real ten levels as nodes (gold and ticked = passed, green with a ring and a START bubble = carry on here, grey with a lock = pass the level before it first). Lessons that are not built yet are grouped into one "coming soon" node. The ring shows how many of the lesson's levels you have passed. There are no gems or points: nothing on screen is invented.
- **Accuracy card:** the big number is total correct over total questions for the last 7 days, the pill is the change in points against the 7 days before, and the seven bars are each of those days (today in the darker blue). With under 20 questions in either week it says "not enough data" instead of drawing a conclusion, and it shows how many levels you passed this week, because a new level is harder and a dip after moving up is normal.
- **Streak rule:** a daily streak with **one free rest day per Monday-Sunday week**: a single missed day does not break it, two in a row do, and only one rest day is allowed per week. Any exercise session, or any routine row you timed or ticked, counts as practice.
- The **Progress** tab holds the longer views: this week versus last week, a month calendar, your route through the map, recent sessions and a table per answer. Every chart has a table version, works from the keyboard, and only uses colour together with a label, a shape or a line style.

Streak, accuracy and charts include sessions that have not uploaded yet. Day boundaries use your own calendar day (the app sends it with each session), so a late-evening session lands on the right day. The logic is in `frontend/src/theory/dashboard.ts` and `frontend/src/theory/path.ts`; the cards are in `frontend/src/components/dash/` and the path in `frontend/src/components/path/`.

### A lesson

A lesson is 20 questions. Press the speaker (or **R**) to hear it, **Slow** to hear it with the notes further apart, pick an answer (tap, or keys **1 to 9**) and press **Check** (or **Enter**). A green or red strip then slides up with the right answer and the song or sound that goes with it; **Continue** moves on. Score 80% to pass. Colours that carry text are deeper shades than the bright ones on shapes, so text stays readable (4.5:1 or more).

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

### Scale degrees

You hear a key (a short I-IV-V-I in a random one of the twelve keys), a pause, then one note, and name the note by its number in the scale. The two parts are labelled on screen (**1 · The key**, **2 · Name this note**), you answer only about part 2, and you can tap either label to hear that part alone. After you answer, the keyboard lights the note and the home note it is measured from, and the text spells it in the key ("In G major: the note was B, the 3rd.").

| Level | Notes | Help before the note |
| --- | --- | --- |
| 1 | 1, 5 | full I-IV-V-I |
| 2 | adds 3 | full |
| 3 | adds 2 | full |
| 4 | adds 4 | full |
| 5 | all seven notes of the major scale | full |
| 6 | the same seven, high and low on the keyboard | full |
| 7 | the same seven | only the home chord |
| 8 | a minor key: 1, 2, ♭3, 4, 5, ♭6, ♭7 | full, in minor |
| 9 | colour notes in a major key: ♭3, ♯4, ♭6, ♭7 with 1, 3, 5 | only the home chord |
| 10 | all eleven notes, major and minor keys, the whole keyboard | only the home chord |

### 9ths, 6ths and added notes

Chords with extra notes on top of the triad, always in root position; ninths, elevenths and thirteenths sit an octave up, as a pianist plays them.

| Level | Chords |
| --- | --- |
| 1 | major, 6, add9 |
| 2 | major, 6, minor, m6 |
| 3 | maj7, maj9, add9, 6 |
| 4 | minor, m6, m7, m9 |
| 5 | dominant 7th, dominant 9th, maj7, maj9 |
| 6 | maj9, dominant 9th, m9 |
| 7 | 6, m6, add9, maj9, dominant 9th, m9 |
| 8 | m9, m11, dominant 9th, dominant 13th |
| 9 | all eight added-note chords, together and broken |
| 10 | those and five plain chords for comparison, the whole keyboard |

### Keyboard map and note names (a quiz: read and answer, no sound)

A key is lit on the keyboard and you name it, using the pattern of black keys (pairs and trios) to find your place.

| Level | Question |
| --- | --- |
| 1-3 | name a lit white key: C D E, then C to G, then all seven |
| 4 | name a lit black key (every black key has two names) |
| 5-6 | all twelve keys, first in one octave and then anywhere |
| 7 | "what is a half step above or below this white key?" |
| 8 | the same for whole steps |
| 9 | "which C is lit?" (C1 to C8; middle C is C4) |
| 10 | everything, over the whole keyboard |

### Major scale and key signatures (a quiz)

| Level | Question |
| --- | --- |
| 1 | is the step between two notes of the major scale a whole or a half step (three of the steps) |
| 2 | the same for every step of the pattern W W H W W W H |
| 3 | "what is the 5th note of G major?" in C, G and F major |
| 4 | the same in five scales (adds D and B♭ major) |
| 5 | how many sharps or flats does a key have: C, G, D, F |
| 6 | the same for all twelve keys |
| 7 | "which major key has 3 sharps?" |
| 8 | scale notes in any of the twelve keys, correctly spelled (F♯ major has E♯, not F) |
| 9 | "which major scale is lit?" from the keys on the keyboard |
| 10 | everything mixed |

Quiz questions offer a few answers at a time, and never two spellings of the same key at once. After each answer the green or red strip says why ("D major has 2 sharps: F♯ and C♯.").

### Chords on each scale note (a quiz)

Every major key has seven chords, one on each note of its scale, written with Roman numerals: I ii iii IV V vi vii° (major, minor, minor, major, major, minor, diminished). The lesson drills them in all twelve keys, both ways, and after every answer the green or red strip shows the whole key ("A♭ major: A♭ B♭m Cm D♭ E♭ Fm Gdim. The IV chord is D♭ (D♭ F A♭).").

| Level | Question |
| --- | --- |
| 1 | what kind of chord is on the 3rd note: major, minor or diminished |
| 2 | "in F major, what is the iii chord?" in C, G and F |
| 3 | the other way: "which number is the chord Am?" |
| 4-7 | both ways in five keys, then the sharp keys, the flat keys, all twelve |
| 8 | "A♭ is the IV chord of which major key?" |
| 9 | seventh chords: Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7 |
| 10 | everything mixed |

Wrong answers are always the same kind of chord as the right one, and never two spellings of one chord (F♯ and G♭ are one chord).

### Chord spelling and symbols (a quiz)

Spell a chord from its symbol ("Spell Fmaj7": pick F A C E) or name a chord from its notes ("Which chord is E G C?": C/E, with the keys lit). Roots are the twelve key notes (C, D♭, D, E♭ ... B), always spelled by letter, so Cdim is C E♭ G♭ and F♯aug is F♯ A♯ C♯♯. Wrong answers are the same kind of chord, mostly on the same root (Cmaj7 next to C7 and Cm7). After each answer the strip gives the notes and what they are ("Fmaj7 = F A C E: major 3rd, perfect 5th, major 7th above F.").

| Level | Question |
| --- | --- |
| 1 | spell major and minor chords on the white keys |
| 2 | the other way: name the chord from its notes |
| 3 | major and minor on all twelve roots, both ways |
| 4 | add diminished and augmented |
| 5 | maj7 and 7 |
| 6 | add m7 and m7♭5 |
| 7 | 9th chords: maj9, 9, m9 |
| 8 | slash chords with the 3rd in the bass (C/E = E G C) |
| 9 | slash chords with the 5th in the bass too (C/G = G C E) |
| 10 | everything mixed |

### Chord function (ear)

Each question has two parts, labelled on screen: **1 · The key** (its home chord, or a short I-IV-V-I) and, after a pause, **2 · Name this chord**. You only answer about part 2; tap either label to hear that part alone. You say what the chord does: **home** (tonic: I, iii, vi), **away** (subdominant: ii, IV) or **tension** (dominant: V, vii°). After the answer the keyboard lights the chord and the text explains it, including the tritone in dominant chords ("Its B and F form a tritone that pulls toward the home chord (B up to C, F down to E).").

| Level | Chords asked |
| --- | --- |
| 1 | I and V (home or tension) |
| 2-4 | add IV, then vi, then ii |
| 5 | all seven chords of the key |
| 6 | seventh chords (the dominant 7th is the strongest tension) |
| 7 | the chord played higher or lower than the key |
| 8 | a minor key: i, VI, iv, V |
| 9 | less help (only the home chord before the question), triads and sevenths |
| 10 | major and minor keys, triads and sevenths, high and low |

### Common progressions (ear)

Two labelled parts again: **1 · The key**, then **2 · Name this progression**. You hear four (or eight) chords with smooth voicings and a bass note, and name the pattern by its Roman numerals. After the answer the keyboard lights the first chord and the text spells the chords in that key ("I–V–vi–IV in G major: G D Em C. …").

| Level | Patterns |
| --- | --- |
| 1 | I-IV-V-I and I-V-vi-IV |
| 2-3 | add the fifties pattern (I-vi-IV-V), then the turnaround (I-vi-ii-V) |
| 4-5 | add patterns starting on vi (vi-IV-I-V) and on IV (IV-I-V-vi) |
| 6 | add ii-V-I |
| 7 | minor patterns: i-iv-V-i, i-VI-III-VII, i-VII-VI-V |
| 8 | seventh chords |
| 9 | less help, plus the eight-chord canon progression |
| 10 | everything mixed |

### Pentatonic scale (ear)

The pentatonic scale is five notes that almost always sound good over a song: 1 2 3 5 6 in major (C D E G A in C), 1 ♭3 4 5 ♭7 in minor (A C D E G in A minor). Hear the key, then a short tune of three to five pentatonic notes, and say which note of the scale it ends on. After the answer every note of the tune is shown with its number and name ("3 · E, 2 · D, 1 · C"); tap one to hear it alone. Knowing where a line lands is the first step to improvising.

| Level | Question |
| --- | --- |
| 1 | three-note tunes in C major, ending on 1, 3 or 5 |
| 2 | ending on any of the five notes |
| 3 | four-note tunes |
| 4 | five-note tunes that skip notes |
| 5 | any key |
| 6 | less help: only the home chord before the tune |
| 7 | minor pentatonic, in a minor key |
| 8 | minor, less help |
| 9 | the blue note ♭5 (the blues scale) |
| 10 | everything mixed |

### Listening aids

Every ear lesson has two helpers. **Listen first** (next to Start on a level's intro) shows each answer of the level as a card: press play to hear it in a new key, with the keyboard lit and the explanation; nothing is scored or saved. After a **wrong answer**, buttons let you hear *your* answer, the correct one, or both one after the other, in the same key (`sameSetting` in `theory/questions.ts`; a shared test checks every answer of every ear level can be played in the question's key).

### Practise your mistakes

The Home page shows a **Practise your mistakes** card when some answers are wrong more than 20% of the time (asked at least 3 times). Each row is one lesson and its weakest answers; the button starts a 10-question session with only those answers (plus what each is most often mixed up with) on offer, at the highest level you have open that contains them. It saves like any session (answers, speed, streak) but, with fewer than 20 questions, it can never pass or fail a level. Each lesson's own page has the same button. Code: `theory/mistakes.ts`.

### Speed tracking

Each answer's time is measured from the moment the answer part finishes sounding (for ear lessons with a key part, the key is not counted). The **lesson-complete screen** shows the average time per answer and the slowest answers. The **Progress** page shows a Speed column per answer (the median time, so one idle minute does not matter) and flags answers that are clearly slower than your own typical time. This needs the server to send `median_ms` per answer (`progress/stats.py`); an older server just hides the column. Passing a level is still accuracy only.

Levels live in `frontend/src/theory/exercises/`. The pass rule is also in `backend/progress/rules.py`. Intervals and chords keep strict answer lists on the server; every later lesson is accepted by id, so adding a lesson does not need a server update (the first lesson after intervals and chords needed one).

## Today's practice

The **Today** tab is a ~30 minute daily routine: a Hanon-style warm-up pattern, scales, arpeggios, a cadence, an ear-training session, and free time for repertoire and sight reading. Everything uses the **key of the day**, which moves one step round the circle of fifths each day (all 12 keys in 12 days) and can be changed with the picker. Each key also covers its relative minor.

Each row shows what to play as correctly spelled note names (F♯ major has E♯, D♯ minor's V chord has C♯♯), a **Hear it** button with a tempo slider, a timer and a Done box. The keyboard lights up in step with the audio: brass for the right hand, green for the left. The app cannot hear you, so it is a guide and a log, not a judge, and it shows no fingering numbers because those depend on the key and your hands.

Rows are saved on your device and, when a server is set up, uploaded to it (`/api/practice/`, kept per day and row; the most time and "done" always win, so two devices never undo each other). A day with only routine practice still counts toward your streak. Routine material lives in `frontend/src/theory/practice.ts` and note spelling in `frontend/src/theory/spelling.ts`.

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

## Building the rest of the map

The remaining lessons are added in small batches, ear lessons toward pop and R&B first:

1. Scale degrees, 9ths/6ths/added notes, keyboard map and note names, major scale and key signatures, chords on each scale note, chord function, common progressions, speed tracking (done)
2. Pentatonic scale, chord spelling and symbols (including 9ths and slash chords)
3. Cadences, inversions and slash chords by ear
4. Then the rest, chosen for what you are missing: chord tones for improvising, modes, minor scales, key changes, naming a note by ear, finding a song's chords by ear, the staff, note values, circle of fifths, rhythm, melody and improvisation by ear, the other playing lessons, and the jazz-flavoured lessons last

Every lesson ships with property tests that check the notes by arithmetic (the question really plays what the answer says) and a browser run that checks one sound plays at a time.
