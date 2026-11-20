// Checks data/puzzles.json: positions, solutions (every opponent reply for "*"),
// answers, required texts in English and German. Run: node tools/validate_puzzles.js
// tools/build.py runs it and stops if anything is wrong.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
require(path.join(root, "js/vendor/chess.js"));
require(path.join(root, "js/puzzles/engine.js"));
const file = process.argv[2] || path.join(root, "data/puzzles.json");
let col;
try { col = JSON.parse(fs.readFileSync(file, "utf8")); }
catch (e) { console.error("puzzles.json is not valid JSON: " + e.message); process.exit(1); }
const errors = globalThis.QGZPuzzle.validateCollection(col);
if (errors.length) { console.error("Puzzle errors:\n  - " + errors.join("\n  - ")); process.exit(1); }
console.log(`Puzzles OK: ${col.puzzles.length} exercises in ${col.categories.length} categories`);
