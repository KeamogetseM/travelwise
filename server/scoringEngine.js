// scoringEngine.js
// Generates candidate travel options for a request, scores each with a
// weighted multi-criteria model, and returns them ranked best-first with
// a plain-English reason for the top pick.

// Weights for the scoring model (must sum to 1.0)
const WEIGHTS = { cost: 0.4, time: 0.3, policy: 0.3 };

// Normalise a value to 0..1. invert=true means "lower is better"
// (a cheaper cost or shorter duration should score higher).
function normalise(value, min, max, invert = false) {
  if (max === min) return 1; // all options equal on this factor
  const s = (value - min) / (max - min);
  return invert ? 1 - s : s;
}

// A policy's `condition` is a simple predicate: "class=Economy",
// "destination=Mumbai", or "*" (applies to every request). Keeping this
// data-driven means adding a new rule is an insert into `policies`, not a
// code change.
function policyApplies(policy, request) {
  if (policy.condition === "*") return true;
  const [field, value] = policy.condition.split("=");
  if (field === "class") return request.travel_class === value;
  if (field === "destination") return request.destination === value;
  return false; // unrecognised condition -> doesn't apply (safe default)
}

// Checks an option against the traveller's own declared budget (if any)
// AND every active policy that applies to this request. Returns the list
// of violated rule names — empty means fully compliant. `policies` is the
// active rows from the `policies` table (FR-05: validate against every
// active policy).
function isCompliant(option, request, policies = []) {
  const violations = [];

  if (request.estimated_cost && option.cost > Number(request.estimated_cost)) {
    violations.push("Exceeds your declared budget");
  }

  for (const policy of policies) {
    if (!policyApplies(policy, request)) continue;
    if (option.cost > Number(policy.threshold)) {
      violations.push(policy.rule);
    }
  }

  return violations;
}

// Simulated option generation. In a real system these would come from a
// travel provider; here we derive three plausible options from the request.
// Prefers the ML-predicted cost as the baseline (FR-03 feeding FR-04);
// falls back to the traveller's own estimate, then a fixed default, if the
// prediction service was unavailable when the request was created.
function generateOptions(request) {
  const budget = Number(request.predicted_cost) || Number(request.estimated_cost) || 5000;
  return [
    { type: "Rail + hotel",  cost: Math.round(budget * 1.00), duration: 15 },
    { type: "Flight + hotel", cost: Math.round(budget * 1.35), duration: 5 },
    { type: "Car + hotel",    cost: Math.round(budget * 1.14), duration: 18 },
  ];
}

function scoreOptions(request, policies = []) {
  const options = generateOptions(request);

  const costs = options.map((o) => o.cost);
  const times = options.map((o) => o.duration);
  const minC = Math.min(...costs), maxC = Math.max(...costs);
  const minT = Math.min(...times), maxT = Math.max(...times);

  const scored = options.map((o) => {
    const costScore = normalise(o.cost, minC, maxC, true);   // cheaper is better
    const timeScore = normalise(o.duration, minT, maxT, true); // faster is better
    const violations = isCompliant(o, request, policies);
    const compliant = violations.length === 0;
    const policyScore = compliant ? 1 : 0;

    const score =
      WEIGHTS.cost * costScore +
      WEIGHTS.time * timeScore +
      WEIGHTS.policy * policyScore;

    return {
      ...o,
      compliant,
      violations,
      costScore: +costScore.toFixed(2),
      timeScore: +timeScore.toFixed(2),
      policyScore,
      score: +score.toFixed(3),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  best.reason = explain(best, scored, request);

  return scored;
}

// Build a plain-English justification for the recommended option.
function explain(best, all, request) {
  const parts = [];
  parts.push(
    best.compliant
      ? "fully policy-compliant"
      : `outside policy (${best.violations.join("; ")})`
  );

  const cheapest = Math.min(...all.map((o) => o.cost));
  if (best.cost === cheapest) {
    parts.push("the cheapest option");
  } else {
    const diff = Math.round(((best.cost - cheapest) / cheapest) * 100);
    parts.push(`only ${diff}% above the cheapest option`);
  }

  const fastest = Math.min(...all.map((o) => o.duration));
  if (best.duration === fastest) {
    parts.push("also the fastest");
  } else {
    parts.push(`${best.duration - fastest}h slower than the fastest`);
  }

  return `Recommended because it is ${parts.join(", ")}.`;
}

// Takes raw stored travel_options rows (cost/duration/type/score only — no
// compliant/reason) and re-derives those presentation fields against the
// given request and the current active policies, ranked best-first. Used
// wherever we read back options that were already scored, instead of
// re-generating and re-inserting them.
function hydrate(rows, request, policies = []) {
  const scored = rows
    .map((o) => {
      const violations = isCompliant(o, request, policies);
      return { ...o, compliant: violations.length === 0, violations };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    scored[0].reason = explain(scored[0], scored, request);
  }
  return scored;
}

module.exports = { scoreOptions, isCompliant, explain, hydrate };
