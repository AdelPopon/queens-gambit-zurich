# QGZ Chess Puzzles

Public pages: `/aufgaben/` (German) and `/en/puzzles/` (English).
Exercises: `data/puzzles.json`. Editor: `tools/puzzle-editor.html`.

## How it fits together

| Part | File | Notes |
|---|---|---|
| Exercises | `data/puzzles.json` | Loaded by the page at runtime, so publishing new puzzles needs no build step. |
| Page | `tools/puzzles.html` → built into `aufgaben/` and `en/puzzles/` by `tools/build.py` | Same header, footer and styles as the rest of the site. |
| Board | `js/puzzles/board.js` | Click or drag; keyboard: arrow keys and Enter. |
| Puzzle logic | `js/puzzles/engine.js` | Shared by the page, the editor and the build check. |
| Chess rules | `js/vendor/chess.js` | chess.js 1.4.0 (BSD-2), self-hosted. No engine. |
| Pieces | `js/puzzles/pieces.js` | cburnett set (Colin M.L. Burnett, BSD licence), embedded. |
| Check | `tools/validate_puzzles.js` | Run by `tools/build.py`; also `node tools/validate_puzzles.js file.json`. |

No accounts, cookies, browser storage or external services on the public page.
The editor saves your work in progress in your own browser only.

## Adding or changing puzzles (no code needed)

1. Open `tools/puzzle-editor.html` (double-click the file after downloading it,
   or https://queensgambitzurich.ch/tools/puzzle-editor.html once published).
2. Click **Load from website** to start from the live collection.
3. Create or edit exercises. The box at the bottom says what is missing;
   **Test this exercise** lets you solve it like a child would.
4. Click **Download puzzles.json**.
5. Publish: on GitHub open `data/puzzles.json` in the repository,
   choose **Upload files** (or the pencil, then paste), commit to `main`.
   The page shows the new puzzles about one minute later.
   If you prefer a review step, commit to a new branch and open a pull request.

Before publishing, the editor validates every exercise (legal position, every
solution move legal, mate really is mate, answers match the position).

## Data format

```json
{
  "version": 1,
  "categories": [{ "id": "pieces", "title": {"en": "...", "de": "..."}, "description": {...} }],
  "puzzles": [ { ...exercise... } ]
}
```

Common fields of an exercise:

| Field | Meaning |
|---|---|
| `id` | Unique, lowercase with hyphens. Used in lesson links: `/en/puzzles/?p=knight-fork` |
| `category`, `level` | Category id; 1 = easy, 2 = medium, 3 = hard |
| `type` | `moves`, `squares` or `choice` (below) |
| `fen` | Position. Side to move = the player |
| `rules` | `legal` (normal chess, both kings) or `free` (only how pieces move; no kings needed) |
| `goal` | Learning goal, shown as a small title |
| `task` | Instruction (required, English and German) |
| `hints` | List of `{ "text": {en, de}, "squares": ["d4"] }`; squares are highlighted |
| `explanation` | Shown after solving |

### `moves`: play the right move(s)
```json
"solutions": [["b5c7", "*", "c7a8"]], "mate": false, "anyMate": false
```
UCI moves, player and opponent alternating. `*` = any opponent reply (every reply
is checked). Several lines = several correct answers. `mate: true` requires every
line to end in checkmate; `anyMate: true` accepts any mating last move.

### `squares`: tap squares
```json
"answer": { "mode": "all", "from": "d4", "squares": ["b3", "b5", "c2"] }
```
`all` = find every square, `one` = tap the single correct square (e.g. "which
piece is attacked?"). With `from`, the answer must equal that piece's moves.

### `choice`: answer a question
```json
"options": [{ "id": "yes", "label": {"en": "Yes", "de": "Ja"} }, ...],
"answer": { "choice": "yes" }, "check": "inCheck"
```
`check` (`inCheck` or `isMate`) lets the validator confirm the answer.

## Developer notes
- `python3 tools/build.py` validates the puzzles, rebuilds the pages and bundles
  the editor (`tools/puzzle_editor_src.html` → `tools/puzzle-editor.html`).
- German page texts: `i18n/de.json`; puzzle UI texts: `js/puzzles/app.js`.
