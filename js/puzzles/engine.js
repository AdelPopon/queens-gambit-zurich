/* QGZ Chess Puzzles: shared puzzle logic.
   Used by the public puzzle page, the offline editor (tools/puzzle-editor.html)
   and the build check (tools/validate_puzzles.js). Needs window.Chess
   (js/vendor/chess.js). No DOM code here.

   Exercise types (see PUZZLES.md for the full data format):
   - "moves":   play the correct move or sequence. Lines are lists of UCI
                moves (e2e4, e7e8q), player and opponent alternating; "*" as an
                opponent move means "any legal reply".
   - "squares": tap squares on the board (all squares a piece can reach, or
                the one correct square).
   - "choice":  answer a question about the position (e.g. "Is this check?").
   rules: "legal" = normal chess (both kings needed), "free" = only how the
   pieces move (no kings needed; for very young beginners). */
(function (root) {
  "use strict";
  var Chess = root.Chess;
  var SQ_RE = /^[a-h][1-8]$/;
  var UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

  function load(fen, rules) {
    var c = new Chess();
    c.load(fen, { skipValidation: rules === "free" });
    return c;
  }
  function uci(m) { return m.from + m.to + (m.promotion || ""); }
  function withTurn(fen, turn) {
    var p = fen.split(" ");
    p[1] = turn;
    p[3] = "-";
    return p.join(" ");
  }
  function hasKings(fen) {
    var board = fen.split(" ")[0];
    return board.indexOf("K") > -1 && board.indexOf("k") > -1;
  }
  function rulesOf(p) { return p.rules || (hasKings(p.fen) ? "legal" : "free"); }

  /* ---------------- Game state ---------------- */
  function start(p) {
    var rules = rulesOf(p);
    var s = {
      puzzle: p, rules: rules, chess: load(p.fen, rules),
      player: p.fen.split(" ")[1] || "w",
      ply: 0, lines: (p.solutions || []).slice(), done: false,
      found: [], wrong: 0, hintLevel: 0, history: []
    };
    return s;
  }

  function fen(s) { return s.chess.fen(); }

  /* Squares the piece on `from` can move to (for dots and for free rules). */
  function targets(s, from) {
    if (s.done || s.puzzle.type !== "moves") return [];
    var piece = s.chess.get(from);
    if (!piece || piece.color !== s.player || s.chess.turn() !== s.player) return [];
    var seen = {};
    return s.chess.moves({ square: from, verbose: true })
      .map(function (m) { return m.to; })
      .filter(function (t) { return seen[t] ? false : (seen[t] = true); });
  }

  function isPromotion(s, from, to) {
    var piece = s.chess.get(from);
    return !!piece && piece.type === "p" && (to[1] === "8" || to[1] === "1");
  }

  function applyMove(s, mv) {
    var m = s.chess.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || "q" });
    if (s.rules === "free" && !s.puzzle.opponent) {
      // free rules: no opponent, the player keeps the move
      s.chess.load(withTurn(s.chess.fen(), s.player), { skipValidation: true });
    }
    return m;
  }

  /* Player move. Returns {ok, done, played, reply, mate} or {ok:false, reason}.
     reason: "illegal" (not a legal move) or "wrong" (legal but not the answer). */
  function tryMove(s, from, to, promo) {
    if (s.done || s.puzzle.type !== "moves") return { ok: false, reason: "illegal" };
    var legal = s.chess.moves({ square: from, verbose: true }).filter(function (m) { return m.to === to; });
    if (!legal.length) return { ok: false, reason: "illegal" };
    if (!promo && legal[0].promotion) {
      // use the promotion piece the solution expects, else a queen
      var want = s.lines.map(function (l) { return l[s.ply]; })
        .filter(function (u) { return u && u.slice(0, 4) === from + to && u.length === 5; })[0];
      promo = want ? want[4] : "q";
    }
    var mv = from + to + (legal[0].promotion ? promo : "");
    var matching = s.lines.filter(function (l) { return l[s.ply] === mv; });
    var last = !matching.length ? false : matching.every(function (l) { return l.length === s.ply + 1; });

    // "Accept any checkmate" on the final move
    if (!matching.length && s.puzzle.anyMate && isFinalPly(s)) {
      var probe = load(s.chess.fen(), s.rules);
      probe.move({ from: from, to: to, promotion: promo || "q" });
      if (probe.isCheckmate()) { matching = []; last = true; s.lines = []; }
      else return { ok: false, reason: "wrong" };
    } else if (!matching.length) {
      return { ok: false, reason: "wrong" };
    } else {
      s.lines = matching;
    }

    var played = applyMove(s, mv);
    s.history.push(mv);
    s.ply += 1;
    var out = { ok: true, played: played, mate: s.chess.isCheckmate() };
    if (last || !s.lines.length || s.lines.every(function (l) { return l.length <= s.ply; })) {
      s.done = true; out.done = true; return out;
    }
    // Opponent reply
    var reply = s.lines[0][s.ply];
    if (reply === "*") reply = pickReply(s);
    var rm = s.chess.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] || "q" });
    var r = uci(rm);
    s.lines = s.lines.filter(function (l) { return l[s.ply] === r || l[s.ply] === "*"; });
    s.history.push(r);
    s.ply += 1;
    out.reply = rm;
    if (!s.lines.length || s.lines.every(function (l) { return l.length <= s.ply; })) { s.done = true; out.done = true; }
    return out;
  }

  function isFinalPly(s) {
    var lens = s.lines.length ? s.lines.map(function (l) { return l.length; }) : [s.ply + 1];
    return s.ply + 1 >= Math.max.apply(null, lens);
  }

  /* "*" reply: a king move or capture first is most natural for teaching. */
  function pickReply(s) {
    var moves = s.chess.moves({ verbose: true });
    var nextPlayer = s.lines.map(function (l) { return l[s.ply + 1]; }).filter(Boolean);
    var ok = moves.filter(function (m) {
      if (!nextPlayer.length) return true;
      var c = load(s.chess.fen(), s.rules); c.move(m);
      return nextPlayer.some(function (u) {
        return c.moves({ verbose: true }).some(function (x) { return uci(x) === u || uci(x) === u + "q"; });
      });
    });
    var pool = ok.length ? ok : moves;
    return uci(pool[Math.floor(Math.random() * pool.length)]);
  }

  /* Square exercises. Returns {correct, done, already}. */
  function trySquare(s, sq) {
    if (s.done || s.puzzle.type !== "squares") return { correct: false };
    var ans = s.puzzle.answer.squares;
    if (s.found.indexOf(sq) > -1) return { correct: true, already: true, done: false };
    if (ans.indexOf(sq) === -1) { s.wrong += 1; return { correct: false }; }
    s.found.push(sq);
    var done = s.puzzle.answer.mode === "one" || s.found.length === ans.length;
    if (done) s.done = true;
    return { correct: true, done: done, left: ans.length - s.found.length };
  }

  function tryChoice(s, id) {
    if (s.done || s.puzzle.type !== "choice") return { correct: false };
    var correct = id === s.puzzle.answer.choice;
    if (correct) s.done = true; else s.wrong += 1;
    return { correct: correct, done: correct };
  }

  /* Next hint: {text (localised object or null), squares[]}. */
  function hint(s) {
    var p = s.puzzle, hints = p.hints || [];
    var h = hints[Math.min(s.hintLevel, Math.max(hints.length - 1, 0))] || {};
    var squares = (h.squares || []).slice();
    if (!squares.length && s.hintLevel >= hints.length - 1) {
      if (p.type === "moves" && s.lines.length && s.lines[0][s.ply]) squares = [s.lines[0][s.ply].slice(0, 2)];
      if (p.type === "squares") squares = p.answer.squares.filter(function (q) { return s.found.indexOf(q) === -1; }).slice(0, 1);
    }
    s.hintLevel += 1;
    return { text: h.text || null, squares: squares, more: s.hintLevel < hints.length };
  }

  /* ---------------- Validation ---------------- */
  var TYPES = { moves: 1, squares: 1, choice: 1 };

  function validate(p, collection) {
    var e = [];
    function err(msg) { e.push((p && p.id ? p.id + ": " : "") + msg); }
    if (!p || typeof p !== "object") return ["not an object"];
    if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id || "")) err("id must use lowercase letters, numbers and hyphens");
    if (!TYPES[p.type]) err("type must be moves, squares or choice");
    if (collection && !(collection.categories || []).some(function (c) { return c.id === p.category; })) err("unknown category " + p.category);
    if ([1, 2, 3].indexOf(p.level) === -1) err("level must be 1, 2 or 3");
    ["task"].forEach(function (k) {
      if (!p[k] || !p[k].en || !p[k].de) err(k + " needs an English and a German text");
    });
    var rules = rulesOf(p);
    if (p.rules && p.rules !== "legal" && p.rules !== "free") err('rules must be "legal" or "free"');
    var c;
    try {
      if (rules === "legal") {
        var v = root.validateFen(p.fen || "");
        if (!v.ok) { err("position: " + v.error); return e; }
      }
      c = load(p.fen, rules);
    } catch (x) { err("position (FEN) is not valid: " + x.message); return e; }
    if (rules === "legal" && c.isGameOver() && p.type === "moves") err("the position is already finished (mate or stalemate)");
    (p.hints || []).forEach(function (h, i) {
      if (h.text && (!h.text.en || !h.text.de)) err("hint " + (i + 1) + " needs English and German");
      (h.squares || []).forEach(function (q) { if (!SQ_RE.test(q)) err("hint " + (i + 1) + ": bad square " + q); });
    });

    if (p.type === "moves") {
      var lines = p.solutions || [];
      if (!lines.length) err("add at least one solution line");
      lines.forEach(function (line, li) {
        var where = "line " + (li + 1);
        var free = rules === "free" && !p.opponent;
        if (!free && line.length % 2 === 0) err(where + " must end with the player's move");
        // Walk the line; "*" branches into every legal reply.
        (function walk(g, i, path) {
          if (e.length) return;
          if (i === line.length) {
            if (p.mate && !g.isCheckmate()) err(where + (path ? " (after " + path + ")" : "") + " does not end in checkmate");
            return;
          }
          var mv = line[i], playerTurn = free || i % 2 === 0;
          if (mv === "*") {
            if (playerTurn) { err(where + ": * is only allowed for the opponent"); return; }
            var replies = g.moves({ verbose: true });
            if (!replies.length) { err(where + ": the opponent has no move after move " + i); return; }
            replies.forEach(function (r) {
              var t = load(g.fen(), rules); t.move(r);
              walk(t, i + 1, (path ? path + " " : "") + uci(r));
            });
            return;
          }
          if (!UCI_RE.test(mv)) { err(where + ": " + mv + " is not a UCI move like e2e4"); return; }
          var t = load(g.fen(), rules);
          try {
            if (!t.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || "q" })) throw new Error("illegal");
          } catch (x) { err(where + ", move " + (i + 1) + ": " + mv + " is not legal" + (path ? " after " + path : "")); return; }
          if (free) t.load(withTurn(t.fen(), g.turn()), { skipValidation: true });
          walk(t, i + 1, path);
        })(load(p.fen, rules), 0, "");
      });
    } else if (p.type === "squares") {
      var a = p.answer || {};
      if (!Array.isArray(a.squares) || !a.squares.length) err("choose at least one answer square");
      (a.squares || []).forEach(function (q) { if (!SQ_RE.test(q)) err("bad answer square " + q); });
      if (a.mode !== "all" && a.mode !== "one") err('answer.mode must be "all" or "one"');
      if (a.mode === "one" && a.squares && a.squares.length !== 1) err('mode "one" needs exactly one answer square');
      if (a.from) {
        // Answer generated from a piece's moves: must match exactly
        var gen = c.moves({ square: a.from, verbose: true }).map(function (m) { return m.to; });
        gen = gen.filter(function (t, i) { return gen.indexOf(t) === i; }).sort();
        if (gen.join() !== (a.squares || []).slice().sort().join()) err("answer squares do not match the moves of the piece on " + a.from + " (" + gen.join(" ") + ")");
      }
    } else if (p.type === "choice") {
      var opts = p.options || [];
      if (opts.length < 2) err("add at least two answer options");
      opts.forEach(function (o, i) { if (!o.id || !o.label || !o.label.en || !o.label.de) err("option " + (i + 1) + " needs an id and English/German labels"); });
      if (!opts.some(function (o) { return p.answer && o.id === p.answer.choice; })) err("mark the correct option");
      if (p.check && rules === "legal") {
        var truth = c.inCheck() ? "yes" : "no";
        if (p.check === "inCheck" && p.answer.choice !== truth) err("answer is wrong: the king is " + (truth === "yes" ? "" : "not ") + "in check");
      }
      if (p.check === "isMate" && rules === "legal") {
        var t2 = c.isCheckmate() ? "yes" : "no";
        if (p.answer.choice !== t2) err("answer is wrong: the position is " + (t2 === "yes" ? "" : "not ") + "checkmate");
      }
    }
    return e;
  }

  function validateCollection(col) {
    var errors = [];
    if (!col || !Array.isArray(col.categories) || !Array.isArray(col.puzzles)) return ["the file must contain categories and puzzles"];
    var ids = {};
    col.categories.forEach(function (c) {
      if (!c.id || !c.title || !c.title.en || !c.title.de) errors.push("category " + (c.id || "?") + " needs an id and English/German titles");
    });
    col.puzzles.forEach(function (p) {
      if (ids[p.id]) errors.push(p.id + ": id used twice");
      ids[p.id] = true;
      errors = errors.concat(validate(p, col));
    });
    return errors;
  }

  root.QGZPuzzle = {
    start: start, fen: fen, targets: targets, isPromotion: isPromotion,
    tryMove: tryMove, trySquare: trySquare, tryChoice: tryChoice, hint: hint,
    validate: validate, validateCollection: validateCollection,
    rulesOf: rulesOf, hasKings: hasKings, load: load, uci: uci
  };
})(typeof window !== "undefined" ? window : globalThis);
