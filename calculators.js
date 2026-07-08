// calculators.js — Phase 1: Risk, Odds & Effect Measures
// Formulas translated from R scripts.

const CALCULATORS = [

  /* ── 1. MEASURES OF ASSOCIATION ─────────────────────────────────────
     Source: AR, RR, ARD, RRD, OR and CIs.R
     Adds the same study-design selector as 'Chi-Square 2×2': in a
     case-control design, neither margin of AR/ARD/RR/RRD is a valid
     estimate (the case:control ratio is fixed by the investigator,
     not by natural disease prevalence) — only OR survives, since it's
     invariant to which margin was fixed by design.                   */
  {
    id:          'measures-of-association',
    name:        'Measures of Association',
    hint:        'AR · RR · OR · ARD + 95% CIs',
    category:    'Epidemiology & Risk',
    description: 'Computes absolute risk, relative risk, odds ratio, and risk difference — all with 95% confidence intervals — from a 2×2 table of exposure and outcome, plus a two-proportion z-test and chi-square test of significance for the risk difference.',

    formulas: [
      {
        label: 'Absolute Risk (with 95% CI)',
        latex: 'AR_{+} = \\dfrac{a}{a+b} \\;\\; AR_{-} = \\dfrac{c}{c+d} \\qquad CI_{AR} = AR \\pm 1.96\\sqrt{\\dfrac{AR(1-AR)}{n}}'
      },
      {
        label: 'Relative Risk & Odds Ratio',
        latex: 'RR = \\dfrac{AR_{+}}{AR_{-}} \\qquad OR = \\dfrac{a \\cdot d}{b \\cdot c}'
      },
      {
        label: '95% Confidence Intervals',
        latex: 'CI_{RR} = e^{\\,\\ln RR \\,\\pm\\, 1.96\\,\\widehat{SE}_{\\ln RR}} \\qquad CI_{OR} = e^{\\,\\ln OR \\,\\pm\\, 1.96\\,\\widehat{SE}_{\\ln OR}}'
      },
      {
        label: 'Two-Proportion z-Test',
        latex: 'z = \\dfrac{AR_{+}-AR_{-}}{\\sqrt{\\hat{p}(1-\\hat{p})\\left(\\frac{1}{n_1}+\\frac{1}{n_2}\\right)}} \\qquad \\hat{p} = \\dfrac{a+c}{n_1+n_2}'
      },
      {
        label: 'Chi-Square Test',
        latex: '\\chi^2 = \\dfrac{N(ad-bc)^2}{(a+b)(c+d)(a+c)(b+d)}'
      }
    ],

    inputLayout: '2x2',
    inputs: [
      { id: 'a', label: 'a', desc: 'Exposed · Outcome +',   default: 100 },
      { id: 'b', label: 'b', desc: 'Exposed · Outcome −',   default: 400 },
      { id: 'c', label: 'c', desc: 'Unexposed · Outcome +', default: 150 },
      { id: 'd', label: 'd', desc: 'Unexposed · Outcome −', default: 160 },
      { id: 'design', type: 'select', label: 'Study Design (affects whether AR/ARD/RR are valid)', default: 'cohort',
        note: 'Tell it how these four counts were collected. If cases and controls were recruited separately rather than observed naturally, choose Case-Control — absolute risk, risk difference, and relative risk will be replaced with an explanation of why they can’t be trusted for that design, while the odds ratio remains valid regardless.',
        options: [
          { value: 'cohort',        label: 'Cohort / RCT — rows sampled by exposure' },
          { value: 'cross-sectional', label: 'Cross-Sectional — exposure & outcome measured at once' },
          { value: 'case-control',  label: 'Case-Control — rows/columns sampled by outcome' },
        ] },
    ],

    example({ a, b, c, d, design }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v <= 0))
        return 'Enter counts greater than 0 for all four cells to see a worked medical example here.';
      const n1 = a + b, n2 = c + d;
      const ARp = a / n1, ARn = c / n2;
      const RR = ARp / ARn;
      const OR = (a * d) / (b * c);
      const f = v => +v.toFixed(2);
      if (design === 'case-control')
        return `${n1 + n2} subjects are split into ${n1} cases and ${n2} controls (a case-control design), and ${a} of the cases and ${c} of the controls turn out to have been exposed. Because that case:control split was fixed by the investigator rather than reflecting true disease prevalence, AR and RR computed from this table are not valid — only OR = ${f(OR)} is, since it stays the same regardless of which margin (exposure or outcome) was the one fixed by design.`;
      return `A cohort study follows ${n1} smokers and ${n2} non-smokers for lung disease: ${a} smokers and ${c} non-smokers develop it. RR = ${f(RR)} means smokers are about ${f(RR)}× as likely to develop the disease as non-smokers, while OR = ${f(OR)} — a different, sometimes-confused quantity — approximates RR here since the disease is relatively rare, though the two diverge more as outcome prevalence rises.`;
    },

    calculate({ a, b, c, d, design }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v <= 0))
        return [err('All four cells must be greater than 0')];

      const n1 = a + b;   // exposed total
      const n2 = c + d;   // unexposed total
      const Z  = 1.96;

      const ARp = a / n1;
      const ARn = c / n2;
      const ARD = ARp - ARn;
      const RR  = ARp / ARn;
      const OR  = (a * d) / (b * c);
      const RRD = Math.abs(RR - 1);

      const SE_ARp   = Math.sqrt(ARp*(1-ARp)/n1);
      const SE_ARn   = Math.sqrt(ARn*(1-ARn)/n2);
      const SE_ARD   = Math.sqrt(ARp*(1-ARp)/n1 + ARn*(1-ARn)/n2);
      const SE_logRR = Math.sqrt(b/(a*n1) + d/(c*n2));
      const SE_logOR = Math.sqrt(1/a + 1/b + 1/c + 1/d);

      const clip = v => Math.max(0, Math.min(1, v));
      const CI_ARp = [clip(ARp - Z*SE_ARp), clip(ARp + Z*SE_ARp)];
      const CI_ARn = [clip(ARn - Z*SE_ARn), clip(ARn + Z*SE_ARn)];
      const CI_ARD = [ARD - Z*SE_ARD,              ARD + Z*SE_ARD];
      const CI_RR  = [Math.exp(Math.log(RR) - Z*SE_logRR), Math.exp(Math.log(RR) + Z*SE_logRR)];
      const CI_OR  = [Math.exp(Math.log(OR) - Z*SE_logOR), Math.exp(Math.log(OR) + Z*SE_logOR)];

      // Two-proportion z-test (pooled SE) and the equivalent chi-square
      // test of independence — both test the same null (AR+ = AR−), so
      // z² = χ² and their p-values agree; shown separately since each
      // is reported under its own name in different literatures.
      const N        = n1 + n2;
      const pPooled  = (a + c) / N;
      const sePooled = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));
      const zStat    = ARD / sePooled;
      const pValueZ  = normalTwoTailedP(zStat);

      const chi2       = N * (a*d - b*c) ** 2 / ((a+b) * (c+d) * (a+c) * (b+d));
      const pValueChi2 = chiSquarePValue(chi2);

      const isSignificant = pValueZ < 0.05;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      const isCaseControl = design === 'case-control';

      const rows = [];

      if (isCaseControl) {
        rows.push({
          label: 'Absolute Risk, Risk Difference & RR — NOT VALID for this design', isText: true, ci: null, isRatio: false, isError: true,
          value: `Not shown: in a case-control design the case:control ratio is fixed by the investigator, not by natural disease prevalence, so AR, ARD, and RR computed from this table (RR would read ${f(RR)}) do not estimate true population risk. Only OR is valid here.`
        });
      } else {
        rows.push(
          { label: 'Absolute Risk (Exposed)',   value: f(ARp),  ci: [f(CI_ARp[0]), f(CI_ARp[1])], isRatio: false },
          { label: 'Absolute Risk (Unexposed)', value: f(ARn),  ci: [f(CI_ARn[0]), f(CI_ARn[1])], isRatio: false },
          { label: 'Absolute Risk Difference',  value: f(ARD),  ci: CI_ARD, isRatio: false },
          { label: 'Relative Risk (RR)',         value: f(RR),   ci: CI_RR,  isRatio: true  },
          { label: 'Relative Risk Difference',  value: f(RRD),  ci: null,   isRatio: false },
        );
        if (design === 'cross-sectional') {
          rows.push({ label: 'Note', isText: true, ci: null, isRatio: false,
            value: 'RR here is a prevalence ratio (exposure and outcome measured at the same moment), not an incidence-based risk ratio — still valid and interpretable, just from a different kind of study.' });
        }
      }

      rows.push({ label: 'Odds Ratio (OR)', value: f(OR), ci: CI_OR, isRatio: true, highlight: true });

      rows.push(
        { label: 'Two-Proportion z-Statistic', value: f(zStat), ci: null, isRatio: false, highlight: true },
        { label: 'p-value (z-test, two-tailed)', value: formatPValue(pValueZ), ci: null, isRatio: false },
        { label: 'Chi-Square Statistic (χ²)',  value: f(chi2), ci: null, isRatio: false, highlight: true },
        { label: 'p-value (χ² test)',          value: formatPValue(pValueChi2), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: `Risk difference is ${isSignificant ? 'statistically significant' : 'not statistically significant'} (z = ${f(zStat)}, χ² = ${f(chi2)}, ${formatPText(pValueZ)})` },
      );

      return rows;
    }
  },


  /* ── 2. OR → NNT & NNH ──────────────────────────────────────────────
     Source: OR to NNT and NNH.R                                       */
  {
    id:          'or-to-nnt-nnh',
    name:        'OR to NNT & NNH',
    hint:        'OR → RR → ARR → NNT / NNH',
    category:    'Epidemiology & Risk',
    description: 'Converts an odds ratio and baseline control event rate to relative risk, absolute risk difference, and the number needed to treat (OR < 1) or number needed to harm (OR > 1).',

    formulas: [
      {
        label: 'Relative Risk from OR',
        latex: 'RR = \\dfrac{OR}{1 + CER \\cdot (OR - 1)}'
      },
      {
        label: 'Absolute Risk Difference',
        latex: 'ARD = |\\,CER - EER\\,| \\qquad \\text{where } EER = CER \\times RR'
      },
      {
        label: 'NNT or NNH',
        latex: 'NNT \\,/\\, NNH = \\left\\lceil \\dfrac{1}{ARD} \\right\\rceil'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'OR',  label: 'Odds Ratio (OR)',               default: 0.75 },
      { id: 'CER', label: 'Control Event Rate (0 – 1)',    default: 0.20 },
    ],

    example({ OR, CER }) {
      if (!isFinite(OR) || OR <= 0 || !isFinite(CER) || CER <= 0 || CER >= 1)
        return 'Enter an odds ratio and control event rate to see a worked medical example here.';
      const RR = OR / (1 + CER * (OR - 1));
      const EER = CER * RR;
      const ARD = Math.abs(CER - EER);
      const isProtective = OR < 1;
      const NNXtext = ARD < 1e-10 ? '∞' : String(Math.ceil(1 / ARD));
      return `A drug trial reports OR = ${OR} against a control group event rate of ${(CER * 100).toFixed(0)}%. Converting to absolute terms, the drug ${isProtective ? 'reduces' : 'increases'} the event rate to about ${(EER * 100).toFixed(1)}% — meaning you'd need to treat about ${NNXtext} patients to ${isProtective ? 'prevent' : 'cause'} one additional event (${isProtective ? 'NNT' : 'NNH'}). An OR alone doesn't tell you this; it depends heavily on the baseline rate.`;
    },

    calculate({ OR, CER }) {
      if (!isFinite(OR) || OR <= 0)
        return [err('Odds Ratio must be greater than 0')];
      if (!isFinite(CER) || CER <= 0 || CER >= 1)
        return [err('Control Event Rate must be between 0 and 1 (exclusive)')];

      const RR  = OR / (1 + CER * (OR - 1));
      const EER = CER * RR;
      const ARD = Math.abs(CER - EER);
      const RRD = Math.abs(RR - 1);
      const NNX = ARD < 1e-10 ? '∞' : Math.ceil(1 / ARD);
      const isProtective = OR < 1;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Experimental Event Rate (EER)',
          value: f(EER),  ci: null, isRatio: false },
        { label: 'Relative Risk (RR)',
          value: f(RR),   ci: null, isRatio: false },
        { label: 'Relative Risk Difference',
          value: f(RRD),  ci: null, isRatio: false },
        { label: isProtective ? 'Absolute Risk Reduction (ARR)' : 'Absolute Risk Increase (ARI)',
          value: f(ARD),  ci: null, isRatio: false },
        { label: isProtective ? 'Number Needed to Treat (NNT)' : 'Number Needed to Harm (NNH)',
          value: NNX,     ci: null, isRatio: false, highlight: true },
      ];
    }
  },


  /* ── 3. COHEN'S d ────────────────────────────────────────────────────
     Source: Cohen's delta.R                                            */
  {
    id:          'cohens-d',
    name:        "Cohen's d",
    hint:        'Standardized effect size',
    category:    'Effect Sizes & Agreement',
    description: "Quantifies the standardized difference between two group means. Cohen's d is unit-independent, calculated using the pooled standard deviation as the common scale.",

    formulas: [
      {
        label: 'Pooled Standard Deviation',
        latex: 's_{\\text{pooled}} = \\sqrt{\\dfrac{(n_1-1)\\,s_1^2 + (n_2-1)\\,s_2^2}{n_1+n_2-2}}'
      },
      {
        label: "Cohen's d",
        latex: 'd = \\dfrac{\\bar{x}_1 - \\bar{x}_2}{s_{\\text{pooled}}}'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'mean', label: 'Mean (x̄)' },
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
    ],
    inputs: [
      { id: 'mean1', label: 'Group 1 Mean (x̄₁)', default: 85 },
      { id: 'mean2', label: 'Group 2 Mean (x̄₂)', default: 78 },
      { id: 'sd1',   label: 'Group 1 SD (s₁)',    default: 10 },
      { id: 'sd2',   label: 'Group 2 SD (s₂)',    default: 12 },
      { id: 'n1',    label: 'Group 1 Size (n₁)',  default: 30 },
      { id: 'n2',    label: 'Group 2 Size (n₂)',  default: 28 },
    ],

    example({ mean1, mean2, sd1, sd2, n1, n2 }) {
      if (!isFinite(mean1) || !isFinite(mean2) || !isFinite(sd1) || sd1 <= 0 || !isFinite(sd2) || sd2 <= 0 ||
          !isFinite(n1) || n1 < 2 || !isFinite(n2) || n2 < 2)
        return 'Enter means, SDs, and sample sizes for both groups to see a worked medical example here.';
      const sp = Math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / (n1 + n2 - 2));
      const d = (mean1 - mean2) / sp;
      const absD = Math.abs(d);
      const interp = absD < 0.2 ? 'negligible' : absD < 0.5 ? 'small' : absD < 0.8 ? 'medium' : 'large';
      const f = v => +v.toFixed(2);
      return `Two treatments for anxiety produce mean symptom scores of ${mean1} (SD ${sd1}, n=${n1}) and ${mean2} (SD ${sd2}, n=${n2}). Even if that gap is statistically significant, Cohen's d = ${f(d)} tells you it's a ${interp} effect in practical terms — d puts the difference in SD units, so it's comparable across studies that use different rating scales.`;
    },

    calculate({ mean1, mean2, sd1, sd2, n1, n2 }) {
      if (n1 < 2 || n2 < 2)
        return [err('Sample sizes must be at least 2')];
      if (sd1 <= 0 || sd2 <= 0)
        return [err('Standard deviations must be greater than 0')];

      const sp   = Math.sqrt(((n1-1)*sd1**2 + (n2-1)*sd2**2) / (n1+n2-2));
      const d    = (mean1 - mean2) / sp;
      const absD = Math.abs(d);

      const interp = absD < 0.2 ? 'Negligible (< 0.2)'
                   : absD < 0.5 ? 'Small (0.2 – 0.5)'
                   : absD < 0.8 ? 'Medium (0.5 – 0.8)'
                   :              'Large (≥ 0.8)';

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Pooled SD (s_pooled)', value: f(sp),    ci: null, isRatio: false },
        { label: "Cohen's d",            value: f(d),     ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation',       value: interp,   ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 4. STANDARD DEVIATION — CALCULATED & VISUALIZED ────────────────
     Sources: Variance and SD for samples.R, Variance and SD for populations.R */
  {
    id:          'sd-visualized',
    name:        'Standard Deviation — Calculated & Visualized',
    hint:        's · σ · s² · σ² + bell curve',
    category:    'Descriptive Statistics',
    description: 'Computes sample and population variance and standard deviation from raw data, then plots the distribution on a normal curve with ±1 SD, ±2 SD, and ±3 SD bands.',

    formulas: [
      {
        label: 'Sample Variance & SD',
        latex: 's^2 = \\dfrac{\\displaystyle\\sum_{i=1}^{n}(x_i - \\bar{x})^2}{n - 1} \\qquad s = \\sqrt{s^2}'
      },
      {
        label: 'Population Variance & SD',
        latex: '\\sigma^2 = \\dfrac{\\displaystyle\\sum_{i=1}^{N}(x_i - \\mu)^2}{N} \\qquad \\sigma = \\sqrt{\\sigma^2}'
      }
    ],

    inputs: [
      {
        id:      'data',
        label:   'Data values (comma-separated)',
        type:    'textarea',
        default: '1, 3, 6, 4, 7, 2, 5, 7, 9, 9, 7, 12'
      }
    ],

    example({ data }) {
      const vals = String(data).split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (vals.length < 2) return 'Enter at least 2 comma-separated measurements to see a worked medical example here.';
      const n = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const sSD = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
      const f = v => +v.toFixed(1);
      return `A nurse records fasting glucose (mmol/L) for ${n} patients, entered below. The sample mean is ${f(mean)} with SD ${f(sSD)} — the bell curve shows how individual readings scatter around that average, and the ±1/2/3 SD bands mark where roughly 68%, 95%, and 99.7% of similar patients would fall if glucose were normally distributed.`;
    },

    calculate({ data }) {
      const vals = String(data).split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));

      if (vals.length < 2) return [err('Enter at least 2 comma-separated numbers.')];

      const n     = vals.length;
      const mean  = vals.reduce((s, v) => s + v, 0) / n;
      const ssq   = vals.reduce((s, v) => s + (v - mean) ** 2, 0);
      const sVar  = ssq / (n - 1);
      const pVar  = ssq / n;
      const sSD   = Math.sqrt(sVar);
      const pSD   = Math.sqrt(pVar);
      const min   = Math.min(...vals);
      const max   = Math.max(...vals);
      const f     = (v, dp = 4) => +v.toFixed(dp);

      return [
        { label: 'N (count)',               value: n,        ci: null, isRatio: false },
        { label: 'Mean (x̅ / μ)', value: f(mean),  ci: null, isRatio: false, highlight: true },
        { label: 'Sample SD (s)',            value: f(sSD),   ci: null, isRatio: false, highlight: true },
        { label: 'Sample Variance (s²)',value: f(sVar),  ci: null, isRatio: false },
        { label: 'Population SD (σ)',   value: f(pSD),   ci: null, isRatio: false },
        { label: 'Population Var. (σ²)', value: f(pVar), ci: null, isRatio: false },
        { label: 'Min',                      value: f(min,2), ci: null, isRatio: false },
        { label: 'Max',                      value: f(max,2), ci: null, isRatio: false },
        { label: 'Range',                    value: f(max-min,2), ci: null, isRatio: false },
        { label: 'Distribution',             isSVG: true, svg: sdBellCurveSVG(mean, sSD, vals) },
      ];
    }
  },

  /* ── 5. BINOMIAL PROBABILITY CALCULATOR ─────────────────────────────
     Exact & cumulative binomial probabilities from n, k, p             */
  {
    id:          'binomial-probability',
    name:        'Binomial Probability Calculator',
    hint:        'P(X=k) · P(X≤k) · P(X≥k)',
    category:    'Probability & Distributions',
    description: 'Computes exact and cumulative binomial probabilities for given n, k, and p.',

    formulas: [
      {
        label: 'Probability Mass Function',
        latex: 'P(X=k) = \\dbinom{n}{k}\\, p^{k}(1-p)^{n-k}'
      },
      {
        label: 'Cumulative Probability',
        latex: 'P(X \\le k) = \\sum_{i=0}^{k} \\dbinom{n}{i}\\, p^{i}(1-p)^{n-i}'
      },
      {
        label: 'Mean & Variance',
        latex: '\\mu = np \\qquad \\sigma^2 = np(1-p)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'n', label: 'Number of Trials (n)',      default: 20  },
      { id: 'k', label: 'Number of Successes (k)',   default: 8   },
      { id: 'p', label: 'Probability of Success (p)',default: 0.4 },
    ],

    example({ n, k, p }) {
      n = Math.round(n); k = Math.round(k);
      if (!isFinite(n) || n < 1 || n > 1000 || !isFinite(k) || k < 0 || k > n || !isFinite(p) || p < 0 || p > 1)
        return 'Enter the number of trials, successes, and probability of success to see a worked medical example here.';
      const pmf = binomialPMF(n, p);
      const pAtK = pmf[k];
      let cdfLE = 0;
      for (let i = 0; i <= k; i++) cdfLE += pmf[i];
      const pct = v => (v * 100).toFixed(2);
      return `A drug causes a side effect in ${pct(p)}% of patients. Out of ${n} patients treated, the probability that exactly ${k} experience the side effect is ${pct(pAtK)}%, and the probability of ${k} or fewer is ${pct(cdfLE)}% — useful for judging whether an observed count of side effects is unusually high or within normal binomial variation.`;
    },

    calculate({ n, k, p }) {
      n = Math.round(n);
      k = Math.round(k);

      if (!isFinite(n) || n < 1 || n > 1000)
        return [err('n must be a whole number between 1 and 1000')];
      if (!isFinite(k) || k < 0 || k > n)
        return [err('k must be a whole number between 0 and n')];
      if (!isFinite(p) || p < 0 || p > 1)
        return [err('p must be between 0 and 1')];

      const pmf   = binomialPMF(n, p);
      const pAtK  = pmf[k];
      let cdfLE   = 0;
      for (let i = 0; i <= k; i++) cdfLE += pmf[i];
      const cdfGE = 1 - (cdfLE - pAtK);
      const mean  = n * p;
      const varc  = n * p * (1 - p);
      const sd    = Math.sqrt(varc);

      const f = (v, dp = 6) => +v.toFixed(dp);

      return [
        { label: 'P(X = k) — exact probability', value: f(pAtK), ci: null, isRatio: false, highlight: true },
        { label: 'P(X ≤ k) — cumulative',        value: f(cdfLE), ci: null, isRatio: false },
        { label: 'P(X ≥ k)',                     value: f(cdfGE), ci: null, isRatio: false },
        { label: 'Mean (μ = np)',                value: f(mean, 4), ci: null, isRatio: false },
        { label: 'Variance (σ² = np(1−p))',      value: f(varc, 4), ci: null, isRatio: false },
        { label: 'Standard Deviation (σ)',       value: f(sd, 4),   ci: null, isRatio: false },
        { label: 'Distribution',                 isSVG: true, svg: binomialBarSVG(n, p, k, pmf) },
      ];
    }
  },

  /* ── 6. CHI-SQUARE 2×2 TEST ──────────────────────────────────────────
     Test of independence for a 2×2 contingency table, with Yates'
     continuity correction, phi coefficient, and — since this table is
     the natural home for a one-stop 2×2 analysis — RR and OR (same
     Wald log-scale CIs as 'Measures of Association') plus a study-
     design selector that flags RR as invalid for case-control designs
     (fixed case:control ratio breaks the row-margin assumption RR
     needs; OR is invariant to which margin is fixed and stays valid).
     Small-sample tables are pointed at 'Fisher's Exact Test' rather
     than duplicating its exact hypergeometric computation here.      */
  {
    id:          'chi-square-2x2',
    name:        'Chi-Square 2×2',
    hint:        'χ² · Yates-corrected · φ · RR · OR',
    category:    'Chi-Square & Categorical',
    description: 'Chi-square test of independence for a 2×2 contingency table, plus RR, OR, and design-aware interpretation.',

    formulas: [
      {
        label: 'Chi-Square Statistic',
        latex: '\\chi^2 = \\dfrac{N(ad-bc)^2}{(a+b)(c+d)(a+c)(b+d)}'
      },
      {
        label: "Yates' Continuity Correction",
        latex: '\\chi^2_{Yates} = \\dfrac{N\\left(|ad-bc|-\\tfrac{N}{2}\\right)^2}{(a+b)(c+d)(a+c)(b+d)}'
      },
      {
        label: 'Phi Coefficient',
        latex: '\\varphi = \\dfrac{ad-bc}{\\sqrt{(a+b)(c+d)(a+c)(b+d)}}'
      },
      {
        label: 'Relative Risk & Odds Ratio',
        latex: 'RR = \\dfrac{a/(a+b)}{c/(c+d)} \\qquad OR = \\dfrac{ad}{bc}'
      }
    ],

    inputLayout: '2x2',
    tableLabels: { colPos: 'Outcome +', colNeg: 'Outcome −', rowPos: 'Exposed +', rowNeg: 'Exposed −' },
    inputs: [
      { id: 'a', label: 'a', desc: 'Exposed · Outcome +',   default: 30 },
      { id: 'b', label: 'b', desc: 'Exposed · Outcome −',   default: 10 },
      { id: 'c', label: 'c', desc: 'Unexposed · Outcome +', default: 20 },
      { id: 'd', label: 'd', desc: 'Unexposed · Outcome −', default: 40 },
      { id: 'design', type: 'select', label: 'Study Design (affects whether RR is valid)', default: 'cohort',
        note: 'Tell it how these four counts were collected. If cases and controls (or exposed/unexposed groups) were recruited separately rather than observed naturally, choose Case-Control — the relative risk below will be replaced with an explanation of why it can’t be trusted for that design, while the odds ratio remains valid regardless.',
        options: [
          { value: 'cohort',        label: 'Cohort / RCT — rows sampled by exposure' },
          { value: 'cross-sectional', label: 'Cross-Sectional — exposure & outcome measured at once' },
          { value: 'case-control',  label: 'Case-Control — rows/columns sampled by outcome' },
        ] },
    ],

    example({ a, b, c, d, design }) {
      const denom = (a + b) * (c + d) * (a + c) * (b + d);
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0) || denom === 0)
        return 'Enter counts for all four cells of the 2×2 table to see a worked medical example here.';
      const N = a + b + c + d;
      const chi2 = N * (a * d - b * c) ** 2 / denom;
      const f = v => +v.toFixed(2);
      const designNote = design === 'case-control'
        ? " Since this is flagged as a case-control design, only the odds ratio would be a valid effect-size estimate here — a risk ratio would be distorted by the fixed case:control sampling."
        : ' The risk ratio is a valid effect-size estimate for this design, alongside the odds ratio.';
      return `A study compares ${a + b} exposed and ${c + d} unexposed patients for an outcome: ${a} of the exposed and ${c} of the unexposed develop it. χ² = ${f(chi2)} tests whether exposure and outcome are associated rather than independent — a foundational check before computing a risk or odds ratio.${designNote}`;
    },

    calculate({ a, b, c, d, design }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return [err('All four cells must be zero or greater')];

      const row1 = a + b, row2 = c + d;
      const col1 = a + c, col2 = b + d;
      const N     = row1 + row2;
      const denom = row1 * row2 * col1 * col2;

      if (N === 0 || denom === 0)
        return [err('Each row and column total must be greater than 0')];

      const diff      = a * d - b * c;
      const chi2      = N * diff ** 2 / denom;
      const chi2Yates = N * Math.max(Math.abs(diff) - N / 2, 0) ** 2 / denom;
      const phi       = diff / Math.sqrt(denom);

      const pValue      = chiSquarePValue(chi2);
      const pValueYates = chiSquarePValue(chi2Yates);

      const expA = row1 * col1 / N, expB = row1 * col2 / N;
      const expC = row2 * col1 / N, expD = row2 * col2 / N;
      const minExpected = Math.min(expA, expB, expC, expD);

      const f = (n, dp = 4) => +(n.toFixed(dp));

      const rows = [
        { label: 'Chi-Square (χ²)',             value: f(chi2),           ci: null, isRatio: false, highlight: true },
        { label: 'p-value',                     value: formatPValue(pValue),      ci: null, isRatio: false },
        { label: "Yates-Corrected χ²",          value: f(chi2Yates),      ci: null, isRatio: false },
        { label: 'p-value (Yates-corrected)',   value: formatPValue(pValueYates), ci: null, isRatio: false },
        { label: 'Phi Coefficient (φ)',         value: f(phi),            ci: null, isRatio: false },
        { label: 'Minimum Expected Cell Count', value: f(minExpected, 2), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Significant association' : 'No significant association',
          ci: null, isRatio: false, isText: true },
        { label: 'χ² — When to Use', isText: true, ci: null, isRatio: false,
          value: 'χ² only tests whether exposure and outcome are statistically associated — it says nothing about the size or direction of the effect. Use RR or OR below for that.' },
      ];

      if (minExpected < 5) {
        rows.push({
          label: 'Note', isText: true, ci: null, isRatio: false,
          value: "Minimum expected count is below 5 — the χ² approximation is unreliable here. Switch to Fisher's Exact Test for an exact p-value instead."
        });
      }

      if (a > 0 && b > 0 && c > 0 && d > 0) {
        const Z = 1.96;
        const ARp = a / row1, ARn = c / row2;
        const RR  = ARp / ARn;
        const OR  = (a * d) / (b * c);
        const SE_logRR = Math.sqrt(b / (a * row1) + d / (c * row2));
        const SE_logOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
        const CI_RR = [Math.exp(Math.log(RR) - Z * SE_logRR), Math.exp(Math.log(RR) + Z * SE_logRR)];
        const CI_OR = [Math.exp(Math.log(OR) - Z * SE_logOR), Math.exp(Math.log(OR) + Z * SE_logOR)];

        const isCaseControl = design === 'case-control';

        if (isCaseControl) {
          rows.push({
            label: 'Relative Risk (RR) — NOT VALID for this design', isText: true, ci: null, isRatio: false, isError: true,
            value: `Not shown: in a case-control design the ratio of cases to controls is fixed by the investigator, not by natural disease prevalence, so RR computed from this table (would read ${f(RR)}) does not estimate the true population risk ratio.`
          });
        } else {
          rows.push({ label: 'Relative Risk (RR)', value: f(RR), ci: [f(CI_RR[0]), f(CI_RR[1])], isRatio: true, highlight: true });
        }

        rows.push({ label: 'Odds Ratio (OR)', value: f(OR), ci: [f(CI_OR[0]), f(CI_OR[1])], isRatio: true, highlight: true });

        const designNote = isCaseControl
          ? "Only OR is valid here — it's the one association measure that's mathematically the same whether exposure or outcome status was the fixed sampling margin. By the rare-disease assumption, OR also approximates what RR would have been."
          : design === 'cross-sectional'
            ? 'RR here is a prevalence ratio (exposure and outcome measured at the same moment), not an incidence-based risk ratio — still a valid, interpretable ratio, just from a different kind of study.'
            : 'RR is directly interpretable as how many times more (or less) likely the outcome is in the exposed group versus the unexposed group.';
        rows.push({ label: 'RR vs OR — Design Note', isText: true, ci: null, isRatio: false, value: designNote });
      } else {
        rows.push({
          label: 'RR / OR', isText: true, ci: null, isRatio: false,
          value: 'Requires all four cells to be greater than 0 to compute RR and OR.'
        });
      }

      return rows;
    }
  },

  /* ── 7. VARIANCE & STANDARD DEVIATION ─────────────────────────────────
     Plain sample/population variance & SD from raw data (no chart —
     see sd-visualized for the graphed version).                        */
  {
    id:          'variance-sd',
    name:        'Variance & Standard Deviation',
    hint:        's² · σ² · s · σ',
    category:    'Descriptive Statistics',
    description: 'Calculates variance and standard deviation for a sample or population.',

    formulas: [
      {
        label: 'Sample Variance & SD',
        latex: 's^2 = \\dfrac{\\displaystyle\\sum_{i=1}^{n}(x_i - \\bar{x})^2}{n - 1} \\qquad s = \\sqrt{s^2}'
      },
      {
        label: 'Population Variance & SD',
        latex: '\\sigma^2 = \\dfrac{\\displaystyle\\sum_{i=1}^{N}(x_i - \\mu)^2}{N} \\qquad \\sigma = \\sqrt{\\sigma^2}'
      }
    ],

    inputs: [
      {
        id:      'data',
        label:   'Data values (comma-separated)',
        type:    'textarea',
        default: '4, 8, 6, 5, 3, 7, 9, 5, 6, 4'
      }
    ],

    example({ data }) {
      const vals = String(data).split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (vals.length < 2) return 'Enter at least 2 comma-separated measurements to see a worked medical example here.';
      const n = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const sSD = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
      const f = v => +v.toFixed(1);
      return `A researcher records length-of-stay (days) for ${n} patients discharged from a ward, entered below. The sample variance and SD (${f(sSD)} days) describe how spread out those stays are around the mean of ${f(mean)} days — useful for comparing consistency of care between wards, not just average stay.`;
    },

    calculate({ data }) {
      const vals = String(data).split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));

      if (vals.length < 2) return [err('Enter at least 2 comma-separated numbers.')];

      const n    = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const ssq  = vals.reduce((s, v) => s + (v - mean) ** 2, 0);
      const sVar = ssq / (n - 1);
      const pVar = ssq / n;
      const sSD  = Math.sqrt(sVar);
      const pSD  = Math.sqrt(pVar);

      const f = (v, dp = 4) => +v.toFixed(dp);

      return [
        { label: 'N (count)',                 value: n,       ci: null, isRatio: false },
        { label: 'Mean (x̅ / μ)',              value: f(mean), ci: null, isRatio: false, highlight: true },
        { label: 'Sum of Squared Deviations', value: f(ssq),  ci: null, isRatio: false },
        { label: 'Sample Variance (s²)',      value: f(sVar), ci: null, isRatio: false, highlight: true },
        { label: 'Sample SD (s)',             value: f(sSD),  ci: null, isRatio: false, highlight: true },
        { label: 'Population Variance (σ²)',  value: f(pVar), ci: null, isRatio: false },
        { label: 'Population SD (σ)',         value: f(pSD),  ci: null, isRatio: false },
      ];
    }
  },

  /* ── 8. STANDARD ERROR CALCULATOR ─────────────────────────────────────
     SEM from SD and n, with an optional CI when a mean is supplied.    */
  {
    id:          'standard-error',
    name:        'Standard Error of the Mean',
    hint:        'SEM = s / √n',
    category:    'Descriptive Statistics',
    description: 'Computes the standard error of the mean from SD and sample size.',

    formulas: [
      {
        label: 'Standard Error of the Mean',
        latex: 'SEM = \\dfrac{s}{\\sqrt{n}}'
      },
      {
        label: '95% Confidence Interval (optional, needs x̄)',
        latex: '\\bar{x} \\pm 1.96 \\times SEM'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'sd',   label: 'Standard Deviation (s)',             default: 12 },
      { id: 'n',    label: 'Sample Size (n)',                    default: 30 },
      { id: 'mean', label: 'Sample Mean (x̄) — optional, for CI', default: ''  },
    ],

    example({ sd, n, mean }) {
      if (!isFinite(sd) || sd <= 0 || !isFinite(n) || n < 1)
        return 'Enter a standard deviation and sample size to see a worked medical example here.';
      const sem = sd / Math.sqrt(n);
      const f = v => +v.toFixed(2);
      const hasMean = mean !== '' && mean != null && isFinite(mean);
      const meanPart = hasMean
        ? ` around a sample mean of ${f(mean)} mmHg, giving a 95% CI of about [${f(mean - 1.96 * sem)}, ${f(mean + 1.96 * sem)}] mmHg`
        : '';
      return `A trial measures systolic blood pressure in ${Math.round(n)} patients with SD ${f(sd)} mmHg. The standard error of the mean is ${f(sem)} mmHg${meanPart} — SEM shrinks as n grows, which is why larger trials pin down the population mean more precisely even though individual patients vary just as much.`;
    },

    calculate({ sd, n, mean }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      n = Math.round(n);
      if (!isFinite(sd) || sd <= 0) return [err('Standard Deviation must be greater than 0')];
      if (!isFinite(n) || n < 1)    return [err('Sample Size must be at least 1')];

      const sem    = sd / Math.sqrt(n);
      const margin = 1.96 * sem;

      const f = (v, dp = 4) => +v.toFixed(dp);

      const rows = [
        { label: 'Standard Error of the Mean (SEM)', value: f(sem),    ci: null, isRatio: false, highlight: true },
        { label: 'Margin of Error (95%, ±1.96×SEM)', value: f(margin), ci: null, isRatio: false },
      ];

      if (provided(mean)) {
        rows.push(
          { label: '95% CI Lower Bound', value: f(mean - margin), ci: null, isRatio: false },
          { label: '95% CI Upper Bound', value: f(mean + margin), ci: null, isRatio: false },
        );
      }

      return rows;
    }
  },

  /* ── 9. STANDARD ERROR OF A PROPORTION ────────────────────────────────
     SE(p) from a single sample proportion and n, with an optional
     95% Wald CI.                                                       */
  {
    id:          'se-proportion',
    name:        'Standard Error of a Proportion',
    hint:        'SE(p) = √(p(1−p)/n)',
    category:    'Descriptive Statistics',
    description: 'Computes the standard error of a single sample proportion from p and n.',

    formulas: [
      {
        label: 'Standard Error of a Proportion',
        latex: 'SE(p) = \\sqrt{\\dfrac{p(1-p)}{n}}'
      },
      {
        label: '95% Confidence Interval (Wald)',
        latex: 'p \\pm 1.96 \\times SE(p)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'p', label: 'Sample Proportion (p, 0–1)', default: 0.4 },
      { id: 'n', label: 'Sample Size (n)',             default: 50  },
    ],

    example({ p, n }) {
      if (!isFinite(p) || p <= 0 || p >= 1 || !isFinite(n) || n < 1)
        return 'Enter a sample proportion (0–1) and sample size to see a worked medical example here.';
      const se = Math.sqrt((p * (1 - p)) / n);
      const f = v => +v.toFixed(3);
      return `In a sample of ${Math.round(n)} patients, ${f(p * 100)}% test positive for a marker. The standard error of that proportion is ${f(se)} (about ${f(se * 100)} percentage points) — giving a 95% CI of roughly [${f(Math.max(0, p - 1.96 * se) * 100)}%, ${f(Math.min(1, p + 1.96 * se) * 100)}%] for the true population proportion, not just this one sample's estimate.`;
    },

    calculate({ p, n }) {
      n = Math.round(n);
      if (!isFinite(p) || p < 0 || p > 1) return [err('Sample Proportion must be between 0 and 1')];
      if (!isFinite(n) || n < 1)          return [err('Sample Size must be at least 1')];

      const se     = Math.sqrt(p * (1 - p) / n);
      const margin = 1.96 * se;
      const ciLo   = Math.max(0, p - margin);
      const ciHi   = Math.min(1, p + margin);

      const f = (v, dp = 4) => +v.toFixed(dp);

      return [
        { label: 'Standard Error of the Proportion (SE)', value: f(se),     ci: null, isRatio: false, highlight: true },
        { label: 'Margin of Error (95%, ±1.96×SE)',        value: f(margin), ci: null, isRatio: false },
        { label: '95% CI Lower Bound',                     value: f(ciLo),   ci: null, isRatio: false },
        { label: '95% CI Upper Bound',                     value: f(ciHi),   ci: null, isRatio: false },
      ];
    }
  },

  /* ── 10. SE OF ln(RR) & ln(OR) — 2×2 TABLE ────────────────────────────
     SE of a difference in proportions, ln(RR), and ln(OR) from a real
     2×2 exposure/outcome table (same widget as Measures of Association).*/
  {
    id:          'se-lnrr-lnor',
    name:        'SE of ln(RR) & ln(OR) — 2×2 Table',
    hint:        'SE(p₁−p₂) · SE(ln RR) · SE(ln OR)',
    category:    'Epidemiology & Risk',
    description: 'Computes the standard error of a difference in proportions, ln(RR), and ln(OR) from a 2×2 table of exposure and outcome counts.',

    formulas: [
      {
        label: 'SE of a Difference in Proportions',
        latex: 'SE(p_1-p_2) = \\sqrt{\\dfrac{p_1(1-p_1)}{n_1} + \\dfrac{p_2(1-p_2)}{n_2}}'
      },
      {
        label: 'SE of ln(Relative Risk)',
        latex: 'SE(\\ln RR) = \\sqrt{\\dfrac{b}{a\\,n_1} + \\dfrac{d}{c\\,n_2}}'
      },
      {
        label: 'SE of ln(Odds Ratio)',
        latex: 'SE(\\ln OR) = \\sqrt{\\dfrac{1}{a}+\\dfrac{1}{b}+\\dfrac{1}{c}+\\dfrac{1}{d}}'
      }
    ],

    inputLayout: '2x2',
    inputs: [
      { id: 'a', label: 'a', desc: 'Exposed · Outcome +',   default: 100 },
      { id: 'b', label: 'b', desc: 'Exposed · Outcome −',   default: 400 },
      { id: 'c', label: 'c', desc: 'Unexposed · Outcome +', default: 150 },
      { id: 'd', label: 'd', desc: 'Unexposed · Outcome −', default: 160 },
    ],

    example({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return 'Enter counts for all four cells to see a worked medical example here.';
      const n1 = a + b, n2 = c + d;
      const p1 = a / n1, p2 = c / n2;
      const seDiff = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
      const f = v => +v.toFixed(4);
      let extra = '';
      if (a > 0 && b > 0 && c > 0 && d > 0) {
        const seLnRR = Math.sqrt(b / (a * n1) + d / (c * n2));
        extra = ` SE(ln RR) = ${f(seLnRR)} is what you'd feed into a meta-analysis alongside ln(RR) itself — CIs for ratio measures are built on the log scale, not the ratio scale directly.`;
      }
      return `A study of ${n1} exposed and ${n2} unexposed patients finds event rates of ${(p1 * 100).toFixed(1)}% and ${(p2 * 100).toFixed(1)}%. SE(p1-p2) = ${f(seDiff)} quantifies the precision of that absolute gap.${extra}`;
    },

    calculate({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return [err('All four cells must be zero or greater')];

      const n1 = a + b, n2 = c + d;
      if (n1 === 0 || n2 === 0)
        return [err('Each row total must be greater than 0')];

      const p1 = a / n1, p2 = c / n2;
      const f  = (v, dp = 4) => +v.toFixed(dp);

      const seDiffProp = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);

      const rows = [
        { label: 'SE of Difference in Proportions', value: f(seDiffProp), ci: null, isRatio: false, highlight: true },
      ];

      if (a > 0 && b > 0 && c > 0 && d > 0) {
        const seLnRR = Math.sqrt(b / (a * n1) + d / (c * n2));
        const seLnOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
        rows.push(
          { label: 'SE of ln(RR)', value: f(seLnRR), ci: null, isRatio: false, highlight: true },
          { label: 'SE of ln(OR)', value: f(seLnOR), ci: null, isRatio: false, highlight: true },
        );
      } else {
        rows.push({
          label: 'SE of ln(RR) / ln(OR)', isText: true, ci: null, isRatio: false,
          value: 'Requires all four cells (a, b, c, d) to be greater than 0.'
        });
      }

      return rows;
    }
  },

  /* ── 11. VARIANCE, SD & SEM — GRAPH ───────────────────────────────────
     Contrasts the spread of the raw data (SD) against the tighter
     spread of the sampling distribution of the mean (SEM).             */
  {
    id:          'variance-sd-sem-graph',
    name:        'Variance, Standard Deviation & Standard Error of the Mean — Graph',
    hint:        's² · s · SEM + curves',
    category:    'Descriptive Statistics',
    description: 'Plots variance, standard deviation, and standard error of the mean together.',

    formulas: [
      {
        label: 'Sample Variance & Standard Deviation',
        latex: 's^2 = \\dfrac{\\displaystyle\\sum_{i=1}^{n}(x_i - \\bar{x})^2}{n - 1} \\qquad s = \\sqrt{s^2}'
      },
      {
        label: 'Standard Error of the Mean',
        latex: 'SEM = \\dfrac{s}{\\sqrt{n}}'
      }
    ],

    inputs: [
      {
        id:      'data',
        label:   'Data values (comma-separated)',
        type:    'textarea',
        default: '4, 8, 6, 5, 3, 7, 9, 5, 6, 4'
      }
    ],

    example({ data }) {
      const vals = String(data).split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (vals.length < 2) return 'Enter at least 2 comma-separated measurements to see a worked medical example here.';
      const n = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const sSD = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
      const sem = sSD / Math.sqrt(n);
      const f = v => +v.toFixed(2);
      return `A study records heart rate (bpm) for ${n} patients, entered below. SD (${f(sSD)} bpm) describes how much individual patients vary from the mean of ${f(mean)}, while SEM (${f(sem)} bpm) — much narrower — describes how precisely that sample mean estimates the true population mean. The graph shows why these two spreads are easy to confuse but answer very different questions.`;
    },

    calculate({ data }) {
      const vals = String(data).split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));

      if (vals.length < 2) return [err('Enter at least 2 comma-separated numbers.')];

      const n    = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const ssq  = vals.reduce((s, v) => s + (v - mean) ** 2, 0);
      const sVar = ssq / (n - 1);
      const sSD  = Math.sqrt(sVar);

      if (sSD === 0) return [err('Data must have some variability (all values identical)')];

      const sem = sSD / Math.sqrt(n);

      const f = (v, dp = 4) => +v.toFixed(dp);

      return [
        { label: 'N (count)',                                 value: n,       ci: null, isRatio: false },
        { label: 'Mean (x̅)',                                  value: f(mean), ci: null, isRatio: false, highlight: true },
        { label: 'Sample Variance (s²)',                      value: f(sVar), ci: null, isRatio: false },
        { label: 'Sample Standard Deviation (s)',             value: f(sSD),  ci: null, isRatio: false, highlight: true },
        { label: 'Standard Error of the Mean (SEM)',          value: f(sem),  ci: null, isRatio: false, highlight: true },
        { label: 'Standard Deviation vs Standard Error of the Mean', isSVG: true, svg: semComparisonSVG(mean, sSD, sem) },
      ];
    }
  },

  /* ── 12. REVMAN — FINDING SD ──────────────────────────────────────────
     Derives SD from a reported standard error or confidence interval,
     for entry into a meta-analysis (RevMan-style helper).              */
  {
    id:          'revman-sd',
    name:        'RevMan — Finding SD',
    hint:        'SD from SE or 95% CI',
    category:    'Descriptive Statistics',
    description: 'Derives standard deviations from confidence intervals or standard errors for meta-analysis.',

    formulas: [
      {
        label: 'SD from Standard Error',
        latex: 'SD = SE \\times \\sqrt{n}'
      },
      {
        label: 'SD from Confidence Interval',
        latex: 'SD = \\dfrac{\\sqrt{n}\\,(CI_{upper} - CI_{lower})}{2z}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'n',               label: 'Sample Size (n)',                              default: 25 },
      { id: 'se',              label: 'Standard Error (SE) — leave blank if using CI', default: ''  },
      { id: 'ciLower',         label: 'CI Lower Bound',                               default: 10 },
      { id: 'ciUpper',         label: 'CI Upper Bound',                               default: 14 },
      { id: 'confidenceLevel', label: 'Confidence Level (%) — for CI method',         default: 95 },
    ],

    example({ n, se, ciLower, ciUpper, confidenceLevel }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      n = Math.round(n);
      if (!isFinite(n) || n < 2) return 'Enter a sample size to see a worked medical example here.';
      const seGiven = provided(se);
      const ciGiven = provided(ciLower) && provided(ciUpper) && ciUpper > ciLower;
      if (!seGiven && !ciGiven) return 'Enter either a standard error, or both CI bounds, to see a worked medical example here.';

      const zFromConfidence = level => {
        if (Math.abs(level - 90)   < 2.5) return 1.645;
        if (Math.abs(level - 99)   < 2.5) return 2.576;
        if (Math.abs(level - 99.9) < 0.5) return 3.291;
        return 1.96;
      };

      let sd, sourceText;
      if (seGiven) {
        sd = se * Math.sqrt(n);
        sourceText = `reports a mean difference in blood pressure with SE = ${se} but no SD`;
      } else {
        const level = provided(confidenceLevel) ? confidenceLevel : 95;
        const z = zFromConfidence(level);
        sd = Math.sqrt(n) * (ciUpper - ciLower) / (2 * z);
        sourceText = `reports a mean difference in blood pressure with a ${level}% CI of [${ciLower}, ${ciUpper}] but no SD`;
      }
      const f = v => +v.toFixed(2);
      return `A published trial of ${n} patients ${sourceText} — common when papers report precision but not raw spread. Back-calculating SD ≈ ${f(sd)} lets you enter this trial into a meta-analysis tool like RevMan, which needs SD (not SE or a CI) to pool studies.`;
    },

    calculate({ n, se, ciLower, ciUpper, confidenceLevel }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      n = Math.round(n);
      if (!isFinite(n) || n < 2) return [err('Sample Size (n) must be at least 2')];

      const seGiven = provided(se);
      const ciGiven = provided(ciLower) && provided(ciUpper);

      if (!seGiven && !ciGiven)
        return [err('Enter either a Standard Error, or both CI bounds, to derive SD.')];

      const zFromConfidence = level => {
        if (Math.abs(level - 90)   < 2.5) return 1.645;
        if (Math.abs(level - 99)   < 2.5) return 2.576;
        if (Math.abs(level - 99.9) < 0.5) return 3.291;
        return 1.96;
      };

      let sd, method;

      if (seGiven) {
        sd     = se * Math.sqrt(n);
        method = 'Standard Error';
      } else {
        if (ciUpper <= ciLower) return [err('CI upper bound must be greater than the lower bound')];
        const level = provided(confidenceLevel) ? confidenceLevel : 95;
        const z     = zFromConfidence(level);
        sd     = Math.sqrt(n) * (ciUpper - ciLower) / (2 * z);
        method = `${level}% Confidence Interval`;
      }

      const f = (v, dp = 4) => +v.toFixed(dp);

      return [
        { label: 'Derived Standard Deviation (SD)', value: f(sd),                ci: null, isRatio: false, highlight: true },
        { label: 'Method',                          value: method,               ci: null, isRatio: false, isText: true },
        { label: 'Back-Computed SE (SD / √n)',      value: f(sd / Math.sqrt(n)), ci: null, isRatio: false },
        { label: 'Sample Size (n)',                 value: n,                    ci: null, isRatio: false },
      ];
    }
  },

  /* ── 13. STANDARD ERROR OF A RATE ─────────────────────────────────────
     SE of an incidence rate (Poisson: Var(D) = D) from event count and
     person-time, with a log-based 95% CI.                              */
  {
    id:          'se-rate',
    name:        'Standard Error of a Rate',
    hint:        'SE(Rate) = √D / PT',
    category:    'Epidemiology & Risk',
    description: 'Computes the standard error of an incidence rate from the number of events and total person-time.',

    formulas: [
      {
        label: 'Incidence Rate',
        latex: 'Rate = \\dfrac{D}{PT}'
      },
      {
        label: 'Standard Error of the Rate (Poisson)',
        latex: 'SE(Rate) = \\dfrac{\\sqrt{D}}{PT}'
      },
      {
        label: 'SE of ln(Rate) & 95% CI',
        latex: 'SE(\\ln Rate) = \\dfrac{1}{\\sqrt{D}} \\qquad CI = Rate \\times e^{\\,\\pm 1.96 \\times SE(\\ln Rate)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'd',  label: 'Number of Events (D)',       default: 20  },
      { id: 'pt', label: 'Total Person-Time (PT)',     default: 500 },
    ],

    example({ d, pt }) {
      d = Math.round(d);
      if (!isFinite(d) || d < 0 || !isFinite(pt) || pt <= 0)
        return 'Enter a non-negative event count and positive person-time to see a worked medical example here.';
      const rate = d / pt;
      const seRate = Math.sqrt(d) / pt;
      const f = v => +v.toFixed(4);
      return `A registry records ${d} new cases over ${pt} person-years of follow-up, for an incidence rate of ${f(rate)} cases per person-year. SE(Rate) = ${f(seRate)} reflects that rates from few events (small D) are inherently noisy — the Poisson assumption Var(D) = D means doubling the event count without changing person-time only shrinks the relative SE by about 30%, not half.`;
    },

    calculate({ d, pt }) {
      d = Math.round(d);
      if (!isFinite(d) || d < 0)   return [err('Number of Events must be zero or greater')];
      if (!isFinite(pt) || pt <= 0) return [err('Total Person-Time must be greater than 0')];

      const rate   = d / pt;
      const seRate = Math.sqrt(d) / pt;

      const f = (v, dp = 6) => +v.toFixed(dp);

      const rows = [
        { label: 'Incidence Rate (D / PT)',           value: f(rate),   ci: null, isRatio: false, highlight: true },
        { label: 'Standard Error of the Rate (SE)',   value: f(seRate), ci: null, isRatio: false, highlight: true },
      ];

      if (d > 0) {
        const seLnRate = 1 / Math.sqrt(d);
        const ciLo = rate * Math.exp(-1.96 * seLnRate);
        const ciHi = rate * Math.exp(1.96 * seLnRate);
        rows.push(
          { label: 'SE of ln(Rate)',      value: f(seLnRate), ci: null, isRatio: false },
          { label: '95% CI Lower Bound',  value: f(ciLo),     ci: null, isRatio: false },
          { label: '95% CI Upper Bound',  value: f(ciHi),     ci: null, isRatio: false },
        );
      } else {
        rows.push({
          label: '95% CI', isText: true, ci: null, isRatio: false,
          value: 'Requires at least 1 event to compute a confidence interval.'
        });
      }

      return rows;
    }
  },

  /* ── 14. STANDARD ERROR OF A CORRELATION COEFFICIENT ──────────────────
     SE(r) via the t-distribution formula, plus a Fisher z-transform
     95% CI for r.                                                      */
  {
    id:          'se-correlation',
    name:        'Standard Error of a Correlation Coefficient',
    hint:        'SE(r) = √((1−r²)/(n−2))',
    category:    'Correlation & Regression',
    description: 'Computes the standard error of a Pearson correlation coefficient from r and sample size, plus a Fisher z-based 95% CI.',

    formulas: [
      {
        label: 'Standard Error of r',
        latex: 'SE(r) = \\sqrt{\\dfrac{1-r^2}{n-2}}'
      },
      {
        label: 't-Statistic (df = n − 2)',
        latex: 't = \\dfrac{r\\sqrt{n-2}}{\\sqrt{1-r^2}}'
      },
      {
        label: "Fisher's z-Transform & 95% CI",
        latex: 'z = \\dfrac{1}{2}\\ln\\!\\left(\\dfrac{1+r}{1-r}\\right) \\qquad SE(z) = \\dfrac{1}{\\sqrt{n-3}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'r', label: 'Correlation Coefficient (r, −1 to 1)', default: 0.5 },
      { id: 'n', label: 'Sample Size (n)',                      default: 30  },
    ],

    example({ r, n }) {
      n = Math.round(n);
      if (!isFinite(r) || r <= -1 || r >= 1 || !isFinite(n) || n < 3)
        return 'Enter a correlation coefficient (strictly between -1 and 1) and sample size to see a worked medical example here.';
      const se = Math.sqrt((1 - r ** 2) / (n - 2));
      const f = v => +v.toFixed(3);
      return `A study of ${n} patients finds a correlation of r = ${r} between BMI and blood pressure. SE(r) = ${f(se)} shows how precisely that r estimates the true population correlation — a smaller study can report an identical r while being far less precise, which is why r alone, without its SE or a CI, can be misleading.`;
    },

    calculate({ r, n }) {
      n = Math.round(n);
      if (!isFinite(r) || r < -1 || r > 1) return [err('Correlation Coefficient must be between -1 and 1')];
      if (!isFinite(n) || n < 3)           return [err('Sample Size must be at least 3')];

      const f = (v, dp = 4) => +v.toFixed(dp);
      const rows = [];
      const isPerfect = Math.abs(r) >= 1;

      if (isPerfect) {
        rows.push({
          label: 'Standard Error of r (SE)', isText: true, ci: null, isRatio: false,
          value: 'SE is 0 at a perfect correlation (r = ±1).'
        });
      } else {
        const seR = Math.sqrt((1 - r * r) / (n - 2));
        const t   = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
        rows.push(
          { label: 'Standard Error of r (SE)', value: f(seR), ci: null, isRatio: false, highlight: true },
          { label: 't-Statistic (df = n − 2)', value: f(t),   ci: null, isRatio: false },
        );
      }

      if (!isPerfect && n >= 4) {
        const z   = 0.5 * Math.log((1 + r) / (1 - r));
        const seZ = 1 / Math.sqrt(n - 3);
        const rLo = Math.tanh(z - 1.96 * seZ);
        const rHi = Math.tanh(z + 1.96 * seZ);
        rows.push(
          { label: "Fisher's z", value: f(z),   ci: null, isRatio: false },
          { label: 'SE of z',    value: f(seZ), ci: null, isRatio: false },
          { label: '95% CI Lower Bound (r)', value: f(rLo), ci: null, isRatio: false },
          { label: '95% CI Upper Bound (r)', value: f(rHi), ci: null, isRatio: false },
        );
      } else {
        rows.push({
          label: "Fisher's z 95% CI", isText: true, ci: null, isRatio: false,
          value: 'Requires n ≥ 4 and |r| < 1 to compute a confidence interval.'
        });
      }

      return rows;
    }
  },

  /* ── 15. STANDARD ERROR OF A RATE RATIO ───────────────────────────────
     SE of ln(Rate Ratio) between two Poisson rates (event count &
     person-time per group), with a log-based 95% CI.                   */
  {
    id:          'se-rate-ratio',
    name:        'Standard Error of a Rate Ratio',
    hint:        'SE(ln IRR) = √(1/D₁ + 1/D₂)',
    category:    'Epidemiology & Risk',
    description: 'Computes the standard error of ln(Rate Ratio) and a 95% CI from two groups\' event counts and person-time.',

    formulas: [
      {
        label: 'Rate Ratio (IRR)',
        latex: 'IRR = \\dfrac{D_1/PT_1}{D_2/PT_2}'
      },
      {
        label: 'Standard Error of ln(IRR)',
        latex: 'SE(\\ln IRR) = \\sqrt{\\dfrac{1}{D_1} + \\dfrac{1}{D_2}}'
      },
      {
        label: '95% Confidence Interval',
        latex: 'CI = IRR \\times e^{\\,\\pm 1.96 \\times SE(\\ln IRR)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'd1',  label: 'Group 1 Events (D₁)',      default: 20  },
      { id: 'pt1', label: 'Group 1 Person-Time (PT₁)', default: 500 },
      { id: 'd2',  label: 'Group 2 Events (D₂)',      default: 10  },
      { id: 'pt2', label: 'Group 2 Person-Time (PT₂)', default: 500 },
    ],

    example({ d1, pt1, d2, pt2 }) {
      d1 = Math.round(d1); d2 = Math.round(d2);
      if (!isFinite(d1) || d1 < 0 || !isFinite(d2) || d2 <= 0 || !isFinite(pt1) || pt1 <= 0 || !isFinite(pt2) || pt2 <= 0)
        return 'Enter event counts and person-time for both groups (Group 2 needs at least 1 event) to see a worked medical example here.';
      const irr = (d1 / pt1) / (d2 / pt2);
      const f = v => +v.toFixed(3);
      let extra = '';
      if (d1 > 0) {
        const seLnIRR = Math.sqrt(1 / d1 + 1 / d2);
        extra = ` SE(ln IRR) = ${f(seLnIRR)} — driven mainly by whichever group has fewer events, since 1/D₁ and 1/D₂ add directly.`;
      }
      return `Two hospital units track infection counts: Unit A has ${d1} infections over ${pt1} patient-days, Unit B has ${d2} over ${pt2}. IRR = ${f(irr)} means Unit A's infection rate is about ${f(irr)}× Unit B's.${extra}`;
    },

    calculate({ d1, pt1, d2, pt2 }) {
      d1 = Math.round(d1);
      d2 = Math.round(d2);
      if (!isFinite(d1) || d1 < 0)    return [err('Group 1 Events must be zero or greater')];
      if (!isFinite(d2) || d2 < 0)    return [err('Group 2 Events must be zero or greater')];
      if (!isFinite(pt1) || pt1 <= 0) return [err('Group 1 Person-Time must be greater than 0')];
      if (!isFinite(pt2) || pt2 <= 0) return [err('Group 2 Person-Time must be greater than 0')];
      if (d2 === 0) return [err('Group 2 must have at least 1 event to compute a rate ratio')];

      const rate1 = d1 / pt1, rate2 = d2 / pt2;
      const irr   = rate1 / rate2;

      const f = (v, dp = 4) => +v.toFixed(dp);

      const hasSE   = d1 > 0;
      const seLnIRR = hasSE ? Math.sqrt(1 / d1 + 1 / d2) : null;
      const ci      = hasSE ? [irr * Math.exp(-1.96 * seLnIRR), irr * Math.exp(1.96 * seLnIRR)] : null;

      const rows = [
        { label: 'Group 1 Rate (D₁ / PT₁)', value: f(rate1, 6), ci: null, isRatio: false },
        { label: 'Group 2 Rate (D₂ / PT₂)', value: f(rate2, 6), ci: null, isRatio: false },
        { label: 'Rate Ratio (IRR)', value: f(irr), ci: ci ? [f(ci[0]), f(ci[1])] : null, isRatio: true, highlight: true },
      ];

      if (hasSE) {
        rows.push({ label: 'SE of ln(IRR)', value: f(seLnIRR), ci: null, isRatio: false, highlight: true });
      } else {
        rows.push({
          label: 'SE of ln(IRR) / 95% CI', isText: true, ci: null, isRatio: false,
          value: 'Requires at least 1 event in Group 1 to compute SE and a confidence interval.'
        });
      }

      return rows;
    }
  },

  /* ── 16. STANDARD ERROR OF A MEAN DIFFERENCE ──────────────────────────
     SE(x̄₁−x̄₂) for two independent samples, via both the pooled
     (equal-variance) and Welch (unequal-variance) methods.             */
  {
    id:          'se-mean-diff',
    name:        'Standard Error of a Mean Difference',
    hint:        'SE(x̄₁−x̄₂) = √(s₁²/n₁ + s₂²/n₂)',
    category:    'T-Tests & Z-Tests',
    description: 'Computes the standard error of the difference between two independent sample means, using pooled and Welch (unequal-variance) methods.',

    formulas: [
      {
        label: 'Pooled SD & SE (equal variances assumed)',
        latex: 's_{pooled} = \\sqrt{\\dfrac{(n_1-1)s_1^2+(n_2-1)s_2^2}{n_1+n_2-2}} \\qquad SE_{pooled} = s_{pooled}\\sqrt{\\dfrac{1}{n_1}+\\dfrac{1}{n_2}}'
      },
      {
        label: "Welch SE (unequal variances)",
        latex: 'SE_{Welch} = \\sqrt{\\dfrac{s_1^2}{n_1}+\\dfrac{s_2^2}{n_2}}'
      },
      {
        label: '95% CI (optional, needs both means)',
        latex: '(\\bar{x}_1-\\bar{x}_2) \\pm 1.96 \\times SE_{Welch}'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
      { prefix: 'mean', label: 'Mean — optional, for CI' },
    ],
    inputs: [
      { id: 'sd1',   label: 'Group 1 SD (s₁)',                    default: 10 },
      { id: 'n1',    label: 'Group 1 Size (n₁)',                  default: 30 },
      { id: 'sd2',   label: 'Group 2 SD (s₂)',                    default: 12 },
      { id: 'n2',    label: 'Group 2 Size (n₂)',                  default: 28 },
      { id: 'mean1', label: 'Group 1 Mean (x̄₁) — optional, for CI', default: '' },
      { id: 'mean2', label: 'Group 2 Mean (x̄₂) — optional, for CI', default: '' },
    ],

    example({ sd1, n1, sd2, n2, mean1, mean2 }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      n1 = Math.round(n1); n2 = Math.round(n2);
      if (!isFinite(sd1) || sd1 <= 0 || !isFinite(sd2) || sd2 <= 0 || !isFinite(n1) || n1 < 2 || !isFinite(n2) || n2 < 2)
        return 'Enter SD and sample size for both groups to see a worked medical example here.';
      const seWelch = Math.sqrt(sd1 ** 2 / n1 + sd2 ** 2 / n2);
      const f = v => +v.toFixed(2);
      const meanPart = provided(mean1) && provided(mean2)
        ? ` With group means of ${mean1} and ${mean2}, that gives a difference of ${f(mean1 - mean2)} with a 95% CI of about [${f((mean1 - mean2) - 1.96 * seWelch)}, ${f((mean1 - mean2) + 1.96 * seWelch)}].`
        : '';
      return `Two hospital wards report cholesterol levels: ward A has SD ${sd1} over ${n1} patients, ward B has SD ${sd2} over ${n2} patients. Before running a full t-test, this gives the standard error of the difference between the two ward means (Welch: ${f(seWelch)}) — the building block for both the t statistic and its confidence interval.${meanPart}`;
    },

    calculate({ sd1, n1, sd2, n2, mean1, mean2 }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      n1 = Math.round(n1);
      n2 = Math.round(n2);
      if (!isFinite(sd1) || sd1 <= 0) return [err('Group 1 SD must be greater than 0')];
      if (!isFinite(sd2) || sd2 <= 0) return [err('Group 2 SD must be greater than 0')];
      if (!isFinite(n1) || n1 < 2)    return [err('Group 1 Size must be at least 2')];
      if (!isFinite(n2) || n2 < 2)    return [err('Group 2 Size must be at least 2')];

      const f = (v, dp = 4) => +v.toFixed(dp);

      const sp       = Math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / (n1 + n2 - 2));
      const sePooled = sp * Math.sqrt(1 / n1 + 1 / n2);
      const seWelch  = Math.sqrt(sd1 ** 2 / n1 + sd2 ** 2 / n2);

      const rows = [
        { label: 'Pooled SD (s_pooled)',                        value: f(sp),       ci: null, isRatio: false },
        { label: 'SE of Mean Difference (Pooled)',              value: f(sePooled), ci: null, isRatio: false, highlight: true },
        { label: 'SE of Mean Difference (Welch, unequal var.)', value: f(seWelch),  ci: null, isRatio: false, highlight: true },
      ];

      if (provided(mean1) && provided(mean2)) {
        const diff   = mean1 - mean2;
        const margin = 1.96 * seWelch;
        rows.push({
          label: 'Mean Difference (x̄₁ − x̄₂)', value: f(diff),
          ci: [f(diff - margin), f(diff + margin)], isRatio: false, highlight: true
        });
      }

      return rows;
    }
  },

  /* ── 17. UNPAIRED T-TEST (WELCH'S) ─────────────────────────────────────
     Two-sample t-test for the difference of two independent means,
     using the Welch–Satterthwaite (unequal-variance) approximation.    */
  {
    id:          'unpaired-t-test',
    name:        "Unpaired t-Test (Welch's)",
    hint:        't = (x̄₁−x̄₂) / SE_Welch',
    category:    'T-Tests & Z-Tests',
    description: 'Compares means of two independent groups without assuming equal variances.',

    formulas: [
      {
        label: 'Welch Standard Error',
        latex: 'SE = \\sqrt{\\dfrac{s_1^2}{n_1} + \\dfrac{s_2^2}{n_2}}'
      },
      {
        label: "Welch's t-Statistic",
        latex: 't = \\dfrac{\\bar{x}_1 - \\bar{x}_2}{SE}'
      },
      {
        label: 'Welch–Satterthwaite Degrees of Freedom',
        latex: 'df = \\dfrac{\\left(\\tfrac{s_1^2}{n_1}+\\tfrac{s_2^2}{n_2}\\right)^{2}}{\\tfrac{1}{n_1-1}\\left(\\tfrac{s_1^2}{n_1}\\right)^{2} + \\tfrac{1}{n_2-1}\\left(\\tfrac{s_2^2}{n_2}\\right)^{2}}'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'mean', label: 'Mean (x̄)' },
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
    ],
    inputs: [
      { id: 'mean1', label: 'Group 1 Mean (x̄₁)', default: 25.4 },
      { id: 'sd1',   label: 'Group 1 SD (s₁)',   default: 4.2  },
      { id: 'n1',    label: 'Group 1 Size (n₁)', default: 15   },
      { id: 'mean2', label: 'Group 2 Mean (x̄₂)', default: 22.1 },
      { id: 'sd2',   label: 'Group 2 SD (s₂)',   default: 5.1  },
      { id: 'n2',    label: 'Group 2 Size (n₂)', default: 18   },
    ],

    example({ mean1, sd1, n1, mean2, sd2, n2 }) {
      n1 = Math.round(n1); n2 = Math.round(n2);
      if (!isFinite(mean1) || !isFinite(mean2) || !isFinite(sd1) || sd1 <= 0 || !isFinite(sd2) || sd2 <= 0 ||
          !isFinite(n1) || n1 < 2 || !isFinite(n2) || n2 < 2)
        return 'Enter means, SDs, and sample sizes for both groups to see a worked medical example here.';
      const se = Math.sqrt(sd1 ** 2 / n1 + sd2 ** 2 / n2);
      const t  = (mean1 - mean2) / se;
      const df = (sd1 ** 2 / n1 + sd2 ** 2 / n2) ** 2 / ((sd1 ** 2 / n1) ** 2 / (n1 - 1) + (sd2 ** 2 / n2) ** 2 / (n2 - 1));
      const f = v => +v.toFixed(2);
      let pText = '';
      if (typeof jStat !== 'undefined' && jStat.studentt) {
        const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
        pText = ` (${formatPText(p)})`;
      }
      return `A trial compares recovery time (days) between two treatments without assuming equal variability — common when comparing a new treatment to a well-established one. Group 1 averages ${mean1} days (n=${n1}, SD ${sd1}), Group 2 averages ${mean2} days (n=${n2}, SD ${sd2}). Welch's t = ${f(t)} with df ≈ ${f(df)}${pText} tests whether that difference could be due to chance.`;
    },

    calculate({ mean1, sd1, n1, mean2, sd2, n2 }) {
      n1 = Math.round(n1);
      n2 = Math.round(n2);
      if (!isFinite(mean1) || !isFinite(mean2)) return [err('Both group means are required')];
      if (!isFinite(sd1) || sd1 <= 0)           return [err('Group 1 SD must be greater than 0')];
      if (!isFinite(sd2) || sd2 <= 0)           return [err('Group 2 SD must be greater than 0')];
      if (!isFinite(n1) || n1 < 2)              return [err('Group 1 Size must be at least 2')];
      if (!isFinite(n2) || n2 < 2)              return [err('Group 2 Size must be at least 2')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const v1   = sd1 ** 2 / n1;
      const v2   = sd2 ** 2 / n2;
      const diff = mean1 - mean2;
      const se   = Math.sqrt(v1 + v2);
      const t    = diff / se;
      const df   = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1));

      const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
      const tCrit  = jStat.studentt.inv(0.975, df);
      const margin = tCrit * se;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Mean Difference (x̄₁ − x̄₂)', value: f(diff), ci: [f(diff - margin), f(diff + margin)], isRatio: false, highlight: true },
        { label: 'Welch Standard Error (SE)',   value: f(se),   ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)',     value: f(df, 2), ci: null, isRatio: false },
        { label: 't-Statistic',                 value: f(t),    ci: null, isRatio: false, highlight: true },
        { label: 't-Critical (two-tailed, α = 0.05)', value: f(tCrit), ci: null, isRatio: false },
        { label: 'p-value (two-tailed)',        value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — means differ significantly' : 'Fail to reject H₀ — no significant difference',
          ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 17b. EQUIVALENCE / NON-INFERIORITY TEST (TOST) ─────────────────────
     Two One-Sided Tests (TOST) procedure, reusing the exact same
     Welch SE and Welch-Satterthwaite df as 'Unpaired t-Test (Welch's)'
     above — the only thing that changes is testing the difference
     against a margin ±Δ instead of against 0. Equivalence requires
     BOTH one-sided tests to be significant (equivalently: the
     (1−2α)% CI falls entirely inside [−Δ, +Δ]); non-inferiority tests
     only the lower bound and assumes higher values of the outcome are
     better — swap Group 1/2 if lower is better for your outcome.    */
  {
    id:          'equivalence-test',
    name:        'Equivalence / Non-Inferiority Test (TOST)',
    hint:        'TOST: significant on both sides ⇒ equivalent',
    category:    'T-Tests & Z-Tests',
    description: 'Tests whether the difference between two independent group means is small enough to be considered equivalent (or non-inferior) to a pre-specified margin, using the two one-sided tests (TOST) procedure.',

    formulas: [
      {
        label: 'Welch Standard Error & Degrees of Freedom',
        latex: 'SE = \\sqrt{\\dfrac{s_1^2}{n_1}+\\dfrac{s_2^2}{n_2}} \\qquad df = \\dfrac{\\left(\\tfrac{s_1^2}{n_1}+\\tfrac{s_2^2}{n_2}\\right)^2}{\\tfrac{1}{n_1-1}\\left(\\tfrac{s_1^2}{n_1}\\right)^2+\\tfrac{1}{n_2-1}\\left(\\tfrac{s_2^2}{n_2}\\right)^2}'
      },
      {
        label: 'Two One-Sided Tests (Equivalence)',
        latex: 't_{lower} = \\dfrac{(\\bar x_1-\\bar x_2)+\\Delta}{SE} \\qquad t_{upper} = \\dfrac{(\\bar x_1-\\bar x_2)-\\Delta}{SE}'
      },
      {
        label: 'One-Sided Test (Non-Inferiority)',
        latex: 't = \\dfrac{(\\bar x_1-\\bar x_2)+\\Delta}{SE}, \\quad \\text{non-inferior if } P(T>t) < \\alpha'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'mean', label: 'Mean (x̄)' },
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
    ],
    groupLabels: ['New Treatment', 'Reference/Standard'],
    inputs: [
      { id: 'testType', type: 'select', label: 'Test Type', default: 'equivalence',
        note: 'Equivalence tests both directions at once (the difference could favor either group). Non-inferiority tests only whether Group 1 is not meaningfully worse than Group 2 — pick whichever matches your study question.',
        options: [
          { value: 'equivalence',    label: 'Equivalence (two-sided margin ±Δ)' },
          { value: 'noninferiority', label: 'Non-Inferiority (one-sided, Group 1 ≥ Group 2 − Δ)' },
        ] },
      { id: 'mean1',  label: 'Group 1 Mean (x̄₁) — e.g. New Treatment', default: 98  },
      { id: 'sd1',    label: 'Group 1 SD (s₁)',                        default: 12  },
      { id: 'n1',     label: 'Group 1 Size (n₁)',                      default: 40  },
      { id: 'mean2',  label: 'Group 2 Mean (x̄₂) — e.g. Reference/Standard', default: 100 },
      { id: 'sd2',    label: 'Group 2 SD (s₂)',                        default: 11  },
      { id: 'n2',     label: 'Group 2 Size (n₂)',                      default: 40  },
      { id: 'margin', label: 'Equivalence / Non-Inferiority Margin (Δ, same units as the means)', default: 10 },
      { id: 'alpha',  label: 'Significance Level (α, one-sided per test)', default: 0.05 },
    ],

    example({ testType, mean1, sd1, n1, mean2, sd2, n2, margin, alpha }) {
      n1 = Math.round(n1); n2 = Math.round(n2);
      if (!isFinite(mean1) || !isFinite(mean2) || !isFinite(sd1) || sd1 <= 0 || !isFinite(sd2) || sd2 <= 0 ||
          !isFinite(n1) || n1 < 2 || !isFinite(n2) || n2 < 2 || !isFinite(margin) || margin <= 0 ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 0.5 || typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter both groups, a margin, and an alpha to see a worked medical example here.';
      const diff = mean1 - mean2;
      const SE = Math.sqrt(sd1 ** 2 / n1 + sd2 ** 2 / n2);
      const df = (sd1 ** 2 / n1 + sd2 ** 2 / n2) ** 2 /
        ((sd1 ** 2 / n1) ** 2 / (n1 - 1) + (sd2 ** 2 / n2) ** 2 / (n2 - 1));
      const f = v => +v.toFixed(2);
      if (testType === 'noninferiority') {
        const t = (diff + margin) / SE;
        const p = 1 - jStat.studentt.cdf(t, df);
        const tail = p < alpha ? 'non-inferior — not meaningfully worse than the standard treatment' : 'not (yet) shown to be non-inferior';
        return `A generic drug (mean effect ${mean1}, n=${n1}) is compared to the standard reference treatment (mean ${mean2}, n=${n2}). Rather than requiring the generic to beat the standard, non-inferiority testing only asks whether it's within Δ=${margin} units of being just as good: t = ${f(t)}, ${formatPText(p)} — the generic is ${tail}.`;
      }
      const tLower = (diff + margin) / SE, tUpper = (diff - margin) / SE;
      const pLower = 1 - jStat.studentt.cdf(tLower, df), pUpper = jStat.studentt.cdf(tUpper, df);
      const isEquivalent = pLower < alpha && pUpper < alpha;
      const tail = isEquivalent
        ? 'equivalent — the difference is unlikely to exceed the margin in either direction'
        : 'not (yet) shown to be equivalent';
      return `A generic drug (mean effect ${mean1}, n=${n1}) is compared to a brand-name reference (mean ${mean2}, n=${n2}) for bioequivalence. Rather than testing for "no difference" (which a small study could pass just by being underpowered), TOST tests both one-sided directions against a pre-agreed margin Δ=${margin}: the two drugs are ${tail}.`;
    },

    calculate({ testType, mean1, sd1, n1, mean2, sd2, n2, margin, alpha }) {
      n1 = Math.round(n1); n2 = Math.round(n2);
      if (!isFinite(mean1) || !isFinite(mean2)) return [err('Both group means are required')];
      if (!isFinite(sd1) || sd1 <= 0 || !isFinite(sd2) || sd2 <= 0) return [err('Both group SDs must be greater than 0')];
      if (!isFinite(n1) || n1 < 2 || !isFinite(n2) || n2 < 2)       return [err('Both group sizes must be at least 2')];
      if (!isFinite(margin) || margin <= 0)                         return [err('The margin (Δ) must be greater than 0')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 0.5)           return [err('Significance Level must be between 0 and 0.5 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const diff = mean1 - mean2;
      const SE   = Math.sqrt(sd1 ** 2 / n1 + sd2 ** 2 / n2);
      const df   = (sd1 ** 2 / n1 + sd2 ** 2 / n2) ** 2 /
        ((sd1 ** 2 / n1) ** 2 / (n1 - 1) + (sd2 ** 2 / n2) ** 2 / (n2 - 1));

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const tCritOneSided = jStat.studentt.inv(1 - alpha, df);

      if (testType === 'noninferiority') {
        const t = (diff + margin) / SE;
        const p = 1 - jStat.studentt.cdf(t, df);
        const ciLo = diff - tCritOneSided * SE;
        const isNonInferior = p < alpha;

        return [
          { label: 'Mean Difference (x̄₁ − x̄₂)', value: f(diff), ci: null, isRatio: false, highlight: true },
          { label: `One-Sided Lower ${Math.round((1 - alpha) * 100)}% Confidence Bound`, value: f(ciLo), ci: null, isRatio: false },
          { label: 'Standard Error (Welch) / df', value: `${f(SE)} / ${f(df, 1)}`, ci: null, isRatio: false, isText: true },
          { label: 'Non-Inferiority Test — H₀: diff ≤ −Δ', isText: true, ci: null, isRatio: false,
            value: `t = ${f(t)}, ${formatPText(p)}` },
          { label: `Conclusion (α = ${alpha})`, isText: true, ci: null, isRatio: false, highlight: true,
            value: isNonInferior
              ? 'Non-inferior — Group 1 is not worse than Group 2 by more than the margin Δ'
              : 'Not (yet) shown to be non-inferior — cannot rule out that Group 1 is worse than Group 2 by more than Δ' },
          { label: 'Note', isText: true, ci: null, isRatio: false,
            value: 'Assumes higher values of the outcome are better, so non-inferiority means Group 1 is not more than Δ lower than Group 2. If lower is better for your outcome, swap which group is entered as Group 1.' },
          { label: 'Non-Inferiority Zone', isSVG: true, svg: equivalenceZoneSVG(diff, ciLo, diff, -margin, null) },
        ];
      }

      const tLower = (diff + margin) / SE;
      const tUpper = (diff - margin) / SE;
      const pLower = 1 - jStat.studentt.cdf(tLower, df);
      const pUpper = jStat.studentt.cdf(tUpper, df);
      const ciLo = diff - tCritOneSided * SE;
      const ciHi = diff + tCritOneSided * SE;
      const isEquivalent = pLower < alpha && pUpper < alpha;
      const ciPct = Math.round((1 - 2 * alpha) * 100);

      return [
        { label: 'Mean Difference (x̄₁ − x̄₂)', value: f(diff), ci: [f(ciLo), f(ciHi)], isRatio: false, highlight: true },
        { label: `${ciPct}% CI Decision Rule`, isText: true, ci: null, isRatio: false,
          value: `Equivalent if this CI falls entirely within [−Δ, +Δ] = [${f(-margin)}, ${f(margin)}]` },
        { label: 'Standard Error (Welch) / df', value: `${f(SE)} / ${f(df, 1)}`, ci: null, isRatio: false, isText: true },
        { label: 'Lower Bound Test — H₀: diff ≤ −Δ', isText: true, ci: null, isRatio: false,
          value: `t = ${f(tLower)}, ${formatPText(pLower)}` },
        { label: 'Upper Bound Test — H₀: diff ≥ +Δ', isText: true, ci: null, isRatio: false,
          value: `t = ${f(tUpper)}, ${formatPText(pUpper)}` },
        { label: `Conclusion (α = ${alpha} per side)`, isText: true, ci: null, isRatio: false, highlight: true,
          value: isEquivalent
            ? 'Equivalent — both one-sided tests are significant, so the true difference is unlikely to exceed the margin in either direction'
            : 'Not (yet) shown to be equivalent — at least one one-sided test is not significant' },
        { label: 'Equivalence Zone', isSVG: true, svg: equivalenceZoneSVG(diff, ciLo, ciHi, -margin, margin) },
      ];
    }
  },

  /* ── 18. TWO-SAMPLE Z-TEST (MEANS) ─────────────────────────────────────
     Two-sample z-test for the difference of two independent means,
     for known population SDs (or large-n samples).                     */
  {
    id:          'two-sample-z-test',
    name:        'Two-Sample z-Test (Means)',
    hint:        'z = (x̄₁−x̄₂) / √(σ₁²/n₁+σ₂²/n₂)',
    category:    'T-Tests & Z-Tests',
    description: 'Tests whether two independent population means differ, when both population standard deviations are known.',

    formulas: [
      {
        label: 'Standard Error',
        latex: 'SE = \\sqrt{\\dfrac{\\sigma_1^2}{n_1}+\\dfrac{\\sigma_2^2}{n_2}}'
      },
      {
        label: 'z-Statistic',
        latex: 'z = \\dfrac{\\bar{x}_1-\\bar{x}_2}{SE}'
      },
      {
        label: '95% Confidence Interval',
        latex: '(\\bar{x}_1-\\bar{x}_2) \\pm 1.96 \\times SE'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'mean',  label: 'Mean (x̄)' },
      { prefix: 'sigma', label: 'Population SD (σ)' },
      { prefix: 'n',     label: 'Size (n)' },
    ],
    inputs: [
      { id: 'mean1',  label: 'Group 1 Mean (x̄₁)',            default: 101.2 },
      { id: 'sigma1', label: 'Group 1 Population SD (σ₁)',   default: 15    },
      { id: 'n1',     label: 'Group 1 Size (n₁)',            default: 40    },
      { id: 'mean2',  label: 'Group 2 Mean (x̄₂)',            default: 97.5  },
      { id: 'sigma2', label: 'Group 2 Population SD (σ₂)',   default: 15    },
      { id: 'n2',     label: 'Group 2 Size (n₂)',            default: 45    },
    ],

    example({ mean1, sigma1, n1, mean2, sigma2, n2 }) {
      n1 = Math.round(n1); n2 = Math.round(n2);
      if (!isFinite(mean1) || !isFinite(mean2) || !isFinite(sigma1) || sigma1 <= 0 || !isFinite(sigma2) || sigma2 <= 0 ||
          !isFinite(n1) || n1 < 1 || !isFinite(n2) || n2 < 1)
        return 'Enter means, population SDs, and sample sizes for both groups to see a worked medical example here.';
      const se = Math.sqrt(sigma1 ** 2 / n1 + sigma2 ** 2 / n2);
      const z  = (mean1 - mean2) / se;
      const f  = v => +v.toFixed(2);
      const pText = (typeof jStat !== 'undefined' && jStat.normal) ? ` (${formatPText(normalTwoTailedP(z))})` : '';
      return `A large population health survey compares blood pressure between two well-characterized regions where the population SD is already known from prior studies (σ₁=${sigma1}, σ₂=${sigma2}) rather than estimated from this sample — which is what lets a z-test be used instead of a t-test. Region 1 averages ${mean1} (n=${n1}), Region 2 averages ${mean2} (n=${n2}); z = ${f(z)}${pText} tests whether that gap reflects a real regional difference.`;
    },

    calculate({ mean1, sigma1, n1, mean2, sigma2, n2 }) {
      n1 = Math.round(n1);
      n2 = Math.round(n2);
      if (!isFinite(mean1) || !isFinite(mean2))   return [err('Both group means are required')];
      if (!isFinite(sigma1) || sigma1 <= 0)       return [err('Group 1 population SD must be greater than 0')];
      if (!isFinite(sigma2) || sigma2 <= 0)       return [err('Group 2 population SD must be greater than 0')];
      if (!isFinite(n1) || n1 < 1)                return [err('Group 1 Size must be at least 1')];
      if (!isFinite(n2) || n2 < 1)                return [err('Group 2 Size must be at least 1')];

      const diff   = mean1 - mean2;
      const se     = Math.sqrt(sigma1 ** 2 / n1 + sigma2 ** 2 / n2);
      const z      = diff / se;
      const pValue = normalTwoTailedP(z);
      const margin = 1.96 * se;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Mean Difference (x̄₁ − x̄₂)', value: f(diff), ci: [f(diff - margin), f(diff + margin)], isRatio: false, highlight: true },
        { label: 'Standard Error (SE)',         value: f(se),   ci: null, isRatio: false },
        { label: 'z-Statistic',                 value: f(z),    ci: null, isRatio: false, highlight: true },
        { label: 'p-value (two-tailed)',        value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — means differ significantly' : 'Fail to reject H₀ — no significant difference',
          ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 19. 1-SAMPLE T-TEST ────────────────────────────────────────────────
     Tests a sample mean against a hypothesised population mean, σ
     unknown (estimated by the sample SD).                              */
  {
    id:          'one-sample-t-test',
    name:        '1-Sample t-Test',
    hint:        't = (x̄−μ₀) / (s/√n)',
    category:    'T-Tests & Z-Tests',
    description: 'Tests whether a sample mean differs from a known population mean.',

    formulas: [
      {
        label: 'Standard Error',
        latex: 'SE = \\dfrac{s}{\\sqrt{n}}'
      },
      {
        label: 't-Statistic',
        latex: 't = \\dfrac{\\bar{x}-\\mu_0}{SE} \\qquad df = n-1'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'mean', label: 'Sample Mean (x̄)',        default: 104.5 },
      { id: 'sd',   label: 'Sample SD (s)',           default: 12    },
      { id: 'n',    label: 'Sample Size (n)',         default: 20    },
      { id: 'mu0',  label: 'Hypothesized Mean (μ₀)',  default: 100   },
    ],

    example({ mean, sd, n, mu0 }) {
      n = Math.round(n);
      if (!isFinite(mean) || !isFinite(mu0) || !isFinite(sd) || sd <= 0 || !isFinite(n) || n < 2 ||
          typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter a sample mean, SD, sample size, and hypothesized mean to see a worked medical example here.';
      const se = sd / Math.sqrt(n);
      const df = n - 1;
      const t  = (mean - mu0) / se;
      const p  = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
      const f  = v => +v.toFixed(2);
      return `A clinic wants to know if its patients' average fasting glucose (${mean} mg/dL, SD ${sd}, n=${n}) differs from the established normal benchmark of ${mu0} mg/dL. Since the population SD isn't known and must be estimated from this sample, a t-test (not a z-test) applies: t = ${f(t)} with df = ${df}, ${formatPText(p)}.`;
    },

    calculate({ mean, sd, n, mu0 }) {
      n = Math.round(n);
      if (!isFinite(mean) || !isFinite(mu0)) return [err('Sample Mean and Hypothesized Mean are required')];
      if (!isFinite(sd) || sd <= 0)          return [err('Sample SD must be greater than 0')];
      if (!isFinite(n) || n < 2)             return [err('Sample Size must be at least 2')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const se = sd / Math.sqrt(n);
      const df = n - 1;
      const t  = (mean - mu0) / se;

      const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
      const tCrit  = jStat.studentt.inv(0.975, df);
      const margin = tCrit * se;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Sample Mean (x̄)',              value: f(mean), ci: [f(mean - margin), f(mean + margin)], isRatio: false, highlight: true },
        { label: 'Standard Error (SE)',           value: f(se),   ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)',       value: df,      ci: null, isRatio: false },
        { label: 't-Statistic',                   value: f(t),    ci: null, isRatio: false, highlight: true },
        { label: 't-Critical (two-tailed, α = 0.05)', value: f(tCrit), ci: null, isRatio: false },
        { label: 'p-value (two-tailed)',          value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — mean differs significantly from μ₀' : 'Fail to reject H₀ — no significant difference from μ₀',
          ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 20. PAIRED T-TEST ──────────────────────────────────────────────────
     Tests the mean of paired differences against 0, using the SD of
     the differences (same math as the 1-sample t-test, applied to d̄). */
  {
    id:          'paired-t-test',
    name:        'Paired t-Test',
    hint:        't = d̄ / (s_d/√n)',
    category:    'T-Tests & Z-Tests',
    description: 'Tests the mean difference between paired or matched observations.',

    formulas: [
      {
        label: 'Standard Error of the Mean Difference',
        latex: 'SE = \\dfrac{s_d}{\\sqrt{n}}'
      },
      {
        label: 't-Statistic',
        latex: 't = \\dfrac{\\bar{d}}{SE} \\qquad df = n-1'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'meanDiff', label: 'Mean of Differences (d̄)', default: 3.2 },
      { id: 'sdDiff',   label: 'SD of Differences (s_d)',  default: 5.4 },
      { id: 'n',        label: 'Number of Pairs (n)',      default: 16  },
    ],

    example({ meanDiff, sdDiff, n }) {
      n = Math.round(n);
      if (!isFinite(meanDiff) || !isFinite(sdDiff) || sdDiff <= 0 || !isFinite(n) || n < 2 ||
          typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter the mean and SD of the differences and the number of pairs to see a worked medical example here.';
      const se = sdDiff / Math.sqrt(n);
      const df = n - 1;
      const t  = meanDiff / se;
      const p  = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
      const f  = v => +v.toFixed(2);
      return `${n} patients have their blood pressure measured before and after starting a new medication. The average within-patient drop is ${meanDiff} mmHg (SD of the differences ${sdDiff}) — pairing before/after measurements on the same patient removes between-patient variability that would otherwise swamp the signal. t = ${f(t)} with df = ${df}, ${formatPText(p)}.`;
    },

    calculate({ meanDiff, sdDiff, n }) {
      n = Math.round(n);
      if (!isFinite(meanDiff))       return [err('Mean of Differences is required')];
      if (!isFinite(sdDiff) || sdDiff <= 0) return [err('SD of Differences must be greater than 0')];
      if (!isFinite(n) || n < 2)     return [err('Number of Pairs must be at least 2')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const se = sdDiff / Math.sqrt(n);
      const df = n - 1;
      const t  = meanDiff / se;

      const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
      const tCrit  = jStat.studentt.inv(0.975, df);
      const margin = tCrit * se;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Mean Difference (d̄)',           value: f(meanDiff), ci: [f(meanDiff - margin), f(meanDiff + margin)], isRatio: false, highlight: true },
        { label: 'Standard Error (SE)',            value: f(se), ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)',        value: df,    ci: null, isRatio: false },
        { label: 't-Statistic',                    value: f(t),  ci: null, isRatio: false, highlight: true },
        { label: 't-Critical (two-tailed, α = 0.05)', value: f(tCrit), ci: null, isRatio: false },
        { label: 'p-value (two-tailed)',           value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — mean difference is significant' : 'Fail to reject H₀ — no significant mean difference',
          ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 21. 1-SAMPLE Z-TEST ────────────────────────────────────────────────
     Tests a sample mean against a hypothesised population mean, with
     known population SD (σ).                                          */
  {
    id:          'one-sample-z-test',
    name:        '1-Sample z-Test',
    hint:        'z = (x̄−μ₀) / (σ/√n)',
    category:    'T-Tests & Z-Tests',
    description: 'Tests a sample mean against a population mean when σ is known.',

    formulas: [
      {
        label: 'Standard Error',
        latex: 'SE = \\dfrac{\\sigma}{\\sqrt{n}}'
      },
      {
        label: 'z-Statistic',
        latex: 'z = \\dfrac{\\bar{x}-\\mu_0}{SE}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'mean',  label: 'Sample Mean (x̄)',       default: 104.5 },
      { id: 'sigma', label: 'Population SD (σ)',      default: 12    },
      { id: 'n',     label: 'Sample Size (n)',        default: 30    },
      { id: 'mu0',   label: 'Hypothesized Mean (μ₀)', default: 100   },
    ],

    example({ mean, sigma, n, mu0 }) {
      n = Math.round(n);
      if (!isFinite(mean) || !isFinite(mu0) || !isFinite(sigma) || sigma <= 0 || !isFinite(n) || n < 1)
        return 'Enter a sample mean, population SD, sample size, and hypothesized mean to see a worked medical example here.';
      const se = sigma / Math.sqrt(n);
      const z  = (mean - mu0) / se;
      const f  = v => +v.toFixed(2);
      return `A well-studied lab assay has a known population SD (σ=${sigma}) from decades of prior data. A clinic's sample of ${n} patients averages ${mean}, versus a reference benchmark of ${mu0}. Because σ is already known (not estimated from this sample), a z-test applies directly: z = ${f(z)}, ${formatPText(normalTwoTailedP(z))}.`;
    },

    calculate({ mean, sigma, n, mu0 }) {
      n = Math.round(n);
      if (!isFinite(mean) || !isFinite(mu0)) return [err('Sample Mean and Hypothesized Mean are required')];
      if (!isFinite(sigma) || sigma <= 0)    return [err('Population SD must be greater than 0')];
      if (!isFinite(n) || n < 1)             return [err('Sample Size must be at least 1')];

      const se     = sigma / Math.sqrt(n);
      const z      = (mean - mu0) / se;
      const pValue = normalTwoTailedP(z);
      const margin = 1.96 * se;

      const f = (n, dp = 4) => +(n.toFixed(dp));

      return [
        { label: 'Sample Mean (x̄)',      value: f(mean), ci: [f(mean - margin), f(mean + margin)], isRatio: false, highlight: true },
        { label: 'Standard Error (SE)',   value: f(se),   ci: null, isRatio: false },
        { label: 'z-Statistic',           value: f(z),    ci: null, isRatio: false, highlight: true },
        { label: 'p-value (two-tailed)',  value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — mean differs significantly from μ₀' : 'Fail to reject H₀ — no significant difference from μ₀',
          ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 22. Z-TEST PROPORTIONS (1-SAMPLE) ─────────────────────────────────
     Tests an observed sample proportion against a hypothesised value,
     using the null proportion for the test SE (standard convention).   */
  {
    id:          'z-test-prop-1samp',
    name:        'z-Test Proportions (1-Sample)',
    hint:        'z = (p−p₀) / √(p₀(1−p₀)/n)',
    category:    'T-Tests & Z-Tests',
    description: 'Tests whether an observed proportion differs from a hypothesised value.',

    formulas: [
      {
        label: 'Standard Error (under H₀)',
        latex: 'SE = \\sqrt{\\dfrac{p_0(1-p_0)}{n}}'
      },
      {
        label: 'z-Statistic',
        latex: 'z = \\dfrac{p-p_0}{SE}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'p',  label: 'Sample Proportion (p, 0–1)',       default: 0.42 },
      { id: 'p0', label: 'Hypothesized Proportion (p₀, 0–1)', default: 0.5  },
      { id: 'n',  label: 'Sample Size (n)',                  default: 80   },
    ],

    example({ p, p0, n }) {
      n = Math.round(n);
      if (!isFinite(p) || p < 0 || p > 1 || !isFinite(p0) || p0 <= 0 || p0 >= 1 || !isFinite(n) || n < 1)
        return 'Enter a sample proportion, hypothesized proportion, and sample size to see a worked medical example here.';
      const se = Math.sqrt(p0 * (1 - p0) / n);
      const z  = (p - p0) / se;
      const f  = v => +v.toFixed(1);
      return `A clinic wants to know if its vaccination rate (${f(p * 100)}% of ${n} patients) differs from the national target of ${f(p0 * 100)}%. z = ${(+z.toFixed(2))}, ${formatPText(normalTwoTailedP(z))} tests whether this clinic's rate is a real departure from the target or within expected sampling variation.`;
    },

    calculate({ p, p0, n }) {
      n = Math.round(n);
      if (!isFinite(p) || p < 0 || p > 1)   return [err('Sample Proportion must be between 0 and 1')];
      if (!isFinite(p0) || p0 <= 0 || p0 >= 1) return [err('Hypothesized Proportion must be between 0 and 1 (exclusive)')];
      if (!isFinite(n) || n < 1)             return [err('Sample Size must be at least 1')];

      const se     = Math.sqrt(p0 * (1 - p0) / n);
      const z      = (p - p0) / se;
      const pValue = normalTwoTailedP(z);
      const seSample = Math.sqrt(p * (1 - p) / n);
      const margin   = 1.96 * seSample;
      const ciLo     = Math.max(0, p - margin);
      const ciHi     = Math.min(1, p + margin);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Sample Proportion (p)', value: f(p), ci: [f(ciLo), f(ciHi)], isRatio: false, highlight: true },
        { label: 'Standard Error (under H₀)', value: f(se), ci: null, isRatio: false },
        { label: 'z-Statistic',           value: f(z),  ci: null, isRatio: false, highlight: true },
        { label: 'p-value (two-tailed)',  value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — proportion differs significantly from p₀' : 'Fail to reject H₀ — no significant difference from p₀',
          ci: null, isRatio: false, isText: true },
      ];

      if (n * p0 < 5 || n * (1 - p0) < 5) {
        rows.push({
          label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'n·p₀ or n·(1−p₀) is below 5 — the normal approximation may be unreliable; consider an exact binomial test.'
        });
      }

      return rows;
    }
  },

  /* ── 23. Z-TEST PROPORTIONS (2-SAMPLE) ─────────────────────────────────
     Tests whether two independent proportions are equal, using the
     pooled proportion for the test SE and the unpooled SE for the CI
     (standard convention — matches the ARD CI in Measures of Association). */
  {
    id:          'z-test-prop-2samp',
    name:        'z-Test Proportions (2-Sample)',
    hint:        'z = (p₁−p₂) / SE_pooled',
    category:    'T-Tests & Z-Tests',
    description: 'Tests whether two independent proportions are equal.',

    formulas: [
      {
        label: 'Pooled Proportion & Standard Error (under H₀)',
        latex: '\\hat{p} = \\dfrac{n_1p_1+n_2p_2}{n_1+n_2} \\qquad SE_{pooled} = \\sqrt{\\hat{p}(1-\\hat{p})\\left(\\dfrac{1}{n_1}+\\dfrac{1}{n_2}\\right)}'
      },
      {
        label: 'z-Statistic',
        latex: 'z = \\dfrac{p_1-p_2}{SE_{pooled}}'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'p', label: 'Proportion (p, 0–1)' },
      { prefix: 'n', label: 'Size (n)' },
    ],
    inputs: [
      { id: 'p1', label: 'Group 1 Proportion (p₁, 0–1)', default: 0.35 },
      { id: 'n1', label: 'Group 1 Size (n₁)',            default: 60   },
      { id: 'p2', label: 'Group 2 Proportion (p₂, 0–1)', default: 0.22 },
      { id: 'n2', label: 'Group 2 Size (n₂)',            default: 55   },
    ],

    example({ p1, n1, p2, n2 }) {
      n1 = Math.round(n1); n2 = Math.round(n2);
      if (!isFinite(p1) || p1 < 0 || p1 > 1 || !isFinite(p2) || p2 < 0 || p2 > 1 || !isFinite(n1) || n1 < 1 || !isFinite(n2) || n2 < 1)
        return 'Enter both groups’ proportions and sample sizes to see a worked medical example here.';
      const pPooled  = (n1 * p1 + n2 * p2) / (n1 + n2);
      const sePooled = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
      const z        = (p1 - p2) / sePooled;
      const f = v => +v.toFixed(1);
      return `In a trial, ${f(p1 * 100)}% of ${n1} patients on Drug A relapse, versus ${f(p2 * 100)}% of ${n2} patients on Drug B. z = ${(+z.toFixed(2))}, ${formatPText(normalTwoTailedP(z))} tests whether that relapse-rate gap between the two drugs is likely real or could arise from chance alone.`;
    },

    calculate({ p1, n1, p2, n2 }) {
      n1 = Math.round(n1);
      n2 = Math.round(n2);
      if (!isFinite(p1) || p1 < 0 || p1 > 1) return [err('Group 1 Proportion must be between 0 and 1')];
      if (!isFinite(p2) || p2 < 0 || p2 > 1) return [err('Group 2 Proportion must be between 0 and 1')];
      if (!isFinite(n1) || n1 < 1)           return [err('Group 1 Size must be at least 1')];
      if (!isFinite(n2) || n2 < 1)           return [err('Group 2 Size must be at least 1')];

      const pPooled   = (n1 * p1 + n2 * p2) / (n1 + n2);
      const sePooled  = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
      const diff      = p1 - p2;
      const z         = diff / sePooled;
      const pValue    = normalTwoTailedP(z);
      const seUnpooled = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
      const margin     = 1.96 * seUnpooled;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Proportion Difference (p₁ − p₂)', value: f(diff), ci: [f(diff - margin), f(diff + margin)], isRatio: false, highlight: true },
        { label: 'Pooled Proportion (p̂)',           value: f(pPooled), ci: null, isRatio: false },
        { label: 'Pooled Standard Error (under H₀)', value: f(sePooled), ci: null, isRatio: false },
        { label: 'z-Statistic',                      value: f(z), ci: null, isRatio: false, highlight: true },
        { label: 'p-value (two-tailed)',             value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — proportions differ significantly' : 'Fail to reject H₀ — no significant difference in proportions',
          ci: null, isRatio: false, isText: true },
      ];

      if (n1 * pPooled < 5 || n1 * (1 - pPooled) < 5 || n2 * pPooled < 5 || n2 * (1 - pPooled) < 5) {
        rows.push({
          label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'Pooled expected count is below 5 in at least one group — the normal approximation may be unreliable.'
        });
      }

      return rows;
    }
  },

  /* ── 24. SAMPLE SIZE — 1-SAMPLE MEAN ───────────────────────────────────
     Required n to detect a mean difference δ from a known/assumed σ,
     at significance α and target power.                                */
  {
    id:          'sample-size-1mean',
    name:        'Sample Size — 1-Sample Mean',
    hint:        'n = ((z_α/2+z_power)·σ/δ)²',
    category:    'Power & Sample Size',
    description: 'Determines the sample size needed to detect a specified difference from a hypothesised mean, given σ, alpha, and target power.',

    formulas: [
      {
        label: 'Required Sample Size',
        latex: 'n = \\left(\\dfrac{(z_{\\alpha/2}+z_{power})\\,\\sigma}{\\delta}\\right)^{2}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'alpha', label: 'Significance Level (α, two-tailed)', default: 0.05 },
      { id: 'power', label: 'Target Power (1−β)',                 default: 0.80 },
      { id: 'sigma', label: 'Population SD (σ)',                  default: 15   },
      { id: 'delta', label: 'Minimum Detectable Difference (δ)',  default: 5    },
    ],

    example({ alpha, power, sigma, delta }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1 || !isFinite(power) || power <= 0 || power >= 1 ||
          !isFinite(sigma) || sigma <= 0 || !isFinite(delta) || delta === 0 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter alpha, target power, SD, and a minimum detectable difference to see a worked medical example here.';
      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const n = Math.ceil(((zAlpha + zPower) * sigma / Math.abs(delta)) ** 2);
      return `A researcher plans a study to detect whether a new drug shifts a lab value by at least ${Math.abs(delta)} units, given the value's known population SD of ${sigma}, at α = ${alpha} and ${(power * 100).toFixed(0)}% power. This says you need n = ${n} patients — enroll fewer and you risk missing a real effect (an underpowered study); enroll far more and you're spending resources on a foregone conclusion.`;
    },

    calculate({ alpha, power, sigma, delta }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(power) || power <= 0 || power >= 1) return [err('Target Power must be between 0 and 1 (exclusive)')];
      if (!isFinite(sigma) || sigma <= 0)               return [err('Population SD must be greater than 0')];
      if (!isFinite(delta) || delta === 0)              return [err('Minimum Detectable Difference must not be 0')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const n      = Math.ceil(((zAlpha + zPower) * sigma / Math.abs(delta)) ** 2);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Required Sample Size (n)', value: n, ci: null, isRatio: false, highlight: true },
        { label: 'z (α/2)',                  value: f(zAlpha), ci: null, isRatio: false },
        { label: 'z (power)',                value: f(zPower), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 25. SAMPLE SIZE — DIFFERENCE OF TWO MEANS ─────────────────────────
     Required n per group to detect a mean difference δ between two
     independent groups with common SD σ (equal group sizes assumed).   */
  {
    id:          'sample-size-2mean',
    name:        'Sample Size — Difference of Two Means',
    hint:        'n/group = 2(z_α/2+z_power)²σ²/δ²',
    category:    'Power & Sample Size',
    description: 'Determines the per-group sample size needed to detect a specified difference between two independent means, given a common σ, alpha, and target power.',

    formulas: [
      {
        label: 'Required Sample Size (per group)',
        latex: 'n_{\\text{per group}} = \\dfrac{2\\,(z_{\\alpha/2}+z_{power})^{2}\\,\\sigma^{2}}{\\delta^{2}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'alpha', label: 'Significance Level (α, two-tailed)', default: 0.05 },
      { id: 'power', label: 'Target Power (1−β)',                 default: 0.80 },
      { id: 'sigma', label: 'Common Population SD (σ)',           default: 15   },
      { id: 'delta', label: 'Minimum Detectable Mean Difference (δ)', default: 5 },
    ],

    example({ alpha, power, sigma, delta }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1 || !isFinite(power) || power <= 0 || power >= 1 ||
          !isFinite(sigma) || sigma <= 0 || !isFinite(delta) || delta === 0 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter alpha, target power, SD, and a minimum detectable difference to see a worked medical example here.';
      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const n = Math.ceil(2 * (zAlpha + zPower) ** 2 * sigma ** 2 / delta ** 2);
      return `A trial plans to compare a new treatment against placebo, wanting to detect a difference of at least ${Math.abs(delta)} units (common SD ${sigma}) at α = ${alpha} and ${(power * 100).toFixed(0)}% power. This says you need n = ${n} patients per arm (${n * 2} total) — the per-group requirement doubles versus a 1-sample design, since now both group means carry sampling uncertainty.`;
    },

    calculate({ alpha, power, sigma, delta }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(power) || power <= 0 || power >= 1) return [err('Target Power must be between 0 and 1 (exclusive)')];
      if (!isFinite(sigma) || sigma <= 0)               return [err('Common Population SD must be greater than 0')];
      if (!isFinite(delta) || delta === 0)              return [err('Minimum Detectable Mean Difference must not be 0')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const n      = Math.ceil(2 * (zAlpha + zPower) ** 2 * sigma ** 2 / delta ** 2);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Required Sample Size (per group)', value: n,     ci: null, isRatio: false, highlight: true },
        { label: 'Required Total Sample Size (N)',    value: n * 2, ci: null, isRatio: false },
        { label: 'z (α/2)',                           value: f(zAlpha), ci: null, isRatio: false },
        { label: 'z (power)',                         value: f(zPower), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 26. SAMPLE SIZE — 1-SAMPLE PROPORTION ─────────────────────────────
     Required n to distinguish a hypothesised proportion p₀ from an
     alternative p₁, at significance α and target power.                */
  {
    id:          'sample-size-1prop',
    name:        'Sample Size — 1-Sample Proportion',
    hint:        'n = (z_α/2√(p₀q₀)+z_power√(p₁q₁))² / (p₁−p₀)²',
    category:    'Power & Sample Size',
    description: 'Determines the sample size needed to detect a difference between a hypothesised proportion and an alternative, given alpha and target power.',

    formulas: [
      {
        label: 'Required Sample Size',
        latex: 'n = \\dfrac{\\left(z_{\\alpha/2}\\sqrt{p_0(1-p_0)} + z_{power}\\sqrt{p_1(1-p_1)}\\right)^{2}}{(p_1-p_0)^{2}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'alpha', label: 'Significance Level (α, two-tailed)', default: 0.05 },
      { id: 'power', label: 'Target Power (1−β)',                 default: 0.80 },
      { id: 'p0',    label: 'Hypothesized Proportion (p₀, 0–1)',  default: 0.50 },
      { id: 'p1',    label: 'Alternative Proportion (p₁, 0–1)',   default: 0.65 },
    ],

    example({ alpha, power, p0, p1 }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1 || !isFinite(power) || power <= 0 || power >= 1 ||
          !isFinite(p0) || p0 <= 0 || p0 >= 1 || !isFinite(p1) || p1 <= 0 || p1 >= 1 || p1 === p0 ||
          typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter alpha, target power, and two distinct proportions to see a worked medical example here.';
      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const num = zAlpha * Math.sqrt(p0 * (1 - p0)) + zPower * Math.sqrt(p1 * (1 - p1));
      const n = Math.ceil(num ** 2 / (p1 - p0) ** 2);
      return `A vaccine is expected to raise the seroconversion rate from a historical ${(p0 * 100).toFixed(0)}% (p₀) to ${(p1 * 100).toFixed(0)}% (p₁). To reliably detect that shift at α = ${alpha} and ${(power * 100).toFixed(0)}% power, you'd need to enroll n = ${n} patients — smaller expected shifts between p₀ and p₁ need much larger samples to detect reliably.`;
    },

    calculate({ alpha, power, p0, p1 }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(power) || power <= 0 || power >= 1) return [err('Target Power must be between 0 and 1 (exclusive)')];
      if (!isFinite(p0) || p0 <= 0 || p0 >= 1)          return [err('Hypothesized Proportion must be between 0 and 1 (exclusive)')];
      if (!isFinite(p1) || p1 <= 0 || p1 >= 1)          return [err('Alternative Proportion must be between 0 and 1 (exclusive)')];
      if (p1 === p0)                                    return [err('Alternative Proportion must differ from the Hypothesized Proportion')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const num    = zAlpha * Math.sqrt(p0 * (1 - p0)) + zPower * Math.sqrt(p1 * (1 - p1));
      const n      = Math.ceil(num ** 2 / (p1 - p0) ** 2);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Required Sample Size (n)', value: n, ci: null, isRatio: false, highlight: true },
        { label: 'z (α/2)',                  value: f(zAlpha), ci: null, isRatio: false },
        { label: 'z (power)',                value: f(zPower), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 27. SAMPLE SIZE — DIFFERENCE OF TWO PROPORTIONS ───────────────────
     Required n per group to distinguish two independent proportions
     p₁ and p₂, at significance α and target power.                     */
  {
    id:          'sample-size-2prop',
    name:        'Sample Size — Difference of Two Proportions',
    hint:        'n/group = (z_α/2√(2p̄q̄)+z_power√(p₁q₁+p₂q₂))² / (p₁−p₂)²',
    category:    'Power & Sample Size',
    description: 'Determines the per-group sample size needed to detect a difference between two independent proportions, given alpha and target power.',

    formulas: [
      {
        label: 'Required Sample Size (per group)',
        latex: 'n_{\\text{per group}} = \\dfrac{\\left(z_{\\alpha/2}\\sqrt{2\\bar p(1-\\bar p)} + z_{power}\\sqrt{p_1(1-p_1)+p_2(1-p_2)}\\right)^{2}}{(p_1-p_2)^{2}}, \\quad \\bar p = \\dfrac{p_1+p_2}{2}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'alpha', label: 'Significance Level (α, two-tailed)', default: 0.05 },
      { id: 'power', label: 'Target Power (1−β)',                 default: 0.80 },
      { id: 'p1',    label: 'Group 1 Proportion (p₁, 0–1)',       default: 0.50 },
      { id: 'p2',    label: 'Group 2 Proportion (p₂, 0–1)',       default: 0.35 },
    ],

    example({ alpha, power, p1, p2 }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1 || !isFinite(power) || power <= 0 || power >= 1 ||
          !isFinite(p1) || p1 <= 0 || p1 >= 1 || !isFinite(p2) || p2 <= 0 || p2 >= 1 || p1 === p2 ||
          typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter alpha, target power, and two distinct group proportions to see a worked medical example here.';
      const pBar = (p1 + p2) / 2;
      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const num = zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
      const n = Math.ceil(num ** 2 / (p1 - p2) ** 2);
      return `A trial expects a ${(p1 * 100).toFixed(0)}% response rate on the new drug versus ${(p2 * 100).toFixed(0)}% on placebo. To detect that gap at α = ${alpha} and ${(power * 100).toFixed(0)}% power, you'd need n = ${n} patients per arm (${n * 2} total) — this is why trials chasing a small expected benefit often need to be much larger than trials targeting a dramatic one.`;
    },

    calculate({ alpha, power, p1, p2 }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(power) || power <= 0 || power >= 1) return [err('Target Power must be between 0 and 1 (exclusive)')];
      if (!isFinite(p1) || p1 <= 0 || p1 >= 1)          return [err('Group 1 Proportion must be between 0 and 1 (exclusive)')];
      if (!isFinite(p2) || p2 <= 0 || p2 >= 1)          return [err('Group 2 Proportion must be between 0 and 1 (exclusive)')];
      if (p1 === p2)                                    return [err('Group 1 and Group 2 Proportions must differ')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const pBar   = (p1 + p2) / 2;
      const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const zPower = jStat.normal.inv(power, 0, 1);
      const num    = zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
      const n      = Math.ceil(num ** 2 / (p1 - p2) ** 2);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Required Sample Size (per group)', value: n,     ci: null, isRatio: false, highlight: true },
        { label: 'Required Total Sample Size (N)',    value: n * 2, ci: null, isRatio: false },
        { label: 'z (α/2)',                           value: f(zAlpha), ci: null, isRatio: false },
        { label: 'z (power)',                         value: f(zPower), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 27a. SAMPLE SIZE FOR A SURVEY ───────────────────────────────────────
     Precision-based sample size for estimating a single population
     proportion within a margin of error — the formula most surveys
     actually need, as opposed to the power-based tests above (which are
     built to detect a *difference* between two proportions). Optional
     finite population correction and response-rate adjustment, both
     skipped when left blank.                                            */
  {
    id:          'sample-size-survey',
    name:        'Sample Size for a Survey',
    hint:        'n = z²p(1−p) / e²  (+ FPC, response rate)',
    category:    'Power & Sample Size',
    description: 'Determines how many respondents are needed to estimate a population proportion within a target margin of error, with optional finite-population correction and response-rate adjustment.',

    formulas: [
      {
        label: 'Required Sample Size (margin of error)',
        latex: 'n_0 = \\dfrac{z^{2}\\,p(1-p)}{e^{2}}'
      },
      {
        label: 'Finite Population Correction (optional — known population size N)',
        latex: 'n_{adj} = \\dfrac{n_0}{1+\\dfrac{n_0-1}{N}}'
      },
      {
        label: 'Adjusting for Expected Response Rate (optional)',
        latex: '\\text{contacts needed} = \\dfrac{n_{adj}}{\\text{response rate}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'confidence',     label: 'Confidence Level (e.g. 0.95 for 95%)',                              default: 0.95 },
      { id: 'p',              label: 'Expected Proportion (p, 0–1; use 0.5 if unknown)',                   default: 0.50 },
      { id: 'marginOfError',  label: 'Margin of Error (e, e.g. 0.05 for ±5%)',                             default: 0.05 },
      { id: 'populationSize', label: 'Population Size (N) — optional, for finite population correction',   default: '' },
      { id: 'responseRate',   label: 'Expected Response Rate (0–1) — optional',                            default: '' },
    ],

    example({ confidence, p, marginOfError, populationSize, responseRate }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      if (!isFinite(confidence) || confidence <= 0 || confidence >= 1 ||
          !isFinite(p) || p <= 0 || p >= 1 ||
          !isFinite(marginOfError) || marginOfError <= 0 || marginOfError >= 1 ||
          typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter a confidence level, expected proportion, and margin of error to see a worked example here.';

      const z  = jStat.normal.inv(1 - (1 - confidence) / 2, 0, 1);
      const n0 = Math.ceil((z ** 2 * p * (1 - p)) / marginOfError ** 2);
      let n = n0;
      if (provided(populationSize) && populationSize > 0) n = Math.ceil(n0 / (1 + (n0 - 1) / populationSize));

      const pct = v => (v * 100).toFixed(v * 100 % 1 === 0 ? 0 : 1);
      let msg = `You want to estimate the share of patients satisfied with a new clinic workflow, expecting around ${pct(p)}% satisfaction, within ±${pct(marginOfError)} percentage points at ${pct(confidence)}% confidence. That takes n = ${n} completed responses.`;
      if (provided(responseRate) && responseRate > 0 && responseRate <= 1) {
        const contacts = Math.ceil(n / responseRate);
        msg += ` At an expected ${pct(responseRate)}% response rate, you'd need to contact about ${contacts} people to get there.`;
      }
      return msg;
    },

    calculate({ confidence, p, marginOfError, populationSize, responseRate }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      if (!isFinite(confidence) || confidence <= 0 || confidence >= 1) return [err('Confidence Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(p) || p <= 0 || p >= 1)                            return [err('Expected Proportion must be between 0 and 1 (exclusive)')];
      if (!isFinite(marginOfError) || marginOfError <= 0 || marginOfError >= 1) return [err('Margin of Error must be between 0 and 1 (exclusive)')];
      if (provided(populationSize) && populationSize <= 0)             return [err('Population Size must be greater than 0')];
      if (provided(responseRate) && (responseRate <= 0 || responseRate > 1)) return [err('Expected Response Rate must be between 0 (exclusive) and 1')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const z  = jStat.normal.inv(1 - (1 - confidence) / 2, 0, 1);
      const n0 = Math.ceil((z ** 2 * p * (1 - p)) / marginOfError ** 2);

      const hasFPC = provided(populationSize) && populationSize > 0;
      const hasRR  = provided(responseRate) && responseRate > 0 && responseRate <= 1;

      const nAdj = hasFPC ? Math.ceil(n0 / (1 + (n0 - 1) / populationSize)) : n0;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Critical Value (z)', value: f(z), ci: null, isRatio: false },
        { label: 'Base Sample Size (n₀, margin of error only)', value: n0, ci: null, isRatio: false, highlight: !hasFPC && !hasRR },
      ];

      if (hasFPC) {
        rows.push({ label: `Sample Size with Finite Population Correction (N = ${populationSize})`, value: nAdj, ci: null, isRatio: false, highlight: !hasRR });
      }

      let finalN = nAdj;
      if (hasRR) {
        const contacts = Math.ceil(finalN / responseRate);
        rows.push({ label: `Respondents to Contact (at ${f(responseRate * 100, 1)}% expected response rate)`, value: contacts, ci: null, isRatio: false, highlight: true });
      }

      rows.push({ label: 'Note', isText: true, ci: null, isRatio: false,
        value: 'Uses p = 0.5 by default, the "worst case" that maximizes required n and guarantees your margin of error holds no matter what the true proportion turns out to be — enter a more specific estimate here if you have one from prior research, and the required sample size will usually shrink. Finite population correction only matters when your sample is a large fraction of a small, known population; for large or unknown populations it has virtually no effect.' });

      return rows;
    }
  },

  /* ── 28. 1-WAY ANOVA ────────────────────────────────────────────────────
     F-test for differences among 3–6 independent group means, from
     each group's mean, SD, and n. Groups 4–6 are optional.             */
  {
    id:          'anova-1way',
    name:        '1-Way ANOVA',
    hint:        'F = MSB / MSW',
    category:    'ANOVA',
    description: 'Tests for differences in means across three or more independent groups.',

    formulas: [
      {
        label: 'Sums of Squares',
        latex: 'SS_B = \\sum_i n_i(\\bar{x}_i-\\bar{x})^2 \\qquad SS_W = \\sum_i (n_i-1)s_i^2'
      },
      {
        label: 'Mean Squares & F-Statistic',
        latex: 'MS_B = \\dfrac{SS_B}{k-1} \\qquad MS_W = \\dfrac{SS_W}{N-k} \\qquad F = \\dfrac{MS_B}{MS_W}'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'mean', label: 'Mean (x̄)' },
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
    ],
    inputs: groupInputs([
      { mean: 78, sd: 6,   n: 15 },
      { mean: 82, sd: 5.5, n: 15 },
      { mean: 85, sd: 7,   n: 15 },
    ]),

    example(values) {
      const { groups, error } = gatherGroups(values);
      if (error || groups.length < 3 || groups.some(g => g.sd <= 0) || groups.some(g => g.n < 2) ||
          typeof jStat === 'undefined' || !jStat.centralF)
        return 'Enter mean, SD, and n for at least 3 groups to see a worked medical example here.';
      const { k, N, dfB, dfW, F } = anovaStats(groups);
      if (dfW < 1) return 'Enter larger group sizes to see a worked medical example here.';
      const pValue = 1 - jStat.centralF.cdf(F, dfB, dfW);
      const f = v => +v.toFixed(2);
      const tail = pValue < 0.05
        ? " — significant, worth a post-hoc test like Tukey's HSD to see which specific doses differ"
        : ' — not significant, no dose stands out from the rest';
      return `A trial compares average pain-relief scores across ${k} drug doses (N=${N} patients total). F = ${f(F)} tests whether the doses' means differ more than expected from random variation alone. ${formatPText(pValue)}${tail}.`;
    },

    calculate(values) {
      const { groups, error } = gatherGroups(values);
      if (error) return [err(error)];
      if (groups.length < 3)              return [err('Enter Mean, SD, and N for at least 3 groups')];
      if (groups.some(g => g.sd <= 0))    return [err('Each group SD must be greater than 0')];
      if (groups.some(g => g.n < 2))      return [err('Each group Size (n) must be at least 2')];
      if (typeof jStat === 'undefined' || !jStat.centralF)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const { k, N, grandMean, ssb, ssw, dfB, dfW, msb, msw, F } = anovaStats(groups);
      if (dfW < 1) return [err('Not enough data — within-groups degrees of freedom must be at least 1 (increase group sizes)')];

      const pValue = 1 - jStat.centralF.cdf(F, dfB, dfW);
      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Groups (k)',   value: k,          ci: null, isRatio: false },
        { label: 'Total Sample Size (N)',  value: N,          ci: null, isRatio: false },
        { label: 'Grand Mean',             value: f(grandMean), ci: null, isRatio: false },
        { label: 'SS Between (SSB)',       value: f(ssb),     ci: null, isRatio: false },
        { label: 'df Between',             value: dfB,        ci: null, isRatio: false },
        { label: 'MS Between (MSB)',       value: f(msb),     ci: null, isRatio: false },
        { label: 'SS Within (SSW)',        value: f(ssw),     ci: null, isRatio: false },
        { label: 'df Within',              value: dfW,        ci: null, isRatio: false },
        { label: 'MS Within (MSW)',        value: f(msw),     ci: null, isRatio: false },
        { label: 'F-Statistic',            value: f(F),       ci: null, isRatio: false, highlight: true },
        { label: 'p-value',                value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)',
          value: pValue < 0.05 ? 'Reject H₀ — at least one group mean differs significantly' : 'Fail to reject H₀ — no significant difference among group means',
          ci: null, isRatio: false, isText: true },
      ];
    }
  },

  /* ── 29. TUKEY'S HSD TEST ───────────────────────────────────────────────
     Post-hoc pairwise comparisons after a 1-Way ANOVA, using the
     Tukey–Kramer adjustment for unequal group sizes. Critical q-values
     are interpolated from the standard α = 0.05 studentized range
     table (k = 2 is computed exactly from the t-distribution, since
     the 2-group case reduces to q = √2 · t_{0.025,df}).               */
  {
    id:          'tukeys-hsd',
    name:        "Tukey's HSD Test",
    hint:        'HSD = q·√(MSW/2·(1/nᵢ+1/nⱼ))',
    category:    'ANOVA',
    description: 'Post-hoc pairwise comparisons controlling family-wise error rate after ANOVA.',

    formulas: [
      {
        label: 'Honestly Significant Difference (Tukey–Kramer)',
        latex: 'HSD_{ij} = q_{\\alpha,k,df_W}\\sqrt{\\dfrac{MS_W}{2}\\left(\\dfrac{1}{n_i}+\\dfrac{1}{n_j}\\right)}'
      },
      {
        label: 'Decision Rule',
        latex: '\\text{Significant if } |\\bar{x}_i-\\bar{x}_j| > HSD_{ij}'
      }
    ],

    inputLayout: 'groups',
    groupFields: [
      { prefix: 'mean', label: 'Mean (x̄)' },
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
    ],
    inputs: groupInputs([
      { mean: 78, sd: 6,   n: 15 },
      { mean: 82, sd: 5.5, n: 15 },
      { mean: 85, sd: 7,   n: 15 },
    ]),

    example(values) {
      const { groups, error } = gatherGroups(values);
      if (error || groups.length < 3 || groups.some(g => g.sd <= 0) || groups.some(g => g.n < 2) ||
          typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter mean, SD, and n for at least 3 groups to see a worked medical example here.';
      const { k, dfW, msw } = anovaStats(groups);
      if (dfW < 5) return 'Enter larger group sizes (within-groups df ≥ 5) to see a worked medical example here.';
      const q = tukeyQCritical(k, dfW);
      let nPairs = 0, nSig = 0;
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const gi = groups[i], gj = groups[j];
          const se = Math.sqrt(msw / 2 * (1 / gi.n + 1 / gj.n));
          const hsd = q * se;
          nPairs++;
          if (Math.abs(gi.mean - gj.mean) > hsd) nSig++;
        }
      }
      return `Following a significant 1-Way ANOVA across ${k} drug doses, Tukey's HSD checks all ${nPairs} pairwise comparisons at once while controlling the overall false-positive rate — unlike running ${nPairs} separate t-tests, which would inflate it. ${nSig} of ${nPairs} pairs show a significant difference after this correction.`;
    },

    calculate(values) {
      const { groups, error } = gatherGroups(values);
      if (error) return [err(error)];
      if (groups.length < 3)              return [err('Enter Mean, SD, and N for at least 3 groups')];
      if (groups.some(g => g.sd <= 0))    return [err('Each group SD must be greater than 0')];
      if (groups.some(g => g.n < 2))      return [err('Each group Size (n) must be at least 2')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const { k, dfW, msw } = anovaStats(groups);
      if (dfW < 5)
        return [err(`Within-groups degrees of freedom must be at least 5 for Tukey's HSD (currently ${dfW}) — increase group sizes`)];

      const q = tukeyQCritical(k, dfW);
      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'MS Within (MSW)', value: f(msw), ci: null, isRatio: false },
        { label: 'df Within',       value: dfW,    ci: null, isRatio: false },
        { label: `Critical q (α = 0.05, k = ${k})`, value: f(q), ci: null, isRatio: false, highlight: true },
      ];

      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const gi = groups[i], gj = groups[j];
          const diff = gi.mean - gj.mean;
          const se   = Math.sqrt(msw / 2 * (1 / gi.n + 1 / gj.n));
          const hsd  = q * se;
          rows.push({
            label:     `${gi.label} − ${gj.label} (Mean Diff.)`,
            value:     f(diff),
            ci:        [f(diff - hsd), f(diff + hsd)],
            isRatio:   false,
            highlight: Math.abs(diff) > hsd,
          });
        }
      }

      rows.push({
        label: 'Method', isText: true, ci: null, isRatio: false,
        value: 'Tukey–Kramer adjustment for unequal n. Highlighted pairs have a 95% CI on the mean difference that excludes 0 — significant after correcting for multiple comparisons.'
      });

      return rows;
    }
  },

  /* ── 30. DIAGNOSTIC TEST ACCURACY (2×2) ─────────────────────────────────
     Full diagnostic accuracy calculator from a Test-result × Disease-
     status 2×2 table: Se, Sp, PPV, NPV, LR+, LR−, and accuracy, each
     with a 95% CI (Wald for Se/Sp/PPV/NPV, log-based for the LRs —
     the standard Simel/Samsa/Matchar formula for likelihood ratios).
     Mirror image of the RR/OR-in-case-control issue: Se/Sp and the
     LRs condition on disease status (the columns here), so they stay
     valid even when diseased/healthy subjects were recruited
     separately rather than consecutively — but PPV, NPV, and overall
     accuracy all depend on the sample's disease prevalence, which is
     artificial (investigator-controlled) in that recruitment style. */
  {
    id:          'diagnostic-accuracy',
    name:        'Diagnostic Test Accuracy (2×2)',
    hint:        'Se · Sp · PPV · NPV · LR+ · LR−',
    category:    'Diagnostic Testing',
    description: 'Full diagnostic accuracy calculator: Se, Sp, PPV, NPV, LR+, LR−, and accuracy.',
    example({ a, b, c, d, sampleType }) {
      if (![a, b, c, d].every(v => isFinite(v) && v >= 0) || a + c === 0 || b + d === 0)
        return 'Enter counts for all four cells of the 2×2 table to see a worked medical example here.';
      const diseased = a + c, healthy = b + d;
      const Se = a / diseased, Sp = d / healthy;
      const pct = v => (v * 100).toFixed(1);
      if (sampleType === 'case-control')
        return `A study recruits ${diseased} already-confirmed cases and ${healthy} confirmed healthy controls separately (rather than testing a consecutive stream of patients) to evaluate a new test. The test catches ${a} of the cases and correctly clears ${d} of the controls — Se = ${pct(Se)}%, Sp = ${pct(Sp)}% and the LRs are still valid, since they condition on disease status, the very thing that was fixed by recruitment. But PPV/NPV computed from this table would be meaningless: the case:control ratio here reflects the investigator's recruitment quota, not real-world disease prevalence.`;
      return `A clinic evaluates a new test against a gold-standard reference in ${a + b + c + d} patients. Of the ${diseased} confirmed cases, the test catches ${a} (a) and misses ${c} (c) — sensitivity ${pct(Se)}%. Of the ${healthy} confirmed negatives, it wrongly flags ${b} (b) and correctly clears ${d} (d) — specificity ${pct(Sp)}%. PPV/NPV depend on this clinic's actual prevalence, while the LRs carry over to a population with a different prevalence.`;
    },

    formulas: [
      {
        label: 'Sensitivity & Specificity',
        latex: 'Se = \\dfrac{a}{a+c} \\qquad Sp = \\dfrac{d}{b+d}'
      },
      {
        label: 'Predictive Values',
        latex: 'PPV = \\dfrac{a}{a+b} \\qquad NPV = \\dfrac{d}{c+d}'
      },
      {
        label: 'Likelihood Ratios',
        latex: 'LR_{+} = \\dfrac{Se}{1-Sp} \\qquad LR_{-} = \\dfrac{1-Se}{Sp}'
      },
      {
        label: 'Accuracy',
        latex: 'Accuracy = \\dfrac{a+d}{a+b+c+d}'
      }
    ],

    inputLayout: '2x2',
    tableLabels: { colPos: 'Disease +', colNeg: 'Disease −', rowPos: 'Test +', rowNeg: 'Test −' },
    inputs: [
      { id: 'a', label: 'a', desc: 'True Positive (Test+ & Disease+)',  default: 85  },
      { id: 'b', label: 'b', desc: 'False Positive (Test+ & Disease−)', default: 15  },
      { id: 'c', label: 'c', desc: 'False Negative (Test− & Disease+)', default: 10  },
      { id: 'd', label: 'd', desc: 'True Negative (Test− & Disease−)',  default: 190 },
      { id: 'sampleType', type: 'select', label: 'Sample Recruitment (affects whether PPV/NPV are valid)', default: 'representative',
        note: 'Tell it how these four counts were collected. If diseased and healthy subjects were recruited as separate fixed-size groups rather than sampled as a consecutive stream of patients, choose Case-Control Style — PPV, NPV, and accuracy will be replaced with an explanation of why they can’t be trusted for that design, while sensitivity, specificity, and the likelihood ratios remain valid regardless.',
        options: [
          { value: 'representative', label: 'Representative / Consecutive — prevalence reflects the population' },
          { value: 'case-control',   label: 'Case-Control Style — diseased & healthy recruited separately' },
        ] },
    ],

    calculate({ a, b, c, d, sampleType }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v <= 0))
        return [err('All four cells must be greater than 0')];

      const diseased = a + c;  // Disease + column total
      const healthy  = b + d;  // Disease − column total
      const testPos  = a + b;  // Test + row total
      const testNeg  = c + d;  // Test − row total
      const N        = a + b + c + d;
      const Z        = 1.96;

      const Se  = a / diseased;
      const Sp  = d / healthy;
      const PPV = a / testPos;
      const NPV = d / testNeg;
      const acc = (a + d) / N;
      const LRpos = Se / (1 - Sp);
      const LRneg = (1 - Se) / Sp;

      const clip = v => Math.max(0, Math.min(1, v));
      const waldCI = (p, n) => [clip(p - Z * Math.sqrt(p * (1 - p) / n)), clip(p + Z * Math.sqrt(p * (1 - p) / n))];

      const CI_Se  = waldCI(Se, diseased);
      const CI_Sp  = waldCI(Sp, healthy);
      const CI_PPV = waldCI(PPV, testPos);
      const CI_NPV = waldCI(NPV, testNeg);
      const CI_acc = waldCI(acc, N);

      const SE_lnLRpos = Math.sqrt(1 / a - 1 / diseased + 1 / b - 1 / healthy);
      const SE_lnLRneg = Math.sqrt(1 / c - 1 / diseased + 1 / d - 1 / healthy);
      const CI_LRpos = [Math.exp(Math.log(LRpos) - Z * SE_lnLRpos), Math.exp(Math.log(LRpos) + Z * SE_lnLRpos)];
      const CI_LRneg = [Math.exp(Math.log(LRneg) - Z * SE_lnLRneg), Math.exp(Math.log(LRneg) + Z * SE_lnLRneg)];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const isCaseControl = sampleType === 'case-control';

      const rows = [
        { label: 'Sensitivity (Se)', value: f(Se), ci: [f(CI_Se[0]), f(CI_Se[1])], isRatio: false, highlight: true },
        { label: 'Specificity (Sp)', value: f(Sp), ci: [f(CI_Sp[0]), f(CI_Sp[1])], isRatio: false, highlight: true },
      ];

      if (isCaseControl) {
        rows.push({
          label: 'PPV, NPV & Accuracy — NOT VALID for this sample', isText: true, ci: null, isRatio: false, isError: true,
          value: `Not shown: this sample's disease prevalence (${diseased} of ${N}) reflects the recruitment quota, not real-world prevalence, so PPV (would read ${f(PPV)}), NPV (would read ${f(NPV)}), and accuracy computed from this table don't estimate real-world performance. Se, Sp, and the LRs are unaffected — they condition on disease status, the fixed margin.`
        });
      } else {
        rows.push(
          { label: 'Positive Predictive Value (PPV)', value: f(PPV), ci: [f(CI_PPV[0]), f(CI_PPV[1])], isRatio: false },
          { label: 'Negative Predictive Value (NPV)', value: f(NPV), ci: [f(CI_NPV[0]), f(CI_NPV[1])], isRatio: false },
        );
      }

      rows.push(
        { label: 'Positive Likelihood Ratio (LR+)', value: f(LRpos), ci: [f(CI_LRpos[0]), f(CI_LRpos[1])], isRatio: true, highlight: true },
        { label: 'Negative Likelihood Ratio (LR−)', value: f(LRneg), ci: [f(CI_LRneg[0]), f(CI_LRneg[1])], isRatio: true, highlight: true },
      );

      if (!isCaseControl) {
        rows.push({ label: 'Accuracy', value: f(acc), ci: [f(CI_acc[0]), f(CI_acc[1])], isRatio: false });
      }

      return rows;
    }
  },

  /* ── 31. CRITICAL VALUE & P-VALUE (T) ──────────────────────────────────
     Given a t statistic and degrees of freedom, returns its critical
     value and p-value. An optional point estimate backs out the
     implied standard error (SE = estimate / statistic).              */
  {
    id:          'critical-value-t',
    name:        'Critical Value & p-Value (t)',
    hint:        'p from t · t_α critical · SE = est./stat.',
    category:    'Probability & Distributions',
    description: 'Returns the critical t-value, two-tailed p-value, and implied standard error for a given t statistic and degrees of freedom.',

    formulas: [
      {
        label: 'Two-Tailed p-Value',
        latex: 'p = 2\\big(1-T_{df}(|t|)\\big)'
      },
      {
        label: 'Critical Value',
        latex: 't_{\\alpha/2,\\,df}\\;\\text{(two-tailed)} \\qquad t_{\\alpha,\\,df}\\;\\text{(one-tailed)}'
      },
      {
        label: 'Implied Standard Error',
        latex: 'SE = \\dfrac{|\\text{estimate}|}{|t|}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'statistic', label: 'Test Statistic (t)',                    default: 2.5  },
      { id: 'df',        label: 'Degrees of Freedom',                    default: 20   },
      { id: 'alpha',     label: 'Significance Level (α)',                default: 0.05 },
      { id: 'estimate',  label: 'Point Estimate (optional — to back out SE)', default: '' },
    ],

    example({ statistic, df, alpha, estimate }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      const dfR = Math.round(df);
      if (!isFinite(statistic) || !isFinite(alpha) || alpha <= 0 || alpha >= 1 || !isFinite(dfR) || dfR < 1 ||
          typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter a t statistic, degrees of freedom, and significance level to see a worked medical example here.';
      const pTwo = 2 * (1 - jStat.studentt.cdf(Math.abs(statistic), dfR));
      const critTwo = jStat.studentt.inv(1 - alpha / 2, dfR);
      const f = v => +v.toFixed(3);
      const sePart = provided(estimate)
        ? ` With a point estimate of ${estimate}, that implies a standard error of about ${f(Math.abs(estimate) / Math.abs(statistic))}.`
        : '';
      return `A trial comparing a new drug to placebo (df = ${dfR}) produces a t statistic of ${statistic}. The two-tailed p-value is ${f(pTwo)}${pTwo < alpha ? `, below the α = ${alpha} threshold — the difference is statistically significant` : `, above the α = ${alpha} threshold — not statistically significant`}. The critical value ±${f(critTwo)} marks the boundary a t statistic would need to cross at this α.${sePart}`;
    },

    calculate({ statistic, df, alpha, estimate }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      if (!isFinite(statistic))                          return [err('Test Statistic is required')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1)   return [err('Significance Level must be between 0 and 1 (exclusive)')];
      const dfR = Math.round(df);
      if (!isFinite(dfR) || dfR < 1)                      return [err('Degrees of Freedom must be at least 1')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const pTwo    = 2 * (1 - jStat.studentt.cdf(Math.abs(statistic), dfR));
      const critTwo = jStat.studentt.inv(1 - alpha / 2, dfR);
      const critOne = jStat.studentt.inv(1 - alpha, dfR);
      const pOne    = pTwo / 2;
      const isSignificant = pTwo < alpha;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Two-Tailed p-value',                value: formatPValue(pTwo), ci: null, isRatio: false, highlight: true },
        { label: 'One-Tailed p-value',                value: formatPValue(pOne), ci: null, isRatio: false },
        { label: `Critical Value (two-tailed, α = ${alpha})`, value: `±${f(critTwo)}`, ci: null, isRatio: false, isText: true },
        { label: `Critical Value (one-tailed, α = ${alpha})`, value: f(critOne), ci: null, isRatio: false },
      ];

      if (provided(estimate) && statistic !== 0) {
        rows.push({ label: 'Implied Standard Error (SE)', value: f(Math.abs(estimate / statistic)), ci: null, isRatio: false, highlight: true });
      }

      rows.push({
        label: `Interpretation (α = ${alpha})`, isText: true, ci: null, isRatio: false,
        value: isSignificant ? 'Statistically significant — |t| exceeds the critical value' : 'Not statistically significant — |t| does not exceed the critical value'
      });

      return rows;
    }
  },

  /* ── 32. CRITICAL VALUE & P-VALUE (Z) ──────────────────────────────────
     Given a z statistic, returns its critical value and p-value. An
     optional point estimate backs out the implied standard error
     (SE = estimate / statistic).                                     */
  {
    id:          'critical-value-z',
    name:        'Critical Value & p-Value (z)',
    hint:        'p from z · z_α critical · SE = est./stat.',
    category:    'Probability & Distributions',
    description: 'Returns the critical z-value, two-tailed p-value, and implied standard error for a given z statistic.',

    formulas: [
      {
        label: 'Two-Tailed p-Value',
        latex: 'p = 2\\big(1-\\Phi(|z|)\\big)'
      },
      {
        label: 'Critical Value',
        latex: 'z_{\\alpha/2}\\;\\text{(two-tailed)} \\qquad z_{\\alpha}\\;\\text{(one-tailed)}'
      },
      {
        label: 'Implied Standard Error',
        latex: 'SE = \\dfrac{|\\text{estimate}|}{|z|}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'statistic', label: 'Test Statistic (z)',                    default: 1.96 },
      { id: 'alpha',     label: 'Significance Level (α)',                default: 0.05 },
      { id: 'estimate',  label: 'Point Estimate (optional — to back out SE)', default: '' },
    ],

    example({ statistic, alpha, estimate }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      if (!isFinite(statistic) || !isFinite(alpha) || alpha <= 0 || alpha >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter a z statistic and significance level to see a worked medical example here.';
      const pTwo = 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1));
      const critTwo = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const f = v => +v.toFixed(3);
      const sePart = provided(estimate)
        ? ` With a point estimate of ${estimate}, that implies a standard error of about ${f(Math.abs(estimate) / Math.abs(statistic))}.`
        : '';
      return `A large public-health survey compares a proportion against a benchmark and produces a z statistic of ${statistic}. The two-tailed p-value is ${f(pTwo)}${pTwo < alpha ? `, below the α = ${alpha} threshold — the difference is statistically significant` : `, above the α = ${alpha} threshold — not statistically significant`}. The critical value ±${f(critTwo)} marks the boundary a z statistic would need to cross at this α.${sePart}`;
    },

    calculate({ statistic, alpha, estimate }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      if (!isFinite(statistic))                          return [err('Test Statistic is required')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1)   return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const pTwo    = normalTwoTailedP(statistic);
      const critTwo = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const critOne = jStat.normal.inv(1 - alpha, 0, 1);
      const pOne    = pTwo / 2;
      const isSignificant = pTwo < alpha;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Two-Tailed p-value',                value: formatPValue(pTwo), ci: null, isRatio: false, highlight: true },
        { label: 'One-Tailed p-value',                value: formatPValue(pOne), ci: null, isRatio: false },
        { label: `Critical Value (two-tailed, α = ${alpha})`, value: `±${f(critTwo)}`, ci: null, isRatio: false, isText: true },
        { label: `Critical Value (one-tailed, α = ${alpha})`, value: f(critOne), ci: null, isRatio: false },
      ];

      if (provided(estimate) && statistic !== 0) {
        rows.push({ label: 'Implied Standard Error (SE)', value: f(Math.abs(estimate / statistic)), ci: null, isRatio: false, highlight: true });
      }

      rows.push({
        label: `Interpretation (α = ${alpha})`, isText: true, ci: null, isRatio: false,
        value: isSignificant ? 'Statistically significant — |z| exceeds the critical value' : 'Not statistically significant — |z| does not exceed the critical value'
      });

      return rows;
    }
  },

  /* ── 33. Z-DISTRIBUTION TABLE ───────────────────────────────────────────
     Cumulative probability / critical-value lookup for a single z,
     plus the full classic Φ(z) reference table (z ≥ 0, by symmetry)
     rendered below. The lookup uses erf directly (no jStat needed);
     the critical-value rows are added only if jStat is available.    */
  {
    id:          'z-table',
    name:        'z-Distribution Table',
    hint:        'Φ(z) lookup + full z-table + critical values',
    category:    'Probability & Distributions',
    description: 'Looks up cumulative probabilities and critical values for the standard normal distribution.',

    formulas: [
      {
        label: 'Cumulative Probability',
        latex: '\\Phi(z) = P(Z \\le z) = \\tfrac{1}{2}\\left(1+\\operatorname{erf}\\!\\left(\\tfrac{z}{\\sqrt{2}}\\right)\\right)'
      },
      {
        label: 'Two-Tailed p-Value',
        latex: 'p = 2\\big(1-\\Phi(|z|)\\big)'
      },
      {
        label: 'Critical Value',
        latex: 'z_{\\alpha/2}\\;\\text{(two-tailed)} \\qquad z_{\\alpha}\\;\\text{(one-tailed)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'z',     label: 'z-Value to Look Up',              default: 1.96 },
      { id: 'alpha', label: 'Significance Level (α, two-tailed)', default: 0.05 },
    ],

    example({ z, alpha }) {
      if (!isFinite(z) || !isFinite(alpha) || alpha <= 0 || alpha >= 1)
        return 'Enter a z-value and significance level to see a worked medical example here.';
      const phi = 0.5 * (1 + erf(z / Math.SQRT2));
      const twoTailedP = normalTwoTailedP(z);
      return `A newborn's birth weight is z = ${z} standard deviations from the population mean on a standard growth chart. Φ(z) = ${(+phi.toFixed(4))} means about ${(phi * 100).toFixed(1)}% of newborns weigh less than this one. The two-tailed p-value (${formatPValue(twoTailedP)}) tells you how unusual a deviation this large is if this baby truly came from the reference population.`;
    },

    calculate({ z, alpha }) {
      if (!isFinite(z))                                 return [err('z-value is required')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];

      const phi        = 0.5 * (1 + erf(z / Math.SQRT2));
      const upperTail  = 1 - phi;
      const twoTailedP = normalTwoTailedP(z);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: `Cumulative Probability Φ(${f(z, 2)})`, value: f(phi, 6), ci: null, isRatio: false, highlight: true },
        { label: 'Upper-Tail Probability (1 − Φ(z))',    value: f(upperTail, 6), ci: null, isRatio: false },
        { label: 'Two-Tailed p-value',                   value: formatPValue(twoTailedP), ci: null, isRatio: false },
      ];

      if (typeof jStat !== 'undefined' && jStat.normal) {
        const critTwo = jStat.normal.inv(1 - alpha / 2, 0, 1);
        const critOne = jStat.normal.inv(1 - alpha, 0, 1);
        rows.push(
          { label: `Critical Value (two-tailed, α = ${alpha})`, value: `±${f(critTwo)}`, ci: null, isRatio: false, isText: true },
          { label: `Critical Value (one-tailed, α = ${alpha})`, value: f(critOne), ci: null, isRatio: false },
        );
      }

      rows.push({ isSVG: true, svg: zTableHTML(z) });

      return rows;
    }
  },

  /* ── 34. T-DISTRIBUTION TABLE ───────────────────────────────────────────
     Critical t-value lookup at any df/alpha, plus the classic
     textbook reference table (df down the side, one-tail α across
     the top) rendered below, computed via jStat rather than
     hardcoded so any df resolves exactly, not just table rows.       */
  {
    id:          't-table',
    name:        't-Distribution Table',
    hint:        't_{α,df} lookup + full t-table',
    category:    'Probability & Distributions',
    description: 'Returns critical t-values for one- and two-tailed tests at any df and alpha.',

    formulas: [
      {
        label: 'Critical Value',
        latex: 't_{\\alpha/2,\\,df}\\;\\text{(two-tailed)} \\qquad t_{\\alpha,\\,df}\\;\\text{(one-tailed)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'df',    label: 'Degrees of Freedom',                 default: 20   },
      { id: 'alpha', label: 'Significance Level (α, two-tailed)', default: 0.05 },
    ],

    example({ df, alpha }) {
      const dfR = Math.round(df);
      if (!isFinite(dfR) || dfR < 1 || !isFinite(alpha) || alpha <= 0 || alpha >= 1 ||
          typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter degrees of freedom and a significance level to see a worked medical example here.';
      const critTwo = jStat.studentt.inv(1 - alpha / 2, dfR);
      const f = v => +v.toFixed(3);
      return `A pilot trial with ${dfR + 1} patients (df = ${dfR}) plans to test a mean difference at α = ${alpha}. Before collecting data, the researcher looks up the critical value ±${f(critTwo)} — the t statistic will need to exceed that magnitude for the result to be declared statistically significant, which is useful for sanity-checking a result before running the full test.`;
    },

    calculate({ df, alpha }) {
      const dfR = Math.round(df);
      if (!isFinite(dfR) || dfR < 1)                      return [err('Degrees of Freedom must be at least 1')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1)   return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const critTwo = jStat.studentt.inv(1 - alpha / 2, dfR);
      const critOne = jStat.studentt.inv(1 - alpha, dfR);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: `Critical Value (two-tailed, α = ${alpha}, df = ${dfR})`, value: `±${f(critTwo)}`, ci: null, isRatio: false, isText: true, highlight: true },
        { label: `Critical Value (one-tailed, α = ${alpha}, df = ${dfR})`, value: f(critOne), ci: null, isRatio: false, highlight: true },
        { isSVG: true, svg: tTableHTML(dfR, alpha) },
      ];
    }
  },

  /* ── 35. BINOMIAL HYPOTHESIS TEST ──────────────────────────────────────
     Exact two-sided binomial test of an observed count x (out of n)
     against a hypothesised proportion p₀, using R's binom.test
     method: sum the probability of every outcome as-or-more-extreme
     than the observed one (pmf(k) ≤ pmf(x), within floating tolerance). */
  {
    id:          'binomial-hyp-test',
    name:        'Binomial Hypothesis Test',
    hint:        'Exact 2-sided p = Σ P(X=k) for pmf(k) ≤ pmf(x)',
    category:    'T-Tests & Z-Tests',
    description: 'Exact binomial test for a proportion against a null hypothesis, with graph.',

    formulas: [
      {
        label: 'Hypotheses',
        latex: 'H_0: p = p_0 \\qquad H_a: p \\neq p_0'
      },
      {
        label: 'Probability Mass Function',
        latex: 'P(X=k) = \\dbinom{n}{k}\\, p_0^{k}(1-p_0)^{n-k}'
      },
      {
        label: 'Two-Sided Exact p-Value',
        latex: 'p = \\sum_{k\\,:\\,P(X=k)\\,\\le\\,P(X=x)} P(X=k)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'n',     label: 'Number of Trials (n)',            default: 20  },
      { id: 'x',     label: 'Observed Successes (x)',          default: 15  },
      { id: 'p0',    label: 'Hypothesized Proportion (p₀, 0–1)', default: 0.5 },
      { id: 'alpha', label: 'Significance Level (α)',          default: 0.05 },
    ],

    example({ n, x, p0, alpha }) {
      n = Math.round(n); x = Math.round(x);
      if (!isFinite(n) || n < 1 || n > 1000 || !isFinite(x) || x < 0 || x > n || !isFinite(p0) || p0 <= 0 || p0 >= 1 ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 1)
        return 'Enter the number of trials, observed successes, hypothesized proportion, and significance level to see a worked medical example here.';
      const pmf = binomialPMF(n, p0);
      const pAtX = pmf[x];
      const threshold = pAtX * (1 + 1e-7);
      let pTwoSided = 0;
      for (let k = 0; k <= n; k++) if (pmf[k] <= threshold) pTwoSided += pmf[k];
      pTwoSided = Math.min(pTwoSided, 1);
      const f = v => +v.toFixed(1);
      return `A textbook claims a treatment works in ${f(p0 * 100)}% of patients (p₀=${p0}). In a small pilot of ${n} patients, ${x} respond. The exact two-sided p-value is ${formatPValue(pTwoSided)} — for small samples like this, the exact binomial test is more reliable than a z-test approximation, which can be inaccurate when n is small or the response rate is far from 50%.`;
    },

    calculate({ n, x, p0, alpha }) {
      n = Math.round(n);
      x = Math.round(x);

      if (!isFinite(n) || n < 1 || n > 1000)          return [err('n must be a whole number between 1 and 1000')];
      if (!isFinite(x) || x < 0 || x > n)             return [err('Observed Successes must be a whole number between 0 and n')];
      if (!isFinite(p0) || p0 <= 0 || p0 >= 1)        return [err('Hypothesized Proportion must be between 0 and 1 (exclusive)')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];

      const pmf  = binomialPMF(n, p0);
      const pAtX = pmf[x];

      let cdfLE = 0;
      for (let i = 0; i <= x; i++) cdfLE += pmf[i];
      const cdfGE = 1 - (cdfLE - pAtX);

      const threshold = pAtX * (1 + 1e-7);
      let pTwoSided = 0;
      for (let k = 0; k <= n; k++) if (pmf[k] <= threshold) pTwoSided += pmf[k];
      pTwoSided = Math.min(pTwoSided, 1);

      const isSignificant = pTwoSided < alpha;

      const f = (v, dp = 6) => +(v.toFixed(dp));

      return [
        { label: 'Observed Proportion (x/n)',        value: f(x / n, 4), ci: null, isRatio: false },
        { label: 'Expected Successes under H₀ (n·p₀)', value: f(n * p0, 4), ci: null, isRatio: false },
        { label: 'P(X ≤ x) — lower-tail cumulative', value: f(cdfLE), ci: null, isRatio: false },
        { label: 'P(X ≥ x) — upper-tail cumulative', value: f(cdfGE), ci: null, isRatio: false },
        { label: 'Two-Sided Exact p-value',          value: formatPValue(pTwoSided), ci: null, isRatio: false, highlight: true },
        { label: `Interpretation (α = ${alpha})`, isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — observed count is inconsistent with p₀' : 'Fail to reject H₀ — observed count is consistent with p₀' },
        { label: 'Distribution', isSVG: true, svg: binomialTestSVG(n, p0, x, pmf) },
      ];
    }
  },

  /* ── 36. INVERSE PROBABILITY ────────────────────────────────────────────
     Binomial quantile function (BINOM.INV equivalent, per the original
     source script): given n, p, and a target cumulative probability q,
     finds the smallest k such that P(X ≤ k) ≥ q. Complements
     'Binomial Probability Calculator' (which goes the other direction:
     k → P), reusing the same binomialPMF/binomialBarSVG helpers.      */
  {
    id:          'inverse-probability',
    name:        'Inverse Probability',
    hint:        'k* = min{k : P(X≤k) ≥ q} — BINOM.INV',
    category:    'Probability & Distributions',
    description: 'Finds the smallest count k such that the binomial cumulative probability P(X ≤ k) meets or exceeds a target probability, given n and p (the BINOM.INV equivalent).',

    formulas: [
      {
        label: 'Cumulative Probability',
        latex: 'P(X \\le k) = \\sum_{i=0}^{k} \\dbinom{n}{i}\\, p^{i}(1-p)^{n-i}'
      },
      {
        label: 'Inverse (Quantile) Function',
        latex: 'k^{*} = \\min\\{\\,k : P(X \\le k) \\ge q\\,\\}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'n',      label: 'Number of Trials (n)',              default: 15   },
      { id: 'p',      label: 'Probability of Success (p)',        default: 0.5  },
      { id: 'target', label: 'Target Cumulative Probability (q)', default: 0.75 },
    ],

    example({ n, p, target }) {
      n = Math.round(n);
      if (!isFinite(n) || n < 1 || n > 1000 || !isFinite(p) || p < 0 || p > 1 || !isFinite(target) || target <= 0 || target > 1)
        return 'Enter the number of trials, probability of success, and a target cumulative probability to see a worked medical example here.';
      const pmf = binomialPMF(n, p);
      let cum = 0, k = n;
      for (let i = 0; i <= n; i++) { cum += pmf[i]; if (cum >= target) { k = i; break; } }
      return `A vaccine trial enrolls ${n} participants, each with roughly a ${(p * 100).toFixed(0)}% chance of seroconverting. To plan lab/staffing capacity, the study team wants the smallest responder count k such that there's at least a ${(target * 100).toFixed(0)}% chance of seeing k or fewer — that comes out to k = ${k}, the BINOM.INV-style answer this calculator returns directly instead of scanning a cumulative table by hand.`;
    },

    calculate({ n, p, target }) {
      n = Math.round(n);

      if (!isFinite(n) || n < 1 || n > 1000)          return [err('n must be a whole number between 1 and 1000')];
      if (!isFinite(p) || p < 0 || p > 1)             return [err('p must be between 0 and 1')];
      if (!isFinite(target) || target <= 0 || target > 1) return [err('Target Cumulative Probability must be greater than 0 and at most 1')];

      const pmf = binomialPMF(n, p);
      let cum = 0, prevCum = 0, k = n;
      for (let i = 0; i <= n; i++) {
        prevCum = cum;
        cum += pmf[i];
        if (cum >= target - 1e-9) { k = i; break; }
      }

      const mean = n * p;
      const varc = n * p * (1 - p);
      const sd   = Math.sqrt(varc);

      const f = (v, dp = 6) => +(v.toFixed(dp));

      const rows = [
        { label: 'Smallest k with P(X ≤ k) ≥ q', value: k, ci: null, isRatio: false, highlight: true },
        { label: 'Achieved P(X ≤ k)',            value: f(cum), ci: null, isRatio: false },
      ];

      if (k > 0) {
        rows.push({ label: 'P(X ≤ k−1) — just below target', value: f(prevCum), ci: null, isRatio: false });
      }

      rows.push(
        { label: 'Mean (μ = np)',              value: f(mean, 4), ci: null, isRatio: false },
        { label: 'Standard Deviation (σ)',     value: f(sd, 4),   ci: null, isRatio: false },
        { label: 'Distribution', isSVG: true, svg: binomialBarSVG(n, p, k, pmf) },
      );

      return rows;
    }
  },

  /* ── 37. CONFIDENCE INTERVAL FOR A MEAN ────────────────────────────────
     t-based CI for a single sample mean (σ unknown, estimated by the
     sample SD): x̄ ± t_{α/2,df}·SE, at any confidence level.          */
  {
    id:          'single-sample-ci',
    name:        'Confidence Interval for a Mean',
    hint:        'x̄ ± t_{α/2,df}·(s/√n)',
    category:    'T-Tests & Z-Tests',
    description: 'Computes a t-based confidence interval for a single sample mean, at any confidence level.',

    formulas: [
      {
        label: 'Standard Error',
        latex: 'SE = \\dfrac{s}{\\sqrt{n}}'
      },
      {
        label: 'Confidence Interval',
        latex: '\\bar{x} \\pm t_{\\alpha/2,\\,df}\\cdot SE \\qquad df = n-1,\\;\\; \\alpha = 1-\\text{confidence}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'mean',       label: 'Sample Mean (x̄)',                default: 24.6 },
      { id: 'sd',         label: 'Sample SD (s)',                  default: 5.2  },
      { id: 'n',          label: 'Sample Size (n)',                default: 25   },
      { id: 'confidence', label: 'Confidence Level (e.g. 0.95 for 95%)', default: 0.95 },
    ],

    example({ mean, sd, n, confidence }) {
      n = Math.round(n);
      if (!isFinite(mean) || !isFinite(sd) || sd <= 0 || !isFinite(n) || n < 2 ||
          !isFinite(confidence) || confidence <= 0 || confidence >= 1 || typeof jStat === 'undefined' || !jStat.studentt)
        return 'Enter a sample mean, SD, sample size, and confidence level to see a worked medical example here.';
      const df = n - 1;
      const se = sd / Math.sqrt(n);
      const tCrit = jStat.studentt.inv(1 - (1 - confidence) / 2, df);
      const margin = tCrit * se;
      const f = v => +v.toFixed(2);
      const pct = (confidence * 100).toFixed(confidence * 100 % 1 === 0 ? 0 : 1);
      return `A study of ${n} patients finds an average recovery time of ${mean} days (SD ${sd}). Rather than reporting just that single number, a ${pct}% CI of [${f(mean - margin)}, ${f(mean + margin)}] communicates the uncertainty in that estimate — the range plausibly containing the true population mean recovery time.`;
    },

    calculate({ mean, sd, n, confidence }) {
      n = Math.round(n);

      if (!isFinite(mean))                                            return [err('Sample Mean is required')];
      if (!isFinite(sd) || sd <= 0)                                    return [err('Sample SD must be greater than 0')];
      if (!isFinite(n) || n < 2)                                       return [err('Sample Size must be at least 2')];
      if (!isFinite(confidence) || confidence <= 0 || confidence >= 1) return [err('Confidence Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const df    = n - 1;
      const alpha = 1 - confidence;
      const se    = sd / Math.sqrt(n);
      const tCrit = jStat.studentt.inv(1 - alpha / 2, df);
      const margin = tCrit * se;

      const f   = (v, dp = 4) => +(v.toFixed(dp));
      const pct = (confidence * 100).toFixed(confidence * 100 % 1 === 0 ? 0 : 1);

      return [
        { label: `Sample Mean (${pct}% CI)`,      value: f(mean), ci: [f(mean - margin), f(mean + margin)], isRatio: false, highlight: true },
        { label: 'Standard Error (SE)',            value: f(se),    ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)',        value: df,       ci: null, isRatio: false },
        { label: 't-Critical',                     value: f(tCrit), ci: null, isRatio: false },
        { label: 'Margin of Error',                value: f(margin), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 38. CONFIDENCE INTERVAL FOR A PROPORTION ──────────────────────────
     z-based Wald CI for a single sample proportion, at any confidence
     level (companion to 'Confidence Interval for a Mean' — the
     underlying SE/CI math already exists in 'Standard Error of a
     Proportion', but that calculator is fixed at 95%; this one lets
     the confidence level vary, framed around the CI rather than SE). */
  {
    id:          'confidence-interval-proportion',
    name:        'Confidence Interval for a Proportion',
    hint:        'p ± z_{α/2}·√(p(1−p)/n)',
    category:    'T-Tests & Z-Tests',
    description: 'Computes a z-based (Wald) confidence interval for a single sample proportion, at any confidence level.',

    formulas: [
      {
        label: 'Standard Error',
        latex: 'SE = \\sqrt{\\dfrac{p(1-p)}{n}}'
      },
      {
        label: 'Confidence Interval',
        latex: 'p \\pm z_{\\alpha/2}\\cdot SE \\qquad \\alpha = 1-\\text{confidence}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'p',          label: 'Sample Proportion (p, 0–1)',          default: 0.4  },
      { id: 'n',          label: 'Sample Size (n)',                     default: 50   },
      { id: 'confidence', label: 'Confidence Level (e.g. 0.95 for 95%)', default: 0.95 },
    ],

    example({ p, n, confidence }) {
      n = Math.round(n);
      if (!isFinite(p) || p < 0 || p > 1 || !isFinite(n) || n < 1 ||
          !isFinite(confidence) || confidence <= 0 || confidence >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter a sample proportion, sample size, and confidence level to see a worked medical example here.';
      const se = Math.sqrt(p * (1 - p) / n);
      const zCrit = jStat.normal.inv(1 - (1 - confidence) / 2, 0, 1);
      const margin = zCrit * se;
      const clip = v => Math.max(0, Math.min(1, v));
      const f = v => +(v * 100).toFixed(1);
      const pct = (confidence * 100).toFixed(confidence * 100 % 1 === 0 ? 0 : 1);
      return `A survey of ${n} patients finds ${f(p)}% report side effects from a medication. A ${pct}% CI of [${f(clip(p - margin))}%, ${f(clip(p + margin))}%] gives the plausible range for the true population rate — much more informative for a safety review than the single point estimate alone.`;
    },

    calculate({ p, n, confidence }) {
      n = Math.round(n);

      if (!isFinite(p) || p < 0 || p > 1)                              return [err('Sample Proportion must be between 0 and 1')];
      if (!isFinite(n) || n < 1)                                       return [err('Sample Size must be at least 1')];
      if (!isFinite(confidence) || confidence <= 0 || confidence >= 1) return [err('Confidence Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const alpha = 1 - confidence;
      const se    = Math.sqrt(p * (1 - p) / n);
      const zCrit = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const margin = zCrit * se;
      const clip  = v => Math.max(0, Math.min(1, v));

      const f   = (v, dp = 4) => +(v.toFixed(dp));
      const pct = (confidence * 100).toFixed(confidence * 100 % 1 === 0 ? 0 : 1);

      return [
        { label: `Sample Proportion (${pct}% CI)`, value: f(p), ci: [f(clip(p - margin)), f(clip(p + margin))], isRatio: false, highlight: true },
        { label: 'Standard Error (SE)',             value: f(se),    ci: null, isRatio: false },
        { label: 'z-Critical',                      value: f(zCrit), ci: null, isRatio: false },
        { label: 'Margin of Error',                 value: f(margin), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 39. CHI-SQUARE GOODNESS-OF-FIT ────────────────────────────────────
     Tests observed vs. expected frequencies across 2–6 categories.
     Categories 3–6 are optional, same pattern as the ANOVA groups.    */
  {
    id:          'chi-square-gof',
    name:        'Chi-Square Goodness-of-Fit',
    hint:        'χ² = Σ(O−E)²/E, df = k−1',
    category:    'Chi-Square & Categorical',
    description: 'Tests whether observed frequencies match expected frequencies.',

    formulas: [
      {
        label: 'Chi-Square Statistic',
        latex: '\\chi^2 = \\sum_{i=1}^{k} \\dfrac{(O_i-E_i)^2}{E_i}'
      },
      {
        label: 'Degrees of Freedom',
        latex: 'df = k - 1'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'obs1', label: 'Category 1 Observed (O)', default: 8  },
      { id: 'exp1', label: 'Category 1 Expected (E)', default: 10 },
      { id: 'obs2', label: 'Category 2 Observed (O)', default: 12 },
      { id: 'exp2', label: 'Category 2 Expected (E)', default: 10 },
      { id: 'obs3', label: 'Category 3 Observed (O)', default: 9  },
      { id: 'exp3', label: 'Category 3 Expected (E)', default: 10 },
      { id: 'obs4', label: 'Category 4 Observed (O)', default: 11 },
      { id: 'exp4', label: 'Category 4 Expected (E)', default: 10 },
      { id: 'obs5', label: 'Category 5 Observed (O)', default: 7  },
      { id: 'exp5', label: 'Category 5 Expected (E)', default: 10 },
      { id: 'obs6', label: 'Category 6 Observed (O)', default: 13 },
      { id: 'exp6', label: 'Category 6 Expected (E)', default: 10 },
    ],

    example(values) {
      const provided = v => v !== '' && v != null && isFinite(v);
      const cats = [];
      for (let i = 1; i <= 6; i++) {
        const o = values['obs' + i], e = values['exp' + i];
        if (provided(o) && provided(e)) cats.push({ o, e });
      }
      if (cats.length < 2 || cats.some(c => c.e <= 0))
        return 'Enter observed and expected counts for at least 2 categories to see a worked medical example here.';
      const chi2 = cats.reduce((s, c) => s + (c.o - c.e) ** 2 / c.e, 0);
      const df = cats.length - 1;
      const totalE = cats.reduce((s, c) => s + c.e, 0);
      const f = v => +v.toFixed(2);
      return `A hospital expects blood type distribution among ${totalE} patients to match a reference population (the Expected values), but observes a different split (the Observed values) across ${cats.length} categories. χ² = ${f(chi2)} with df = ${df} tests whether that mismatch is more than expected sampling noise.`;
    },

    calculate(values) {
      const provided = v => v !== '' && v != null && isFinite(v);
      const cats = [];
      for (let i = 1; i <= 6; i++) {
        const o = values['obs' + i], e = values['exp' + i];
        const any = provided(o) || provided(e);
        const all = provided(o) && provided(e);
        if (all) cats.push({ o, e });
        else if (any) return [err(`Category ${i}: enter both Observed and Expected, or leave both blank`)];
      }

      if (cats.length < 2)                    return [err('Enter Observed and Expected for at least 2 categories')];
      if (cats.some(c => c.e <= 0))            return [err('Every Expected value must be greater than 0')];
      if (cats.some(c => c.o < 0))             return [err('Every Observed value must be zero or greater')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const chi2 = cats.reduce((s, c) => s + (c.o - c.e) ** 2 / c.e, 0);
      const df   = cats.length - 1;
      const pValue = 1 - jStat.chisquare.cdf(chi2, df);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Categories (k)', value: cats.length, ci: null, isRatio: false },
        { label: 'Total Observed (N)',       value: cats.reduce((s, c) => s + c.o, 0), ci: null, isRatio: false },
        { label: 'Chi-Square Statistic (χ²)', value: f(chi2), ci: null, isRatio: false, highlight: true },
        { label: 'Degrees of Freedom (df)',  value: df, ci: null, isRatio: false },
        { label: 'p-value',                  value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — observed frequencies differ significantly from expected' : 'Fail to reject H₀ — observed frequencies are consistent with expected' },
      ];
    }
  },

  /* ── 40. FISHER'S EXACT TEST ────────────────────────────────────────────
     Exact 2×2 test via the hypergeometric distribution — two-sided
     p-value uses the same "sum probabilities ≤ observed" method as
     the exact binomial test, matching R's fisher.test().             */
  {
    id:          'fishers-exact',
    name:        "Fisher's Exact Test",
    hint:        'p = Σ P(table) for P(table) ≤ P(observed)',
    category:    'Chi-Square & Categorical',
    description: 'Exact test of association for small-sample 2×2 tables.',

    formulas: [
      {
        label: 'Hypergeometric Probability of a Table',
        latex: 'P = \\dfrac{\\dbinom{a+b}{a}\\dbinom{c+d}{c}}{\\dbinom{N}{a+c}}'
      },
      {
        label: 'Two-Sided Exact p-Value',
        latex: 'p = \\sum_{\\text{tables }T\\,:\\,P(T)\\,\\le\\,P(\\text{observed})} P(T)'
      }
    ],

    inputLayout: '2x2',
    inputs: [
      { id: 'a', label: 'a', desc: 'Row 1 · Column 1', default: 3 },
      { id: 'b', label: 'b', desc: 'Row 1 · Column 2', default: 1 },
      { id: 'c', label: 'c', desc: 'Row 2 · Column 1', default: 1 },
      { id: 'd', label: 'd', desc: 'Row 2 · Column 2', default: 3 },
    ],

    example({ a, b, c, d }) {
      a = Math.round(a); b = Math.round(b); c = Math.round(c); d = Math.round(d);
      const row1 = a + b, row2 = c + d, col1 = a + c, col2 = b + d, N = row1 + row2;
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0) || row1 <= 0 || row2 <= 0 || col1 <= 0 || col2 <= 0 ||
          typeof jStat === 'undefined' || !jStat.gammaln)
        return 'Enter counts for all four cells of the 2×2 table to see a worked medical example here.';
      const logDenom = logChoose(N, col1);
      const lo = Math.max(0, col1 - row2);
      const hi = Math.min(row1, col1);
      const probs = [];
      for (let x = lo; x <= hi; x++) probs.push(Math.exp(logChoose(row1, x) + logChoose(row2, col1 - x) - logDenom));
      const pObs = probs[a - lo];
      const threshold = pObs * (1 + 1e-7);
      let pTwoSided = 0;
      for (let i = 0; i < probs.length; i++) if (probs[i] <= threshold) pTwoSided += probs[i];
      return `A rare-disease trial with only ${N} patients total (${row1} on the new drug, ${row2} on placebo) sees ${a} responders on the drug vs ${c} on placebo — too few patients for the chi-square approximation to be trustworthy. Fisher's exact test computes the p-value directly from the hypergeometric distribution instead: p = ${formatPValue(pTwoSided)}.`;
    },

    calculate({ a, b, c, d }) {
      a = Math.round(a); b = Math.round(b); c = Math.round(c); d = Math.round(d);
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return [err('All four cells must be zero or greater')];

      const row1 = a + b, row2 = c + d, col1 = a + c, col2 = b + d, N = row1 + row2;
      if (row1 <= 0 || row2 <= 0 || col1 <= 0 || col2 <= 0)
        return [err('Each row and column total must be greater than 0')];
      if (typeof jStat === 'undefined' || !jStat.gammaln)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const logDenom = logChoose(N, col1);
      const lo = Math.max(0, col1 - row2);
      const hi = Math.min(row1, col1);

      const probs = [];
      for (let x = lo; x <= hi; x++) {
        probs.push(Math.exp(logChoose(row1, x) + logChoose(row2, col1 - x) - logDenom));
      }
      const sumProbs = probs.reduce((s, v) => s + v, 0);
      const pObs = probs[a - lo];
      const threshold = pObs * (1 + 1e-7);

      let pTwoSided = 0, pLeft = 0, pRight = 0;
      for (let i = 0; i < probs.length; i++) {
        const x = lo + i;
        if (probs[i] <= threshold) pTwoSided += probs[i];
        if (x <= a) pLeft += probs[i];
        if (x >= a) pRight += probs[i];
      }
      pTwoSided = Math.min(pTwoSided / sumProbs, 1);
      pLeft     = Math.min(pLeft / sumProbs, 1);
      pRight    = Math.min(pRight / sumProbs, 1);

      const oddsRatio = (b === 0 || c === 0) ? Infinity : (a * d) / (b * c);
      const isSignificant = pTwoSided < 0.05;

      const f = (v, dp = 6) => +(v.toFixed(dp));

      return [
        { label: 'Sample Odds Ratio (ad/bc)', value: isFinite(oddsRatio) ? f(oddsRatio, 4) : '∞', ci: null, isRatio: false },
        { label: 'P(X ≤ a) — lower one-tailed', value: formatPValue(pLeft), ci: null, isRatio: false },
        { label: 'P(X ≥ a) — upper one-tailed', value: formatPValue(pRight), ci: null, isRatio: false },
        { label: 'Two-Sided Exact p-value',   value: formatPValue(pTwoSided), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — significant association between the row and column variables' : 'Fail to reject H₀ — no significant association' },
      ];
    }
  },

  /* ── 41. MCNEMAR'S TEST ─────────────────────────────────────────────────
     Tests marginal homogeneity in paired nominal data (before/after
     or matched pairs) from the two discordant cells (b, c). Matches
     R's mcnemar.test(), with and without continuity correction.      */
  {
    id:          'mcnemars-test',
    name:        "McNemar's Test",
    hint:        'χ² = (b−c)²/(b+c), corrected: (|b−c|−1)²/(b+c)',
    category:    'Chi-Square & Categorical',
    description: 'Tests marginal homogeneity in paired nominal data (before/after or matched pairs).',

    formulas: [
      {
        label: 'Chi-Square Statistic',
        latex: '\\chi^2 = \\dfrac{(b-c)^2}{b+c}'
      },
      {
        label: 'Continuity-Corrected',
        latex: '\\chi^2_{corrected} = \\dfrac{(|b-c|-1)^2}{b+c}'
      }
    ],

    inputLayout: '2x2',
    tableLabels: { colPos: 'After +', colNeg: 'After −', rowPos: 'Before +', rowNeg: 'Before −' },
    inputs: [
      { id: 'a', label: 'a', desc: 'Before+ & After+ (unchanged)',  default: 30 },
      { id: 'b', label: 'b', desc: 'Before+ & After− (changed)',    default: 10 },
      { id: 'c', label: 'c', desc: 'Before− & After+ (changed)',    default: 20 },
      { id: 'd', label: 'd', desc: 'Before− & After− (unchanged)',  default: 40 },
    ],

    example({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0) || b + c <= 0)
        return 'Enter counts for all four cells (with at least one discordant pair) to see a worked medical example here.';
      const chi2Cor = (Math.abs(b - c) - 1) ** 2 / (b + c);
      const pCor = chiSquarePValue(chi2Cor);
      const f = v => +v.toFixed(3);
      return `${a + b + c + d} patients are tested for a marker before and after treatment. ${b} flip from positive to negative, ${c} flip from negative to positive, and ${a + d} stay the same — McNemar's test uses only those ${b + c} discordant pairs, since unchanged patients carry no information about whether treatment shifted the marker. Continuity-corrected χ² = ${f(chi2Cor)}, ${formatPText(pCor)}.`;
    },

    calculate({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return [err('All four cells must be zero or greater')];
      if (b + c <= 0)
        return [err('At least one discordant pair (b or c) is required')];

      const chi2Un  = (b - c) ** 2 / (b + c);
      const chi2Cor = (Math.abs(b - c) - 1) ** 2 / (b + c);
      const pUn  = chiSquarePValue(chi2Un);
      const pCor = chiSquarePValue(chi2Cor);
      const isSignificant = pCor < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Discordant Pairs (b + c)',          value: b + c, ci: null, isRatio: false },
        { label: 'Chi-Square (uncorrected)',          value: f(chi2Un), ci: null, isRatio: false },
        { label: 'p-value (uncorrected)',              value: formatPValue(pUn), ci: null, isRatio: false },
        { label: 'Chi-Square (continuity-corrected)',  value: f(chi2Cor), ci: null, isRatio: false, highlight: true },
        { label: 'p-value (continuity-corrected)',     value: formatPValue(pCor), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — significant change between Before and After' : 'Fail to reject H₀ — no significant change between Before and After' },
      ];
    }
  },

  /* ── 42. COCHRAN'S Q TEST ──────────────────────────────────────────────
     Non-parametric test for differences among 3+ matched proportions
     (repeated dichotomous measures on the same subjects). Unlike the
     other calculators in this file, this genuinely needs raw 0/1
     data — the sufficient statistics (Σrow², in particular) can't be
     derived from simple marginal counts — so it uses the textarea
     input type (supported by renderGrid, but otherwise unused so far). */
  {
    id:          'cochrans-q',
    name:        "Cochran's Q Test",
    hint:        'Q = k(k−1)ΣΣ(Cⱼ−C̄)² / (kΣRᵢ−ΣRᵢ²)',
    category:    'Chi-Square & Categorical',
    description: 'Non-parametric test for differences among three or more matched proportions.',

    formulas: [
      {
        label: "Cochran's Q Statistic",
        latex: 'Q = \\dfrac{k(k-1)\\sum_{j=1}^{k}(C_j-\\bar{C})^2}{k\\sum_i R_i - \\sum_i R_i^2}'
      },
      {
        label: 'Degrees of Freedom',
        latex: 'df = k - 1 \\qquad C_j = \\text{column (condition) success count} \\qquad R_i = \\text{row (subject) success count}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Paired 0/1 Data — one row per subject, one column per condition (comma-separated)',
        default: '1,1,0\n1,0,0\n1,1,1\n0,1,0\n1,1,0\n0,0,0\n1,1,1\n1,0,1'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return 'Enter at least 2 subject rows to see a worked medical example here.';
      const k = matrix[0].length;
      if (k < 3 || matrix.some(row => row.length !== k) || matrix.some(row => row.some(v => !isFinite(v) || (v !== 0 && v !== 1))))
        return 'Enter 0/1 outcomes for at least 3 matched conditions to see a worked medical example here.';
      const N = matrix.length;
      const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));
      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const sumR = rowSums.reduce((s, v) => s + v, 0);
      const sumR2 = rowSums.reduce((s, v) => s + v * v, 0);
      const meanC = sumR / k;
      const ssCol = colSums.reduce((s, c) => s + (c - meanC) ** 2, 0);
      const denominator = k * sumR - sumR2;
      if (denominator === 0 || typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter data where subjects have varying success counts to see a worked medical example here.';
      const Q = (k * (k - 1) * ssCol) / denominator;
      const df = k - 1;
      const pValue = 1 - jStat.chisquare.cdf(Q, df);
      const f = v => +v.toFixed(3);
      return `${N} patients each try ${k} different pain-relief methods, with success recorded as 1 (relief) or 0 (none) for each. Since the same patients are tested on every method, Cochran's Q compares success rates across methods while properly accounting for that repeated-measures structure. Q = ${f(Q)} with df = ${df}, ${formatPText(pValue)}.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return [err('Enter at least 2 subject rows')];
      const k = matrix[0].length;

      if (k < 3)
        return [err("Cochran's Q needs at least 3 matched conditions (columns) — for exactly 2, use McNemar's Test instead")];
      if (matrix.some(row => row.length !== k))
        return [err('Every row must have the same number of columns (conditions)')];
      if (matrix.some(row => row.some(v => !isFinite(v) || (v !== 0 && v !== 1))))
        return [err('All values must be 0 or 1')];

      const N = matrix.length;
      const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));
      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const sumR  = rowSums.reduce((s, v) => s + v, 0);
      const sumR2 = rowSums.reduce((s, v) => s + v * v, 0);
      const meanC = sumR / k;
      const ssCol = colSums.reduce((s, c) => s + (c - meanC) ** 2, 0);

      const denominator = k * sumR - sumR2;
      if (denominator === 0)
        return [err('Cannot compute Q — every subject has the same row total; try a different dataset')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const Q  = (k * (k - 1) * ssCol) / denominator;
      const df = k - 1;
      const pValue = 1 - jStat.chisquare.cdf(Q, df);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Subjects (N)',   value: N, ci: null, isRatio: false },
        { label: 'Number of Conditions (k)', value: k, ci: null, isRatio: false },
        { label: "Cochran's Q Statistic",    value: f(Q), ci: null, isRatio: false, highlight: true },
        { label: 'Degrees of Freedom (df)',  value: df, ci: null, isRatio: false },
        { label: 'p-value',                  value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — success proportions differ significantly across conditions' : 'Fail to reject H₀ — no significant difference among condition proportions' },
      ];
    }
  },

  /* ── 43. POISSON & NEGATIVE BINOMIAL ────────────────────────────────────
     Compares Poisson(λ) against a Negative Binomial with the SAME
     mean (μ = λ) plus a dispersion parameter r — the standard way to
     check for overdispersion relative to Poisson (NB → Poisson as
     r → ∞). Both PMFs/CDFs are computed in log-space via jStat's
     log-gamma, so large k or λ don't overflow k!/Γ(k+r).             */
  {
    id:          'poisson-negbinom',
    name:        'Poisson & Negative Binomial',
    hint:        'Same mean, compare Var = λ vs μ+μ²/r',
    category:    'Probability & Distributions',
    description: 'Calculates Poisson and negative binomial probabilities and cumulative distributions.',

    formulas: [
      {
        label: 'Poisson PMF',
        latex: 'P_{Pois}(X=k) = \\dfrac{e^{-\\lambda}\\lambda^{k}}{k!}'
      },
      {
        label: 'Negative Binomial PMF (mean μ, dispersion r)',
        latex: 'P_{NB}(X=k) = \\dfrac{\\Gamma(k+r)}{\\Gamma(r)\\,k!}\\left(\\dfrac{r}{r+\\mu}\\right)^{r}\\left(\\dfrac{\\mu}{r+\\mu}\\right)^{k}'
      },
      {
        label: 'Variance Comparison',
        latex: '\\text{Var}_{Pois}=\\lambda \\qquad \\text{Var}_{NB}=\\mu+\\dfrac{\\mu^2}{r} \\qquad (\\text{NB}\\to\\text{Poisson as } r\\to\\infty)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'lambda', label: 'Mean Rate (λ = μ)',                 default: 4 },
      { id: 'k',      label: 'Number of Events (k)',              default: 6 },
      { id: 'r',      label: 'Negative Binomial Dispersion (r)',  default: 2 },
    ],

    example({ lambda, k, r }) {
      k = Math.round(k);
      if (!isFinite(lambda) || lambda <= 0 || !isFinite(k) || k < 0 || k > 1000 || !isFinite(r) || r <= 0 ||
          typeof jStat === 'undefined' || !jStat.gammaln)
        return 'Enter a mean rate, event count, and dispersion parameter to see a worked medical example here.';
      const mu = lambda;
      const poissonLogPMF = i => -lambda + i * Math.log(lambda) - jStat.gammaln(i + 1);
      const nbLogPMF = i => jStat.gammaln(i + r) - jStat.gammaln(r) - jStat.gammaln(i + 1)
        + r * Math.log(r / (r + mu)) + i * Math.log(mu / (r + mu));
      const poisAtK = Math.exp(poissonLogPMF(k));
      const nbAtK = Math.exp(nbLogPMF(k));
      const varPois = lambda, varNB = mu + mu ** 2 / r;
      const f = v => +v.toFixed(4);
      return `A hospital ward averages ${lambda} infections per month (λ = ${lambda}). Under a plain Poisson model, seeing exactly ${k} infections in a given month has probability ${f(poisAtK)}. But infection counts often cluster more than Poisson allows — a Negative Binomial with the same mean but variance ${f(varNB)} (vs Poisson's ${f(varPois)}) gives P(X=${k}) = ${f(nbAtK)} instead, the better model whenever real counts are "burstier" than Poisson predicts.`;
    },

    calculate({ lambda, k, r }) {
      k = Math.round(k);

      if (!isFinite(lambda) || lambda <= 0)     return [err('Mean Rate must be greater than 0')];
      if (!isFinite(k) || k < 0 || k > 1000)    return [err('Number of Events must be a whole number between 0 and 1000')];
      if (!isFinite(r) || r <= 0)               return [err('Negative Binomial Dispersion (r) must be greater than 0')];
      if (typeof jStat === 'undefined' || !jStat.gammaln)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const mu = lambda;

      const poissonLogPMF = i => -lambda + i * Math.log(lambda) - jStat.gammaln(i + 1);
      const nbLogPMF = i =>
        jStat.gammaln(i + r) - jStat.gammaln(r) - jStat.gammaln(i + 1)
        + r * Math.log(r / (r + mu)) + i * Math.log(mu / (r + mu));

      let poisCdfLE = 0, nbCdfLE = 0;
      for (let i = 0; i <= k; i++) {
        poisCdfLE += Math.exp(poissonLogPMF(i));
        nbCdfLE   += Math.exp(nbLogPMF(i));
      }
      const poisAtK = Math.exp(poissonLogPMF(k));
      const nbAtK   = Math.exp(nbLogPMF(k));
      const poisCdfGE = 1 - (poisCdfLE - poisAtK);
      const nbCdfGE   = 1 - (nbCdfLE - nbAtK);

      const varPois = lambda;
      const varNB   = mu + mu ** 2 / r;

      const f = (v, dp = 6) => +(v.toFixed(dp));

      return [
        { label: 'Poisson — P(X = k)',            value: f(poisAtK), ci: null, isRatio: false, highlight: true },
        { label: 'Poisson — P(X ≤ k)',            value: f(poisCdfLE), ci: null, isRatio: false },
        { label: 'Poisson — P(X ≥ k)',            value: f(poisCdfGE), ci: null, isRatio: false },
        { label: 'Poisson — Variance (= λ)',      value: f(varPois, 4), ci: null, isRatio: false },
        { label: 'Negative Binomial — P(X = k)',  value: f(nbAtK), ci: null, isRatio: false, highlight: true },
        { label: 'Negative Binomial — P(X ≤ k)',  value: f(nbCdfLE), ci: null, isRatio: false },
        { label: 'Negative Binomial — P(X ≥ k)',  value: f(nbCdfGE), ci: null, isRatio: false },
        { label: 'Negative Binomial — Variance',  value: f(varNB, 4), ci: null, isRatio: false },
        { label: 'Overdispersion Ratio (Var_NB / Var_Pois)', value: f(varNB / varPois, 4), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 44. MANN-WHITNEY U TEST ────────────────────────────────────────────
     Rank-sum test for two independent groups (raw data required — the
     rank-based statistic can't be derived from group summary stats).
     Normal approximation with tie and continuity correction, matching
     R's wilcox.test(..., exact = FALSE) — the same convention used in
     the source 'Wilcoxon rank sum test.R' script.                    */
  {
    id:          'mann-whitney',
    name:        'Mann-Whitney U Test',
    hint:        'z = (U−n₁n₂/2)/SE, tie- & continuity-corrected',
    category:    'Non-Parametric Tests',
    description: 'Non-parametric test comparing two independent groups on ordinal or non-normal data.',

    formulas: [
      {
        label: 'U Statistic',
        latex: 'U_1 = R_1 - \\dfrac{n_1(n_1+1)}{2} \\qquad U_2 = R_2 - \\dfrac{n_2(n_2+1)}{2}'
      },
      {
        label: 'Normal Approximation (tie-corrected)',
        latex: 'z = \\dfrac{U_1 - \\tfrac{n_1n_2}{2}}{\\sqrt{\\tfrac{n_1n_2}{12}\\left[(N+1)-\\dfrac{\\sum(t^3-t)}{N(N-1)}\\right]}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'sample1', type: 'textarea', label: 'Group 1 Data (comma-separated)', default: '85,87,90,95,91' },
      { id: 'sample2', type: 'textarea', label: 'Group 2 Data (comma-separated)', default: '68,76,73,78,80' },
    ],

    example({ sample1, sample2 }) {
      const x1 = parseNumberList(sample1), x2 = parseNumberList(sample2);
      if (x1.some(v => !isFinite(v)) || x2.some(v => !isFinite(v)) || x1.length < 2 || x2.length < 2)
        return 'Enter at least 2 numeric values in each group to see a worked medical example here.';
      const n1 = x1.length, n2 = x2.length, N = n1 + n2;
      const { ranks, tieSum } = rankWithTies([...x1, ...x2]);
      const R1 = ranks.slice(0, n1).reduce((s, r) => s + r, 0);
      const U1 = R1 - n1 * (n1 + 1) / 2;
      const meanU = n1 * n2 / 2;
      const varU = (n1 * n2 / 12) * ((N + 1) - tieSum / (N * (N - 1)));
      const diff = U1 - meanU;
      const cc = diff === 0 ? 0 : diff - Math.sign(diff) * 0.5;
      const z = cc / Math.sqrt(varU);
      const f = v => +v.toFixed(2);
      return `A trial compares pain scores (often skewed, not normally distributed) between ${n1} patients on Method A and ${n2} on Method B. Because the outcome isn't normally distributed, ranks are compared instead of raw means: z = ${f(z)}, ${formatPText(normalTwoTailedP(z))} tests whether one method tends to produce higher scores than the other.`;
    },

    calculate({ sample1, sample2 }) {
      const x1 = parseNumberList(sample1), x2 = parseNumberList(sample2);
      if (x1.some(v => !isFinite(v)) || x2.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      const n1 = x1.length, n2 = x2.length;
      if (n1 < 2 || n2 < 2) return [err('Each group needs at least 2 values')];

      const N = n1 + n2;
      const { ranks, tieSum } = rankWithTies([...x1, ...x2]);
      const R1 = ranks.slice(0, n1).reduce((s, r) => s + r, 0);
      const R2 = ranks.slice(n1).reduce((s, r) => s + r, 0);
      const U1 = R1 - n1 * (n1 + 1) / 2;
      const U2 = R2 - n2 * (n2 + 1) / 2;

      const meanU = n1 * n2 / 2;
      const varU  = (n1 * n2 / 12) * ((N + 1) - tieSum / (N * (N - 1)));
      const diff  = U1 - meanU;
      const cc    = diff === 0 ? 0 : diff - Math.sign(diff) * 0.5;
      const z     = cc / Math.sqrt(varU);
      const pValue = normalTwoTailedP(z);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Group 1 Size (n₁)', value: n1, ci: null, isRatio: false },
        { label: 'Group 2 Size (n₂)', value: n2, ci: null, isRatio: false },
        { label: 'U₁ Statistic',      value: f(U1), ci: null, isRatio: false, highlight: true },
        { label: 'U₂ Statistic',      value: f(U2), ci: null, isRatio: false },
        { label: 'z-Statistic (tie- & continuity-corrected)', value: f(z), ci: null, isRatio: false },
        { label: 'p-value (two-tailed)', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — the two groups differ significantly' : 'Fail to reject H₀ — no significant difference between groups' },
      ];
    }
  },

  /* ── 45. WILCOXON SIGNED-RANK TEST ──────────────────────────────────────
     Non-parametric alternative to the paired t-test. Zero differences
     are dropped per the standard procedure; normal approximation with
     tie and continuity correction, matching R's wilcox.test(paired
     = TRUE, exact = FALSE).                                          */
  {
    id:          'wilcoxon-signed-rank',
    name:        'Wilcoxon Signed-Rank Test',
    hint:        'z = (W⁺−n(n+1)/4)/SE, tie- & continuity-corrected',
    category:    'Non-Parametric Tests',
    description: 'Non-parametric alternative to the paired t-test for comparing two related samples.',

    formulas: [
      {
        label: 'Signed-Rank Sums',
        latex: 'W^{+} = \\sum_{d_i>0} \\text{rank}(|d_i|) \\qquad W^{-} = \\sum_{d_i<0} \\text{rank}(|d_i|)'
      },
      {
        label: 'Normal Approximation (tie-corrected)',
        latex: 'z = \\dfrac{W^{+} - \\tfrac{n(n+1)}{4}}{\\sqrt{\\tfrac{n(n+1)(2n+1)}{24} - \\dfrac{\\sum(t^3-t)}{48}}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'sample1', type: 'textarea', label: 'Sample 1 / Before (comma-separated)', default: '125,115,130,140,120,135,128,118' },
      { id: 'sample2', type: 'textarea', label: 'Sample 2 / After (comma-separated)',  default: '118,112,122,138,115,130,125,110' },
    ],

    example({ sample1, sample2 }) {
      const x1 = parseNumberList(sample1), x2 = parseNumberList(sample2);
      if (x1.some(v => !isFinite(v)) || x2.some(v => !isFinite(v)) || x1.length !== x2.length)
        return 'Enter equal-length Before/After samples to see a worked medical example here.';
      const diffs = x1.map((v, i) => v - x2[i]).filter(d => d !== 0);
      const n = diffs.length;
      if (n < 1) return 'Need at least 1 non-zero difference to see a worked medical example here.';
      const { ranks, tieSum } = rankWithTies(diffs.map(Math.abs));
      const Wpos = diffs.reduce((s, d, i) => d > 0 ? s + ranks[i] : s, 0);
      const meanW = n * (n + 1) / 4;
      const varW  = n * (n + 1) * (2 * n + 1) / 24 - tieSum / 48;
      const diff  = Wpos - meanW;
      const cc    = diff === 0 ? 0 : diff - Math.sign(diff) * 0.5;
      const z     = cc / Math.sqrt(varW);
      const f = v => +v.toFixed(2);
      return `${x1.length} patients have a symptom-severity score measured before and after treatment (skewed data, so raw differences don't follow a normal distribution). Ranking the magnitude of each patient's before/after change instead, z = ${f(z)}, ${formatPText(normalTwoTailedP(z))} tests whether treatment shifted scores in a consistent direction.`;
    },

    calculate({ sample1, sample2 }) {
      const x1 = parseNumberList(sample1), x2 = parseNumberList(sample2);
      if (x1.some(v => !isFinite(v)) || x2.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      if (x1.length !== x2.length)
        return [err('Sample 1 and Sample 2 must have the same number of values (paired data)')];

      const diffs = x1.map((v, i) => v - x2[i]).filter(d => d !== 0);
      const nDropped = x1.length - diffs.length;
      const n = diffs.length;
      if (n < 1) return [err('Need at least 1 non-zero difference')];

      const { ranks, tieSum } = rankWithTies(diffs.map(Math.abs));
      const Wpos = diffs.reduce((s, d, i) => d > 0 ? s + ranks[i] : s, 0);
      const Wneg = diffs.reduce((s, d, i) => d < 0 ? s + ranks[i] : s, 0);

      const meanW = n * (n + 1) / 4;
      const varW  = n * (n + 1) * (2 * n + 1) / 24 - tieSum / 48;
      const diff  = Wpos - meanW;
      const cc    = diff === 0 ? 0 : diff - Math.sign(diff) * 0.5;
      const z     = cc / Math.sqrt(varW);
      const pValue = normalTwoTailedP(z);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Pairs Used (zero differences dropped)', value: n, ci: null, isRatio: false },
        { label: 'W⁺ (positive rank sum)', value: f(Wpos), ci: null, isRatio: false, highlight: true },
        { label: 'W⁻ (negative rank sum)', value: f(Wneg), ci: null, isRatio: false },
        { label: 'z-Statistic (tie- & continuity-corrected)', value: f(z), ci: null, isRatio: false },
        { label: 'p-value (two-tailed)', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — the paired samples differ significantly' : 'Fail to reject H₀ — no significant difference between paired samples' },
      ];
      if (nDropped > 0) rows.push({ label: 'Note', isText: true, ci: null, isRatio: false, value: `${nDropped} pair(s) with a difference of 0 were dropped, per the standard procedure.` });
      return rows;
    }
  },

  /* ── 46. SIGN TEST ──────────────────────────────────────────────────────
     Tests the median of paired differences using only the signs of
     the differences — an exact binomial test (H₀: P(+) = 0.5), reusing
     the same PMF/threshold machinery as the Binomial Hypothesis Test. */
  {
    id:          'sign-test',
    name:        'Sign Test',
    hint:        'Exact binomial(n, 0.5) test on the signs of dᵢ',
    category:    'Non-Parametric Tests',
    description: 'Tests the median of paired differences using only the signs of the differences.',

    formulas: [
      {
        label: 'Test Statistic',
        latex: 'n_{+} = \\#\\{d_i > 0\\} \\qquad n = n_{+} + n_{-} \\quad (\\text{zero differences dropped})'
      },
      {
        label: 'Two-Sided Exact p-Value',
        latex: 'p = \\sum_{k\\,:\\,P(X=k)\\,\\le\\,P(X=n_{+})} P(X=k), \\qquad X \\sim \\text{Binomial}(n, 0.5)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'sample1', type: 'textarea', label: 'Sample 1 / Before (comma-separated)', default: '125,115,130,140,120,135,128,118' },
      { id: 'sample2', type: 'textarea', label: 'Sample 2 / After (comma-separated)',  default: '118,112,122,138,115,130,125,110' },
    ],

    example({ sample1, sample2 }) {
      const x1 = parseNumberList(sample1), x2 = parseNumberList(sample2);
      if (x1.some(v => !isFinite(v)) || x2.some(v => !isFinite(v)) || x1.length !== x2.length)
        return 'Enter equal-length Before/After samples to see a worked medical example here.';
      const diffs = x1.map((v, i) => v - x2[i]).filter(d => d !== 0);
      const n = diffs.length;
      if (n < 1) return 'Need at least 1 non-zero difference to see a worked medical example here.';
      const nPos = diffs.filter(d => d > 0).length;
      const pmf = binomialPMF(n, 0.5);
      const pAtX = pmf[nPos];
      const threshold = pAtX * (1 + 1e-7);
      let pValue = 0;
      for (let k = 0; k <= n; k++) if (pmf[k] <= threshold) pValue += pmf[k];
      pValue = Math.min(pValue, 1);
      return `${x1.length} patients report a pain score before and after acupuncture — too few patients, or too irregular a scale, to trust a mean-based test. The sign test asks only whether each patient improved or worsened: ${nPos} of ${n} usable pairs improved. Two-sided exact p = ${formatPValue(pValue)}, using only the direction of change, not its magnitude.`;
    },

    calculate({ sample1, sample2 }) {
      const x1 = parseNumberList(sample1), x2 = parseNumberList(sample2);
      if (x1.some(v => !isFinite(v)) || x2.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      if (x1.length !== x2.length)
        return [err('Sample 1 and Sample 2 must have the same number of values (paired data)')];

      const diffs = x1.map((v, i) => v - x2[i]).filter(d => d !== 0);
      const n = diffs.length;
      if (n < 1) return [err('Need at least 1 non-zero difference')];

      const nPos = diffs.filter(d => d > 0).length;
      const pmf  = binomialPMF(n, 0.5);
      const pAtX = pmf[nPos];
      const threshold = pAtX * (1 + 1e-7);
      let pValue = 0;
      for (let k = 0; k <= n; k++) if (pmf[k] <= threshold) pValue += pmf[k];
      pValue = Math.min(pValue, 1);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 6) => +(v.toFixed(dp));

      return [
        { label: 'Non-Zero Pairs (n)', value: n, ci: null, isRatio: false },
        { label: 'Positive Differences (n₊)', value: nPos, ci: null, isRatio: false, highlight: true },
        { label: 'Negative Differences (n₋)', value: n - nPos, ci: null, isRatio: false },
        { label: 'Two-Sided Exact p-value', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — the median difference is significantly different from 0' : 'Fail to reject H₀ — no significant difference in the median' },
      ];
    }
  },

  /* ── 47. KRUSKAL-WALLIS TEST ────────────────────────────────────────────
     Non-parametric one-way ANOVA (rank-based) for 3–6 independent
     groups; groups 4–6 optional. Tie-corrected, matching R's
     kruskal.test(). Shares kruskalWallisStats() with Dunn's Test.     */
  {
    id:          'kruskal-wallis',
    name:        'Kruskal-Wallis Test',
    hint:        'H = 12/(N(N+1))·ΣRⱼ²/nⱼ − 3(N+1), tie-corrected',
    category:    'Non-Parametric Tests',
    description: 'Non-parametric one-way ANOVA for comparing three or more independent groups.',

    formulas: [
      {
        label: 'H Statistic (tie-corrected)',
        latex: 'H = \\dfrac{1}{C}\\left[\\dfrac{12}{N(N+1)}\\sum_{j=1}^{k}\\dfrac{R_j^2}{n_j} - 3(N+1)\\right], \\quad C = 1-\\dfrac{\\sum(t^3-t)}{N^3-N}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'group1', type: 'textarea', label: 'Group 1 Data (comma-separated)', default: '50,80,30,40' },
      { id: 'group2', type: 'textarea', label: 'Group 2 Data (comma-separated)', default: '70,80,90,60' },
      { id: 'group3', type: 'textarea', label: 'Group 3 Data (comma-separated)', default: '80,80,130,60' },
      { id: 'group4', type: 'textarea', label: 'Group 4 Data (optional)',        default: '' },
      { id: 'group5', type: 'textarea', label: 'Group 5 Data (optional)',        default: '' },
      { id: 'group6', type: 'textarea', label: 'Group 6 Data (optional)',        default: '' },
    ],

    example(values) {
      const { groups, error } = gatherDataGroups(values);
      if (error || groups.length < 3 || typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter data for at least 3 groups to see a worked medical example here.';
      const { N, k, H, df } = kruskalWallisStats(groups);
      const pValue = 1 - jStat.chisquare.cdf(H, df);
      const f = v => +v.toFixed(2);
      return `A study compares recovery time across ${k} treatment protocols (N = ${N} patients total), where recovery time is skewed rather than normally distributed — ruling out a standard ANOVA. Ranking all patients together instead, H = ${f(H)} with df = ${df}, ${formatPText(pValue)} tests whether at least one protocol differs from the others.`;
    },

    calculate(values) {
      const { groups, error } = gatherDataGroups(values);
      if (error) return [err(error)];
      if (groups.length < 3) return [err('Enter data for at least 3 groups')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const { N, k, H, df, groupStats } = kruskalWallisStats(groups);
      const pValue = 1 - jStat.chisquare.cdf(H, df);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Number of Groups (k)', value: k, ci: null, isRatio: false },
        { label: 'Total Sample Size (N)', value: N, ci: null, isRatio: false },
      ];
      groupStats.forEach(g => rows.push({ label: `${g.label} Mean Rank (n = ${g.n})`, value: f(g.meanRank), ci: null, isRatio: false }));
      rows.push(
        { label: 'H Statistic (tie-corrected)', value: f(H), ci: null, isRatio: false, highlight: true },
        { label: 'Degrees of Freedom (df)', value: df, ci: null, isRatio: false },
        { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — at least one group differs significantly' : 'Fail to reject H₀ — no significant difference among groups' },
      );
      return rows;
    }
  },

  /* ── 48. DUNN'S TEST ────────────────────────────────────────────────────
     Post-hoc pairwise comparisons following a significant Kruskal-
     Wallis test, using the same tie-corrected rank pool, with Holm's
     step-down adjustment for multiple comparisons — matching the
     source 'Dunn with Holm adjustment.R' script's method.            */
  {
    id:          'dunns-test',
    name:        "Dunn's Test",
    hint:        'z_ij = (R̄ᵢ−R̄ⱼ)/SE, Holm-adjusted',
    category:    'Non-Parametric Tests',
    description: 'Post-hoc pairwise comparisons following a significant Kruskal-Wallis test.',

    formulas: [
      {
        label: 'Pairwise z-Statistic',
        latex: 'z_{ij} = \\dfrac{\\bar{R}_i-\\bar{R}_j}{\\sqrt{\\left[\\tfrac{N(N+1)}{12}-\\tfrac{\\sum(t^3-t)}{12(N-1)}\\right]\\left(\\tfrac{1}{n_i}+\\tfrac{1}{n_j}\\right)}}'
      },
      {
        label: "Holm's Step-Down Adjustment",
        latex: 'p_{(i)}^{Holm} = \\max_{j \\le i}\\big\\{\\min(1,\\,(m-j+1)\\,p_{(j)})\\big\\}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'group1', type: 'textarea', label: 'Group 1 Data (comma-separated)', default: '50,80,30,40' },
      { id: 'group2', type: 'textarea', label: 'Group 2 Data (comma-separated)', default: '70,80,90,60' },
      { id: 'group3', type: 'textarea', label: 'Group 3 Data (comma-separated)', default: '80,80,130,60' },
      { id: 'group4', type: 'textarea', label: 'Group 4 Data (optional)',        default: '' },
      { id: 'group5', type: 'textarea', label: 'Group 5 Data (optional)',        default: '' },
      { id: 'group6', type: 'textarea', label: 'Group 6 Data (optional)',        default: '' },
    ],

    example(values) {
      const { groups, error } = gatherDataGroups(values);
      if (error || groups.length < 3 || typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter data for at least 3 groups to see a worked medical example here.';
      const { N, k, H, df, groupStats, tieSum } = kruskalWallisStats(groups);
      const kwP = 1 - jStat.chisquare.cdf(H, df);
      const pairs = [];
      for (let i = 0; i < groupStats.length; i++) {
        for (let j = i + 1; j < groupStats.length; j++) {
          const gi = groupStats[i], gj = groupStats[j];
          const se = Math.sqrt((N * (N + 1) / 12 - tieSum / (12 * (N - 1))) * (1 / gi.n + 1 / gj.n));
          const z = (gi.meanRank - gj.meanRank) / se;
          pairs.push({ p: normalTwoTailedP(z) });
        }
      }
      const adjustedEx = holmAdjust(pairs.map(pr => pr.p));
      const nSig = adjustedEx.filter(p => p < 0.05).length;
      return `A Kruskal-Wallis test across ${k} treatment groups (N=${N}) comes back significant (${formatPText(kwP)}) — telling you at least one group differs, but not which one. Dunn's test runs all ${pairs.length} pairwise comparisons and applies Holm's correction to control the false-positive rate from testing so many pairs at once: ${nSig} of ${pairs.length} pairs remain significant after adjustment.`;
    },

    calculate(values) {
      const { groups, error } = gatherDataGroups(values);
      if (error) return [err(error)];
      if (groups.length < 3) return [err('Enter data for at least 3 groups')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const { N, k, H, df, groupStats, tieSum } = kruskalWallisStats(groups);
      const kwP = 1 - jStat.chisquare.cdf(H, df);

      const pairs = [];
      for (let i = 0; i < groupStats.length; i++) {
        for (let j = i + 1; j < groupStats.length; j++) {
          const gi = groupStats[i], gj = groupStats[j];
          const se = Math.sqrt((N * (N + 1) / 12 - tieSum / (12 * (N - 1))) * (1 / gi.n + 1 / gj.n));
          const z  = (gi.meanRank - gj.meanRank) / se;
          const p  = normalTwoTailedP(z);
          pairs.push({ gi, gj, z, p });
        }
      }
      const adjusted = holmAdjust(pairs.map(pr => pr.p));

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Kruskal-Wallis H (context)', value: f(H), ci: null, isRatio: false },
        { label: 'Kruskal-Wallis p-value (context)', value: formatPValue(kwP), ci: null, isRatio: false },
      ];
      pairs.forEach((pr, idx) => {
        const adjP = adjusted[idx];
        rows.push({
          label: `${pr.gi.label} vs ${pr.gj.label} — Mean Rank Diff.`,
          value: f(pr.gi.meanRank - pr.gj.meanRank),
          ci: null, isRatio: false, highlight: adjP < 0.05,
        });
        rows.push({ label: `${pr.gi.label} vs ${pr.gj.label} — z / p / Holm-adjusted p`, isText: true, ci: null, isRatio: false,
          value: `z = ${f(pr.z)}, ${formatPText(pr.p)}, adj. ${formatPText(adjP)}${adjP < 0.05 ? ' — significant' : ''}` });
      });
      return rows;
    }
  },

  /* ── 49. FRIEDMAN TEST ──────────────────────────────────────────────────
     Non-parametric repeated-measures test for 3+ related groups, from
     one row of raw data per subject (ranked within-row). Tie-corrected
     to match R's friedman.test() exactly — verified against the
     source 'Friedman test.R' example (its own embedded "manual"
     formula undercounts a factor of n and was not used here).        */
  {
    id:          'friedman-test',
    name:        'Friedman Test',
    hint:        'Q = 12Σ(Rⱼ−N(k+1)/2)² / [Nk(k+1) − tie adj.]',
    category:    'Non-Parametric Tests',
    description: 'Non-parametric repeated measures test for comparing three or more related groups.',

    formulas: [
      {
        label: 'Friedman Q Statistic (tie-corrected)',
        latex: 'Q = \\dfrac{12\\sum_{j=1}^{k}\\left(R_j-\\tfrac{N(k+1)}{2}\\right)^2}{N\\,k(k+1) - \\dfrac{1}{k-1}\\sum_i\\sum(t^3-t)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Data — one row per subject, one column per condition (comma-separated)',
        default: '5,7,6\n3,4,6\n6,5,7\n7,6,5\n7,9,10'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return 'Enter at least 2 subject rows to see a worked medical example here.';
      const k = matrix[0].length;
      if (k < 3 || matrix.some(row => row.length !== k) || matrix.some(row => row.some(v => !isFinite(v))) ||
          typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter numeric data for at least 3 matched conditions to see a worked medical example here.';
      const N = matrix.length;
      const colSums = new Array(k).fill(0);
      let tieAdjSum = 0;
      matrix.forEach(row => {
        const { ranks, tieSum } = rankWithTies(row);
        ranks.forEach((r, j) => colSums[j] += r);
        tieAdjSum += tieSum;
      });
      const mu = N * (k + 1) / 2;
      const numerator = 12 * colSums.reduce((s, r) => s + (r - mu) ** 2, 0);
      const denominator = N * k * (k + 1) - tieAdjSum / (k - 1);
      if (denominator <= 0) return 'Enter less-tied data to see a worked medical example here.';
      const Q = numerator / denominator;
      const df = k - 1;
      const pValue = 1 - jStat.chisquare.cdf(Q, df);
      const f = v => +v.toFixed(2);
      return `${N} patients each rate their pain on ${k} different occasions or treatments, ranked within each patient rather than compared as raw scores — appropriate for non-normal, repeated-measures data. Q = ${f(Q)} with df = ${df}, ${formatPText(pValue)} tests whether ratings differ systematically across occasions.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return [err('Enter at least 2 subject rows')];
      const k = matrix[0].length;
      if (k < 3) return [err('Friedman needs at least 3 matched conditions (columns) — for exactly 2, use Wilcoxon Signed-Rank instead')];
      if (matrix.some(row => row.length !== k)) return [err('Every row must have the same number of columns (conditions)')];
      if (matrix.some(row => row.some(v => !isFinite(v)))) return [err('All values must be numeric')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const N = matrix.length;
      const colSums = new Array(k).fill(0);
      let tieAdjSum = 0;
      matrix.forEach(row => {
        const { ranks, tieSum } = rankWithTies(row);
        ranks.forEach((r, j) => colSums[j] += r);
        tieAdjSum += tieSum;
      });

      const mu = N * (k + 1) / 2;
      const numerator = 12 * colSums.reduce((s, r) => s + (r - mu) ** 2, 0);
      const denominator = N * k * (k + 1) - tieAdjSum / (k - 1);
      if (denominator <= 0) return [err('Cannot compute Q — the data is degenerate (too many ties); try a different dataset')];

      const Q  = numerator / denominator;
      const df = k - 1;
      const pValue = 1 - jStat.chisquare.cdf(Q, df);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Subjects (N)',   value: N, ci: null, isRatio: false },
        { label: 'Number of Conditions (k)', value: k, ci: null, isRatio: false },
        { label: 'Friedman Q Statistic',     value: f(Q), ci: null, isRatio: false, highlight: true },
        { label: 'Degrees of Freedom (df)',  value: df, ci: null, isRatio: false },
        { label: 'p-value',                  value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — success proportions/scores differ significantly across conditions' : 'Fail to reject H₀ — no significant difference among conditions' },
      ];
    }
  },

  /* ── 50. SIMPLE LINEAR REGRESSION ───────────────────────────────────────
     OLS regression from raw paired (X, Y) data. Defaults match the
     source 'Regession v.2.R' script exactly, so its output (β₀, β₁,
     SEs, SST/SSR/SSE, F-statistic, p-value) can be cross-checked
     directly against running that script.                            */
  {
    id:          'simple-regression',
    name:        'Simple Linear Regression',
    hint:        'ŷ = β₀ + β₁x, F = MSR/MSE',
    category:    'Correlation & Regression',
    description: 'Fits a straight line to data and estimates slope, intercept, R², and significance.',

    formulas: [
      {
        label: 'OLS Estimates',
        latex: '\\beta_1 = \\dfrac{S_{xy}}{S_{xx}} \\qquad \\beta_0 = \\bar{y} - \\beta_1\\bar{x}'
      },
      {
        label: 'Sums of Squares & R²',
        latex: 'SST = SSR + SSE \\qquad R^2 = \\dfrac{SSR}{SST}'
      },
      {
        label: 'F-Test of Overall Significance',
        latex: 'F = \\dfrac{SSR/1}{SSE/(n-2)} \\;\\sim\\; F_{1,\\,n-2}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'x', type: 'textarea', label: 'X Values (comma-separated)', default: '8.75,14.51,12.32,10.99,6.56,6.56,5.58,13.66,11.01,12.08' },
      { id: 'y', type: 'textarea', label: 'Y Values (comma-separated)', default: '12.06,21.00,16.36,14.76,10.86,6.55,5.75,17.77,13.69,17.62' },
    ],

    example({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)) || xs.length !== ys.length || xs.length < 3)
        return 'Enter at least 3 paired X/Y values to see a worked medical example here.';
      const n = xs.length;
      const xMean = xs.reduce((s, v) => s + v, 0) / n;
      const yMean = ys.reduce((s, v) => s + v, 0) / n;
      const Sxy = xs.reduce((s, v, i) => s + (v - xMean) * (ys[i] - yMean), 0);
      const Sxx = xs.reduce((s, v) => s + (v - xMean) ** 2, 0);
      if (Sxx === 0) return 'Enter X values that are not all identical to see a worked medical example here.';
      const slope = Sxy / Sxx;
      const intercept = yMean - slope * xMean;
      const yHat = xs.map(v => intercept + slope * v);
      const SSE = ys.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0);
      const SST = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);
      const R2 = SST === 0 ? 0 : 1 - SSE / SST;
      const f = v => +v.toFixed(2);
      return `A clinic wants to predict a patient's cholesterol level (Y) from their BMI (X) across ${n} patients. The fitted line ŷ = ${f(intercept)} + ${f(slope)}x means each 1-unit rise in BMI is associated with a ${f(slope)}-unit change in predicted cholesterol. R² = ${f(R2)} means BMI alone explains about ${f(R2 * 100)}% of the patient-to-patient variation in cholesterol — the rest comes from other factors the model doesn't capture.`;
    },

    calculate({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      if (xs.length !== ys.length)
        return [err('X and Y must have the same number of values (paired data)')];
      const n = xs.length;
      if (n < 3) return [err('Need at least 3 paired points')];
      if (typeof jStat === 'undefined' || !jStat.centralF || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const xMean = xs.reduce((s, v) => s + v, 0) / n;
      const yMean = ys.reduce((s, v) => s + v, 0) / n;
      const Sxy = xs.reduce((s, v, i) => s + (v - xMean) * (ys[i] - yMean), 0);
      const Sxx = xs.reduce((s, v) => s + (v - xMean) ** 2, 0);
      if (Sxx === 0) return [err('All X values are identical — cannot fit a regression line')];

      const slope     = Sxy / Sxx;
      const intercept = yMean - slope * xMean;
      const yHat = xs.map(v => intercept + slope * v);

      const SSE = ys.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0);
      const SSR = yHat.reduce((s, v) => s + (v - yMean) ** 2, 0);
      const SST = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);

      const dfReg = 1, dfRes = n - 2;
      const MSR = SSR / dfReg;
      const MSE = SSE / dfRes;
      const Fstat = MSR / MSE;
      const pF = 1 - jStat.centralF.cdf(Fstat, dfReg, dfRes);

      const SER = Math.sqrt(MSE);
      const seSlope     = SER / Math.sqrt(Sxx);
      const seIntercept = SER * Math.sqrt(1 / n + xMean ** 2 / Sxx);

      const tSlope = slope / seSlope;
      const tIntercept = intercept / seIntercept;
      const pSlope     = 2 * (1 - jStat.studentt.cdf(Math.abs(tSlope), dfRes));
      const pIntercept = 2 * (1 - jStat.studentt.cdf(Math.abs(tIntercept), dfRes));

      const R2 = SST === 0 ? 1 : SSR / SST;
      const isSignificant = pF < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Sample Size (n)',           value: n, ci: null, isRatio: false },
        { label: 'Intercept (β₀)',            value: f(intercept), ci: null, isRatio: false },
        { label: 'SE (β₀)',                   value: f(seIntercept), ci: null, isRatio: false },
        { label: 't-Statistic (intercept) & p-value', isText: true, ci: null, isRatio: false,
          value: `t = ${f(tIntercept)}, ${formatPText(pIntercept)}` },
        { label: 'Slope (β₁)',                value: f(slope), ci: null, isRatio: false, highlight: true },
        { label: 'SE (β₁)',                   value: f(seSlope), ci: null, isRatio: false },
        { label: 't-Statistic (slope) & p-value', isText: true, ci: null, isRatio: false,
          value: `t = ${f(tSlope)}, ${formatPText(pSlope)}` },
        { label: 'R² (proportion of variance explained)', value: f(R2), ci: null, isRatio: false, highlight: true },
        { label: 'SST / SSR / SSE', isText: true, ci: null, isRatio: false,
          value: `SST = ${f(SST)}, SSR = ${f(SSR)}, SSE = ${f(SSE)}` },
        { label: 'F-Statistic', value: f(Fstat), ci: null, isRatio: false, highlight: true },
        { label: 'p-value (F-test)', value: formatPValue(pF), ci: null, isRatio: false },
        { label: 'Regression Equation', isText: true, ci: null, isRatio: false,
          value: `ŷ = ${f(intercept, 3)} + ${f(slope, 3)}·x` },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — X is a significant predictor of Y' : 'Fail to reject H₀ — no significant linear relationship' },
      ];
    }
  },

  /* ── 50b. MULTIPLE LINEAR REGRESSION ────────────────────────────────────
     OLS via the normal equations β̂ = (X'X)⁻¹X'y, solved with a small
     Gauss-Jordan matrix inverse (see the SURVIVAL-adjacent MATRIX
     HELPERS section) rather than a closed form, since a closed form
     only exists for a single predictor (see 'Simple Linear
     Regression'). Coefficient SEs come from the diagonal of
     MSE·(X'X)⁻¹, the standard OLS sandwich for this exact model.     */
  {
    id:          'multiple-regression',
    name:        'Multiple Linear Regression',
    hint:        'ŷ = β₀+β₁x₁+…+βₖxₖ, β̂=(X\'X)⁻¹X\'y',
    category:    'Correlation & Regression',
    description: 'Fits a linear model with two or more predictors at once, estimating each coefficient, its standard error, R², adjusted R², and overall significance.',

    formulas: [
      {
        label: 'OLS Normal Equations',
        latex: '\\hat{\\beta} = (X^\\top X)^{-1}X^\\top y'
      },
      {
        label: 'Coefficient Standard Errors',
        latex: 'SE(\\hat\\beta_j) = \\sqrt{MSE \\cdot \\left[(X^\\top X)^{-1}\\right]_{jj}}, \\quad MSE = \\dfrac{SSE}{n-k-1}'
      },
      {
        label: 'R², Adjusted R² & Overall F-Test',
        latex: 'R^2 = 1-\\dfrac{SSE}{SST} \\qquad R^2_{adj} = 1-(1-R^2)\\dfrac{n-1}{n-k-1} \\qquad F = \\dfrac{SSR/k}{SSE/(n-k-1)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Data — Y, X₁, X₂, … (comma-separated, one row per observation, at least 2 predictor columns)',
        default: '126,25,22\n138,32,28\n148,45,31\n160,52,35\n133,38,24\n162,60,33\n122,29,20\n150,47,29\n168,55,38\n140,41,27\n132,33,25\n155,50,32'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return 'Enter a Y column and at least 2 predictor columns to see a worked medical example here.';
      const cols = matrix[0].length;
      if (matrix.some(row => row.length !== cols) || matrix.some(row => row.some(v => !isFinite(v))))
        return 'Enter numeric data with a consistent number of columns to see a worked medical example here.';
      const k = cols - 1;
      if (k < 2) return 'Enter at least 2 predictor columns to see a worked medical example here.';
      const n = matrix.length;
      if (n < k + 2) return 'Enter more observations relative to the number of predictors to see a worked medical example here.';

      const y = matrix.map(row => [row[0]]);
      const X = matrix.map(row => [1, ...row.slice(1)]);
      const XtXinv = matrixInverse(matrixMultiply(matrixTranspose(X), X));
      if (!XtXinv) return 'Enter predictors that are not perfectly collinear to see a worked medical example here.';
      const beta = matrixMultiply(XtXinv, matrixMultiply(matrixTranspose(X), y)).map(row => row[0]);

      const yVals = y.map(row => row[0]);
      const yMean = yVals.reduce((s, v) => s + v, 0) / n;
      const fitted = X.map(row => row.reduce((s, xij, j) => s + xij * beta[j], 0));
      const SSE = yVals.reduce((s, v, i) => s + (v - fitted[i]) ** 2, 0);
      const SST = yVals.reduce((s, v) => s + (v - yMean) ** 2, 0);
      const R2 = SST === 0 ? 0 : 1 - SSE / SST;

      const f = v => +v.toFixed(2);
      return `A clinic wants to predict systolic blood pressure (Y) from ${k} patient characteristics at once — e.g. age and BMI — across ${n} patients, rather than one predictor at a time like Simple Linear Regression. β₁ = ${f(beta[1])} is the first predictor's own effect on Y holding all the others constant — that "holding constant" is exactly what multiple regression adds over fitting each predictor separately. Together, all ${k} predictors explain R² = ${f(R2)} (${f(R2 * 100)}%) of the variation in Y.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return [err('Enter at least 2 rows of data')];
      const cols = matrix[0].length;
      if (matrix.some(row => row.length !== cols)) return [err('Every row must have the same number of columns')];
      if (matrix.some(row => row.some(v => !isFinite(v)))) return [err('All values must be numeric')];
      const k = cols - 1;
      if (k < 2) return [err(`This calculator needs at least 2 predictor columns (found ${k}) — use Simple Linear Regression for exactly 1`)];
      const n = matrix.length;
      if (n < k + 2)
        return [err(`Need at least ${k + 2} observations to fit ${k} predictors with at least 1 residual degree of freedom (currently ${n})`)];
      if (typeof jStat === 'undefined' || !jStat.centralF || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const y = matrix.map(row => [row[0]]);
      const X = matrix.map(row => [1, ...row.slice(1)]);

      const Xt = matrixTranspose(X);
      const XtX = matrixMultiply(Xt, X);
      const XtXinv = matrixInverse(XtX);
      if (!XtXinv)
        return [err('Cannot fit the model — the predictors are perfectly collinear (or there is not enough independent variation among them)')];
      const beta = matrixMultiply(XtXinv, matrixMultiply(Xt, y)).map(row => row[0]);

      const yVals = y.map(row => row[0]);
      const yMean = yVals.reduce((s, v) => s + v, 0) / n;
      const fitted = X.map(row => row.reduce((s, xij, j) => s + xij * beta[j], 0));
      const residuals = yVals.map((v, i) => v - fitted[i]);

      const SSE = residuals.reduce((s, r) => s + r * r, 0);
      const SST = yVals.reduce((s, v) => s + (v - yMean) ** 2, 0);
      const SSR = SST - SSE;

      const dfReg = k, dfRes = n - k - 1;
      const MSE = SSE / dfRes, MSR = SSR / dfReg;
      const Fstat = MSR / MSE;
      const pF = 1 - jStat.centralF.cdf(Fstat, dfReg, dfRes);

      const R2 = SST === 0 ? 0 : SSR / SST;
      const R2adj = 1 - (1 - R2) * (n - 1) / dfRes;

      const seBeta  = beta.map((_, j) => Math.sqrt(MSE * XtXinv[j][j]));
      const tStats  = beta.map((b, j) => b / seBeta[j]);
      const pStats  = tStats.map(t => 2 * (1 - jStat.studentt.cdf(Math.abs(t), dfRes)));
      const tCrit   = jStat.studentt.inv(0.975, dfRes);
      const ciBeta  = beta.map((b, j) => [b - tCrit * seBeta[j], b + tCrit * seBeta[j]]);

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const isSignificant = pF < 0.05;

      const rows = [
        { label: 'Sample Size (n) / Predictors (k)', value: `${n} / ${k}`, ci: null, isRatio: false, isText: true },
        { label: 'Intercept (β₀)', value: f(beta[0]), ci: [f(ciBeta[0][0]), f(ciBeta[0][1])], isRatio: false },
        { label: 'SE(β₀), t & p-value', isText: true, ci: null, isRatio: false,
          value: `SE = ${f(seBeta[0])}, t = ${f(tStats[0])}, ${formatPText(pStats[0])}` },
      ];

      for (let j = 1; j <= k; j++) {
        rows.push(
          { label: `Coefficient ${subscriptLabel('β', j)} (${subscriptLabel('X', j)})`, value: f(beta[j]),
            ci: [f(ciBeta[j][0]), f(ciBeta[j][1])], isRatio: false, highlight: true },
          { label: `SE(${subscriptLabel('β', j)}), t & p-value`, isText: true, ci: null, isRatio: false,
            value: `SE = ${f(seBeta[j])}, t = ${f(tStats[j])}, ${formatPText(pStats[j])}` },
        );
      }

      rows.push(
        { label: 'R² (proportion of variance explained)', value: f(R2), ci: null, isRatio: false, highlight: true },
        { label: 'Adjusted R²', value: f(R2adj), ci: null, isRatio: false },
        { label: `F(${dfReg}, ${dfRes}) & p-value`, isText: true, ci: null, isRatio: false, highlight: true,
          value: `F = ${f(Fstat)}, ${formatPText(pF)}` },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — the model as a whole significantly predicts Y' : 'Fail to reject H₀ — the model does not significantly predict Y' },
      );

      return rows;
    }
  },

  /* ── 51. LOGISTIC REGRESSION (2×2) ──────────────────────────────────────
     Logistic regression with a single binary predictor has an exact
     closed-form solution (no iterative fitting needed): β₁ is exactly
     ln(OR), and β₀ is the log-odds of the outcome at X = 0 — the same
     Wald SE already used for ln(OR) in 'Measures of Association',
     just presented in regression terms. Same case-control caveat as
     that calculator applies here too, but only to the intercept: β₀
     (and the predicted probabilities derived from it) reflects the
     sample's outcome prevalence, which is investigator-fixed under
     case-control sampling — β₁/OR is unaffected, since it's invariant
     to which margin was fixed.                                       */
  {
    id:          'logistic-regression',
    name:        'Logistic Regression (2×2)',
    hint:        'logit(P) = β₀ + β₁X, β₁ = ln(OR)',
    category:    'Correlation & Regression',
    description: 'Estimates the log-odds and OR from a 2×2 table using logistic regression.',

    formulas: [
      {
        label: 'Logistic Model',
        latex: '\\text{logit}\\big(P(Y=1)\\big) = \\beta_0 + \\beta_1 X'
      },
      {
        label: 'Closed-Form Coefficients (single binary predictor)',
        latex: '\\beta_0 = \\ln\\dfrac{c}{d} \\qquad \\beta_1 = \\ln(OR) = \\ln\\dfrac{ad}{bc}'
      },
      {
        label: 'Standard Errors (Wald)',
        latex: 'SE(\\beta_0)=\\sqrt{\\tfrac{1}{c}+\\tfrac{1}{d}} \\qquad SE(\\beta_1)=\\sqrt{\\tfrac{1}{a}+\\tfrac{1}{b}+\\tfrac{1}{c}+\\tfrac{1}{d}}'
      }
    ],

    inputLayout: '2x2',
    tableLabels: { colPos: 'Outcome (Y=1)', colNeg: 'Outcome (Y=0)', rowPos: 'Exposed (X=1)', rowNeg: 'Unexposed (X=0)' },
    inputs: [
      { id: 'a', label: 'a', desc: 'X=1 (Exposed) & Y=1',   default: 45 },
      { id: 'b', label: 'b', desc: 'X=1 (Exposed) & Y=0',   default: 55 },
      { id: 'c', label: 'c', desc: 'X=0 (Unexposed) & Y=1', default: 20 },
      { id: 'd', label: 'd', desc: 'X=0 (Unexposed) & Y=0', default: 80 },
      { id: 'design', type: 'select', label: 'Study Design (affects whether the intercept is valid)', default: 'cohort',
        note: 'Tell it how these four counts were collected. If cases and controls were recruited separately rather than observed naturally, choose Case-Control — the intercept and predicted probabilities will be replaced with an explanation of why they can’t be trusted for that design, while the slope/odds ratio remains valid regardless.',
        options: [
          { value: 'cohort',        label: 'Cohort / RCT — rows sampled by exposure' },
          { value: 'cross-sectional', label: 'Cross-Sectional — exposure & outcome measured at once' },
          { value: 'case-control',  label: 'Case-Control — rows/columns sampled by outcome' },
        ] },
    ],

    example({ a, b, c, d, design }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v <= 0))
        return 'Enter counts greater than 0 for all four cells to see a worked medical example here.';
      const beta1 = Math.log((a * d) / (b * c));
      const OR = Math.exp(beta1);
      const f = v => +v.toFixed(3);
      if (design === 'case-control')
        return `A case-control study of ${a + b + c + d} subjects models the odds of exposure (X) as a function of case/control status (Y) — the roles are swapped from a cohort study, but β₁ = ${f(beta1)} is still exactly ln(OR), giving OR = ${f(OR)}. The intercept β₀ would NOT be valid here, since it reflects this sample's case:control ratio (fixed by recruitment) rather than the real-world outcome prevalence, so predicted probabilities derived from it are meaningless.`;
      return `A study of ${a + b + c + d} patients models the odds of a disease outcome (Y) as a function of a single exposure (X): β₁ = ${f(beta1)} is exactly ln(OR), so exponentiating gives OR = ${f(OR)} directly. Logistic regression with a single binary predictor doesn't need iterative fitting — it reduces to the same odds ratio you'd get from a plain 2×2 table.`;
    },

    calculate({ a, b, c, d, design }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v <= 0))
        return [err('All four cells must be greater than 0')];

      const beta0 = Math.log(c / d);
      const beta1 = Math.log((a * d) / (b * c));
      const seBeta0 = Math.sqrt(1 / c + 1 / d);
      const seBeta1 = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
      const z0 = beta0 / seBeta0;
      const z1 = beta1 / seBeta1;
      const p0 = normalTwoTailedP(z0);
      const p1 = normalTwoTailedP(z1);

      const Z  = 1.96;
      const OR = Math.exp(beta1);
      const ciOR = [Math.exp(beta1 - Z * seBeta1), Math.exp(beta1 + Z * seBeta1)];
      const ciBeta1 = [beta1 - Z * seBeta1, beta1 + Z * seBeta1];

      const pAtX1 = a / (a + b);
      const pAtX0 = c / (c + d);
      const isSignificant = p1 < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const isCaseControl = design === 'case-control';

      const rows = [];

      if (isCaseControl) {
        rows.push({
          label: 'Intercept (β₀) & Predicted Probabilities — NOT VALID for this design', isText: true, ci: null, isRatio: false, isError: true,
          value: `Not shown: under case-control sampling the outcome (Y) prevalence is fixed by recruitment, not natural — so β₀ (would read ${f(beta0)}) and predicted P(Y=1|X) don't reflect real-world probabilities. β₁/OR is unaffected, since it's invariant to which margin was fixed.`
        });
      } else {
        rows.push(
          { label: 'Intercept (β₀) — log-odds at X=0', value: f(beta0), ci: null, isRatio: false },
          { label: 'z (β₀) & p-value', isText: true, ci: null, isRatio: false, value: `z = ${f(z0)}, ${formatPText(p0)}` },
        );
      }

      rows.push(
        { label: 'Slope (β₁) = ln(OR)', value: f(beta1), ci: [f(ciBeta1[0]), f(ciBeta1[1])], isRatio: false, highlight: true },
        { label: 'z (β₁) & p-value', isText: true, ci: null, isRatio: false, value: `z = ${f(z1)}, ${formatPText(p1)}` },
        { label: 'Odds Ratio (OR = e^β₁)', value: f(OR), ci: [f(ciOR[0]), f(ciOR[1])], isRatio: true, highlight: true },
      );

      if (!isCaseControl) {
        rows.push(
          { label: 'Predicted P(Y=1 | X=1)', value: f(pAtX1), ci: null, isRatio: false },
          { label: 'Predicted P(Y=1 | X=0)', value: f(pAtX0), ci: null, isRatio: false },
        );
      }

      rows.push({ label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
        value: isSignificant ? 'Reject H₀ — X is a significant predictor of Y (OR ≠ 1)' : 'Fail to reject H₀ — no significant association (OR not significantly different from 1)' });

      return rows;
    }
  },

  /* ── 51a. MULTIVARIABLE OUTCOME PREDICTOR ──────────────────────────────
     Scores a NEW individual from a linear or logistic equation the
     user already has — an intercept plus a coefficient and a value
     for each predictor (e.g. diet, health behavior, medication use) —
     rather than fitting a model from raw data the way Multiple Linear
     Regression / Logistic Regression (2×2) do. Deliberately generic:
     this site can't responsibly assert real-world coefficients for
     "diet" or "medications" on someone's behalf, so the coefficients
     are always supplied by the user (from a model already fit on
     their own data, or a published equation), and this just evaluates
     that equation. 3 predictor slots are mandatory, 3 more optional,
     matching the up-to-6-groups pattern used elsewhere on this site.  */
  {
    id:          'multivariable-predictor',
    name:        'Multivariable Outcome Predictor',
    hint:        'η = β₀+Σβᵢxᵢ; ŷ=η or P=1/(1+e⁻ᵑ)',
    category:    'Correlation & Regression',
    description: 'Computes a predicted outcome — or predicted probability — for a new individual from a linear or logistic equation you supply: an intercept plus a coefficient and a value for each predictor (e.g. diet, health behavior, medication use).',

    formulas: [
      {
        label: 'Linear Predictor',
        latex: '\\eta = \\beta_0 + \\beta_1 x_1 + \\beta_2 x_2 + \\cdots + \\beta_k x_k'
      },
      {
        label: 'Predicted Outcome — Continuous',
        latex: '\\hat{y} = \\eta'
      },
      {
        label: 'Predicted Probability — Binary Outcome',
        latex: '\\hat{P}(Y=1) = \\dfrac{1}{1+e^{-\\eta}}'
      }
    ],

    inputLayout: 'groups',
    groupTerm: 'Predictor',
    groupFields: [
      { prefix: 'coef', label: 'Coefficient (β)' },
      { prefix: 'val',  label: 'Value (x)' },
    ],
    groupLabels: ['Diet', 'Health Behavior', 'Medications'],
    inputs: [
      { id: 'outcomeType', type: 'select', label: 'Outcome Type', default: 'continuous',
        note: 'Continuous predicts the outcome value directly (e.g. blood pressure). Binary/Probability applies the logistic transform to give a predicted probability between 0 and 1 (e.g. risk of a diagnosis) — use this when your coefficients came from a logistic regression.',
        options: [
          { value: 'continuous', label: 'Continuous Outcome (linear prediction)' },
          { value: 'binary',     label: 'Binary Outcome (predicted probability)' },
        ] },
      { id: 'intercept', label: 'Intercept (β₀)', default: 2.5 },
      { id: 'coef1', label: 'Predictor 1 Coefficient (β₁) — e.g. Diet', default: -0.15 },
      { id: 'val1',  label: 'Predictor 1 Value (x₁) — e.g. Diet Quality Score (0–10)', default: 6 },
      { id: 'coef2', label: 'Predictor 2 Coefficient (β₂) — e.g. Health Behavior', default: -0.30 },
      { id: 'val2',  label: 'Predictor 2 Value (x₂) — e.g. Exercise Days/Week', default: 3 },
      { id: 'coef3', label: 'Predictor 3 Coefficient (β₃) — e.g. Medications', default: 0.40 },
      { id: 'val3',  label: 'Predictor 3 Value (x₃) — e.g. Number of Medications', default: 2 },
      { id: 'coef4', label: 'Predictor 4 Coefficient (optional)', default: '' },
      { id: 'val4',  label: 'Predictor 4 Value (optional)',       default: '' },
      { id: 'coef5', label: 'Predictor 5 Coefficient (optional)', default: '' },
      { id: 'val5',  label: 'Predictor 5 Value (optional)',       default: '' },
      { id: 'coef6', label: 'Predictor 6 Coefficient (optional)', default: '' },
      { id: 'val6',  label: 'Predictor 6 Value (optional)',       default: '' },
    ],

    example({ outcomeType, intercept, coef1, val1, coef2, val2, coef3, val3, coef4, val4, coef5, val5, coef6, val6 }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      if (!isFinite(intercept))
        return 'Enter an intercept and at least one predictor coefficient/value pair to see a worked medical example here.';
      const pairs = [[coef1, val1], [coef2, val2], [coef3, val3], [coef4, val4], [coef5, val5], [coef6, val6]];
      let eta = intercept, k = 0;
      for (const [c, v] of pairs) {
        const cOk = provided(c), vOk = provided(v);
        if (cOk && vOk) { eta += c * v; k++; }
        else if (cOk || vOk) return 'Enter both a coefficient and a value for each predictor you use, or leave both blank.';
      }
      if (k === 0) return 'Enter an intercept and at least one predictor coefficient/value pair to see a worked medical example here.';
      const isBinary = outcomeType === 'binary';
      const f = v => +v.toFixed(3);
      return isBinary
        ? `Using a logistic model with an intercept of ${intercept} and ${k} predictor${k > 1 ? 's' : ''} (e.g. diet, health behavior, medication use), this patient's linear predictor works out to η = ${f(eta)}, giving a predicted probability of the outcome of ${f((1 / (1 + Math.exp(-eta))) * 100)}% — plug in your own fitted model's coefficients to score any new individual.`
        : `Using a linear model with an intercept of ${intercept} and ${k} predictor${k > 1 ? 's' : ''} (e.g. diet, health behavior, medication use), this individual's predicted outcome is ŷ = ${f(eta)} — plug in your own fitted model's coefficients to score any new individual.`;
    },

    calculate({ outcomeType, intercept, coef1, val1, coef2, val2, coef3, val3, coef4, val4, coef5, val5, coef6, val6 }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      if (!isFinite(intercept)) return [err('Intercept (β₀) is required')];

      const pairs = [
        { c: coef1, v: val1, n: 1 }, { c: coef2, v: val2, n: 2 }, { c: coef3, v: val3, n: 3 },
        { c: coef4, v: val4, n: 4 }, { c: coef5, v: val5, n: 5 }, { c: coef6, v: val6, n: 6 },
      ];

      let eta = intercept;
      const terms = [];
      for (const { c, v, n } of pairs) {
        const cOk = provided(c), vOk = provided(v);
        if (cOk && vOk) { eta += c * v; terms.push({ n, contribution: c * v }); }
        else if (cOk || vOk) return [err(`Predictor ${n}: enter both a coefficient and a value, or leave both blank`)];
      }
      if (terms.length === 0) return [err('Enter at least one predictor (coefficient and value)')];

      const isBinary = outcomeType === 'binary';
      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = terms.map(t =>
        ({ label: `Predictor ${t.n} Contribution (β${t.n}·x${t.n})`, value: f(t.contribution), ci: null, isRatio: false })
      );

      rows.push({ label: 'Linear Predictor (η)', value: f(eta), ci: null, isRatio: false });

      if (isBinary) {
        const prob = 1 / (1 + Math.exp(-eta));
        rows.push({ label: 'Predicted Probability P(Y=1)', value: f(prob), ci: null, isRatio: false, highlight: true });
      } else {
        rows.push({ label: 'Predicted Outcome (ŷ)', value: f(eta), ci: null, isRatio: false, highlight: true });
      }

      rows.push({ label: 'Note', isText: true, ci: null, isRatio: false,
        value: "This is a point prediction from the equation you supplied — it doesn't fit or validate a model from data, and it has no confidence interval since that would require the full covariance matrix of the coefficients. Get the intercept and coefficients from a model already fit to your own data (e.g. Multiple Linear Regression or Logistic Regression on this site) or from a published equation, then use this to score a new individual." });

      return rows;
    }
  },

  /* ── 52. PEARSON'S CORRELATION ──────────────────────────────────────────
     r from raw paired (X, Y) data, with a t-test of significance and
     a Fisher z-transform 95% CI — the same Fisher z math already used
     in 'Standard Error of a Correlation Coefficient', just computed
     from raw data instead of a given r. Shares its default dataset
     with 'Simple Linear Regression' (r² there equals R² here).       */
  {
    id:          'pearson-r',
    name:        "Pearson's Correlation",
    hint:        'r = Sxy/√(SxxSyy), t = r√(n−2)/√(1−r²)',
    category:    'Correlation & Regression',
    description: 'Measures the strength and direction of the linear relationship between two continuous variables.',

    formulas: [
      {
        label: 'Pearson Correlation Coefficient',
        latex: 'r = \\dfrac{S_{xy}}{\\sqrt{S_{xx}S_{yy}}}'
      },
      {
        label: 'Significance Test',
        latex: 't = \\dfrac{r\\sqrt{n-2}}{\\sqrt{1-r^2}} \\;\\sim\\; t_{n-2}'
      },
      {
        label: "Fisher's z 95% CI",
        latex: 'z=\\tfrac{1}{2}\\ln\\dfrac{1+r}{1-r} \\qquad SE(z)=\\dfrac{1}{\\sqrt{n-3}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'x', type: 'textarea', label: 'X Values (comma-separated)', default: '8.75,14.51,12.32,10.99,6.56,6.56,5.58,13.66,11.01,12.08' },
      { id: 'y', type: 'textarea', label: 'Y Values (comma-separated)', default: '12.06,21.00,16.36,14.76,10.86,6.55,5.75,17.77,13.69,17.62' },
    ],

    example({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)) || xs.length !== ys.length || xs.length < 3)
        return 'Enter at least 3 paired X/Y values to see a worked medical example here.';
      const n = xs.length;
      const xMean = xs.reduce((s, v) => s + v, 0) / n;
      const yMean = ys.reduce((s, v) => s + v, 0) / n;
      const Sxy = xs.reduce((s, v, i) => s + (v - xMean) * (ys[i] - yMean), 0);
      const Sxx = xs.reduce((s, v) => s + (v - xMean) ** 2, 0);
      const Syy = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);
      if (Sxx === 0 || Syy === 0) return 'Enter X and Y values that each vary to see a worked medical example here.';
      const r = Math.max(-1, Math.min(1, Sxy / Math.sqrt(Sxx * Syy)));
      const f = v => +v.toFixed(3);
      const strength = Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.4 ? 'moderate' : 'weak';
      return `A study of ${n} patients measures BMI (X) and blood pressure (Y). r = ${f(r)} indicates a ${strength} ${r >= 0 ? 'positive' : 'negative'} linear relationship — as BMI rises, blood pressure tends to ${r >= 0 ? 'rise' : 'fall'} too, though r alone says nothing about whether one causes the other.`;
    },

    calculate({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      if (xs.length !== ys.length) return [err('X and Y must have the same number of values (paired data)')];
      const n = xs.length;
      if (n < 3) return [err('Need at least 3 paired points')];

      const xMean = xs.reduce((s, v) => s + v, 0) / n;
      const yMean = ys.reduce((s, v) => s + v, 0) / n;
      const Sxy = xs.reduce((s, v, i) => s + (v - xMean) * (ys[i] - yMean), 0);
      const Sxx = xs.reduce((s, v) => s + (v - xMean) ** 2, 0);
      const Syy = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);
      if (Sxx === 0 || Syy === 0) return [err('X and Y must each vary — one of them is constant')];

      let r = Sxy / Math.sqrt(Sxx * Syy);
      r = Math.max(-1, Math.min(1, r));
      const isPerfect = Math.abs(r) >= 1;

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const rows = [
        { label: 'Sample Size (n)', value: n, ci: null, isRatio: false },
      ];

      let rCI = null;
      if (!isPerfect && n >= 4) {
        const z   = 0.5 * Math.log((1 + r) / (1 - r));
        const seZ = 1 / Math.sqrt(n - 3);
        rCI = [Math.tanh(z - 1.96 * seZ), Math.tanh(z + 1.96 * seZ)];
      }
      rows.push({ label: 'Pearson r', value: f(r), ci: rCI ? [f(rCI[0]), f(rCI[1])] : null, isRatio: false, highlight: true });

      if (isPerfect) {
        rows.push({ label: 'Note', isText: true, ci: null, isRatio: false, value: 'A t-test and CI are not defined at a perfect correlation (r = ±1).' });
      } else {
        if (typeof jStat === 'undefined' || !jStat.studentt)
          return [err('The statistics library failed to load — please refresh the page and try again.')];
        const df = n - 2;
        const t  = r * Math.sqrt(df) / Math.sqrt(1 - r * r);
        const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
        const isSignificant = pValue < 0.05;
        rows.push(
          { label: 't-Statistic', value: f(t), ci: null, isRatio: false },
          { label: 'Degrees of Freedom (df)', value: df, ci: null, isRatio: false },
          { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
          { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
            value: isSignificant ? 'Reject H₀ — X and Y are significantly correlated' : 'Fail to reject H₀ — no significant linear correlation' },
        );
      }
      return rows;
    }
  },

  /* ── 53. SPEARMAN'S RANK CORRELATION ────────────────────────────────────
     ρ = the Pearson correlation of the RANKS of X and Y (ties
     averaged via rankWithTies), significance via the same t-
     approximation used for Pearson r — matches R's cor.test(method
     = "spearman") when ties are present (its default for exact = FALSE). */
  {
    id:          'spearman-rho',
    name:        "Spearman's Rank Correlation",
    hint:        'ρ = Pearson r of rank(X), rank(Y)',
    category:    'Correlation & Regression',
    description: 'Non-parametric measure of monotonic association between two ranked variables.',

    formulas: [
      {
        label: "Spearman's ρ",
        latex: '\\rho = \\dfrac{S_{xy}^{rank}}{\\sqrt{S_{xx}^{rank}S_{yy}^{rank}}}, \\quad \\text{ranks average-tied}'
      },
      {
        label: 'Significance Test (t-approximation)',
        latex: 't = \\dfrac{\\rho\\sqrt{n-2}}{\\sqrt{1-\\rho^2}} \\;\\sim\\; t_{n-2}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'x', type: 'textarea', label: 'X Values (comma-separated)', default: '8.75,14.51,12.32,10.99,6.56,6.56,5.58,13.66,11.01,12.08' },
      { id: 'y', type: 'textarea', label: 'Y Values (comma-separated)', default: '12.06,21.00,16.36,14.76,10.86,6.55,5.75,17.77,13.69,17.62' },
    ],

    example({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)) || xs.length !== ys.length || xs.length < 4)
        return 'Enter at least 4 paired X/Y values to see a worked medical example here.';
      const n = xs.length;
      const rankX = rankWithTies(xs).ranks;
      const rankY = rankWithTies(ys).ranks;
      const rxMean = rankX.reduce((s, v) => s + v, 0) / n;
      const ryMean = rankY.reduce((s, v) => s + v, 0) / n;
      const Sxy = rankX.reduce((s, v, i) => s + (v - rxMean) * (rankY[i] - ryMean), 0);
      const Sxx = rankX.reduce((s, v) => s + (v - rxMean) ** 2, 0);
      const Syy = rankY.reduce((s, v) => s + (v - ryMean) ** 2, 0);
      if (Sxx === 0 || Syy === 0) return 'Enter X and Y values that each vary to see a worked medical example here.';
      const rho = Math.max(-1, Math.min(1, Sxy / Math.sqrt(Sxx * Syy)));
      const f = v => +v.toFixed(3);
      return `A study ranks ${n} patients' pain scores (a subjective 1-10 scale, not a true linear measurement) against their dose of a new analgesic. Since pain scores aren't guaranteed evenly spaced, ranking both variables before correlating is more appropriate than Pearson's r: ρ = ${f(rho)} captures whether higher doses consistently rank with lower pain, even if the relationship isn't perfectly linear.`;
    },

    calculate({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      if (xs.length !== ys.length) return [err('X and Y must have the same number of values (paired data)')];
      const n = xs.length;
      if (n < 4) return [err('Need at least 4 paired points')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const rankX = rankWithTies(xs).ranks;
      const rankY = rankWithTies(ys).ranks;

      const rxMean = rankX.reduce((s, v) => s + v, 0) / n;
      const ryMean = rankY.reduce((s, v) => s + v, 0) / n;
      const Sxy = rankX.reduce((s, v, i) => s + (v - rxMean) * (rankY[i] - ryMean), 0);
      const Sxx = rankX.reduce((s, v) => s + (v - rxMean) ** 2, 0);
      const Syy = rankY.reduce((s, v) => s + (v - ryMean) ** 2, 0);
      if (Sxx === 0 || Syy === 0) return [err('X and Y must each vary — one of them is constant (all ranks tied)')];

      let rho = Sxy / Math.sqrt(Sxx * Syy);
      rho = Math.max(-1, Math.min(1, rho));
      const isPerfect = Math.abs(rho) >= 1;

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const rows = [
        { label: 'Sample Size (n)', value: n, ci: null, isRatio: false },
        { label: "Spearman's ρ", value: f(rho), ci: null, isRatio: false, highlight: true },
      ];

      if (isPerfect) {
        rows.push({ label: 'Note', isText: true, ci: null, isRatio: false, value: 'A t-test is not defined at a perfect correlation (ρ = ±1).' });
      } else {
        const df = n - 2;
        const t  = rho * Math.sqrt(df) / Math.sqrt(1 - rho * rho);
        const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
        const isSignificant = pValue < 0.05;
        rows.push(
          { label: 't-Statistic', value: f(t), ci: null, isRatio: false },
          { label: 'Degrees of Freedom (df)', value: df, ci: null, isRatio: false },
          { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
          { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
            value: isSignificant ? 'Reject H₀ — X and Y are significantly monotonically associated' : 'Fail to reject H₀ — no significant monotonic association' },
        );
      }
      return rows;
    }
  },

  /* ── 54. KENDALL'S τ ────────────────────────────────────────────────────
     Tau-b (tie-corrected) from concordant/discordant pair counts,
     matching the source 'Kendall's tau.R' script's own formula and
     variable names (nC, nD, nX, nY) exactly. Significance via the
     standard large-sample normal approximation (noted as such — the
     script itself doesn't compute a p-value).                        */
  {
    id:          'kendalls-tau',
    name:        "Kendall's τ",
    hint:        'τᵦ = (nC−nD)/√((n₀−nX)(n₀−nY))',
    category:    'Correlation & Regression',
    description: 'Non-parametric correlation based on the number of concordant vs. discordant pairs.',

    formulas: [
      {
        label: 'Concordant & Discordant Pairs',
        latex: 'n_C,\\;n_D \\quad\\text{from all }\\binom{n}{2}\\text{ pairs} \\qquad n_0=\\dfrac{n(n-1)}{2}'
      },
      {
        label: "Kendall's Tau-b (tie-corrected)",
        latex: '\\tau_b=\\dfrac{n_C-n_D}{\\sqrt{(n_0-n_X)(n_0-n_Y)}}'
      },
      {
        label: 'Normal Approximation (significance)',
        latex: 'z=\\dfrac{\\tau_b}{\\sqrt{\\tfrac{2(2n+5)}{9n(n-1)}}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'x', type: 'textarea', label: 'X Values (comma-separated)', default: '9,1,4,4,5' },
      { id: 'y', type: 'textarea', label: 'Y Values (comma-separated)', default: '9,9,8,5,9' },
    ],

    example({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)) || xs.length !== ys.length || xs.length < 4)
        return 'Enter at least 4 paired X/Y values to see a worked medical example here.';
      const n = xs.length;
      let nC = 0, nD = 0, nX = 0, nY = 0;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          if (xs[i] === xs[j]) nX++;
          if (ys[i] === ys[j]) nY++;
          if (xs[i] !== xs[j] && ys[i] !== ys[j]) {
            if ((xs[i] - xs[j]) * (ys[i] - ys[j]) > 0) nC++; else nD++;
          }
        }
      }
      const n0 = n * (n - 1) / 2;
      const denom = Math.sqrt((n0 - nX) * (n0 - nY));
      if (denom === 0) return 'Enter X and Y values that are not all tied to see a worked medical example here.';
      const tau = (nC - nD) / denom;
      const f = v => +v.toFixed(3);
      return `A study ranks ${n} patients on two ordinal scales — say, a physician's severity rating (X) and a patient-reported quality-of-life score (Y), both with only a handful of possible values (ties are common). Rather than comparing exact values, Kendall's τ counts how often pairs of patients agree in ranking (${nC} concordant pairs) versus disagree (${nD} discordant): τᵦ = ${f(tau)}.`;
    },

    calculate({ x, y }) {
      const xs = parseNumberList(x), ys = parseNumberList(y);
      if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v)))
        return [err('All values must be numeric')];
      if (xs.length !== ys.length) return [err('X and Y must have the same number of values (paired data)')];
      const n = xs.length;
      if (n < 4) return [err('Need at least 4 paired points')];

      let nC = 0, nD = 0, nX = 0, nY = 0;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          if (xs[i] === xs[j]) nX++;
          if (ys[i] === ys[j]) nY++;
          if (xs[i] !== xs[j] && ys[i] !== ys[j]) {
            if ((xs[i] - xs[j]) * (ys[i] - ys[j]) > 0) nC++; else nD++;
          }
        }
      }

      const n0 = n * (n - 1) / 2;
      const denom = Math.sqrt((n0 - nX) * (n0 - nY));
      if (denom === 0) return [err('Cannot compute τ — all values are tied in X or in Y')];

      const tau = (nC - nD) / denom;
      const varTau = 2 * (2 * n + 5) / (9 * n * (n - 1));
      const z = tau / Math.sqrt(varTau);
      const pValue = normalTwoTailedP(z);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Sample Size (n)', value: n, ci: null, isRatio: false },
        { label: 'Concordant Pairs (nC)', value: nC, ci: null, isRatio: false },
        { label: 'Discordant Pairs (nD)', value: nD, ci: null, isRatio: false },
        { label: "Kendall's τᵦ", value: f(tau), ci: null, isRatio: false, highlight: true },
        { label: 'z-Statistic (normal approximation)', value: f(z), ci: null, isRatio: false },
        { label: 'p-value (approximate)', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — X and Y are significantly associated' : 'Fail to reject H₀ — no significant association' },
      ];
    }
  },

  /* ── 55. POWER CALCULATIONS ─────────────────────────────────────────────
     One- and two-tailed power for a z-based test, from delta, σ, n,
     and α — re-derived algebraically from the source 'Power
     calculation.R' script (which parameterizes by μ₀/μA instead of
     δ directly; δ = μA − μ₀ is all that actually matters here).      */
  {
    id:          'power-calculations',
    name:        'Power Calculations',
    hint:        'Power = 1 − β, one- and two-tailed',
    category:    'Power & Sample Size',
    description: 'Computes statistical power for one- and two-tailed tests from delta, σ, n, and α.',

    formulas: [
      {
        label: 'One-Tailed Power',
        latex: '\\text{Power} = 1-\\Phi\\!\\left(z_{1-\\alpha} - \\dfrac{\\delta}{SE}\\right), \\quad SE=\\dfrac{\\sigma}{\\sqrt{n}}'
      },
      {
        label: 'Two-Tailed Power',
        latex: '\\text{Power} = \\left[1-\\Phi\\!\\left(z_{1-\\alpha/2}-\\dfrac{\\delta}{SE}\\right)\\right] + \\Phi\\!\\left(-z_{1-\\alpha/2}-\\dfrac{\\delta}{SE}\\right)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'delta', label: 'Effect Size (δ = μA − μ₀)', default: 5.6 },
      { id: 'sigma', label: 'Standard Deviation (σ)',    default: 16  },
      { id: 'n',     label: 'Sample Size (n)',           default: 16  },
      { id: 'alpha', label: 'Significance Level (α)',    default: 0.05 },
    ],

    example({ delta, sigma, n, alpha }) {
      n = Math.round(n);
      if (!isFinite(delta) || !isFinite(sigma) || sigma <= 0 || !isFinite(n) || n < 1 ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter an effect size, SD, sample size, and alpha to see a worked medical example here.';
      const powerTwo = normalPowerTwoTailed(delta, sigma, n, alpha);
      const f = v => +v.toFixed(3);
      const tail = powerTwo < 0.8
        ? 'low — a warning sign the study is underpowered and risks a false negative'
        : "reasonable — gives confidence a true effect wouldn't be missed";
      return `A pilot study with n = ${n} patients (SD ${sigma}) plans to detect an effect of size δ = ${delta} at α = ${alpha}. Power = ${f(powerTwo)} means there's only about a ${(powerTwo * 100).toFixed(0)}% chance this study design would actually detect the effect if it's real — ${tail}.`;
    },

    calculate({ delta, sigma, n, alpha }) {
      n = Math.round(n);
      if (!isFinite(delta))                             return [err('Effect Size is required')];
      if (!isFinite(sigma) || sigma <= 0)               return [err('Standard Deviation must be greater than 0')];
      if (!isFinite(n) || n < 1)                        return [err('Sample Size must be at least 1')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const se = sigma / Math.sqrt(n);
      const zCritOne = jStat.normal.inv(1 - alpha, 0, 1);
      const powerOne = normalPowerOneTailed(delta, sigma, n, alpha);
      const zCritTwo = jStat.normal.inv(1 - alpha / 2, 0, 1);
      const powerTwo = normalPowerTwoTailed(delta, sigma, n, alpha);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Standard Error (SE)',        value: f(se), ci: null, isRatio: false },
        { label: 'z-Critical (one-tailed)',     value: f(zCritOne), ci: null, isRatio: false },
        { label: 'Power (one-tailed)',          value: f(powerOne), ci: null, isRatio: false, highlight: true },
        { label: 'Beta (one-tailed)',           value: f(1 - powerOne), ci: null, isRatio: false },
        { label: 'z-Critical (two-tailed)',     value: f(zCritTwo), ci: null, isRatio: false },
        { label: 'Power (two-tailed)',          value: f(powerTwo), ci: null, isRatio: false, highlight: true },
        { label: 'Beta (two-tailed)',           value: f(1 - powerTwo), ci: null, isRatio: false },
      ];
    }
  },

  /* ── 56. POWER WITH GRAPH ───────────────────────────────────────────────
     One-tailed power with a visualization of H₀/Hₐ, shading α and β
     — direct port of the source 'Power with graph.R' script,
     including its default μ₀/μA/σ/n/α values. μA, n, and α are all
     live sliders (μ₀ and σ stay as fixed typed-in reference values),
     so effect size, sample size, and significance level can each be
     dragged independently while watching the overlap/power redraw —
     this is the site's interactive "power explorer," rather than a
     separate calculator, per user request to extend this one.       */
  {
    id:          'power-with-graph',
    name:        'Power with Graph',
    hint:        'Power = 1 − β, H₀ vs Hₐ overlap',
    category:    'Power & Sample Size',
    description: 'Visualises the overlap of H₀ and Hₐ distributions, shading alpha, beta, and power — drag effect size, sample size, and alpha to explore live, with a toggle between one- and two-tailed tests.',

    formulas: [
      {
        label: 'Critical Value — One-Tailed',
        latex: '\\text{Critical} = \\mu_0 + z_{1-\\alpha}\\cdot SE, \\quad SE=\\dfrac{\\sigma}{\\sqrt{n}}'
      },
      {
        label: 'Critical Values — Two-Tailed',
        latex: '\\text{Critical}_{lower,\\,upper} = \\mu_0 \\mp z_{1-\\alpha/2}\\cdot SE'
      },
      {
        label: 'Beta & Power',
        latex: '\\beta = \\Phi\\!\\left(\\dfrac{\\text{Critical}-\\mu_A}{SE}\\right) \\qquad \\text{Power} = 1-\\beta'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'tails', type: 'select', label: 'Test Direction', default: 'one',
        note: 'One-tailed tests only for an increase above μ₀ — one critical value, all of α on the upper side. Two-tailed tests for a difference in either direction — two critical values, α split evenly between both tails.',
        options: [
          { value: 'one', label: 'One-Tailed (tests for an increase only)' },
          { value: 'two', label: 'Two-Tailed (tests for a difference either way)' },
        ] },
      { id: 'mu0',   label: 'Null Hypothesis Mean (μ₀)', default: 102   },
      { id: 'muA',   type: 'slider', label: 'Alternative Mean (μA) — sets the effect size', default: 113.2, min: 70, max: 150, step: 0.1,
        format: v => v.toFixed(1) },
      { id: 'sigma', label: 'Standard Deviation (σ)',     default: 16    },
      { id: 'n',     type: 'slider', label: 'Sample Size (n)', default: 16, min: 2, max: 100, step: 1,
        format: v => String(Math.round(v)) },
      { id: 'alpha', type: 'slider', label: 'Significance Level (α)', default: 0.025, min: 0.001, max: 0.5, step: 0.001,
        format: v => v.toFixed(3) },
    ],

    example({ mu0, muA, sigma, n, alpha, tails }) {
      n = Math.round(n);
      if (!isFinite(mu0) || !isFinite(muA) || !isFinite(sigma) || sigma <= 0 || !isFinite(n) || n < 1 ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter both hypothesis means, SD, sample size, and alpha to see a worked medical example here.';
      const se = sigma / Math.sqrt(n);
      const isTwoTailed = tails === 'two';
      let beta;
      if (isTwoTailed) {
        const zCrit = jStat.normal.inv(1 - alpha / 2, 0, 1);
        const critUpper = mu0 + zCrit * se, critLower = mu0 - zCrit * se;
        beta = jStat.normal.cdf((critUpper - muA) / se, 0, 1) - jStat.normal.cdf((critLower - muA) / se, 0, 1);
      } else {
        const zCrit = jStat.normal.inv(1 - alpha, 0, 1);
        const criticalValue = mu0 + zCrit * se;
        beta = jStat.normal.cdf((criticalValue - muA) / se, 0, 1);
      }
      const power = 1 - beta;
      const f = v => +v.toFixed(3);
      const tailNote = isTwoTailed ? 'testing for a difference in either direction' : 'testing only for an increase';
      return `A trial expects a treatment to shift a biomarker from a null mean of ${mu0} (H₀) to ${muA} (Hₐ), with SD ${sigma} and n = ${n}, ${tailNote}. The graph shows how much the two distributions overlap: β = ${f(beta)} is the shaded region under Hₐ that still falls in the "fail to reject" zone (a false negative), so power = ${f(power)} is the fraction of the time this design would correctly detect the shift.`;
    },

    calculate({ mu0, muA, sigma, n, alpha, tails }) {
      n = Math.round(n);
      if (!isFinite(mu0) || !isFinite(muA))             return [err('Both μ₀ and μA are required')];
      if (!isFinite(sigma) || sigma <= 0)               return [err('Standard Deviation must be greater than 0')];
      if (!isFinite(n) || n < 1)                        return [err('Sample Size must be at least 1')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const se = sigma / Math.sqrt(n);
      const delta = muA - mu0;
      const isTwoTailed = tails === 'two';

      let zCrit, criticalValue, criticalLower = null, beta;
      if (isTwoTailed) {
        zCrit = jStat.normal.inv(1 - alpha / 2, 0, 1);
        criticalValue = mu0 + zCrit * se;
        criticalLower = mu0 - zCrit * se;
        const zUpper = (criticalValue - muA) / se;
        const zLower = (criticalLower - muA) / se;
        beta = jStat.normal.cdf(zUpper, 0, 1) - jStat.normal.cdf(zLower, 0, 1);
      } else {
        zCrit = jStat.normal.inv(1 - alpha, 0, 1);
        criticalValue = mu0 + zCrit * se;
        const zBeta = (criticalValue - muA) / se;
        beta = jStat.normal.cdf(zBeta, 0, 1);
      }
      const power = 1 - beta;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Standard Error (SE)',   value: f(se), ci: null, isRatio: false },
        { label: 'Effect Size (δ = μA − μ₀)', value: f(delta), ci: null, isRatio: false },
        { label: 'z-Critical',            value: f(zCrit), ci: null, isRatio: false },
      ];

      if (isTwoTailed) {
        rows.push(
          { label: 'Critical Value (Lower)', value: f(criticalLower), ci: null, isRatio: false },
          { label: 'Critical Value (Upper)', value: f(criticalValue), ci: null, isRatio: false },
        );
      } else {
        rows.push({ label: 'Critical Value', value: f(criticalValue), ci: null, isRatio: false });
      }

      rows.push(
        { label: 'Beta (β)',              value: f(beta), ci: null, isRatio: false },
        { label: 'Power (1 − β)',         value: f(power), ci: null, isRatio: false, highlight: true },
        { label: 'H₀ vs Hₐ', isSVG: true, svg: powerDistributionsSVG(mu0, muA, se, criticalValue, alpha, beta, power, criticalLower) },
      );

      // One-tailed is built to detect an INCREASE above μ₀ — its critical
      // value always sits above μ₀. If μA isn't above μ₀, power won't
      // rise with more data the way it usually does: at μA = μ₀ it sits
      // flat at α no matter how large n gets, and at μA < μ₀ it actually
      // falls toward 0 as n grows, since a larger sample pins the estimate
      // more tightly around the true (lower) mean, further from the
      // critical value. Two-tailed doesn't have this issue — it's
      // symmetric, so power rises correctly with n regardless of which
      // direction μA sits relative to μ₀.
      if (!isTwoTailed && delta <= 0) {
        rows.push({ label: 'Note', isText: true, ci: null, isRatio: false,
          value: "μA is at or below μ₀, but this one-tailed test only checks for an increase above μ₀. With no true increase to detect, power won't rise with n — at μA = μ₀ it stays flat at α regardless of sample size, and if μA < μ₀ it actually falls toward 0 as n grows. If you're testing for a decrease, swap which value you call μ₀ vs. μA; if you don't know the direction in advance, switch to Two-Tailed above." });
      }

      return rows;
    }
  },

  /* ── 57. POWER VS EFFECT SIZE & ALPHA ──────────────────────────────────
     Two-tailed power plotted as a continuous function of effect size,
     for three benchmark alpha levels (0.01/0.05/0.10) at a given σ
     and n — plus the exact power at a chosen (δ, α) to highlight.    */
  {
    id:          'power-vs-es-alpha',
    name:        'Power vs Effect Size & Alpha',
    hint:        'Power(δ) curves at α = .01/.05/.10',
    category:    'Power & Sample Size',
    description: 'Plots power as a function of effect size and significance level for a given sample size.',

    formulas: [
      {
        label: 'Two-Tailed Power as a Function of δ',
        latex: '\\text{Power}(\\delta) = \\left[1-\\Phi\\!\\left(z_{1-\\alpha/2}-\\dfrac{\\delta}{SE}\\right)\\right] + \\Phi\\!\\left(-z_{1-\\alpha/2}-\\dfrac{\\delta}{SE}\\right)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'sigma', label: 'Standard Deviation (σ)', default: 16   },
      { id: 'n',     label: 'Sample Size (n)',        default: 16   },
      { id: 'delta', label: 'Effect Size (δ) to Highlight', default: 5.6 },
      { id: 'alpha', label: 'Significance Level (α) to Highlight', default: 0.05 },
    ],

    example({ sigma, n, delta, alpha }) {
      n = Math.round(n);
      if (!isFinite(sigma) || sigma <= 0 || !isFinite(n) || n < 1 || !isFinite(delta) ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter a SD, sample size, effect size, and alpha to see a worked medical example here.';
      const power = normalPowerTwoTailed(delta, sigma, n, alpha);
      const f = v => +v.toFixed(3);
      return `With n = ${n} fixed (SD ${sigma}), this plots power across a whole range of possible effect sizes and alpha levels at once, rather than one delta/alpha pair at a time. At the highlighted δ = ${delta}, α = ${alpha}, power = ${f(power)} — useful for seeing, before running a study, how much power you'd lose by insisting on a stricter α or by the true effect turning out smaller than hoped.`;
    },

    calculate({ sigma, n, delta, alpha }) {
      n = Math.round(n);
      if (!isFinite(sigma) || sigma <= 0)               return [err('Standard Deviation must be greater than 0')];
      if (!isFinite(n) || n < 1)                        return [err('Sample Size must be at least 1')];
      if (!isFinite(delta))                             return [err('Effect Size is required')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const power = normalPowerTwoTailed(delta, sigma, n, alpha);
      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: `Power at δ = ${f(delta, 2)}, α = ${alpha}`, value: f(power), ci: null, isRatio: false, highlight: true },
        { label: 'Power Curves', isSVG: true, svg: powerCurveLineSVG(sigma, n, delta, alpha) },
      ];
    }
  },

  /* ── 58. POST-HOC POWER CALCULATION ────────────────────────────────────
     Achieved power from an observed effect size and n, after a study
     is complete. Shares the same power math as 'Power Calculations'.
     Includes the standard caveat: post-hoc power is a deterministic,
     one-to-one function of the observed p-value, so it adds little
     information beyond the p-value itself — this is a well-known
     limitation of post-hoc (retrospective) power analysis.           */
  {
    id:          'posthoc-power',
    name:        'Post-Hoc Power Calculation',
    hint:        'Achieved power from observed δ̂, σ, n, α',
    category:    'Power & Sample Size',
    description: 'Estimates achieved power for a completed study given its observed effect size and n.',

    formulas: [
      {
        label: 'Achieved (Post-Hoc) Power',
        latex: '\\text{Power} = \\left[1-\\Phi\\!\\left(z_{1-\\alpha/2}-\\dfrac{\\hat\\delta}{SE}\\right)\\right] + \\Phi\\!\\left(-z_{1-\\alpha/2}-\\dfrac{\\hat\\delta}{SE}\\right)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'delta', label: 'Observed Effect Size (δ̂)', default: 5.6 },
      { id: 'sigma', label: 'Observed Standard Deviation (σ)', default: 16 },
      { id: 'n',     label: 'Sample Size (n)',           default: 16  },
      { id: 'alpha', label: 'Significance Level (α)',    default: 0.05 },
    ],

    example({ delta, sigma, n, alpha }) {
      n = Math.round(n);
      if (!isFinite(delta) || !isFinite(sigma) || sigma <= 0 || !isFinite(n) || n < 1 ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter an observed effect size, SD, sample size, and alpha to see a worked medical example here.';
      const powerTwo = normalPowerTwoTailed(delta, sigma, n, alpha);
      const f = v => +v.toFixed(3);
      return `A completed trial (n = ${n}, observed effect δ̂ = ${delta}, SD ${sigma}) reports its achieved power was ${f(powerTwo)}. This number is mathematically determined entirely by the study's own p-value — it adds no new information about whether the drug truly works, and shouldn't be used to argue a non-significant result was "trending" toward significance; it's a description of the study's design, not new evidence.`;
    },

    calculate({ delta, sigma, n, alpha }) {
      n = Math.round(n);
      if (!isFinite(delta))                             return [err('Observed Effect Size is required')];
      if (!isFinite(sigma) || sigma <= 0)               return [err('Observed Standard Deviation must be greater than 0')];
      if (!isFinite(n) || n < 1)                        return [err('Sample Size must be at least 1')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const se = sigma / Math.sqrt(n);
      const powerTwo = normalPowerTwoTailed(delta, sigma, n, alpha);
      const powerOne = normalPowerOneTailed(delta, sigma, n, alpha);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Standard Error (SE)',            value: f(se), ci: null, isRatio: false },
        { label: 'Achieved Power (two-tailed)',    value: f(powerTwo), ci: null, isRatio: false, highlight: true },
        { label: 'Achieved Power (one-tailed)',    value: f(powerOne), ci: null, isRatio: false },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'Post-hoc power is a direct function of the observed p-value and adds little independent information — interpret with caution, and prefer a-priori power analysis when planning a study.' },
      ];
    }
  },

  /* ── 59. POWER, EFFECT SIZE, PPV & FPP ──────────────────────────────────
     Links a study's statistical power (and significance threshold)
     to the positive predictive value of a "significant" finding,
     using the standard pre-study-odds framework (Ioannidis 2005):
     PPV = Power·R / (Power·R + α), where R is the pre-study odds
     that the tested effect is real.                                  */
  {
    id:          'power-ppv-fpp',
    name:        'Power, Effect Size, PPV & FPP',
    hint:        'PPV = (Power·R)/(Power·R+α)',
    category:    'Power & Sample Size',
    description: 'Links statistical power to positive predictive value and false positive probability.',

    formulas: [
      {
        label: 'Pre-Study Odds',
        latex: 'R = \\dfrac{\\pi}{1-\\pi}, \\quad \\pi = \\text{pre-study probability that } H_1 \\text{ is true}'
      },
      {
        label: 'Positive Predictive Value & False Positive Probability',
        latex: 'PPV = \\dfrac{(1-\\beta)R}{(1-\\beta)R+\\alpha} \\qquad FPP = 1-PPV = \\dfrac{\\alpha}{(1-\\beta)R+\\alpha}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'power',    label: 'Statistical Power (1 − β)',              default: 0.8 },
      { id: 'alpha',    label: 'Significance Level (α)',                 default: 0.05 },
      { id: 'priorProb', label: 'Pre-Study Probability H₁ True (π, 0–1)', default: 0.5 },
    ],

    example({ power, alpha, priorProb }) {
      if (!isFinite(power) || power <= 0 || power > 1 || !isFinite(alpha) || alpha <= 0 || alpha >= 1 ||
          !isFinite(priorProb) || priorProb <= 0 || priorProb >= 1)
        return 'Enter statistical power, alpha, and a pre-study probability to see a worked medical example here.';
      const R = priorProb / (1 - priorProb);
      const PPV = (power * R) / (power * R + alpha);
      const f = v => +v.toFixed(1);
      return `Before a genomics study is even run, only about ${f(priorProb * 100)}% of the biomarker-disease associations it's testing are expected to be real — many are tested speculatively. Even with a well-powered study (${f(power * 100)}% power) at α = ${alpha}, only about ${f(PPV * 100)}% of "significant" findings will turn out to be genuinely real — a stark illustration of why a single significant p-value from a low-prior-probability search should be treated cautiously until replicated.`;
    },

    calculate({ power, alpha, priorProb }) {
      if (!isFinite(power) || power <= 0 || power > 1)         return [err('Statistical Power must be between 0 and 1')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1)         return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(priorProb) || priorProb <= 0 || priorProb >= 1) return [err('Pre-Study Probability must be between 0 and 1 (exclusive)')];

      const R = priorProb / (1 - priorProb);
      const PPV = (power * R) / (power * R + alpha);
      const FPP = 1 - PPV;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Pre-Study Odds (R)',                  value: f(R), ci: null, isRatio: false },
        { label: 'Positive Predictive Value (PPV)',     value: f(PPV), ci: null, isRatio: false, highlight: true },
        { label: 'False Positive Probability (FPP)',    value: f(FPP), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: `Of studies reporting a "significant" result under these assumptions, about ${f(PPV * 100, 1)}% are expected to reflect a true effect.` },
      ];
    }
  },

  /* ── 60. POWER AS A FUNCTION OF δ & α ──────────────────────────────────
     Reference table of two-tailed power across a range of effect
     sizes (expressed as Cohen's d = δ/σ) and alpha levels, for a
     given σ and n — the tabular counterpart to the line-chart view
     in 'Power vs Effect Size & Alpha'.                               */
  {
    id:          'power-delta-alpha',
    name:        'Power as a Function of δ & α',
    hint:        'Power(δ, α) reference table',
    category:    'Power & Sample Size',
    description: 'Shows how power changes across a range of delta and alpha values simultaneously.',

    formulas: [
      {
        label: 'Two-Tailed Power',
        latex: '\\text{Power}(\\delta,\\alpha) = \\left[1-\\Phi\\!\\left(z_{1-\\alpha/2}-\\dfrac{\\delta}{SE}\\right)\\right] + \\Phi\\!\\left(-z_{1-\\alpha/2}-\\dfrac{\\delta}{SE}\\right)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'sigma', label: 'Standard Deviation (σ)', default: 16   },
      { id: 'n',     label: 'Sample Size (n)',        default: 16   },
      { id: 'delta', label: 'Effect Size (δ) to Highlight', default: 5.6 },
      { id: 'alpha', label: 'Significance Level (α) to Highlight', default: 0.05 },
    ],

    example({ sigma, n, delta, alpha }) {
      n = Math.round(n);
      if (!isFinite(sigma) || sigma <= 0 || !isFinite(n) || n < 1 || !isFinite(delta) ||
          !isFinite(alpha) || alpha <= 0 || alpha >= 1 || typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter a SD, sample size, effect size, and alpha to see a worked medical example here.';
      const power = normalPowerTwoTailed(delta, sigma, n, alpha);
      const f = v => +v.toFixed(3);
      return `Rather than computing one power value at a time, this reference table shows power at every combination of a benchmark set of effect sizes and alpha levels for the same n = ${n}, SD ${sigma} — handy for skimming how sensitive your planned study is to assumptions you're still unsure about. The highlighted cell (δ = ${delta}, α = ${alpha}) gives power = ${f(power)}.`;
    },

    calculate({ sigma, n, delta, alpha }) {
      n = Math.round(n);
      if (!isFinite(sigma) || sigma <= 0)               return [err('Standard Deviation must be greater than 0')];
      if (!isFinite(n) || n < 1)                        return [err('Sample Size must be at least 1')];
      if (!isFinite(delta))                             return [err('Effect Size is required')];
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const power = normalPowerTwoTailed(delta, sigma, n, alpha);
      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: `Power at δ = ${f(delta, 2)}, α = ${alpha}`, value: f(power), ci: null, isRatio: false, highlight: true },
        { label: 'Reference Table', isSVG: true, svg: powerDeltaAlphaTableHTML(sigma, n, delta, alpha) },
      ];
    }
  },

  /* ── 60a. TYPE I & TYPE II ERROR EXPLORER ──────────────────────────────
     A purely conceptual companion to the power calculators above: the
     full 2×2 decision matrix (reality × decision) with all four
     outcomes labeled and colored, so Type I and Type II error are seen
     side by side with the two ways of being correct, rather than as
     isolated numbers. α and Power are dragged directly; β is always
     shown as their derived complement.                                */
  {
    id:          'type1-type2-errors',
    name:        'Type I & Type II Error Explorer',
    hint:        'Decision matrix: α, β, and power',
    category:    'Power & Sample Size',
    description: 'An interactive decision matrix showing all four possible outcomes of a hypothesis test — two correct decisions and two errors — and how trading off α against power shifts the risk of each.',

    formulas: [
      {
        label: 'The Four Outcomes of a Hypothesis Test',
        latex: 'P(\\text{Type I}) = \\alpha \\qquad P(\\text{Type II}) = \\beta = 1-\\text{Power} \\qquad P(\\text{Correct}) = (1-\\alpha) + \\text{Power}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'alpha', type: 'slider', label: 'Significance Level (α) — Type I error rate', default: 0.05, min: 0.01, max: 0.30, step: 0.01,
        format: v => v.toFixed(2) },
      { id: 'power', type: 'slider', label: 'Statistical Power (1 − β)', default: 0.80, min: 0.05, max: 0.99, step: 0.01,
        format: v => v.toFixed(2) },
    ],

    example({ alpha, power }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1 || !isFinite(power) || power <= 0 || power >= 1)
        return 'Enter a significance level and statistical power to see a worked medical example here.';
      const beta = 1 - power;
      const f = v => +(v * 100).toFixed(1);
      return `A trial is designed with α = ${alpha} and power = ${power}. If the drug truly does nothing, there's a ${f(alpha)}% chance the trial wrongly declares it works (Type I error) and a ${f(1 - alpha)}% chance it correctly finds no effect. If the drug truly works, there's a ${f(power)}% chance the trial correctly detects that (this is exactly what "power" means) and a ${f(beta)}% chance it misses a real effect (Type II error) — the same tradeoff every hypothesis test makes, just with different numbers.`;
    },

    calculate({ alpha, power }) {
      if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) return [err('Significance Level must be between 0 and 1 (exclusive)')];
      if (!isFinite(power) || power <= 0 || power >= 1) return [err('Statistical Power must be between 0 and 1 (exclusive)')];

      const beta = 1 - power;
      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Decision Matrix', isSVG: true, svg: decisionMatrixHTML(alpha, power) },
        { label: 'P(Type I Error) = α',              value: f(alpha),     ci: null, isRatio: false, highlight: true },
        { label: 'P(Type II Error) = β',             value: f(beta),      ci: null, isRatio: false, highlight: true },
        { label: 'P(Correctly retain H₀) = 1 − α',   value: f(1 - alpha), ci: null, isRatio: false },
        { label: 'P(Correctly reject H₀) = Power',   value: f(power),     ci: null, isRatio: false },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: "α and Power are set independently here so you can see each outcome on its own — but in an actual study they're not free to pick separately: for a fixed sample size, tightening α (to cut Type I error risk) mechanically lowers power (raising Type II error risk). The only way to lower both errors at once is a bigger sample size — see the sample-size calculators in this category, or drag n directly in Power with Graph, to see that trade-off play out." },
      ];
    }
  },

  /* ── 61. META-ANALYSIS (Q, τ², I², PI) ─────────────────────────────────
     Generic inverse-variance meta-analysis from up to 6 studies, each
     given as a generic effect estimate + its SE (mean difference,
     log(OR), log(RR), Cohen's d, etc. — whatever scale the estimates
     share). Fixed-effect pooling, Cochran's Q heterogeneity test,
     DerSimonian-Laird τ² and I², random-effects pooling, and a
     Higgins et al. (2009) prediction interval.                       */
  {
    id:          'meta-analysis',
    name:        'Meta-Analysis (Q, τ², I², PI)',
    hint:        'Inverse-variance pooling, DL τ², Higgins PI',
    category:    'Bayesian & Meta-Analysis',
    description: 'Pools effect sizes, tests heterogeneity, and computes prediction intervals.',

    formulas: [
      {
        label: 'Fixed-Effect Pooled Estimate',
        latex: '\\hat\\theta_{FE} = \\dfrac{\\sum w_i y_i}{\\sum w_i}, \\quad w_i=\\dfrac{1}{SE_i^2}'
      },
      {
        label: "Cochran's Q & I²",
        latex: 'Q=\\sum w_i(y_i-\\hat\\theta_{FE})^2 \\qquad I^2=\\max\\!\\left(0,\\dfrac{Q-df}{Q}\\right)\\times100\\%'
      },
      {
        label: 'DerSimonian–Laird τ² & Random-Effects Estimate',
        latex: '\\tau^2=\\max\\!\\left(0,\\dfrac{Q-df}{C}\\right) \\qquad \\hat\\theta_{RE}=\\dfrac{\\sum w_i^{*}y_i}{\\sum w_i^{*}}, \\quad w_i^{*}=\\dfrac{1}{SE_i^2+\\tau^2}'
      },
      {
        label: 'Prediction Interval (Higgins et al., 2009)',
        latex: 'PI=\\hat\\theta_{RE}\\pm t_{k-2,\\,0.975}\\sqrt{\\tau^2+SE_{RE}^2}'
      },
      {
        label: 'Ratio Mode',
        latex: '\\text{For RR/OR: enter } y_i=\\ln(RR_i)\\text{ or }\\ln(OR_i)\\text{ as the effect — pooling happens on the log scale, then results are exponentiated back}'
      }
    ],

    inputLayout: 'groups',
    groupTerm: 'Study',
    groupFields: [
      { prefix: 'effect', label: 'Effect Estimate' },
      { prefix: 'se',     label: 'SE' },
    ],
    inputs: [
      { id: 'scale', type: 'select', label: 'Effect Scale', default: 'additive', options: [
        { value: 'additive', label: 'Additive (mean diff., risk diff., etc.)' },
        { value: 'ratio',    label: 'Ratio (RR/OR — enter log values)' },
      ] },
      { id: 'effect1', label: 'Study 1 Effect Estimate', default: 0.45 },
      { id: 'se1',     label: 'Study 1 SE',               default: 0.12 },
      { id: 'effect2', label: 'Study 2 Effect Estimate', default: 0.30 },
      { id: 'se2',     label: 'Study 2 SE',               default: 0.15 },
      { id: 'effect3', label: 'Study 3 Effect Estimate', default: 0.55 },
      { id: 'se3',     label: 'Study 3 SE',               default: 0.10 },
      { id: 'effect4', label: 'Study 4 Effect Estimate (optional)', default: '' },
      { id: 'se4',     label: 'Study 4 SE (optional)',               default: '' },
      { id: 'effect5', label: 'Study 5 Effect Estimate (optional)', default: '' },
      { id: 'se5',     label: 'Study 5 SE (optional)',               default: '' },
      { id: 'effect6', label: 'Study 6 Effect Estimate (optional)', default: '' },
      { id: 'se6',     label: 'Study 6 SE (optional)',               default: '' },
    ],

    example(values) {
      const { studies, error } = gatherEffectStudies(values);
      if (error || studies.length < 2 || studies.some(s => s.se <= 0) || typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter an effect estimate and SE for at least 2 studies to see a worked medical example here.';
      const isRatio = values.scale === 'ratio';
      const transform = v => isRatio ? Math.exp(v) : v;
      const k = studies.length;
      const w = studies.map(s => 1 / s.se ** 2);
      const sumW = w.reduce((s, v) => s + v, 0);
      const pooledFE = studies.reduce((s, st, i) => s + w[i] * st.effect, 0) / sumW;
      const Q = studies.reduce((s, st, i) => s + w[i] * (st.effect - pooledFE) ** 2, 0);
      const df = k - 1;
      const I2 = Q > 0 ? Math.max(0, (Q - df) / Q) * 100 : 0;
      const heterogeneity = I2 < 25 ? 'low' : I2 < 75 ? 'moderate' : 'high';
      const f = v => +v.toFixed(2);
      const label = isRatio ? 'an RR/OR' : 'a treatment effect';
      const tail = heterogeneity === 'high'
        ? 'they disagree substantially, so a single pooled number may oversimplify real differences between study populations or protocols'
        : 'the trials are reasonably consistent with each other, supporting the pooled estimate';
      return `${k} independent trials each estimate ${label} for the same intervention, but with different sample sizes and thus different SEs. Pooling gives a fixed-effect estimate of ${f(transform(pooledFE))} — but I² = ${f(I2)}% shows ${heterogeneity} heterogeneity across the ${k} trials, meaning ${tail}.`;
    },

    calculate(values) {
      const { studies, error } = gatherEffectStudies(values);
      if (error) return [err(error)];
      if (studies.length < 2) return [err('Enter Effect and SE for at least 2 studies')];
      if (studies.some(s => s.se <= 0)) return [err('Every study SE must be greater than 0')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const isRatio = values.scale === 'ratio';
      const transform = v => isRatio ? Math.exp(v) : v;
      const scaleTag  = isRatio ? ' (log scale)' : '';

      const k = studies.length;
      const Z = 1.96;

      const w = studies.map(s => 1 / s.se ** 2);
      const sumW = w.reduce((s, v) => s + v, 0);
      const pooledFE = studies.reduce((s, st, i) => s + w[i] * st.effect, 0) / sumW;
      const seFE = Math.sqrt(1 / sumW);

      const Q  = studies.reduce((s, st, i) => s + w[i] * (st.effect - pooledFE) ** 2, 0);
      const df = k - 1;
      const pQ = 1 - jStat.chisquare.cdf(Q, df);
      const I2 = Q > 0 ? Math.max(0, (Q - df) / Q) * 100 : 0;

      const sumW2 = w.reduce((s, v) => s + v ** 2, 0);
      const C = sumW - sumW2 / sumW;
      const tau2 = (df > 0 && C > 0) ? Math.max(0, (Q - df) / C) : 0;

      const wStar = studies.map(s => 1 / (s.se ** 2 + tau2));
      const sumWStar = wStar.reduce((s, v) => s + v, 0);
      const pooledRE = studies.reduce((s, st, i) => s + wStar[i] * st.effect, 0) / sumWStar;
      const seRE = Math.sqrt(1 / sumWStar);

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const heterogeneity = I2 < 25 ? 'low' : I2 < 75 ? 'moderate' : 'high';

      const feLabel = isRatio ? 'Fixed-Effect Pooled RR/OR' : 'Fixed-Effect Pooled Estimate';
      const reLabel = isRatio ? 'Random-Effects Pooled RR/OR' : 'Random-Effects Pooled Estimate';

      const rows = [
        { label: 'Number of Studies (k)', value: k, ci: null, isRatio: false },
        { label: feLabel, value: f(transform(pooledFE)), ci: [f(transform(pooledFE - Z * seFE)), f(transform(pooledFE + Z * seFE))], isRatio, highlight: true },
        { label: `Cochran's Q${scaleTag}`, value: f(Q), ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)', value: df, ci: null, isRatio: false },
        { label: 'p-value (heterogeneity test)', value: formatPValue(pQ), ci: null, isRatio: false },
        { label: 'I² (% variance due to heterogeneity)', value: f(I2, 1), ci: null, isRatio: false, highlight: true },
        { label: `τ² (DerSimonian–Laird)${scaleTag}`, value: f(tau2), ci: null, isRatio: false },
        { label: reLabel, value: f(transform(pooledRE)), ci: [f(transform(pooledRE - Z * seRE)), f(transform(pooledRE + Z * seRE))], isRatio, highlight: true },
      ];

      if (k >= 3) {
        const tCrit = jStat.studentt.inv(0.975, k - 2);
        const piMargin = tCrit * Math.sqrt(tau2 + seRE ** 2);
        rows.push({ label: '95% Prediction Interval', value: f(transform(pooledRE)), ci: [f(transform(pooledRE - piMargin)), f(transform(pooledRE + piMargin))], isRatio, highlight: true });
      } else {
        rows.push({ label: 'Note', isText: true, ci: null, isRatio: false, value: 'A prediction interval needs at least 3 studies (df = k − 2 ≥ 1).' });
      }

      rows.push({
        label: 'Forest Plot', isSVG: true,
        svg: metaForestPlotSVG(studies, w, pooledFE, [pooledFE - Z * seFE, pooledFE + Z * seFE], pooledRE, [pooledRE - Z * seRE, pooledRE + Z * seRE], isRatio)
      });

      rows.push({ label: 'Interpretation', isText: true, ci: null, isRatio: false,
        value: `${heterogeneity[0].toUpperCase()}${heterogeneity.slice(1)} heterogeneity (I² = ${f(I2, 1)}%); Cochran's Q test is ${pQ < 0.05 ? 'significant' : 'not significant'} (${formatPText(pQ)}).` });

      return rows;
    }
  },

  /* ── 62. CRAMER'S V ─────────────────────────────────────────────────────
     Association strength for an r×c contingency table (r, c > 2),
     from a chi-square test of independence. Matches the source
     'Cramer's V 4x4.R' script's method and default 4×4 data exactly. */
  {
    id:          'cramers-v',
    name:        "Cramer's V",
    hint:        'V = √(χ² / (N·min(r−1,c−1)))',
    category:    'Effect Sizes & Agreement',
    description: 'Measures the strength of association in contingency tables larger than 2×2.',

    formulas: [
      {
        label: 'Chi-Square Test of Independence',
        latex: '\\chi^2 = \\sum \\dfrac{(O_{ij}-E_{ij})^2}{E_{ij}}, \\quad E_{ij}=\\dfrac{R_iC_j}{N}'
      },
      {
        label: "Cramer's V",
        latex: 'V = \\sqrt{\\dfrac{\\chi^2}{N\\cdot\\min(r-1,\\,c-1)}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'table', type: 'textarea',
        label: 'Contingency Table (rows separated by lines, cells comma-separated)',
        default: '10,20,15,25\n20,15,30,10\n25,30,20,15\n15,10,25,30'
      },
    ],

    example({ table }) {
      const matrix = parseMatrix(table);
      if (matrix.length < 2) return 'Enter at least 2 rows to see a worked medical example here.';
      const c = matrix[0].length;
      if (c < 2 || matrix.some(row => row.length !== c) || matrix.some(row => row.some(v => !isFinite(v) || v < 0)) ||
          typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter a valid contingency table to see a worked medical example here.';
      const r = matrix.length;
      const N = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0);
      if (N === 0) return 'Enter a table with a total greater than 0 to see a worked medical example here.';
      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const colSums = Array.from({ length: c }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));
      let chi2 = 0;
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          const expected = rowSums[i] * colSums[j] / N;
          if (expected > 0) chi2 += (matrix[i][j] - expected) ** 2 / expected;
        }
      }
      const V = Math.sqrt(chi2 / (N * Math.min(r - 1, c - 1)));
      const f = v => +v.toFixed(3);
      const strength = V < 0.1 ? 'negligible' : V < 0.3 ? 'weak' : V < 0.5 ? 'moderate' : 'strong';
      return `A hospital cross-tabulates ${r} treatment types against ${c} outcome categories — categories with more than 2 levels each, so a plain chi-square or phi coefficient doesn't summarize the strength cleanly. Cramer's V = ${f(V)} indicates a ${strength} association between treatment and outcome, on a 0-to-1 scale comparable across table sizes.`;
    },

    calculate({ table }) {
      const matrix = parseMatrix(table);
      if (matrix.length < 2) return [err('Enter at least 2 rows')];
      const c = matrix[0].length;
      if (c < 2) return [err('Enter at least 2 columns')];
      if (matrix.some(row => row.length !== c)) return [err('Every row must have the same number of columns')];
      if (matrix.some(row => row.some(v => !isFinite(v) || v < 0))) return [err('All cell values must be zero or greater')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const r = matrix.length;
      const N = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0);
      if (N === 0) return [err('Table total must be greater than 0')];

      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const colSums = Array.from({ length: c }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));

      let chi2 = 0;
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          const expected = rowSums[i] * colSums[j] / N;
          if (expected > 0) chi2 += (matrix[i][j] - expected) ** 2 / expected;
        }
      }

      const df = (r - 1) * (c - 1);
      const pValue = 1 - jStat.chisquare.cdf(chi2, df);
      const V = Math.sqrt(chi2 / (N * Math.min(r - 1, c - 1)));
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Table Size', value: `${r} × ${c}`, ci: null, isRatio: false, isText: true },
        { label: 'Total (N)', value: N, ci: null, isRatio: false },
        { label: 'Chi-Square (χ²)', value: f(chi2), ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)', value: df, ci: null, isRatio: false },
        { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false },
        { label: "Cramer's V", value: f(V), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? `Significant association (V = ${f(V)})` : 'No significant association' },
      ];
    }
  },

  /* ── 63. PHI COEFFICIENT (2×2) ──────────────────────────────────────────
     Association between two binary variables — the 2×2 special case
     of Cramer's V (φ = √(χ²/N) exactly when r = c = 2).             */
  {
    id:          'phi-coefficient',
    name:        'Phi Coefficient (2×2)',
    hint:        'φ = (ad−bc)/√((a+b)(c+d)(a+c)(b+d))',
    category:    'Effect Sizes & Agreement',
    description: 'Measures the association between two binary variables in a 2×2 table.',

    formulas: [
      {
        label: 'Phi Coefficient',
        latex: '\\varphi = \\dfrac{ad-bc}{\\sqrt{(a+b)(c+d)(a+c)(b+d)}}'
      },
      {
        label: 'Equivalent Chi-Square',
        latex: '\\chi^2 = N\\varphi^2'
      }
    ],

    inputLayout: '2x2',
    tableLabels: { colPos: 'Variable B +', colNeg: 'Variable B −', rowPos: 'Variable A +', rowNeg: 'Variable A −' },
    inputs: [
      { id: 'a', label: 'a', desc: 'Variable A+ & Variable B+', default: 30 },
      { id: 'b', label: 'b', desc: 'Variable A+ & Variable B−', default: 10 },
      { id: 'c', label: 'c', desc: 'Variable A− & Variable B+', default: 20 },
      { id: 'd', label: 'd', desc: 'Variable A− & Variable B−', default: 40 },
    ],

    example({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return 'Enter counts for all four cells to see a worked medical example here.';
      const row1 = a + b, row2 = c + d, col1 = a + c, col2 = b + d, N = row1 + row2;
      const denom = row1 * row2 * col1 * col2;
      if (denom === 0) return 'Enter a table where every row and column total is greater than 0 to see a worked medical example here.';
      const phi = (a * d - b * c) / Math.sqrt(denom);
      const f = v => +v.toFixed(3);
      const strength = Math.abs(phi) < 0.1 ? 'negligible' : Math.abs(phi) < 0.3 ? 'weak' : Math.abs(phi) < 0.5 ? 'moderate' : 'strong';
      return `A clinic cross-tabulates smoking status (A) against a diagnosis of chronic bronchitis (B) in ${N} patients. φ = ${f(phi)} indicates a ${strength} association between the two binary variables — for a 2×2 table, φ is mathematically the same association Cramer's V would give, just without needing a table larger than 2×2.`;
    },

    calculate({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v < 0))
        return [err('All four cells must be zero or greater')];

      const row1 = a + b, row2 = c + d, col1 = a + c, col2 = b + d, N = row1 + row2;
      const denom = row1 * row2 * col1 * col2;
      if (denom === 0) return [err('Each row and column total must be greater than 0')];

      const phi = (a * d - b * c) / Math.sqrt(denom);
      const chi2 = N * phi ** 2;
      const pValue = chiSquarePValue(chi2);
      const isSignificant = pValue < 0.05;
      const magnitude = Math.abs(phi) < 0.1 ? 'negligible' : Math.abs(phi) < 0.3 ? 'small' : Math.abs(phi) < 0.5 ? 'medium' : 'large';

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Phi Coefficient (φ)', value: f(phi), ci: null, isRatio: false, highlight: true },
        { label: 'Equivalent Chi-Square (χ²)', value: f(chi2), ci: null, isRatio: false },
        { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: `${isSignificant ? 'Significant' : 'Not significant'} association; effect size is ${magnitude} (|φ| = ${f(Math.abs(phi))}).` },
      ];
    }
  },

  /* ── 64. COHEN'S KAPPA ──────────────────────────────────────────────────
     Chance-corrected inter-rater agreement from a k×k agreement
     table (rows = Rater 1 categories, columns = Rater 2, same
     categories on both axes). SE uses the standard large-sample
     approximation. Default data from the site's own 2×2 agreement
     example (originally filed under a mislabeled McNemar script).   */
  {
    id:          'cohens-kappa',
    name:        "Cohen's Kappa",
    hint:        'κ = (p₀−pₑ)/(1−pₑ)',
    category:    'Effect Sizes & Agreement',
    description: 'Measures inter-rater agreement for categorical data, corrected for chance.',

    formulas: [
      {
        label: 'Observed & Expected Agreement',
        latex: 'p_0=\\dfrac{\\sum_i n_{ii}}{N} \\qquad p_e=\\dfrac{\\sum_i R_iC_i}{N^2}'
      },
      {
        label: "Cohen's Kappa",
        latex: '\\kappa = \\dfrac{p_0-p_e}{1-p_e} \\qquad SE(\\kappa)\\approx\\sqrt{\\dfrac{p_0(1-p_0)}{N(1-p_e)^2}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'table', type: 'textarea',
        label: 'Agreement Table (rows = Rater 1, columns = Rater 2, same categories, comma-separated)',
        default: '40,10\n5,45'
      },
    ],

    example({ table }) {
      const matrix = parseMatrix(table);
      const k = matrix.length;
      if (k < 2 || matrix.some(row => row.length !== k) || matrix.some(row => row.some(v => !isFinite(v) || v < 0)))
        return 'Enter a square agreement table to see a worked medical example here.';
      const N = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0);
      if (N === 0) return 'Enter a table with a total greater than 0 to see a worked medical example here.';
      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));
      const po = matrix.reduce((s, row, i) => s + row[i], 0) / N;
      const pe = rowSums.reduce((s, r, i) => s + r * colSums[i], 0) / N ** 2;
      if (pe >= 1) return 'Enter a table where categories are not entirely one-sided to see a worked medical example here.';
      const kappa = (po - pe) / (1 - pe);
      const bands = [[-Infinity, 'poor'], [0, 'slight'], [0.20, 'fair'], [0.40, 'moderate'], [0.60, 'substantial'], [0.80, 'almost perfect']];
      const landisKoch = bands.slice().reverse().find(([threshold]) => kappa >= threshold)[1];
      const f = v => +v.toFixed(3);
      return `Two radiologists independently classify ${N} chest X-rays as normal or abnormal. They agree on ${f(po * 100)}% of cases (p₀), but ${f(pe * 100)}% agreement would be expected by chance alone even if both were guessing randomly. κ = ${f(kappa)} corrects for that chance overlap — Landis & Koch would call this "${landisKoch}" agreement, which can be well below what the raw agreement rate alone suggests.`;
    },

    calculate({ table }) {
      const matrix = parseMatrix(table);
      const k = matrix.length;
      if (k < 2) return [err('Enter at least 2 categories (rows)')];
      if (matrix.some(row => row.length !== k)) return [err('The table must be square — same number of columns as rows (same categories for both raters)')];
      if (matrix.some(row => row.some(v => !isFinite(v) || v < 0))) return [err('All cell values must be zero or greater')];

      const N = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0);
      if (N === 0) return [err('Table total must be greater than 0')];

      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));

      const po = matrix.reduce((s, row, i) => s + row[i], 0) / N;
      const pe = rowSums.reduce((s, r, i) => s + r * colSums[i], 0) / N ** 2;
      if (pe >= 1) return [err('Cannot compute κ — expected agreement is 100% (all mass in one category)')];

      const kappa = (po - pe) / (1 - pe);
      const seKappa = Math.sqrt(po * (1 - po) / (N * (1 - pe) ** 2));
      const ciLo = kappa - 1.96 * seKappa, ciHi = kappa + 1.96 * seKappa;

      const bands = [
        [-Infinity, 'poor'],
        [0,    'slight'],
        [0.20, 'fair'],
        [0.40, 'moderate'],
        [0.60, 'substantial'],
        [0.80, 'almost perfect'],
      ];
      const landisKoch = bands.slice().reverse().find(([threshold]) => kappa >= threshold)[1];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Observed Agreement (p₀)', value: f(po), ci: null, isRatio: false },
        { label: 'Expected Agreement (pₑ)', value: f(pe), ci: null, isRatio: false },
        { label: "Cohen's Kappa (κ)", value: f(kappa), ci: [f(ciLo), f(ciHi)], isRatio: false, highlight: true },
        { label: 'SE(κ) — large-sample approximation', value: f(seKappa), ci: null, isRatio: false },
        { label: 'Interpretation (Landis & Koch, 1977)', isText: true, ci: null, isRatio: false,
          value: `${landisKoch[0].toUpperCase()}${landisKoch.slice(1)} agreement (κ = ${f(kappa)}).` },
      ];
    }
  },

  /* ── 65. WEIGHTED KAPPA ─────────────────────────────────────────────────
     Cohen's kappa for ORDINAL categories, penalizing disagreements
     by how far apart the two ratings are (quadratic weights, the
     standard default — matches R's irr::kappa2(weight = "squared")). */
  {
    id:          'weighted-kappa',
    name:        'Weighted Kappa',
    hint:        'κw = 1 − Σwᵢⱼoᵢⱼ / Σwᵢⱼeᵢⱼ, quadratic weights',
    category:    'Effect Sizes & Agreement',
    description: "Extends Cohen's kappa to ordinal ratings, weighting disagreements by their distance.",

    formulas: [
      {
        label: 'Quadratic Disagreement Weights',
        latex: 'w_{ij} = \\left(\\dfrac{i-j}{k-1}\\right)^{2}'
      },
      {
        label: 'Weighted Kappa',
        latex: '\\kappa_w = 1 - \\dfrac{\\sum_{ij} w_{ij}\\,n_{ij}/N}{\\sum_{ij} w_{ij}\\,R_iC_j/N^2}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'table', type: 'textarea',
        label: 'Ordinal Agreement Table (categories in order, comma-separated)',
        default: '10,5,0,0\n3,15,4,1\n0,4,20,5\n0,1,3,12'
      },
    ],

    example({ table }) {
      const matrix = parseMatrix(table);
      const k = matrix.length;
      if (k < 3 || matrix.some(row => row.length !== k) || matrix.some(row => row.some(v => !isFinite(v) || v < 0)))
        return 'Enter a square ordinal agreement table (at least 3 categories) to see a worked medical example here.';
      const N = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0);
      if (N === 0) return 'Enter a table with a total greater than 0 to see a worked medical example here.';
      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));
      let obsWeighted = 0, expWeighted = 0;
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          const w = ((i - j) / (k - 1)) ** 2;
          obsWeighted += w * matrix[i][j] / N;
          expWeighted += w * rowSums[i] * colSums[j] / N ** 2;
        }
      }
      if (expWeighted === 0) return 'Enter a table with some expected disagreement to see a worked medical example here.';
      const kappaW = 1 - obsWeighted / expWeighted;
      const bands = [[-Infinity, 'poor'], [0, 'slight'], [0.20, 'fair'], [0.40, 'moderate'], [0.60, 'substantial'], [0.80, 'almost perfect']];
      const landisKoch = bands.slice().reverse().find(([threshold]) => kappaW >= threshold)[1];
      const f = v => +v.toFixed(3);
      return `Two clinicians grade ${N} patients' tumor severity on a ${k}-level ordinal scale. Unlike plain Cohen's kappa, being off by one grade counts as a much smaller disagreement than being off by ${k - 1} grades — quadratic weighting reflects that ordinal closeness. κw = ${f(kappaW)}: "${landisKoch}" agreement by Landis & Koch's benchmarks.`;
    },

    calculate({ table }) {
      const matrix = parseMatrix(table);
      const k = matrix.length;
      if (k < 3) return [err("Weighted kappa needs at least 3 ordered categories — for 2, use Cohen's Kappa instead")];
      if (matrix.some(row => row.length !== k)) return [err('The table must be square — same number of columns as rows (same ordered categories for both raters)')];
      if (matrix.some(row => row.some(v => !isFinite(v) || v < 0))) return [err('All cell values must be zero or greater')];

      const N = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0);
      if (N === 0) return [err('Table total must be greater than 0')];

      const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));

      let obsWeighted = 0, expWeighted = 0;
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          const w = ((i - j) / (k - 1)) ** 2;
          obsWeighted += w * matrix[i][j] / N;
          expWeighted += w * rowSums[i] * colSums[j] / N ** 2;
        }
      }
      if (expWeighted === 0) return [err('Cannot compute weighted κ — expected weighted disagreement is 0')];

      const kappaW = 1 - obsWeighted / expWeighted;

      const po = matrix.reduce((s, row, i) => s + row[i], 0) / N;
      const pe = rowSums.reduce((s, r, i) => s + r * colSums[i], 0) / N ** 2;
      const kappaUnweighted = pe < 1 ? (po - pe) / (1 - pe) : null;

      const bands = [[-Infinity,'poor'],[0,'slight'],[0.20,'fair'],[0.40,'moderate'],[0.60,'substantial'],[0.80,'almost perfect']];
      const landisKoch = bands.slice().reverse().find(([threshold]) => kappaW >= threshold)[1];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Weighted Kappa (κw, quadratic)', value: f(kappaW), ci: null, isRatio: false, highlight: true },
      ];
      if (kappaUnweighted !== null) rows.push({ label: "Unweighted Cohen's Kappa (for comparison)", value: f(kappaUnweighted), ci: null, isRatio: false });
      rows.push({ label: 'Interpretation (Landis & Koch, 1977)', isText: true, ci: null, isRatio: false,
        value: `${landisKoch[0].toUpperCase()}${landisKoch.slice(1)} agreement (κw = ${f(kappaW)}).` });

      return rows;
    }
  },

  /* ── 66. INTRACLASS CORRELATION (ICC) ──────────────────────────────────
     One-way random-effects ICC — ICC(1,1) in Shrout & Fleiss (1979)
     notation — from a subjects × raters/occasions matrix, via a
     one-way ANOVA decomposition (same shape of input as Cronbach's
     Alpha and Cochran's Q).                                          */
  {
    id:          'icc',
    name:        'Intraclass Correlation (ICC)',
    hint:        'ICC(1,1) = (MSB−MSW)/(MSB+(n−1)MSW)',
    category:    'Effect Sizes & Agreement',
    description: 'Assesses reliability and agreement for continuous measurements across raters or occasions.',

    formulas: [
      {
        label: 'One-Way ANOVA Decomposition',
        latex: 'MS_B = \\dfrac{SS_B}{k-1} \\qquad MS_W = \\dfrac{SS_W}{k(n-1)}'
      },
      {
        label: 'ICC(1,1) — Single-Measurement, One-Way Random Effects',
        latex: 'ICC = \\dfrac{MS_B-MS_W}{MS_B+(n-1)MS_W}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Measurements — one row per subject, one column per rater/occasion (comma-separated)',
        default: '90,88,92\n85,87,84\n78,80,82\n95,94,96\n88,90,89\n75,78,76'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      const k = matrix.length;
      if (k < 2) return 'Enter at least 2 subjects to see a worked medical example here.';
      const n = matrix[0].length;
      if (n < 2 || matrix.some(row => row.length !== n) || matrix.some(row => row.some(v => !isFinite(v))) ||
          typeof jStat === 'undefined' || !jStat.centralF)
        return 'Enter numeric measurements for at least 2 raters/occasions to see a worked medical example here.';
      const grandMean = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0) / (k * n);
      const subjectMeans = matrix.map(row => row.reduce((s, v) => s + v, 0) / n);
      const SSB = n * subjectMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSW = matrix.reduce((s, row, i) => s + row.reduce((s2, v) => s2 + (v - subjectMeans[i]) ** 2, 0), 0);
      const dfB = k - 1, dfW = k * (n - 1);
      const MSB = SSB / dfB, MSW = SSW / dfW;
      const ICC = (MSB - MSW) / (MSB + (n - 1) * MSW);
      const reliability = ICC < 0.5 ? 'poor' : ICC < 0.75 ? 'moderate' : ICC < 0.9 ? 'good' : 'excellent';
      const f = v => +v.toFixed(3);
      const takeaway = (reliability === 'poor' || reliability === 'moderate')
        ? 'a single measurement is a fairly unreliable stand-in for the true patient value'
        : 'individual measurements can be trusted as a reasonably faithful proxy for the true patient value';
      return `${n} different raters (or the same rater on ${n} occasions) each measure blood pressure in ${k} patients. ICC = ${f(ICC)} shows what fraction of total measurement variance is real between-patient difference rather than rater/occasion inconsistency — ${reliability} reliability here means ${takeaway}.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      const k = matrix.length;
      if (k < 2) return [err('Enter at least 2 subjects')];
      const n = matrix[0].length;
      if (n < 2) return [err('Enter at least 2 raters/occasions (columns)')];
      if (matrix.some(row => row.length !== n)) return [err('Every subject must have the same number of measurements')];
      if (matrix.some(row => row.some(v => !isFinite(v)))) return [err('All values must be numeric')];
      if (typeof jStat === 'undefined' || !jStat.centralF)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const grandMean = matrix.reduce((s, row) => s + row.reduce((s2, v) => s2 + v, 0), 0) / (k * n);
      const subjectMeans = matrix.map(row => row.reduce((s, v) => s + v, 0) / n);

      const SSB = n * subjectMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSW = matrix.reduce((s, row, i) => s + row.reduce((s2, v) => s2 + (v - subjectMeans[i]) ** 2, 0), 0);

      const dfB = k - 1, dfW = k * (n - 1);
      const MSB = SSB / dfB, MSW = SSW / dfW;
      const ICC = (MSB - MSW) / (MSB + (n - 1) * MSW);
      const F = MSB / MSW;
      const pValue = 1 - jStat.centralF.cdf(F, dfB, dfW);

      const reliability = ICC < 0.5 ? 'poor' : ICC < 0.75 ? 'moderate' : ICC < 0.9 ? 'good' : 'excellent';

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Subjects (k)', value: k, ci: null, isRatio: false },
        { label: 'Number of Raters/Occasions (n)', value: n, ci: null, isRatio: false },
        { label: 'MS Between Subjects (MSB)', value: f(MSB), ci: null, isRatio: false },
        { label: 'MS Within Subjects (MSW)', value: f(MSW), ci: null, isRatio: false },
        { label: 'ICC(1,1)', value: f(ICC), ci: null, isRatio: false, highlight: true },
        { label: 'F-Statistic', value: f(F), ci: null, isRatio: false },
        { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false },
        { label: 'Interpretation (Koo & Li, 2016)', isText: true, ci: null, isRatio: false,
          value: `${reliability[0].toUpperCase()}${reliability.slice(1)} reliability (ICC = ${f(ICC)}).` },
      ];
    }
  },

  /* ── 66b. BLAND-ALTMAN LIMITS OF AGREEMENT ──────────────────────────────
     Assesses agreement between two measurement methods on the SAME
     subjects (unlike ICC, which handles any number of raters but
     doesn't visualize whether disagreement grows with magnitude).
     Plots each subject's difference against their average of the two
     methods, per Bland & Altman (1986) — a high correlation between
     two methods does not imply agreement, which is the whole reason
     this plot exists instead of just reporting Pearson's r.         */
  {
    id:          'bland-altman',
    name:        'Bland-Altman Limits of Agreement',
    hint:        'd̄ ± 1.96·s_d — mean-difference plot',
    category:    'Effect Sizes & Agreement',
    description: 'Assesses agreement between two measurement methods from paired data, plotting the mean-difference (Bland-Altman) plot with limits of agreement.',

    formulas: [
      {
        label: 'Per-Subject Mean & Difference',
        latex: 'M_i = \\dfrac{A_i+B_i}{2} \\qquad D_i = A_i - B_i'
      },
      {
        label: 'Limits of Agreement',
        latex: '\\text{LoA} = \\bar{D} \\pm 1.96\\, s_D'
      },
      {
        label: 'SE of the Limits (for their own CI)',
        latex: 'SE(\\text{LoA}) = s_D\\sqrt{\\dfrac{1}{n}+\\dfrac{1.96^2}{2(n-1)}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'methodA', type: 'textarea', label: 'Method A Measurements (comma-separated)', default: '120,128,135,142,118,150,133,145,122,138,155,130,126,148,140' },
      { id: 'methodB', type: 'textarea', label: 'Method B Measurements (comma-separated)', default: '115,124,132,136,120,144,127,141,118,135,148,133,121,150,134' },
    ],

    example({ methodA, methodB }) {
      const a = parseNumberList(methodA), b = parseNumberList(methodB);
      if (a.some(v => !isFinite(v)) || b.some(v => !isFinite(v)) || a.length !== b.length || a.length < 3)
        return 'Enter at least 3 paired measurements from both methods to see a worked medical example here.';
      const n = a.length;
      const diffs = a.map((v, i) => v - b[i]);
      const meanDiff = diffs.reduce((s, v) => s + v, 0) / n;
      const sdDiff = Math.sqrt(diffs.reduce((s, v) => s + (v - meanDiff) ** 2, 0) / (n - 1));
      const loaLo = meanDiff - 1.96 * sdDiff, loaHi = meanDiff + 1.96 * sdDiff;
      const f = v => +v.toFixed(2);
      return `Two blood pressure devices — a manual cuff (Method A) and an automated monitor (Method B) — are used on the same ${n} patients. Rather than a correlation, which can look high even when two methods disagree systematically, Bland-Altman plots each patient's difference against their average reading: the average device disagreement is ${f(meanDiff)} mmHg, and 95% of individual differences are expected to fall between ${f(loaLo)} and ${f(loaHi)} — whether that spread is small enough to use the devices interchangeably is a clinical judgment call, not something the statistics alone can answer.`;
    },

    calculate({ methodA, methodB }) {
      const a = parseNumberList(methodA), b = parseNumberList(methodB);
      if (a.some(v => !isFinite(v)) || b.some(v => !isFinite(v))) return [err('All values must be numeric')];
      if (a.length !== b.length) return [err('Method A and Method B must have the same number of values (paired data)')];
      const n = a.length;
      if (n < 3) return [err('Need at least 3 paired measurements')];
      if (typeof jStat === 'undefined' || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const means = a.map((v, i) => (v + b[i]) / 2);
      const diffs = a.map((v, i) => v - b[i]);
      const meanDiff = diffs.reduce((s, v) => s + v, 0) / n;
      const sdDiff = Math.sqrt(diffs.reduce((s, v) => s + (v - meanDiff) ** 2, 0) / (n - 1));

      const loaLo = meanDiff - 1.96 * sdDiff;
      const loaHi = meanDiff + 1.96 * sdDiff;

      const seMeanDiff = sdDiff / Math.sqrt(n);
      const seLoA = sdDiff * Math.sqrt(1 / n + 1.96 ** 2 / (2 * (n - 1)));
      const tCrit = jStat.studentt.inv(0.975, n - 1);

      const ciMeanDiff = [meanDiff - tCrit * seMeanDiff, meanDiff + tCrit * seMeanDiff];
      const ciLoALo    = [loaLo - tCrit * seLoA, loaLo + tCrit * seLoA];
      const ciLoAHi    = [loaHi - tCrit * seLoA, loaHi + tCrit * seLoA];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Pairs (N)', value: n, ci: null, isRatio: false },
        { label: 'Mean Bias (d̄ = A − B)', value: f(meanDiff), ci: [f(ciMeanDiff[0]), f(ciMeanDiff[1])], isRatio: false, highlight: true },
        { label: 'SD of Differences', value: f(sdDiff), ci: null, isRatio: false },
        { label: 'Lower Limit of Agreement', value: f(loaLo), ci: [f(ciLoALo[0]), f(ciLoALo[1])], isRatio: false, highlight: true },
        { label: 'Upper Limit of Agreement', value: f(loaHi), ci: [f(ciLoAHi[0]), f(ciLoAHi[1])], isRatio: false, highlight: true },
        { label: 'Bland-Altman Plot', isSVG: true, svg: blandAltmanPlotSVG(means.map((m, i) => ({ mean: m, diff: diffs[i] })), meanDiff, loaLo, loaHi) },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: `95% of future differences between Method A and Method B are expected to lie between ${f(loaLo, 2)} and ${f(loaHi, 2)} — whether that range is acceptable for interchangeable clinical use is a judgment call, not a statistical test.` },
      ];
    }
  },

  /* ── 67. ETA-SQUARED ────────────────────────────────────────────────────
     ANOVA effect size (proportion of total variance explained) from
     2–6 raw-data groups — same input shape as 1-Way ANOVA. Matches
     the source script filed as 'Phi coefficient calculator.R' (its
     content is actually an eta-squared calculation; the file
     genuinely named 'Eta-squared.R' contains unrelated power-
     calculation code — the two appear to have been mislabeled).      */
  {
    id:          'eta-squared',
    name:        'Eta-Squared',
    hint:        'η² = SSB / SST',
    category:    'Effect Sizes & Agreement',
    description: 'Effect size for ANOVA, expressing the proportion of total variance explained by a factor.',

    formulas: [
      {
        label: 'Sums of Squares',
        latex: 'SS_B = \\sum_j n_j(\\bar{x}_j-\\bar{x})^2 \\qquad SS_T = SS_B+SS_W'
      },
      {
        label: 'Eta-Squared',
        latex: '\\eta^2 = \\dfrac{SS_B}{SS_T}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'group1', type: 'textarea', label: 'Group 1 Data (comma-separated)', default: '80,85,78,90' },
      { id: 'group2', type: 'textarea', label: 'Group 2 Data (comma-separated)', default: '70,68,72,65' },
      { id: 'group3', type: 'textarea', label: 'Group 3 Data (comma-separated)', default: '88,92,95,90' },
      { id: 'group4', type: 'textarea', label: 'Group 4 Data (optional)',        default: '' },
      { id: 'group5', type: 'textarea', label: 'Group 5 Data (optional)',        default: '' },
      { id: 'group6', type: 'textarea', label: 'Group 6 Data (optional)',        default: '' },
    ],

    example(values) {
      const { groups, error } = gatherDataGroups(values);
      if (error || groups.length < 2) return 'Enter data for at least 2 groups to see a worked medical example here.';
      const allValues = groups.flatMap(g => g.values);
      const N = allValues.length;
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const groupMeans = groups.map(g => g.values.reduce((s, v) => s + v, 0) / g.values.length);
      const SSB = groups.reduce((s, g, i) => s + g.values.length * (groupMeans[i] - grandMean) ** 2, 0);
      const SSW = groups.reduce((s, g, i) => s + g.values.reduce((s2, v) => s2 + (v - groupMeans[i]) ** 2, 0), 0);
      const SST = SSB + SSW;
      if (SST === 0) return 'Enter groups with some variability to see a worked medical example here.';
      const etaSq = SSB / SST;
      const magnitude = etaSq < 0.01 ? 'negligible' : etaSq < 0.06 ? 'small' : etaSq < 0.14 ? 'medium' : 'large';
      const f = v => +v.toFixed(3);
      return `Following an ANOVA comparing recovery scores across ${groups.length} treatment groups (N=${N}), a significant p-value only tells you the groups differ — it doesn't say by how much. η² = ${f(etaSq)} means treatment group explains about ${f(etaSq * 100)}% of the total variance in recovery scores, a ${magnitude} effect — the rest comes from other, unmeasured sources of patient-to-patient variability.`;
    },

    calculate(values) {
      const { groups, error } = gatherDataGroups(values);
      if (error) return [err(error)];
      if (groups.length < 2) return [err('Enter data for at least 2 groups')];

      const allValues = groups.flatMap(g => g.values);
      const N = allValues.length;
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;

      const groupMeans = groups.map(g => g.values.reduce((s, v) => s + v, 0) / g.values.length);
      const SSB = groups.reduce((s, g, i) => s + g.values.length * (groupMeans[i] - grandMean) ** 2, 0);
      const SSW = groups.reduce((s, g, i) => s + g.values.reduce((s2, v) => s2 + (v - groupMeans[i]) ** 2, 0), 0);
      const SST = SSB + SSW;
      if (SST === 0) return [err('Cannot compute η² — all values are identical')];

      const etaSq = SSB / SST;
      const magnitude = etaSq < 0.01 ? 'negligible' : etaSq < 0.06 ? 'small' : etaSq < 0.14 ? 'medium' : 'large';

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Groups (k)', value: groups.length, ci: null, isRatio: false },
        { label: 'SS Between (SSB)', value: f(SSB), ci: null, isRatio: false },
        { label: 'SS Within (SSW)', value: f(SSW), ci: null, isRatio: false },
        { label: 'SS Total (SST)', value: f(SST), ci: null, isRatio: false },
        { label: 'Eta-Squared (η²)', value: f(etaSq), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (Cohen, 1988)', isText: true, ci: null, isRatio: false,
          value: `${magnitude[0].toUpperCase()}${magnitude.slice(1)} effect (η² = ${f(etaSq)}, ${f(etaSq * 100, 1)}% of variance explained).` },
      ];
    }
  },

  /* ── 68. CRONBACH'S ALPHA ───────────────────────────────────────────────
     Internal consistency reliability for a multi-item scale, from a
     subjects × items raw-score matrix. Matches the source
     'Cronbach's alpha.R' script's exact data (reshaped from its
     column-based data.frame into rows).                              */
  {
    id:          'cronbachs-alpha',
    name:        "Cronbach's Alpha",
    hint:        'α = (k/(k−1))·(1 − Σvar(item)/var(total))',
    category:    'Effect Sizes & Agreement',
    description: 'Measures internal consistency reliability of a multi-item scale or questionnaire.',

    formulas: [
      {
        label: "Cronbach's Alpha",
        latex: '\\alpha = \\dfrac{k}{k-1}\\left(1-\\dfrac{\\sum_j s_j^2}{s_{total}^2}\\right)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Item Scores — one row per respondent, one column per item (comma-separated)',
        default: '4,3,5,4\n3,4,4,3\n5,5,3,4\n2,3,2,3\n4,4,4,5'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      const N = matrix.length;
      if (N < 2) return 'Enter at least 2 respondents to see a worked medical example here.';
      const k = matrix[0].length;
      if (k < 2 || matrix.some(row => row.length !== k) || matrix.some(row => row.some(v => !isFinite(v))))
        return 'Enter numeric item scores for at least 2 items to see a worked medical example here.';
      const sampleVar = arr => {
        const m = arr.reduce((s, v) => s + v, 0) / arr.length;
        return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
      };
      const itemVars = Array.from({ length: k }, (_, j) => sampleVar(matrix.map(row => row[j])));
      const totalScores = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const totalVar = sampleVar(totalScores);
      if (totalVar === 0) return 'Enter total scores with some variance to see a worked medical example here.';
      const alpha = (k / (k - 1)) * (1 - itemVars.reduce((s, v) => s + v, 0) / totalVar);
      const reliability = alpha < 0.5 ? 'unacceptable' : alpha < 0.6 ? 'poor' : alpha < 0.7 ? 'questionable' : alpha < 0.8 ? 'acceptable' : alpha < 0.9 ? 'good' : 'excellent';
      const f = v => +v.toFixed(3);
      const takeaway = alpha >= 0.7
        ? 'measuring largely the same underlying construct, supporting summing them into a single score'
        : 'not cohering well enough yet to trust a single summed score without revising the questionnaire';
      return `A ${k}-item depression screening questionnaire is completed by ${N} patients. α = ${f(alpha)} measures whether the items hang together as one coherent scale — ${reliability} internal consistency here means the items are ${takeaway}.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      const N = matrix.length;
      if (N < 2) return [err('Enter at least 2 respondents (rows)')];
      const k = matrix[0].length;
      if (k < 2) return [err('Enter at least 2 items (columns)')];
      if (matrix.some(row => row.length !== k)) return [err('Every respondent must have the same number of item scores')];
      if (matrix.some(row => row.some(v => !isFinite(v)))) return [err('All values must be numeric')];

      const sampleVar = arr => {
        const m = arr.reduce((s, v) => s + v, 0) / arr.length;
        return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
      };

      const itemVars = Array.from({ length: k }, (_, j) => sampleVar(matrix.map(row => row[j])));
      const totalScores = matrix.map(row => row.reduce((s, v) => s + v, 0));
      const totalVar = sampleVar(totalScores);
      if (totalVar === 0) return [err('Cannot compute α — total scores have no variance')];

      const sumItemVar = itemVars.reduce((s, v) => s + v, 0);
      const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar);

      const reliability = alpha < 0.5 ? 'unacceptable' : alpha < 0.6 ? 'poor' : alpha < 0.7 ? 'questionable' : alpha < 0.8 ? 'acceptable' : alpha < 0.9 ? 'good' : 'excellent';

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Respondents (N)', value: N, ci: null, isRatio: false },
        { label: 'Number of Items (k)', value: k, ci: null, isRatio: false },
        { label: 'Sum of Item Variances', value: f(sumItemVar), ci: null, isRatio: false },
        { label: 'Variance of Total Score', value: f(totalVar), ci: null, isRatio: false },
        { label: "Cronbach's Alpha (α)", value: f(alpha), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (George & Mallery, 2003)', isText: true, ci: null, isRatio: false,
          value: `${reliability[0].toUpperCase()}${reliability.slice(1)} internal consistency (α = ${f(alpha)}).` },
      ];
    }
  },

  /* ── 69. ODDS RATIO TO RISK RATIO ───────────────────────────────────────
     Converts OR → RR given a control event rate, reusing the same
     identity already used inside 'OR to NNT & NNH' — split out here
     as a focused, standalone conversion.                             */
  {
    id:          'or-to-rr',
    name:        'Odds Ratio to Risk Ratio',
    hint:        'RR = OR / (1 + CER·(OR−1))',
    category:    'Epidemiology & Risk',
    description: 'Converts an odds ratio to a risk ratio using the control event rate.',

    formulas: [
      {
        label: 'Risk Ratio from Odds Ratio',
        latex: 'RR = \\dfrac{OR}{1 + CER\\cdot(OR-1)}'
      },
      {
        label: 'Experimental Event Rate',
        latex: 'EER = CER \\times RR'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'OR',  label: 'Odds Ratio (OR)',            default: 0.75 },
      { id: 'CER', label: 'Control Event Rate (0 – 1)', default: 0.20 },
    ],

    example({ OR, CER }) {
      if (!isFinite(OR) || OR <= 0 || !isFinite(CER) || CER <= 0 || CER >= 1)
        return 'Enter an odds ratio and control event rate to see a worked medical example here.';
      const RR = OR / (1 + CER * (OR - 1));
      const f = v => +v.toFixed(3);
      return `A case-control study (which can only estimate OR, not RR directly) reports OR = ${OR}, and the outcome's baseline rate in the population is known to be about ${(CER * 100).toFixed(0)}% (CER). Converting gives RR = ${f(RR)} — closer to 1 than the OR, since OR always overstates RR's distance from 1 when the outcome isn't rare, exactly the gap this calculator corrects for.`;
    },

    calculate({ OR, CER }) {
      if (!isFinite(OR) || OR <= 0) return [err('Odds Ratio must be greater than 0')];
      if (!isFinite(CER) || CER <= 0 || CER >= 1) return [err('Control Event Rate must be between 0 and 1 (exclusive)')];

      const RR  = OR / (1 + CER * (OR - 1));
      const EER = CER * RR;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Risk Ratio (RR)', value: f(RR), ci: null, isRatio: true, highlight: true },
        { label: 'Experimental Event Rate (EER)', value: f(EER), ci: null, isRatio: false },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'OR and RR diverge more as the Control Event Rate moves away from 0 — they are nearly equal only when CER is small (a rare outcome).' },
      ];
    }
  },

  /* ── 70. ATTRIBUTABLE FRACTION (AFe & PAF) ─────────────────────────────
     Standard epidemiological attributable-fraction formulas from a
     relative risk and the proportion of the population exposed.      */
  {
    id:          'attributable-fraction',
    name:        'Attributable Fraction (AFe & PAF)',
    hint:        'AFe = (RR−1)/RR, PAF = Pe(RR−1)/(1+Pe(RR−1))',
    category:    'Epidemiology & Risk',
    description: 'Estimates the fraction of disease attributable to the exposure (exposed and population).',

    formulas: [
      {
        label: 'Attributable Fraction among the Exposed',
        latex: 'AF_e = \\dfrac{RR-1}{RR}'
      },
      {
        label: 'Population Attributable Fraction',
        latex: 'PAF = \\dfrac{P_e(RR-1)}{1+P_e(RR-1)}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'RR', label: 'Relative Risk (RR)',                  default: 2.5  },
      { id: 'Pe', label: 'Proportion of Population Exposed (Pₑ, 0–1)', default: 0.30 },
    ],

    example({ RR, Pe }) {
      if (!isFinite(RR) || RR <= 0 || !isFinite(Pe) || Pe < 0 || Pe > 1)
        return 'Enter a relative risk and proportion exposed to see a worked medical example here.';
      const AFe = (RR - 1) / RR;
      const PAF = (Pe * (RR - 1)) / (1 + Pe * (RR - 1));
      const f = v => +v.toFixed(1);
      return `Smoking carries RR = ${RR} for a disease, and ${f(Pe * 100)}% of the population smokes (Pₑ). Among smokers who get the disease, ${f(AFe * 100)}% of their risk is attributable to smoking (AFe) — but zoomed out to the whole population, only ${f(PAF * 100)}% of all cases (PAF) are attributable to smoking, since most of the population isn't exposed at all.`;
    },

    calculate({ RR, Pe }) {
      if (!isFinite(RR) || RR <= 0) return [err('Relative Risk must be greater than 0')];
      if (!isFinite(Pe) || Pe < 0 || Pe > 1) return [err('Proportion Exposed must be between 0 and 1')];

      const AFe = (RR - 1) / RR;
      const PAF = (Pe * (RR - 1)) / (1 + Pe * (RR - 1));

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Attributable Fraction, Exposed (AFe)', value: f(AFe), ci: null, isRatio: false, highlight: true },
        { label: 'Population Attributable Fraction (PAF)', value: f(PAF), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: `Among exposed cases, ${f(AFe * 100, 1)}% is attributable to the exposure; population-wide, ${f(PAF * 100, 1)}% of disease is attributable to it.` },
      ];
    }
  },

  /* ── 71. POPULATION ATTRIBUTABLE RISK (PAR) ────────────────────────────
     Absolute (not fractional) version of attributable risk — how
     much disease burden in the whole population is due to exposure. */
  {
    id:          'par',
    name:        'Population Attributable Risk',
    category:    'Epidemiology & Risk',
    hint:        'PAR = Pₑ·(Iₑ−Iᵤ)',
    description: 'Quantifies how much of the disease burden would be eliminated by removing the exposure.',

    formulas: [
      {
        label: 'Population Attributable Risk',
        latex: 'PAR = P_e\\,(I_e - I_u)'
      },
      {
        label: 'PAR% (relative to total incidence)',
        latex: 'PAR\\% = \\dfrac{PAR}{I_{total}}\\times100, \\quad I_{total} = P_eI_e + (1-P_e)I_u'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'Pe', label: 'Proportion of Population Exposed (Pₑ, 0–1)', default: 0.30 },
      { id: 'Ie', label: 'Incidence in Exposed (Iₑ, 0–1)',   default: 0.10 },
      { id: 'Iu', label: 'Incidence in Unexposed (Iᵤ, 0–1)', default: 0.04 },
    ],

    example({ Pe, Ie, Iu }) {
      if (!isFinite(Pe) || Pe < 0 || Pe > 1 || !isFinite(Ie) || Ie < 0 || Ie > 1 || !isFinite(Iu) || Iu < 0 || Iu > 1)
        return 'Enter proportion exposed and incidence in both groups to see a worked medical example here.';
      const PAR = Pe * (Ie - Iu);
      const Itotal = Pe * Ie + (1 - Pe) * Iu;
      const PARpct = Itotal > 0 ? (PAR / Itotal) * 100 : 0;
      const f = v => +v.toFixed(1);
      return `A city has ${f(Pe * 100)}% of residents exposed to air pollution above a threshold (Pₑ), with disease incidence of ${f(Ie * 100)}% among the exposed vs ${f(Iu * 100)}% among the unexposed. PAR% = ${f(PARpct)} answers the policy-relevant question directly: if the pollution exposure were eliminated entirely, about ${f(PARpct)}% of the city's total disease burden would disappear with it.`;
    },

    calculate({ Pe, Ie, Iu }) {
      if (!isFinite(Pe) || Pe < 0 || Pe > 1) return [err('Proportion Exposed must be between 0 and 1')];
      if (!isFinite(Ie) || Ie < 0 || Ie > 1) return [err('Incidence in Exposed must be between 0 and 1')];
      if (!isFinite(Iu) || Iu < 0 || Iu > 1) return [err('Incidence in Unexposed must be between 0 and 1')];

      const ARD = Ie - Iu;
      const PAR = Pe * ARD;
      const Itotal = Pe * Ie + (1 - Pe) * Iu;
      const PARpct = Itotal > 0 ? (PAR / Itotal) * 100 : 0;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Risk Difference (Iₑ − Iᵤ)', value: f(ARD), ci: null, isRatio: false },
        { label: 'Total Population Incidence', value: f(Itotal), ci: null, isRatio: false },
        { label: 'Population Attributable Risk (PAR)', value: f(PAR), ci: null, isRatio: false, highlight: true },
        { label: 'PAR%', value: f(PARpct, 2), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: `Removing the exposure would eliminate ${f(PARpct, 1)}% of disease incidence in this population.` },
      ];
    }
  },

  /* ── 72. INCIDENCE RATE & RATE RATIO ────────────────────────────────────
     Consolidated view of 'Standard Error of a Rate' (applied to both
     groups) and 'Standard Error of a Rate Ratio' — the common
     two-group incidence-study workflow in one place.                 */
  {
    id:          'incidence-rate',
    name:        'Incidence Rate & Rate Ratio',
    hint:        'Rate = D/PT, IRR = Rate₁/Rate₂',
    category:    'Epidemiology & Risk',
    description: 'Calculates incidence rates, rate ratio, and their confidence intervals from person-time data.',

    formulas: [
      {
        label: 'Incidence Rate & 95% CI',
        latex: 'Rate = \\dfrac{D}{PT} \\qquad CI = Rate \\times e^{\\pm 1.96/\\sqrt{D}}'
      },
      {
        label: 'Rate Ratio (IRR) & 95% CI',
        latex: 'IRR = \\dfrac{D_1/PT_1}{D_2/PT_2} \\qquad CI = IRR \\times e^{\\pm 1.96\\sqrt{1/D_1+1/D_2}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'd1',  label: 'Group 1 Events (D₁)',       default: 45   },
      { id: 'pt1', label: 'Group 1 Person-Time (PT₁)', default: 1200 },
      { id: 'd2',  label: 'Group 2 Events (D₂)',       default: 28   },
      { id: 'pt2', label: 'Group 2 Person-Time (PT₂)', default: 1500 },
    ],

    example({ d1, pt1, d2, pt2 }) {
      d1 = Math.round(d1); d2 = Math.round(d2);
      if (!isFinite(d1) || d1 < 0 || !isFinite(d2) || d2 < 0 || !isFinite(pt1) || pt1 <= 0 || !isFinite(pt2) || pt2 <= 0)
        return 'Enter event counts and person-time for both groups to see a worked medical example here.';
      const rate1 = d1 / pt1, rate2 = d2 / pt2;
      const f = v => +v.toFixed(4);
      const irrText = d2 > 0 ? `IRR = ${f(rate1 / rate2)}` : 'the rate ratio is undefined without at least 1 event in Group 2';
      return `A treated cohort has ${d1} adverse events over ${pt1} person-years; an untreated cohort has ${d2} over ${pt2}. Rate 1 = ${f(rate1)}, Rate 2 = ${f(rate2)} events per person-year, and ${irrText} — the CIs widen sharply whichever group has fewer events, since rare-event rates are the least precisely estimated.`;
    },

    calculate({ d1, pt1, d2, pt2 }) {
      d1 = Math.round(d1); d2 = Math.round(d2);
      if (!isFinite(d1) || d1 < 0)    return [err('Group 1 Events must be zero or greater')];
      if (!isFinite(d2) || d2 < 0)    return [err('Group 2 Events must be zero or greater')];
      if (!isFinite(pt1) || pt1 <= 0) return [err('Group 1 Person-Time must be greater than 0')];
      if (!isFinite(pt2) || pt2 <= 0) return [err('Group 2 Person-Time must be greater than 0')];

      const rate1 = d1 / pt1, rate2 = d2 / pt2;
      const f = (v, dp = 6) => +(v.toFixed(dp));

      const rateRow = (d, rate, label) => {
        if (d === 0) return { label, value: f(rate), ci: null, isRatio: false, highlight: true };
        const seLn = 1 / Math.sqrt(d);
        return { label, value: f(rate), ci: [f(rate * Math.exp(-1.96 * seLn)), f(rate * Math.exp(1.96 * seLn))], isRatio: false, highlight: true };
      };

      const rows = [
        rateRow(d1, rate1, 'Group 1 Rate (D₁ / PT₁)'),
        rateRow(d2, rate2, 'Group 2 Rate (D₂ / PT₂)'),
      ];

      if (d2 === 0) {
        rows.push({ label: 'Rate Ratio (IRR)', isText: true, ci: null, isRatio: false,
          value: 'Group 2 must have at least 1 event to compute a rate ratio.' });
      } else {
        const irr = rate1 / rate2;
        if (d1 > 0) {
          const seLnIRR = Math.sqrt(1 / d1 + 1 / d2);
          rows.push({ label: 'Rate Ratio (IRR)', value: f(irr, 4), ci: [f(irr * Math.exp(-1.96 * seLnIRR), 4), f(irr * Math.exp(1.96 * seLnIRR), 4)], isRatio: true, highlight: true });
        } else {
          rows.push({ label: 'Rate Ratio (IRR)', value: f(irr, 4), ci: null, isRatio: true, highlight: true });
        }
      }

      return rows;
    }
  },

  /* ── 73. IPW & ATE ──────────────────────────────────────────────────────
     Inverse probability weighting and average treatment effect, from
     per-subject (treatment, outcome, propensity score) data — the
     propensity score itself is taken as given (e.g. already fit via
     logistic regression elsewhere), matching the "given PS" stage of
     the source 'IPW and ATE_Calculations for PD and CVD.R' script.
     The IPW-adjusted SE uses a Horvitz–Thompson-style weighted-
     variance approximation, since replicating the exact survey-
     package design-based SE is out of scope here.                    */
  {
    id:          'ipw-ate',
    name:        'IPW & ATE',
    hint:        'ATE = weighted mean(Y|T=1) − weighted mean(Y|T=0)',
    category:    'Epidemiology & Risk',
    description: 'Inverse probability weighting and average treatment effect for observational studies.',

    formulas: [
      {
        label: 'Inverse Probability Weight',
        latex: 'IPW_i = \\begin{cases} 1/PS_i & T_i=1 \\\\ 1/(1-PS_i) & T_i=0 \\end{cases}'
      },
      {
        label: 'IPW-Adjusted Average Treatment Effect',
        latex: 'ATE = \\dfrac{\\sum IPW_i Y_i [T_i=1]}{\\sum IPW_i[T_i=1]} - \\dfrac{\\sum IPW_i Y_i[T_i=0]}{\\sum IPW_i[T_i=0]}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Subject Data — treatment (0/1), outcome (0/1), propensity score (comma-separated)',
        default: '1,1,0.65\n0,0,0.30\n1,0,0.55\n0,1,0.40\n1,1,0.70\n0,0,0.25\n1,0,0.60\n0,1,0.35\n1,1,0.68\n0,0,0.28'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 4 || matrix.some(row => row.length !== 3) ||
          matrix.some(([t, y, ps]) => !isFinite(t) || !isFinite(y) || !isFinite(ps) || (t !== 0 && t !== 1) || (y !== 0 && y !== 1) || ps <= 0 || ps >= 1))
        return 'Enter at least 4 subjects with treatment (0/1), outcome (0/1), and propensity score (0-1) to see a worked medical example here.';
      const ipwOf = ([t, , ps]) => t === 1 ? 1 / ps : 1 / (1 - ps);
      const treated = matrix.filter(([t]) => t === 1).map(row => ({ y: row[1], w: ipwOf(row) }));
      const untreated = matrix.filter(([t]) => t === 0).map(row => ({ y: row[1], w: ipwOf(row) }));
      if (treated.length < 2 || untreated.length < 2)
        return 'Need at least 2 treated and 2 untreated subjects to see a worked medical example here.';
      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const ateUnadj = mean(treated.map(s => s.y)) - mean(untreated.map(s => s.y));
      const weightedMean = subjects => {
        const sumW = subjects.reduce((s, sub) => s + sub.w, 0);
        return subjects.reduce((s, sub) => s + sub.w * sub.y, 0) / sumW;
      };
      const ateAdj = weightedMean(treated) - weightedMean(untreated);
      const f = v => +v.toFixed(3);
      return `An observational study (not a randomized trial) compares a treatment's effect on an outcome, but sicker patients were more likely to receive treatment in the first place — confounding by indication. The naive difference in outcome rates (${f(ateUnadj)}) is biased by that; reweighting each patient by the inverse of their estimated propensity to receive the treatment they actually got corrects for it, giving an IPW-adjusted ATE of ${f(ateAdj)} instead.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 4) return [err('Enter at least 4 subjects')];
      if (matrix.some(row => row.length !== 3)) return [err('Every row must have exactly 3 values: treatment, outcome, propensity score')];
      if (matrix.some(([t, y, ps]) => !isFinite(t) || !isFinite(y) || !isFinite(ps) || (t !== 0 && t !== 1) || (y !== 0 && y !== 1) || ps <= 0 || ps >= 1))
        return [err('Treatment and outcome must be 0 or 1; propensity score must be strictly between 0 and 1')];

      const ipwOf = ([t, , ps]) => t === 1 ? 1 / ps : 1 / (1 - ps);
      const treated   = matrix.filter(([t]) => t === 1).map(row => ({ y: row[1], w: ipwOf(row) }));
      const untreated = matrix.filter(([t]) => t === 0).map(row => ({ y: row[1], w: ipwOf(row) }));
      if (treated.length < 2 || untreated.length < 2) return [err('Need at least 2 treated and 2 untreated subjects')];

      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const sampleVar = arr => {
        const m = mean(arr);
        return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
      };

      // Unadjusted ATE
      const yTreated = treated.map(s => s.y), yUntreated = untreated.map(s => s.y);
      const ateUnadj = mean(yTreated) - mean(yUntreated);
      const seUnadj  = Math.sqrt(sampleVar(yTreated) / yTreated.length + sampleVar(yUntreated) / yUntreated.length);

      // IPW-adjusted ATE (weighted means), with a Horvitz-Thompson-style
      // weighted-variance approximation for the SE.
      const weightedStats = subjects => {
        const sumW = subjects.reduce((s, sub) => s + sub.w, 0);
        const wMean = subjects.reduce((s, sub) => s + sub.w * sub.y, 0) / sumW;
        const varNum = subjects.reduce((s, sub) => s + sub.w ** 2 * (sub.y - wMean) ** 2, 0);
        return { wMean, se: Math.sqrt(varNum) / sumW };
      };
      const treatedStats   = weightedStats(treated);
      const untreatedStats = weightedStats(untreated);
      const ateAdj = treatedStats.wMean - untreatedStats.wMean;
      const seAdj  = Math.sqrt(treatedStats.se ** 2 + untreatedStats.se ** 2);

      const propTreated = treated.length / matrix.length;
      const allWeights = [...treated, ...untreated].map(s => s.w);
      const minW = Math.min(...allWeights), maxW = Math.max(...allWeights), meanW = mean(allWeights);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      const rows = [
        { label: 'Subjects (Treated / Untreated)', value: `${treated.length} / ${untreated.length}`, ci: null, isRatio: false, isText: true },
        { label: 'Proportion Treated', value: f(propTreated), ci: null, isRatio: false },
        { label: 'IPW Summary (min / mean / max)', value: `${f(minW)} / ${f(meanW)} / ${f(maxW)}`, ci: null, isRatio: false, isText: true },
        { label: 'Unadjusted ATE', value: f(ateUnadj), ci: [f(ateUnadj - 1.96 * seUnadj), f(ateUnadj + 1.96 * seUnadj)], isRatio: false, highlight: true },
        { label: 'IPW-Adjusted ATE', value: f(ateAdj), ci: [f(ateAdj - 1.96 * seAdj), f(ateAdj + 1.96 * seAdj)], isRatio: false, highlight: true },
      ];

      if (maxW > 10) {
        rows.push({ label: 'Note', isText: true, ci: null, isRatio: false,
          value: `Largest IPW weight is ${f(maxW, 1)} — very large weights can indicate a positivity violation (some subjects have propensity scores near 0 or 1) and may make the adjusted estimate unstable.` });
      }

      return rows;
    }
  },

  /* ── 74. MEASURES OF ASSOCIATION — PREDICTION INTERVALS ────────────────
     Meta-analysis specifically for OR/RR across studies, matching the
     source 'OR example for PI v.3.R' script's exact method: a
     fixed-effect pooled estimate, plus a prediction interval built
     from the FIXED-effect SE combined with τ² (not the random-
     effects SE, which is the convention used by the general
     'Meta-Analysis' calculator's ratio mode).                        */
  {
    id:          'assoc-pred-intervals',
    name:        'Measures of Association — Prediction Intervals',
    hint:        'Pooled OR (FE) ± t·√(SE²+τ²)',
    category:    'Epidemiology & Risk',
    description: 'Extends OR and RR estimates with prediction intervals for future studies.',

    formulas: [
      {
        label: 'Fixed-Effect Pooled OR/RR',
        latex: '\\ln\\widehat\\theta = \\dfrac{\\sum w_i \\ln\\theta_i}{\\sum w_i}, \\quad w_i = \\dfrac{1}{SE_i^2}'
      },
      {
        label: "Cochran's Q, τ², I²",
        latex: 'Q=\\sum w_i(\\ln\\theta_i-\\ln\\widehat\\theta)^2 \\qquad \\tau^2=\\max\\!\\left(0,\\dfrac{Q-df}{C}\\right)'
      },
      {
        label: 'Prediction Interval',
        latex: 'PI = \\exp\\!\\left(\\ln\\widehat\\theta \\pm t_{df,\\,0.975}\\sqrt{SE^2+\\tau^2}\\right)'
      }
    ],

    inputLayout: 'groups',
    groupTerm: 'Study',
    groupFields: [
      { prefix: 'effect', label: 'OR/RR' },
      { prefix: 'se',     label: 'SE(log)' },
    ],
    inputs: [
      { id: 'effect1', label: 'Study 1 OR/RR',   default: 0.90 },
      { id: 'se1',     label: 'Study 1 SE(log)', default: 0.15 },
      { id: 'effect2', label: 'Study 2 OR/RR',   default: 0.80 },
      { id: 'se2',     label: 'Study 2 SE(log)', default: 0.12 },
      { id: 'effect3', label: 'Study 3 OR/RR',   default: 0.50 },
      { id: 'se3',     label: 'Study 3 SE(log)', default: 0.18 },
      { id: 'effect4', label: 'Study 4 OR/RR (optional)',   default: 0.85 },
      { id: 'se4',     label: 'Study 4 SE(log) (optional)', default: 0.10 },
      { id: 'effect5', label: 'Study 5 OR/RR (optional)',   default: 0.65 },
      { id: 'se5',     label: 'Study 5 SE(log) (optional)', default: 0.20 },
      { id: 'effect6', label: 'Study 6 OR/RR (optional)',   default: 0.60 },
      { id: 'se6',     label: 'Study 6 SE(log) (optional)', default: 0.10 },
    ],

    example(values) {
      const { studies, error } = gatherEffectStudies(values);
      if (error || studies.length < 2 || studies.some(s => s.effect <= 0) || studies.some(s => s.se <= 0) ||
          typeof jStat === 'undefined' || !jStat.chisquare || !jStat.studentt)
        return 'Enter OR/RR and SE for at least 2 studies to see a worked medical example here.';
      const k = studies.length;
      const logEst = studies.map(s => Math.log(s.effect));
      const w = studies.map(s => 1 / s.se ** 2);
      const sumW = w.reduce((s, v) => s + v, 0);
      const pooledLog = logEst.reduce((s, v, i) => s + w[i] * v, 0) / sumW;
      const Q = logEst.reduce((s, v, i) => s + w[i] * (v - pooledLog) ** 2, 0);
      const df = k - 1;
      const sumW2 = w.reduce((s, v) => s + v ** 2, 0);
      const C = sumW - sumW2 / sumW;
      const tau2 = (df > 0 && C > 0) ? Math.max(0, (Q - df) / C) : 0;
      const seLog = Math.sqrt(1 / sumW);
      const tCrit = jStat.studentt.inv(0.975, df);
      const predSE = Math.sqrt(seLog ** 2 + tau2);
      const pooled = Math.exp(pooledLog);
      const piLo = Math.exp(pooledLog - tCrit * predSE), piHi = Math.exp(pooledLog + tCrit * predSE);
      const f = v => +v.toFixed(2);
      return `${k} independent case-control studies each report an OR for the same exposure-disease link. The pooled estimate is OR = ${f(pooled)} — but its CI only describes uncertainty in the average effect. The 95% prediction interval [${f(piLo)}, ${f(piHi)}] instead answers a different, often more useful question: if a new, similar study were run tomorrow, what range would its true effect plausibly fall in, given how much these ${k} studies already disagree with each other?`;
    },

    calculate(values) {
      const { studies, error } = gatherEffectStudies(values);
      if (error) return [err(error)];
      if (studies.length < 2) return [err('Enter OR/RR and SE for at least 2 studies')];
      if (studies.some(s => s.effect <= 0)) return [err('Every OR/RR must be greater than 0')];
      if (studies.some(s => s.se <= 0)) return [err('Every study SE must be greater than 0')];
      if (typeof jStat === 'undefined' || !jStat.chisquare || !jStat.studentt)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const k = studies.length;
      const logEst = studies.map(s => Math.log(s.effect));
      const w = studies.map(s => 1 / s.se ** 2);
      const sumW = w.reduce((s, v) => s + v, 0);
      const pooledLog = logEst.reduce((s, v, i) => s + w[i] * v, 0) / sumW;

      const Q  = logEst.reduce((s, v, i) => s + w[i] * (v - pooledLog) ** 2, 0);
      const df = k - 1;
      const pQ = 1 - jStat.chisquare.cdf(Q, df);
      const I2 = Q > 0 ? Math.max(0, (Q - df) / Q) * 100 : 0;

      const sumW2 = w.reduce((s, v) => s + v ** 2, 0);
      const C = sumW - sumW2 / sumW;
      const tau2 = (df > 0 && C > 0) ? Math.max(0, (Q - df) / C) : 0;

      const seLog = Math.sqrt(1 / sumW);
      const tCrit = jStat.studentt.inv(0.975, df);
      const ciLog = [pooledLog - tCrit * seLog, pooledLog + tCrit * seLog];
      const predSE = Math.sqrt(seLog ** 2 + tau2);
      const piLog = [pooledLog - tCrit * predSE, pooledLog + tCrit * predSE];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Number of Studies (k)', value: k, ci: null, isRatio: false },
        { label: 'Pooled OR/RR (fixed-effect)', value: f(Math.exp(pooledLog)), ci: [f(Math.exp(ciLog[0])), f(Math.exp(ciLog[1]))], isRatio: true, highlight: true },
        { label: "Cochran's Q", value: f(Q), ci: null, isRatio: false },
        { label: 'Degrees of Freedom (df)', value: df, ci: null, isRatio: false },
        { label: 'p-value (heterogeneity test)', value: formatPValue(pQ), ci: null, isRatio: false },
        { label: 'I² (%)', value: f(I2, 1), ci: null, isRatio: false },
        { label: 'τ² (log scale)', value: f(tau2), ci: null, isRatio: false },
        { label: '95% Prediction Interval', value: f(Math.exp(pooledLog)), ci: [f(Math.exp(piLog[0])), f(Math.exp(piLog[1]))], isRatio: true, highlight: true },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'The prediction interval reflects where a new study\'s true effect is likely to fall, and is always at least as wide as the confidence interval on the pooled estimate.' },
      ];
    }
  },

  /* ── 75. SENSITIVITY, SPECIFICITY & LR ─────────────────────────────────
     Focused subset of 'Diagnostic Test Accuracy (2×2)' — Se, Sp, LR+,
     LR− only (no PPV/NPV/Accuracy), for when prevalence isn't known
     or those extra rows aren't wanted. Shares the exact same math and
     default data as the fuller calculator.                           */
  {
    id:          'sensitivity-specificity',
    name:        'Sensitivity, Specificity & LR',
    hint:        'Se · Sp · LR+ · LR−',
    category:    'Diagnostic Testing',
    description: 'Calculates sensitivity, specificity, and positive/negative likelihood ratios from a 2×2 table.',
    example({ a, b, c, d }) {
      if (![a, b, c, d].every(v => isFinite(v) && v >= 0) || a + c === 0 || b + d === 0)
        return 'Enter counts for all four cells of the 2×2 table to see a worked medical example here.';
      const diseased = a + c, healthy = b + d;
      const Se = a / diseased, Sp = d / healthy;
      const LRposText = Sp < 1 ? (Se / (1 - Sp)).toFixed(2) : '∞';
      const pct = v => (v * 100).toFixed(1);
      return `You're reading a validation study reporting a=${a}, b=${b}, c=${c}, d=${d}, but it doesn't report disease prevalence — so PPV/NPV from that study wouldn't transfer to your clinic anyway. Sensitivity (${pct(Se)}%), specificity (${pct(Sp)}%), and LR+ (${LRposText}) are properties of the test itself and stay valid regardless of prevalence, which is why this focused view is the right tool when that's all you need.`;
    },

    formulas: [
      {
        label: 'Sensitivity & Specificity',
        latex: 'Se = \\dfrac{a}{a+c} \\qquad Sp = \\dfrac{d}{b+d}'
      },
      {
        label: 'Likelihood Ratios',
        latex: 'LR_{+} = \\dfrac{Se}{1-Sp} \\qquad LR_{-} = \\dfrac{1-Se}{Sp}'
      }
    ],

    inputLayout: '2x2',
    tableLabels: { colPos: 'Disease +', colNeg: 'Disease −', rowPos: 'Test +', rowNeg: 'Test −' },
    inputs: [
      { id: 'a', label: 'a', desc: 'True Positive (Test+ & Disease+)',  default: 85  },
      { id: 'b', label: 'b', desc: 'False Positive (Test+ & Disease−)', default: 15  },
      { id: 'c', label: 'c', desc: 'False Negative (Test− & Disease+)', default: 10  },
      { id: 'd', label: 'd', desc: 'True Negative (Test− & Disease−)',  default: 190 },
    ],

    calculate({ a, b, c, d }) {
      if ([a, b, c, d].some(v => !isFinite(v) || v <= 0))
        return [err('All four cells must be greater than 0')];

      const diseased = a + c, healthy = b + d;
      const Z = 1.96;

      const Se = a / diseased;
      const Sp = d / healthy;
      const LRpos = Se / (1 - Sp);
      const LRneg = (1 - Se) / Sp;

      const clip = v => Math.max(0, Math.min(1, v));
      const waldCI = (p, n) => [clip(p - Z * Math.sqrt(p * (1 - p) / n)), clip(p + Z * Math.sqrt(p * (1 - p) / n))];
      const CI_Se = waldCI(Se, diseased);
      const CI_Sp = waldCI(Sp, healthy);

      const SE_lnLRpos = Math.sqrt(1 / a - 1 / diseased + 1 / b - 1 / healthy);
      const SE_lnLRneg = Math.sqrt(1 / c - 1 / diseased + 1 / d - 1 / healthy);
      const CI_LRpos = [Math.exp(Math.log(LRpos) - Z * SE_lnLRpos), Math.exp(Math.log(LRpos) + Z * SE_lnLRpos)];
      const CI_LRneg = [Math.exp(Math.log(LRneg) - Z * SE_lnLRneg), Math.exp(Math.log(LRneg) + Z * SE_lnLRneg)];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Sensitivity (Se)', value: f(Se), ci: [f(CI_Se[0]), f(CI_Se[1])], isRatio: false, highlight: true },
        { label: 'Specificity (Sp)', value: f(Sp), ci: [f(CI_Sp[0]), f(CI_Sp[1])], isRatio: false, highlight: true },
        { label: 'Positive Likelihood Ratio (LR+)', value: f(LRpos), ci: [f(CI_LRpos[0]), f(CI_LRpos[1])], isRatio: true, highlight: true },
        { label: 'Negative Likelihood Ratio (LR−)', value: f(LRneg), ci: [f(CI_LRneg[0]), f(CI_LRneg[1])], isRatio: true, highlight: true },
      ];
    }
  },

  /* ── 76. POST-TEST PROBABILITY ─────────────────────────────────────────
     Standard odds-based Bayes update from a pre-test probability and
     a likelihood ratio (LR+ for a positive test, LR− for a negative). */
  {
    id:          'post-test-probability',
    name:        'Post-Test Probability',
    hint:        'Post-odds = Pre-odds × LR',
    category:    'Diagnostic Testing',
    description: 'Updates pre-test probability to post-test probability using likelihood ratios.',
    example({ preProb, LR }) {
      if (!isFinite(preProb) || preProb <= 0 || preProb >= 1 || !isFinite(LR) || LR <= 0)
        return 'Enter a pre-test probability (0–1) and a likelihood ratio to see a worked medical example here.';
      const preOdds  = preProb / (1 - preProb);
      const postOdds = preOdds * LR;
      const postProb = postOdds / (1 + postOdds);
      const pct = v => (v * 100).toFixed(1);
      return `A patient's pre-test probability of disease is estimated at ${pct(preProb)}% from age, sex, and symptoms. A test result with a likelihood ratio of ${LR} shifts that to a post-test probability of ${pct(postProb)}% — ${postProb > preProb ? 'raising' : 'lowering'} suspicion enough to change what you'd do next.`;
    },

    formulas: [
      {
        label: 'Pre-Test Odds',
        latex: '\\text{Pre-odds} = \\dfrac{P_{pre}}{1-P_{pre}}'
      },
      {
        label: 'Post-Test Odds & Probability',
        latex: '\\text{Post-odds} = \\text{Pre-odds}\\times LR \\qquad P_{post} = \\dfrac{\\text{Post-odds}}{1+\\text{Post-odds}}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'preProb', label: 'Pre-Test Probability (0–1)', default: 0.20 },
      { id: 'LR',      label: 'Likelihood Ratio (LR+ for positive test, LR− for negative)', default: 5.0 },
    ],

    calculate({ preProb, LR }) {
      if (!isFinite(preProb) || preProb <= 0 || preProb >= 1) return [err('Pre-Test Probability must be between 0 and 1 (exclusive)')];
      if (!isFinite(LR) || LR <= 0) return [err('Likelihood Ratio must be greater than 0')];

      const preOdds  = preProb / (1 - preProb);
      const postOdds = preOdds * LR;
      const postProb = postOdds / (1 + postOdds);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Pre-Test Odds', value: f(preOdds), ci: null, isRatio: false },
        { label: 'Post-Test Odds', value: f(postOdds), ci: null, isRatio: false },
        { label: 'Post-Test Probability', value: f(postProb), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: `A pre-test probability of ${f(preProb * 100, 1)}% updates to ${f(postProb * 100, 1)}% given this test result (LR = ${f(LR, 2)}).` },
      ];
    }
  },

  /* ── 77. ROC CURVE & AUC ────────────────────────────────────────────────
     Empirical ROC curve and AUC from raw (score, true status) data.
     AUC is computed exactly via its Mann-Whitney-U identity — reusing
     rankWithTies() already built for the non-parametric tests — since
     AUC = P(score_diseased > score_healthy) = U/(n1·n0). The curve
     itself is built by sweeping thresholds for the graph.            */
  {
    id:          'roc-auc',
    name:        'ROC Curve & AUC',
    hint:        'AUC = U / (n₁n₀), U from Mann-Whitney',
    category:    'Diagnostic Testing',
    description: 'Plots the receiver operating characteristic curve and computes the area under the curve.',
    example({ data }) {
      const rows = parseMatrix(data).filter(r => r.length === 2 && isFinite(r[0]) && (r[1] === 0 || r[1] === 1));
      const nDiseased = rows.filter(r => r[1] === 1).length;
      const nHealthy  = rows.filter(r => r[1] === 0).length;
      if (nDiseased === 0 || nHealthy === 0)
        return 'Enter at least one diseased (status=1) and one healthy (status=0) subject to see a worked medical example here.';
      return `A lab is validating a continuous biomarker score against confirmed disease status in ${nDiseased} diseased and ${nHealthy} healthy subjects entered below. Rather than picking one cutoff up front, the calculator sweeps every possible threshold and traces the resulting sensitivity/specificity trade-off — the AUC summarizes how well the biomarker separates the two groups across all of them (1.0 = perfect separation, 0.5 = no better than a coin flip).`;
    },

    formulas: [
      {
        label: 'ROC Curve',
        latex: '\\text{ROC}(t) = \\big(FPR(t),\\,TPR(t)\\big), \\quad TPR(t)=P(\\text{score}\\ge t \\mid D{=}1),\\; FPR(t)=P(\\text{score}\\ge t \\mid D{=}0)'
      },
      {
        label: 'Area Under the Curve',
        latex: 'AUC = P(\\text{score}_{D=1} > \\text{score}_{D=0}) = \\dfrac{U}{n_1n_0}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Test Score & True Status — one row per subject (score, status 0/1, comma-separated)',
        default: '8,1\n9,1\n7,1\n10,1\n6,1\n8.5,1\n9.5,1\n3,0\n4,0\n2,0\n5,0\n3.5,0\n4.5,0\n2.5,0'
      },
    ],

    calculate({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.some(row => row.length !== 2)) return [err('Every row must have exactly 2 values: score, status')];
      if (matrix.some(([s, y]) => !isFinite(s) || !isFinite(y) || (y !== 0 && y !== 1)))
        return [err('Status must be 0 or 1, and score must be numeric')];

      const diseased = matrix.filter(([, y]) => y === 1).map(([s]) => s);
      const healthy  = matrix.filter(([, y]) => y === 0).map(([s]) => s);
      const n1 = diseased.length, n0 = healthy.length;
      if (n1 < 1 || n0 < 1) return [err('Need at least 1 diseased (status=1) and 1 healthy (status=0) subject')];

      const { ranks } = rankWithTies([...diseased, ...healthy]);
      const R1 = ranks.slice(0, n1).reduce((s, r) => s + r, 0);
      const U1 = R1 - n1 * (n1 + 1) / 2;
      const AUC = U1 / (n1 * n0);

      // Sweep thresholds (descending, grouping ties) to build the curve.
      const sorted = matrix.slice().sort((a, b) => b[0] - a[0]);
      const points = [[0, 0]];
      let tp = 0, fp = 0, i = 0;
      while (i < sorted.length) {
        const scoreVal = sorted[i][0];
        let j = i;
        while (j < sorted.length && sorted[j][0] === scoreVal) {
          if (sorted[j][1] === 1) tp++; else fp++;
          j++;
        }
        points.push([fp / n0, tp / n1]);
        i = j;
      }

      const discrimination = AUC < 0.6 ? 'poor' : AUC < 0.7 ? 'fair' : AUC < 0.8 ? 'acceptable' : AUC < 0.9 ? 'excellent' : 'outstanding';

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Diseased / Healthy (n₁ / n₀)', value: `${n1} / ${n0}`, ci: null, isRatio: false, isText: true },
        { label: 'AUC', value: f(AUC), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (Hosmer-Lemeshow rule of thumb)', isText: true, ci: null, isRatio: false,
          value: `${discrimination[0].toUpperCase()}${discrimination.slice(1)} discrimination (AUC = ${f(AUC)}).` },
        { label: 'ROC Curve', isSVG: true, svg: rocCurveSVG(points, AUC) },
      ];
    }
  },

  /* ── 78. SERIAL & PARALLEL TESTING ──────────────────────────────────────
     Combined Se/Sp when running two tests in series (both must be
     positive — raises specificity) or in parallel (either positive
     counts — raises sensitivity).                                    */
  {
    id:          'serial-parallel-testing',
    name:        'Serial & Parallel Testing',
    hint:        'Series: Se₁Se₂, 1−(1−Sp₁)(1−Sp₂) · Parallel: 1−(1−Se₁)(1−Se₂), Sp₁Sp₂',
    category:    'Diagnostic Testing',
    description: 'Models the combined performance of tests run in series or parallel.',
    example({ Se1, Sp1, Se2, Sp2 }) {
      if (![Se1, Sp1, Se2, Sp2].every(v => isFinite(v) && v >= 0 && v <= 1))
        return 'Enter sensitivities and specificities between 0 and 1 for both tests to see a worked medical example here.';
      const SeSeries = Se1 * Se2;
      const SpSeries = 1 - (1 - Sp1) * (1 - Sp2);
      const SePar    = 1 - (1 - Se1) * (1 - Se2);
      const SpPar    = Sp1 * Sp2;
      const pct = v => (v * 100).toFixed(1);
      return `Screening for a disease with Test 1 alone (Se ${pct(Se1)}%, Sp ${pct(Sp1)}%) risks too many false positives at scale, so a confirmatory Test 2 (Se ${pct(Se2)}%, Sp ${pct(Sp2)}%) is added. Run in series (both must be positive), specificity rises to ${pct(SpSeries)}% — fewer false alarms, at the cost of sensitivity dropping to ${pct(SeSeries)}%. Run in parallel instead (either positive counts, as in an ER rule-out), sensitivity rises to ${pct(SePar)}% while specificity falls to ${pct(SpPar)}%.`;
    },

    formulas: [
      {
        label: 'Series Testing (both must be positive)',
        latex: 'Se_{series} = Se_1Se_2 \\qquad Sp_{series} = 1-(1-Sp_1)(1-Sp_2)'
      },
      {
        label: 'Parallel Testing (either positive)',
        latex: 'Se_{parallel} = 1-(1-Se_1)(1-Se_2) \\qquad Sp_{parallel} = Sp_1Sp_2'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'Se1', label: 'Test 1 Sensitivity (0–1)', default: 0.85 },
      { id: 'Sp1', label: 'Test 1 Specificity (0–1)', default: 0.90 },
      { id: 'Se2', label: 'Test 2 Sensitivity (0–1)', default: 0.75 },
      { id: 'Sp2', label: 'Test 2 Specificity (0–1)', default: 0.95 },
    ],

    calculate({ Se1, Sp1, Se2, Sp2 }) {
      if ([Se1, Sp1, Se2, Sp2].some(v => !isFinite(v) || v < 0 || v > 1))
        return [err('All sensitivities and specificities must be between 0 and 1')];

      const SeSeries = Se1 * Se2;
      const SpSeries = 1 - (1 - Sp1) * (1 - Sp2);
      const SePar    = 1 - (1 - Se1) * (1 - Se2);
      const SpPar    = Sp1 * Sp2;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Series — Sensitivity', value: f(SeSeries), ci: null, isRatio: false, highlight: true },
        { label: 'Series — Specificity', value: f(SpSeries), ci: null, isRatio: false, highlight: true },
        { label: 'Parallel — Sensitivity', value: f(SePar), ci: null, isRatio: false, highlight: true },
        { label: 'Parallel — Specificity', value: f(SpPar), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: 'Series testing (require both positive) raises specificity but lowers sensitivity — useful for confirming a diagnosis. Parallel testing (either positive) raises sensitivity but lowers specificity — useful for screening/ruling out.' },
      ];
    }
  },

  /* ── 85. PPV/NPV VS PREVALENCE ──────────────────────────────────────────
     Holds Se/Sp fixed and sweeps prevalence via a live slider — unlike
     'Diagnostic Test Accuracy', which bakes in one fixed prevalence via
     its 2×2 counts, this makes explicit how PPV/NPV (but not Se/Sp)
     shift as the same test is applied to populations with different
     prevalence. The slider recomputes live, no Calculate click needed. */
  {
    id:          'ppv-npv-vs-prevalence',
    name:        'PPV/NPV vs Prevalence',
    hint:        'PPV, NPV as prevalence varies, Se/Sp fixed',
    category:    'Diagnostic Testing',
    description: 'Shows how positive and negative predictive value change with disease prevalence, for a test with fixed sensitivity and specificity.',

    formulas: [
      {
        label: 'Predictive Values (Bayes’ rule)',
        latex: 'PPV = \\dfrac{Se\\cdot Prev}{Se\\cdot Prev + (1-Sp)(1-Prev)} \\qquad NPV = \\dfrac{Sp(1-Prev)}{Sp(1-Prev) + (1-Se)Prev}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'Se',         label: 'Sensitivity (0–1)', default: 0.85 },
      { id: 'Sp',         label: 'Specificity (0–1)', default: 0.90 },
      { id: 'prevalence', type: 'slider', label: 'Disease Prevalence', default: 0.10, min: 0.001, max: 0.999, step: 0.001,
        format: v => (v * 100).toFixed(1) + '%' },
    ],

    calculate({ Se, Sp, prevalence }) {
      if (!isFinite(Se) || Se <= 0 || Se > 1) return [err('Sensitivity must be between 0 and 1')];
      if (!isFinite(Sp) || Sp <= 0 || Sp > 1) return [err('Specificity must be between 0 and 1')];
      if (!isFinite(prevalence) || prevalence <= 0 || prevalence >= 1) return [err('Prevalence must be between 0 and 1 (exclusive)')];

      const PPV = (Se * prevalence) / (Se * prevalence + (1 - Sp) * (1 - prevalence));
      const NPV = (Sp * (1 - prevalence)) / (Sp * (1 - prevalence) + (1 - Se) * prevalence);
      if (!isFinite(PPV) || !isFinite(NPV))
        return [err('This combination of sensitivity, specificity, and prevalence produces an undefined predictive value — try different inputs')];

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Prevalence', value: `${f(prevalence * 100, 1)}%`, ci: null, isRatio: false, isText: true },
        { label: 'Positive Predictive Value (PPV)', value: f(PPV), ci: null, isRatio: false, highlight: true },
        { label: 'Negative Predictive Value (NPV)', value: f(NPV), ci: null, isRatio: false, highlight: true },
        { label: 'PPV & NPV vs Prevalence', isSVG: true, svg: ppvNpvPrevalenceCurveSVG(Se, Sp, prevalence) },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'Sensitivity and specificity are properties of the test and stay fixed here — only PPV and NPV move as prevalence changes. Drag the slider to see why the same test can be far more (or less) useful in a screening population than in a referral clinic.' },
      ];
    },

    example({ Se, Sp, prevalence }) {
      if (!isFinite(Se) || Se <= 0 || Se > 1 || !isFinite(Sp) || Sp <= 0 || Sp > 1 || !isFinite(prevalence) || prevalence <= 0 || prevalence >= 1)
        return 'Enter sensitivity, specificity, and a prevalence between 0 and 1 to see a worked medical example here.';
      const PPV = (Se * prevalence) / (Se * prevalence + (1 - Sp) * (1 - prevalence));
      const NPV = (Sp * (1 - prevalence)) / (Sp * (1 - prevalence) + (1 - Se) * prevalence);
      const pct = v => (v * 100).toFixed(1);
      return `The same test (Se ${pct(Se)}%, Sp ${pct(Sp)}%) is applied in a population where ${pct(prevalence)}% actually have the disease. At that prevalence, a positive result is right ${pct(PPV)}% of the time (PPV) and a negative result is right ${pct(NPV)}% of the time (NPV). Drag the slider toward a high-prevalence referral clinic or a low-prevalence screening population and watch PPV and NPV move even though Se and Sp never change.`;
    }
  },

  /* ── 79. BAYES' THEOREM ─────────────────────────────────────────────────
     Direct application of Bayes' rule. The marginal P(B) can be
     entered directly, or — if left blank — derived from P(B|¬A) via
     the law of total probability.                                    */
  {
    id:          'bayes-theorem',
    name:        "Bayes' Theorem",
    hint:        'P(A|B) = P(B|A)P(A) / P(B)',
    category:    'Bayesian & Meta-Analysis',
    description: 'Computes posterior probability from prior, likelihood, and marginal probability.',

    formulas: [
      {
        label: "Bayes' Theorem",
        latex: 'P(A\\mid B) = \\dfrac{P(B\\mid A)\\,P(A)}{P(B)}'
      },
      {
        label: 'Marginal P(B) — Law of Total Probability (if not given directly)',
        latex: 'P(B) = P(B\\mid A)P(A) + P(B\\mid\\lnot A)\\,(1-P(A))'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'priorA',      label: 'Prior Probability P(A)',                 default: 0.10 },
      { id: 'likBgivenA',  label: 'Likelihood P(B | A)',                    default: 0.90 },
      { id: 'marginalB',   label: 'Marginal P(B) (optional, if known directly)', default: '' },
      { id: 'likBgivenNA', label: 'P(B | ¬A) (optional, used if Marginal P(B) is blank)', default: 0.10 },
    ],

    example({ priorA, likBgivenA, marginalB, likBgivenNA }) {
      const provided = v => v !== '' && v != null && isFinite(v);
      if (!isFinite(priorA) || priorA <= 0 || priorA >= 1 || !isFinite(likBgivenA) || likBgivenA < 0 || likBgivenA > 1)
        return 'Enter a prior probability and likelihood to see a worked medical example here.';
      let marginal;
      if (provided(marginalB) && marginalB > 0 && marginalB <= 1) {
        marginal = marginalB;
      } else if (provided(likBgivenNA) && likBgivenNA >= 0 && likBgivenNA <= 1) {
        marginal = likBgivenA * priorA + likBgivenNA * (1 - priorA);
      } else {
        return 'Enter either the marginal P(B) directly, or P(B|¬A), to see a worked medical example here.';
      }
      if (marginal <= 0) return 'Enter inputs that give a positive marginal probability to see a worked medical example here.';
      const posterior = Math.min(1, (likBgivenA * priorA) / marginal);
      const f = v => +(v * 100).toFixed(1);
      return `A disease has a population prevalence of ${f(priorA)}% (prior P(A)). A test correctly flags ${f(likBgivenA)}% of true cases (likelihood P(B|A)). Given a positive result, Bayes' theorem updates the probability the patient actually has the disease to P(A|B) = ${f(posterior)}% — almost always well below the test's own sensitivity, especially when the disease is rare, which is exactly the point of computing a posterior instead of just quoting P(B|A).`;
    },

    calculate({ priorA, likBgivenA, marginalB, likBgivenNA }) {
      const provided = v => v !== '' && v != null && isFinite(v);

      if (!isFinite(priorA) || priorA <= 0 || priorA >= 1) return [err('Prior Probability P(A) must be between 0 and 1 (exclusive)')];
      if (!isFinite(likBgivenA) || likBgivenA < 0 || likBgivenA > 1) return [err('Likelihood P(B|A) must be between 0 and 1')];

      let marginal;
      if (provided(marginalB)) {
        if (marginalB <= 0 || marginalB > 1) return [err('Marginal P(B) must be between 0 and 1 (exclusive of 0)')];
        marginal = marginalB;
      } else if (provided(likBgivenNA)) {
        if (likBgivenNA < 0 || likBgivenNA > 1) return [err('P(B|¬A) must be between 0 and 1')];
        marginal = likBgivenA * priorA + likBgivenNA * (1 - priorA);
      } else {
        return [err('Enter either Marginal P(B) directly, or P(B|¬A) so it can be derived')];
      }
      if (marginal <= 0) return [err('Marginal P(B) must be greater than 0')];

      const posterior = (likBgivenA * priorA) / marginal;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Marginal Probability P(B)', value: f(marginal), ci: null, isRatio: false },
        { label: 'Posterior Probability P(A | B)', value: f(Math.min(1, posterior)), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation', isText: true, ci: null, isRatio: false,
          value: `Observing B updates the probability of A from ${f(priorA * 100, 1)}% (prior) to ${f(Math.min(1, posterior) * 100, 1)}% (posterior).` },
      ];
    }
  },

  /* ── 80. BAYESIAN CREDIBLE INTERVALS ────────────────────────────────────
     Beta-Binomial conjugate model for a proportion — matches the
     source 'Bayesian Credible Interval (Beta Posterior).R' script
     exactly, including its default Jeffreys-like prior (mean 0.5,
     strength 1, i.e. Beta(0.5, 0.5)).                                 */
  {
    id:          'bayesian-cri',
    name:        'Bayesian Credible Intervals',
    hint:        'Beta(α₀+heads, β₀+tails) posterior',
    category:    'Bayesian & Meta-Analysis',
    description: 'Derives Beta-posterior credible intervals for a proportion given prior and observed data.',

    formulas: [
      {
        label: 'Prior & Posterior (Beta-Binomial Conjugacy)',
        latex: '\\alpha_0 = \\mu_0 s_0 \\;\\; \\beta_0 = (1-\\mu_0)s_0 \\qquad \\alpha_{post}=\\alpha_0+\\text{heads} \\;\\; \\beta_{post}=\\beta_0+\\text{tails}'
      },
      {
        label: 'Posterior Mean & Credible Interval',
        latex: '\\text{mean} = \\dfrac{\\alpha_{post}}{\\alpha_{post}+\\beta_{post}} \\qquad CrI = \\big[F^{-1}_{Beta}(\\tfrac{1-c}{2}),\\, F^{-1}_{Beta}(1-\\tfrac{1-c}{2})\\big]'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'heads',        label: 'Observed Successes',            default: 7    },
      { id: 'tails',        label: 'Observed Failures',              default: 3    },
      { id: 'priorMean',    label: 'Prior Mean (μ₀, 0–1)',          default: 0.5  },
      { id: 'priorStrength',label: 'Prior Strength (α₀+β₀, pseudo-count)', default: 1 },
      { id: 'credibility',  label: 'Credibility Level (0–1)',       default: 0.95 },
    ],

    example({ heads, tails, priorMean, priorStrength, credibility }) {
      heads = Math.round(heads); tails = Math.round(tails);
      if (!isFinite(heads) || heads < 0 || !isFinite(tails) || tails < 0 || !isFinite(priorMean) || priorMean <= 0 || priorMean >= 1 ||
          !isFinite(priorStrength) || priorStrength <= 0 || !isFinite(credibility) || credibility <= 0 || credibility >= 1 ||
          typeof jStat === 'undefined' || !jStat.beta)
        return 'Enter observed successes/failures, a prior, and a credibility level to see a worked medical example here.';
      const alphaPost = priorMean * priorStrength + heads;
      const betaPost = (1 - priorMean) * priorStrength + tails;
      const posteriorMean = alphaPost / (alphaPost + betaPost);
      const tailP = (1 - credibility) / 2;
      const criLo = jStat.beta.inv(tailP, alphaPost, betaPost);
      const criHi = jStat.beta.inv(1 - tailP, alphaPost, betaPost);
      const f = v => +(v * 100).toFixed(1);
      return `A small pilot study of ${heads + tails} patients sees ${heads} respond to a new treatment. Rather than reporting just the raw ${f(heads / (heads + tails))}% response rate, this blends it with a prior belief (mean ${f(priorMean)}%, treated as if worth ${priorStrength} prior "pseudo-patients") to get a posterior mean of ${f(posteriorMean)}% and a ${(credibility * 100).toFixed(0)}% credible interval of [${f(criLo)}%, ${f(criHi)}%] — a small pilot's raw rate alone can be misleadingly extreme, and this tempers it using what was already plausible beforehand.`;
    },

    calculate({ heads, tails, priorMean, priorStrength, credibility }) {
      heads = Math.round(heads); tails = Math.round(tails);
      if (!isFinite(heads) || heads < 0) return [err('Observed Successes must be zero or greater')];
      if (!isFinite(tails) || tails < 0) return [err('Observed Failures must be zero or greater')];
      if (!isFinite(priorMean) || priorMean <= 0 || priorMean >= 1) return [err('Prior Mean must be between 0 and 1 (exclusive)')];
      if (!isFinite(priorStrength) || priorStrength <= 0) return [err('Prior Strength must be greater than 0')];
      if (!isFinite(credibility) || credibility <= 0 || credibility >= 1) return [err('Credibility Level must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.beta)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const alphaPrior = priorMean * priorStrength;
      const betaPrior  = (1 - priorMean) * priorStrength;
      const alphaPost  = alphaPrior + heads;
      const betaPost   = betaPrior + tails;

      const posteriorMean = alphaPost / (alphaPost + betaPost);
      const tail = (1 - credibility) / 2;
      const criLo = jStat.beta.inv(tail, alphaPost, betaPost);
      const criHi = jStat.beta.inv(1 - tail, alphaPost, betaPost);

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Prior', value: `Beta(${f(alphaPrior, 2)}, ${f(betaPrior, 2)})`, ci: null, isRatio: false, isText: true },
        { label: 'Posterior', value: `Beta(${f(alphaPost, 2)}, ${f(betaPost, 2)})`, ci: null, isRatio: false, isText: true },
        { label: 'Posterior Mean', value: f(posteriorMean), ci: [f(criLo), f(criHi)], isRatio: false, highlight: true },
      ];
    }
  },

  /* ── 81. BAYES FACTOR ───────────────────────────────────────────────────
     Minimum-Bayes-factor calibration of a p-value (Sellke, Bayarri &
     Berger–style bound: BF10 = exp(-z²/2), a widely-used approximate
     link between a two-tailed p-value and Bayesian evidence), plus
     the resulting posterior P(H0) under two scenarios — matches the
     source 'Bayes Factor.R' / 'Bayes Factor v2.R' scripts' exact
     computation and their side-by-side BF10/BF01 presentation.
     Note: this "BF10" bound is always ≤ 1 by construction (it's the
     minimum evidence bound, not a general two-sided Bayes factor), so
     it is shown alongside its reciprocal BF01 rather than forced into
     the usual Kass–Raftery strength-of-evidence categories.           */
  {
    id:          'bayes-factor',
    name:        'Bayes Factor',
    hint:        'BF01 = exp(−z²/2), z from a two-tailed p-value',
    category:    'Bayesian & Meta-Analysis',
    description: 'Quantifies the relative evidence for H₀ vs H₁ on a continuous scale.',

    formulas: [
      {
        label: 'Minimum Bayes Factor from a p-Value',
        latex: 'z = \\Phi^{-1}\\!\\left(1-\\tfrac{p}{2}\\right) \\qquad BF_{01} = e^{-z^2/2} \\qquad BF_{10} = \\dfrac{1}{BF_{01}}'
      },
      {
        label: 'Posterior P(H₀) from Prior Odds',
        latex: 'P(H_0\\mid \\text{data}) = \\dfrac{BF_{01}\\cdot P(H_0)}{BF_{01}\\cdot P(H_0) + (1-P(H_0))}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      { id: 'pValue',  label: 'p-value (two-tailed)',        default: 0.05 },
      { id: 'priorH0', label: 'Prior Probability P(H₀), 0–1', default: 0.75 },
    ],

    example({ pValue, priorH0 }) {
      if (!isFinite(pValue) || pValue <= 0 || pValue >= 1 || !isFinite(priorH0) || priorH0 <= 0 || priorH0 >= 1 ||
          typeof jStat === 'undefined' || !jStat.normal)
        return 'Enter a p-value and prior probability to see a worked medical example here.';
      const z = jStat.normal.inv(1 - pValue / 2, 0, 1);
      const BF01 = Math.exp(-(z ** 2) / 2);
      const postH0 = (BF01 * priorH0) / (BF01 * priorH0 + (1 - priorH0));
      const f = v => +v.toFixed(3);
      return `A trial reports p = ${pValue} for a new drug's effect — often misread as "only a ${(pValue * 100).toFixed(0)}% chance the null is true." The minimum Bayes factor (BF01 = ${f(BF01)}) shows the smallest possible ratio of evidence for H₀ over H₁ this p-value could represent, and combined with a ${(priorH0 * 100).toFixed(0)}% prior belief that H₀ is true, the posterior P(H₀|data) = ${f(postH0)} — a more sober update than "p = 0.05 basically proves it."`;
    },

    calculate({ pValue, priorH0 }) {
      if (!isFinite(pValue) || pValue <= 0 || pValue >= 1) return [err('p-value must be between 0 and 1 (exclusive)')];
      if (!isFinite(priorH0) || priorH0 <= 0 || priorH0 >= 1) return [err('Prior Probability must be between 0 and 1 (exclusive)')];
      if (typeof jStat === 'undefined' || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const z = jStat.normal.inv(1 - pValue / 2, 0, 1);
      // BF01 = L(H0)/L(H1), Goodman's (1999) "minimum Bayes factor" — the
      // smallest this ratio could be (i.e. the strongest possible case for
      // H1) under a broad class of alternative priors. Always <= 1. Its
      // reciprocal BF10 = L(H1)/L(H0) >= 1. Only BF01 plugs directly into
      // the posterior-odds formula below (posterior odds = prior odds ×
      // likelihood ratio, expressed as L(H0)/L(H1)) — plugging in BF10
      // there instead would update belief in H0 in the wrong direction.
      const BF01 = Math.exp(-(z ** 2) / 2);
      const BF10 = 1 / BF01;

      const postH0 = (BF01 * priorH0) / (BF01 * priorH0 + (1 - priorH0));

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'z-Score (from two-tailed p)', value: f(z), ci: null, isRatio: false },
        { label: 'Minimum Bayes Factor (BF01 = L(H₀)/L(H₁))', value: f(BF01), ci: null, isRatio: false, highlight: true },
        { label: 'Reciprocal (BF10 = 1/BF01 = L(H₁)/L(H₀))',  value: f(BF10), ci: null, isRatio: false },
        { label: `Posterior P(H₀) (prior ${f(priorH0 * 100, 0)}%)`, value: f(postH0), ci: null, isRatio: false, highlight: true },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'BF01 is the minimum-Bayes-factor bound (always ≤ 1) — the strongest possible evidence against H₀ that this p-value could represent under a broad class of priors, not a single "true" Bayes factor. BF10 is shown for reference (evidence favoring H₁ instead), but the posterior above always updates using BF01 — the direction of a Bayesian update is mathematically fixed, not a matter of which convention a source prefers.' },
      ];
    }
  },

  /* ── 82. 2-WAY ANOVA WITH REPLICATION ───────────────────────────────────
     Balanced two-factor ANOVA (main effects + interaction) from
     long-format raw data (Factor A level, Factor B level, value).
     Matches the source '2-way ANOVA calculator with replication.R'
     script's exact formulas and its 2×2×3 default dataset, but
     generalizes to any balanced a×b×n design.                        */
  {
    id:          'anova-2way',
    name:        '2-Way ANOVA with Replication',
    hint:        'SSA, SSB, SSAB, SSE — F-test each effect',
    category:    'ANOVA',
    description: 'Tests main effects and interaction for two factors with multiple observations per cell.',

    formulas: [
      {
        label: 'Main Effects',
        latex: 'SS_A = bn\\sum_i(\\bar x_{i\\cdot}-\\bar x)^2 \\qquad SS_B = an\\sum_j(\\bar x_{\\cdot j}-\\bar x)^2'
      },
      {
        label: 'Interaction & Error',
        latex: 'SS_{AB} = n\\sum_{ij}(\\bar x_{ij}-\\bar x_{i\\cdot}-\\bar x_{\\cdot j}+\\bar x)^2 \\qquad SS_E = SS_T-SS_A-SS_B-SS_{AB}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Long-Format Data — Factor A level, Factor B level, value (comma-separated, one row per observation)',
        default: '1,1,98\n1,1,88\n1,1,92\n1,2,80\n1,2,79\n1,2,96\n2,1,98\n2,1,95\n2,1,90\n2,2,95\n2,2,93\n2,2,97'
      },
    ],

    example({ data }) {
      const { rows, numFactors, error } = parseLongFactorial(data);
      if (error || numFactors !== 2 || typeof jStat === 'undefined' || !jStat.centralF)
        return 'Enter long-format data with exactly 2 factor columns to see a worked medical example here.';
      const aLevels = [...new Set(rows.map(r => r.factors[0]))].sort((x, y) => x - y);
      const bLevels = [...new Set(rows.map(r => r.factors[1]))].sort((x, y) => x - y);
      const a = aLevels.length, b = bLevels.length;
      if (a < 2 || b < 2) return 'Each factor needs at least 2 levels to see a worked medical example here.';
      const cells = aLevels.map(av => bLevels.map(bv => rows.filter(r => r.factors[0] === av && r.factors[1] === bv).map(r => r.value)));
      const n = cells[0][0].length;
      if (n < 2 || cells.some(row => row.some(cell => cell.length !== n)))
        return 'Enter a balanced design (equal replicates per cell) to see a worked medical example here.';
      const allValues = rows.map(r => r.value);
      const N = allValues.length;
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const aMeans = cells.map(row => mean(row.flat()));
      const bMeans = bLevels.map((_, j) => mean(cells.map(row => row[j]).flat()));
      const cellMeans = cells.map(row => row.map(mean));
      const SSA = b * n * aMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSB = a * n * bMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      let SSAB = 0;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) SSAB += n * (cellMeans[i][j] - aMeans[i] - bMeans[j] + grandMean) ** 2;
      const SST = allValues.reduce((s, v) => s + (v - grandMean) ** 2, 0);
      const SSE = SST - SSA - SSB - SSAB;
      const dfAB = (a - 1) * (b - 1), dfE = a * b * (n - 1);
      const MSAB = SSAB / dfAB, MSE = SSE / dfE;
      const FAB = MSAB / MSE;
      const pAB = 1 - jStat.centralF.cdf(FAB, dfAB, dfE);
      const f = v => +v.toFixed(2);
      const tail = pAB < 0.05
        ? ' — the two factors interact, so the best method differs by school type'
        : ' — no evidence the two factors interact';
      return `A trial gives ${a} teaching methods to students split further by ${b} school types, with ${n} students per combination (${N} total). Beyond each factor's own main effect, the interaction term tests whether the effect of teaching method depends on school type: F(${dfAB},${dfE}) = ${f(FAB)}, ${formatPText(pAB)}${tail}.`;
    },

    calculate({ data }) {
      const { rows, numFactors, error } = parseLongFactorial(data);
      if (error) return [err(error)];
      if (numFactors !== 2) return [err(`This calculator needs exactly 2 factor columns (found ${numFactors}) — use Multi-Factor ANOVA for 3 or more`)];
      if (typeof jStat === 'undefined' || !jStat.centralF)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const aLevels = [...new Set(rows.map(r => r.factors[0]))].sort((x, y) => x - y);
      const bLevels = [...new Set(rows.map(r => r.factors[1]))].sort((x, y) => x - y);
      const a = aLevels.length, b = bLevels.length;
      if (a < 2 || b < 2) return [err('Each factor needs at least 2 levels')];

      const cells = aLevels.map(av => bLevels.map(bv => rows.filter(r => r.factors[0] === av && r.factors[1] === bv).map(r => r.value)));
      const n = cells[0][0].length;
      if (n < 2) return [err('Each cell needs at least 2 replicates')];
      if (cells.some(row => row.some(cell => cell.length !== n)))
        return [err('This calculator needs a balanced design — every Factor A × Factor B combination must have the same number of replicates')];

      const allValues = rows.map(r => r.value);
      const N = allValues.length;
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

      const aMeans = cells.map(row => mean(row.flat()));
      const bMeans = bLevels.map((_, j) => mean(cells.map(row => row[j]).flat()));
      const cellMeans = cells.map(row => row.map(mean));

      const SSA = b * n * aMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSB = a * n * bMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      let SSAB = 0;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) SSAB += n * (cellMeans[i][j] - aMeans[i] - bMeans[j] + grandMean) ** 2;
      const SST = allValues.reduce((s, v) => s + (v - grandMean) ** 2, 0);
      const SSE = SST - SSA - SSB - SSAB;

      const dfA = a - 1, dfB = b - 1, dfAB = (a - 1) * (b - 1), dfE = a * b * (n - 1);
      const MSA = SSA / dfA, MSB = SSB / dfB, MSAB = SSAB / dfAB, MSE = SSE / dfE;
      const FA = MSA / MSE, FB = MSB / MSE, FAB = MSAB / MSE;
      const pA = 1 - jStat.centralF.cdf(FA, dfA, dfE);
      const pB = 1 - jStat.centralF.cdf(FB, dfB, dfE);
      const pAB = 1 - jStat.centralF.cdf(FAB, dfAB, dfE);

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const effectRow = (label, SS, df, MS, F, p) => [
        { label: `${label} — SS / df / MS`, isText: true, ci: null, isRatio: false, value: `SS = ${f(SS)}, df = ${df}, MS = ${f(MS)}` },
        { label: `${label} — F(${df}, ${dfE}) & p-value`, isText: true, ci: null, isRatio: false, highlight: p < 0.05,
          value: `F = ${f(F)}, ${formatPText(p)}${p < 0.05 ? ' — significant' : ''}` },
      ];

      return [
        { label: 'Design', value: `a=${a}, b=${b}, n=${n} per cell (N=${N})`, ci: null, isRatio: false, isText: true },
        ...effectRow('Factor A', SSA, dfA, MSA, FA, pA),
        ...effectRow('Factor B', SSB, dfB, MSB, FB, pB),
        ...effectRow('Interaction (A×B)', SSAB, dfAB, MSAB, FAB, pAB),
        { label: 'Error — SS / df / MS', isText: true, ci: null, isRatio: false, value: `SS = ${f(SSE)}, df = ${dfE}, MS = ${f(MSE)}` },
      ];
    }
  },

  /* ── 83. MULTI-FACTOR ANOVA ─────────────────────────────────────────────
     Additive (main-effects-only) ANOVA for 3+ factors from long-
     format raw data, generalizing the balanced sum-of-squares
     decomposition. Interactions aren't modeled (their variance falls
     into the error term) — a deliberate scope limit, since a fully
     saturated model would need 2^K−1 interaction terms for K factors. */
  {
    id:          'anova-multifactor',
    name:        'Multi-Factor ANOVA',
    hint:        'Main effects only: SS_k, SSE = SST − ΣSS_k',
    category:    'ANOVA',
    description: 'Extends one-way ANOVA to designs with more than two independent factors.',

    formulas: [
      {
        label: 'Main Effect of Factor k (balanced design)',
        latex: 'SS_k = \\dfrac{N}{levels_k}\\sum_{i}(\\bar x_{k,i}-\\bar x)^2'
      },
      {
        label: 'Error (Residual)',
        latex: 'SS_E = SS_T - \\sum_k SS_k, \\qquad df_E = (N-1) - \\sum_k(levels_k-1)'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Long-Format Data — Factor 1, Factor 2, …, Factor K, value (comma-separated, ≥3 factor columns)',
        default: '1,1,1,10\n1,1,1,11\n1,1,2,14\n1,1,2,15\n1,2,1,12\n1,2,1,13\n1,2,2,16\n1,2,2,17\n2,1,1,8\n2,1,1,9\n2,1,2,12\n2,1,2,13\n2,2,1,10\n2,2,1,11\n2,2,2,14\n2,2,2,15'
      },
    ],

    example({ data }) {
      const { rows, numFactors, error } = parseLongFactorial(data);
      if (error || numFactors < 3 || typeof jStat === 'undefined' || !jStat.centralF)
        return 'Enter long-format data with at least 3 factor columns to see a worked medical example here.';
      const allValues = rows.map(r => r.value);
      const N = allValues.length;
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const SST = allValues.reduce((s, v) => s + (v - grandMean) ** 2, 0);
      const factorStats = [];
      for (let k = 0; k < numFactors; k++) {
        const levels = [...new Set(rows.map(r => r.factors[k]))].sort((x, y) => x - y);
        const groups = levels.map(lv => rows.filter(r => r.factors[k] === lv).map(r => r.value));
        if (new Set(groups.map(g => g.length)).size !== 1)
          return 'Enter a balanced design (equal replicates per factor level) to see a worked medical example here.';
        const levelMeans = groups.map(g => g.reduce((s, v) => s + v, 0) / g.length);
        const SSk = (N / levels.length) * levelMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
        factorStats.push({ SS: SSk, df: levels.length - 1 });
      }
      const SSsum = factorStats.reduce((s, fac) => s + fac.SS, 0);
      const dfSum = factorStats.reduce((s, fac) => s + fac.df, 0);
      const dfE = (N - 1) - dfSum;
      if (dfE < 1) return 'Enter more observations to see a worked medical example here.';
      const MSE = (SST - SSsum) / dfE;
      const nSig = factorStats.filter(fac => 1 - jStat.centralF.cdf((fac.SS / fac.df) / MSE, fac.df, dfE) < 0.05).length;
      return `A study of ${N} patients varies ${numFactors} treatment factors at once — say, drug dose, diet, and exercise program — instead of running a separate trial per factor. This main-effects model tests each factor's influence on the outcome independently: ${nSig} of ${numFactors} factors show a significant effect at α = 0.05 (interactions between factors aren't estimated here — see 2-Way ANOVA with Replication for exactly 2 factors with an interaction term).`;
    },

    calculate({ data }) {
      const { rows, numFactors, error } = parseLongFactorial(data);
      if (error) return [err(error)];
      if (numFactors < 3) return [err(`This calculator needs at least 3 factor columns (found ${numFactors}) — use 2-Way ANOVA with Replication for exactly 2`)];
      if (typeof jStat === 'undefined' || !jStat.centralF)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const allValues = rows.map(r => r.value);
      const N = allValues.length;
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const SST = allValues.reduce((s, v) => s + (v - grandMean) ** 2, 0);

      const factorStats = [];
      for (let k = 0; k < numFactors; k++) {
        const levels = [...new Set(rows.map(r => r.factors[k]))].sort((x, y) => x - y);
        const groups = levels.map(lv => rows.filter(r => r.factors[k] === lv).map(r => r.value));
        const counts = groups.map(g => g.length);
        if (new Set(counts).size !== 1)
          return [err(`Factor ${k + 1}: every level must appear the same number of times for this balanced-design formula (found counts: ${counts.join(', ')})`)];

        const levelMeans = groups.map(g => g.reduce((s, v) => s + v, 0) / g.length);
        const SSk = (N / levels.length) * levelMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
        const dfk = levels.length - 1;
        factorStats.push({ k: k + 1, levels: levels.length, SS: SSk, df: dfk });
      }

      const SSsum = factorStats.reduce((s, fac) => s + fac.SS, 0);
      const dfSum = factorStats.reduce((s, fac) => s + fac.df, 0);
      const SSE = SST - SSsum;
      const dfE = (N - 1) - dfSum;
      if (dfE < 1) return [err('Not enough data — degrees of freedom for error must be at least 1 (add more observations)')];
      const MSE = SSE / dfE;

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const rowsOut = [
        { label: 'Design', value: `${numFactors} factors, N = ${N}`, ci: null, isRatio: false, isText: true },
      ];

      factorStats.forEach(fac => {
        const MS = fac.SS / fac.df;
        const F = MS / MSE;
        const p = 1 - jStat.centralF.cdf(F, fac.df, dfE);
        rowsOut.push(
          { label: `Factor ${fac.k} (${fac.levels} levels) — SS / df / MS`, isText: true, ci: null, isRatio: false, value: `SS = ${f(fac.SS)}, df = ${fac.df}, MS = ${f(MS)}` },
          { label: `Factor ${fac.k} — F(${fac.df}, ${dfE}) & p-value`, isText: true, ci: null, isRatio: false, highlight: p < 0.05,
            value: `F = ${f(F)}, ${formatPText(p)}${p < 0.05 ? ' — significant' : ''}` },
        );
      });

      rowsOut.push(
        { label: 'Error — SS / df / MS', isText: true, ci: null, isRatio: false, value: `SS = ${f(SSE)}, df = ${dfE}, MS = ${f(MSE)}` },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'This is a main-effects-only (additive) model — interactions between factors are not estimated and their variance is absorbed into the error term.' },
      );

      return rowsOut;
    }
  },

  /* ── 84. REPEATED MEASURES ANOVA ───────────────────────────────────────
     Within-subjects ANOVA from a subjects × conditions matrix (same
     input shape as Cronbach's Alpha, ICC, and Friedman) — matches the
     source 'Repeated Measures ANOVA.R' script's exact formulas and
     default 6-participant × 3-measure dataset.                       */
  {
    id:          'repeated-measures-anova',
    name:        'Repeated Measures ANOVA',
    hint:        'F = MS_conditions / MS_error (subjects removed)',
    category:    'ANOVA',
    description: 'Analyzes data from designs where the same subjects are measured under multiple conditions.',

    formulas: [
      {
        label: 'Sums of Squares',
        latex: 'SS_{cond} = n\\sum_j(\\bar x_{\\cdot j}-\\bar x)^2 \\qquad SS_{subj} = k\\sum_i(\\bar x_{i\\cdot}-\\bar x)^2 \\qquad SS_{error} = SS_T - SS_{cond} - SS_{subj}'
      },
      {
        label: 'F-Statistic',
        latex: 'F = \\dfrac{SS_{cond}/(k-1)}{SS_{error}/[(n-1)(k-1)]}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Measurements — one row per subject, one column per condition (comma-separated)',
        default: '11,11,7\n5,3,0\n13,10,9\n7,4,1\n6,5,4\n11,7,8'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      const n = matrix.length;
      if (n < 2) return 'Enter at least 2 subject rows to see a worked medical example here.';
      const k = matrix[0].length;
      if (k < 3 || matrix.some(row => row.length !== k) || matrix.some(row => row.some(v => !isFinite(v))) ||
          typeof jStat === 'undefined' || !jStat.centralF)
        return 'Enter numeric data for at least 3 matched conditions to see a worked medical example here.';
      const N = n * k;
      const allValues = matrix.flat();
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const SST = allValues.reduce((s, v) => s + (v - grandMean) ** 2, 0);
      const conditionMeans = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0) / n);
      const subjectMeans = matrix.map(row => row.reduce((s, v) => s + v, 0) / k);
      const SSconditions = n * conditionMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSsubjects = k * subjectMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSerror = SST - SSconditions - SSsubjects;
      const dfBetween = k - 1, dfWithin = (n - 1) * (k - 1);
      const F = (SSconditions / dfBetween) / (SSerror / dfWithin);
      const pValue = 1 - jStat.centralF.cdf(F, dfBetween, dfWithin);
      const f = v => +v.toFixed(2);
      return `${n} patients each have their symptom severity measured under ${k} different conditions (e.g. baseline, and two follow-up visits). Because the same patients are measured repeatedly, this removes each patient's own baseline level (SS_subjects) from the error term before testing — a more powerful design than treating each measurement as an independent sample. F(${dfBetween},${dfWithin}) = ${f(F)}, ${formatPText(pValue)}.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      const n = matrix.length;
      if (n < 2) return [err('Enter at least 2 subjects')];
      const k = matrix[0].length;
      if (k < 3) return [err('Enter at least 3 conditions (columns) — for 2, use Paired t-Test instead')];
      if (matrix.some(row => row.length !== k)) return [err('Every subject must have the same number of measurements')];
      if (matrix.some(row => row.some(v => !isFinite(v)))) return [err('All values must be numeric')];
      if (typeof jStat === 'undefined' || !jStat.centralF)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const N = n * k;
      const allValues = matrix.flat();
      const grandMean = allValues.reduce((s, v) => s + v, 0) / N;
      const SST = allValues.reduce((s, v) => s + (v - grandMean) ** 2, 0);

      const conditionMeans = Array.from({ length: k }, (_, j) => matrix.reduce((s, row) => s + row[j], 0) / n);
      const subjectMeans = matrix.map(row => row.reduce((s, v) => s + v, 0) / k);

      const SSconditions = n * conditionMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSsubjects   = k * subjectMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
      const SSerror = SST - SSconditions - SSsubjects;

      const dfBetween = k - 1, dfWithin = (n - 1) * (k - 1);
      const MSconditions = SSconditions / dfBetween;
      const MSerror = SSerror / dfWithin;
      const F = MSconditions / MSerror;
      const pValue = 1 - jStat.centralF.cdf(F, dfBetween, dfWithin);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Subjects (n) / Conditions (k)', value: `${n} / ${k}`, ci: null, isRatio: false, isText: true },
        { label: 'SS Conditions', value: f(SSconditions), ci: null, isRatio: false },
        { label: 'SS Subjects', value: f(SSsubjects), ci: null, isRatio: false },
        { label: 'SS Error', value: f(SSerror), ci: null, isRatio: false },
        { label: 'MS Conditions', value: f(MSconditions), ci: null, isRatio: false },
        { label: 'MS Error', value: f(MSerror), ci: null, isRatio: false },
        { label: 'F-Statistic', value: f(F), ci: null, isRatio: false, highlight: true },
        { label: 'Degrees of Freedom', value: `${dfBetween}, ${dfWithin}`, ci: null, isRatio: false, isText: true },
        { label: 'p-value', value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — at least one condition differs significantly' : 'Fail to reject H₀ — no significant difference among conditions' },
      ];
    }
  },

  /* ── 85. KAPLAN-MEIER SURVIVAL CURVE ────────────────────────────────────
     Product-limit estimator of the survival function from raw time-
     to-event data with right censoring (event=0). Default data is the
     6-MP arm of the classic Freireich et al. (1963) leukemia
     remission trial — the standard teaching dataset for this method,
     shared with 'Log-Rank Test' below.                              */
  {
    id:          'kaplan-meier',
    name:        'Kaplan-Meier Survival Curve',
    hint:        'Ŝ(t) = Π(1 − dᵢ/nᵢ), step curve + median survival',
    category:    'Survival Analysis',
    description: 'Estimates the probability of surviving past each time point from time-to-event data with censoring, plotting a step curve and reporting median survival time.',

    formulas: [
      {
        label: 'Kaplan-Meier Estimator',
        latex: '\\hat{S}(t) = \\prod_{t_i \\le t} \\left(1 - \\dfrac{d_i}{n_i}\\right)'
      },
      {
        label: 'Median Survival Time',
        latex: '\\hat{t}_{med} = \\min\\{\\,t : \\hat{S}(t) \\le 0.5\\,\\}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'data', type: 'textarea',
        label: 'Time & Event Status — one row per subject (time, event: 1=event, 0=censored)',
        default: '6,1\n6,1\n6,1\n6,0\n7,1\n9,0\n10,1\n10,0\n11,0\n13,1\n16,1\n17,0\n19,0\n20,0\n22,1\n23,1\n25,0\n32,0\n32,0\n34,0\n35,0'
      },
    ],

    example({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2 || matrix.some(row => row.length !== 2) ||
          matrix.some(([t, e]) => !isFinite(t) || t <= 0 || !isFinite(e) || (e !== 0 && e !== 1)))
        return 'Enter time-to-event data (time, event) for at least 2 subjects to see a worked medical example here.';
      const records = matrix.map(([time, event]) => ({ time, event }));
      const km = kaplanMeierEstimate(records);
      const nEvents = records.filter(r => r.event === 1).length;
      const nCensored = records.length - nEvents;
      const medianText = km.median === null
        ? 'was not reached within the follow-up period — more than half the group was still relapse-free at the last observation'
        : `is ${km.median} weeks`;
      return `${km.n} leukemia patients are followed until relapse or the end of the study, whichever comes first: ${nEvents} relapse (events) and ${nCensored} are censored — still in remission when last seen, or lost to follow-up. The Kaplan-Meier curve accounts for that censoring properly instead of just averaging observed times: median remission time ${medianText}.`;
    },

    calculate({ data }) {
      const matrix = parseMatrix(data);
      if (matrix.length < 2) return [err('Enter at least 2 subjects')];
      if (matrix.some(row => row.length !== 2))
        return [err('Every row must have exactly 2 values: time, event (1=event, 0=censored)')];
      if (matrix.some(([t, e]) => !isFinite(t) || t <= 0 || !isFinite(e) || (e !== 0 && e !== 1)))
        return [err('Time must be greater than 0, and event must be 0 (censored) or 1 (event)')];

      const records = matrix.map(([time, event]) => ({ time, event }));
      const km = kaplanMeierEstimate(records);
      const nEvents = records.filter(r => r.event === 1).length;
      const nCensored = records.length - nEvents;

      return [
        { label: 'Subjects (N)', value: km.n, ci: null, isRatio: false },
        { label: 'Events', value: nEvents, ci: null, isRatio: false },
        { label: 'Censored', value: nCensored, ci: null, isRatio: false },
        { label: 'Median Survival Time', value: km.median === null ? 'Not reached' : km.median,
          ci: null, isRatio: false, isText: km.median === null, highlight: true },
        { label: 'Survival Curve', isSVG: true, svg: kaplanMeierCurveSVG(km) },
      ];
    }
  },

  /* ── 86. LOG-RANK TEST ───────────────────────────────────────────────────
     Compares two Kaplan-Meier survival curves via the standard
     log-rank (Mantel-Cox) contingency-table method: at every distinct
     time an event occurs in either group, compares the observed vs.
     expected events in Group 1 given both groups' current risk sets.
     Default data is the full Freireich et al. (1963) 6-MP vs placebo
     leukemia trial — the canonical log-rank teaching example.        */
  {
    id:          'log-rank-test',
    name:        'Log-Rank Test',
    hint:        'χ² = (O₁−E₁)²/Var — compares two survival curves',
    category:    'Survival Analysis',
    description: 'Compares survival distributions between two groups using the log-rank test, from time-to-event data with censoring.',

    formulas: [
      {
        label: 'Observed vs Expected Events (Group 1)',
        latex: 'O_1 = \\sum_i d_{1i} \\qquad E_1 = \\sum_i d_i\\dfrac{n_{1i}}{n_i}'
      },
      {
        label: 'Log-Rank Statistic',
        latex: '\\chi^2 = \\dfrac{(O_1-E_1)^2}{\\sum_i \\text{Var}_i}, \\quad \\text{Var}_i = \\dfrac{d_i(n_i-d_i)}{n_i-1}\\cdot\\dfrac{n_{1i}n_{2i}}{n_i^2}'
      }
    ],

    inputLayout: 'grid',
    inputs: [
      {
        id: 'group1', type: 'textarea',
        label: 'Group 1 — time, event (1=event, 0=censored), one row per subject',
        default: '6,1\n6,1\n6,1\n6,0\n7,1\n9,0\n10,1\n10,0\n11,0\n13,1\n16,1\n17,0\n19,0\n20,0\n22,1\n23,1\n25,0\n32,0\n32,0\n34,0\n35,0'
      },
      {
        id: 'group2', type: 'textarea',
        label: 'Group 2 — time, event (1=event, 0=censored), one row per subject',
        default: '1,1\n1,1\n2,1\n2,1\n3,1\n4,1\n4,1\n5,1\n5,1\n8,1\n8,1\n8,1\n8,1\n11,1\n11,1\n12,1\n12,1\n15,1\n17,1\n22,1\n23,1'
      },
    ],

    example({ group1, group2 }) {
      const m1 = parseMatrix(group1), m2 = parseMatrix(group2);
      const all = [...m1, ...m2];
      if (m1.length < 2 || m2.length < 2 || all.some(row => row.length !== 2) ||
          all.some(([t, e]) => !isFinite(t) || t <= 0 || !isFinite(e) || (e !== 0 && e !== 1)) ||
          typeof jStat === 'undefined' || !jStat.chisquare)
        return 'Enter time-to-event data (time, event) for at least 2 subjects in each group to see a worked medical example here.';
      const g1 = m1.map(([time, event]) => ({ time, event }));
      const g2 = m2.map(([time, event]) => ({ time, event }));
      const lr = logRankTest(g1, g2);
      const pValue = chiSquarePValue(lr.chi2);
      const isSignificant = pValue < 0.05;
      const f = v => +v.toFixed(2);
      const tail = isSignificant
        ? 'the two treatments differ significantly in how long patients stay relapse-free'
        : 'no significant difference was detected between the two survival curves';
      return `A trial randomizes ${lr.n1} leukemia patients to a new drug and ${lr.n2} to placebo, following each until relapse or the end of the study. Rather than just comparing average time-to-relapse — which can't properly handle patients still in remission when the study ended — the log-rank test compares the two entire survival curves at every time a relapse occurs in either group: χ² = ${f(lr.chi2)}, ${formatPText(pValue)} — ${tail}.`;
    },

    calculate({ group1, group2 }) {
      const m1 = parseMatrix(group1), m2 = parseMatrix(group2);
      if (m1.length < 2 || m2.length < 2) return [err('Enter at least 2 subjects in each group')];
      const all = [...m1, ...m2];
      if (all.some(row => row.length !== 2))
        return [err('Every row must have exactly 2 values: time, event (1=event, 0=censored)')];
      if (all.some(([t, e]) => !isFinite(t) || t <= 0 || !isFinite(e) || (e !== 0 && e !== 1)))
        return [err('Time must be greater than 0, and event must be 0 (censored) or 1 (event)')];
      if (typeof jStat === 'undefined' || !jStat.chisquare)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const g1 = m1.map(([time, event]) => ({ time, event }));
      const g2 = m2.map(([time, event]) => ({ time, event }));

      const km1 = kaplanMeierEstimate(g1);
      const km2 = kaplanMeierEstimate(g2);
      const lr  = logRankTest(g1, g2);

      const pValue = chiSquarePValue(lr.chi2);
      const isSignificant = pValue < 0.05;

      const f = (v, dp = 4) => +(v.toFixed(dp));
      const medianText = km => km.median === null ? 'not reached' : km.median;

      return [
        { label: 'Group 1 — N / Events / Median Survival', isText: true, ci: null, isRatio: false,
          value: `${lr.n1} / ${g1.filter(r => r.event === 1).length} / ${medianText(km1)}` },
        { label: 'Group 2 — N / Events / Median Survival', isText: true, ci: null, isRatio: false,
          value: `${lr.n2} / ${g2.filter(r => r.event === 1).length} / ${medianText(km2)}` },
        { label: 'Observed Events (Group 1)', value: f(lr.O1), ci: null, isRatio: false },
        { label: 'Expected Events (Group 1)', value: f(lr.E1), ci: null, isRatio: false },
        { label: 'Log-Rank χ²',               value: f(lr.chi2), ci: null, isRatio: false, highlight: true },
        { label: 'p-value',                   value: formatPValue(pValue), ci: null, isRatio: false, highlight: true },
        { label: 'Interpretation (α = 0.05)', isText: true, ci: null, isRatio: false,
          value: isSignificant ? 'Reject H₀ — the two survival curves differ significantly' : 'Fail to reject H₀ — no significant difference between the two survival curves' },
        { label: 'Survival Curves', isSVG: true, svg: kaplanMeierTwoGroupSVG(km1, km2, 'Group 1', 'Group 2') },
      ];
    }
  },

  /* ── 87. NETWORK META-ANALYSIS ───────────────────────────────────────────
     Frequentist, contrast-based network meta-analysis (Lu & Ades /
     Rücker graph-theoretical model) for two-arm trials: up to 15
     direct comparisons across up to 12 treatments are fit by
     weighted least squares against one reference treatment, giving
     every treatment's effect vs that reference PLUS, from the same
     covariance matrix, every other pairwise comparison (the league
     table) — combining direct trial data with indirect evidence
     borrowed through shared comparators. Common between-study
     variance uses the multivariate method-of-moments generalization
     of DerSimonian-Laird (Jackson, White & Riley 2012); ranking uses
     Rücker & Schwarzer's (2015) P-scores. Numbers are illustrative
     (Placebo/Drug A/B/C), not a real published network — but the
     shape (3 star comparisons + 1 closing the Drug A–B loop) is
     exactly the minimal case where indirect and direct evidence can
     be checked against each other.                                  */
  {
    id:          'network-meta-analysis',
    name:        'Network Meta-Analysis (Indirect & Mixed Comparisons)',
    hint:        'WLS over a treatment network — diagram, league table, τ², P-scores',
    category:    'Bayesian & Meta-Analysis',
    description: 'Combines direct and indirect evidence across three or more named treatments into one connected network, producing a network diagram, a full league table of pairwise estimates, heterogeneity/inconsistency statistics, and a frequentist treatment ranking (P-scores).',

    formulas: [
      {
        label: 'Contrast-Based Design (Lu & Ades)',
        latex: 'y_k = \\theta_{B(k)} - \\theta_{A(k)} + \\text{error}_k, \\qquad \\theta_{\\text{reference}} \\equiv 0'
      },
      {
        label: 'Weighted Least Squares Fit',
        latex: '\\hat\\theta = (X^\\top WX)^{-1}X^\\top Wy, \\qquad W = \\text{diag}\\!\\left(\\dfrac{1}{SE_k^2}\\right)'
      },
      {
        label: 'Any Pairwise (League Table) Contrast',
        latex: '\\hat\\theta_{ij} = \\hat\\theta_j-\\hat\\theta_i, \\qquad \\text{Var}(\\hat\\theta_{ij}) = \\text{Var}(\\hat\\theta_i)+\\text{Var}(\\hat\\theta_j)-2\\,\\text{Cov}(\\hat\\theta_i,\\hat\\theta_j)'
      },
      {
        label: "Network Heterogeneity / Inconsistency (Cochran's Q)",
        latex: 'Q = \\sum_k w_k(y_k-\\hat y_k)^2, \\qquad df = m-(t-1)'
      },
      {
        label: 'Common τ² (network extension of DerSimonian–Laird)',
        latex: '\\tau^2=\\max\\!\\left(0,\\dfrac{Q-df}{C}\\right), \\quad C=\\text{tr}(W)-\\text{tr}\\!\\left[(X^\\top WX)^{-1}X^\\top W^2X\\right]'
      },
      {
        label: 'P-Score (Frequentist Treatment Ranking)',
        latex: "P_i = \\dfrac{1}{t-1}\\sum_{j\\neq i}\\Phi\\!\\left(\\dfrac{\\hat\\theta_i-\\hat\\theta_j}{SE_{ij}}\\right)"
      }
    ],

    inputLayout: 'groups',
    groupTerm: 'Comparison',
    groupMax: 15,
    groupFields: [
      { prefix: 'trtA',   label: 'Treatment A (#)' },
      { prefix: 'trtB',   label: 'Treatment B (#)' },
      { prefix: 'effect', label: 'Effect (B vs A)' },
      { prefix: 'se',     label: 'SE' },
    ],
    inputs: [
      { id: 'scale', type: 'select', label: 'Effect Scale', default: 'ratio', options: [
        { value: 'additive', label: 'Additive (mean diff., risk diff., etc.)' },
        { value: 'ratio',    label: 'Ratio (RR/OR — enter log values)' },
      ] },
      { id: 'direction', type: 'select', label: 'For This Outcome, Which Direction Is Better?', default: 'higher', options: [
        { value: 'higher', label: 'Higher values are better (e.g., cure rate, response rate)' },
        { value: 'lower',  label: 'Lower values are better (e.g., mortality, relapse, adverse events)' },
      ] },
      { id: 'reference', type: 'select', label: 'Reference Treatment (all other effects are reported vs this one)', default: '1',
        note: 'Number every treatment 1–12 in the comparison table below (e.g., 1 = Placebo, 2 = Drug A, 3 = Drug B) and use those same numbers consistently across every row — the reference you pick here just sets which treatment reads as the "0" that every other effect is measured against. Optionally name each number below so the results read "Drug A" instead of "Treatment 2".',
        options: Array.from({ length: 12 }, (_, i) => i + 1).map(n => ({ value: String(n), label: `Treatment ${n}` })) },

      { id: 'name1', type: 'text', label: 'Treatment 1 Name (optional)', default: 'Placebo',  placeholder: 'e.g. Placebo' },
      { id: 'name2', type: 'text', label: 'Treatment 2 Name (optional)', default: 'Drug A',    placeholder: 'e.g. Drug A' },
      { id: 'name3', type: 'text', label: 'Treatment 3 Name (optional)', default: 'Drug B',    placeholder: 'e.g. Drug B' },
      { id: 'name4', type: 'text', label: 'Treatment 4 Name (optional)', default: 'Drug C',    placeholder: 'e.g. Drug C' },
      ...Array.from({ length: 8 }, (_, k) => {
        const i = k + 5;
        return { id: `name${i}`, type: 'text', label: `Treatment ${i} Name (optional)`, default: '', placeholder: `Treatment ${i}` };
      }),

      { id: 'trtA1', label: 'Comparison 1 — Treatment A', default: 1 },
      { id: 'trtB1', label: 'Comparison 1 — Treatment B', default: 2 },
      { id: 'effect1', label: 'Comparison 1 — Effect (B vs A)', default: 0.50 },
      { id: 'se1',     label: 'Comparison 1 — SE',              default: 0.15 },

      { id: 'trtA2', label: 'Comparison 2 — Treatment A', default: 1 },
      { id: 'trtB2', label: 'Comparison 2 — Treatment B', default: 3 },
      { id: 'effect2', label: 'Comparison 2 — Effect (B vs A)', default: 0.70 },
      { id: 'se2',     label: 'Comparison 2 — SE',              default: 0.18 },

      { id: 'trtA3', label: 'Comparison 3 — Treatment A', default: 1 },
      { id: 'trtB3', label: 'Comparison 3 — Treatment B', default: 4 },
      { id: 'effect3', label: 'Comparison 3 — Effect (B vs A)', default: 0.30 },
      { id: 'se3',     label: 'Comparison 3 — SE',              default: 0.20 },

      { id: 'trtA4', label: 'Comparison 4 — Treatment A', default: 2 },
      { id: 'trtB4', label: 'Comparison 4 — Treatment B', default: 3 },
      { id: 'effect4', label: 'Comparison 4 — Effect (B vs A)', default: 0.25 },
      { id: 'se4',     label: 'Comparison 4 — SE',              default: 0.22 },

      ...Array.from({ length: 11 }, (_, k) => {
        const i = k + 5;
        return [
          { id: `trtA${i}`,   label: `Comparison ${i} — Treatment A (optional)`, default: '' },
          { id: `trtB${i}`,   label: `Comparison ${i} — Treatment B (optional)`, default: '' },
          { id: `effect${i}`, label: `Comparison ${i} — Effect (optional)`,      default: '' },
          { id: `se${i}`,     label: `Comparison ${i} — SE (optional)`,          default: '' },
        ];
      }).flat(),
    ],

    example(values) {
      const { comparisons, error } = gatherNetworkComparisons(values);
      if (error || comparisons.length < 2 || typeof jStat === 'undefined' || !jStat.chisquare || !jStat.normal)
        return 'Enter at least 2 direct comparisons — each as Treatment A, Treatment B, an Effect, and its SE — to see a worked medical example here.';
      const treatments = networkTreatments(comparisons);
      if (treatments.length < 3 || !networkIsConnected(comparisons, treatments))
        return 'Enter comparisons connecting at least 3 treatments into one network to see a worked medical example here.';

      let referenceTreatment = parseInt(values.reference, 10);
      if (!treatments.includes(referenceTreatment)) referenceTreatment = treatments[0];
      const fit = fitNetworkMetaAnalysis(comparisons, referenceTreatment);
      if (fit.error) return 'Enter comparisons that connect every treatment to the reference to see a worked medical example here.';

      const isRatio = values.scale === 'ratio';
      const transform = v => isRatio ? Math.exp(v) : v;
      const f = v => +v.toFixed(2);
      const scores = networkPScores(fit, values.direction === 'higher');
      const best = scores[0];
      const names = treatments.map(t => treatmentDisplayName(values, t)).join(', ');

      return `${comparisons.length} trials connect ${treatments.length} treatments (${names}), but not every pair was tested head-to-head — some trials only compare a treatment against the shared reference, ${treatmentLabel(values, referenceTreatment)}. Network meta-analysis borrows strength across every trial at once, combining direct evidence where it exists with the indirect evidence implied through shared comparators, to estimate every possible pairwise comparison rather than just the ones actually run. By P-score, ${treatmentLabel(values, best.treatment)} ranks best (P = ${f(best.score)}), estimated at ${f(transform(fit.betaOfRE(best.treatment)))} versus ${treatmentLabel(values, referenceTreatment)}${fit.df > 0 ? ` — and with ${fit.df} degree(s) of freedom left in the network, direct and indirect evidence can also be cross-checked for consistency (I² = ${f(fit.I2)}%)` : ''}.`;
    },

    calculate(values) {
      const { comparisons, error } = gatherNetworkComparisons(values);
      if (error) return [err(error)];
      if (comparisons.length < 2) return [err('Enter Treatment A, Treatment B, Effect, and SE for at least 2 comparisons')];
      if (typeof jStat === 'undefined' || !jStat.chisquare || !jStat.normal)
        return [err('The statistics library failed to load — please refresh the page and try again.')];

      const treatments = networkTreatments(comparisons);
      if (treatments.length < 3)
        return [err('A network needs at least 3 distinct treatments — for exactly 2 treatments, use the Meta-Analysis calculator instead')];
      const components = networkComponents(comparisons, treatments);
      if (components.length > 1) {
        const groupList = components.map(g => g.map(t => treatmentDisplayName(values, t)).join(' + ')).join('   |   ');
        return [err(`These comparisons form ${components.length} disconnected groups of treatments, so they can't be jointly analyzed: ${groupList}. Every treatment must be linked, directly or indirectly, to every other treatment through a chain of trials.`)];
      }

      let referenceTreatment = parseInt(values.reference, 10);
      let refFallbackNote = null;
      if (!treatments.includes(referenceTreatment)) {
        refFallbackNote = `${treatmentLabel(values, referenceTreatment)} was not found among the entered comparisons, so ${treatmentLabel(values, treatments[0])} was used as the reference instead.`;
        referenceTreatment = treatments[0];
      }

      const fit = fitNetworkMetaAnalysis(comparisons, referenceTreatment);
      if (fit.error)
        return [err('Cannot fit the network — these comparisons do not provide enough independent information to connect every treatment to the reference (check for redundant or contradictory links)')];

      const isRatio = values.scale === 'ratio';
      const transform = v => isRatio ? Math.exp(v) : v;
      const Z = 1.96;
      const f = (v, dp = 4) => +(v.toFixed(dp));
      const higherBetter = values.direction === 'higher';
      const nameFor = t => treatmentDisplayName(values, t);
      const labelFor = t => treatmentLabel(values, t);

      const rows = [];
      if (refFallbackNote) rows.push({ label: 'Note', isText: true, ci: null, isRatio: false, value: refFallbackNote });

      rows.push(
        { label: 'Treatments in Network (t)', value: fit.treatments.length, ci: null, isRatio: false },
        { label: 'Direct Comparisons Entered (m)', value: comparisons.length, ci: null, isRatio: false },
        { label: 'Reference Treatment', value: labelFor(referenceTreatment), ci: null, isRatio: false, isText: true },
      );

      rows.push({
        label: 'Network Diagram', isSVG: true,
        svg: networkGraphSVG(treatments, comparisons, referenceTreatment, nameFor)
      });
      rows.push({ label: 'Reading the Network Diagram', isText: true, ci: null, isRatio: false,
        value: 'Each node is a treatment (the filled node is the reference); each line is a direct trial comparison between the two treatments it connects, thicker when more than one trial made that same comparison. A treatment with no direct line to another still gets an estimated comparison to it below — borrowed indirectly through the rest of the network.' });

      fit.params.forEach(t => {
        const feVal = fit.betaOfFE(t), reVal = fit.betaOfRE(t);
        const seFE = Math.sqrt(fit.varOfFE(t)), seRE = Math.sqrt(fit.varOfRE(t));
        rows.push(
          { label: `${labelFor(t)} vs ${labelFor(referenceTreatment)} (fixed-effect)`, value: f(transform(feVal)),
            ci: [f(transform(feVal - Z * seFE)), f(transform(feVal + Z * seFE))], isRatio },
          { label: `${labelFor(t)} vs ${labelFor(referenceTreatment)} (random-effects)`, value: f(transform(reVal)),
            ci: [f(transform(reVal - Z * seRE)), f(transform(reVal + Z * seRE))], isRatio, highlight: true },
        );
      });

      if (fit.df > 0) {
        rows.push(
          { label: "Cochran's Q (network heterogeneity/inconsistency)", value: f(fit.Q), ci: null, isRatio: false },
          { label: 'Degrees of Freedom (df = m − (t−1))', value: fit.df, ci: null, isRatio: false },
          { label: 'p-value (heterogeneity test)', value: formatPValue(fit.pQ), ci: null, isRatio: false },
          { label: 'I² (% variance due to heterogeneity)', value: f(fit.I2, 1), ci: null, isRatio: false, highlight: true },
          { label: 'τ² (common between-study variance)', value: f(fit.tau2), ci: null, isRatio: false },
        );
      } else {
        rows.push({ label: 'Note', isText: true, ci: null, isRatio: false,
          value: 'This network has no closed loops (a star/tree of direct comparisons), so heterogeneity and inconsistency between direct and indirect evidence cannot be tested from these comparisons alone — the fixed-effect and random-effects estimates coincide (τ² = 0).' });
      }

      const scores = networkPScores(fit, higherBetter);
      rows.push({
        label: 'Treatment Ranking (P-score, random-effects)', isText: true, ci: null, isRatio: false, highlight: true,
        value: scores.map((s, i) => `${i + 1}. ${labelFor(s.treatment)} — P = ${f(s.score, 3)}`).join('   ·   ')
      });

      rows.push({
        label: 'Forest Plot vs Reference', isSVG: true,
        svg: networkForestSVG(fit.params.map(t => ({ label: labelFor(t), effect: fit.betaOfRE(t), se: Math.sqrt(fit.varOfRE(t)) })), isRatio, labelFor(referenceTreatment))
      });

      rows.push({ label: 'League Table — All Pairwise Comparisons', isSVG: true, svg: networkLeagueTableSVG(fit, isRatio, nameFor) });
      rows.push({ label: 'Reading the League Table', isText: true, ci: null, isRatio: false,
        value: 'Each off-diagonal cell shows the random-effects estimate of the column treatment relative to the row treatment (point estimate, then 95% CI below it) — combining direct trial data where it exists with indirect evidence borrowed through shared comparators everywhere else.' });

      const heterogeneity = fit.I2 < 25 ? 'low' : fit.I2 < 75 ? 'moderate' : 'high';
      const heterogText = fit.df > 0
        ? `${heterogeneity[0].toUpperCase()}${heterogeneity.slice(1)} heterogeneity/inconsistency across the network (I² = ${f(fit.I2, 1)}%); Cochran's Q test is ${fit.pQ < 0.05 ? 'significant' : 'not significant'} (${formatPText(fit.pQ)}) — a significant result means direct and indirect evidence may disagree, so the league table should be interpreted with caution.`
        : 'No loops are present in this network, so there is no way to test consistency between direct and indirect evidence from these comparisons alone — the results assume consistency by construction.';

      rows.push({ label: 'Interpretation', isText: true, ci: null, isRatio: false,
        value: `Best-performing treatment by P-score: ${labelFor(scores[0].treatment)}. ${heterogText} This model assumes transitivity — that the trials behind each direct comparison are similar enough in patients, settings, and methods to be analyzed jointly — which cannot itself be verified from these summary numbers alone.` });

      return rows;
    }
  },

  /* ── 88. COMBINING TWO GROUPS (MEAN, SD & N) ────────────────────────────
     Merges 2-4 separately-reported subgroups (e.g. age bands, sites,
     sexes) into one overall mean, SD, and N — as if the raw data had
     been pooled — using the general n-group form of the Cochrane
     Handbook's combining-groups formula (§6.5.2.10): total sum of
     squares about the GRAND mean splits into a within-groups part
     (each group's own (n-1)s²) plus a between-groups part (each
     group's n·(its mean − the grand mean)²), the same split ANOVA
     uses for SS_total = SS_within + SS_between. For exactly 2 groups
     the between-groups term algebraically collapses to the familiar
     n1n2/N·(x̄1-x̄2)² cross-term (verified by hand), so this is a
     strict generalization, not a different formula bolted on.
     Deliberately distinct from the "pooled SD" used by Cohen's d, a
     t-test, or one-way ANOVA's MSE: that quantity assumes every group
     shares one true mean and is only a common scale for comparing
     them, whereas this one also folds in how far apart the reported
     means actually are — so in practice it comes out larger whenever
     the group means differ by more than a rounding amount, and only
     ties the equal-means pooled SD when they're (almost) identical.*/
  {
    id:          'combine-groups',
    name:        'Combining Groups (Mean, SD & N)',
    hint:        'Merged mean & SD from 2-4 reported subgroups',
    category:    'Descriptive Statistics',
    description: 'Combines 2 to 4 separately reported subgroups (e.g., age bands, sites, or sexes) into one overall mean, SD, and N — as if the raw data itself had been pooled into a single sample.',

    formulas: [
      {
        label: 'Combined N',
        latex: 'N = \\sum_i n_i'
      },
      {
        label: 'Combined (Grand) Mean',
        latex: '\\bar{x} = \\dfrac{\\sum_i n_i\\bar{x}_i}{N}'
      },
      {
        label: 'Combined SD (generalized Cochrane Handbook §6.5.2.10)',
        latex: 'SD = \\sqrt{\\dfrac{\\sum_i\\left[(n_i-1)s_i^2 + n_i(\\bar{x}_i-\\bar{x})^2\\right]}{N-1}}'
      },
      {
        label: 'For Comparison — Pooled SD Assuming Equal Group Means',
        latex: 's_{\\text{pooled}} = \\sqrt{\\dfrac{\\sum_i(n_i-1)s_i^2}{N-k}} \\quad (\\text{assumes every } \\bar{x}_i \\text{ equal, } k = \\text{\\# groups})'
      }
    ],

    inputLayout: 'groups',
    groupTerm: 'Group',
    groupFields: [
      { prefix: 'mean', label: 'Mean (x̄)' },
      { prefix: 'sd',   label: 'SD (s)' },
      { prefix: 'n',    label: 'Size (n)' },
    ],
    inputs: [
      { id: 'mean1', label: 'Group 1 Mean (x̄₁) — e.g. Ages 18–30', default: 118 },
      { id: 'sd1',   label: 'Group 1 SD (s₁)',                     default: 8 },
      { id: 'n1',    label: 'Group 1 Size (n₁)',                   default: 50 },

      { id: 'mean2', label: 'Group 2 Mean (x̄₂) — e.g. Ages 31–45', default: 122 },
      { id: 'sd2',   label: 'Group 2 SD (s₂)',                     default: 9 },
      { id: 'n2',    label: 'Group 2 Size (n₂)',                   default: 60 },

      { id: 'mean3', label: 'Group 3 Mean (x̄₃) — e.g. Ages 46–60', default: 128 },
      { id: 'sd3',   label: 'Group 3 SD (s₃)',                     default: 10 },
      { id: 'n3',    label: 'Group 3 Size (n₃)',                   default: 55 },

      { id: 'mean4', label: 'Group 4 Mean (x̄₄) — e.g. Ages 61+',   default: 134 },
      { id: 'sd4',   label: 'Group 4 SD (s₄)',                     default: 11 },
      { id: 'n4',    label: 'Group 4 Size (n₄)',                   default: 40 },
    ],

    example(values) {
      const { groups, error } = gatherGroupStats(values);
      if (error || groups.length < 2)
        return 'Enter a mean, SD, and sample size (n ≥ 2) for at least 2 groups to see a worked medical example here.';
      const N = groups.reduce((s, g) => s + g.n, 0);
      const meanCombined = groups.reduce((s, g) => s + g.n * g.mean, 0) / N;
      const withinSS = groups.reduce((s, g) => s + (g.n - 1) * g.sd ** 2, 0);
      const betweenSS = groups.reduce((s, g) => s + g.n * (g.mean - meanCombined) ** 2, 0);
      const sdCombined = Math.sqrt((withinSS + betweenSS) / (N - 1));
      const sdPooled = Math.sqrt(withinSS / (N - groups.length));
      const spread = Math.max(...groups.map(g => g.mean)) - Math.min(...groups.map(g => g.mean));
      const f = v => +v.toFixed(2);
      const cmp = sdCombined > sdPooled ? `wider than the ${f(sdPooled)} you'd get from a pooled SD that assumes every age band has the same true mean`
                : `close to the ${f(sdPooled)} you'd get from a pooled SD that assumes every age band has the same true mean, since these group means are close enough that`;
      return `A study reports blood pressure separately for ${groups.length} age bands rather than as one figure for all ${N} patients. Combined mean = ${f(meanCombined)}, combined SD = ${f(sdCombined)} — ${cmp} the ${f(spread)}-unit spread between the highest and lowest group means barely changes the answer.`;
    },

    calculate(values) {
      const { groups, error } = gatherGroupStats(values);
      if (error) return [err(error)];
      if (groups.length < 2) return [err('Enter a mean, SD, and N for at least 2 groups')];

      const N = groups.reduce((s, g) => s + g.n, 0);
      const meanCombined = groups.reduce((s, g) => s + g.n * g.mean, 0) / N;
      const withinSS = groups.reduce((s, g) => s + (g.n - 1) * g.sd ** 2, 0);
      const betweenSS = groups.reduce((s, g) => s + g.n * (g.mean - meanCombined) ** 2, 0);
      const sdCombined = Math.sqrt((withinSS + betweenSS) / (N - 1));
      const sdPooled = Math.sqrt(withinSS / (N - groups.length));
      const spread = Math.max(...groups.map(g => g.mean)) - Math.min(...groups.map(g => g.mean));

      const f = (v, dp = 4) => +(v.toFixed(dp));

      return [
        { label: 'Groups Combined (k)', value: groups.length, ci: null, isRatio: false },
        { label: 'Combined N', value: N, ci: null, isRatio: false },
        { label: 'Combined (Grand) Mean', value: f(meanCombined), ci: null, isRatio: false, highlight: true },
        { label: 'Combined SD', value: f(sdCombined), ci: null, isRatio: false, highlight: true },
        { label: 'For Comparison — Pooled SD Assuming Equal Group Means', value: f(sdPooled), ci: null, isRatio: false },
        { label: 'Note', isText: true, ci: null, isRatio: false,
          value: `The combined SD is ${sdCombined >= sdPooled ? 'larger than' : 'about equal to'} the equal-means pooled SD because it also captures the ${f(spread, 2)}-unit spread between the highest and lowest group means — use the Combined SD when you want one overall descriptive summary of all ${groups.length} groups together, and the Pooled SD only when standardizing differences between them (e.g. Cohen's d, an unpaired t-test, or one-way ANOVA's MSE).` },
      ];
    }
  },

];

/* ── HELPERS ─────────────────────────────────────────────────────────── */

function err(msg) {
  return { label: 'Error', value: msg, ci: null, isRatio: false, isText: true, isError: true };
}

// Abramowitz & Stegun 7.1.26 approximation (max error 1.5e-7)
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// For df = 1, chi-square is the square of a standard normal variate,
// so P(chi-square > x) = erfc(sqrt(x/2)) = 1 - erf(sqrt(x/2)).
function chiSquarePValue(chi2) {
  if (chi2 <= 0) return 1;
  return 1 - erf(Math.sqrt(chi2 / 2));
}

// Two-tailed p-value for a standard normal (z) statistic: P(|Z| > |z|).
function normalTwoTailedP(z) {
  return 1 - erf(Math.abs(z) / Math.SQRT2);
}

// Formats a p-value for a standalone numeric result row: returns a
// number (rounded to `dp` places) normally, or the string '< 0.001'
// once rounding would otherwise misrepresent a tiny p-value as 0.
function formatPValue(p, dp = 6) {
  return p < 0.001 ? '< 0.001' : +(p.toFixed(dp));
}

// Same, but for a p-value embedded inside a larger text string
// (e.g. `z = 2.1, p = 0.03`) — includes the "p " prefix itself.
function formatPText(p, dp = 6) {
  const v = formatPValue(p, dp);
  return typeof v === 'number' ? `p = ${v}` : `p ${v}`;
}

/* ── POWER HELPERS ───────────────────────────────────────────────────────
   Shared z-based power formulas for the 'power-*' and 'posthoc-power'
   calculators. Both assume the test statistic is (approximately)
   normal under H0 and Ha — the same approximation used in the
   source 'Power calculation.R' / 'Power with graph.R' scripts.       */

function normalPowerOneTailed(delta, sigma, n, alpha) {
  const se = sigma / Math.sqrt(n);
  const zCrit = jStat.normal.inv(1 - alpha, 0, 1);
  const zBeta = zCrit - delta / se;
  const beta  = jStat.normal.cdf(zBeta, 0, 1);
  return 1 - beta;
}

function normalPowerTwoTailed(delta, sigma, n, alpha) {
  const se = sigma / Math.sqrt(n);
  const zCrit = jStat.normal.inv(1 - alpha / 2, 0, 1);
  // Each term is a rejection-probability contribution (one per tail),
  // so their sum IS the power directly — do not subtract from 1 here
  // (that would return beta mislabeled as power, which silently
  // inverts the trend: power would appear to fall as n grows instead
  // of rising toward 1).
  const powerUpper = 1 - jStat.normal.cdf(zCrit - delta / se, 0, 1);
  const powerLower = jStat.normal.cdf(-zCrit - delta / se, 0, 1);
  return powerUpper + powerLower;
}

// log(nCk), via jStat's log-gamma — avoids factorial overflow for the
// hypergeometric probabilities used by Fisher's Exact Test.
function logChoose(n, k) {
  if (k < 0 || k > n) return -Infinity;
  return jStat.gammaln(n + 1) - jStat.gammaln(k + 1) - jStat.gammaln(n - k + 1);
}

/* ── NON-PARAMETRIC TEST HELPERS ─────────────────────────────────────────
   Shared by Mann-Whitney, Wilcoxon Signed-Rank, Kruskal-Wallis, Dunn's,
   and Friedman — all rank-based tests that need raw data (ranks can't
   be derived from summary stats the way means/SDs can).               */

// Parses a free-form list of numbers from a textarea (comma/whitespace/
// newline separated) into a flat numeric array.
function parseNumberList(text) {
  return String(text).trim().split(/[,\s]+/).filter(Boolean).map(Number);
}

// Assigns 1-based ranks to `arr`, averaging ranks within tied groups.
// Returns ranks in the SAME order as the input array, plus the tie-
// correction term Σ(t³−t) used by every test below.
function rankWithTies(arr) {
  const n = arr.length;
  const order = arr.map((_, i) => i).sort((a, b) => arr[a] - arr[b]);
  const ranks = new Array(n);
  let tieSum = 0;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && arr[order[j + 1]] === arr[order[i]]) j++;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let m = i; m <= j; m++) ranks[order[m]] = avgRank;
    const t = j - i + 1;
    if (t > 1) tieSum += t ** 3 - t;
    i = j + 1;
  }
  return { ranks, tieSum };
}

// Parses a textarea of rows (one per line, cells comma/whitespace
// separated) into a 2D numeric array — used by every calculator that
// takes a raw table/matrix (Cochran's Q, Friedman, Cramer's V,
// Cohen's/Weighted Kappa, ICC, Cronbach's Alpha).
function parseMatrix(text) {
  return String(text).trim().split(/\n+/).map(l => l.trim()).filter(Boolean)
    .map(l => l.split(/[,\s]+/).filter(Boolean).map(Number));
}

// Parses long-format factorial data (one row per observation: factor
// level(s) followed by a trailing value column) for '2-Way ANOVA with
// Replication' and 'Multi-Factor ANOVA'. Returns the number of factor
// columns so each calculator can validate its own expected count.
function parseLongFactorial(text) {
  const matrix = parseMatrix(text);
  if (matrix.length === 0) return { error: 'Enter at least one row of data' };
  const cols = matrix[0].length;
  if (cols < 2) return { error: 'Each row needs at least one factor column plus a value column' };
  if (matrix.some(row => row.length !== cols)) return { error: 'Every row must have the same number of columns' };
  if (matrix.some(row => row.some(v => !isFinite(v)))) return { error: 'All values must be numeric' };
  const rows = matrix.map(row => ({ factors: row.slice(0, -1), value: row[row.length - 1] }));
  return { rows, numFactors: cols - 1 };
}

// Reads group{1..6} textarea values out of the raw input values,
// skipping blanks (so groups 4–6 are naturally optional) — the
// textarea analogue of gatherGroups() used by the ANOVA calculators.
function gatherDataGroups(values, maxGroups = 6) {
  const groups = [];
  for (let i = 1; i <= maxGroups; i++) {
    const raw = values['group' + i];
    if (raw == null || String(raw).trim() === '') continue;
    const nums = parseNumberList(raw);
    if (nums.some(v => !isFinite(v))) return { error: `Group ${i}: all values must be numeric` };
    if (nums.length > 0) groups.push({ label: `Group ${i}`, values: nums });
  }
  return { groups };
}

// Reads effect{1..6}/se{1..6} pairs out of the raw input values for
// 'meta-analysis', skipping blank slots (so studies 4–6 are optional).
function gatherEffectStudies(values, maxStudies = 6) {
  const provided = v => v !== '' && v != null && isFinite(v);
  const studies = [];
  for (let i = 1; i <= maxStudies; i++) {
    const e = values['effect' + i], se = values['se' + i];
    const any = provided(e) || provided(se);
    const all = provided(e) && provided(se);
    if (all) studies.push({ label: `Study ${i}`, effect: e, se });
    else if (any) return { error: `Study ${i}: enter both Effect and SE, or leave both blank` };
  }
  return { studies };
}

// Reads mean{1..4}/sd{1..4}/n{1..4} triples for 'combine-groups',
// skipping blank slots (so groups 3-4 are optional, same convention
// as gatherEffectStudies()) and validating each provided group's N
// and SD as it goes.
function gatherGroupStats(values, maxGroups = 4) {
  const provided = v => v !== '' && v != null && isFinite(v);
  const groups = [];
  for (let i = 1; i <= maxGroups; i++) {
    const mean = values['mean' + i], sd = values['sd' + i], n = values['n' + i];
    const any = provided(mean) || provided(sd) || provided(n);
    const all = provided(mean) && provided(sd) && provided(n);
    if (!any) continue;
    if (!all) return { error: `Group ${i}: enter Mean, SD, and N, or leave all three blank` };
    if (n < 2) return { error: `Group ${i}: sample size (N) must be at least 2` };
    if (sd <= 0) return { error: `Group ${i}: SD must be greater than 0` };
    groups.push({ mean, sd, n });
  }
  return { groups };
}

// Reads trtA{1..15}/trtB{1..15}/effect{1..15}/se{1..15} rows for
// 'network-meta-analysis' — each row is one direct (two-arm) trial
// comparison, entered as "Treatment B vs Treatment A". Skips fully
// blank rows so comparisons 5-15 are optional; a partially-filled row
// (e.g. treatments given but no effect) is an error, same convention
// as gatherEffectStudies().
function gatherNetworkComparisons(values, maxComparisons = 15) {
  const provided = v => v !== '' && v != null && isFinite(v);
  const comparisons = [];
  for (let i = 1; i <= maxComparisons; i++) {
    const t1 = values['trtA' + i], t2 = values['trtB' + i], e = values['effect' + i], se = values['se' + i];
    const any = provided(t1) || provided(t2) || provided(e) || provided(se);
    const all = provided(t1) && provided(t2) && provided(e) && provided(se);
    if (!any) continue;
    if (!all) return { error: `Comparison ${i}: enter Treatment A, Treatment B, Effect, and SE, or leave all four blank` };
    if (!Number.isInteger(t1) || !Number.isInteger(t2) || t1 < 1 || t1 > 12 || t2 < 1 || t2 > 12)
      return { error: `Comparison ${i}: Treatment A and B must be whole numbers from 1 to 12` };
    if (t1 === t2) return { error: `Comparison ${i}: Treatment A and Treatment B must be different treatments` };
    if (se <= 0) return { error: `Comparison ${i}: SE must be greater than 0` };
    comparisons.push({ t1, t2, effect: e, se });
  }
  return { comparisons };
}

// Distinct treatment numbers referenced across a set of comparisons,
// ascending — the network's nodes.
function networkTreatments(comparisons) {
  return [...new Set(comparisons.flatMap(c => [c.t1, c.t2]))].sort((a, b) => a - b);
}

// Union-find over the comparison graph: groups treatments into their
// connected components. A network with more than one component has
// no basis for comparing treatments across components — no evidence,
// direct or indirect, links them. Used both to check connectivity
// and, when disconnected, to report exactly which treatments ended
// up isolated from which.
function networkComponents(comparisons, treatments) {
  const parent = new Map(treatments.map(t => [t, t]));
  const find = t => { while (parent.get(t) !== t) t = parent.get(t); return t; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  comparisons.forEach(c => union(c.t1, c.t2));
  const groups = new Map();
  treatments.forEach(t => {
    const root = find(t);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(t);
  });
  return [...groups.values()];
}

function networkIsConnected(comparisons, treatments) {
  return treatments.length === 0 || networkComponents(comparisons, treatments).length <= 1;
}

// Resolves a treatment number to its user-supplied name (name{t}
// input), falling back to "Treatment N" when left blank.
// treatmentDisplayName is for space-constrained contexts (graph
// nodes, league table headers) where the number is already shown
// separately; treatmentLabel pairs the name with "(#N)" so text rows
// stay unambiguous even when several treatments share a similar name.
function treatmentDisplayName(values, t) {
  const raw = values['name' + t];
  const name = raw != null ? String(raw).trim() : '';
  return name || `Treatment ${t}`;
}
function treatmentLabel(values, t) {
  const raw = values['name' + t];
  const name = raw != null ? String(raw).trim() : '';
  return name ? `${name} (#${t})` : `Treatment ${t}`;
}

// Frequentist contrast-based network meta-analysis (Lu & Ades /
// Rücker graph-theoretical model) for two-arm trials, fit by
// weighted least squares against a fixed reference treatment
// (coded as the implicit zero): each comparison row of the design
// matrix X carries -1 at Treatment A's column and +1 at Treatment
// B's column (0 for either that IS the reference), so beta-hat =
// (X'WX)^-1 X'Wy gives every other treatment's effect relative to
// the reference directly, with (X'WX)^-1 as its covariance matrix —
// from which ANY pairwise contrast (the league table) is just a
// linear combination beta_j - beta_i. Common between-study variance
// tau^2 is estimated by the multivariate method-of-moments
// generalization of DerSimonian-Laird (Jackson, White & Riley 2012):
// tau^2 = max(0, (Q-df)/C), C = tr(W) - tr[(X'WX)^-1 X'W^2X], which
// collapses to the ordinary pairwise DL formula when X is a single
// column of ones.
function fitNetworkMetaAnalysis(comparisons, referenceTreatment) {
  const treatments = networkTreatments(comparisons);
  const params = treatments.filter(t => t !== referenceTreatment);
  const p = params.length, m = comparisons.length;
  const colOf = t => params.indexOf(t);
  const diagOf = vals => vals.map((v, i) => vals.map((_, j) => (i === j ? v : 0)));

  const X = comparisons.map(c => {
    const row = new Array(p).fill(0);
    if (c.t1 !== referenceTreatment) row[colOf(c.t1)] -= 1;
    if (c.t2 !== referenceTreatment) row[colOf(c.t2)] += 1;
    return row;
  });
  const y  = comparisons.map(c => [c.effect]);
  const Xt = matrixTranspose(X);

  const wFE = comparisons.map(c => 1 / c.se ** 2);
  const XtWX_FE = matrixMultiply(matrixMultiply(Xt, diagOf(wFE)), X);
  const covFE = matrixInverse(XtWX_FE);
  if (!covFE) return { error: 'insufficient' };
  const betaFE = matrixMultiply(covFE, matrixMultiply(matrixMultiply(Xt, diagOf(wFE)), y)).map(r => r[0]);

  const fitted = X.map(row => row.reduce((s, xij, j) => s + xij * betaFE[j], 0));
  const Q  = comparisons.reduce((s, c, i) => s + wFE[i] * (c.effect - fitted[i]) ** 2, 0);
  const df = m - p;

  let tau2 = 0;
  if (df > 0) {
    const w2FE = comparisons.map(c => 1 / c.se ** 4);
    const XtW2X_FE = matrixMultiply(matrixMultiply(Xt, diagOf(w2FE)), X);
    const traceTerm = matrixMultiply(covFE, XtW2X_FE).reduce((s, row, i) => s + row[i], 0);
    const C = wFE.reduce((s, v) => s + v, 0) - traceTerm;
    tau2 = C > 0 ? Math.max(0, (Q - df) / C) : 0;
  }

  const wRE = comparisons.map(c => 1 / (c.se ** 2 + tau2));
  const XtWX_RE = matrixMultiply(matrixMultiply(Xt, diagOf(wRE)), X);
  const covRE = matrixInverse(XtWX_RE);
  if (!covRE) return { error: 'insufficient' };
  const betaRE = matrixMultiply(covRE, matrixMultiply(matrixMultiply(Xt, diagOf(wRE)), y)).map(r => r[0]);

  const pQ = df > 0 ? 1 - jStat.chisquare.cdf(Q, df) : null;
  const I2 = (df > 0 && Q > 0) ? Math.max(0, (Q - df) / Q) * 100 : 0;

  return {
    treatments, params, referenceTreatment, Q, df, pQ, I2, tau2,
    betaOfFE: t => t === referenceTreatment ? 0 : betaFE[colOf(t)],
    betaOfRE: t => t === referenceTreatment ? 0 : betaRE[colOf(t)],
    varOfFE:  t => t === referenceTreatment ? 0 : covFE[colOf(t)][colOf(t)],
    varOfRE:  t => t === referenceTreatment ? 0 : covRE[colOf(t)][colOf(t)],
    covOfRE:  (ta, tb) => (ta === referenceTreatment || tb === referenceTreatment) ? 0 : covRE[colOf(ta)][colOf(tb)],
  };
}

// Rücker & Schwarzer (2015) P-scores: the frequentist analogue of
// SUCRA, computed directly from the network's normal-theory
// estimates and covariance rather than by resampling. P_i is the
// average probability, across every other treatment j, that i is
// actually better than j given their estimated difference and its
// SE — 1.0 means certainly best, 0.0 certainly worst.
function networkPScores(fit, higherIsBetter) {
  const { treatments, betaOfRE, varOfRE, covOfRE } = fit;
  return treatments.map(ti => {
    let sum = 0;
    treatments.forEach(tj => {
      if (tj === ti) return;
      const diff = betaOfRE(ti) - betaOfRE(tj);
      const variance = Math.max(varOfRE(ti) + varOfRE(tj) - 2 * covOfRE(ti, tj), 1e-12);
      const z = (higherIsBetter ? diff : -diff) / Math.sqrt(variance);
      sum += jStat.normal.cdf(z, 0, 1);
    });
    return { treatment: ti, score: sum / (treatments.length - 1) };
  }).sort((a, b) => b.score - a.score);
}

// Kruskal-Wallis H statistic (tie-corrected) plus per-group rank
// stats — shared by 'kruskal-wallis' and 'dunns-test' (Dunn's needs
// the same rank pool, mean ranks, and tie sum for its pairwise SEs).
function kruskalWallisStats(groups) {
  const k = groups.length;
  const allValues = groups.flatMap(g => g.values);
  const N = allValues.length;
  const { ranks, tieSum } = rankWithTies(allValues);

  let offset = 0;
  const groupStats = groups.map(g => {
    const n = g.values.length;
    const groupRanks = ranks.slice(offset, offset + n);
    offset += n;
    const rankSum = groupRanks.reduce((s, r) => s + r, 0);
    return { label: g.label, n, rankSum, meanRank: rankSum / n };
  });

  const Hraw = (12 / (N * (N + 1))) * groupStats.reduce((s, g) => s + g.rankSum ** 2 / g.n, 0) - 3 * (N + 1);
  const tieCorrection = 1 - tieSum / (N ** 3 - N);
  const H = tieCorrection > 0 ? Hraw / tieCorrection : Hraw;

  return { N, k, H, df: k - 1, groupStats, tieSum, tieCorrection };
}

// Holm step-down p-value adjustment for multiple comparisons, matching
// R's p.adjust(method = "holm") — returns adjusted p-values in the
// SAME order as the input array (not sorted).
function holmAdjust(pValues) {
  const m = pValues.length;
  const order = pValues.map((_, i) => i).sort((a, b) => pValues[a] - pValues[b]);
  const adjusted = new Array(m);
  let runningMax = 0;
  order.forEach((origIdx, rank) => {
    const raw = pValues[origIdx] * (m - rank);
    runningMax = Math.max(runningMax, raw);
    adjusted[origIdx] = Math.min(1, runningMax);
  });
  return adjusted;
}

/* ── DISTRIBUTION TABLE HELPERS ─────────────────────────────────────────
   Build the classic textbook reference tables for 'z-table' and
   't-table', rendered as an isSVG (raw HTML) result row.             */

// Standard normal cumulative-area table: rows 0.0–3.4, columns .00–.09,
// cell = Φ(row + col). z < 0 isn't tabulated — by symmetry Φ(-z) = 1-Φ(z).
function zTableHTML(highlightZ) {
  const rowVals = Array.from({ length: 35 }, (_, i) => +(i * 0.1).toFixed(1));
  const colVals = Array.from({ length: 10 }, (_, j) => +(j * 0.01).toFixed(2));

  const hz    = isFinite(highlightZ) ? Math.round(Math.abs(highlightZ) * 100) / 100 : null;
  const hzRow = hz != null ? +(Math.floor(hz * 10 + 1e-9) / 10).toFixed(1) : null;
  const hzCol = hz != null ? +((hz - hzRow).toFixed(2)) : null;

  const header = `<th></th>` + colVals.map(c => `<th>.${String(Math.round(c * 100)).padStart(2, '0')}</th>`).join('');
  const body = rowVals.map(r => {
    const isHlRow = hzRow === r;
    const cells = colVals.map(c => {
      const z    = +(r + c).toFixed(2);
      const phi  = 0.5 * (1 + erf(z / Math.SQRT2));
      const isHl = isHlRow && hzCol === c;
      return `<td${isHl ? ' class="reftab-hl"' : ''}>${phi.toFixed(4)}</td>`;
    }).join('');
    return `<tr><th${isHlRow ? ' class="reftab-hl"' : ''}>${r.toFixed(1)}</th>${cells}</tr>`;
  }).join('');

  return `
    <div class="ref-table-label">Standard Normal (z) Table — Φ(z) = P(Z ≤ z), rows z (ones + tenths), columns hundredths</div>
    <div class="ref-table-wrap">
      <table class="ref-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

// Classic critical-t table: rows = df, columns = common one-tail alphas
// (two-tail shown alongside). Computed via jStat rather than hardcoded,
// so it stays exact rather than risking a mis-remembered constant.
const T_TABLE_DFS         = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,40,60,120,Infinity];
const T_TABLE_ALPHAS_ONE  = [0.10, 0.05, 0.025, 0.01, 0.005, 0.001];

function tTableHTML(highlightDf, highlightAlphaTwoTailed) {
  const hDf      = isFinite(highlightDf) ? Math.round(highlightDf) : null;
  const hAlphaOne = isFinite(highlightAlphaTwoTailed) ? +(highlightAlphaTwoTailed / 2).toFixed(4) : null;
  const isHlCol  = a => hAlphaOne != null && Math.abs(a - hAlphaOne) < 1e-9;

  const header    = `<th>df</th>` + T_TABLE_ALPHAS_ONE.map(a => `<th${isHlCol(a) ? ' class="reftab-hl"' : ''}>${a}</th>`).join('');
  const subHeader = `<th></th>` + T_TABLE_ALPHAS_ONE.map(a =>
    `<th class="ref-table-sub${isHlCol(a) ? ' reftab-hl' : ''}">two-tail ${(a * 2).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}</th>`
  ).join('');

  const body = T_TABLE_DFS.map(df => {
    const label   = isFinite(df) ? df : '∞';
    const isHlRow = hDf != null && df === hDf;
    const cells = T_TABLE_ALPHAS_ONE.map(a => {
      const val  = isFinite(df) ? jStat.studentt.inv(1 - a, df) : jStat.normal.inv(1 - a, 0, 1);
      const isHl = isHlRow && isHlCol(a);
      return `<td${isHl ? ' class="reftab-hl"' : ''}>${val.toFixed(3)}</td>`;
    }).join('');
    return `<tr><th${isHlRow ? ' class="reftab-hl"' : ''}>${label}</th>${cells}</tr>`;
  }).join('');

  return `
    <div class="ref-table-label">Student's t Critical Values — one-tail α across the top (two-tail equivalent below it), df down the side</div>
    <div class="ref-table-wrap">
      <table class="ref-table">
        <thead><tr>${header}</tr><tr>${subHeader}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/* ── ANOVA / TUKEY HSD HELPERS ──────────────────────────────────────────
   Shared by '1-Way ANOVA' and "Tukey's HSD Test", which both take up
   to 6 independent groups (mean, SD, n), with groups 4–6 optional.    */

// Builds the 6-group × (mean, SD, n) input set. `defaults` supplies the
// required leading groups (usually 3); remaining slots default to ''
// (optional), matching the site's existing optional-field convention.
function groupInputs(defaults) {
  const inputs = [];
  for (let i = 1; i <= 6; i++) {
    const d = defaults[i - 1] || { mean: '', sd: '', n: '' };
    inputs.push({ id: `mean${i}`, label: `Group ${i} Mean (x̄)`, default: d.mean });
    inputs.push({ id: `sd${i}`,   label: `Group ${i} SD (s)`,   default: d.sd });
    inputs.push({ id: `n${i}`,    label: `Group ${i} Size (n)`, default: d.n });
  }
  return inputs;
}

// Reads mean{i}/sd{i}/n{i} for i = 1..6 out of the raw input values and
// returns only the fully-filled-in groups. A group with some but not
// all of its three fields filled in is reported as an error.
function gatherGroups(values) {
  const provided = v => v !== '' && v != null && isFinite(v);
  const groups = [];
  for (let i = 1; i <= 6; i++) {
    const m = values['mean' + i], s = values['sd' + i], n = values['n' + i];
    const any = provided(m) || provided(s) || provided(n);
    const all = provided(m) && provided(s) && provided(n);
    if (all) {
      groups.push({ label: `Group ${i}`, mean: m, sd: s, n: Math.round(n) });
    } else if (any) {
      return { error: `Group ${i}: enter Mean, SD, and Size together, or leave all three blank` };
    }
  }
  return { groups };
}

// Standard 1-way ANOVA sums-of-squares decomposition from per-group
// summary statistics (equivalent to computing from raw data).
function anovaStats(groups) {
  const k = groups.length;
  const N = groups.reduce((s, g) => s + g.n, 0);
  const grandMean = groups.reduce((s, g) => s + g.n * g.mean, 0) / N;
  const ssb = groups.reduce((s, g) => s + g.n * (g.mean - grandMean) ** 2, 0);
  const ssw = groups.reduce((s, g) => s + (g.n - 1) * g.sd ** 2, 0);
  const dfB = k - 1, dfW = N - k;
  const msb = ssb / dfB, msw = ssw / dfW;
  return { k, N, grandMean, ssb, ssw, dfB, dfW, msb, msw, F: msb / msw };
}

// Critical value of the studentized range distribution at α = 0.05.
// k = 2 is exact (q = √2 · t_{0.025,df}); k = 3..6 is linearly
// interpolated by df from the standard published q-table (valid for
// df ≥ 5 — callers should reject smaller df rather than extrapolate).
const TUKEY_DF_BREAKPOINTS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 30, 40, 60, 120, Infinity];
const TUKEY_Q05 = {
  3: [4.60, 4.34, 4.16, 4.04, 3.95, 3.88, 3.82, 3.77, 3.73, 3.70, 3.67, 3.65, 3.63, 3.61, 3.59, 3.58, 3.53, 3.49, 3.44, 3.40, 3.36, 3.31],
  4: [5.22, 4.90, 4.68, 4.53, 4.41, 4.33, 4.26, 4.20, 4.15, 4.11, 4.08, 4.05, 4.02, 4.00, 3.98, 3.96, 3.90, 3.85, 3.79, 3.74, 3.68, 3.63],
  5: [5.67, 5.30, 5.06, 4.89, 4.76, 4.65, 4.57, 4.51, 4.45, 4.41, 4.37, 4.33, 4.30, 4.28, 4.25, 4.23, 4.17, 4.10, 4.04, 3.98, 3.92, 3.86],
  6: [6.03, 5.63, 5.36, 5.17, 5.02, 4.91, 4.82, 4.75, 4.69, 4.64, 4.59, 4.56, 4.52, 4.49, 4.47, 4.45, 4.37, 4.30, 4.23, 4.16, 4.10, 4.03],
};

function tukeyQCritical(k, df) {
  if (k === 2) return Math.SQRT2 * jStat.studentt.inv(0.975, df);

  const col = TUKEY_Q05[k];
  if (df <= TUKEY_DF_BREAKPOINTS[0]) return col[0];

  for (let i = 0; i < TUKEY_DF_BREAKPOINTS.length - 1; i++) {
    const d0 = TUKEY_DF_BREAKPOINTS[i], d1 = TUKEY_DF_BREAKPOINTS[i + 1];
    if (df === d0) return col[i];
    if (df > d0 && df < d1) {
      if (!isFinite(d1)) return col[i]; // beyond the last finite breakpoint (120) — use it as a floor
      const frac = (df - d0) / (d1 - d0);
      return col[i] + frac * (col[i + 1] - col[i]);
    }
  }
  return col[col.length - 1];
}

function sdBellCurveSVG(mean, sd, data) {
  const W = 560, H = 185;
  const PL = 12, PR = 12, PT = 16;
  const plotH = 118;
  const baseline = PT + plotH;        // 134

  const xMin = mean - 3.7 * sd;
  const xMax = mean + 3.7 * sd;
  const toX  = x => PL + ((x - xMin) / (xMax - xMin)) * (W - PL - PR);

  // Normal PDF, normalised so peak = 1
  const rawPhi = x => Math.exp(-0.5 * ((x - mean) / sd) ** 2);
  const toY    = y => PT + plotH - y * plotH;

  // Filled band polygon
  const band = (lo, hi) => {
    const pts = [`${toX(lo).toFixed(1)},${baseline}`];
    for (let i = 0; i <= 120; i++) {
      const x = lo + (i / 120) * (hi - lo);
      pts.push(`${toX(x).toFixed(1)},${toY(rawPhi(x)).toFixed(1)}`);
    }
    pts.push(`${toX(hi).toFixed(1)},${baseline}`);
    return pts.join(' ');
  };

  // Curve polyline
  const curvePts = [];
  for (let i = 0; i <= 300; i++) {
    const x = xMin + (i / 300) * (xMax - xMin);
    curvePts.push(`${toX(x).toFixed(1)},${toY(rawPhi(x)).toFixed(1)}`);
  }

  // SD dashed lines at ±1, ±2, ±3
  const sdLines = [-3,-2,-1,1,2,3].map(z => {
    const px = toX(mean + z * sd).toFixed(1);
    return `<line x1="${px}" y1="${PT}" x2="${px}" y2="${baseline}" stroke="#4E6EDB" stroke-width="1" stroke-dasharray="3,3" opacity=".4"/>`;
  }).join('');

  // Percentage labels (68-95-99.7 rule) — inside the shaded bands
  const pctLabels = [
    { z: 0.5,  pct: '68.3%',  yFrac: 0.38 },
    { z: 1.5,  pct: '13.6%',  yFrac: 0.15 },
    { z: 2.5,  pct: '2.1%',   yFrac: 0.06 },
  ].flatMap(({ z, pct, yFrac }) => {
    const y = toY(yFrac).toFixed(1);
    return [
      `<text x="${toX(mean + z*sd).toFixed(1)}" y="${y}" text-anchor="middle" font-size="9" fill="#4E6EDB" opacity=".75">${pct}</text>`,
      `<text x="${toX(mean - z*sd).toFixed(1)}" y="${y}" text-anchor="middle" font-size="9" fill="#4E6EDB" opacity=".75">${pct}</text>`,
    ];
  }).join('');

  // Data strip (dot plot below baseline)
  const stripY   = baseline + 8;
  const dotStack = {};
  const dots = data.map(v => {
    const px  = toX(Math.min(Math.max(v, xMin), xMax));
    const key = px.toFixed(0);
    dotStack[key] = (dotStack[key] || 0) + 1;
    const cy  = stripY + (dotStack[key] - 1) * 5.5;
    return `<circle cx="${px.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="#4E6EDB" opacity=".55"/>`;
  }).join('');

  // Axis tick labels
  const ticks = [-3,-2,-1,0,1,2,3].map(z => {
    const px  = toX(mean + z * sd).toFixed(1);
    const lbl = z === 0 ? 'μ'
              : z > 0   ? `μ+${z}σ`
                        : `μ−${Math.abs(z)}σ`;
    return `<line x1="${px}" y1="${baseline}" x2="${px}" y2="${(baseline+4).toFixed(1)}" stroke="#CDD2E0" stroke-width="1"/>
<text x="${px}" y="${H - 3}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">${lbl}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Normal distribution with SD bands and data points">
  <polygon points="${band(mean-3*sd, mean+3*sd)}" fill="#4E6EDB" opacity=".07"/>
  <polygon points="${band(mean-2*sd, mean+2*sd)}" fill="#4E6EDB" opacity=".09"/>
  <polygon points="${band(mean-sd,   mean+sd  )}" fill="#4E6EDB" opacity=".13"/>
  ${sdLines}
  <line x1="${PL}" y1="${baseline}" x2="${W-PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  <polyline points="${curvePts.join(' ')}" fill="none" stroke="#4E6EDB" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="${toX(mean).toFixed(1)}" y1="${PT}" x2="${toX(mean).toFixed(1)}" y2="${baseline}" stroke="#E07B2C" stroke-width="2" stroke-dasharray="5,3"/>
  ${pctLabels}
  <line x1="${PL}" y1="${stripY + 20}" x2="${W-PR}" y2="${stripY + 20}" stroke="#EEF1F7" stroke-width="1"/>
  ${dots}
  ${ticks}
</svg>`;
}

// Full binomial PMF via the stable multiplicative recurrence
// P(0) = (1-p)^n,  P(i) = P(i-1) * (n-i+1)/i * p/(1-p) — avoids
// computing C(n,k) directly, which overflows for large n.
function binomialPMF(n, p) {
  if (p === 0) { const pmf = new Array(n + 1).fill(0); pmf[0] = 1; return pmf; }
  if (p === 1) { const pmf = new Array(n + 1).fill(0); pmf[n] = 1; return pmf; }
  const pmf = new Array(n + 1);
  pmf[0] = Math.pow(1 - p, n);
  for (let i = 1; i <= n; i++) {
    pmf[i] = pmf[i - 1] * ((n - i + 1) / i) * (p / (1 - p));
  }
  return pmf;
}

function binomialBarSVG(n, p, k, pmf) {
  const W = 560, H = 185;
  const PL = 12, PR = 12, PT = 20, PB = 26;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const baseline = PT + plotH;

  const mean = n * p;
  const sd   = Math.sqrt(n * p * (1 - p)) || 1;

  let lo = Math.max(0, Math.floor(mean - 4 * sd));
  let hi = Math.min(n, Math.ceil(mean + 4 * sd));
  if (hi <= lo) { lo = Math.max(0, k - 3); hi = Math.min(n, k + 3); }
  if (k < lo) lo = k;
  if (k > hi) hi = k;

  const count = hi - lo + 1;
  const maxP  = Math.max(...pmf.slice(lo, hi + 1), 1e-12);
  const barW  = plotW / count;
  const toY   = v => baseline - (v / maxP) * plotH;

  const bars = [];
  for (let i = lo; i <= hi; i++) {
    const x      = PL + (i - lo) * barW;
    const y      = toY(pmf[i]);
    const isSel  = i === k;
    bars.push(`<rect x="${(x + barW * 0.12).toFixed(1)}" y="${y.toFixed(1)}" width="${(barW * 0.76).toFixed(1)}" height="${(baseline - y).toFixed(1)}" fill="${isSel ? '#E07B2C' : '#4E6EDB'}" opacity="${isSel ? '0.9' : '0.55'}" rx="1"/>`);
  }

  const tickStep = Math.max(1, Math.ceil(count / 10));
  const ticks = [];
  for (let i = lo; i <= hi; i += tickStep) {
    const x = PL + (i - lo) * barW + barW / 2;
    ticks.push(`<text x="${x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">${i}</text>`);
  }
  if ((k - lo) % tickStep !== 0) {
    const x = PL + (k - lo) * barW + barW / 2;
    ticks.push(`<text x="${x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#E07B2C" font-weight="600">${k}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Binomial probability mass function">
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  ${bars.join('')}
  ${ticks.join('')}
  <text x="${PL}" y="${PT - 6}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">P(X = k)</text>
</svg>`;
}

// Like binomialBarSVG, but colors every outcome as-or-more-extreme than
// the observed x (i.e. every k contributing to the two-sided p-value)
// in amber, rather than highlighting only k itself — visualizes the
// rejection region, with a marker pinpointing the observed x.
function binomialTestSVG(n, p0, x, pmf) {
  const W = 560, H = 185;
  const PL = 12, PR = 12, PT = 20, PB = 26;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const baseline = PT + plotH;

  const mean = n * p0;
  const sd   = Math.sqrt(n * p0 * (1 - p0)) || 1;

  let lo = Math.max(0, Math.floor(mean - 4 * sd));
  let hi = Math.min(n, Math.ceil(mean + 4 * sd));
  if (hi <= lo) { lo = Math.max(0, x - 3); hi = Math.min(n, x + 3); }
  if (x < lo) lo = x;
  if (x > hi) hi = x;

  const threshold = pmf[x] * (1 + 1e-7);
  const count = hi - lo + 1;
  const maxP  = Math.max(...pmf.slice(lo, hi + 1), 1e-12);
  const barW  = plotW / count;
  const toY   = v => baseline - (v / maxP) * plotH;

  const bars = [];
  for (let i = lo; i <= hi; i++) {
    const bx = PL + (i - lo) * barW;
    const by = toY(pmf[i]);
    const inRejection = pmf[i] <= threshold;
    const isObs = i === x;
    const fill = inRejection ? '#E07B2C' : '#4E6EDB';
    const opac = isObs ? '0.95' : (inRejection ? '0.7' : '0.5');
    bars.push(`<rect x="${(bx + barW * 0.12).toFixed(1)}" y="${by.toFixed(1)}" width="${(barW * 0.76).toFixed(1)}" height="${(baseline - by).toFixed(1)}" fill="${fill}" opacity="${opac}" rx="1"${isObs ? ' stroke="#1A1A2E" stroke-width="1"' : ''}/>`);
  }

  const obsCx = PL + (x - lo) * barW + barW / 2;
  const obsCy = toY(pmf[x]) - 8;
  const marker = `<polygon points="${obsCx.toFixed(1)},${(obsCy - 5).toFixed(1)} ${(obsCx + 5).toFixed(1)},${(obsCy + 4).toFixed(1)} ${(obsCx - 5).toFixed(1)},${(obsCy + 4).toFixed(1)}" fill="#1A1A2E"/>`;

  const tickStep = Math.max(1, Math.ceil(count / 10));
  const ticks = [];
  for (let i = lo; i <= hi; i += tickStep) {
    const tx = PL + (i - lo) * barW + barW / 2;
    ticks.push(`<text x="${tx.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">${i}</text>`);
  }
  if ((x - lo) % tickStep !== 0) {
    const tx = PL + (x - lo) * barW + barW / 2;
    ticks.push(`<text x="${tx.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#1A1A2E" font-weight="600">${x}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Binomial distribution under H0 with the two-sided rejection region highlighted">
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  ${bars.join('')}
  ${marker}
  ${ticks.join('')}
  <text x="${PL}" y="${PT - 6}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">P(X = k) under H₀: p₀ = ${(+p0.toFixed(3))} — amber = as-or-more-extreme than observed x = ${x}</text>
</svg>`;
}

function semComparisonSVG(mean, sd, sem) {
  const W = 560, H = 185;
  const PL = 12, PR = 12, PT = 24, PB = 14;
  const plotH = H - PT - PB;
  const baseline = PT + plotH;

  const xMin = mean - 3.8 * sd;
  const xMax = mean + 3.8 * sd;
  const toX  = x => PL + ((x - xMin) / (xMax - xMin)) * (W - PL - PR);
  const phi  = (x, s) => Math.exp(-0.5 * ((x - mean) / s) ** 2);
  const toY  = y => baseline - y * plotH;

  const curve = (s, steps = 300) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      pts.push(`${toX(x).toFixed(1)},${toY(phi(x, s)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const meanX = toX(mean).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Comparison of data spread (SD) and mean-estimate spread (SEM)">
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  <polyline points="${curve(sd)}" fill="none" stroke="#4E6EDB" stroke-width="2" opacity=".6" stroke-linejoin="round"/>
  <polyline points="${curve(sem)}" fill="none" stroke="#E07B2C" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="${meanX}" y1="${PT}" x2="${meanX}" y2="${baseline}" stroke="#1A1A2E" stroke-width="1" stroke-dasharray="3,3" opacity=".35"/>
  <circle cx="${PL + 5}" cy="${PT - 12}" r="3" fill="#4E6EDB" opacity=".6"/>
  <text x="${PL + 12}" y="${PT - 8}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">Data distribution (Standard Deviation = ${(+sd.toFixed(3))})</text>
  <circle cx="${W - PR - 280}" cy="${PT - 12}" r="3" fill="#E07B2C"/>
  <text x="${W - PR - 270}" y="${PT - 8}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">Sampling distribution of mean (Standard Error of the Mean = ${(+sem.toFixed(3))})</text>
</svg>`;
}

// H0 vs Ha normal curves for 'power-with-graph': shades the alpha
// region(s) of H0 past the critical value(s), blue, and the beta
// region of Ha that falls in the "fail to reject" zone, amber.
// One-tailed: a single critical value, alpha on the upper tail only,
// beta is everything under Ha left of it. Two-tailed (criticalLower
// passed): two critical values, alpha split into both H0 tails, beta
// is the middle slice of Ha strictly between them.
function powerDistributionsSVG(mu0, muA, se, criticalValue, alpha, beta, power, criticalLower = null) {
  const W = 560, H = 200;
  const PL = 12, PR = 12, PT = 40, PB = 26;
  const plotH = H - PT - PB;
  const baseline = PT + plotH;
  const isTwoTailed = criticalLower != null;

  const xMin = Math.min(mu0, muA) - 4 * se;
  const xMax = Math.max(mu0, muA) + 4 * se;
  const toX  = x => PL + ((x - xMin) / (xMax - xMin)) * (W - PL - PR);
  const phi  = (x, mean) => Math.exp(-0.5 * ((x - mean) / se) ** 2);
  const toY  = y => baseline - y * plotH;

  const curve = (mean, steps = 300) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      pts.push(`${toX(x).toFixed(1)},${toY(phi(x, mean)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const band = (mean, lo, hi) => {
    if (hi <= lo) return '';
    const steps = 120;
    const pts = [`${toX(lo).toFixed(1)},${baseline}`];
    for (let i = 0; i <= steps; i++) {
      const x = lo + (i / steps) * (hi - lo);
      pts.push(`${toX(x).toFixed(1)},${toY(phi(x, mean)).toFixed(1)}`);
    }
    pts.push(`${toX(hi).toFixed(1)},${baseline}`);
    return pts.join(' ');
  };

  const alphaBandUpper = band(mu0, Math.max(criticalValue, xMin), xMax);
  const alphaBandLower = isTwoTailed ? band(mu0, xMin, Math.min(criticalLower, xMax)) : '';
  const betaBand = isTwoTailed
    ? band(muA, Math.max(criticalLower, xMin), Math.min(criticalValue, xMax))
    : band(muA, xMin, Math.min(criticalValue, xMax));
  const critX = toX(criticalValue).toFixed(1);
  const critLowerX = isTwoTailed ? toX(criticalLower).toFixed(1) : null;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Null and alternative distributions with alpha, beta, and power regions">
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  ${alphaBandUpper ? `<polygon points="${alphaBandUpper}" fill="#4E6EDB" opacity=".35"/>` : ''}
  ${alphaBandLower ? `<polygon points="${alphaBandLower}" fill="#4E6EDB" opacity=".35"/>` : ''}
  ${betaBand       ? `<polygon points="${betaBand}" fill="#E07B2C" opacity=".35"/>` : ''}
  <polyline points="${curve(mu0)}" fill="none" stroke="#4E6EDB" stroke-width="2.5" stroke-linejoin="round"/>
  <polyline points="${curve(muA)}" fill="none" stroke="#E07B2C" stroke-width="2.5" stroke-linejoin="round"/>
  ${isTwoTailed ? `
  <line x1="${critLowerX}" y1="${PT - 6}" x2="${critLowerX}" y2="${baseline}" stroke="#1A1A2E" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="${critLowerX}" y="${PT - 12}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#1A1A2E">${(+criticalLower.toFixed(2))}</text>` : ''}
  <line x1="${critX}" y1="${PT - 6}" x2="${critX}" y2="${baseline}" stroke="#1A1A2E" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="${critX}" y="${PT - 12}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#1A1A2E">${isTwoTailed ? '' : 'Critical = '}${(+criticalValue.toFixed(2))}</text>
  <text x="${toX(mu0).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#4E6EDB">H₀ (μ₀=${(+mu0.toFixed(2))})</text>
  <text x="${toX(muA).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#E07B2C">Hₐ (μA=${(+muA.toFixed(2))})</text>
  <text x="${PL + 4}" y="${PT - 26}" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#7B8099">α = ${(+alpha.toFixed(4))} (blue${isTwoTailed ? ', split both tails' : ''}) · β = ${(+beta.toFixed(4))} (amber) · Power = ${(+power.toFixed(4))}</text>
</svg>
<p class="viz-caption">Curve width reflects precision (SE); peak height is fixed for readability, not a probability scale.</p>`;
}

// Two-tailed power vs. effect size, for three benchmark alpha levels,
// with a marker at the user's chosen (delta, alpha) — for
// 'power-vs-es-alpha'.
function powerCurveLineSVG(sigma, n, highlightDelta, highlightAlpha) {
  const W = 560, H = 200;
  const PL = 36, PR = 14, PT = 20, PB = 28;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const baseline = PT + plotH;

  const se = sigma / Math.sqrt(n);
  const deltaMax = Math.max(4 * se, Math.abs(highlightDelta) * 1.3, 1e-6);
  const toX = d => PL + (d / deltaMax) * plotW;
  const toY = p => baseline - p * plotH;

  const alphas = [0.01, 0.05, 0.10];
  const colors = ['#A9B4EC', '#4E6EDB', '#2D3E8C'];
  const steps = 100;
  const lines = alphas.map((a, idx) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * deltaMax;
      pts.push(`${toX(d).toFixed(1)},${toY(normalPowerTwoTailed(d, sigma, n, a)).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${colors[idx]}" stroke-width="2.2"/>`;
  }).join('');

  const legend = alphas.map((a, idx) => {
    const ly = PT + idx * 13;
    return `<circle cx="${W - PR - 78}" cy="${ly}" r="3" fill="${colors[idx]}"/>
      <text x="${W - PR - 70}" y="${ly + 3}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">α = ${a}</text>`;
  }).join('');

  const gridY = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(p => {
    const y = toY(p).toFixed(1);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#EEF1F7" stroke-width="1"/>
      <text x="${PL - 6}" y="${(+y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${p.toFixed(1)}</text>`;
  }).join('');

  const tickCount = 5;
  const ticksX = Array.from({ length: tickCount + 1 }, (_, i) => {
    const d = (i / tickCount) * deltaMax;
    const x = toX(d).toFixed(1);
    return `<text x="${x}" y="${H - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${(+d.toFixed(1))}</text>`;
  }).join('');

  const hx = toX(Math.max(0, Math.min(highlightDelta, deltaMax))).toFixed(1);
  const hy = toY(normalPowerTwoTailed(highlightDelta, sigma, n, highlightAlpha)).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Two-tailed power as a function of effect size, for alpha = .01, .05, .10">
  ${gridY}
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  ${lines}
  ${legend}
  ${ticksX}
  <text x="${(PL + plotW / 2).toFixed(1)}" y="${H - 1}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">effect size (δ)</text>
  <polygon points="${hx},${(+hy - 5).toFixed(1)} ${(+hx + 5).toFixed(1)},${hy} ${hx},${(+hy + 5).toFixed(1)} ${(+hx - 5).toFixed(1)},${hy}" fill="#E07B2C" stroke="#1A1A2E" stroke-width="1"/>
</svg>`;
}

// PPV/NPV as a function of disease prevalence, for a test with fixed
// Se/Sp — the classic illustration that predictive values (unlike Se/Sp
// themselves) depend on the population the test is applied to.
function ppvNpvPrevalenceCurveSVG(Se, Sp, prevalence) {
  const W = 560, H = 200;
  const PL = 36, PR = 14, PT = 20, PB = 28;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const baseline = PT + plotH;
  const eps = 0.001;

  const toX = p => PL + p * plotW;
  const toY = v => baseline - v * plotH;
  const ppvAt = p => (Se * p) / (Se * p + (1 - Sp) * (1 - p));
  const npvAt = p => (Sp * (1 - p)) / (Sp * (1 - p) + (1 - Se) * p);

  const steps = 100;
  const linePts = fn => Array.from({ length: steps + 1 }, (_, i) => {
    const p = eps + (i / steps) * (1 - 2 * eps);
    return `${toX(p).toFixed(1)},${toY(fn(p)).toFixed(1)}`;
  }).join(' ');

  const gridY = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#EEF1F7" stroke-width="1"/>
      <text x="${PL - 6}" y="${(+y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${v.toFixed(1)}</text>`;
  }).join('');

  const gridX = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(p => {
    const x = toX(p).toFixed(1);
    return `<text x="${x}" y="${H - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${(p * 100).toFixed(0)}%</text>`;
  }).join('');

  const legend = `
    <circle cx="${W - PR - 92}" cy="${PT}" r="3" fill="#4E6EDB"/>
    <text x="${W - PR - 84}" y="${PT + 3}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">PPV</text>
    <circle cx="${W - PR - 44}" cy="${PT}" r="3" fill="#E07B2C"/>
    <text x="${W - PR - 36}" y="${PT + 3}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">NPV</text>`;

  const p0 = Math.max(eps, Math.min(prevalence, 1 - eps));
  const mx = toX(p0).toFixed(1);
  const myPPV = toY(ppvAt(p0)).toFixed(1);
  const myNPV = toY(npvAt(p0)).toFixed(1);
  const marker = (x, y, color) =>
    `<polygon points="${x},${(+y - 5).toFixed(1)} ${(+x + 5).toFixed(1)},${y} ${x},${(+y + 5).toFixed(1)} ${(+x - 5).toFixed(1)},${y}" fill="${color}" stroke="#1A1A2E" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="PPV and NPV as a function of disease prevalence">
  ${gridY}
  <line x1="${mx}" y1="${PT}" x2="${mx}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  <polyline points="${linePts(ppvAt)}" fill="none" stroke="#4E6EDB" stroke-width="2.2"/>
  <polyline points="${linePts(npvAt)}" fill="none" stroke="#E07B2C" stroke-width="2.2"/>
  ${legend}
  ${gridX}
  <text x="${(PL + plotW / 2).toFixed(1)}" y="${H - 1}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">disease prevalence</text>
  ${marker(mx, myPPV, '#4E6EDB')}
  ${marker(mx, myNPV, '#E07B2C')}
</svg>`;
}

// Reference table of two-tailed power across Cohen's-d benchmark
// effect sizes (rows) and alpha levels (columns), for a given sigma
// and n — for 'power-delta-alpha'. Highlights the closest row/column
// to the user's chosen delta/alpha.
const POWER_TABLE_D_VALUES = [0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
const POWER_TABLE_ALPHAS   = [0.01, 0.05, 0.10];

function powerDeltaAlphaTableHTML(sigma, n, highlightDelta, highlightAlpha) {
  const highlightD = Math.abs(highlightDelta) / sigma;
  const closest = (arr, v) => arr.reduce((best, cur) => Math.abs(cur - v) < Math.abs(best - v) ? cur : best);
  const hD = closest(POWER_TABLE_D_VALUES, highlightD);
  const hA = closest(POWER_TABLE_ALPHAS, highlightAlpha);

  const header = `<th>Cohen's d</th>` + POWER_TABLE_ALPHAS.map(a => `<th${a === hA ? ' class="reftab-hl"' : ''}>α = ${a}</th>`).join('');
  const body = POWER_TABLE_D_VALUES.map(d => {
    const isHlRow = d === hD;
    const cells = POWER_TABLE_ALPHAS.map(a => {
      const power = normalPowerTwoTailed(d * sigma, sigma, n, a);
      const isHl = isHlRow && a === hA;
      return `<td${isHl ? ' class="reftab-hl"' : ''}>${power.toFixed(3)}</td>`;
    }).join('');
    return `<tr><th${isHlRow ? ' class="reftab-hl"' : ''}>${d}</th>${cells}</tr>`;
  }).join('');

  return `
    <div class="ref-table-label">Two-Tailed Power by Effect Size (Cohen's d = δ/σ) and α, at n = ${n}</div>
    <div class="ref-table-wrap">
      <table class="ref-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

// The 2x2 hypothesis-testing decision matrix for 'type1-type2-errors':
// reality (H0 false/true) as rows, decision (reject/fail to reject) as
// columns — ordered so True Positive lands top-left and True Negative
// bottom-right, matching the same top-left-is-positive convention used
// by the diagnostic-testing 2x2 tables elsewhere on this site. Built as
// a plain HTML/CSS grid rather than an SVG, since this is a static
// conceptual diagram, not a data plot — no coordinate math needed,
// just four labeled, color-coded cells.
function decisionMatrixHTML(alpha, power) {
  const f = v => (v * 100).toFixed(1) + '%';
  const beta = 1 - power;

  return `
    <div class="decision-matrix-wrap">
      <div class="decision-matrix">
        <div class="dm-corner"></div>
        <div class="dm-col-header">Reality:<br>H₀ False<span class="dm-row-sub">(a real effect exists)</span></div>
        <div class="dm-col-header">Reality:<br>H₀ True<span class="dm-row-sub">(no real effect)</span></div>

        <div class="dm-row-header">Decision:<br>Reject H₀</div>
        <div class="dm-cell dm-correct">
          <span class="dm-cell-letter">a</span>
          <div class="dm-cell-title">Correct — True Positive (Power)</div>
          <div class="dm-cell-prob">1 − β = ${f(power)}</div>
          <div class="dm-cell-desc">Correctly detect the real effect.</div>
        </div>
        <div class="dm-cell dm-type1">
          <span class="dm-cell-letter">b</span>
          <div class="dm-cell-title">Type I Error — False Positive</div>
          <div class="dm-cell-prob">α = ${f(alpha)}</div>
          <div class="dm-cell-desc">Declare an effect that isn't really there — e.g. approving an ineffective drug.</div>
        </div>

        <div class="dm-row-header">Decision:<br>Fail to Reject H₀</div>
        <div class="dm-cell dm-type2">
          <span class="dm-cell-letter">c</span>
          <div class="dm-cell-title">Type II Error — False Negative</div>
          <div class="dm-cell-prob">β = ${f(beta)}</div>
          <div class="dm-cell-desc">Miss a real effect — e.g. failing to detect a drug that actually works.</div>
        </div>
        <div class="dm-cell dm-correct">
          <span class="dm-cell-letter">d</span>
          <div class="dm-cell-title">Correct — True Negative</div>
          <div class="dm-cell-prob">1 − α = ${f(1 - alpha)}</div>
          <div class="dm-cell-desc">Correctly conclude there's no effect.</div>
        </div>
      </div>
    </div>
  `;
}

// Forest plot for 'meta-analysis': each study's own 95% CI (blue
// squares, sized by its fixed-effect weight) plus the fixed-effect
// and random-effects pooled estimates as diamonds (blue / amber,
// matching the site's established "primary vs. alternate method"
// color convention). A dashed line marks the null value — 0 for
// additive effects, or log(1)=0 for ratio effects (studies/pooled
// values are already on the log scale in ratio mode, so no
// positional change is needed, only the null-line's label).
function metaForestPlotSVG(studies, weightsFE, pooledFE, ciFE, pooledRE, ciRE, isRatio = false) {
  const k = studies.length;
  const rowH = 24;
  const W = 560;
  const PL = 108, PR = 20, PT = 20, PB = 26;
  const plotW = W - PL - PR;
  const totalRows = k + 2;
  const H = PT + totalRows * rowH + PB;
  const baseline = H - PB;

  const studyCIs = studies.map(s => [s.effect - 1.96 * s.se, s.effect + 1.96 * s.se]);
  const allVals = [...studyCIs.flat(), ...ciFE, ...ciRE, 0];
  let lo = Math.min(...allVals), hi = Math.max(...allVals);
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad; hi += pad;

  const toX = v => PL + ((v - lo) / (hi - lo)) * plotW;
  const zeroX = toX(0).toFixed(1);

  const maxW = Math.max(...weightsFE);
  const sizeFor = w => 4 + 6 * (w / maxW);

  const rows = studies.map((s, i) => {
    const y = PT + i * rowH + rowH / 2;
    const [ciLo, ciHi] = studyCIs[i];
    const x1 = toX(ciLo).toFixed(1), x2 = toX(ciHi).toFixed(1), xc = toX(s.effect).toFixed(1);
    const sz = sizeFor(weightsFE[i]);
    return `
      <text x="${PL - 10}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="9.5" fill="#4A4E6B">${esc(s.label)}</text>
      <line x1="${x1}" y1="${y.toFixed(1)}" x2="${x2}" y2="${y.toFixed(1)}" stroke="#4E6EDB" stroke-width="1.5"/>
      <rect x="${(+xc - sz / 2).toFixed(1)}" y="${(y - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" fill="#4E6EDB"/>`;
  }).join('');

  const diamond = (ciLo, ciHi, pt, y, label, color) => {
    const x1 = toX(ciLo).toFixed(1), x2 = toX(ciHi).toFixed(1), xc = toX(pt).toFixed(1);
    const dh = 6;
    return `
      <text x="${PL - 10}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="9.5" font-weight="600" fill="${color}">${label}</text>
      <polygon points="${x1},${y} ${xc},${(y - dh).toFixed(1)} ${x2},${y} ${xc},${(y + dh).toFixed(1)}" fill="${color}"/>`;
  };

  const yFE = PT + k * rowH + rowH / 2;
  const yRE = PT + (k + 1) * rowH + rowH / 2;
  const feDiamond = diamond(ciFE[0], ciFE[1], pooledFE, yFE, 'Fixed-Effect', '#4E6EDB');
  const reDiamond = diamond(ciRE[0], ciRE[1], pooledRE, yRE, 'Random-Effects', '#E07B2C');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Forest plot of individual studies and pooled fixed/random-effects estimates">
  <line x1="${zeroX}" y1="${PT - 4}" x2="${zeroX}" y2="${baseline}" stroke="#1A1A2E" stroke-width="1" stroke-dasharray="3,3" opacity=".5"/>
  <text x="${zeroX}" y="${(PT - 6).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${isRatio ? 'RR/OR = 1' : 'null = 0'}</text>
  ${rows}
  <line x1="${PL}" y1="${(PT + k * rowH).toFixed(1)}" x2="${W - PR}" y2="${(PT + k * rowH).toFixed(1)}" stroke="#7B8099" stroke-width="1.5"/>
  ${feDiamond}
  ${reDiamond}
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
</svg>`;
}

// Forest plot for 'network-meta-analysis': every non-reference
// treatment's random-effects estimate versus the network's chosen
// reference treatment (no pooled diamonds here — each row already
// IS a model-implied pooled estimate, borrowing both direct and
// indirect evidence from the whole network).
function networkForestSVG(items, isRatio, referenceLabel) {
  const k = items.length;
  const rowH = 24;
  const W = 560;
  const PL = 130, PR = 20, PT = 26, PB = 26;
  const plotW = W - PL - PR;
  const H = PT + k * rowH + PB;
  const baseline = H - PB;

  const cis = items.map(s => [s.effect - 1.96 * s.se, s.effect + 1.96 * s.se]);
  const allVals = [...cis.flat(), 0];
  let lo = Math.min(...allVals), hi = Math.max(...allVals);
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad; hi += pad;

  const toX = v => PL + ((v - lo) / (hi - lo)) * plotW;
  const zeroX = toX(0).toFixed(1);

  const rows = items.map((s, i) => {
    const y = PT + i * rowH + rowH / 2;
    const [ciLo, ciHi] = cis[i];
    const x1 = toX(ciLo).toFixed(1), x2 = toX(ciHi).toFixed(1), xc = toX(s.effect).toFixed(1);
    return `
      <text x="${PL - 10}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="9.5" fill="#4A4E6B">${esc(s.label)}</text>
      <line x1="${x1}" y1="${y.toFixed(1)}" x2="${x2}" y2="${y.toFixed(1)}" stroke="#4E6EDB" stroke-width="1.5"/>
      <rect x="${(+xc - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="8" height="8" fill="#4E6EDB"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Forest plot of each treatment's random-effects estimate versus the reference treatment">
  <text x="${PL}" y="14" font-family="'IBM Plex Mono',monospace" font-size="9.5" fill="#7B8099">Reference: ${esc(referenceLabel)}</text>
  <line x1="${zeroX}" y1="${PT - 4}" x2="${zeroX}" y2="${baseline}" stroke="#1A1A2E" stroke-width="1" stroke-dasharray="3,3" opacity=".5"/>
  <text x="${zeroX}" y="${(PT - 6).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${isRatio ? 'RR/OR = 1' : 'null = 0'}</text>
  ${rows}
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
</svg>`;
}

// Truncates a display label to `max` characters (ellipsis on
// overflow) for space-constrained SVG text — league-table headers
// and network-graph nodes, where a long custom treatment name would
// otherwise overflow its cell or overlap neighboring labels.
function truncateLabel(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// League table for 'network-meta-analysis': an n×n grid over every
// treatment in the network. Diagonal cells name the treatment (the
// reference highlighted); each upper-triangle cell (row i, column j,
// i<j) shows the random-effects estimate of column j versus row i —
// point estimate above, 95% CI below — built from the SAME
// covariance matrix as the reference-anchored forest plot, so it's
// consistent with it by construction. Lower triangle is left blank
// rather than mirrored, matching how published NMA league tables
// are usually presented. `nameFor(t)` supplies each treatment's
// display name (falls back to "Treatment N" when the caller hasn't
// collected custom names).
function networkLeagueTableSVG(fit, isRatio, nameFor) {
  const { treatments, referenceTreatment, betaOfRE, varOfRE, covOfRE } = fit;
  const n = treatments.length;
  const cell = 96, headSpace = 46;
  const W = headSpace + n * cell, H = headSpace + n * cell;
  const Z = 1.96;
  const transform = v => isRatio ? Math.exp(v) : v;
  const fmt = v => +v.toFixed(2);
  const label = t => truncateLabel(nameFor(t), 10);

  let out = '';
  treatments.forEach((tj, j) => {
    const x = headSpace + j * cell + cell / 2;
    out += `<text x="${x}" y="${headSpace - 14}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="10.5" font-weight="600" fill="#1A1A2E">${esc(label(tj))}</text>`;
  });

  treatments.forEach((ti, i) => {
    const y = headSpace + i * cell;
    const yc = y + cell / 2;
    out += `<text x="${headSpace - 10}" y="${(yc + 4).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="10.5" font-weight="600" fill="#1A1A2E">${esc(label(ti))}</text>`;

    treatments.forEach((tj, j) => {
      const x = headSpace + j * cell;
      if (i === j) {
        const isRef = ti === referenceTreatment;
        out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${isRef ? '#4E6EDB' : '#EDEFF7'}"/>
          <text x="${(x + cell / 2).toFixed(1)}" y="${(yc + 4).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="11" font-weight="700" fill="${isRef ? '#fff' : '#1A1A2E'}">${esc(label(ti))}</text>`;
      } else if (i < j) {
        const diff = betaOfRE(tj) - betaOfRE(ti);
        const variance = Math.max(varOfRE(ti) + varOfRE(tj) - 2 * covOfRE(ti, tj), 0);
        const se = Math.sqrt(variance);
        const pt = fmt(transform(diff)), ciLo = fmt(transform(diff - Z * se)), ciHi = fmt(transform(diff + Z * se));
        out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#fff" stroke="#E4E7F0"/>
          <text x="${(x + cell / 2).toFixed(1)}" y="${(yc - 3).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="11" font-weight="600" fill="#1A1A2E">${pt}</text>
          <text x="${(x + cell / 2).toFixed(1)}" y="${(yc + 13).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">(${ciLo}, ${ciHi})</text>`;
      } else {
        out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#F7F8FC"/>`;
      }
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="League table of every pairwise treatment comparison">
  ${out}
  <rect x="${headSpace + 0.5}" y="${headSpace + 0.5}" width="${n * cell - 1}" height="${n * cell - 1}" fill="none" stroke="#CDD2E0"/>
</svg>`;
}

// Network diagram ("the web") for 'network-meta-analysis': every
// treatment is a node on a circle (a standard layout for published
// NMA network plots, since it needs no iterative force simulation to
// look sensible), joined by an edge for every direct comparison —
// edge thickness scales with how many trials directly compare that
// pair, so repeatedly-tested comparisons visually stand out from
// ones resting on a single trial. The reference treatment's node is
// filled solid to make it identifiable at a glance, matching the
// league table's convention. Label anchoring flips (start/middle/
// end) based on which side of the circle a node falls on, so labels
// grow outward away from the circle instead of overlapping it.
function networkGraphSVG(treatments, comparisons, referenceTreatment, nameFor) {
  const n = treatments.length;
  const W = 480, H = 460;
  const cx = W / 2, cy = H / 2;
  const R = 145, labelR = R + 28;

  const pos = new Map();
  treatments.forEach((t, i) => {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / n);
    pos.set(t, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), angle });
  });

  const edgeCounts = new Map();
  comparisons.forEach(c => {
    const key = [c.t1, c.t2].sort((a, b) => a - b).join('-');
    edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
  });

  const edges = [...edgeCounts.entries()].map(([key, count]) => {
    const [a, b] = key.split('-').map(Number);
    const pa = pos.get(a), pb = pos.get(b);
    const width = Math.min(1.5 + 1.25 * (count - 1), 6);
    return `<line x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}" stroke="#B7BEDA" stroke-width="${width}"/>`;
  }).join('');

  const nodes = treatments.map(t => {
    const p = pos.get(t);
    const isRef = t === referenceTreatment;
    const lx = cx + labelR * Math.cos(p.angle), ly = cy + labelR * Math.sin(p.angle);
    const cosA = Math.cos(p.angle);
    const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle';
    const label = truncateLabel(nameFor(t), 16) + (isRef ? ' (ref)' : '');
    return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="13" fill="${isRef ? '#4E6EDB' : '#EDEFF7'}" stroke="${isRef ? '#4E6EDB' : '#8891B8'}" stroke-width="1.5"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="10" font-weight="700" fill="${isRef ? '#fff' : '#1A1A2E'}">${t}</text>
      <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-family="'IBM Plex Mono',monospace" font-size="11" font-weight="600" fill="#1A1A2E">${esc(label)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Network diagram showing each treatment as a node and each direct trial comparison as an edge between them">
  ${edges}
  ${nodes}
</svg>`;
}

// ROC curve for 'roc-auc': staircase of (FPR, TPR) points from
// sweeping thresholds, a shaded area under the curve, and the
// diagonal no-discrimination reference line. Square aspect ratio
// (unlike the site's other ~560×190 plots) since FPR/TPR need equal
// scaling to be visually meaningful.
function rocCurveSVG(points, auc) {
  const S = 400;
  const PL = 40, PR = 14, PT = 14, PB = 34;
  const plotW = S - PL - PR, plotH = S - PT - PB;
  const toX = fpr => PL + fpr * plotW;
  const toY = tpr => PT + plotH - tpr * plotH;

  const pathPts = points.map(([x, y]) => `${toX(x).toFixed(1)},${toY(y).toFixed(1)}`).join(' ');
  const areaPts = `${toX(0).toFixed(1)},${toY(0).toFixed(1)} ${pathPts} ${toX(1).toFixed(1)},${toY(0).toFixed(1)}`;

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const xTicks = ticks.map(t => `
    <line x1="${toX(t).toFixed(1)}" y1="${(PT + plotH).toFixed(1)}" x2="${toX(t).toFixed(1)}" y2="${(PT + plotH + 4).toFixed(1)}" stroke="#CDD2E0" stroke-width="1"/>
    <text x="${toX(t).toFixed(1)}" y="${(PT + plotH + 16).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#7B8099">${t.toFixed(1)}</text>`).join('');
  const yTicks = ticks.map(t => `
    <line x1="${(PL - 4).toFixed(1)}" y1="${toY(t).toFixed(1)}" x2="${PL}" y2="${toY(t).toFixed(1)}" stroke="#CDD2E0" stroke-width="1"/>
    <text x="${(PL - 8).toFixed(1)}" y="${(toY(t) + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="9" fill="#7B8099">${t.toFixed(1)}</text>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" style="width:100%;height:auto;display:block;max-width:400px;margin:0 auto;" aria-label="ROC curve, AUC = ${(+auc.toFixed(3))}">
  <rect x="${PL}" y="${PT}" width="${plotW}" height="${plotH}" fill="none" stroke="#CDD2E0" stroke-width="1"/>
  <line x1="${toX(0).toFixed(1)}" y1="${toY(0).toFixed(1)}" x2="${toX(1).toFixed(1)}" y2="${toY(1).toFixed(1)}" stroke="#CDD2E0" stroke-width="1.5" stroke-dasharray="4,3"/>
  <polygon points="${areaPts}" fill="#4E6EDB" opacity=".15"/>
  <polyline points="${pathPts}" fill="none" stroke="#4E6EDB" stroke-width="2.5" stroke-linejoin="round"/>
  ${xTicks}
  ${yTicks}
  <text x="${(PL + plotW / 2).toFixed(1)}" y="${S - 4}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9.5" fill="#7B8099">False Positive Rate (1 − Sp)</text>
  <text x="12" y="${(PT + plotH / 2).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="9.5" fill="#7B8099" transform="rotate(-90 12 ${(PT + plotH / 2).toFixed(1)})">True Positive Rate (Se)</text>
  <text x="${(PL + plotW - 8).toFixed(1)}" y="${(PT + 16).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="11" font-weight="600" fill="#1A1A2E">AUC = ${(+auc.toFixed(3))}</text>
</svg>`;
}

/* ── BLAND-ALTMAN & EQUIVALENCE-TEST HELPERS ─────────────────────────────── */

// Mean-difference (Bland-Altman) scatter: each point is one subject's
// (mean of the two methods, difference between the two methods), with
// horizontal lines for the mean bias (solid) and the two 95% limits
// of agreement (dashed amber).
function blandAltmanPlotSVG(points, meanDiff, loaLo, loaHi) {
  const W = 560, H = 260;
  const PL = 44, PR = 16, PT = 16, PB = 34;
  const plotW = W - PL - PR, plotH = H - PT - PB;

  const xs = points.map(p => p.mean);
  const ys = [...points.map(p => p.diff), loaLo, loaHi, meanDiff];

  let xMin = Math.min(...xs), xMax = Math.max(...xs);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xPad = (xMax - xMin) * 0.1 || 1, yPad = (yMax - yMin) * 0.15 || 1;
  xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;

  const toX = v => PL + ((v - xMin) / (xMax - xMin)) * plotW;
  const toY = v => PT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const dots = points.map(p =>
    `<circle cx="${toX(p.mean).toFixed(1)}" cy="${toY(p.diff).toFixed(1)}" r="3.5" fill="#4E6EDB" opacity=".75"/>`
  ).join('');

  const hLine = (v, color, dash) =>
    `<line x1="${PL}" y1="${toY(v).toFixed(1)}" x2="${W - PR}" y2="${toY(v).toFixed(1)}" stroke="${color}" stroke-width="1.5"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

  const labelFor = (v, text) =>
    `<text x="${W - PR - 4}" y="${(toY(v) - 4).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">${text}</text>`;

  const gridSteps = 4;
  const gridY = Array.from({ length: gridSteps + 1 }, (_, i) => yMin + (i / gridSteps) * (yMax - yMin)).map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#EEF1F7" stroke-width="1"/>
      <text x="${PL - 6}" y="${(+y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${v.toFixed(1)}</text>`;
  }).join('');

  const xTickCount = 5;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => xMin + (i / xTickCount) * (xMax - xMin)).map(v => {
    const x = toX(v).toFixed(1);
    return `<text x="${x}" y="${H - 10}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${v.toFixed(0)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Bland-Altman mean-difference plot">
  ${gridY}
  ${hLine(loaLo, '#E07B2C', '5,3')}
  ${hLine(loaHi, '#E07B2C', '5,3')}
  ${hLine(meanDiff, '#1A1A2E', null)}
  ${dots}
  ${labelFor(meanDiff, 'Mean')}
  ${labelFor(loaHi, '+1.96 SD')}
  ${labelFor(loaLo, '−1.96 SD')}
  ${xTicks}
  <text x="${(PL + plotW / 2).toFixed(1)}" y="${H - 1}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">mean of the two measurements</text>
  <text x="12" y="${(PT + plotH / 2).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099" transform="rotate(-90 12 ${(PT + plotH / 2).toFixed(1)})">difference (A − B)</text>
</svg>`;
}

// Equivalence/non-inferiority zone plot: shades the acceptable margin
// [marginLo, marginHi] (marginHi = null shades from marginLo to the
// right edge, for one-sided non-inferiority), and draws the point
// estimate with its confidence interval as a dot-and-whisker — visual
// counterpart to the TOST decision rule ("does the CI fit the zone?").
function equivalenceZoneSVG(diff, ciLo, ciHi, marginLo, marginHi) {
  const W = 560, H = 140;
  const PL = 20, PR = 20, PT = 30, PB = 30;
  const plotW = W - PL - PR;
  const midY = PT + (H - PT - PB) / 2;

  const allVals = [diff, ciLo, ciHi, marginLo, marginHi == null ? diff : marginHi, 0].filter(v => v != null && isFinite(v));
  let lo = Math.min(...allVals), hi = Math.max(...allVals);
  const pad = (hi - lo) * 0.25 || 1;
  lo -= pad; hi += pad;

  const toX = v => PL + ((v - lo) / (hi - lo)) * plotW;

  const zoneX1 = toX(marginLo);
  const zoneX2 = marginHi == null ? (W - PR) : toX(marginHi);

  const zone = `<rect x="${zoneX1.toFixed(1)}" y="${PT}" width="${(zoneX2 - zoneX1).toFixed(1)}" height="${H - PT - PB}" fill="#4E6EDB" opacity=".08"/>`;
  const marginLoLine = `<line x1="${zoneX1.toFixed(1)}" y1="${PT}" x2="${zoneX1.toFixed(1)}" y2="${H - PB}" stroke="#4E6EDB" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  const marginHiLine = marginHi != null
    ? `<line x1="${zoneX2.toFixed(1)}" y1="${PT}" x2="${zoneX2.toFixed(1)}" y2="${H - PB}" stroke="#4E6EDB" stroke-width="1.5" stroke-dasharray="4,3"/>`
    : '';

  const zeroX = toX(0).toFixed(1);
  const zeroLine = `<line x1="${zeroX}" y1="${PT}" x2="${zeroX}" y2="${H - PB}" stroke="#CDD2E0" stroke-width="1"/>`;
  const axisLine = `<line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#CDD2E0" stroke-width="1.5"/>`;

  const ciX1 = toX(ciLo).toFixed(1), ciX2 = toX(ciHi).toFixed(1), ptX = toX(diff).toFixed(1);
  const ciLine = `<line x1="${ciX1}" y1="${midY}" x2="${ciX2}" y2="${midY}" stroke="#1A1A2E" stroke-width="2"/>`;
  const point = `<circle cx="${ptX}" cy="${midY}" r="5" fill="#E07B2C" stroke="#1A1A2E" stroke-width="1"/>`;

  const labelMarginLo = `<text x="${zoneX1.toFixed(1)}" y="${PT - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#4E6EDB">−Δ</text>`;
  const labelMarginHi = marginHi != null
    ? `<text x="${zoneX2.toFixed(1)}" y="${PT - 8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#4E6EDB">+Δ</text>`
    : '';
  const label0 = `<text x="${zeroX}" y="${H - PB + 14}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">0</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Equivalence or non-inferiority zone plot">
  ${zone}
  ${axisLine}
  ${zeroLine}
  ${marginLoLine}
  ${marginHiLine}
  ${ciLine}
  ${point}
  ${labelMarginLo}
  ${labelMarginHi}
  ${label0}
</svg>`;
}

/* ── MATRIX HELPERS ────────────────────────────────────────────────────────
   Small generic matrix operations for 'Multiple Linear Regression',
   which solves the OLS normal equations β̂ = (X'X)⁻¹X'y directly —
   no closed form exists for 2+ predictors, unlike the single-
   predictor case in 'Simple Linear Regression'.                     */

function matrixMultiply(A, B) {
  const rowsA = A.length, colsA = A[0].length, colsB = B[0].length;
  const result = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let m = 0; m < colsA; m++) sum += A[i][m] * B[m][j];
      result[i][j] = sum;
    }
  }
  return result;
}

function matrixTranspose(A) {
  const rows = A.length, cols = A[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) result[j][i] = A[i][j];
  return result;
}

// Gauss-Jordan elimination with partial pivoting. Returns null for a
// singular matrix (perfectly collinear predictors) rather than
// throwing, so callers can surface a plain-English error instead.
function matrixInverse(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(M[pivotRow][col]) < 1e-10) return null;
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const pivot = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= factor * M[col][j];
    }
  }

  return M.map(row => row.slice(n));
}

// Maps a base symbol + number to its Unicode-subscript label (e.g.
// subscriptLabel('β', 1) → 'β₁') for dynamically-labeled regression
// coefficients, since the number of predictors isn't known until the
// pasted data is parsed.
const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
function subscriptLabel(base, n) {
  return base + String(n).split('').map(d => SUBSCRIPT_DIGITS[+d]).join('');
}

/* ── SURVIVAL ANALYSIS HELPERS ────────────────────────────────────────────
   Shared by 'Kaplan-Meier Survival Curve' and 'Log-Rank Test'.        */

// Product-limit (Kaplan-Meier) estimate of the survival function from
// {time, event} records (event=1 for an event, 0 for right-censored).
// Returns the step points (time, survival probability immediately
// after that time — always starting from (0, 1)), the per-distinct-
// time risk-set/event/censoring bookkeeping, every censored time (for
// drawing tick marks), and the median survival time (or null if the
// curve never drops to ≤ 0.5 within the observed follow-up).
function kaplanMeierEstimate(records) {
  const sorted = records.slice().sort((a, b) => a.time - b.time);
  const n0 = sorted.length;
  const distinctTimes = [...new Set(sorted.map(r => r.time))].sort((a, b) => a - b);

  let atRisk = n0;
  let survival = 1;
  const steps = [{ time: 0, survival: 1 }];
  const table = [];
  const censoredTimes = sorted.filter(r => r.event === 0).map(r => r.time);

  for (const t of distinctTimes) {
    const atThisTime = sorted.filter(r => r.time === t);
    const deaths = atThisTime.filter(r => r.event === 1).length;
    const censoredHere = atThisTime.length - deaths;

    if (deaths > 0) {
      survival *= 1 - deaths / atRisk;
      steps.push({ time: t, survival });
    }
    table.push({ time: t, atRisk, deaths, censored: censoredHere, survival });
    atRisk -= atThisTime.length;
  }

  let median = null;
  for (const s of steps) {
    if (s.survival <= 0.5) { median = s.time; break; }
  }

  return { n: n0, steps, table, censoredTimes, median };
}

// Standard log-rank (Mantel-Cox) test comparing two groups' survival
// distributions: at every distinct time in the COMBINED data (not
// just event times, since censoring between events still shrinks the
// risk sets), accumulates the observed/expected events and variance
// contribution for Group 1 whenever an event occurs in either group.
function logRankTest(group1, group2) {
  const combined = [
    ...group1.map(r => ({ ...r, g: 1 })),
    ...group2.map(r => ({ ...r, g: 2 })),
  ];
  const allTimes = [...new Set(combined.map(r => r.time))].sort((a, b) => a - b);

  let atRisk1 = group1.length, atRisk2 = group2.length;
  let O1 = 0, E1 = 0, V = 0;

  for (const t of allTimes) {
    const atT = combined.filter(r => r.time === t);
    const d1 = atT.filter(r => r.g === 1 && r.event === 1).length;
    const d2 = atT.filter(r => r.g === 2 && r.event === 1).length;
    const d  = d1 + d2;
    const n1 = atRisk1, n2 = atRisk2, n = n1 + n2;

    if (d > 0 && n > 1) {
      O1 += d1;
      E1 += d * (n1 / n);
      V  += (d * (n - d) * n1 * n2) / (n * n * (n - 1));
    }

    atRisk1 -= atT.filter(r => r.g === 1).length;
    atRisk2 -= atT.filter(r => r.g === 2).length;
  }

  const chi2 = V > 0 ? (O1 - E1) ** 2 / V : 0;
  return { O1, E1, V, chi2, n1: group1.length, n2: group2.length };
}

// Renders a single Kaplan-Meier step curve (from kaplanMeierEstimate())
// with censoring tick marks at each censored observation.
function kaplanMeierCurveSVG(km) {
  const { steps, censoredTimes } = km;
  const W = 560, H = 220;
  const PL = 40, PR = 16, PT = 16, PB = 34;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const baseline = PT + plotH;

  const maxTime = Math.max(...steps.map(s => s.time), ...censoredTimes, 1);
  const toX = t => PL + (t / maxTime) * plotW;
  const toY = s => PT + (1 - s) * plotH;

  const stepPolyline = () => {
    const pts = [`${toX(0)},${toY(1)}`];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1], cur = steps[i];
      pts.push(`${toX(cur.time).toFixed(1)},${toY(prev.survival).toFixed(1)}`);
      pts.push(`${toX(cur.time).toFixed(1)},${toY(cur.survival).toFixed(1)}`);
    }
    const last = steps[steps.length - 1];
    pts.push(`${toX(maxTime).toFixed(1)},${toY(last.survival).toFixed(1)}`);
    return pts.join(' ');
  };

  const survivalAt = t => {
    let s = 1;
    for (const step of steps) { if (step.time <= t) s = step.survival; else break; }
    return s;
  };
  const ticks = censoredTimes.map(t => {
    const x = toX(t).toFixed(1), y = toY(survivalAt(t)).toFixed(1);
    return `<line x1="${x}" y1="${(+y - 5).toFixed(1)}" x2="${x}" y2="${(+y + 5).toFixed(1)}" stroke="#E07B2C" stroke-width="1.5"/>`;
  }).join('');

  const gridY = [0, 0.25, 0.5, 0.75, 1.0].map(s => {
    const y = toY(s).toFixed(1);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#EEF1F7" stroke-width="1"/>
      <text x="${PL - 6}" y="${(+y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${s.toFixed(2)}</text>`;
  }).join('');

  const xTickCount = 5;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const t = (i / xTickCount) * maxTime;
    const x = toX(t).toFixed(1);
    return `<text x="${x}" y="${H - 10}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${t.toFixed(0)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Kaplan-Meier survival curve">
  ${gridY}
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  <polyline points="${stepPolyline()}" fill="none" stroke="#4E6EDB" stroke-width="2.2"/>
  ${ticks}
  ${xTicks}
  <text x="${(PL + plotW / 2).toFixed(1)}" y="${H - 1}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">time</text>
</svg>`;
}

// Renders two overlaid Kaplan-Meier curves (for 'Log-Rank Test') with
// a shared axis, censoring ticks per group, and a legend — the visual
// counterpart to the log-rank significance test.
function kaplanMeierTwoGroupSVG(km1, km2, label1, label2) {
  const W = 560, H = 220;
  const PL = 40, PR = 16, PT = 26, PB = 34;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const baseline = PT + plotH;

  const maxTime = Math.max(
    ...km1.steps.map(s => s.time), ...km1.censoredTimes,
    ...km2.steps.map(s => s.time), ...km2.censoredTimes, 1
  );
  const toX = t => PL + (t / maxTime) * plotW;
  const toY = s => PT + (1 - s) * plotH;

  const stepPolyline = km => {
    const pts = [`${toX(0)},${toY(1)}`];
    for (let i = 1; i < km.steps.length; i++) {
      const prev = km.steps[i - 1], cur = km.steps[i];
      pts.push(`${toX(cur.time).toFixed(1)},${toY(prev.survival).toFixed(1)}`);
      pts.push(`${toX(cur.time).toFixed(1)},${toY(cur.survival).toFixed(1)}`);
    }
    const last = km.steps[km.steps.length - 1];
    pts.push(`${toX(maxTime).toFixed(1)},${toY(last.survival).toFixed(1)}`);
    return pts.join(' ');
  };

  const survivalAt = (km, t) => {
    let s = 1;
    for (const step of km.steps) { if (step.time <= t) s = step.survival; else break; }
    return s;
  };
  const ticksFor = (km, color) => km.censoredTimes.map(t => {
    const x = toX(t).toFixed(1), y = toY(survivalAt(km, t)).toFixed(1);
    return `<line x1="${x}" y1="${(+y - 4).toFixed(1)}" x2="${x}" y2="${(+y + 4).toFixed(1)}" stroke="${color}" stroke-width="1.3"/>`;
  }).join('');

  const gridY = [0, 0.25, 0.5, 0.75, 1.0].map(s => {
    const y = toY(s).toFixed(1);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#EEF1F7" stroke-width="1"/>
      <text x="${PL - 6}" y="${(+y + 3).toFixed(1)}" text-anchor="end" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${s.toFixed(2)}</text>`;
  }).join('');

  const xTickCount = 5;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const t = (i / xTickCount) * maxTime;
    const x = toX(t).toFixed(1);
    return `<text x="${x}" y="${H - 10}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">${t.toFixed(0)}</text>`;
  }).join('');

  const legend = `
    <line x1="${W - PR - 150}" y1="${PT - 14}" x2="${W - PR - 134}" y2="${PT - 14}" stroke="#4E6EDB" stroke-width="2.2"/>
    <text x="${W - PR - 130}" y="${(PT - 11).toFixed(1)}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">${label1}</text>
    <line x1="${W - PR - 60}" y1="${PT - 14}" x2="${W - PR - 44}" y2="${PT - 14}" stroke="#E07B2C" stroke-width="2.2"/>
    <text x="${W - PR - 40}" y="${(PT - 11).toFixed(1)}" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="#7B8099">${label2}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" aria-label="Kaplan-Meier survival curves for two groups">
  ${gridY}
  <line x1="${PL}" y1="${baseline}" x2="${W - PR}" y2="${baseline}" stroke="#CDD2E0" stroke-width="1.5"/>
  <polyline points="${stepPolyline(km1)}" fill="none" stroke="#4E6EDB" stroke-width="2.2"/>
  <polyline points="${stepPolyline(km2)}" fill="none" stroke="#E07B2C" stroke-width="2.2"/>
  ${ticksFor(km1, '#4E6EDB')}
  ${ticksFor(km2, '#E07B2C')}
  ${legend}
  ${xTicks}
  <text x="${(PL + plotW / 2).toFixed(1)}" y="${H - 1}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="8" fill="#7B8099">time</text>
</svg>`;
}

/* ── FULL CALCULATOR INDEX ───────────────────────────────────────────────
   status: 'available' — fully implemented (id matches CALCULATORS entry)
   status: 'planned'   — coming soon                                      */

const CALCULATOR_INDEX = [

  // ── 1. DESCRIPTIVE STATISTICS ────────────────────────────────────────
  { id: 'variance-sd',          name: 'Variance & Standard Deviation',   category: 'Descriptive Statistics',      description: 'Calculates variance and standard deviation for a sample or population.',                         status: 'available' },
  { id: 'sd-visualized',        name: 'Standard Deviation — Calculated & Visualized', category: 'Descriptive Statistics', description: 'Computes sample and population SD and variance from raw data, then plots values on a normal distribution curve.', status: 'available' },
  { id: 'standard-error',       name: 'Standard Error of the Mean',       category: 'Descriptive Statistics',      description: 'Computes the standard error of the mean from SD and sample size.',                            status: 'available' },
  { id: 'se-proportion',        name: 'Standard Error of a Proportion',  category: 'Descriptive Statistics',      description: 'Computes the standard error of a single sample proportion from p and n.',                     status: 'available' },
  { id: 'variance-sd-sem-graph',name: 'Variance, Standard Deviation & Standard Error of the Mean — Graph', category: 'Descriptive Statistics', description: 'Plots variance, standard deviation, and standard error of the mean together.',                 status: 'available' },
  { id: 'revman-sd',            name: 'RevMan — Finding SD',             category: 'Descriptive Statistics',      description: 'Derives standard deviations from confidence intervals or standard errors for meta-analysis.',  status: 'available' },
  { id: 'combine-groups',       name: 'Combining Groups (Mean, SD & N)', category: 'Descriptive Statistics',  description: 'Combines 2 to 4 separately reported subgroups (e.g., age bands, sites, or sexes) into one overall mean, SD, and N, as if the raw data itself had been pooled.', status: 'available' },

  // ── 2. PROBABILITY & DISTRIBUTIONS ───────────────────────────────────
  { id: 'z-table',              name: 'z-Distribution Table',            category: 'Probability & Distributions', description: 'Looks up cumulative probabilities and critical values for the standard normal distribution.',    status: 'available' },
  { id: 't-table',              name: 't-Distribution Table',            category: 'Probability & Distributions', description: 'Returns critical t-values for one- and two-tailed tests at any df and alpha.',                status: 'available' },
  { id: 'binomial-probability', name: 'Binomial Probability Calculator', category: 'Probability & Distributions', description: 'Computes exact and cumulative binomial probabilities for given n, k, and p.',                 status: 'available' },
  { id: 'poisson-negbinom',     name: 'Poisson & Negative Binomial',     category: 'Probability & Distributions', description: 'Calculates Poisson and negative binomial probabilities and cumulative distributions.',         status: 'available' },
  { id: 'inverse-probability',  name: 'Inverse Probability',             category: 'Probability & Distributions', description: 'Finds the smallest count k such that the binomial cumulative probability P(X ≤ k) meets or exceeds a target probability, given n and p (the BINOM.INV equivalent).',  status: 'available' },
  { id: 'critical-value-t',     name: 'Critical Value & p-Value (t)',    category: 'Probability & Distributions', description: 'Returns the critical t-value, two-tailed p-value, and implied standard error for a given t statistic and degrees of freedom.', status: 'available' },
  { id: 'critical-value-z',     name: 'Critical Value & p-Value (z)',    category: 'Probability & Distributions', description: 'Returns the critical z-value, two-tailed p-value, and implied standard error for a given z statistic.', status: 'available' },

  // ── 3. T-TESTS & Z-TESTS ─────────────────────────────────────────────
  { id: 'one-sample-t-test',    name: '1-Sample t-Test',                 category: 'T-Tests & Z-Tests',           description: 'Tests whether a sample mean differs from a known population mean.',                           status: 'available' },
  { id: 'unpaired-t-test',      name: "Unpaired t-Test (Welch's)",       category: 'T-Tests & Z-Tests',           description: 'Compares means of two independent groups without assuming equal variances.',                   status: 'available' },
  { id: 'equivalence-test',     name: 'Equivalence / Non-Inferiority Test (TOST)', category: 'T-Tests & Z-Tests',  description: 'Tests whether the difference between two independent group means is small enough to be considered equivalent (or non-inferior) to a pre-specified margin, using the two one-sided tests (TOST) procedure.', status: 'available' },
  { id: 'paired-t-test',        name: 'Paired t-Test',                   category: 'T-Tests & Z-Tests',           description: 'Tests the mean difference between paired or matched observations.',                           status: 'available' },
  { id: 'se-mean-diff',         name: 'Standard Error of a Mean Difference', category: 'T-Tests & Z-Tests',       description: 'Computes the standard error of the difference between two independent sample means, using pooled and Welch (unequal-variance) methods.', status: 'available' },
  { id: 'one-sample-z-test',    name: '1-Sample z-Test',                 category: 'T-Tests & Z-Tests',           description: 'Tests a sample mean against a population mean when σ is known.',                             status: 'available' },
  { id: 'two-sample-z-test',    name: 'Two-Sample z-Test (Means)',       category: 'T-Tests & Z-Tests',           description: 'Tests whether two independent population means differ, when both population standard deviations are known.', status: 'available' },
  { id: 'z-test-prop-1samp',    name: 'z-Test Proportions (1-Sample)',   category: 'T-Tests & Z-Tests',           description: 'Tests whether an observed proportion differs from a hypothesised value.',                     status: 'available' },
  { id: 'z-test-prop-2samp',    name: 'z-Test Proportions (2-Sample)',   category: 'T-Tests & Z-Tests',           description: 'Tests whether two independent proportions are equal.',                                        status: 'available' },
  { id: 'binomial-hyp-test',    name: 'Binomial Hypothesis Test',        category: 'T-Tests & Z-Tests',           description: 'Exact binomial test for a proportion against a null hypothesis, with graph.',                 status: 'available' },
  { id: 'single-sample-ci',     name: 'Confidence Interval for a Mean', category: 'T-Tests & Z-Tests',             description: 'Computes a t-based confidence interval for a single sample mean, at any confidence level.',   status: 'available' },
  { id: 'confidence-interval-proportion', name: 'Confidence Interval for a Proportion', category: 'T-Tests & Z-Tests', description: 'Computes a z-based (Wald) confidence interval for a single sample proportion, at any confidence level.', status: 'available' },

  // ── 4. CHI-SQUARE & CATEGORICAL ──────────────────────────────────────
  { id: 'chi-square-2x2',       name: 'Chi-Square 2×2',                  category: 'Chi-Square & Categorical',    description: 'Chi-square test of independence for a 2×2 contingency table, plus RR, OR, and design-aware interpretation.', status: 'available' },
  { id: 'chi-square-gof',       name: 'Chi-Square Goodness-of-Fit',      category: 'Chi-Square & Categorical',    description: 'Tests whether observed frequencies match expected frequencies.',                               status: 'available' },
  { id: 'fishers-exact',        name: "Fisher's Exact Test",             category: 'Chi-Square & Categorical',    description: 'Exact test of association for small-sample 2×2 tables.',                                     status: 'available' },
  { id: 'mcnemars-test',        name: "McNemar's Test",                  category: 'Chi-Square & Categorical',    description: 'Tests marginal homogeneity in paired nominal data (before/after or matched pairs).',           status: 'available' },
  { id: 'cochrans-q',           name: "Cochran's Q Test",                category: 'Chi-Square & Categorical',    description: 'Non-parametric test for differences among three or more matched proportions.',                status: 'available' },

  // ── 5. NON-PARAMETRIC TESTS ───────────────────────────────────────────
  { id: 'mann-whitney',         name: 'Mann-Whitney U Test',             category: 'Non-Parametric Tests',        description: 'Non-parametric test comparing two independent groups on ordinal or non-normal data.',          status: 'available' },
  { id: 'wilcoxon-signed-rank', name: 'Wilcoxon Signed-Rank Test',       category: 'Non-Parametric Tests',        description: 'Non-parametric alternative to the paired t-test for comparing two related samples.',           status: 'available' },
  { id: 'sign-test',            name: 'Sign Test',                       category: 'Non-Parametric Tests',        description: 'Tests the median of paired differences using only the signs of the differences.',              status: 'available' },
  { id: 'kruskal-wallis',       name: 'Kruskal-Wallis Test',             category: 'Non-Parametric Tests',        description: 'Non-parametric one-way ANOVA for comparing three or more independent groups.',                 status: 'available' },
  { id: 'dunns-test',           name: "Dunn's Test",                     category: 'Non-Parametric Tests',        description: 'Post-hoc pairwise comparisons following a significant Kruskal-Wallis test.',                  status: 'available' },
  { id: 'friedman-test',        name: 'Friedman Test',                   category: 'Non-Parametric Tests',        description: 'Non-parametric repeated measures test for comparing three or more related groups.',            status: 'available' },

  // ── 6. ANOVA ──────────────────────────────────────────────────────────
  { id: 'anova-1way',           name: '1-Way ANOVA',                     category: 'ANOVA',                       description: 'Tests for differences in means across three or more independent groups.',                     status: 'available' },
  { id: 'anova-2way',           name: '2-Way ANOVA with Replication',    category: 'ANOVA',                       description: 'Tests main effects and interaction for two factors with multiple observations per cell.',      status: 'available' },
  { id: 'anova-multifactor',    name: 'Multi-Factor ANOVA',              category: 'ANOVA',                       description: 'Extends one-way ANOVA to designs with more than two independent factors.',                    status: 'available' },
  { id: 'tukeys-hsd',           name: "Tukey's HSD Test",                category: 'ANOVA',                       description: 'Post-hoc pairwise comparisons controlling family-wise error rate after ANOVA.',               status: 'available' },
  { id: 'repeated-measures-anova', name: 'Repeated Measures ANOVA',      category: 'ANOVA',                       description: 'Analyzes data from designs where the same subjects are measured under multiple conditions.',   status: 'available' },

  // ── 7. CORRELATION & REGRESSION ──────────────────────────────────────
  { id: 'pearson-r',            name: "Pearson's Correlation",           category: 'Correlation & Regression',    description: "Measures the strength and direction of the linear relationship between two continuous variables.", status: 'available'  },
  { id: 'se-correlation',       name: 'Standard Error of a Correlation Coefficient', category: 'Correlation & Regression', description: 'Computes the standard error of a Pearson correlation coefficient from r and sample size, plus a Fisher z-based 95% CI.', status: 'available' },
  { id: 'spearman-rho',         name: "Spearman's Rank Correlation",     category: 'Correlation & Regression',    description: 'Non-parametric measure of monotonic association between two ranked variables.',                 status: 'available' },
  { id: 'kendalls-tau',         name: "Kendall's τ",                     category: 'Correlation & Regression',    description: 'Non-parametric correlation based on the number of concordant vs. discordant pairs.',            status: 'available' },
  { id: 'simple-regression',    name: 'Simple Linear Regression',        category: 'Correlation & Regression',    description: 'Fits a straight line to data and estimates slope, intercept, R², and significance.',            status: 'available' },
  { id: 'multiple-regression',  name: 'Multiple Linear Regression',      category: 'Correlation & Regression',    description: 'Fits a linear model with two or more predictors at once, estimating each coefficient, its standard error, R², adjusted R², and overall significance.', status: 'available' },
  { id: 'logistic-regression',  name: 'Logistic Regression (2×2)',       category: 'Correlation & Regression',    description: 'Estimates the log-odds and OR from a 2×2 table using logistic regression.',                     status: 'available' },
  { id: 'multivariable-predictor', name: 'Multivariable Outcome Predictor', category: 'Correlation & Regression', description: 'Computes a predicted outcome — or predicted probability — for a new individual from a linear or logistic equation you supply: an intercept plus a coefficient and a value for each predictor (e.g. diet, health behavior, medication use).', status: 'available' },

  // ── 8. EFFECT SIZES & AGREEMENT ──────────────────────────────────────
  { id: 'cohens-d',             name: "Cohen's d",                       category: 'Effect Sizes & Agreement',    description: "Quantifies the standardized difference between two group means using pooled standard deviation.", status: 'available' },
  { id: 'cramers-v',            name: "Cramer's V",                      category: 'Effect Sizes & Agreement',    description: 'Measures the strength of association in contingency tables larger than 2×2.',                   status: 'available' },
  { id: 'phi-coefficient',      name: 'Phi Coefficient (2×2)',           category: 'Effect Sizes & Agreement',    description: 'Measures the association between two binary variables in a 2×2 table.',                        status: 'available' },
  { id: 'cohens-kappa',         name: "Cohen's Kappa",                   category: 'Effect Sizes & Agreement',    description: 'Measures inter-rater agreement for categorical data, corrected for chance.',                    status: 'available' },
  { id: 'weighted-kappa',       name: 'Weighted Kappa',                  category: 'Effect Sizes & Agreement',    description: "Extends Cohen's kappa to ordinal ratings, weighting disagreements by their distance.",          status: 'available' },
  { id: 'icc',                  name: 'Intraclass Correlation (ICC)',     category: 'Effect Sizes & Agreement',    description: 'Assesses reliability and agreement for continuous measurements across raters or occasions.',     status: 'available' },
  { id: 'bland-altman',         name: 'Bland-Altman Limits of Agreement', category: 'Effect Sizes & Agreement',    description: 'Assesses agreement between two measurement methods from paired data, plotting the mean-difference (Bland-Altman) plot with limits of agreement.', status: 'available' },
  { id: 'eta-squared',          name: 'Eta-Squared',                     category: 'Effect Sizes & Agreement',    description: 'Effect size for ANOVA, expressing the proportion of total variance explained by a factor.',     status: 'available' },
  { id: 'cronbachs-alpha',      name: "Cronbach's Alpha",                category: 'Effect Sizes & Agreement',    description: 'Measures internal consistency reliability of a multi-item scale or questionnaire.',             status: 'available' },

  // ── 9. POWER & SAMPLE SIZE ────────────────────────────────────────────
  { id: 'power-calculations',   name: 'Power Calculations',              category: 'Power & Sample Size',         description: 'Computes statistical power for one- and two-tailed tests from delta, σ, n, and α.',           status: 'available' },
  { id: 'power-with-graph',     name: 'Power with Graph',                category: 'Power & Sample Size',         description: 'Visualises the overlap of H₀ and Hₐ distributions, shading alpha, beta, and power.',          status: 'available' },
  { id: 'power-vs-es-alpha',    name: 'Power vs Effect Size & Alpha',    category: 'Power & Sample Size',         description: 'Plots power as a function of effect size and significance level for a given sample size.',     status: 'available' },
  { id: 'posthoc-power',        name: 'Post-Hoc Power Calculation',      category: 'Power & Sample Size',         description: 'Estimates achieved power for a completed study given its observed effect size and n.',          status: 'available' },
  { id: 'sample-size-1mean',    name: 'Sample Size — 1-Sample Mean',     category: 'Power & Sample Size',         description: 'Determines the sample size needed to detect a specified difference from a hypothesised mean, given σ, alpha, and target power.', status: 'available' },
  { id: 'sample-size-2mean',    name: 'Sample Size — Difference of Two Means', category: 'Power & Sample Size',   description: 'Determines the per-group sample size needed to detect a specified difference between two independent means, given a common σ, alpha, and target power.', status: 'available' },
  { id: 'sample-size-1prop',    name: 'Sample Size — 1-Sample Proportion', category: 'Power & Sample Size',       description: 'Determines the sample size needed to detect a difference between a hypothesised proportion and an alternative, given alpha and target power.', status: 'available' },
  { id: 'sample-size-2prop',    name: 'Sample Size — Difference of Two Proportions', category: 'Power & Sample Size', description: 'Determines the per-group sample size needed to detect a difference between two independent proportions, given alpha and target power.', status: 'available' },
  { id: 'sample-size-survey',   name: 'Sample Size for a Survey',        category: 'Power & Sample Size',         description: 'Determines how many respondents are needed to estimate a population proportion within a target margin of error, with optional finite-population correction and response-rate adjustment.', status: 'available' },
  { id: 'power-ppv-fpp',        name: 'Power, Effect Size, PPV & FPP',   category: 'Power & Sample Size',         description: 'Links statistical power to positive predictive value and false positive probability.',          status: 'available' },
  { id: 'power-delta-alpha',    name: 'Power as a Function of δ & α',    category: 'Power & Sample Size',         description: 'Shows how power changes across a range of delta and alpha values simultaneously.',             status: 'available' },
  { id: 'type1-type2-errors',   name: 'Type I & Type II Error Explorer', category: 'Power & Sample Size',         description: 'An interactive decision matrix showing all four possible outcomes of a hypothesis test — two correct decisions and two errors — and how trading off α against power shifts the risk of each.', status: 'available' },

  // ── 10. EPIDEMIOLOGY & RISK ───────────────────────────────────────────
  { id: 'measures-of-association', name: 'Measures of Association',      category: 'Epidemiology & Risk',         description: 'Computes AR, ARD, RR, RRD, and OR with 95% CIs from a 2×2 exposure-outcome table.',           status: 'available' },
  { id: 'se-lnrr-lnor',            name: 'SE of ln(RR) & ln(OR) — 2×2 Table', category: 'Epidemiology & Risk',   description: 'Computes the standard error of a difference in proportions, ln(RR), and ln(OR) from a 2×2 table of exposure and outcome counts.', status: 'available' },
  { id: 'se-rate',                 name: 'Standard Error of a Rate',      category: 'Epidemiology & Risk',        description: 'Computes the standard error of an incidence rate from the number of events and total person-time.', status: 'available' },
  { id: 'se-rate-ratio',           name: 'Standard Error of a Rate Ratio', category: 'Epidemiology & Risk',       description: "Computes the standard error of ln(Rate Ratio) and a 95% CI from two groups' event counts and person-time.", status: 'available' },
  { id: 'or-to-nnt-nnh',           name: 'OR to NNT & NNH',             category: 'Epidemiology & Risk',         description: 'Converts an odds ratio and control event rate to NNT or NNH via absolute risk difference.',    status: 'available' },
  { id: 'or-to-rr',                name: 'Odds Ratio to Risk Ratio',     category: 'Epidemiology & Risk',         description: 'Converts an odds ratio to a risk ratio using the control event rate.',                         status: 'available' },
  { id: 'attributable-fraction',   name: 'Attributable Fraction (AFe & PAF)', category: 'Epidemiology & Risk',   description: 'Estimates the fraction of disease attributable to the exposure (exposed and population).',     status: 'available' },
  { id: 'par',                     name: 'Population Attributable Risk', category: 'Epidemiology & Risk',         description: 'Quantifies how much of the disease burden would be eliminated by removing the exposure.',      status: 'available' },
  { id: 'incidence-rate',          name: 'Incidence Rate & Rate Ratio',  category: 'Epidemiology & Risk',         description: 'Calculates incidence rates, rate ratio, and their confidence intervals from person-time data.', status: 'available' },
  { id: 'ipw-ate',                 name: 'IPW & ATE',                    category: 'Epidemiology & Risk',         description: 'Inverse probability weighting and average treatment effect for observational studies.',        status: 'available' },
  { id: 'assoc-pred-intervals',    name: 'Measures of Association — Prediction Intervals', category: 'Epidemiology & Risk', description: 'Extends OR and RR estimates with prediction intervals for future studies.',        status: 'available' },

  // ── 11. DIAGNOSTIC TESTING ────────────────────────────────────────────
  { id: 'sensitivity-specificity', name: 'Sensitivity, Specificity & LR', category: 'Diagnostic Testing',        description: 'Calculates sensitivity, specificity, and positive/negative likelihood ratios from a 2×2 table.', status: 'available'  },
  { id: 'diagnostic-accuracy',     name: 'Diagnostic Test Accuracy (2×2)', category: 'Diagnostic Testing',       description: 'Full diagnostic accuracy calculator: Se, Sp, PPV, NPV, LR+, LR−, and accuracy.',              status: 'available' },
  { id: 'post-test-probability',   name: 'Post-Test Probability',         category: 'Diagnostic Testing',         description: 'Updates pre-test probability to post-test probability using likelihood ratios.',               status: 'available' },
  { id: 'roc-auc',                 name: 'ROC Curve & AUC',              category: 'Diagnostic Testing',          description: 'Plots the receiver operating characteristic curve and computes the area under the curve.',     status: 'available' },
  { id: 'serial-parallel-testing', name: 'Serial & Parallel Testing',    category: 'Diagnostic Testing',          description: 'Models the combined performance of tests run in series or parallel.',                         status: 'available' },
  { id: 'ppv-npv-vs-prevalence',   name: 'PPV/NPV vs Prevalence',        category: 'Diagnostic Testing',          description: 'Shows how positive and negative predictive value change with disease prevalence, for a test with fixed sensitivity and specificity.', status: 'available' },

  // ── 12. BAYESIAN & META-ANALYSIS ─────────────────────────────────────
  { id: 'bayes-theorem',           name: "Bayes' Theorem",               category: 'Bayesian & Meta-Analysis',    description: 'Computes posterior probability from prior, likelihood, and marginal probability.',               status: 'available' },
  { id: 'bayesian-cri',            name: 'Bayesian Credible Intervals',  category: 'Bayesian & Meta-Analysis',    description: 'Derives Beta-posterior credible intervals for a proportion given prior and observed data.',      status: 'available' },
  { id: 'bayes-factor',            name: 'Bayes Factor',                 category: 'Bayesian & Meta-Analysis',    description: 'Quantifies the relative evidence for H₁ vs H₀ on a continuous scale.',                         status: 'available' },
  { id: 'meta-analysis',           name: 'Meta-Analysis (Q, τ², I², PI)', category: 'Bayesian & Meta-Analysis',  description: 'Pools effect sizes, tests heterogeneity, and computes prediction intervals.',                  status: 'available' },
  { id: 'network-meta-analysis',   name: 'Network Meta-Analysis (Indirect & Mixed Comparisons)', category: 'Bayesian & Meta-Analysis', description: 'Combines direct and indirect evidence across three or more named treatments into one connected network, producing a network diagram, a full league table, heterogeneity statistics, and a frequentist treatment ranking.', status: 'available' },

  // ── 13. SURVIVAL ANALYSIS ─────────────────────────────────────────────
  { id: 'kaplan-meier',            name: 'Kaplan-Meier Survival Curve',  category: 'Survival Analysis',           description: 'Estimates the probability of surviving past each time point from time-to-event data with censoring, plotting a step curve and reporting median survival time.', status: 'available' },
  { id: 'log-rank-test',           name: 'Log-Rank Test',                category: 'Survival Analysis',           description: 'Compares survival distributions between two groups using the log-rank test, from time-to-event data with censoring.', status: 'available' },

];

/* ── CALCULATOR-SELECTION WIZARD ──────────────────────────────────────────
   A decision tree for "which calculator do I need?", answered one
   question at a time. Every node is either:
     { question, options: [{ label, next }, ...] }  — an internal node, or
     { results: [{ id, why }, ...] }                 — a leaf (the first
                                                        entry is the
                                                        primary
                                                        recommendation,
                                                        the rest are
                                                        "also consider"
                                                        alternatives).
   Calculator names/descriptions are looked up live from CALCULATORS by
   id at render time (see app.js renderWizard()), so this stays in
   sync automatically if a calculator's name ever changes. Every leaf
   id below was checked against CALCULATOR_INDEX to exist, and every
   calculator on the site is reachable from at least one leaf.        */
const WIZARD_TREE = {

  start: {
    question: 'What are you trying to do?',
    options: [
      { label: 'Compare groups, or test for a relationship',                          next: 'compareGoal' },
      { label: 'Describe or summarize a single sample',                               next: 'descriptive' },
      { label: 'Look up a probability, critical value, or distribution table',        next: 'probRef' },
      { label: 'Measure agreement or reliability (raters, methods, or a scale)',      next: 'agreementGoal' },
      { label: "Evaluate a diagnostic test's performance",                            next: 'diagGoal' },
      { label: 'Quantify risk or association between an exposure and an outcome',     next: 'epiGoal' },
      { label: 'Plan a study — sample size or statistical power',                     next: 'powerGoal' },
      { label: 'Analyze time-to-event (survival) data',                              next: 'survivalGoal' },
      { label: 'Update a probability with new evidence (Bayesian)',                  next: 'bayesGoal' },
      { label: 'Pool results across multiple studies (meta-analysis)',               next: 'metaResult' },
    ]
  },

  // ── DESCRIPTIVE ─────────────────────────────────────────────────────
  descriptive: {
    results: [
      { id: 'sd-visualized',         why: 'Variance, SD, and a bell-curve plot from raw data — start here for a full picture of one sample.' },
      { id: 'variance-sd',           why: 'Just the variance and SD numbers, no graph.' },
      { id: 'standard-error',        why: 'The precision of a sample mean as an estimate of the population mean.' },
      { id: 'se-proportion',         why: 'The precision of a sample proportion (e.g., % of patients with a symptom).' },
      { id: 'variance-sd-sem-graph', why: 'Compares SD (spread of individuals) against SEM (precision of the mean) side by side.' },
      { id: 'revman-sd',             why: 'Back-calculates an SD from a paper that only reported a CI or SE — useful for meta-analysis prep.' },
      { id: 'combine-groups',        why: 'Merges 2 to 4 separately reported subgroups (e.g. age bands or sites) into one overall mean, SD, and N.' },
    ]
  },

  // ── PROBABILITY / REFERENCE TABLES ──────────────────────────────────
  probRef: {
    results: [
      { id: 'z-table',              why: 'Cumulative probability and critical values for the standard normal (z) distribution.' },
      { id: 't-table',              why: 'Critical t-values at any degrees of freedom and alpha.' },
      { id: 'critical-value-z',     why: 'Given a z statistic, get its p-value and critical value directly.' },
      { id: 'critical-value-t',     why: 'Given a t statistic and df, get its p-value and critical value directly.' },
      { id: 'binomial-probability', why: 'Exact and cumulative probabilities for a binomial count (n trials, p success).' },
      { id: 'poisson-negbinom',     why: "Probabilities for rare-event counts, and whether they're over-dispersed relative to Poisson." },
      { id: 'inverse-probability',  why: 'The BINOM.INV-style reverse lookup: smallest count k reaching a target cumulative probability.' },
    ]
  },

  // ── COMPARE GROUPS / RELATIONSHIP ───────────────────────────────────
  compareGoal: {
    question: "What type is the outcome (dependent) variable you're comparing?",
    options: [
      { label: 'Continuous / numeric (e.g., blood pressure, weight, score)',              next: 'continuousGoal' },
      { label: 'Categorical (e.g., yes/no, disease present/absent)',                       next: 'categoricalGoal' },
      { label: 'Relationship between two continuous variables (correlation/regression)',  next: 'corrGoal' },
      { label: 'Time-to-event (survival)',                                                 next: 'survivalGoal' },
    ]
  },

  continuousGoal: {
    question: 'How many groups (or samples) are you comparing?',
    options: [
      { label: 'One group vs. a known/hypothesized value', next: 'oneSampleContinuous' },
      { label: 'Two groups',                                next: 'twoGroupContinuousGoal' },
      { label: 'Three or more groups',                      next: 'multiGroupContinuous' },
    ]
  },

  oneSampleContinuous: {
    question: 'Do you know the true population standard deviation (σ), or only the sample SD?',
    options: [
      { label: 'Known population SD (rare — e.g., a well-established lab assay)', next: 'oneSampleZResult' },
      { label: 'Only the sample SD (typical)',                                    next: 'oneSampleTResult' },
    ]
  },
  oneSampleZResult: { results: [ { id: 'one-sample-z-test', why: 'Tests a sample mean against a hypothesized value when σ is already known.' } ] },
  oneSampleTResult: {
    results: [
      { id: 'one-sample-t-test', why: 'Tests a sample mean against a hypothesized value when σ must be estimated from the sample.' },
      { id: 'single-sample-ci',  why: 'If you just want a confidence interval rather than a formal test.' },
    ]
  },

  twoGroupContinuousGoal: {
    question: "What's your goal for these two groups?",
    options: [
      { label: 'Show that they differ (standard hypothesis test)',                     next: 'twoGroupContinuous' },
      { label: "Show they're equivalent or non-inferior (e.g., generic vs. brand-name drug)", next: 'equivalenceResult' },
    ]
  },
  equivalenceResult: { results: [ { id: 'equivalence-test', why: 'The two one-sided tests (TOST) procedure for equivalence or non-inferiority against a pre-set margin.' } ] },

  twoGroupContinuous: {
    question: 'Are the two groups paired (the same subjects measured twice) or independent (different subjects)?',
    options: [
      { label: 'Paired (before/after, matched pairs)',            next: 'pairedContinuous' },
      { label: 'Independent (different subjects in each group)',  next: 'independentContinuousSD' },
    ]
  },

  pairedContinuous: {
    question: 'Is the outcome approximately normally distributed (or is n reasonably large)?',
    options: [
      { label: 'Yes, roughly normal',                     next: 'pairedTResult' },
      { label: 'No — skewed, ordinal, or a small sample',  next: 'wilcoxonResult' },
    ]
  },
  pairedTResult: {
    results: [
      { id: 'paired-t-test', why: 'Standard test for the mean difference between paired/matched measurements.' },
      { id: 'cohens-d',      why: "Pair with this to report the effect size (how big the difference is), not just its p-value." },
    ]
  },
  wilcoxonResult: {
    results: [
      { id: 'wilcoxon-signed-rank', why: 'Non-parametric alternative to the paired t-test, using ranks instead of raw values.' },
      { id: 'sign-test',            why: "An even simpler (less powerful) alternative using only the direction of each pair's change." },
    ]
  },

  independentContinuousSD: {
    question: 'Do you know the true population SD (σ) for both groups, or only sample SDs?',
    options: [
      { label: 'Known population SDs (rare)', next: 'twoSampleZResult' },
      { label: 'Only sample SDs (typical)',    next: 'independentContinuous' },
    ]
  },
  twoSampleZResult: { results: [ { id: 'two-sample-z-test', why: 'Tests two independent means when both population SDs are already known.' } ] },

  independentContinuous: {
    question: 'Is the outcome approximately normally distributed in both groups (or is n reasonably large in each)?',
    options: [
      { label: 'Yes, roughly normal',                     next: 'unpairedTResult' },
      { label: 'No — skewed, ordinal, or a small sample',  next: 'mannWhitneyResult' },
    ]
  },
  unpairedTResult: {
    results: [
      { id: 'unpaired-t-test', why: "Welch's t-test for two independent means, without assuming equal variances." },
      { id: 'cohens-d',        why: 'Pair with this to report the effect size, not just the p-value.' },
      { id: 'se-mean-diff',    why: 'If you just want the standard error of the difference on its own.' },
    ]
  },
  mannWhitneyResult: { results: [ { id: 'mann-whitney', why: 'Non-parametric test comparing two independent groups using ranks.' } ] },

  multiGroupContinuous: {
    question: 'Are you measuring the same subjects repeatedly (repeated measures), or different independent groups?',
    options: [
      { label: 'Different independent groups',                             next: 'independentMultiGroup' },
      { label: 'Same subjects, repeated measures / multiple conditions',    next: 'repeatedMultiGroup' },
    ]
  },

  independentMultiGroup: {
    question: 'Is the outcome roughly normal (or n reasonably large), and how many factors are you varying?',
    options: [
      { label: 'Normal — one factor (e.g., one drug at several doses)',   next: 'anova1wayResult' },
      { label: 'Normal — two factors at once (e.g., drug × sex)',         next: 'anova2wayResult' },
      { label: 'Normal — three or more factors at once',                  next: 'anovaMultiResult' },
      { label: 'Not normal — skewed, ordinal, or small samples',          next: 'kruskalResult' },
    ]
  },
  anova1wayResult: {
    results: [
      { id: 'anova-1way',  why: 'Tests for a difference in means across 3+ independent groups.' },
      { id: 'tukeys-hsd',  why: 'Run this after a significant ANOVA to find which specific pairs of groups differ.' },
      { id: 'eta-squared', why: 'Effect size for the ANOVA — how much of the variance the factor actually explains.' },
    ]
  },
  anova2wayResult:  { results: [ { id: 'anova-2way', why: 'Tests both main effects and their interaction for two factors at once.' } ] },
  anovaMultiResult: { results: [ { id: 'anova-multifactor', why: 'Main-effects model for 3+ independent factors at once.' } ] },
  kruskalResult: {
    results: [
      { id: 'kruskal-wallis', why: 'Non-parametric one-way ANOVA for 3+ independent groups, using ranks.' },
      { id: 'dunns-test',     why: 'Run this after a significant Kruskal-Wallis to find which specific pairs differ.' },
    ]
  },

  repeatedMultiGroup: {
    question: 'Is the outcome continuous and roughly normal, or categorical (e.g., yes/no)?',
    options: [
      { label: 'Continuous, roughly normal',                     next: 'rmAnovaResult' },
      { label: 'Continuous but not normal / ordinal',            next: 'friedmanResult' },
      { label: 'Categorical (binary yes/no) at each occasion',   next: 'cochranResult' },
    ]
  },
  rmAnovaResult:  { results: [ { id: 'repeated-measures-anova', why: 'ANOVA for the same subjects measured under 3+ conditions.' } ] },
  friedmanResult: { results: [ { id: 'friedman-test', why: 'Non-parametric repeated-measures test across 3+ related conditions.' } ] },
  cochranResult:  { results: [ { id: 'cochrans-q', why: 'Tests for differences among 3+ matched binary (yes/no) measurements.' } ] },

  categoricalGoal: {
    question: 'How many samples, and are they paired?',
    options: [
      { label: 'One sample vs. a hypothesized proportion',                  next: 'oneSampleCategorical' },
      { label: 'Two independent samples/groups',                            next: 'twoSampleCategorical' },
      { label: 'Two paired/matched samples (e.g., before vs. after)',       next: 'mcnemarResult' },
      { label: 'Three or more independent groups, categorical outcome',    next: 'multiCategorical' },
      { label: 'Three or more matched/repeated binary measurements',       next: 'cochranResult' },
    ]
  },

  oneSampleCategorical: {
    question: 'Is your sample small, or is the true proportion likely far from 50%?',
    options: [
      { label: 'Yes — small sample or an extreme proportion',  next: 'binomialResult' },
      { label: "No — large sample, proportion isn't extreme",  next: 'zProp1Result' },
    ]
  },
  binomialResult: {
    results: [
      { id: 'binomial-hyp-test',              why: 'Exact binomial test — reliable even for small samples or extreme proportions.' },
      { id: 'confidence-interval-proportion', why: 'If you just want a confidence interval rather than a formal test.' },
    ]
  },
  zProp1Result: {
    results: [
      { id: 'z-test-prop-1samp',              why: 'Large-sample z-test comparing an observed proportion to a hypothesized value.' },
      { id: 'confidence-interval-proportion', why: 'If you just want a confidence interval rather than a formal test.' },
    ]
  },

  twoSampleCategorical: {
    question: 'Do you have all four counts of a 2×2 table, and are any expected cell counts below 5?',
    options: [
      { label: 'Yes, a full 2×2 table, and counts are small (expected < 5 somewhere)', next: 'fishersResult' },
      { label: 'Yes, a full 2×2 table, and counts are reasonably large',               next: 'chiSquare2x2Result' },
      { label: "No — I just have two proportions and sample sizes, not a full table",  next: 'zProp2Result' },
    ]
  },
  fishersResult: { results: [ { id: 'fishers-exact', why: 'Exact test of association for a 2×2 table when a chi-square approximation would be unreliable.' } ] },
  chiSquare2x2Result: {
    results: [
      { id: 'chi-square-2x2',  why: 'Chi-square test of independence, plus RR/OR with a study-design validity check, from a 2×2 table.' },
      { id: 'phi-coefficient', why: 'A single effect-size number (−1 to 1) for the strength of a 2×2 association.' },
    ]
  },
  zProp2Result: { results: [ { id: 'z-test-prop-2samp', why: 'Large-sample z-test comparing two independent proportions.' } ] },

  mcnemarResult: { results: [ { id: 'mcnemars-test', why: 'Tests for a change in a paired binary outcome (e.g., before vs. after treatment).' } ] },

  multiCategorical: {
    question: 'Are you comparing observed frequencies to an expected/theoretical distribution, or looking at the association between two categorical variables?',
    options: [
      { label: 'Observed vs. expected frequencies (goodness of fit)',                                next: 'chiGofResult' },
      { label: 'Association between two categorical variables (a table larger than 2×2)',            next: 'cramersResult' },
    ]
  },
  chiGofResult:  { results: [ { id: 'chi-square-gof', why: 'Tests whether observed category counts match expected/theoretical proportions.' } ] },
  cramersResult: { results: [ { id: 'cramers-v', why: 'Chi-square test of independence plus an effect-size measure for an r×c contingency table.' } ] },

  corrGoal: {
    question: 'Do you want to quantify the strength of a relationship, or predict/model one variable from another(s)?',
    options: [
      { label: 'Just quantify the strength/direction of association',    next: 'corrStrengthGoal' },
      { label: 'Predict or model one variable from another (regression)', next: 'regressionGoal' },
    ]
  },
  corrStrengthGoal: {
    question: 'Are both variables continuous and roughly linear, or ordinal/non-normal?',
    options: [
      { label: 'Continuous, roughly linear and normal', next: 'pearsonResult' },
      { label: 'Ordinal, monotonic, or non-normal',      next: 'spearmanResult' },
      { label: 'Small sample with many tied ranks',      next: 'kendallResult' },
    ]
  },
  pearsonResult: {
    results: [
      { id: 'pearson-r',      why: 'Standard measure of linear correlation between two continuous variables.' },
      { id: 'se-correlation', why: 'If you already have r and n from elsewhere and just need its standard error/CI.' },
    ]
  },
  spearmanResult: { results: [ { id: 'spearman-rho', why: 'Rank-based correlation for monotonic (not necessarily linear) relationships.' } ] },
  kendallResult:  { results: [ { id: 'kendalls-tau', why: 'Concordant/discordant-pair-based correlation, often preferred for small samples with ties.' } ] },

  regressionGoal: {
    question: 'How many predictors, and what type is the outcome?',
    options: [
      { label: 'One predictor, continuous outcome',                    next: 'simpleRegResult' },
      { label: 'Two or more predictors, continuous outcome',           next: 'multipleRegResult' },
      { label: 'Binary (yes/no) outcome, from a 2×2 exposure table',   next: 'logisticRegResult' },
      { label: "Score a new individual from a model/equation I already have", next: 'predictorResult' },
    ]
  },
  simpleRegResult:   { results: [ { id: 'simple-regression',   why: 'Fits a line through paired (X, Y) data — one predictor.' } ] },
  multipleRegResult: { results: [ { id: 'multiple-regression', why: 'Fits a linear model with 2+ predictors at once, controlling for each other.' } ] },
  logisticRegResult: { results: [ { id: 'logistic-regression', why: 'Estimates log-odds and OR for a binary outcome from a 2×2 exposure table.' } ] },
  predictorResult:   { results: [ { id: 'multivariable-predictor', why: 'Plugs an intercept, coefficients, and predictor values (e.g. diet, health behavior, medications) into a linear or logistic equation to score one new individual.' } ] },

  agreementGoal: {
    question: 'What kind of agreement are you measuring?',
    options: [
      { label: 'Two or more raters/methods rating CATEGORICAL data (e.g., diagnosis categories)', next: 'categoricalAgreement' },
      { label: 'Two or more raters/methods measuring CONTINUOUS data',                             next: 'continuousAgreement' },
      { label: 'Internal consistency of a multi-item questionnaire/scale',                         next: 'cronbachResult' },
    ]
  },
  categoricalAgreement: {
    question: 'Are the categories ordered (ordinal) or unordered (nominal)?',
    options: [
      { label: 'Unordered (nominal) categories',                       next: 'kappaResult' },
      { label: 'Ordered (ordinal) categories, e.g. mild/moderate/severe', next: 'weightedKappaResult' },
    ]
  },
  kappaResult:         { results: [ { id: 'cohens-kappa',   why: 'Chance-corrected agreement between two raters on unordered categories.' } ] },
  weightedKappaResult: { results: [ { id: 'weighted-kappa', why: "Like Cohen's kappa, but penalizes larger disagreements more on an ordinal scale." } ] },

  continuousAgreement: {
    question: 'Are you comparing exactly two measurement methods on the same subjects, or three or more raters/occasions?',
    options: [
      { label: 'Two methods',                    next: 'blandAltmanResult' },
      { label: 'Three or more raters/occasions', next: 'iccResult' },
    ]
  },
  blandAltmanResult: { results: [ { id: 'bland-altman', why: "Plots each subject's difference against their average, with limits of agreement." } ] },
  iccResult:         { results: [ { id: 'icc', why: 'Reliability across any number of raters or repeated occasions.' } ] },
  cronbachResult:    { results: [ { id: 'cronbachs-alpha', why: 'Internal-consistency reliability across the items of a scale or questionnaire.' } ] },

  diagGoal: {
    question: 'What information do you have about your test?',
    options: [
      { label: 'A 2×2 table of test result × true disease status',                             next: 'diag2x2' },
      { label: 'A continuous test score across a range of possible cutoffs',                    next: 'rocResult' },
      { label: 'A pre-test probability and a likelihood ratio — want the post-test probability', next: 'postTestResult' },
      { label: 'Two tests used together, in series or parallel',                                next: 'serialParallelResult' },
    ]
  },
  diag2x2: {
    question: 'What do you want from the 2×2 table?',
    options: [
      { label: 'Just Sensitivity, Specificity, and likelihood ratios',       next: 'seSpResult' },
      { label: 'The full picture — Se, Sp, PPV, NPV, LRs, and accuracy',    next: 'diagAccResult' },
      { label: 'How PPV/NPV change as disease prevalence changes',          next: 'ppvNpvResult' },
    ]
  },
  seSpResult:    { results: [ { id: 'sensitivity-specificity', why: 'Se/Sp/LR only — the properties of the test itself, independent of prevalence.' } ] },
  diagAccResult: { results: [ { id: 'diagnostic-accuracy', why: 'Full diagnostic accuracy, including PPV/NPV — with a check for whether your sample supports them.' } ] },
  ppvNpvResult:  { results: [ { id: 'ppv-npv-vs-prevalence', why: 'Interactive slider showing how PPV/NPV shift with prevalence, holding Se/Sp fixed.' } ] },
  rocResult:            { results: [ { id: 'roc-auc', why: 'Sweeps every cutoff to plot the ROC curve and compute AUC for a continuous test.' } ] },
  postTestResult:       { results: [ { id: 'post-test-probability', why: 'Bayesian update from pre-test probability using a likelihood ratio.' } ] },
  serialParallelResult: { results: [ { id: 'serial-parallel-testing', why: 'Combined Se/Sp when two tests are used together in series or parallel.' } ] },

  epiGoal: {
    question: 'What data do you have?',
    options: [
      { label: 'A 2×2 exposure/outcome table',                                          next: 'epi2x2Result' },
      { label: 'An odds ratio I want to convert',                                        next: 'orConvertGoal' },
      { label: 'Person-time / incidence rate data',                                      next: 'rateGoal' },
      { label: 'A relative risk and exposure prevalence (attributable risk)',            next: 'attribGoal' },
      { label: 'Observational data I want to adjust for confounding (propensity scores)', next: 'ipwResult' },
      { label: "Multiple studies' OR/RR estimates to pool",                              next: 'predIntResult' },
    ]
  },
  epi2x2Result: {
    results: [
      { id: 'measures-of-association', why: 'AR, RR, OR, and ARD with 95% CIs from a 2×2 exposure/outcome table, with a study-design validity check.' },
      { id: 'se-lnrr-lnor',            why: "Just the standard errors of ln(RR) and ln(OR), if that's all you need." },
    ]
  },
  orConvertGoal: {
    question: 'What do you want to convert the OR into?',
    options: [
      { label: 'A risk ratio (need the control event rate)', next: 'orToRrResult' },
      { label: 'Number needed to treat or harm',              next: 'orToNntResult' },
    ]
  },
  orToRrResult:  { results: [ { id: 'or-to-rr', why: 'Converts OR to RR using the control event rate.' } ] },
  orToNntResult: { results: [ { id: 'or-to-nnt-nnh', why: 'Converts OR and control event rate into NNT or NNH.' } ] },

  rateGoal: {
    question: 'What do you want to compute?',
    options: [
      { label: 'The standard error of a single rate', next: 'seRateResult' },
      { label: 'Compare two rates (rate ratio)',       next: 'rateRatioResult' },
    ]
  },
  seRateResult: { results: [ { id: 'se-rate', why: 'Standard error of a single incidence rate from events and person-time.' } ] },
  rateRatioResult: {
    results: [
      { id: 'incidence-rate', why: "Both groups' rates and their rate ratio together, in one view." },
      { id: 'se-rate-ratio',  why: 'Just the standard error and CI of the rate ratio, if you already have the rates.' },
    ]
  },

  attribGoal: {
    question: 'Do you want the fraction of disease attributable to the exposure, or the absolute burden?',
    options: [
      { label: 'A fraction/percentage (among exposed, or population-wide)', next: 'attribFracResult' },
      { label: 'An absolute number (population attributable risk)',        next: 'parResult' },
    ]
  },
  attribFracResult: { results: [ { id: 'attributable-fraction', why: 'Fraction of disease attributable to the exposure, among the exposed and population-wide.' } ] },
  parResult:        { results: [ { id: 'par', why: 'Absolute disease burden in the population attributable to the exposure.' } ] },

  ipwResult:     { results: [ { id: 'ipw-ate', why: 'Inverse-probability-weighted average treatment effect, correcting for confounding by indication.' } ] },
  predIntResult: { results: [ { id: 'assoc-pred-intervals', why: 'Pools OR/RR estimates and adds a prediction interval for a future study.' } ] },

  powerGoal: {
    question: 'What do you need?',
    options: [
      { label: 'Compute power for a study design I already have',                   next: 'powerCalcGoal' },
      { label: 'Compute the sample size needed for a target power',                 next: 'sampleSizeGoal' },
      { label: 'Achieved ("post-hoc") power for a completed study',                 next: 'posthocPowerResult' },
      { label: 'How power relates to false-positive risk of a significant finding', next: 'powerPpvResult' },
      { label: 'Understand Type I vs. Type II error',                              next: 'typeErrorResult' },
    ]
  },
  typeErrorResult: { results: [ { id: 'type1-type2-errors', why: 'A decision matrix showing both error types and both correct decisions side by side, with α and power as adjustable sliders.' } ] },
  powerCalcGoal: {
    question: 'Do you want a single number, a visual of the H₀/Hₐ overlap, or power across a range of effect sizes?',
    options: [
      { label: 'A single power calculation',                       next: 'powerCalcResult' },
      { label: 'An interactive graph of the H₀/Hₐ overlap',       next: 'powerGraphResult' },
      { label: 'Power across a range of effect sizes and alphas', next: 'powerRangeResult' },
    ]
  },
  powerCalcResult:  { results: [ { id: 'power-calculations', why: 'One- and two-tailed power from delta, σ, n, and α.' } ] },
  powerGraphResult: { results: [ { id: 'power-with-graph', why: 'Drag effect size, n, and alpha as sliders and watch power update live.' } ] },
  powerRangeResult: {
    results: [
      { id: 'power-vs-es-alpha', why: 'Power curves across a range of effect sizes, for three benchmark alpha levels.' },
      { id: 'power-delta-alpha', why: 'The same idea, as a reference table instead of a chart.' },
    ]
  },
  posthocPowerResult: { results: [ { id: 'posthoc-power', why: 'Achieved power from an observed effect size and n — with the standard caveat about interpreting it.' } ] },
  powerPpvResult:     { results: [ { id: 'power-ppv-fpp', why: 'Links power and pre-study odds to the positive predictive value of a significant result.' } ] },

  sampleSizeGoal: {
    question: 'What are you comparing?',
    options: [
      { label: 'One sample mean vs. a hypothesized value',        next: 'ss1meanResult' },
      { label: 'Two independent means',                            next: 'ss2meanResult' },
      { label: 'One sample proportion vs. a hypothesized value',   next: 'ss1propResult' },
      { label: 'Two independent proportions',                      next: 'ss2propResult' },
      { label: "I'm not testing a hypothesis — I just want to estimate a proportion (e.g. a survey)", next: 'ssSurveyResult' },
    ]
  },
  ss1meanResult: { results: [ { id: 'sample-size-1mean', why: 'Required n to detect a difference from a hypothesized mean.' } ] },
  ss2meanResult: { results: [ { id: 'sample-size-2mean', why: 'Required per-group n to detect a difference between two independent means.' } ] },
  ssSurveyResult: { results: [ { id: 'sample-size-survey', why: 'How many respondents you need to estimate a proportion within a target margin of error — the formula most surveys actually need.' } ] },
  ss1propResult: { results: [ { id: 'sample-size-1prop', why: 'Required n to detect a difference from a hypothesized proportion.' } ] },
  ss2propResult: { results: [ { id: 'sample-size-2prop', why: 'Required per-group n to detect a difference between two independent proportions.' } ] },

  survivalGoal: {
    question: 'Are you estimating one survival curve, or comparing two groups?',
    options: [
      { label: "One group's survival curve",         next: 'kmResult' },
      { label: 'Compare survival between two groups', next: 'logRankResult' },
    ]
  },
  kmResult:      { results: [ { id: 'kaplan-meier', why: 'Estimates the survival curve from time-to-event data with censoring.' } ] },
  logRankResult: { results: [ { id: 'log-rank-test', why: "Tests whether two groups' survival curves differ significantly." } ] },

  bayesGoal: {
    question: 'What do you want to do?',
    options: [
      { label: 'Compute a posterior probability from a prior and new evidence', next: 'bayesTheoremResult' },
      { label: 'Estimate a credible interval for a proportion',                 next: 'bayesCriResult' },
      { label: 'Quantify evidence strength implied by a p-value (Bayes factor)', next: 'bayesFactorResult' },
    ]
  },
  bayesTheoremResult: { results: [ { id: 'bayes-theorem', why: "Direct application of Bayes' rule to update a probability with new evidence." } ] },
  bayesCriResult:     { results: [ { id: 'bayesian-cri', why: 'Beta-posterior credible interval for a proportion, combining a prior with observed data.' } ] },
  bayesFactorResult:  { results: [ { id: 'bayes-factor', why: 'Converts a p-value into a minimum-Bayes-factor bound on the evidence against H₀.' } ] },

  metaResult: {
    question: 'How many treatments/interventions are involved?',
    options: [
      { label: 'Two — pooling multiple studies of the same comparison',                  next: 'pairwiseMetaResult' },
      { label: 'Three or more — some pairs were never tested head-to-head',              next: 'networkMetaResult' },
    ]
  },
  pairwiseMetaResult: { results: [ { id: 'meta-analysis', why: 'Pools effect sizes across studies, tests heterogeneity, and computes a prediction interval.' } ] },
  networkMetaResult: { results: [ { id: 'network-meta-analysis', why: 'Combines direct and indirect evidence across the whole treatment network into a league table, heterogeneity/inconsistency statistics, and a treatment ranking.' } ] },

};

/* ── SEARCH KEYWORDS ──────────────────────────────────────────────────────
   A synonym/intent layer for the sidebar search, keyed by calculator id.
   These are common ways someone might describe their situation ("before
   and after", "two independent groups", "skewed data") rather than the
   calculator's own formal name — so typing a description of the problem,
   not just the calculator's title, surfaces the right tool. Consumed by
   searchScore() in app.js. Every id below was checked against
   CALCULATOR_INDEX to exist.                                              */
const SEARCH_KEYWORDS = {

  // Descriptive Statistics
  'variance-sd':           ['variance', 'standard deviation', 'spread of data', 'dispersion', 'sample sd', 'population sd'],
  'sd-visualized':         ['standard deviation', 'variance', 'bell curve', 'normal curve plot', 'visualize spread of data', 'graph of a sample'],
  'standard-error':        ['standard error of the mean', 'sem', 'precision of the mean', 'sampling error'],
  'se-proportion':         ['standard error of a proportion', 'se of a percentage', 'precision of a proportion'],
  'variance-sd-sem-graph': ['sd vs sem', 'standard deviation vs standard error', 'compare sd and sem'],
  'revman-sd':             ['back calculate sd', 'derive sd from a confidence interval', 'meta-analysis sd', 'convert se to sd', 'cochrane revman'],
  'combine-groups':        ['combine groups', 'pooled mean and sd', 'overall mean and sd', 'merge male and female', 'combining subgroups', 'grand mean and sd', 'cochrane combine groups', 'combine multiple groups', 'combine four groups', 'weighted average mean and sd'],

  // Probability & Distributions
  'z-table':              ['z score', 'standard normal table', 'z distribution', 'cumulative probability', 'area under the curve'],
  't-table':              ['t distribution', 't critical value table', "student's t table"],
  'binomial-probability': ['binomial distribution', 'probability of successes', 'coin flip probability', 'exact binomial probability'],
  'poisson-negbinom':     ['poisson distribution', 'rare events', 'count data', 'overdispersion', 'negative binomial'],
  'inverse-probability':  ['reverse lookup', 'binom inv', 'smallest count for a target probability', 'inverse binomial'],
  'critical-value-t':     ['t statistic to p-value', 'given a t value find p', 'critical t value'],
  'critical-value-z':     ['z statistic to p-value', 'given a z value find p', 'critical z value'],

  // T-Tests & Z-Tests
  'one-sample-t-test':             ['one sample t-test', 'compare a mean to a hypothesized value', 'single group mean test'],
  'unpaired-t-test':                ['independent t-test', 'two sample t-test', 'compare two independent means', 'unpaired groups', 'two groups continuous data'],
  'equivalence-test':               ['tost', 'two one-sided tests', 'equivalence test', 'non-inferiority test', 'bioequivalence', 'generic vs brand-name drug'],
  'paired-t-test':                  ['paired t-test', 'before and after', 'matched pairs', 'dependent samples t-test', 'same subjects measured twice'],
  'se-mean-diff':                   ['standard error of the difference between two means'],
  'one-sample-z-test':              ['one sample z-test', 'known population standard deviation'],
  'two-sample-z-test':              ['two sample z-test', 'compare two means with known population sd'],
  'z-test-prop-1samp':              ['one sample proportion test', 'test a percentage against a hypothesized value'],
  'z-test-prop-2samp':              ['two sample proportion test', 'compare two percentages', 'compare two independent proportions'],
  'binomial-hyp-test':              ['exact test for a proportion', 'small sample proportion test'],
  'single-sample-ci':               ['confidence interval for a mean', 'ci for one sample'],
  'confidence-interval-proportion': ['confidence interval for a proportion', 'ci for a percentage'],

  // Chi-Square & Categorical
  'chi-square-2x2': ['chi-square test', '2x2 table', 'test of independence', 'categorical association', 'two by two table'],
  'chi-square-gof':  ['goodness of fit', 'observed vs expected frequencies', 'chi-square gof'],
  'fishers-exact':   ["fisher's exact test", 'small cell counts', '2x2 table exact test', 'expected count below 5'],
  'mcnemars-test':   ["mcnemar's test", 'paired categorical data', 'before and after yes no', 'matched binary outcome'],
  'cochrans-q':      ["cochran's q test", 'three or more matched binary measurements', 'repeated binary outcome'],

  // Non-Parametric Tests
  'mann-whitney':          ['mann-whitney u test', 'wilcoxon rank sum test', 'non-parametric two group comparison', 'compare two independent groups not normal', 'skewed data two groups'],
  'wilcoxon-signed-rank':  ['wilcoxon signed rank test', 'non-parametric paired test', 'paired data not normal'],
  'sign-test':             ['sign test', 'direction of change', 'simple paired non-parametric test'],
  'kruskal-wallis':        ['kruskal-wallis test', 'non-parametric anova', 'compare three or more groups not normal', 'skewed data multiple groups'],
  'dunns-test':            ["dunn's test", 'post hoc after kruskal-wallis', 'pairwise comparison non-parametric'],
  'friedman-test':         ['friedman test', 'non-parametric repeated measures', 'ranks across conditions'],

  // ANOVA
  'anova-1way':             ['one-way anova', 'compare three or more group means', 'analysis of variance'],
  'anova-2way':             ['two-way anova', 'two factors', 'interaction effect'],
  'anova-multifactor':      ['multi-factor anova', 'three or more factors'],
  'tukeys-hsd':             ["tukey's hsd", 'post hoc test', 'pairwise comparison after anova', 'which groups differ'],
  'repeated-measures-anova': ['repeated measures anova', 'same subjects multiple conditions'],

  // Correlation & Regression
  'pearson-r':            ['pearson correlation', 'linear correlation', 'correlation coefficient r'],
  'se-correlation':       ['standard error of correlation', 'se of r', 'confidence interval for correlation'],
  'spearman-rho':         ["spearman's rho", 'rank correlation', 'monotonic relationship', 'ordinal correlation'],
  'kendalls-tau':         ["kendall's tau", 'concordant discordant pairs', 'correlation with ties'],
  'simple-regression':    ['simple linear regression', 'line of best fit', 'one predictor regression', 'predict y from x'],
  'multiple-regression':  ['multiple linear regression', 'multiple predictors', 'multivariable regression', 'two or more predictors'],
  'logistic-regression':  ['logistic regression', 'binary outcome regression', 'odds ratio from a 2x2 table', 'predict yes no outcome'],
  'multivariable-predictor': ['prediction calculator', 'predict an outcome', 'diet', 'health behavior', 'medications', 'risk score calculator', 'score a new patient', 'apply a regression equation', 'multiple predictors prediction'],

  // Effect Sizes & Agreement
  'cohens-d':        ["cohen's d", 'effect size for a mean difference'],
  'cramers-v':       ["cramer's v", 'effect size for chi-square', 'association strength categorical', 'r by c table'],
  'phi-coefficient': ['phi coefficient', 'effect size for a 2x2 table'],
  'cohens-kappa':    ["cohen's kappa", 'inter-rater agreement', 'agreement between two raters categorical', 'unordered categories'],
  'weighted-kappa':  ['weighted kappa', 'ordinal agreement between raters', 'agreement ordered categories'],
  'icc':             ['intraclass correlation coefficient', 'reliability across three or more raters'],
  'bland-altman':    ['bland-altman plot', 'limits of agreement', 'compare two measurement methods', 'agreement between two continuous methods'],
  'eta-squared':     ['eta squared', 'anova effect size'],
  'cronbachs-alpha': ["cronbach's alpha", 'internal consistency', 'scale reliability', 'questionnaire reliability'],

  // Power & Sample Size
  'power-calculations': ['statistical power calculation'],
  'power-with-graph':   ['power calculator with graph', 'interactive power', 'visualize power', 'power sliders'],
  'power-vs-es-alpha':  ['power curves', 'power across a range of effect sizes'],
  'posthoc-power':      ['post hoc power', 'achieved power', 'observed power', 'power after study completed'],
  'sample-size-1mean':  ['sample size for one mean', 'sample size calculation one group'],
  'sample-size-2mean':  ['sample size for two means', 'sample size two groups', 'sample size two independent means'],
  'sample-size-1prop':  ['sample size for one proportion'],
  'sample-size-2prop':  ['sample size for two proportions', 'sample size two independent proportions'],
  'sample-size-survey': ['survey sample size', 'how many people to survey', 'margin of error', 'estimate a proportion', 'poll sample size', 'questionnaire sample size', 'response rate'],
  'power-ppv-fpp':      ['false positive risk', 'positive predictive value of a significant result'],
  'power-delta-alpha':  ['power table by effect size and alpha'],
  'type1-type2-errors': ['type i error', 'type ii error', 'false positive', 'false negative', 'decision matrix', 'alpha beta tradeoff', 'confusion matrix hypothesis test'],

  // Epidemiology & Risk
  'measures-of-association': ['relative risk', 'odds ratio', 'risk difference', '2x2 exposure outcome table'],
  'se-lnrr-lnor':            ['standard error of log relative risk', 'se of log odds ratio'],
  'se-rate':                 ['standard error of an incidence rate'],
  'se-rate-ratio':           ['standard error of a rate ratio'],
  'or-to-nnt-nnh':           ['convert odds ratio to number needed to treat', 'nnt', 'nnh', 'number needed to harm'],
  'or-to-rr':                ['convert odds ratio to relative risk'],
  'attributable-fraction':   ['attributable fraction', 'fraction of disease due to exposure'],
  'par':                     ['population attributable risk', 'absolute disease burden'],
  'incidence-rate':          ['incidence rate', 'rate ratio', 'person-time data'],
  'ipw-ate':                 ['inverse probability weighting', 'propensity score', 'average treatment effect', 'adjust for confounding'],
  'assoc-pred-intervals':    ['prediction interval for odds ratio', 'pool multiple studies or rr'],

  // Diagnostic Testing
  'sensitivity-specificity': ['sensitivity', 'specificity', 'likelihood ratios', 'diagnostic test properties'],
  'diagnostic-accuracy':     ['diagnostic accuracy', 'ppv', 'npv', 'positive predictive value', 'negative predictive value'],
  'post-test-probability':   ['post-test probability', 'pre-test probability', 'bayesian update for a diagnostic test'],
  'roc-auc':                 ['roc curve', 'area under the curve', 'auc', 'continuous test cutoff'],
  'serial-parallel-testing': ['combining two diagnostic tests', 'series testing', 'parallel testing'],
  'ppv-npv-vs-prevalence':   ['ppv npv vs prevalence', 'how prevalence affects predictive value'],

  // Bayesian & Meta-Analysis
  'bayes-theorem':  ["bayes' theorem", 'update a probability with new evidence', 'posterior probability'],
  'bayesian-cri':   ['credible interval', 'bayesian proportion estimate'],
  'bayes-factor':   ['bayes factor', 'convert a p-value to evidence strength'],
  'meta-analysis':  ['meta-analysis', 'pooled effect size', 'heterogeneity', 'forest plot', 'pool multiple studies'],
  'network-meta-analysis': ['network meta-analysis', 'nma', 'indirect comparison', 'mixed treatment comparison', 'bucher method', 'league table', 'multiple treatments comparison', 'p-score', 'sucra', 'ranking treatments', 'network diagram', 'network graph', 'network plot', 'evidence web', 'network geometry'],

  // Survival Analysis
  'kaplan-meier':  ['kaplan-meier curve', 'survival curve', 'time to event data', 'censored data'],
  'log-rank-test': ['log-rank test', 'compare survival curves', 'compare two groups survival'],

};

/* ── NOTATION GLOSSARY ────────────────────────────────────────────────────
   A plain-English meaning for every symbol used in each calculator's
   `formulas` (and, where helpful, its inputs), keyed by calculator id and
   rendered by app.js's renderCalculator() right after the Formula block.
   Kept separate from each calculator's own definition (rather than adding
   a `notation` field inline) so it can be populated for all calculators
   without touching 91 existing, already-verified formula/calculate
   blocks. Being filled in incrementally below — see TODO markers.       */
const NOTATION = {

  // Descriptive Statistics
  'variance-sd': [
    { symbol: 'x_i', meaning: 'Each individual data value entered in the comma-separated list.' },
    { symbol: '\\bar{x}', meaning: 'The sample mean — the average of all entered data values.' },
    { symbol: 'n', meaning: 'The number of data values entered (sample size).' },
    { symbol: 's^2', meaning: 'Sample variance — average squared deviation from the mean, dividing by n − 1.' },
    { symbol: 's', meaning: 'Sample standard deviation — the square root of the sample variance.' },
    { symbol: '\\mu', meaning: 'The population mean, used only in the population version of the formula.' },
    { symbol: 'N', meaning: 'The population size, used only in the population version of the formula.' },
    { symbol: '\\sigma^2', meaning: 'Population variance — average squared deviation from μ, dividing by N.' },
    { symbol: '\\sigma', meaning: 'Population standard deviation — the square root of the population variance.' },
  ],
  'sd-visualized': [
    { symbol: 'x_i', meaning: 'Each individual data value entered in the comma-separated list.' },
    { symbol: '\\bar{x}', meaning: 'The sample mean, shown as the center of the plotted bell curve.' },
    { symbol: 'n', meaning: 'The number of data values entered (sample size).' },
    { symbol: 's^2', meaning: 'Sample variance — average squared deviation from the mean, dividing by n − 1.' },
    { symbol: 's', meaning: 'Sample standard deviation, which sets the width of the ±1/2/3 SD bands on the curve.' },
    { symbol: '\\mu', meaning: 'The population mean, used only in the population version of the formula.' },
    { symbol: 'N', meaning: 'The population size, used only in the population version of the formula.' },
    { symbol: '\\sigma^2', meaning: 'Population variance — average squared deviation from μ, dividing by N.' },
    { symbol: '\\sigma', meaning: 'Population standard deviation — the square root of the population variance.' },
  ],
  'standard-error': [
    { symbol: 'SEM', meaning: 'Standard error of the mean — how precisely the sample mean estimates the true population mean.' },
    { symbol: 's', meaning: 'The sample standard deviation entered, describing spread among individual measurements.' },
    { symbol: 'n', meaning: 'The sample size entered.' },
    { symbol: '\\bar{x}', meaning: 'The optional sample mean entered, used as the center of the 95% confidence interval.' },
  ],
  'se-proportion': [
    { symbol: 'p', meaning: 'The sample proportion entered (e.g. fraction of patients testing positive).' },
    { symbol: 'n', meaning: 'The sample size entered.' },
    { symbol: 'SE(p)', meaning: 'The standard error of the sample proportion, measuring how precisely p estimates the true population proportion.' },
  ],
  'variance-sd-sem-graph': [
    { symbol: 'x_i', meaning: 'Each individual data value entered in the comma-separated list.' },
    { symbol: '\\bar{x}', meaning: 'The sample mean of the entered data.' },
    { symbol: 'n', meaning: 'The number of data values entered (sample size).' },
    { symbol: 's^2', meaning: 'Sample variance — average squared deviation from the mean, dividing by n − 1.' },
    { symbol: 's', meaning: 'Sample standard deviation, describing spread of individual data points.' },
    { symbol: 'SEM', meaning: 'Standard error of the mean — the narrower spread describing precision of the mean estimate, not individual variability.' },
  ],
  'revman-sd': [
    { symbol: 'SD', meaning: 'The standard deviation being back-calculated, for entry into a meta-analysis tool.' },
    { symbol: 'SE', meaning: 'A reported standard error from a published trial, used to derive SD when SD is not reported.' },
    { symbol: 'n', meaning: 'The sample size of the trial being converted.' },
    { symbol: 'CI_{upper}', meaning: 'The upper bound of a reported confidence interval.' },
    { symbol: 'CI_{lower}', meaning: 'The lower bound of a reported confidence interval.' },
    { symbol: 'z', meaning: 'The critical value matching the reported confidence level (e.g. 1.96 for 95%), used to convert the CI width back into SD.' },
  ],
  'combine-groups': [
    { symbol: '\\bar{x}_i', meaning: "Group i's own reported mean (e.g. an age band, site, or sex)." },
    { symbol: 's_i', meaning: "Group i's own reported standard deviation." },
    { symbol: 'n_i', meaning: "Group i's own reported sample size." },
    { symbol: 'k', meaning: 'Number of groups being combined (2 to 4).' },
    { symbol: 'N', meaning: 'Combined sample size, the sum of all n_i.' },
    { symbol: '\\bar{x}', meaning: "All groups' means, weighted by their sample sizes into one overall (grand) mean." },
    { symbol: 'SD', meaning: 'Combined standard deviation as if the raw data from every group had been pooled into one sample — larger than the plain within-groups pooled SD whenever the group means differ meaningfully, since it also reflects how spread out those means are from the grand mean.' },
    { symbol: 's_{\\text{pooled}}', meaning: "The equal-means pooled SD shown for comparison (the same quantity behind Cohen's d, a t-test, or one-way ANOVA's MSE), which assumes every group shares one true mean rather than accounting for the spread between them." },
  ],

  // Probability & Distributions
  'z-table': [
    { symbol: 'z', meaning: 'The z-value entered to look up — how many standard deviations a point is from the mean.' },
    { symbol: '\\Phi(z)', meaning: 'The cumulative probability that a standard normal value falls at or below z.' },
    { symbol: 'Z', meaning: 'A standard normal random variable, used to express the cumulative probability P(Z ≤ z).' },
    { symbol: '\\operatorname{erf}', meaning: 'The error function used internally to compute the normal cumulative probability.' },
    { symbol: 'p', meaning: 'The two-tailed p-value — the probability of a deviation at least as extreme as |z| in either direction.' },
    { symbol: '\\alpha', meaning: 'The significance level entered, used to find the critical z-value cutoffs.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'The two-tailed critical z-value — the cutoff a z statistic must exceed in either direction to be significant at α.' },
    { symbol: 'z_{\\alpha}', meaning: 'The one-tailed critical z-value — the cutoff for a test in a single direction at significance level α.' },
  ],
  't-table': [
    { symbol: '\\alpha', meaning: 'The significance level entered, used to find the critical t-value cutoffs.' },
    { symbol: 'df', meaning: 'Degrees of freedom entered, which shapes the t-distribution used for the lookup.' },
    { symbol: 't_{\\alpha/2,\\,df}', meaning: 'The two-tailed critical t-value — the cutoff a t statistic must exceed in either direction to be significant at α.' },
    { symbol: 't_{\\alpha,\\,df}', meaning: 'The one-tailed critical t-value — the cutoff for a test in a single direction at significance level α and given df.' },
  ],
  'binomial-probability': [
    { symbol: 'X', meaning: 'The random variable representing the number of successes across n trials.' },
    { symbol: 'k', meaning: 'The number of successes entered (e.g. patients experiencing a side effect).' },
    { symbol: 'n', meaning: 'The number of trials entered (e.g. number of patients treated).' },
    { symbol: 'p', meaning: 'The probability of success on a single trial, entered as a value between 0 and 1.' },
    { symbol: 'P(X=k)', meaning: 'The exact probability of observing precisely k successes.' },
    { symbol: 'P(X \\le k)', meaning: 'The cumulative probability of observing k or fewer successes.' },
    { symbol: 'i', meaning: 'A running index over possible success counts (0 through k) used to sum the cumulative probability.' },
    { symbol: '\\mu', meaning: 'The mean number of successes expected across n trials.' },
    { symbol: '\\sigma^2', meaning: 'The variance of the number of successes across n trials.' },
  ],
  'poisson-negbinom': [
    { symbol: 'X', meaning: 'The random variable representing the number of events observed.' },
    { symbol: 'k', meaning: 'The number of events entered (e.g. infections observed in a month).' },
    { symbol: '\\lambda', meaning: 'The mean event rate entered, used as the Poisson model’s average and variance.' },
    { symbol: 'e', meaning: "Euler's number, the base of the exponential term in the Poisson probability formula." },
    { symbol: '\\mu', meaning: 'The mean rate entered, shared between the Poisson and negative binomial models for a fair comparison.' },
    { symbol: 'r', meaning: 'The negative binomial dispersion parameter entered, controlling how much extra variance ("burstiness") is added beyond Poisson.' },
    { symbol: '\\Gamma', meaning: 'The gamma function, a generalization of factorial used in the negative binomial formula.' },
    { symbol: 'P_{Pois}(X=k)', meaning: 'The Poisson probability of observing exactly k events given mean rate λ.' },
    { symbol: 'P_{NB}(X=k)', meaning: 'The negative binomial probability of observing exactly k events given mean μ and dispersion r.' },
    { symbol: '\\text{Var}_{Pois}', meaning: "The Poisson model's variance, always equal to λ." },
    { symbol: '\\text{Var}_{NB}', meaning: "The negative binomial model's variance, which exceeds the Poisson variance when events cluster more than expected." },
  ],
  'inverse-probability': [
    { symbol: 'X', meaning: 'The random variable representing the number of successes across n trials.' },
    { symbol: 'k', meaning: 'A candidate success count being tested against the target cumulative probability.' },
    { symbol: 'n', meaning: 'The number of trials entered (e.g. participants enrolled).' },
    { symbol: 'i', meaning: 'A running index over possible success counts, used to sum the cumulative probability up to k.' },
    { symbol: 'p', meaning: 'The probability of success on a single trial, entered as a value between 0 and 1.' },
    { symbol: 'P(X \\le k)', meaning: 'The cumulative probability of observing k or fewer successes.' },
    { symbol: 'k^{*}', meaning: 'The smallest success count whose cumulative probability meets or exceeds the target — the calculator’s main result.' },
    { symbol: 'q', meaning: 'The target cumulative probability entered, which k* must meet or exceed.' },
  ],
  'critical-value-t': [
    { symbol: 'p', meaning: 'The two-tailed p-value — the probability of a t statistic at least as extreme as the one entered.' },
    { symbol: 'T_{df}', meaning: 'The cumulative distribution function of the t-distribution with the entered degrees of freedom.' },
    { symbol: 't', meaning: 'The test statistic entered, whose significance and implied SE are being evaluated.' },
    { symbol: 't_{\\alpha/2,\\,df}', meaning: 'The two-tailed critical t-value — the cutoff the statistic must exceed in either direction to be significant at α.' },
    { symbol: 't_{\\alpha,\\,df}', meaning: 'The one-tailed critical t-value — the cutoff for a test in a single direction at significance level α.' },
    { symbol: 'df', meaning: 'Degrees of freedom entered, which shapes the t-distribution used for the lookup.' },
    { symbol: '\\alpha', meaning: 'The significance level entered, used to find the critical value cutoffs.' },
    { symbol: 'SE', meaning: 'The implied standard error, back-calculated from the optional point estimate divided by the t statistic.' },
    { symbol: '\\text{estimate}', meaning: 'The optional point estimate entered, used only to back out the implied standard error.' },
  ],
  'critical-value-z': [
    { symbol: 'p', meaning: 'The two-tailed p-value — the probability of a z statistic at least as extreme as the one entered.' },
    { symbol: '\\Phi', meaning: 'The cumulative distribution function of the standard normal distribution.' },
    { symbol: 'z', meaning: 'The test statistic entered, whose significance and implied SE are being evaluated.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'The two-tailed critical z-value — the cutoff the statistic must exceed in either direction to be significant at α.' },
    { symbol: 'z_{\\alpha}', meaning: 'The one-tailed critical z-value — the cutoff for a test in a single direction at significance level α.' },
    { symbol: '\\alpha', meaning: 'The significance level entered, used to find the critical value cutoffs.' },
    { symbol: 'SE', meaning: 'The implied standard error, back-calculated from the optional point estimate divided by the z statistic.' },
    { symbol: '\\text{estimate}', meaning: 'The optional point estimate entered, used only to back out the implied standard error.' },
  ],

  // T-Tests & Z-Tests
  'one-sample-t-test': [
    { symbol: 's', meaning: 'Sample SD — the spread of the observed data, used since the population SD is unknown.' },
    { symbol: 'n', meaning: 'Sample Size — the number of observations the mean and SD were computed from.' },
    { symbol: 'SE', meaning: 'Standard Error of the sample mean, computed as the sample SD divided by the square root of n.' },
    { symbol: '\\bar{x}', meaning: 'Sample Mean — the average observed in your data.' },
    { symbol: '\\mu_0', meaning: 'Hypothesized Mean — the benchmark value the sample mean is being tested against.' },
    { symbol: 't', meaning: 't-Statistic — how many standard errors the sample mean is from the hypothesized mean.' },
    { symbol: 'df', meaning: 'Degrees of Freedom, equal to sample size minus 1, used to select the correct t-distribution.' },
  ],
  'unpaired-t-test': [
    { symbol: 's_1', meaning: 'Group 1 SD — the spread of observations within Group 1.' },
    { symbol: 'n_1', meaning: 'Group 1 Size — the number of observations in Group 1.' },
    { symbol: 's_2', meaning: 'Group 2 SD — the spread of observations within Group 2.' },
    { symbol: 'n_2', meaning: 'Group 2 Size — the number of observations in Group 2.' },
    { symbol: 'SE', meaning: "Welch Standard Error of the difference between the two group means, allowing for unequal variances." },
    { symbol: '\\bar{x}_1', meaning: 'Group 1 Mean — the average value observed in Group 1.' },
    { symbol: '\\bar{x}_2', meaning: 'Group 2 Mean — the average value observed in Group 2.' },
    { symbol: 't', meaning: "Welch's t-Statistic — how many standard errors the two group means are apart." },
    { symbol: 'df', meaning: 'Welch–Satterthwaite Degrees of Freedom — an adjusted, often non-integer df that accounts for unequal group variances and sizes.' },
  ],
  'equivalence-test': [
    { symbol: 's_1', meaning: 'Group 1 SD — the spread of observations in Group 1 (e.g. the new treatment).' },
    { symbol: 'n_1', meaning: 'Group 1 Size — the number of observations in Group 1.' },
    { symbol: 's_2', meaning: 'Group 2 SD — the spread of observations in Group 2 (e.g. the reference/standard treatment).' },
    { symbol: 'n_2', meaning: 'Group 2 Size — the number of observations in Group 2.' },
    { symbol: 'SE', meaning: 'Welch Standard Error of the difference between the two group means.' },
    { symbol: 'df', meaning: 'Welch–Satterthwaite Degrees of Freedom, adjusted for unequal group variances and sizes.' },
    { symbol: '\\bar x_1', meaning: 'Group 1 Mean — e.g. the new treatment average.' },
    { symbol: '\\bar x_2', meaning: 'Group 2 Mean — e.g. the reference/standard treatment average.' },
    { symbol: '\\Delta', meaning: 'The Equivalence / Non-Inferiority Margin — the largest difference still considered practically unimportant.' },
    { symbol: 't_{lower}', meaning: 'Test statistic for the lower-bound one-sided test (checks the difference is not below −Δ).' },
    { symbol: 't_{upper}', meaning: 'Test statistic for the upper-bound one-sided test (checks the difference is not above +Δ).' },
    { symbol: '\\alpha', meaning: 'Significance Level for each one-sided test — the chance of wrongly declaring equivalence/non-inferiority.' },
    { symbol: 't', meaning: 'Test statistic for the single one-sided non-inferiority test.' },
  ],
  'paired-t-test': [
    { symbol: 's_d', meaning: 'SD of Differences — the spread of the within-pair (e.g. before/after) differences.' },
    { symbol: 'n', meaning: 'Number of Pairs — how many matched observations the differences were computed from.' },
    { symbol: 'SE', meaning: 'Standard Error of the Mean Difference, computed as the SD of differences divided by the square root of n.' },
    { symbol: '\\bar{d}', meaning: 'Mean of Differences — the average within-pair change (e.g. average before-to-after change).' },
    { symbol: 't', meaning: 'How many standard errors the mean difference is from zero.' },
    { symbol: 'df', meaning: 'Degrees of Freedom, equal to the number of pairs minus 1.' },
  ],
  'se-mean-diff': [
    { symbol: 's_1', meaning: 'Group 1 SD — the spread of observations in Group 1.' },
    { symbol: 'n_1', meaning: 'Group 1 Size — the number of observations in Group 1.' },
    { symbol: 's_2', meaning: 'Group 2 SD — the spread of observations in Group 2.' },
    { symbol: 'n_2', meaning: 'Group 2 Size — the number of observations in Group 2.' },
    { symbol: 's_{pooled}', meaning: "A single combined SD estimate from both groups, valid when the groups' variances are assumed equal." },
    { symbol: 'SE_{pooled}', meaning: "Standard error of the mean difference computed from the pooled SD (equal-variances assumption)." },
    { symbol: 'SE_{Welch}', meaning: "Standard error of the mean difference that allows each group to have its own variance." },
    { symbol: '\\bar{x}_1', meaning: 'Group 1 Mean — optional, only needed to also compute the confidence interval for the mean difference.' },
    { symbol: '\\bar{x}_2', meaning: 'Group 2 Mean — optional, only needed to also compute the confidence interval for the mean difference.' },
  ],
  'one-sample-z-test': [
    { symbol: '\\sigma', meaning: 'Population SD — the known standard deviation of the underlying population (not estimated from the sample).' },
    { symbol: 'n', meaning: 'Sample Size — the number of observations in the sample.' },
    { symbol: 'SE', meaning: 'Standard Error of the sample mean, computed as the population SD divided by the square root of n.' },
    { symbol: '\\bar{x}', meaning: 'Sample Mean — the average observed in your data.' },
    { symbol: '\\mu_0', meaning: 'Hypothesized Mean — the benchmark value the sample mean is being tested against.' },
    { symbol: 'z', meaning: 'z-Statistic — how many standard errors the sample mean is from the hypothesized mean.' },
  ],
  'two-sample-z-test': [
    { symbol: '\\sigma_1', meaning: 'Group 1 Population SD — the known standard deviation for Group 1.' },
    { symbol: 'n_1', meaning: 'Group 1 Size — the number of observations in Group 1.' },
    { symbol: '\\sigma_2', meaning: 'Group 2 Population SD — the known standard deviation for Group 2.' },
    { symbol: 'n_2', meaning: 'Group 2 Size — the number of observations in Group 2.' },
    { symbol: 'SE', meaning: 'Standard Error of the difference between the two group means, based on the known population SDs.' },
    { symbol: '\\bar{x}_1', meaning: 'Group 1 Mean — the average value observed in Group 1.' },
    { symbol: '\\bar{x}_2', meaning: 'Group 2 Mean — the average value observed in Group 2.' },
    { symbol: 'z', meaning: 'z-Statistic — how many standard errors the two group means are apart.' },
  ],
  'z-test-prop-1samp': [
    { symbol: 'p_0', meaning: 'Hypothesized Proportion — the benchmark rate the sample proportion is being tested against.' },
    { symbol: 'n', meaning: 'Sample Size — the number of observations the sample proportion was computed from.' },
    { symbol: 'SE', meaning: 'Standard Error of the proportion under the null hypothesis, based on p₀ and n.' },
    { symbol: 'p', meaning: 'Sample Proportion — the observed rate in your data.' },
    { symbol: 'z', meaning: 'z-Statistic — how many standard errors the sample proportion is from the hypothesized proportion.' },
  ],
  'z-test-prop-2samp': [
    { symbol: '\\hat{p}', meaning: 'Pooled Proportion — the combined success rate across both groups, used only to compute the test standard error.' },
    { symbol: 'n_1', meaning: 'Group 1 Size — the number of observations in Group 1.' },
    { symbol: 'p_1', meaning: 'Group 1 Proportion — the observed rate in Group 1.' },
    { symbol: 'n_2', meaning: 'Group 2 Size — the number of observations in Group 2.' },
    { symbol: 'p_2', meaning: 'Group 2 Proportion — the observed rate in Group 2.' },
    { symbol: 'SE_{pooled}', meaning: 'Standard Error of the proportion difference under the null hypothesis that the two rates are equal.' },
    { symbol: 'z', meaning: 'z-Statistic — how many standard errors the two group proportions are apart.' },
  ],
  'binomial-hyp-test': [
    { symbol: 'H_0', meaning: 'Null Hypothesis — the true proportion equals the hypothesized proportion p₀.' },
    { symbol: 'H_a', meaning: 'Alternative Hypothesis — the true proportion differs from p₀.' },
    { symbol: 'p', meaning: "The generic probability used in the formula; in this calculator it stands for the Hypothesized Proportion (p₀) plugged into each trial." },
    { symbol: 'P(X=k)', meaning: 'Probability of observing exactly k successes out of n trials if the true rate were p₀.' },
    { symbol: 'n', meaning: 'Number of Trials — the total number of patients/observations.' },
    { symbol: 'k', meaning: 'A possible count of successes, ranging from 0 to n, used when summing up probabilities.' },
    { symbol: 'x', meaning: 'Observed Successes — the actual number of successes seen in your data.' },
    { symbol: 'p_0', meaning: 'Hypothesized Proportion — the success rate assumed under the null hypothesis.' },
  ],
  'single-sample-ci': [
    { symbol: 's', meaning: 'Sample SD — the spread of the observed data.' },
    { symbol: 'n', meaning: 'Sample Size — the number of observations the mean and SD were computed from.' },
    { symbol: 'SE', meaning: 'Standard Error of the sample mean, computed as the sample SD divided by the square root of n.' },
    { symbol: '\\bar{x}', meaning: 'Sample Mean — the average observed in your data, and the center of the confidence interval.' },
    { symbol: 't_{\\alpha/2,\\,df}', meaning: 'The t-critical value used to set how wide the interval is, based on the confidence level and degrees of freedom.' },
    { symbol: 'df', meaning: 'Degrees of Freedom, equal to sample size minus 1.' },
    { symbol: '\\alpha', meaning: 'One minus the chosen Confidence Level — the portion of uncertainty split between the two tails of the interval.' },
  ],
  'confidence-interval-proportion': [
    { symbol: 'p', meaning: 'Sample Proportion — the observed rate in your data, and the center of the confidence interval.' },
    { symbol: 'n', meaning: 'Sample Size — the number of observations the sample proportion was computed from.' },
    { symbol: 'SE', meaning: 'Standard Error of the sample proportion, based on p and n.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'The z-critical value used to set how wide the interval is, based on the chosen confidence level.' },
    { symbol: '\\alpha', meaning: 'One minus the chosen Confidence Level — the portion of uncertainty split between the two tails of the interval.' },
  ],

  // Chi-Square & Categorical
  'chi-square-2x2': [
    { symbol: '\\chi^2', meaning: 'Chi-square statistic testing whether the exposure (rows) and outcome (columns) are associated.' },
    { symbol: 'a, b, c, d', meaning: 'The four cell counts of the 2×2 table: exposed/outcome+, exposed/outcome−, unexposed/outcome+, unexposed/outcome−.' },
    { symbol: 'N', meaning: 'Total number of subjects across all four cells.' },
    { symbol: '\\chi^2_{Yates}', meaning: 'Chi-square statistic with a continuity correction applied for small expected counts.' },
    { symbol: '\\varphi', meaning: "Phi coefficient — a correlation-like measure of the strength of association between exposure and outcome." },
    { symbol: 'RR', meaning: 'Relative risk — how many times more likely the outcome is in the exposed group versus the unexposed group.' },
    { symbol: 'OR', meaning: 'Odds ratio — the odds of the outcome in the exposed group divided by the odds in the unexposed group.' },
  ],
  'chi-square-gof': [
    { symbol: '\\chi^2', meaning: 'Chi-square statistic summarizing how far the observed category counts are from the expected counts.' },
    { symbol: 'k', meaning: 'Number of categories being compared.' },
    { symbol: 'O_i', meaning: 'Observed count entered for category i.' },
    { symbol: 'E_i', meaning: 'Expected count entered for category i (the reference value being tested against).' },
    { symbol: 'df', meaning: 'Degrees of freedom for the test, equal to the number of categories minus one.' },
  ],
  'fishers-exact': [
    { symbol: 'P', meaning: 'Exact probability of one specific 2×2 table arrangement, computed from the hypergeometric distribution.' },
    { symbol: 'a, b, c, d', meaning: 'The four observed cell counts of the 2×2 table.' },
    { symbol: '\\dbinom{a+b}{a}', meaning: 'Number of ways to choose the observed count "a" from the first row total, used in the hypergeometric formula.' },
    { symbol: 'N', meaning: 'Total number of subjects across all four cells.' },
    { symbol: 'p', meaning: 'Two-sided exact p-value — the sum of probabilities of all tables at least as extreme as the one observed.' },
    { symbol: 'T', meaning: 'A possible 2×2 table with the same row and column totals as the observed data.' },
  ],
  'mcnemars-test': [
    { symbol: '\\chi^2', meaning: 'Chi-square statistic testing whether the Before/After status changed more in one direction than the other.' },
    { symbol: 'b, c', meaning: 'The two discordant cell counts — subjects who switched from Before+/After− (b) or Before−/After+ (c).' },
    { symbol: '\\chi^2_{corrected}', meaning: 'Continuity-corrected chi-square statistic, more accurate when the number of discordant pairs is small.' },
  ],
  'cochrans-q': [
    { symbol: 'Q', meaning: "Cochran's Q statistic testing whether success rates differ across the k paired conditions." },
    { symbol: 'k', meaning: 'Number of matched conditions (columns) each subject was tested on.' },
    { symbol: 'C_j', meaning: 'Total number of successes (1s) in condition (column) j across all subjects.' },
    { symbol: '\\bar{C}', meaning: 'Average number of successes per condition, across all k conditions.' },
    { symbol: 'R_i', meaning: 'Total number of successes (1s) for subject (row) i across all conditions.' },
    { symbol: 'df', meaning: 'Degrees of freedom for the test, equal to the number of conditions minus one.' },
  ],

  // Non-Parametric Tests
  'mann-whitney': [
    { symbol: 'U_1, U_2', meaning: 'Mann-Whitney U statistics for Group 1 and Group 2, derived from the rank sums of each group.' },
    { symbol: 'R_1, R_2', meaning: 'Sum of the combined-sample ranks assigned to Group 1 and Group 2 values.' },
    { symbol: 'n_1, n_2', meaning: 'Number of values entered in Group 1 and Group 2.' },
    { symbol: 'z', meaning: 'Standardized test statistic (normal approximation) used to obtain the p-value, corrected for ties and continuity.' },
    { symbol: 'N', meaning: 'Total sample size, the combined count of Group 1 and Group 2 values.' },
    { symbol: 't', meaning: 'Size of each group of tied (equal) values, used in the tie-correction term.' },
  ],
  'wilcoxon-signed-rank': [
    { symbol: 'W^{+}, W^{-}', meaning: 'Sum of ranks (by absolute value) for pairs where Sample 1 increased (W⁺) or decreased (W⁻) relative to Sample 2.' },
    { symbol: 'd_i', meaning: 'Difference between the Before and After value for pair i.' },
    { symbol: 'z', meaning: 'Standardized test statistic (normal approximation) used to obtain the p-value, corrected for ties and continuity.' },
    { symbol: 'n', meaning: 'Number of pairs with a non-zero Before/After difference (zero differences are dropped).' },
    { symbol: 't', meaning: 'Size of each group of tied (equal) absolute differences, used in the tie-correction term.' },
  ],
  'sign-test': [
    { symbol: 'n_{+}', meaning: 'Number of pairs where the value increased from Before to After (a positive difference).' },
    { symbol: 'n', meaning: 'Total number of usable pairs, i.e. pairs with a non-zero Before/After difference.' },
    { symbol: 'd_i', meaning: 'Difference between the Before and After value for pair i; only its sign is used.' },
    { symbol: 'p', meaning: 'Two-sided exact p-value from the binomial distribution, testing whether positive and negative changes are equally likely.' },
    { symbol: 'X', meaning: 'A Binomial(n, 0.5) random variable representing the count of positive differences under the null hypothesis.' },
  ],
  'kruskal-wallis': [
    { symbol: 'H', meaning: 'Kruskal-Wallis test statistic (tie-corrected), testing whether at least one group differs from the others.' },
    { symbol: 'N', meaning: 'Total sample size across all groups entered.' },
    { symbol: 'k', meaning: 'Number of groups being compared.' },
    { symbol: 'R_j', meaning: 'Sum of the combined-sample ranks assigned to values in group j.' },
    { symbol: 'n_j', meaning: 'Number of values entered in group j.' },
    { symbol: 'C', meaning: 'Tie-correction factor that adjusts H when the data contain repeated (tied) values.' },
    { symbol: 't', meaning: 'Size of each group of tied (equal) values, used in the tie-correction factor C.' },
  ],
  'dunns-test': [
    { symbol: 'z_{ij}', meaning: 'Standardized statistic for the pairwise comparison between group i and group j, based on their mean rank difference.' },
    { symbol: '\\bar{R}_i, \\bar{R}_j', meaning: 'Mean rank (from the shared Kruskal-Wallis ranking) of group i and group j.' },
    { symbol: 'N', meaning: 'Total sample size across all groups entered.' },
    { symbol: 't', meaning: 'Size of each group of tied (equal) values, used in the shared tie-correction term.' },
    { symbol: 'n_i, n_j', meaning: 'Number of values entered in group i and group j.' },
    { symbol: 'p_{(i)}^{Holm}', meaning: "Holm-adjusted p-value for the i-th ranked comparison, controlling the false-positive rate across all pairwise tests." },
    { symbol: 'm', meaning: 'Total number of pairwise comparisons being adjusted for.' },
    { symbol: 'p_{(j)}', meaning: 'Unadjusted p-value of the j-th comparison when comparisons are sorted from smallest to largest p-value.' },
  ],
  'friedman-test': [
    { symbol: 'Q', meaning: 'Friedman test statistic (tie-corrected), testing whether ratings differ systematically across the k conditions.' },
    { symbol: 'N', meaning: 'Number of subjects (rows), each rated across all conditions.' },
    { symbol: 'k', meaning: 'Number of matched conditions (columns) each subject was measured on.' },
    { symbol: 'R_j', meaning: 'Sum of the within-subject ranks assigned to condition (column) j across all subjects.' },
    { symbol: 't', meaning: 'Size of each group of tied (equal) values within a subject’s row, used in the tie-correction term.' },
  ],

  // ANOVA
  'anova-1way': [
    { symbol: 'SS_B', meaning: 'Sum of squares between groups — variation due to the differences among the drug doses’ means.' },
    { symbol: 'n_i', meaning: 'Number of patients (Size, n) in group i.' },
    { symbol: '\\bar{x}_i', meaning: 'Mean of group i.' },
    { symbol: '\\bar{x}', meaning: 'Grand mean — the average across all patients in all groups combined.' },
    { symbol: 'SS_W', meaning: 'Sum of squares within groups — leftover variation among patients inside the same dose group.' },
    { symbol: 's_i', meaning: 'Standard deviation (SD) entered for group i.' },
    { symbol: 'MS_B', meaning: 'Mean square between groups — SS_B divided by its degrees of freedom.' },
    { symbol: 'k', meaning: 'Number of groups (drug doses) being compared.' },
    { symbol: 'MS_W', meaning: 'Mean square within groups — SS_W divided by its degrees of freedom, the pooled within-group variance.' },
    { symbol: 'N', meaning: 'Total sample size across all groups combined.' },
    { symbol: 'F', meaning: 'F-statistic — ratio of between-group to within-group variance, tests if any dose means differ.' },
  ],
  'anova-2way': [
    { symbol: 'SS_A', meaning: 'Sum of squares for Factor A\'s main effect — variation explained by Factor A level alone.' },
    { symbol: 'b', meaning: 'Number of levels of Factor B.' },
    { symbol: '\\bar x_{i\\cdot}', meaning: 'Mean of all observations at level i of Factor A, averaged across Factor B.' },
    { symbol: '\\bar x', meaning: 'Grand mean across every observation in the design.' },
    { symbol: 'SS_B', meaning: 'Sum of squares for Factor B\'s main effect — variation explained by Factor B level alone.' },
    { symbol: 'a', meaning: 'Number of levels of Factor A.' },
    { symbol: 'n', meaning: 'Number of replicate observations per Factor A × Factor B cell.' },
    { symbol: '\\bar x_{\\cdot j}', meaning: 'Mean of all observations at level j of Factor B, averaged across Factor A.' },
    { symbol: 'SS_{AB}', meaning: 'Sum of squares for the interaction — how much the combined effect of A and B departs from adding their main effects.' },
    { symbol: '\\bar x_{ij}', meaning: 'Mean of the observations in the specific cell defined by Factor A level i and Factor B level j.' },
    { symbol: 'SS_E', meaning: 'Sum of squares for error — leftover variation among replicates within the same cell.' },
    { symbol: 'SS_T', meaning: 'Total sum of squares across all observations, split into the A, B, interaction, and error components.' },
  ],
  'anova-multifactor': [
    { symbol: 'SS_k', meaning: 'Sum of squares for the main effect of factor k (e.g. dose, diet, or exercise program).' },
    { symbol: 'N', meaning: 'Total number of observations (patients) in the study.' },
    { symbol: 'levels_k', meaning: 'Number of distinct levels that factor k takes on.' },
    { symbol: '\\bar x_{k,i}', meaning: 'Mean of all observations at level i of factor k.' },
    { symbol: '\\bar x', meaning: 'Grand mean across every observation in the study.' },
    { symbol: 'SS_E', meaning: 'Error sum of squares — leftover variation not explained by any factor\'s main effect (interactions fall in here too).' },
    { symbol: 'SS_T', meaning: 'Total sum of squares across all observations.' },
    { symbol: 'df_E', meaning: 'Degrees of freedom for error, after subtracting each factor\'s degrees of freedom from the total.' },
  ],
  'tukeys-hsd': [
    { symbol: 'HSD_{ij}', meaning: 'Honestly Significant Difference — the minimum mean gap between group i and group j needed to call them significantly different.' },
    { symbol: 'q_{\\alpha,k,df_W}', meaning: 'Critical value from the studentized range distribution at α = 0.05, based on the number of groups (k) and within-groups df.' },
    { symbol: 'MS_W', meaning: 'Mean square within groups, the pooled within-group variance from the underlying ANOVA.' },
    { symbol: 'n_i', meaning: 'Sample size of group i in the pair being compared.' },
    { symbol: 'n_j', meaning: 'Sample size of group j in the pair being compared.' },
    { symbol: '\\bar{x}_i', meaning: 'Mean of group i.' },
    { symbol: '\\bar{x}_j', meaning: 'Mean of group j.' },
  ],
  'repeated-measures-anova': [
    { symbol: 'SS_{cond}', meaning: 'Sum of squares for conditions — variation in scores explained by which condition was measured.' },
    { symbol: 'n', meaning: 'Number of subjects (rows) in the dataset.' },
    { symbol: '\\bar x_{\\cdot j}', meaning: 'Mean score for condition j, averaged across all subjects.' },
    { symbol: '\\bar x', meaning: 'Grand mean across all subject-condition measurements.' },
    { symbol: 'SS_{subj}', meaning: 'Sum of squares for subjects — variation due to some subjects scoring consistently higher or lower than others.' },
    { symbol: 'k', meaning: 'Number of conditions (columns) each subject was measured under.' },
    { symbol: '\\bar x_{i\\cdot}', meaning: 'Mean score for subject i, averaged across all their conditions.' },
    { symbol: 'SS_{error}', meaning: 'Leftover variation after removing both the condition effect and the subject effect.' },
    { symbol: 'SS_T', meaning: 'Total sum of squares across every measurement in the subjects × conditions matrix.' },
    { symbol: 'F', meaning: 'F-statistic — ratio of the condition effect\'s mean square to the error mean square, with the between-subject variation removed.' },
  ],

  // Correlation & Regression
  'pearson-r': [
    { symbol: 'r', meaning: 'Pearson correlation coefficient — strength and direction of the linear relationship between X and Y.' },
    { symbol: 'S_{xy}', meaning: 'Sum of cross-products of X and Y deviations from their means, measuring how the two variables co-vary.' },
    { symbol: 'S_{xx}', meaning: 'Sum of squared deviations of X from its mean, measuring how much X varies.' },
    { symbol: 'S_{yy}', meaning: 'Sum of squared deviations of Y from its mean, measuring how much Y varies.' },
    { symbol: 't', meaning: 't-statistic testing whether the observed correlation r is significantly different from zero.' },
    { symbol: 'n', meaning: 'Number of paired X/Y observations entered.' },
    { symbol: 'z', meaning: "Fisher's z-transformation of r, used to build a confidence interval on a scale where r behaves more normally." },
    { symbol: 'SE(z)', meaning: "Standard error of Fisher's z, used to compute the 95% CI before converting back to the r scale." },
  ],
  'se-correlation': [
    { symbol: 'SE(r)', meaning: 'Standard error of the entered correlation coefficient r — how precisely it estimates the true population correlation.' },
    { symbol: 'r', meaning: 'The correlation coefficient you entered (between BMI and blood pressure in the example).' },
    { symbol: 'n', meaning: 'Sample size the correlation was computed from.' },
    { symbol: 't', meaning: 't-statistic for testing whether r is significantly different from zero, with df = n − 2.' },
    { symbol: 'z', meaning: "Fisher's z-transform of r, used to build a confidence interval on a more normally-behaved scale." },
    { symbol: 'SE(z)', meaning: "Standard error of Fisher's z, used together with z to compute the 95% CI for r." },
  ],
  'spearman-rho': [
    { symbol: '\\rho', meaning: "Spearman's rank correlation — the Pearson correlation computed on the ranks of X and Y instead of their raw values." },
    { symbol: 'S_{xy}^{rank}', meaning: 'Sum of cross-products of the rank deviations of X and Y from their mean ranks.' },
    { symbol: 'S_{xx}^{rank}', meaning: 'Sum of squared deviations of the ranks of X from their mean rank.' },
    { symbol: 'S_{yy}^{rank}', meaning: 'Sum of squared deviations of the ranks of Y from their mean rank.' },
    { symbol: 't', meaning: 't-statistic approximating the significance of ρ, treating it like a Pearson r on the ranks.' },
    { symbol: 'n', meaning: 'Number of paired X/Y observations (e.g. patients) entered.' },
  ],
  'kendalls-tau': [
    { symbol: 'n_C', meaning: 'Number of concordant pairs — pairs of observations where X and Y rank in the same order.' },
    { symbol: 'n_D', meaning: 'Number of discordant pairs — pairs where X and Y rank in opposite order.' },
    { symbol: 'n', meaning: 'Number of paired observations (e.g. patients) entered.' },
    { symbol: 'n_0', meaning: 'Total number of possible pairs among the n observations, n(n−1)/2.' },
    { symbol: '\\tau_b', meaning: "Kendall's Tau-b — tie-corrected measure of association based on concordant vs. discordant pairs." },
    { symbol: 'n_X', meaning: 'Number of pairs tied on X, used to correct τᵦ for ties.' },
    { symbol: 'n_Y', meaning: 'Number of pairs tied on Y, used to correct τᵦ for ties.' },
    { symbol: 'z', meaning: 'Normal-approximation z-statistic testing whether τᵦ is significantly different from zero.' },
  ],
  'simple-regression': [
    { symbol: '\\beta_1', meaning: 'Slope of the fitted line — the predicted change in Y for a 1-unit increase in X.' },
    { symbol: 'S_{xy}', meaning: 'Sum of cross-products of X and Y deviations from their means, used to compute the slope.' },
    { symbol: 'S_{xx}', meaning: 'Sum of squared deviations of X from its mean, used to compute the slope.' },
    { symbol: '\\beta_0', meaning: 'Intercept of the fitted line — the predicted Y value when X is zero.' },
    { symbol: '\\bar{y}', meaning: 'Mean of all Y values entered.' },
    { symbol: '\\bar{x}', meaning: 'Mean of all X values entered.' },
    { symbol: 'SST', meaning: 'Total sum of squares — total variation in Y around its mean.' },
    { symbol: 'SSR', meaning: 'Regression sum of squares — variation in Y explained by the fitted line.' },
    { symbol: 'SSE', meaning: 'Error (residual) sum of squares — variation in Y left unexplained by the line.' },
    { symbol: 'R^2', meaning: 'Proportion of the variation in Y explained by X, from 0 to 1.' },
    { symbol: 'F', meaning: 'F-statistic testing whether the regression as a whole is significantly better than predicting the mean of Y.' },
    { symbol: 'n', meaning: 'Number of paired X/Y observations entered.' },
  ],
  'multiple-regression': [
    { symbol: '\\hat{\\beta}', meaning: 'Vector of estimated regression coefficients (intercept plus one slope per predictor).' },
    { symbol: 'X', meaning: "Matrix of predictor values (with a column of 1's for the intercept) built from the entered data." },
    { symbol: 'y', meaning: 'Column vector of the outcome (Y) values entered, e.g. blood pressure.' },
    { symbol: 'SE(\\hat\\beta_j)', meaning: "Standard error of coefficient j — how precisely that predictor's effect on Y is estimated." },
    { symbol: 'MSE', meaning: 'Mean squared error — average squared residual, used to scale the coefficient standard errors.' },
    { symbol: 'SSE', meaning: 'Error sum of squares — total squared distance between observed and predicted Y values.' },
    { symbol: 'n', meaning: 'Number of observations (rows of data) entered.' },
    { symbol: 'k', meaning: 'Number of predictors in the model (excluding the intercept).' },
    { symbol: 'R^2', meaning: 'Proportion of the variation in Y jointly explained by all predictors together.' },
    { symbol: 'SST', meaning: 'Total sum of squares — total variation in Y around its mean.' },
    { symbol: 'R^2_{adj}', meaning: 'R² adjusted for the number of predictors, penalizing models that add predictors without real explanatory power.' },
    { symbol: 'F', meaning: 'F-statistic testing whether the full set of predictors together significantly explains Y.' },
    { symbol: 'SSR', meaning: 'Regression sum of squares — variation in Y explained by all the predictors combined.' },
  ],
  'logistic-regression': [
    { symbol: 'P(Y=1)', meaning: 'Predicted probability of the outcome occurring given the exposure value X.' },
    { symbol: '\\beta_0', meaning: 'Intercept — the log-odds of the outcome when X = 0 (unexposed), valid only for cohort/cross-sectional designs.' },
    { symbol: '\\beta_1', meaning: 'Slope — the log odds ratio for the outcome comparing exposed (X=1) to unexposed (X=0).' },
    { symbol: 'X', meaning: 'The binary exposure predictor (1 = exposed, 0 = unexposed).' },
    { symbol: 'c', meaning: 'Count of unexposed subjects with the outcome (2×2 table cell), used to compute β₀.' },
    { symbol: 'd', meaning: 'Count of unexposed subjects without the outcome (2×2 table cell), used to compute β₀.' },
    { symbol: 'OR', meaning: 'Odds ratio — exponentiated slope, the odds of the outcome in the exposed group relative to the unexposed group.' },
    { symbol: 'a', meaning: 'Count of exposed subjects with the outcome (2×2 table cell), used to compute the odds ratio.' },
    { symbol: 'b', meaning: 'Count of exposed subjects without the outcome (2×2 table cell), used to compute the odds ratio.' },
    { symbol: 'SE(\\beta_0)', meaning: "Wald standard error of the intercept, based on the unexposed group's cell counts (c, d)." },
    { symbol: 'SE(\\beta_1)', meaning: 'Wald standard error of the slope, based on all four 2×2 table cell counts.' },
  ],
  'multivariable-predictor': [
    { symbol: '\\eta', meaning: 'Linear predictor — the intercept plus every predictor’s coefficient times its value, added together.' },
    { symbol: '\\beta_0', meaning: 'Intercept — the predicted value (or log-odds, for a binary outcome) when every predictor is 0.' },
    { symbol: '\\beta_i', meaning: 'Coefficient for predictor i — how much the outcome (or log-odds) changes per 1-unit increase in that predictor, from your own fitted model or a published equation.' },
    { symbol: 'x_i', meaning: 'Value of predictor i for the individual being scored — e.g. a diet score, exercise days per week, or number of medications.' },
    { symbol: '\\hat{y}', meaning: 'Predicted outcome for a continuous outcome — simply equal to the linear predictor η.' },
    { symbol: '\\hat{P}(Y=1)', meaning: 'Predicted probability for a binary outcome — the logistic transform of η, always between 0 and 1.' },
  ],

  // Effect Sizes & Agreement
  'cohens-d': [
    { symbol: 's_{\\text{pooled}}', meaning: 'Pooled standard deviation combining both groups’ SDs, weighted by their sample sizes, used as the common scale.' },
    { symbol: 'n_1', meaning: 'Sample size of Group 1.' },
    { symbol: 's_1', meaning: 'Standard deviation of Group 1.' },
    { symbol: 'n_2', meaning: 'Sample size of Group 2.' },
    { symbol: 's_2', meaning: 'Standard deviation of Group 2.' },
    { symbol: 'd', meaning: "Cohen's d — the difference between the two group means, expressed in pooled-SD units." },
    { symbol: '\\bar{x}_1', meaning: 'Mean of Group 1.' },
    { symbol: '\\bar{x}_2', meaning: 'Mean of Group 2.' },
  ],
  'cramers-v': [
    { symbol: '\\chi^2', meaning: 'Chi-square statistic summarizing how far the observed table counts deviate from what independence would predict.' },
    { symbol: 'O_{ij}', meaning: 'Observed count in row i, column j of the contingency table.' },
    { symbol: 'E_{ij}', meaning: 'Expected count in cell (i,j) if the row and column categories were independent.' },
    { symbol: 'R_i', meaning: 'Total count in row i (a row’s total across all columns).' },
    { symbol: 'C_j', meaning: 'Total count in column j (a column’s total across all rows).' },
    { symbol: 'N', meaning: 'Grand total of all counts in the contingency table.' },
    { symbol: 'V', meaning: "Cramer's V — the strength of association between the two categorical variables, scaled to 0–1 regardless of table size." },
    { symbol: 'r', meaning: 'Number of rows (categories of the first variable) in the table.' },
    { symbol: 'c', meaning: 'Number of columns (categories of the second variable) in the table.' },
  ],
  'phi-coefficient': [
    { symbol: '\\varphi', meaning: 'Phi coefficient — the strength and direction of association between the two binary variables in the 2×2 table.' },
    { symbol: 'a', meaning: 'Count of cases positive on both Variable A and Variable B.' },
    { symbol: 'b', meaning: 'Count of cases positive on Variable A but negative on Variable B.' },
    { symbol: 'c', meaning: 'Count of cases negative on Variable A but positive on Variable B.' },
    { symbol: 'd', meaning: 'Count of cases negative on both Variable A and Variable B.' },
    { symbol: 'N', meaning: 'Total number of cases across all four cells.' },
    { symbol: '\\chi^2', meaning: 'Chi-square statistic equivalent to the phi coefficient for this 2×2 table, used to test significance.' },
  ],
  'cohens-kappa': [
    { symbol: 'p_0', meaning: 'Observed agreement — the proportion of cases where Rater 1 and Rater 2 assigned the same category.' },
    { symbol: 'n_{ii}', meaning: 'Count of cases where both raters agreed on category i (a diagonal cell of the agreement table).' },
    { symbol: 'N', meaning: 'Total number of cases rated.' },
    { symbol: 'p_e', meaning: 'Expected agreement — the proportion of agreement predicted by chance alone, given each rater’s category totals.' },
    { symbol: 'R_i', meaning: 'Total number of cases Rater 1 assigned to category i (row total).' },
    { symbol: 'C_i', meaning: 'Total number of cases Rater 2 assigned to category i (column total).' },
    { symbol: '\\kappa', meaning: "Cohen's kappa — the agreement between the two raters after removing the amount expected by chance." },
    { symbol: 'SE(\\kappa)', meaning: 'Standard error of kappa, used to build its confidence interval.' },
  ],
  'weighted-kappa': [
    { symbol: 'w_{ij}', meaning: 'Disagreement weight for rating pair (i, j) — larger when the two ordinal categories are farther apart.' },
    { symbol: 'i', meaning: 'Category assigned by Rater 1 (row position on the ordinal scale).' },
    { symbol: 'j', meaning: 'Category assigned by Rater 2 (column position on the ordinal scale).' },
    { symbol: 'k', meaning: 'Number of ordered categories on the rating scale.' },
    { symbol: '\\kappa_w', meaning: 'Weighted kappa — chance-corrected agreement that penalizes larger rating discrepancies more heavily.' },
    { symbol: 'n_{ij}', meaning: 'Observed count of cases rated i by Rater 1 and j by Rater 2.' },
    { symbol: 'N', meaning: 'Total number of cases rated by both raters.' },
    { symbol: 'R_i', meaning: 'Total number of cases Rater 1 assigned to category i (row total).' },
    { symbol: 'C_j', meaning: 'Total number of cases Rater 2 assigned to category j (column total).' },
  ],
  'icc': [
    { symbol: 'MS_B', meaning: 'Mean square between subjects — average variability in scores from one subject to another.' },
    { symbol: 'SS_B', meaning: 'Sum of squares between subjects, before dividing by its degrees of freedom.' },
    { symbol: 'k', meaning: 'Number of subjects being measured.' },
    { symbol: 'MS_W', meaning: 'Mean square within subjects — average variability among repeated measurements on the same subject.' },
    { symbol: 'SS_W', meaning: 'Sum of squares within subjects, before dividing by its degrees of freedom.' },
    { symbol: 'n', meaning: 'Number of raters or occasions each subject was measured on.' },
    { symbol: 'ICC', meaning: 'Intraclass correlation — the share of total measurement variance that reflects true differences between subjects rather than rater/occasion inconsistency.' },
  ],
  'bland-altman': [
    { symbol: 'M_i', meaning: 'Average of Method A and Method B readings for subject i, plotted on the x-axis.' },
    { symbol: 'A_i', meaning: 'Method A measurement for subject i.' },
    { symbol: 'B_i', meaning: 'Method B measurement for subject i.' },
    { symbol: 'D_i', meaning: 'Difference between Method A and Method B for subject i, plotted on the y-axis.' },
    { symbol: '\\text{LoA}', meaning: 'Limits of agreement — the range within which 95% of future differences between the two methods are expected to fall.' },
    { symbol: '\\bar{D}', meaning: 'Mean bias — the average difference between Method A and Method B across all subjects.' },
    { symbol: 's_D', meaning: 'Standard deviation of the paired differences between the two methods.' },
    { symbol: 'SE(\\text{LoA})', meaning: 'Standard error of the limits of agreement, used to build a confidence interval around each limit.' },
    { symbol: 'n', meaning: 'Number of paired measurements (subjects measured by both methods).' },
  ],
  'eta-squared': [
    { symbol: 'SS_B', meaning: 'Sum of squares between groups — variability explained by differences among the group means.' },
    { symbol: 'n_j', meaning: 'Number of data points in group j.' },
    { symbol: '\\bar{x}_j', meaning: 'Mean of group j.' },
    { symbol: '\\bar{x}', meaning: 'Grand mean across all groups combined.' },
    { symbol: 'SS_T', meaning: 'Total sum of squares — all variability in the data, between and within groups combined.' },
    { symbol: 'SS_W', meaning: 'Sum of squares within groups — variability left over after accounting for group differences.' },
    { symbol: '\\eta^2', meaning: 'Eta-squared — the proportion of total variance in the outcome explained by group membership.' },
  ],
  'cronbachs-alpha': [
    { symbol: '\\alpha', meaning: "Cronbach's alpha — how consistently the scale's items measure the same underlying construct." },
    { symbol: 'k', meaning: 'Number of items (questions) in the scale.' },
    { symbol: 's_j^2', meaning: 'Variance of respondents’ scores on item j.' },
    { symbol: 's_{total}^2', meaning: 'Variance of respondents’ total (summed) scores across all items.' },
  ],

  // Power & Sample Size
  'power-calculations': [
    { symbol: '\\text{Power}', meaning: 'Probability the test correctly detects the effect δ, given the chosen α (equals 1 − β).' },
    { symbol: '\\Phi', meaning: 'The standard normal cumulative distribution function, used to convert z-scores into probabilities.' },
    { symbol: 'z_{1-\\alpha}', meaning: 'One-tailed critical z-value corresponding to the Significance Level α.' },
    { symbol: '\\delta', meaning: 'Effect Size — the true difference between the alternative mean and the null mean (μA − μ₀).' },
    { symbol: 'SE', meaning: 'Standard Error of the mean, computed from the Standard Deviation (σ) and Sample Size (n).' },
    { symbol: '\\sigma', meaning: 'Standard Deviation (σ) of the outcome in the population.' },
    { symbol: 'n', meaning: 'Sample Size (n) used in the study.' },
    { symbol: 'z_{1-\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level α.' },
    { symbol: '\\alpha', meaning: 'Significance Level (α) — the chance of a false positive the test is willing to accept.' },
  ],
  'power-with-graph': [
    { symbol: '\\text{Test Direction}', meaning: 'Toggles between a one-tailed test (checks only for an increase above μ₀) and a two-tailed test (checks for a difference in either direction).' },
    { symbol: '\\text{Critical}', meaning: 'The cutoff value(s) beyond which a result is declared significant under the null hypothesis — one cutoff for one-tailed, two (lower and upper) for two-tailed.' },
    { symbol: '\\mu_0', meaning: 'Null Hypothesis Mean (μ₀) — the baseline value assumed if there is no real effect.' },
    { symbol: 'z_{1-\\alpha}', meaning: 'One-tailed critical z-value corresponding to the Significance Level (α), used when Test Direction is One-Tailed.' },
    { symbol: 'z_{1-\\alpha/2}', meaning: 'Two-tailed critical z-value — α split evenly between both tails — used when Test Direction is Two-Tailed.' },
    { symbol: 'SE', meaning: 'Standard Error of the mean, computed from the Standard Deviation (σ) and Sample Size (n).' },
    { symbol: '\\sigma', meaning: 'Standard Deviation (σ) of the outcome in the population.' },
    { symbol: 'n', meaning: 'Sample Size (n).' },
    { symbol: '\\beta', meaning: 'Beta (β) — the probability of missing the true effect (area under Hₐ in the "fail to reject" zone).' },
    { symbol: '\\mu_A', meaning: 'Alternative Mean (μA) — the mean expected if the treatment effect is real; sets the effect size.' },
    { symbol: '\\text{Power}', meaning: 'Power (1 − β) — the probability of correctly detecting the shift from μ₀ to μA.' },
  ],
  'power-vs-es-alpha': [
    { symbol: '\\text{Power}(\\delta)', meaning: 'Power viewed as a curve across a whole range of possible Effect Size (δ) values.' },
    { symbol: '\\Phi', meaning: 'The standard normal cumulative distribution function, used to convert z-scores into probabilities.' },
    { symbol: 'z_{1-\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level (α) to highlight.' },
    { symbol: '\\delta', meaning: 'Effect Size (δ) — the true difference being tested for, highlighted on the power curve.' },
    { symbol: 'SE', meaning: 'Standard Error of the mean, computed from the Standard Deviation (σ) and Sample Size (n).' },
    { symbol: '\\alpha', meaning: 'Significance Level (α) to highlight — one of the benchmark curves plotted (.01/.05/.10).' },
  ],
  'posthoc-power': [
    { symbol: '\\text{Power}', meaning: "Achieved (post-hoc) power — the power implied by the study's own observed results." },
    { symbol: '\\Phi', meaning: 'The standard normal cumulative distribution function, used to convert z-scores into probabilities.' },
    { symbol: 'z_{1-\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level (α).' },
    { symbol: '\\hat\\delta', meaning: 'Observed Effect Size (δ̂) — the difference actually measured in the completed study.' },
    { symbol: 'SE', meaning: 'Standard Error of the mean, computed from the Observed Standard Deviation (σ) and Sample Size (n).' },
  ],
  'sample-size-1mean': [
    { symbol: 'n', meaning: 'Required Sample Size — the number of subjects needed to achieve the target power.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level (α, two-tailed).' },
    { symbol: 'z_{power}', meaning: 'Critical z-value corresponding to the Target Power (1−β).' },
    { symbol: '\\sigma', meaning: 'Population SD (σ) of the value being measured.' },
    { symbol: '\\delta', meaning: 'Minimum Detectable Difference (δ) from the hypothesised mean that the study should be able to detect.' },
  ],
  'sample-size-2mean': [
    { symbol: 'n_{\\text{per group}}', meaning: 'Required Sample Size (per group) — subjects needed in each of the two groups.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level (α, two-tailed).' },
    { symbol: 'z_{power}', meaning: 'Critical z-value corresponding to the Target Power (1−β).' },
    { symbol: '\\sigma', meaning: 'Common Population SD (σ) shared by both groups.' },
    { symbol: '\\delta', meaning: 'Minimum Detectable Mean Difference (δ) between the two groups.' },
  ],
  'sample-size-1prop': [
    { symbol: 'n', meaning: 'Required Sample Size — the number of subjects needed to achieve the target power.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level (α, two-tailed).' },
    { symbol: 'z_{power}', meaning: 'Critical z-value corresponding to the Target Power (1−β).' },
    { symbol: 'p_0', meaning: 'Hypothesized Proportion (p₀) — the baseline rate assumed under the null hypothesis.' },
    { symbol: 'p_1', meaning: 'Alternative Proportion (p₁) — the rate the study hopes to detect if the effect is real.' },
  ],
  'sample-size-2prop': [
    { symbol: 'n_{\\text{per group}}', meaning: 'Required Sample Size (per group) — subjects needed in each of the two groups.' },
    { symbol: 'z_{\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to the Significance Level (α, two-tailed).' },
    { symbol: '\\bar p', meaning: 'Pooled Proportion — the average of Group 1 and Group 2 Proportions, used under the null hypothesis.' },
    { symbol: 'z_{power}', meaning: 'Critical z-value corresponding to the Target Power (1−β).' },
    { symbol: 'p_1', meaning: 'Group 1 Proportion (p₁) — the expected rate in the first group (e.g. treatment).' },
    { symbol: 'p_2', meaning: 'Group 2 Proportion (p₂) — the expected rate in the second group (e.g. placebo).' },
  ],
  'sample-size-survey': [
    { symbol: 'z', meaning: 'Critical value from the standard normal distribution for the chosen confidence level (e.g. 1.96 for 95%).' },
    { symbol: 'p', meaning: 'Expected proportion in the population — use 0.5 if unknown, since it requires the largest sample size.' },
    { symbol: 'e', meaning: 'Margin of error — how close you want the estimate to the true population proportion.' },
    { symbol: 'n_0', meaning: 'Base required sample size before any adjustments.' },
    { symbol: 'N', meaning: 'Known population size, used only for the finite population correction.' },
    { symbol: 'n_{adj}', meaning: 'Sample size after finite population correction.' },
  ],
  'power-ppv-fpp': [
    { symbol: 'R', meaning: 'Pre-Study Odds — the ratio of the probability an effect is real to the probability it is not.' },
    { symbol: '\\pi', meaning: 'Pre-Study Probability H₁ True (π) — the estimated chance the tested effect is genuinely real before the study runs.' },
    { symbol: 'PPV', meaning: 'Positive Predictive Value — the chance a "significant" finding reflects a genuinely real effect.' },
    { symbol: '\\beta', meaning: 'Beta (β) — the probability of missing a true effect; here derived from the entered Statistical Power (1 − β).' },
    { symbol: '\\alpha', meaning: 'Significance Level (α) — the chance of declaring a false effect "significant."' },
    { symbol: 'FPP', meaning: 'False Positive Probability — the chance a "significant" finding is actually a false positive (1 − PPV).' },
  ],
  'power-delta-alpha': [
    { symbol: '\\text{Power}(\\delta,\\alpha)', meaning: 'Power evaluated across a whole reference table of Effect Size (δ) and Significance Level (α) values at once.' },
    { symbol: '\\Phi', meaning: 'The standard normal cumulative distribution function, used to convert z-scores into probabilities.' },
    { symbol: 'z_{1-\\alpha/2}', meaning: 'Two-tailed critical z-value corresponding to a given Significance Level (α) in the table.' },
    { symbol: '\\delta', meaning: 'Effect Size (δ) — the true difference being tested for, highlighted in the table.' },
    { symbol: 'SE', meaning: 'Standard Error of the mean, computed from the Standard Deviation (σ) and Sample Size (n).' },
    { symbol: '\\alpha', meaning: 'Significance Level (α) to highlight in the reference table.' },
  ],
  'type1-type2-errors': [
    { symbol: '\\alpha', meaning: 'Significance Level — the probability of a Type I error (a false positive), set directly by the slider.' },
    { symbol: '\\text{Power}', meaning: 'Statistical Power (1 − β) — the probability of correctly detecting a real effect, set directly by the slider.' },
    { symbol: '\\beta', meaning: 'Type II error rate — the probability of missing a real effect (a false negative), derived as 1 − Power.' },
  ],

  // Epidemiology & Risk
  'measures-of-association': [
    { symbol: 'a, b, c, d', meaning: 'The four 2×2 table cell counts: exposed/unexposed crossed with outcome present/absent.' },
    { symbol: 'AR_{+}, AR_{-}', meaning: 'Absolute risk (proportion with the outcome) in the exposed group and the unexposed group.' },
    { symbol: 'n', meaning: "Size of the exposed or unexposed group, used to compute that group's own confidence interval on AR." },
    { symbol: 'RR', meaning: 'Relative risk — ratio of absolute risk in the exposed group to the unexposed group.' },
    { symbol: 'OR', meaning: 'Odds ratio — the cross-product ratio (a·d)/(b·c) comparing outcome odds between groups.' },
    { symbol: '\\widehat{SE}_{\\ln RR}, \\widehat{SE}_{\\ln OR}', meaning: 'Standard errors of the log-transformed RR and OR, used to build their exponentiated confidence intervals.' },
    { symbol: 'z', meaning: 'Two-proportion z-test statistic comparing the exposed and unexposed absolute risks.' },
    { symbol: '\\hat{p}', meaning: 'Pooled proportion with the outcome across both groups combined, used under the null hypothesis of no difference.' },
    { symbol: 'n_1, n_2', meaning: 'Total number of subjects in the exposed group (n₁) and unexposed group (n₂).' },
    { symbol: '\\chi^2', meaning: 'Chi-square statistic testing whether exposure and outcome are independent in the table.' },
    { symbol: 'N', meaning: 'Total sample size across all four cells (n₁ + n₂), used in the chi-square formula.' },
  ],
  'se-lnrr-lnor': [
    { symbol: 'p_1, p_2', meaning: 'Proportion with the outcome in the exposed group (p₁) and the unexposed group (p₂).' },
    { symbol: 'n_1, n_2', meaning: 'Total number of subjects in the exposed group (n₁) and the unexposed group (n₂).' },
    { symbol: 'SE(p_1-p_2)', meaning: 'Standard error of the absolute difference in outcome proportions between the two groups.' },
    { symbol: 'a, b, c, d', meaning: 'The four 2×2 cell counts: exposed/unexposed crossed with outcome present/absent.' },
    { symbol: 'SE(\\ln RR)', meaning: 'Standard error of the log relative risk — the precision measure used to build a CI for RR.' },
    { symbol: 'SE(\\ln OR)', meaning: 'Standard error of the log odds ratio — the precision measure used to build a CI for OR.' },
  ],
  'se-rate': [
    { symbol: 'D', meaning: 'Number of events observed during follow-up.' },
    { symbol: 'PT', meaning: 'Total person-time accumulated by the group being followed.' },
    { symbol: 'Rate', meaning: 'Incidence rate — events per unit of person-time (D / PT).' },
    { symbol: 'SE(Rate)', meaning: 'Standard error of the rate, based on the Poisson assumption that events follow a Poisson distribution.' },
    { symbol: 'SE(\\ln Rate)', meaning: 'Standard error of the log-transformed rate, used to build a CI on the log scale before converting back.' },
    { symbol: 'CI', meaning: "The rate's 95% confidence interval, found by exponentiating ±1.96 × SE(ln Rate) around the rate." },
  ],
  'se-rate-ratio': [
    { symbol: 'D_1, PT_1', meaning: "Group 1's number of events and total person-time." },
    { symbol: 'D_2, PT_2', meaning: "Group 2's number of events and total person-time." },
    { symbol: 'IRR', meaning: "Incidence rate ratio — Group 1's rate divided by Group 2's rate." },
    { symbol: 'SE(\\ln IRR)', meaning: 'Standard error of the log rate ratio, driven mainly by whichever group has fewer events.' },
    { symbol: 'CI', meaning: "The rate ratio's 95% confidence interval, from exponentiating ±1.96 × SE(ln IRR) around the IRR." },
  ],
  'or-to-nnt-nnh': [
    { symbol: 'OR', meaning: 'Odds ratio reported by the trial or study being converted.' },
    { symbol: 'CER', meaning: 'Control event rate — the baseline probability of the event without treatment.' },
    { symbol: 'RR', meaning: 'Relative risk implied by the OR at this particular baseline rate.' },
    { symbol: 'EER', meaning: 'Experimental event rate — the event rate expected in the treated group (CER × RR).' },
    { symbol: 'ARD', meaning: 'Absolute risk difference between the control and experimental event rates.' },
    { symbol: 'NNT / NNH', meaning: 'Number needed to treat to prevent one event (if OR < 1) or number needed to harm to cause one event (if OR > 1).' },
  ],
  'or-to-rr': [
    { symbol: 'OR', meaning: 'Odds ratio being converted, typically from a case-control study.' },
    { symbol: 'CER', meaning: "Control event rate — the outcome's baseline probability in the unexposed/untreated group." },
    { symbol: 'RR', meaning: 'Risk ratio implied by the odds ratio once the baseline rate is taken into account.' },
    { symbol: 'EER', meaning: 'Experimental event rate — the event rate implied for the exposed/treated group (CER × RR).' },
  ],
  'attributable-fraction': [
    { symbol: 'RR', meaning: 'Relative risk of the disease comparing exposed to unexposed individuals.' },
    { symbol: 'AF_e', meaning: "Attributable fraction among the exposed — the share of exposed cases' risk that is due to the exposure." },
    { symbol: 'P_e', meaning: 'Proportion of the overall population that is exposed.' },
    { symbol: 'PAF', meaning: 'Population attributable fraction — the share of all disease cases in the population attributable to the exposure.' },
  ],
  'par': [
    { symbol: 'P_e', meaning: 'Proportion of the population that is exposed.' },
    { symbol: 'I_e', meaning: 'Incidence of disease among the exposed.' },
    { symbol: 'I_u', meaning: 'Incidence of disease among the unexposed.' },
    { symbol: 'PAR', meaning: 'Population attributable risk — the absolute reduction in population-wide incidence if the exposure were eliminated.' },
    { symbol: 'PAR\\%', meaning: "PAR expressed as a percentage of the population's total disease incidence." },
    { symbol: 'I_{total}', meaning: 'Overall population incidence, the exposure-weighted average of the exposed and unexposed incidence rates.' },
  ],
  'incidence-rate': [
    { symbol: 'D', meaning: "A group's number of observed events." },
    { symbol: 'PT', meaning: "A group's total accumulated person-time." },
    { symbol: 'Rate', meaning: "Incidence rate for a group — its events divided by its person-time." },
    { symbol: 'D_1, PT_1', meaning: "Group 1's event count and person-time." },
    { symbol: 'D_2, PT_2', meaning: "Group 2's event count and person-time." },
    { symbol: 'IRR', meaning: "Incidence rate ratio — Group 1's rate divided by Group 2's rate." },
  ],
  'ipw-ate': [
    { symbol: 'T_i', meaning: "Subject i's treatment status (1 if treated, 0 if untreated)." },
    { symbol: 'PS_i', meaning: "Subject i's propensity score — their estimated probability of receiving the treatment they actually got." },
    { symbol: 'IPW_i', meaning: "Subject i's inverse probability weight, 1/PS_i if treated or 1/(1-PS_i) if untreated, correcting for confounding by indication." },
    { symbol: 'Y_i', meaning: "Subject i's observed outcome (0 or 1)." },
    { symbol: 'ATE', meaning: 'IPW-adjusted average treatment effect — the weighted mean outcome difference between treated and untreated subjects.' },
  ],
  'assoc-pred-intervals': [
    { symbol: '\\widehat\\theta', meaning: 'Pooled OR/RR — the inverse-variance-weighted average of the studies\' log effect estimates.' },
    { symbol: 'w_i', meaning: 'Weight given to study i in the pooling, equal to the inverse of its squared SE.' },
    { symbol: '\\theta_i', meaning: "Study i's own reported OR/RR." },
    { symbol: 'SE_i', meaning: "Study i's standard error of its log OR/RR." },
    { symbol: 'Q', meaning: "Cochran's Q — a statistic testing whether the studies' effects differ more than chance alone would explain." },
    { symbol: 'df', meaning: 'Degrees of freedom for the heterogeneity test, equal to the number of studies minus 1.' },
    { symbol: 'C', meaning: "A scaling factor derived from the studies' weights, used to convert excess Q into a variance." },
    { symbol: '\\tau^2', meaning: 'Estimated between-study variance (true heterogeneity beyond chance), on the log scale.' },
    { symbol: 'SE', meaning: 'Standard error of the pooled log effect estimate.' },
    { symbol: 't_{df,\\,0.975}', meaning: 'Critical value from the t-distribution used to build the 95% pooled CI and prediction interval.' },
    { symbol: 'PI', meaning: "The 95% prediction interval — the range a new, similar study's true effect would plausibly fall in." },
  ],

  // Diagnostic Testing
  'sensitivity-specificity': [
    { symbol: 'Se', meaning: 'Sensitivity — the proportion of people who truly have the disease that the test correctly identifies as positive.' },
    { symbol: 'a', meaning: 'True Positive count — patients who test positive and truly have the disease.' },
    { symbol: 'c', meaning: 'False Negative count — patients who test negative but truly have the disease.' },
    { symbol: 'Sp', meaning: 'Specificity — the proportion of people who are truly disease-free that the test correctly identifies as negative.' },
    { symbol: 'd', meaning: 'True Negative count — patients who test negative and are truly disease-free.' },
    { symbol: 'b', meaning: 'False Positive count — patients who test positive but are truly disease-free.' },
    { symbol: 'LR_{+}', meaning: 'Positive Likelihood Ratio — how much more likely a positive result is in diseased versus healthy patients.' },
    { symbol: 'LR_{-}', meaning: 'Negative Likelihood Ratio — how much more likely a negative result is in diseased versus healthy patients.' },
  ],
  'diagnostic-accuracy': [
    { symbol: 'Se', meaning: 'Sensitivity — proportion of truly diseased patients (a+c) that the test correctly flags positive.' },
    { symbol: 'a', meaning: 'True Positive count — test positive and truly diseased.' },
    { symbol: 'c', meaning: 'False Negative count — test negative but truly diseased.' },
    { symbol: 'Sp', meaning: 'Specificity — proportion of truly healthy patients (b+d) that the test correctly flags negative.' },
    { symbol: 'd', meaning: 'True Negative count — test negative and truly healthy.' },
    { symbol: 'b', meaning: 'False Positive count — test positive but truly healthy.' },
    { symbol: 'PPV', meaning: 'Positive Predictive Value — probability a patient truly has the disease given a positive test result.' },
    { symbol: 'NPV', meaning: 'Negative Predictive Value — probability a patient is truly disease-free given a negative test result.' },
    { symbol: 'LR_{+}', meaning: 'Positive Likelihood Ratio — how much a positive result shifts the odds toward disease.' },
    { symbol: 'LR_{-}', meaning: 'Negative Likelihood Ratio — how much a negative result shifts the odds away from disease.' },
    { symbol: 'Accuracy', meaning: 'Overall proportion of all patients (both positive and negative) that the test classifies correctly.' },
  ],
  'post-test-probability': [
    { symbol: 'P_{pre}', meaning: 'Pre-Test Probability — the estimated chance of disease before the test result is known.' },
    { symbol: '\\text{Pre-odds}', meaning: 'Pre-test probability converted to odds form, used for the likelihood-ratio update.' },
    { symbol: 'LR', meaning: 'Likelihood Ratio of the test result (LR+ if positive, LR− if negative) that multiplies the pre-test odds.' },
    { symbol: '\\text{Post-odds}', meaning: 'Odds of disease after incorporating the test result.' },
    { symbol: 'P_{post}', meaning: 'Post-Test Probability — the updated chance of disease after the test result.' },
  ],
  'roc-auc': [
    { symbol: 't', meaning: 'A candidate score threshold used to classify a subject as test-positive if their score is at least t.' },
    { symbol: 'TPR(t)', meaning: 'True Positive Rate at threshold t — the fraction of diseased subjects (status=1) scoring at or above t.' },
    { symbol: 'FPR(t)', meaning: 'False Positive Rate at threshold t — the fraction of healthy subjects (status=0) scoring at or above t.' },
    { symbol: 'D', meaning: 'True status of a subject, entered as 1 (diseased) or 0 (healthy).' },
    { symbol: 'AUC', meaning: 'Area under the ROC curve — the probability a randomly chosen diseased subject scores higher than a randomly chosen healthy one.' },
    { symbol: 'U', meaning: 'Mann-Whitney U statistic computed from the ranked scores, used to calculate AUC exactly.' },
    { symbol: 'n_1', meaning: 'Number of diseased subjects (status=1) entered.' },
    { symbol: 'n_0', meaning: 'Number of healthy subjects (status=0) entered.' },
  ],
  'serial-parallel-testing': [
    { symbol: 'Se_{series}', meaning: 'Combined sensitivity when both tests must be positive to call the overall result positive.' },
    { symbol: 'Se_1, Se_2', meaning: 'Test 1 Sensitivity and Test 2 Sensitivity, entered individually.' },
    { symbol: 'Sp_{series}', meaning: 'Combined specificity when both tests must be positive to call the overall result positive.' },
    { symbol: 'Sp_1, Sp_2', meaning: 'Test 1 Specificity and Test 2 Specificity, entered individually.' },
    { symbol: 'Se_{parallel}', meaning: 'Combined sensitivity when either test being positive counts as an overall positive.' },
    { symbol: 'Sp_{parallel}', meaning: 'Combined specificity when either test being positive counts as an overall positive.' },
  ],
  'ppv-npv-vs-prevalence': [
    { symbol: 'PPV', meaning: 'Positive Predictive Value — probability of actually having the disease given a positive test result.' },
    { symbol: 'Se', meaning: 'Sensitivity of the test, held fixed while the prevalence slider moves.' },
    { symbol: 'Prev', meaning: 'Disease Prevalence — the proportion of the population that truly has the disease, set by the slider.' },
    { symbol: 'Sp', meaning: 'Specificity of the test, held fixed while the prevalence slider moves.' },
    { symbol: 'NPV', meaning: 'Negative Predictive Value — probability of actually being disease-free given a negative test result.' },
  ],

  // Bayesian & Meta-Analysis
  'bayes-theorem': [
    { symbol: 'P(A\\mid B)', meaning: 'Posterior Probability — the updated chance that A is true after observing evidence B.' },
    { symbol: 'P(B\\mid A)', meaning: 'Likelihood — the probability of observing B if A is actually true.' },
    { symbol: 'P(A)', meaning: 'Prior Probability — the chance A is true before observing B.' },
    { symbol: 'P(B)', meaning: 'Marginal Probability of observing B at all, across both A and not-A.' },
    { symbol: 'P(B\\mid\\lnot A)', meaning: 'Probability of observing B when A is false, used to derive P(B) if it is not entered directly.' },
  ],
  'bayesian-cri': [
    { symbol: '\\alpha_0', meaning: 'Prior alpha parameter of the Beta distribution, derived from the Prior Mean and Prior Strength.' },
    { symbol: '\\mu_0', meaning: 'Prior Mean — the believed proportion before seeing the Observed Successes/Failures.' },
    { symbol: 's_0', meaning: 'Prior Strength — how many pseudo-observations of confidence the prior represents.' },
    { symbol: '\\beta_0', meaning: 'Prior beta parameter of the Beta distribution, derived from the Prior Mean and Prior Strength.' },
    { symbol: '\\alpha_{post}', meaning: 'Posterior alpha parameter, combining the prior with the Observed Successes.' },
    { symbol: '\\text{heads}', meaning: 'Observed Successes entered from the data.' },
    { symbol: '\\beta_{post}', meaning: 'Posterior beta parameter, combining the prior with the Observed Failures.' },
    { symbol: '\\text{tails}', meaning: 'Observed Failures entered from the data.' },
    { symbol: '\\text{mean}', meaning: 'Posterior Mean — the updated best estimate of the proportion after combining prior and data.' },
    { symbol: 'CrI', meaning: 'Credible Interval — the range believed to contain the true proportion at the chosen Credibility Level.' },
    { symbol: 'F^{-1}_{Beta}', meaning: 'Inverse CDF (quantile function) of the Beta posterior distribution, used to find the interval bounds.' },
    { symbol: 'c', meaning: 'Credibility Level — the probability the credible interval is chosen to contain (e.g. 0.95).' },
  ],
  'bayes-factor': [
    { symbol: 'p', meaning: 'The two-tailed p-value from a hypothesis test, entered as input.' },
    { symbol: '\\Phi^{-1}', meaning: 'Inverse standard normal CDF, used to convert the p-value into a z-score.' },
    { symbol: 'z', meaning: 'Standard normal z-score corresponding to the two-tailed p-value.' },
    { symbol: 'BF_{10}', meaning: 'Minimum Bayes Factor — the strongest possible evidence for H₁ over H₀ that this p-value could represent.' },
    { symbol: 'BF_{01}', meaning: 'Reciprocal of BF10 — the corresponding evidence for H₀ over H₁.' },
    { symbol: 'P(H_0\\mid \\text{data})', meaning: 'Posterior probability that the null hypothesis is true, after updating with the Bayes factor.' },
    { symbol: 'BF', meaning: 'The Bayes factor (BF10 or BF01) used to update the prior into the posterior.' },
    { symbol: 'P(H_0)', meaning: 'Prior Probability P(H₀) — the believed chance the null hypothesis is true before seeing this result.' },
  ],
  'meta-analysis': [
    { symbol: '\\hat\\theta_{FE}', meaning: 'Fixed-effect pooled estimate — the weighted average effect across all studies, assuming one true effect.' },
    { symbol: 'w_i', meaning: "Fixed-effect weight for study i, equal to the inverse of its variance — more precise studies count more." },
    { symbol: 'y_i', meaning: "A study's own Effect Estimate, as entered." },
    { symbol: 'SE_i', meaning: "A study's own Standard Error (SE), as entered." },
    { symbol: 'Q', meaning: "Cochran's Q — a weighted sum of each study's squared deviation from the pooled estimate, testing heterogeneity." },
    { symbol: 'df', meaning: 'Degrees of freedom for the heterogeneity test, equal to the number of studies minus 1.' },
    { symbol: 'I^2', meaning: 'Percentage of total variation across studies attributable to real heterogeneity rather than chance.' },
    { symbol: '\\tau^2', meaning: 'DerSimonian–Laird estimate of between-study variance, used in the random-effects model.' },
    { symbol: 'C', meaning: 'A scaling constant based on the study weights, used to compute τ² from Q.' },
    { symbol: '\\hat\\theta_{RE}', meaning: "Random-effects pooled estimate, which allows each study's true effect to differ and accounts for τ²." },
    { symbol: 'w_i^{*}', meaning: 'Random-effects weight for study i, incorporating both its own variance and the between-study variance τ².' },
    { symbol: 'PI', meaning: "Prediction Interval — the range where a new study's true effect is expected to fall, wider than the confidence interval." },
    { symbol: 't_{k-2,\\,0.975}', meaning: 'Critical t-value used to set the width of the prediction interval, based on the number of studies.' },
    { symbol: 'SE_{RE}', meaning: 'Standard error of the random-effects pooled estimate.' },
    { symbol: 'RR_i, OR_i', meaning: "In Ratio mode, a study's risk ratio or odds ratio, entered as its natural log and exponentiated back after pooling." },
  ],
  'network-meta-analysis': [
    { symbol: '\\theta_{A(k)},\\ \\theta_{B(k)}', meaning: "Comparison k's two treatments' effects, each measured relative to the reference treatment (which is fixed at 0)." },
    { symbol: 'y_k', meaning: "Comparison k's entered Effect (B vs A) — a mean difference, or a log(RR)/log(OR) in Ratio mode." },
    { symbol: 'X', meaning: 'The design matrix: each row (comparison) has −1 in its Treatment A column and +1 in its Treatment B column (0 for the reference).' },
    { symbol: 'W', meaning: 'Diagonal weight matrix, one weight per comparison equal to 1/SE² (or 1/(SE²+τ²) for the random-effects fit).' },
    { symbol: '\\hat\\theta', meaning: "Every treatment's estimated effect versus the reference, solved by weighted least squares." },
    { symbol: 'Q', meaning: "Weighted sum of each comparison's squared deviation from the network's fitted values — tests heterogeneity AND inconsistency (direct vs. indirect evidence) at once." },
    { symbol: 'df', meaning: 'Comparisons entered minus treatments estimated (m − (t−1)); zero for a star/tree network with no closed loops.' },
    { symbol: 'I^2', meaning: 'Percentage of Q attributable to real heterogeneity/inconsistency rather than chance.' },
    { symbol: '\\tau^2', meaning: 'Common between-study variance across the whole network, estimated by a multivariate generalization of DerSimonian–Laird.' },
    { symbol: '\\hat\\theta_{ij}', meaning: 'Any pairwise (league table) contrast, built as a linear combination of two treatments’ estimates from the same fitted model.' },
    { symbol: 'P_i', meaning: "Treatment i's P-score — the average probability it beats each other treatment, given the fitted effects and their uncertainty." },
    { symbol: '\\Phi', meaning: 'Standard normal CDF, converting a standardized treatment difference into a probability of being better.' },
  ],

  // Survival Analysis
  'kaplan-meier': [
    { symbol: '\\hat{S}(t)', meaning: 'Kaplan-Meier estimated probability of surviving (event-free) past time t.' },
    { symbol: 't_i', meaning: 'Each distinct time at which at least one event occurs in the entered data.' },
    { symbol: 'd_i', meaning: 'Number of events (e.g. relapses) occurring at time t_i.' },
    { symbol: 'n_i', meaning: 'Number of subjects still at risk (not yet had the event or been censored) just before time t_i.' },
    { symbol: '\\hat{t}_{med}', meaning: 'Median Survival Time — the earliest time at which the estimated survival probability drops to 0.5 or below.' },
  ],
  'log-rank-test': [
    { symbol: 'O_1', meaning: 'Observed number of events in Group 1 across the whole follow-up.' },
    { symbol: 'd_{1i}', meaning: 'Number of events observed in Group 1 at time i.' },
    { symbol: 'E_1', meaning: 'Expected number of events in Group 1 at time i if both groups shared the same risk of the event.' },
    { symbol: 'd_i', meaning: 'Total number of events (both groups combined) occurring at time i.' },
    { symbol: 'n_{1i}', meaning: 'Number of Group 1 subjects still at risk just before time i.' },
    { symbol: 'n_i', meaning: 'Total number of subjects (both groups) still at risk just before time i.' },
    { symbol: '\\chi^2', meaning: 'Log-Rank test statistic comparing observed vs expected events in Group 1 across all time points.' },
    { symbol: '\\text{Var}_i', meaning: 'Variance of the observed event count in Group 1 at time i, used to weight each time point.' },
    { symbol: 'n_{2i}', meaning: 'Number of Group 2 subjects still at risk just before time i.' },
  ],

};
