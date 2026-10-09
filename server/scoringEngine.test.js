const { scoreOptions, isCompliant, explain, hydrate } = require("./scoringEngine");

describe("isCompliant", () => {
  const request = { destination: "Mumbai", travel_class: "Economy" };

  test("no budget, no policies -> compliant", () => {
    expect(isCompliant({ cost: 10000 }, {})).toEqual([]);
  });

  test("option within the traveller's own budget -> compliant", () => {
    const req = { estimated_cost: 5000 };
    expect(isCompliant({ cost: 4000 }, req)).toEqual([]);
  });

  test("option exceeds the traveller's own budget -> violation", () => {
    const req = { estimated_cost: 5000 };
    expect(isCompliant({ cost: 6000 }, req)).toEqual(["Exceeds your declared budget"]);
  });

  test("wildcard policy (*) applies to every request", () => {
    const policies = [{ rule: "Global cap", condition: "*", threshold: 1000 }];
    expect(isCompliant({ cost: 1500 }, request, policies)).toEqual(["Global cap"]);
  });

  test("class-scoped policy only applies to matching travel_class", () => {
    const policies = [{ rule: "Economy cap", condition: "class=Economy", threshold: 1000 }];
    expect(isCompliant({ cost: 1500 }, request, policies)).toEqual(["Economy cap"]);
    expect(isCompliant({ cost: 1500 }, { ...request, travel_class: "Business" }, policies)).toEqual([]);
  });

  test("destination-scoped policy only applies to matching destination", () => {
    const policies = [{ rule: "Mumbai cap", condition: "destination=Mumbai", threshold: 1000 }];
    expect(isCompliant({ cost: 1500 }, request, policies)).toEqual(["Mumbai cap"]);
    expect(isCompliant({ cost: 1500 }, { ...request, destination: "Delhi" }, policies)).toEqual([]);
  });

  test("budget and multiple policies can all be violated at once", () => {
    const req = { ...request, estimated_cost: 1200 };
    const policies = [
      { rule: "Economy cap", condition: "class=Economy", threshold: 1000 },
      { rule: "Mumbai cap", condition: "destination=Mumbai", threshold: 1000 },
      { rule: "Unrelated Delhi cap", condition: "destination=Delhi", threshold: 1000 },
    ];
    expect(isCompliant({ cost: 1500 }, req, policies)).toEqual([
      "Exceeds your declared budget",
      "Economy cap",
      "Mumbai cap",
    ]);
  });

  test("unrecognised condition format never applies (safe default)", () => {
    const policies = [{ rule: "Weird rule", condition: "foo=bar", threshold: 0 }];
    expect(isCompliant({ cost: 999999 }, request, policies)).toEqual([]);
  });
});

describe("scoreOptions", () => {
  test("always generates exactly three options of the expected types", () => {
    const scored = scoreOptions({ predicted_cost: 5000 });
    expect(scored).toHaveLength(3);
    expect(scored.map((o) => o.type).sort()).toEqual(["Car + hotel", "Flight + hotel", "Rail + hotel"].sort());
  });

  test("prefers predicted_cost over estimated_cost over the fixed default", () => {
    const viaPredicted = scoreOptions({ predicted_cost: 1000, estimated_cost: 9000 });
    const viaEstimated = scoreOptions({ estimated_cost: 2000 });
    const viaDefault = scoreOptions({});

    // Rail + hotel is budget * 1.00, so it directly reflects which baseline won.
    expect(viaPredicted.find((o) => o.type === "Rail + hotel").cost).toBe(1000);
    expect(viaEstimated.find((o) => o.type === "Rail + hotel").cost).toBe(2000);
    expect(viaDefault.find((o) => o.type === "Rail + hotel").cost).toBe(5000);
  });

  test("ranks options best-first by score (descending)", () => {
    const scored = scoreOptions({ predicted_cost: 5000 });
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  test("attaches a reason only to the top-ranked option", () => {
    const scored = scoreOptions({ predicted_cost: 5000 });
    expect(typeof scored[0].reason).toBe("string");
    expect(scored[0].reason.length).toBeGreaterThan(0);
    expect(scored[1].reason).toBeUndefined();
    expect(scored[2].reason).toBeUndefined();
  });

  test("a policy violation lowers an option's score relative to an otherwise-identical compliant one", () => {
    const policies = [{ rule: "Low cap", condition: "*", threshold: 1 }]; // everything violates this
    const compliant = scoreOptions({ predicted_cost: 5000 });
    const allViolating = scoreOptions({ predicted_cost: 5000 }, policies);

    const compliantTop = compliant[0];
    const violatingEquivalent = allViolating.find((o) => o.type === compliantTop.type);
    expect(violatingEquivalent.score).toBeLessThan(compliantTop.score);
  });
});

describe("explain", () => {
  const request = {};

  test("compliant best option is described as fully policy-compliant", () => {
    const all = [
      { cost: 100, duration: 5, compliant: true, violations: [] },
      { cost: 150, duration: 10, compliant: true, violations: [] },
    ];
    const reason = explain(all[0], all, request);
    expect(reason).toContain("fully policy-compliant");
  });

  test("non-compliant best option names its violations", () => {
    const all = [
      { cost: 100, duration: 5, compliant: false, violations: ["Economy cap", "Mumbai cap"] },
      { cost: 150, duration: 10, compliant: true, violations: [] },
    ];
    const reason = explain(all[0], all, request);
    expect(reason).toContain("outside policy (Economy cap; Mumbai cap)");
  });

  test("names the cheapest option as such when it is the cheapest", () => {
    const all = [
      { cost: 100, duration: 5, compliant: true, violations: [] },
      { cost: 150, duration: 10, compliant: true, violations: [] },
    ];
    expect(explain(all[0], all, request)).toContain("the cheapest option");
  });

  test("reports percentage above cheapest when not the cheapest", () => {
    const all = [
      { cost: 100, duration: 5, compliant: true, violations: [] },
      { cost: 150, duration: 10, compliant: true, violations: [] },
    ];
    expect(explain(all[1], all, request)).toContain("50% above the cheapest option");
  });

  test("names the fastest option as such when it is the fastest", () => {
    const all = [
      { cost: 100, duration: 5, compliant: true, violations: [] },
      { cost: 150, duration: 10, compliant: true, violations: [] },
    ];
    expect(explain(all[0], all, request)).toContain("also the fastest");
  });

  test("reports hours slower than fastest when not the fastest", () => {
    const all = [
      { cost: 100, duration: 5, compliant: true, violations: [] },
      { cost: 150, duration: 10, compliant: true, violations: [] },
    ];
    expect(explain(all[1], all, request)).toContain("5h slower than the fastest");
  });
});

describe("hydrate", () => {
  const request = { travel_class: "Economy", estimated_cost: null };

  test("empty input returns empty output without throwing", () => {
    expect(hydrate([], request)).toEqual([]);
  });

  test("recomputes compliant/violations from raw stored rows against current policies", () => {
    const rows = [
      { id: "a", type: "Rail + hotel", cost: 1000, duration: 15, score: 0.8 },
      { id: "b", type: "Flight + hotel", cost: 2000, duration: 5, score: 0.3 },
    ];
    const policies = [{ rule: "Economy cap", condition: "class=Economy", threshold: 1500 }];
    const result = hydrate(rows, request, policies);

    const rail = result.find((o) => o.id === "a");
    const flight = result.find((o) => o.id === "b");
    expect(rail.compliant).toBe(true);
    expect(flight.compliant).toBe(false);
    expect(flight.violations).toEqual(["Economy cap"]);
  });

  test("sorts by stored score descending and reasons only the top", () => {
    const rows = [
      { id: "low", type: "Car + hotel", cost: 1000, duration: 18, score: 0.2 },
      { id: "high", type: "Rail + hotel", cost: 1000, duration: 15, score: 0.9 },
    ];
    const result = hydrate(rows, request, []);
    expect(result[0].id).toBe("high");
    expect(result[0].reason).toBeDefined();
    expect(result[1].reason).toBeUndefined();
  });
});
