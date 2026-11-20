/* QGZ Chess Puzzles: interactive board (no chess rules in here).
   new QGZBoard(el, {onSquare, onDrop, canDrag, label})
   - onSquare(sq): a square was tapped/clicked or chosen with the keyboard
   - onDrop(from, to): a piece was dragged from one square to another
   - canDrag(sq): may the piece on sq be dragged?
   Methods: setFen, setOrientation, mark(sq, cls), clearMarks(cls), flash(sq, cls) */
(function (root) {
  "use strict";
  var FILES = "abcdefgh";
  var NAMES = {
    en: { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king", w: "white", b_: "black", empty: "empty" },
    de: { p: "Bauer", n: "Springer", b: "Läufer", r: "Turm", q: "Dame", k: "König", w: "weiss", b_: "schwarz", empty: "leer" }
  };

  function parseFen(fen) {
    var rows = fen.split(" ")[0].split("/"), map = {};
    rows.forEach(function (row, r) {
      var f = 0;
      row.split("").forEach(function (ch) {
        if (/\d/.test(ch)) { f += +ch; return; }
        var color = ch === ch.toUpperCase() ? "w" : "b";
        map[FILES[f] + (8 - r)] = color + ch.toUpperCase();
        f += 1;
      });
    });
    return map;
  }

  function Board(el, opts) {
    this.el = el;
    this.opts = opts || {};
    this.lang = this.opts.lang || "en";
    this.orientation = "w";
    this.pieces = {};
    this.focus = "e4";
    this.el.classList.add("qb");
    this.el.setAttribute("role", "grid");
    this.el.setAttribute("aria-label", this.opts.label || "Chessboard");
    this.build();
    this.bindPointer();
    this.bindKeys();
  }

  Board.prototype.squares = function () {
    var out = [];
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var rank = this.orientation === "w" ? 8 - r : r + 1;
      var file = this.orientation === "w" ? FILES[f] : FILES[7 - f];
      out.push(file + rank);
    }
    return out;
  };

  Board.prototype.build = function () {
    var self = this;
    this.el.innerHTML = "";
    this.cells = {};
    var sqs = this.squares();
    for (var r = 0; r < 8; r++) {
      var row = document.createElement("div");
      row.className = "qb__row";
      row.setAttribute("role", "row");
      for (var f = 0; f < 8; f++) {
        var sq = sqs[r * 8 + f];
        var b = document.createElement("button");
        b.type = "button";
        b.className = "qb__sq " + ((FILES.indexOf(sq[0]) + +sq[1]) % 2 ? "qb__sq--light" : "qb__sq--dark");
        b.setAttribute("role", "gridcell");
        b.dataset.sq = sq;
        b.tabIndex = sq === this.focus ? 0 : -1;
        if (f === 0) b.insertAdjacentHTML("beforeend", '<span class="qb__coord qb__coord--rank" aria-hidden="true">' + sq[1] + "</span>");
        if (r === 7) b.insertAdjacentHTML("beforeend", '<span class="qb__coord qb__coord--file" aria-hidden="true">' + sq[0] + "</span>");
        row.appendChild(b);
        self.cells[sq] = b;
      }
      this.el.appendChild(row);
    }
    this.render();
  };

  Board.prototype.setFen = function (fen) { this.pieces = parseFen(fen); this.render(); };
  Board.prototype.setPieces = function (map) { this.pieces = map; this.render(); };
  Board.prototype.setOrientation = function (c) {
    if (c === this.orientation) return;
    this.orientation = c;
    this.build();
  };

  Board.prototype.render = function () {
    var N = NAMES[this.lang] || NAMES.en, self = this;
    Object.keys(this.cells).forEach(function (sq) {
      var cell = self.cells[sq], pc = self.pieces[sq];
      var img = cell.querySelector(".qb__pc");
      if (pc) {
        if (!img) { img = document.createElement("img"); img.className = "qb__pc"; img.alt = ""; img.draggable = false; cell.appendChild(img); }
        img.src = root.QGZ_PIECES[pc];
        img.dataset.pc = pc;
      } else if (img) img.remove();
      var name = pc ? (pc[0] === "w" ? N.w : N.b_) + " " + N[pc[1].toLowerCase()] : N.empty;
      cell.setAttribute("aria-label", sq + ", " + name);
    });
  };

  Board.prototype.mark = function (sq, cls) { if (this.cells[sq]) this.cells[sq].classList.add(cls); };
  Board.prototype.unmark = function (sq, cls) { if (this.cells[sq]) this.cells[sq].classList.remove(cls); };
  Board.prototype.clearMarks = function (cls) {
    var self = this;
    (cls ? cls.split(" ") : ["is-sel", "is-dot", "is-cap", "is-ok", "is-bad", "is-hint", "is-last", "is-found", "is-check"]).forEach(function (c) {
      Object.keys(self.cells).forEach(function (sq) { self.cells[sq].classList.remove(c); });
    });
  };
  Board.prototype.flash = function (sq, cls, ms) {
    var cell = this.cells[sq];
    if (!cell) return;
    cell.classList.remove(cls); void cell.offsetWidth; cell.classList.add(cls);
    setTimeout(function () { cell.classList.remove(cls); }, ms || 700);
  };

  /* ---------- Pointer: tap or drag ---------- */
  Board.prototype.bindPointer = function () {
    var self = this, drag = null;
    function sqAt(x, y) {
      var t = document.elementFromPoint(x, y);
      var cell = t && t.closest && t.closest(".qb__sq");
      return cell && self.el.contains(cell) ? cell.dataset.sq : null;
    }
    this.el.addEventListener("pointerdown", function (e) {
      var cell = e.target.closest(".qb__sq");
      if (!cell || e.button > 0) return;
      var sq = cell.dataset.sq;
      drag = { from: sq, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
      if (self.pieces[sq] && self.opts.canDrag && self.opts.canDrag(sq)) {
        drag.canDrag = true;
        e.preventDefault();      // no text selection / page scroll while dragging a piece
        cell.setPointerCapture && cell.setPointerCapture(e.pointerId);
      }
    });
    this.el.addEventListener("pointermove", function (e) {
      if (!drag || !drag.canDrag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        var cell = self.cells[drag.from], size = cell.getBoundingClientRect().width;
        drag.ghost = document.createElement("img");
        drag.ghost.className = "qb__ghost";
        drag.ghost.src = root.QGZ_PIECES[self.pieces[drag.from]];
        drag.ghost.style.width = drag.ghost.style.height = size + "px";
        document.body.appendChild(drag.ghost);
        cell.classList.add("is-lifted");
        if (self.opts.onDragStart) self.opts.onDragStart(drag.from);
      }
      var w = drag.ghost.offsetWidth;
      drag.ghost.style.transform = "translate(" + (e.clientX - w / 2) + "px," + (e.clientY - w / 2) + "px)";
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (d.moved) {
        d.ghost.remove();
        self.cells[d.from].classList.remove("is-lifted");
        var to = e.type === "pointercancel" ? null : sqAt(e.clientX, e.clientY);
        if (to && to !== d.from && self.opts.onDrop) self.opts.onDrop(d.from, to);
        else if (self.opts.onDragCancel) self.opts.onDragCancel(d.from);
      } else if (e.type !== "pointercancel") {
        var sq = sqAt(e.clientX, e.clientY) || d.from;
        self.setFocus(sq);
        if (self.opts.onSquare) self.opts.onSquare(sq);
      }
    }
    this.el.addEventListener("pointerup", end);
    this.el.addEventListener("pointercancel", end);
    // Keyboard "click" (Enter/Space on a focused square) arrives as click with detail 0
    this.el.addEventListener("click", function (e) {
      var cell = e.target.closest(".qb__sq");
      if (cell && e.detail === 0 && self.opts.onSquare) self.opts.onSquare(cell.dataset.sq);
    });
  };

  /* ---------- Keyboard: arrow keys move between squares ---------- */
  Board.prototype.setFocus = function (sq, move) {
    if (!this.cells[sq]) return;
    if (this.cells[this.focus]) this.cells[this.focus].tabIndex = -1;
    this.focus = sq;
    this.cells[sq].tabIndex = 0;
    if (move) this.cells[sq].focus();
  };
  Board.prototype.bindKeys = function () {
    var self = this;
    this.el.addEventListener("keydown", function (e) {
      var d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      if (self.orientation === "b") d = [-d[0], -d[1]];
      var f = FILES.indexOf(self.focus[0]) + d[0], r = +self.focus[1] + d[1];
      if (f < 0 || f > 7 || r < 1 || r > 8) return;
      self.setFocus(FILES[f] + r, true);
    });
  };

  root.QGZBoard = Board;
  root.QGZBoard.parseFen = parseFen;
})(window);
