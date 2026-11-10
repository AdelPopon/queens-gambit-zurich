// QGZ Kids School Pricing Calculator: checks js/kids-schools.js against the
// tables in "QGZ Kids – Pricing Model for Schools" (10 Nov 2026).
//   node tools/test_school_pricing.js
"use strict";
const P = require("../js/kids-schools.js");
let fails = 0, checks = 0;
const round2 = (x) => Math.round(x * 100) / 100;
function eq(label, got, want) {
  checks++;
  if (got !== want) { fails++; console.log(`FAIL ${label}: got ${got}, expected ${want}`); }
}

// Section 3 (price table) and section 5 (group thresholds):
// children, groups, price per child, group fee, price per week, avg per child (rounded)
const table = [
  [10, 2, 15.00, 100, 250.00, 25.00], [11, 2, 14.9375, 100, 264.31, 24.03],
  [20, 2, 14.375, 100, 387.50, 19.38], [21, 3, 14.3125, 150, 450.56, 21.46],
  [30, 3, 13.75, 150, 562.50, 18.75], [31, 4, 13.6875, 200, 624.31, 20.14],
  [40, 4, 13.125, 200, 725.00, 18.13], [50, 5, 12.50, 250, 875.00, 17.50],
  [51, 6, 12.45, 300, 934.95, 18.33], [60, 6, 12.00, 300, 1020.00, 17.00],
  [70, 7, 11.50, 350, 1155.00, 16.50], [80, 8, 11.00, 400, 1280.00, 16.00],
  [90, 9, 10.50, 450, 1395.00, 15.50], [100, 10, 10.00, 500, 1500.00, 15.00],
];
for (const [n, g, pc, gf, wk, avg] of table) {
  const r = P.calculate(n, 1);
  eq(`${n} groups`, r.groups, g);
  eq(`${n} price per child`, r.pricePerChild, pc);
  eq(`${n} group fee`, r.groupFees, gf);
  eq(`${n} price per week`, round2(r.weekly), wk);
  eq(`${n} avg per child per week`, round2(r.weekly / n), avg);
}

// Section 4: 50 children, 10–13 teaching weeks
for (const [w, total, per] of [[10, 8750, 175], [11, 9625, 192.5], [12, 10500, 210], [13, 11375, 227.5]]) {
  const r = P.calculate(50, w);
  eq(`50×${w} total`, round2(r.total), total);
  eq(`50×${w} per child`, round2(r.totalPerChild), per);
}

// Every enrolment 10–100: groups of 5–10 children, at least two groups, the
// weekly price rises with every additional child, and P(N) continuous at 50
let prev = 0;
for (let n = 10; n <= 100; n++) {
  const r = P.calculate(n, 12);
  checks++;
  if (r.groups < 2 || n / r.groups < 5 || n / r.groups > 10) { fails++; console.log(`FAIL ${n}: ${r.groups} groups`); }
  checks++;
  if (r.weekly <= prev) { fails++; console.log(`FAIL ${n}: weekly price does not rise`); }
  prev = r.weekly;
  eq(`${n} total = weekly × weeks`, Math.round(r.total * 1e4), Math.round(r.weekly * 1e4) * 12);
}

// Display format
eq("chf 1020", P.chf(1020), "CHF\u00A01’020.00");
eq("chf 14.9375", P.chf(14.9375, 4), "CHF\u00A014.9375");
eq("chf 14.375", P.chf(14.375, 4), "CHF\u00A014.375");
eq("chf 12.5", P.chf(12.5, 4), "CHF\u00A012.50");
eq("chf 264.3125", P.chf(264.3125), "CHF\u00A0264.31");
eq("chf 18000", P.chf(18000), "CHF\u00A018’000.00");

console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
