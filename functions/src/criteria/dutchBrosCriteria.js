/**
 * Dutch Bros site selection criteria — single source of truth for backend and (optional) frontend sync.
 * Mirrors runScreener() in public/index.html Sections A, B, C and verdict.
 */

// Section A: pass = value "1" for dropdowns
const FRONT_PASS = '1';
const CORNER_PASS = '1';
const ZONING_PASS = '1';
const UTIL_PASS = '1';

function scoreField(val, thresholds) {
  if (val == null || isNaN(val)) return 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (val >= thresholds[i]) return i + 1;
  }
  return 1;
}

/**
 * Normalize frontage/corner/zoning/utilities from AI extraction to "1" (pass) or "0" (fail).
 * AI may return "Excellent" | "Good" | "Poor" etc.; we map Excellent/Good -> "1".
 */
function toSectionAValue(str) {
  if (str == null || typeof str !== 'string') return null;
  const s = str.toLowerCase();
  if (s.includes('excellent') || s.includes('good') || s.includes('permitted') || s.includes('conditional') || s.includes('partial') || s.includes('all available') || s.includes('hard corner') || s.includes('outparcel')) return '1';
  if (s.includes('poor') || s.includes('inline') || s.includes('mid-block') || s.includes('not permitted') || s.includes('none') || s.includes('major extension')) return '0';
  return null;
}

/**
 * Run Dutch Bros criteria on a structured input (e.g. from AI extraction).
 * @param {Object} input - Same shape as screener form / AI extraction
 * @param {number} [input.siteAreaAcres]
 * @param {number} [input.driveThruStack]
 * @param {number} [input.vpd]
 * @param {string} [input.frontageVisibility] - "Excellent" | "Good" | "Poor..."
 * @param {number} [input.accessPoints]
 * @param {string} [input.cornerOutparcel] - "Hard Corner" | "Outparcel" | "Inline..."
 * @param {string} [input.driveThruZoning]
 * @param {string} [input.utilitiesOnSite]
 * @param {number} [input.popDensity1mi]
 * @param {number} [input.medianHHIncome3mi]
 * @param {number} [input.popGrowth5yr]
 * @param {number} [input.daytimeWorkers3mi]
 * @param {number} [input.commuterCorridor] - 1-5
 * @param {number} [input.cotenancy] - 1-5
 * @param {number} [input.competitiveCoffeeDensity] - 1-5
 * @param {number} [input.nearestDutchBrosProximityMi]
 * @param {number} [input.landPrice]
 * @param {number} [input.hardCosts]
 * @param {number} [input.softCostPct]
 * @param {number} [input.annualRent]
 * @param {number} [input.rentEscalationPct5yr]
 * @param {number} [input.exitCapRate]
 * @param {number} [input.leaseTermYrs]
 * @param {number} [input.ltvPct]
 * @param {number} [input.interestRatePct]
 * @param {number} [input.amortizationYrs]
 * @returns {{ sectionAPass: number, sectionAPresent: number, sectionBTotal: number, sectionBPresent: number, sectionBMaxPossible: number, yoc: number, profit: number, verdict: 'GO'|'CONDITIONAL'|'NO-GO', incompleteData: boolean, dataCompleteness: number, criteriaResult: Object }}
 */
function runDutchBrosCriteria(input) {
  const area = input.siteAreaAcres != null ? parseFloat(input.siteAreaAcres) : NaN;
  const stack = input.driveThruStack != null ? parseInt(input.driveThruStack, 10) : NaN;
  const vpd = input.vpd != null ? parseInt(input.vpd, 10) : NaN;
  const front = toSectionAValue(input.frontageVisibility) ?? (input.frontageVisibility === '1' ? '1' : input.frontageVisibility === '0' ? '0' : null);
  const access = input.accessPoints != null ? parseInt(input.accessPoints, 10) : NaN;
  const corner = toSectionAValue(input.cornerOutparcel) ?? (input.cornerOutparcel === '1' ? '1' : input.cornerOutparcel === '0' ? '0' : null);
  const zoning = toSectionAValue(input.driveThruZoning) ?? (input.driveThruZoning === '1' ? '1' : input.driveThruZoning === '0' ? '0' : null);
  const util = toSectionAValue(input.utilitiesOnSite) ?? (input.utilitiesOnSite === '1' ? '1' : input.utilitiesOnSite === '0' ? '0' : null);

  const checks = [
    !isNaN(area) && area >= 0.5,
    !isNaN(stack) && stack >= 16,
    !isNaN(vpd) && vpd >= 25000,
    front === FRONT_PASS,
    !isNaN(access) && access >= 2,
    corner === CORNER_PASS,
    zoning === ZONING_PASS,
    util === UTIL_PASS,
  ];
  const sectionAPass = checks.filter(Boolean).length;
  const sectionAPresent = [
    !isNaN(area),
    !isNaN(stack),
    !isNaN(vpd),
    front !== null,
    !isNaN(access),
    corner !== null,
    zoning !== null,
    util !== null,
  ].filter(Boolean).length;

  const pop = input.popDensity1mi != null ? parseInt(input.popDensity1mi, 10) : NaN;
  const income = input.medianHHIncome3mi != null ? parseInt(input.medianHHIncome3mi, 10) : NaN;
  const growth = input.popGrowth5yr != null ? parseFloat(input.popGrowth5yr) : NaN;
  const workers = input.daytimeWorkers3mi != null ? parseInt(input.daytimeWorkers3mi, 10) : NaN;
  const commute = input.commuterCorridor != null ? parseInt(input.commuterCorridor, 10) : NaN;
  const cotenancy = input.cotenancy != null ? parseInt(input.cotenancy, 10) : NaN;
  const compete = input.competitiveCoffeeDensity != null ? parseInt(input.competitiveCoffeeDensity, 10) : NaN;
  const dbprox = input.nearestDutchBrosProximityMi != null ? parseFloat(input.nearestDutchBrosProximityMi) : NaN;

  const bScores = [
    scoreField(pop, [500, 1500, 3000, 5000, 8000]),
    scoreField(income, [35000, 50000, 65000, 85000, 110000]),
    scoreField(growth, [0, 3, 7, 12, 20]),
    scoreField(workers, [2000, 8000, 15000, 25000, 40000]),
    isNaN(commute) ? 0 : commute,
    isNaN(cotenancy) ? 0 : cotenancy,
    isNaN(compete) ? 0 : compete,
    scoreField(dbprox, [0.5, 2, 4, 7, 12]),
  ];
  const sectionBTotal = bScores.reduce((a, b) => a + b, 0);
  const sectionBPresent = [
    !isNaN(pop),
    !isNaN(income),
    !isNaN(growth),
    !isNaN(workers),
    !isNaN(commute),
    !isNaN(cotenancy),
    !isNaN(compete),
    !isNaN(dbprox),
  ].filter(Boolean).length;
  const sectionBMaxPossible = sectionBPresent * 5;

  const land = parseFloat(input.landPrice) || 0;
  const hard = parseFloat(input.hardCosts) || 934500;
  const softPct = (parseFloat(input.softCostPct) || 11) / 100;
  const rent = parseFloat(input.annualRent) || 0;
  const esc = (parseFloat(input.rentEscalationPct5yr) || 10) / 100;
  const exitCap = (parseFloat(input.exitCapRate) || 5.25) / 100;
  const term = parseInt(input.leaseTermYrs, 10) || 15;
  const ltv = (parseFloat(input.ltvPct) || 65) / 100;
  const rate = (parseFloat(input.interestRatePct) || 6.5) / 100;
  const amort = parseInt(input.amortizationYrs, 10) || 25;

  const soft = hard * softPct;
  const totalCost = land + hard + soft;
  const yoc = totalCost > 0 ? (rent / totalCost) * 100 : 0;
  const escPeriods = Math.floor(term / 5);
  const exitRent = rent * Math.pow(1 + esc, escPeriods);
  const exitVal = exitCap > 0 ? exitRent / exitCap : 0;
  const profit = exitVal - totalCost;
  const roc = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const loanAmt = totalCost * ltv;
  const monthRate = rate / 12;
  const nPay = amort * 12;
  const monthPay = loanAmt * (monthRate * Math.pow(1 + monthRate, nPay)) / (Math.pow(1 + monthRate, nPay) - 1);
  const annualDS = monthPay * 12;
  const dscr = annualDS > 0 ? rent / annualDS : 0;

  const totalScreenerFields = 8 + 8 + 10;
  const fieldsPresent = sectionAPresent + sectionBPresent +
    [
      input.landPrice != null && input.landPrice !== '',
      input.hardCosts != null && input.hardCosts !== '',
      input.softCostPct != null && input.softCostPct !== '',
      input.annualRent != null && input.annualRent !== '',
      input.rentEscalationPct5yr != null && input.rentEscalationPct5yr !== '',
      input.exitCapRate != null && input.exitCapRate !== '',
      input.leaseTermYrs != null && input.leaseTermYrs !== '',
      input.ltvPct != null && input.ltvPct !== '',
      input.interestRatePct != null && input.interestRatePct !== '',
      input.amortizationYrs != null && input.amortizationYrs !== '',
    ].filter(Boolean).length;
  const dataCompleteness = totalScreenerFields > 0 ? fieldsPresent / totalScreenerFields : 0;

  const financialsPresent = (input.landPrice != null && input.landPrice !== '') &&
    (input.annualRent != null && input.annualRent !== '');

  let verdict;
  let incompleteData = false;
  if (sectionAPass === 8 && sectionBTotal >= 28 && yoc >= 6.5 && profit > 200000) {
    verdict = 'GO';
  } else if (sectionAPass >= 6 && sectionBTotal >= 20 && yoc >= 5.5) {
    verdict = 'CONDITIONAL';
  } else if (
    sectionAPresent >= 4 &&
    sectionAPass / sectionAPresent >= 0.75 &&
    sectionBPresent >= 4 &&
    sectionBMaxPossible > 0 &&
    sectionBTotal / sectionBMaxPossible >= 0.5 &&
    (!financialsPresent || yoc >= 5.5)
  ) {
    verdict = 'CONDITIONAL';
    incompleteData = true;
  } else {
    verdict = 'NO-GO';
  }

  return {
    sectionAPass,
    sectionAPresent,
    sectionBTotal,
    sectionBPresent,
    sectionBMaxPossible,
    yoc,
    profit,
    verdict,
    incompleteData,
    dataCompleteness,
    criteriaResult: {
      sectionAPass,
      sectionAPresent,
      sectionBTotal,
      sectionBPresent,
      sectionBMaxPossible,
      totalCost,
      rent,
      yoc,
      exitVal,
      profit,
      roc,
      annualDS,
      dscr,
      verdict,
      incompleteData,
      dataCompleteness,
    },
  };
}

module.exports = { runDutchBrosCriteria, scoreField, toSectionAValue };
