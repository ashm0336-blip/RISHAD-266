/* Test-only clock: `node --import ./tests/support/clock.mjs` with KIVO_TEST_NOW=<ISO instant> starts the process clock at that
   instant and lets it run on from there (Date.now() and `new Date()`; explicit dates are untouched). It lets the suite be run as
   if on any day — the first, the middle or the last day of a Hijri month — without changing the product. Without KIVO_TEST_NOW it
   does nothing. Child processes inherit it through NODE_OPTIONS. */
const at = process.env.KIVO_TEST_NOW ? Date.parse(process.env.KIVO_TEST_NOW) : NaN;
if (Number.isFinite(at)) {
  const Real = Date, shift = at - Real.now();
  class ShiftedDate extends Real {
    constructor(...a) { if (a.length) super(...a); else super(Real.now() + shift); }
    static now() { return Real.now() + shift; }
  }
  globalThis.Date = ShiftedDate;
}
