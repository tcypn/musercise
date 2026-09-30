"""Exercises the server accepts, and the rule for passing a level.

Keep in sync with frontend/src/theory/ (exercise item ids and the pass rule).
"""

PASS_ACCURACY = 0.8
MIN_QUESTIONS = 20

EXERCISES = {
    # Item ids are the interval size in semitones.
    "intervals": {
        "items": [str(n) for n in range(1, 13)],
        "modes": ("ascending", "descending", "harmonic"),
    },
    "chords": {
        "items": ["maj", "min", "dim", "aug", "sus2", "sus4", "maj7", "dom7", "min7", "hdim7", "dim7"],
        "modes": ("block", "arpeggio"),
    },
}

# Rows of the daily practice routine (see frontend/src/theory/practice.ts).
PRACTICE_ITEMS = ["warmup", "scale", "arpeggio", "cadence", "ear", "repertoire", "sightreading"]
MAX_PRACTICE_SECONDS = 24 * 60 * 60
