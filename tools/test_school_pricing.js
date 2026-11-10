// QGZ Kids School Pricing Calculator: checks js/kids-schools.js against the
// tables in "QGZ Kids – Pricing Model for Schools" (10 Nov 2026) and the
// approved rounding (payable total to CHF 0.05, other amounts to the centime).
//   node tools/test_school_pricing.js
"use strict";
const P = require("../js/kids-schools.js");
let fails = 0, checks = 0;
const c = (francs) => Math.round(francs * 100);          // francs -> centimes (test values)
function eq(label, got, want) {
  checks++;
  if (got !== want) { fails++; console.log(`FAIL ${label}: got ${got}, expected ${want}`); }
}

// 1. PDF sections 3 and 5 (exact model values, unrounded):
//    children, groups, price per child, group fee, price per week
const table = [
  [10, 2, 15.00, 100, 250.00], [11, 2, 14.9375, 100, 264.3125],
  [20, 2, 14.375, 100, 387.50], [21, 3, 14.3125, 150, 450.5625],
  [30, 3, 13.75, 150, 562.50], [31, 4, 13.6875, 200, 624.3125],
  [40, 4, 13.125, 200, 725.00], [50, 5, 12.50, 250, 875.00],
  [51, 6, 12.45, 300, 934.95], [60, 6, 12.00, 300, 1020.00],
  [70, 7, 11.50, 350, 1155.00], [80, 8, 11.00, 400, 1280.00],
  [90, 9, 10.50, 450, 1395.00], [100, 10, 10.00, 500, 1500.00],
];
for (const [n, g, pc, gf, wk] of table) {
  const r = P.calculate(n, 1);
  eq(`${n} groups`, r.groups, g);
  eq(`${n} exact price per child`, r.exact.pricePerChild, pc);
  eq(`${n} group fee`, r.groupFees, c(gf));
  eq(`${n} exact price per week`, r.exact.weekly, wk);
}

// 2. PDF section 4: 50 children, 10–13 teaching weeks
for (const [w, total, per] of [[10, 8750, 175], [11, 9625, 192.5], [12, 10500, 210], [13, 11375, 227.5]]) {
  const r = P.calculate(50, w);
  eq(`50×${w} total`, r.total, c(total));
  eq(`50×${w} per child`, r.totalPerChild, c(per));
}

// 3. Displayed values (two decimals) at the thresholds, 12 weeks
//    children, price per child, per week, payable total, per child
const shown = [
  [10, 15.00, 250.00, 3000.00, 300.00],
  [20, 14.38, 387.50, 4650.00, 232.50], [21, 14.31, 450.56, 5406.75, 257.46],
  [30, 13.75, 562.50, 6750.00, 225.00], [31, 13.69, 624.31, 7491.75, 241.67],
  [50, 12.50, 875.00, 10500.00, 210.00], [51, 12.45, 934.95, 11219.40, 219.99],
  [100, 10.00, 1500.00, 18000.00, 180.00],
];
for (const [n, pc, wk, tot, per] of shown) {
  const r = P.calculate(n, 12);
  eq(`${n} shown price per child`, r.pricePerChild, c(pc));
  eq(`${n} shown per week`, r.weekly, c(wk));
  eq(`${n}×12 payable`, r.total, c(tot));
  eq(`${n}×12 per child`, r.totalPerChild, c(per));
}

// 4. CHF 0.05 rounding (exact total -> payable)
const rounding = [
  [11, 1, 264.3125, 264.30],   // .3125 down
  [21, 1, 450.5625, 450.55],   // .5625 down
  [31, 1, 624.3125, 624.30],
  [13, 1, 292.5625, 292.55],
  [13, 3, 877.6875, 877.70],   // .6875 up
  [11, 3, 792.9375, 792.95],   // .9375 up
  [13, 2, 585.125, 585.15],    // .125: exactly halfway, rounds up
  [11, 2, 528.625, 528.65],    // .625: exactly halfway, rounds up
  [11, 12, 3171.75, 3171.75],  // already a multiple of 0.05
  [51, 1, 934.95, 934.95],
];
for (const [n, w, exact, payable] of rounding) {
  const r = P.calculate(n, w);
  eq(`${n}×${w} exact total`, r.exact.total, exact);
  eq(`${n}×${w} payable (0.05)`, r.total, c(payable));
}

// 5. All enrolments and week counts: groups of 5–10 with at least two groups,
//    weekly price rises with every child, payable is a multiple of 5 Rappen
//    within 2.5 Rappen of the exact total, and per child = payable ÷ children.
let prev = 0;
for (let n = 10; n <= 100; n++) {
  const r1 = P.calculate(n, 1);
  checks++;
  if (r1.groups < 2 || n / r1.groups < 5 || n / r1.groups > 10) { fails++; console.log(`FAIL ${n}: ${r1.groups} groups`); }
  checks++;
  if (r1.exact.weekly <= prev) { fails++; console.log(`FAIL ${n}: weekly price does not rise`); }
  prev = r1.exact.weekly;
  for (let w = 1; w <= 52; w++) {
    const r = P.calculate(n, w);
    checks++;
    const diff = Math.abs(r.total - r.exact.total * 100);
    if (r.total % 5 !== 0 || diff > 2.5 + 1e-9 || Math.abs(r.totalPerChild - r.total / n) > 0.5 + 1e-9) {
      fails++; console.log(`FAIL ${n}×${w}: payable ${r.total}, exact ${r.exact.total}, per child ${r.totalPerChild}`);
    }
  }
}

// 6. Display format
eq("chf 1020", P.chf(102000), "CHF 1’020.00");
eq("chf 14.38", P.chf(1438), "CHF 14.38");
eq("chf 0.05", P.chf(5), "CHF 0.05");
eq("chf 18000", P.chf(1800000), "CHF 18’000.00");

console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
