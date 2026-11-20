/* QGZ Chess Puzzles: public page (/en/puzzles/, /aufgaben/).
   Loads data/puzzles.json and uses js/puzzles/engine.js + board.js.
   ?p=<puzzle id> opens one exercise directly (handy in lessons).
   Nothing is stored in the browser. */
(function () {
  "use strict";
  var app = document.querySelector("[data-pz-app]");
  if (!app || !window.QGZPuzzle || !window.QGZBoard) return;
  var LANG = document.documentElement.lang === "de" ? "de" : "en";
  var E = window.QGZPuzzle;

  var T = {
    en: {
      categories: "Categories", level: "Level", all: "All",
      levelNames: ["Easy", "Medium", "Hard"],
      white: "White to move", black: "Black to move",
      hint: "Hint", reset: "Start again", next: "Next puzzle",
      of: "{i} of {n}",
      right: ["Well done!", "Correct!", "Great move!"], solved: "Solved!",
      wrong: "Not quite. Try again.", illegal: "That piece cannot move there.",
      left: "Good! {n} more to find.", leftOne: "Good! 1 more to find.",
      wrongSquare: "Not this one. Try again.",
      reply: "Black answers. Your turn!", replyW: "White answers. Your turn!",
      noHint: "Look carefully at all the pieces.",
      none: "No puzzles at this level yet.",
      loadError: "The puzzles could not be loaded. Please reload the page.",
      board: "Chessboard"
    },
    de: {
      categories: "Kategorien", level: "Stufe", all: "Alle",
      levelNames: ["Leicht", "Mittel", "Schwer"],
      white: "Weiss am Zug", black: "Schwarz am Zug",
      hint: "Tipp", reset: "Neu starten", next: "Nächste Aufgabe",
      of: "{i} von {n}",
      right: ["Gut gemacht!", "Richtig!", "Toller Zug!"], solved: "Gelöst!",
      wrong: "Nicht ganz. Versuche es nochmals.", illegal: "Diese Figur kann nicht dorthin ziehen.",
      left: "Gut! Noch {n} Felder.", leftOne: "Gut! Noch 1 Feld.",
      wrongSquare: "Dieses nicht. Versuche es nochmals.",
      reply: "Schwarz antwortet. Du bist dran!", replyW: "Weiss antwortet. Du bist dran!",
      noHint: "Schau dir alle Figuren genau an.",
      none: "Auf dieser Stufe gibt es noch keine Aufgaben.",
      loadError: "Die Aufgaben konnten nicht geladen werden. Bitte lade die Seite neu.",
      board: "Schachbrett"
    }
  }[LANG];
  function L(obj) { return obj ? (obj[LANG] || obj.en || "") : ""; }
  function stars(n) { return "★★★".slice(0, n); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- Layout ---------- */
  app.innerHTML =
    '<div class="pz-filters">' +
      '<div class="pz-cats" role="group" data-pz-cats></div>' +
      '<div class="pz-levels" role="group" data-pz-levels></div>' +
    '</div>' +
    '<div class="pz-main">' +
      '<div class="pz-board-wrap"><div data-pz-board></div></div>' +
      '<div class="pz-panel">' +
        '<p class="pz-meta" data-pz-meta></p>' +
        '<p class="eyebrow pz-goal" data-pz-goal></p>' +
        '<h2 class="pz-task" data-pz-task tabindex="-1"></h2>' +
        '<p class="pz-turn" data-pz-turn hidden></p>' +
        '<div class="pz-options" data-pz-options hidden></div>' +
        '<p class="pz-feedback" data-pz-feedback role="status" aria-live="polite"></p>' +
        '<p class="pz-explain" data-pz-explain hidden></p>' +
        '<div class="pz-actions">' +
          '<button class="btn btn--ghost" type="button" data-pz-hint></button>' +
          '<button class="btn btn--ghost" type="button" data-pz-reset></button>' +
          '<button class="btn btn--primary" type="button" data-pz-next></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  var $ = function (s) { return app.querySelector(s); };
  var ui = {
    cats: $("[data-pz-cats]"), levels: $("[data-pz-levels]"), meta: $("[data-pz-meta]"),
    goal: $("[data-pz-goal]"), task: $("[data-pz-task]"), turn: $("[data-pz-turn]"),
    options: $("[data-pz-options]"), feedback: $("[data-pz-feedback]"), explain: $("[data-pz-explain]"),
    hint: $("[data-pz-hint]"), reset: $("[data-pz-reset]"), next: $("[data-pz-next]")
  };
  ui.cats.setAttribute("aria-label", T.categories);
  ui.levels.setAttribute("aria-label", T.level);
  ui.hint.textContent = T.hint; ui.reset.textContent = T.reset; ui.next.textContent = T.next + " →";

  var col, list = [], idx = 0, state, selected = null, cat = null, level = 0, busy = false;

  var board = new window.QGZBoard($("[data-pz-board]"), {
    lang: LANG, label: T.board,
    onSquare: onSquare,
    onDrop: function (from, to) { attempt(from, to); },
    canDrag: function (sq) { return E.targets(state, sq).length > 0 && !busy; },
    onDragStart: function (sq) { select(sq); },
    onDragCancel: function () {}
  });

  /* ---------- Data ---------- */
  fetch("/data/puzzles.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      col = data;
      var wanted = new URLSearchParams(location.search).get("p");
      var start = col.puzzles.filter(function (p) { return p.id === wanted; })[0];
      cat = start ? start.category : col.categories[0].id;
      buildFilters();
      setList(start ? start.id : null);
      // Lesson link (?p=…): bring the board into view
      if (start) setTimeout(function () { app.querySelector(".pz-main").scrollIntoView({ block: "start" }); }, 50);
    })
    .catch(function () { app.innerHTML = '<p class="pz-empty">' + T.loadError + "</p>"; });

  function buildFilters() {
    ui.cats.innerHTML = "";
    col.categories.forEach(function (c) {
      var n = col.puzzles.filter(function (p) { return p.category === c.id; }).length;
      if (!n) return;
      var b = h("button", "pz-chip");
      b.type = "button"; b.dataset.cat = c.id; b.title = L(c.description);
      b.appendChild(document.createTextNode(L(c.title)));
      b.appendChild(h("span", "pz-chip__n", String(n)));
      b.addEventListener("click", function () { cat = c.id; setList(); });
      ui.cats.appendChild(b);
    });
    ui.levels.innerHTML = "";
    ui.levels.appendChild(h("span", "pz-levels__label", T.level));
    [0, 1, 2, 3].forEach(function (lv) {
      var b = h("button", "pz-chip pz-level");
      b.type = "button"; b.dataset.level = lv;
      if (lv) {
        b.setAttribute("aria-label", T.levelNames[lv - 1]);
        b.title = T.levelNames[lv - 1];
        b.appendChild(h("span", "pz-stars", stars(lv)));
      } else b.textContent = T.all;
      b.addEventListener("click", function () { level = lv; setList(); });
      ui.levels.appendChild(b);
    });
  }

  function setList(startId) {
    list = col.puzzles.filter(function (p) { return p.category === cat && (!level || p.level === level); })
      .sort(function (a, b) { return a.level - b.level; });   // stable: file order within a level
    [].forEach.call(ui.cats.children, function (b) { b.setAttribute("aria-pressed", b.dataset.cat === cat ? "true" : "false"); });
    [].forEach.call(ui.levels.querySelectorAll("[data-level]"), function (b) { b.setAttribute("aria-pressed", +b.dataset.level === level ? "true" : "false"); });
    idx = Math.max(0, list.map(function (p) { return p.id; }).indexOf(startId));
    if (!list.length) { showEmpty(); return; }
    load(list[idx]);
  }

  function showEmpty() {
    state = null;
    ui.meta.textContent = ""; ui.goal.textContent = ""; ui.task.textContent = T.none;
    ui.turn.hidden = ui.options.hidden = ui.explain.hidden = true;
    ui.feedback.textContent = "";
    ui.hint.disabled = ui.reset.disabled = ui.next.disabled = true;
    board.setFen("8/8/8/8/8/8/8/8 w - - 0 1"); board.clearMarks();
  }

  /* ---------- One puzzle ---------- */
  function load(p) {
    state = E.start(p);
    selected = null; busy = false;
    var turn = p.fen.split(" ")[1];
    board.setOrientation(p.orientation || (p.type === "choice" ? "w" : turn));
    board.setFen(p.fen);
    board.clearMarks();
    var c = col.categories.filter(function (x) { return x.id === p.category; })[0];
    ui.meta.innerHTML = "";
    ui.meta.appendChild(h("span", null, L(c && c.title)));
    var st = h("span", "pz-stars", stars(p.level)); st.setAttribute("aria-label", T.levelNames[p.level - 1]); st.title = T.levelNames[p.level - 1];
    ui.meta.appendChild(st);
    ui.meta.appendChild(h("span", null, T.of.replace("{i}", idx + 1).replace("{n}", list.length)));
    ui.goal.textContent = L(p.goal);
    ui.task.textContent = L(p.task);
    ui.turn.hidden = p.type !== "moves";
    if (p.type === "moves") {
      ui.turn.innerHTML = "";
      var img = h("img"); img.alt = ""; img.src = window.QGZ_PIECES[turn === "w" ? "wK" : "bK"];
      ui.turn.appendChild(img);
      ui.turn.appendChild(document.createTextNode(turn === "w" ? T.white : T.black));
    }
    ui.options.hidden = p.type !== "choice";
    ui.options.innerHTML = "";
    (p.options || []).forEach(function (o) {
      var b = h("button", "btn btn--ghost pz-option", L(o.label));
      b.type = "button"; b.dataset.id = o.id;
      b.addEventListener("click", function () { choose(o.id, b); });
      ui.options.appendChild(b);
    });
    ui.feedback.textContent = ""; ui.feedback.className = "pz-feedback";
    ui.explain.hidden = true;
    ui.hint.disabled = ui.reset.disabled = false;
    ui.next.disabled = false;
    ui.next.classList.toggle("btn--primary", false);
    ui.next.classList.toggle("btn--ghost", true);
    syncUrl(p.id);
  }

  function say(text, kind) {
    ui.feedback.textContent = text;
    ui.feedback.className = "pz-feedback" + (kind ? " is-" + kind : "");
  }

  function solved() {
    say(pick(T.right) + " " + T.solved, "ok");
    var ex = L(state.puzzle.explanation);
    ui.explain.textContent = ex;
    ui.explain.hidden = !ex;
    ui.hint.disabled = true;
    ui.next.classList.add("btn--primary"); ui.next.classList.remove("btn--ghost");
    selected = null;
  }

  /* ---------- Moves ---------- */
  function select(sq) {
    board.clearMarks("is-sel is-dot is-cap");
    selected = sq;
    board.mark(sq, "is-sel");
    E.targets(state, sq).forEach(function (t) { board.mark(t, board.pieces[t] ? "is-cap" : "is-dot"); });
  }

  function onSquare(sq) {
    if (!state || state.done || busy) return;
    var p = state.puzzle;
    if (p.type === "squares") return tapSquare(sq);
    if (p.type !== "moves") return;
    if (selected && selected !== sq && E.targets(state, selected).indexOf(sq) > -1) return attempt(selected, sq);
    if (E.targets(state, sq).length) return select(sq);
    if (selected) {
      // tapped a square the piece cannot reach
      board.clearMarks("is-sel is-dot is-cap"); board.flash(sq, "is-bad", 500);
      selected = null; say(T.illegal, "bad");
    }
  }

  function attempt(from, to) {
    board.clearMarks("is-sel is-dot is-cap is-hint");
    selected = null;
    var r = E.tryMove(state, from, to);
    if (!r.ok) {
      board.flash(to, "is-bad", 650);
      say(r.reason === "illegal" ? T.illegal : T.wrong, "bad");
      return;
    }
    board.setFen(E.fen(state));
    board.clearMarks("is-last is-ok");
    if (r.reply) {
      // show the player's move first, then the answer
      board.setFen(stepBack(r.reply));
      board.mark(r.played.from, "is-last"); board.mark(r.played.to, "is-ok");
      say(pick(T.right), "ok");
      busy = true;
      setTimeout(function () {
        board.setFen(E.fen(state));
        board.clearMarks("is-last is-ok");
        board.mark(r.reply.from, "is-last"); board.mark(r.reply.to, "is-last");
        busy = false;
        if (r.done) solved(); else say(r.reply.color === "b" ? T.reply : T.replyW, "");
      }, 650);
      return;
    }
    board.mark(r.played.from, "is-last"); board.mark(r.played.to, "is-ok");
    if (r.done) solved(); else say(pick(T.right), "ok");
  }

  // Position before the opponent's reply (to show the moves one after the other)
  function stepBack() {
    var tmp = E.load(state.puzzle.fen, state.rules);
    state.history.slice(0, -1).forEach(function (u) {
      tmp.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || "q" });
    });
    return tmp.fen();
  }

  /* ---------- Squares ---------- */
  function tapSquare(sq) {
    var r = E.trySquare(state, sq);
    if (r.already) return;
    if (!r.correct) { board.flash(sq, "is-bad", 600); say(T.wrongSquare, "bad"); return; }
    board.unmark(sq, "is-hint");
    board.mark(sq, "is-found");
    if (r.done) solved();
    else say(r.left === 1 ? T.leftOne : T.left.replace("{n}", r.left), "ok");
  }

  /* ---------- Choice ---------- */
  function choose(id, btn) {
    if (!state || state.done) return;
    var r = E.tryChoice(state, id);
    if (r.correct) {
      btn.classList.add("is-right");
      [].forEach.call(ui.options.children, function (b) { b.disabled = true; });
      solved();
    } else {
      btn.classList.remove("is-wrong"); void btn.offsetWidth; btn.classList.add("is-wrong");
      say(T.wrong, "bad");
    }
  }

  /* ---------- Buttons ---------- */
  ui.hint.addEventListener("click", function () {
    if (!state || state.done) return;
    var r = E.hint(state);
    board.clearMarks("is-hint");
    r.squares.forEach(function (q) { board.mark(q, "is-hint"); });
    say(r.text ? L(r.text) : T.noHint, "hint");
  });
  ui.reset.addEventListener("click", function () { if (list[idx]) load(list[idx]); });
  ui.next.addEventListener("click", function () {
    if (!list.length) return;
    if (idx < list.length - 1) { idx += 1; load(list[idx]); }
    else {
      // end of the category: continue with the next category
      var ids = col.categories.map(function (c) { return c.id; });
      var nextCat = ids[(ids.indexOf(cat) + 1) % ids.length];
      cat = nextCat; level = 0; setList();
    }
    ui.task.focus({ preventScroll: true });
    var main = app.querySelector(".pz-main");
    if (main.getBoundingClientRect().top < 0) main.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* Keep ?p= in the address and in the language switch, so a lesson link
     or a language change opens the same exercise. */
  function syncUrl(id) {
    var url = location.pathname + "?p=" + encodeURIComponent(id);
    if (history.replaceState) history.replaceState(null, "", url);
    document.querySelectorAll("[data-lang-link]").forEach(function (a) {
      if (a.getAttribute("aria-current") === "page") return;
      a.setAttribute("href", a.getAttribute("href").split(/[?#]/)[0] + "?p=" + encodeURIComponent(id));
    });
  }
})();
