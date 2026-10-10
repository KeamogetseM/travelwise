// Integration tests for the Express API. These hit the real app in-process
// (via supertest, no listening port) against the real dev Supabase project —
// the same pattern used for manual verification throughout development,
// now made repeatable. Each test creates its own throwaway user(s)/data and
// cleans up after itself; nothing here touches the real seeded policies.
require("dotenv").config();
const request = require("supertest");
const { createClient } = require("@supabase/supabase-js");
const app = require("./index");
const admin = require("./supabaseClient");

jest.setTimeout(30000);

async function makeUser(prefix, role) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@travelwise.test`;
  const password = "testpass123";
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (role) await admin.from("profiles").upsert({ id: created.user.id, name: prefix, role });
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
  const { data: signIn } = await anon.auth.signInWithPassword({ email, password });
  return { id: created.user.id, token: signIn.session.access_token };
}

async function deleteUser(user) {
  await admin.from("profiles").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);
}

const sampleRequest = {
  origin: "Delhi",
  destination: "Chennai",
  travel_class: "Economy",
  purpose: "integration test",
  start_date: "2027-01-10",
  end_date: "2027-01-12",
  estimated_cost: 5000,
};

describe("auth gate", () => {
  test("protected routes reject requests with no token", async () => {
    await request(app).get("/api/travel-requests").expect(401);
    await request(app).get("/api/approvals").expect(401);
    await request(app).get("/api/me").expect(401);
  });
});

describe("travel request creation", () => {
  let employee;
  const createdIds = [];

  beforeAll(async () => {
    employee = await makeUser("it-create-emp", null);
  });

  afterAll(async () => {
    await admin.from("travel_options").delete().in("request_id", createdIds);
    await admin.from("travel_requests").delete().in("id", createdIds);
    await deleteUser(employee);
  });

  test("rejects a request missing required fields", async () => {
    const res = await request(app)
      .post("/api/travel-requests")
      .set("Authorization", `Bearer ${employee.token}`)
      .send({})
      .expect(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("creates a request and attempts a cost prediction", async () => {
    const res = await request(app)
      .post("/api/travel-requests")
      .set("Authorization", `Bearer ${employee.token}`)
      .send(sampleRequest)
      .expect(201);

    expect(res.body.request.status).toBe("pending");
    expect(res.body.request.user_id).toBe(employee.id);
    createdIds.push(res.body.request.id);
    // predicted_cost is non-fatal (null if the ML service isn't running during
    // this test run) — only assert the field exists on the response shape.
    expect(res.body.request).toHaveProperty("predicted_cost");
  });

  test("a user only ever sees their own requests", async () => {
    const other = await makeUser("it-create-other", null);
    try {
      const res = await request(app)
        .get("/api/travel-requests")
        .set("Authorization", `Bearer ${other.token}`)
        .expect(200);
      expect(res.body.requests).toEqual([]);
    } finally {
      await deleteUser(other);
    }
  });
});

describe("scoring", () => {
  let employee;
  let requestId;

  beforeAll(async () => {
    employee = await makeUser("it-score-emp", null);
    const res = await request(app)
      .post("/api/travel-requests")
      .set("Authorization", `Bearer ${employee.token}`)
      .send(sampleRequest);
    requestId = res.body.request.id;
  });

  afterAll(async () => {
    await admin.from("travel_options").delete().eq("request_id", requestId);
    await admin.from("travel_requests").delete().eq("id", requestId);
    await deleteUser(employee);
  });

  test("produces exactly three ranked options with a reason on the top pick", async () => {
    const res = await request(app)
      .post(`/api/travel-requests/${requestId}/score`)
      .set("Authorization", `Bearer ${employee.token}`)
      .expect(200);

    expect(res.body.options).toHaveLength(3);
    expect(res.body.recommendation.reason).toEqual(expect.any(String));
    expect(res.body.recommendation.score).toBeGreaterThanOrEqual(res.body.options[1].score);
  });

  test("re-scoring reuses the same stored options instead of duplicating them", async () => {
    await request(app).post(`/api/travel-requests/${requestId}/score`).set("Authorization", `Bearer ${employee.token}`);
    await request(app).post(`/api/travel-requests/${requestId}/score`).set("Authorization", `Bearer ${employee.token}`);

    const { data: rows } = await admin.from("travel_options").select("id").eq("request_id", requestId);
    expect(rows).toHaveLength(3);
  });
});

describe("supervisor approvals", () => {
  let employee, supervisor, requestId, topOptionId;

  beforeAll(async () => {
    employee = await makeUser("it-appr-emp", null);
    supervisor = await makeUser("it-appr-sup", "supervisor");

    const created = await request(app)
      .post("/api/travel-requests")
      .set("Authorization", `Bearer ${employee.token}`)
      .send(sampleRequest);
    requestId = created.body.request.id;

    const scored = await request(app)
      .post(`/api/travel-requests/${requestId}/score`)
      .set("Authorization", `Bearer ${supervisor.token}`);
    topOptionId = scored.body.recommendation.id;
  });

  afterAll(async () => {
    await admin.from("travel_options").delete().eq("request_id", requestId);
    await admin.from("travel_requests").delete().eq("id", requestId);
    await deleteUser(employee);
    await deleteUser(supervisor);
  });

  test("a non-supervisor is denied access to the approvals queue", async () => {
    const res = await request(app)
      .get("/api/approvals")
      .set("Authorization", `Bearer ${employee.token}`)
      .expect(403);
    expect(res.body.error).toMatch(/supervisor/i);
  });

  test("a supervisor sees the pending request in the queue", async () => {
    const res = await request(app)
      .get("/api/approvals?status=pending")
      .set("Authorization", `Bearer ${supervisor.token}`)
      .expect(200);
    expect(res.body.requests.some((r) => r.id === requestId)).toBe(true);
  });

  test("approving records the decision, chosen option, and an optional comment", async () => {
    const res = await request(app)
      .post(`/api/travel-requests/${requestId}/approve`)
      .set("Authorization", `Bearer ${supervisor.token}`)
      .send({ option_id: topOptionId, comment: "Looks reasonable, approved." })
      .expect(200);

    expect(res.body.request.status).toBe("approved");
    expect(res.body.request.selected_option_id).toBe(topOptionId);
    expect(res.body.request.decided_by).toBe(supervisor.id);
    expect(res.body.request.decided_at).toEqual(expect.any(String));
    expect(res.body.request.decision_comment).toBe("Looks reasonable, approved.");
  });

  test("approving an already-decided request is rejected", async () => {
    const res = await request(app)
      .post(`/api/travel-requests/${requestId}/approve`)
      .set("Authorization", `Bearer ${supervisor.token}`)
      .send({ option_id: topOptionId })
      .expect(400);
    expect(res.body.error).toMatch(/already/i);
  });
});

describe("rejecting with a required comment", () => {
  let employee, supervisor, requestId;

  beforeAll(async () => {
    employee = await makeUser("it-reject-emp", null);
    supervisor = await makeUser("it-reject-sup", "supervisor");

    const created = await request(app)
      .post("/api/travel-requests")
      .set("Authorization", `Bearer ${employee.token}`)
      .send(sampleRequest);
    requestId = created.body.request.id;
  });

  afterAll(async () => {
    await admin.from("travel_options").delete().eq("request_id", requestId);
    await admin.from("travel_requests").delete().eq("id", requestId);
    await deleteUser(employee);
    await deleteUser(supervisor);
  });

  test("rejecting without a comment is refused", async () => {
    const res = await request(app)
      .post(`/api/travel-requests/${requestId}/reject`)
      .set("Authorization", `Bearer ${supervisor.token}`)
      .send({})
      .expect(400);
    expect(res.body.error).toMatch(/comment/i);
  });

  test("rejecting with a comment records it", async () => {
    const res = await request(app)
      .post(`/api/travel-requests/${requestId}/reject`)
      .set("Authorization", `Bearer ${supervisor.token}`)
      .send({ comment: "Over budget for this quarter." })
      .expect(200);

    expect(res.body.request.status).toBe("rejected");
    expect(res.body.request.decision_comment).toBe("Over budget for this quarter.");
  });
});

describe("policy engine", () => {
  let employee, supervisor, requestId, policyId;

  beforeAll(async () => {
    employee = await makeUser("it-policy-emp", null);
    supervisor = await makeUser("it-policy-sup", "supervisor");

    // A deliberately very low, clearly test-only policy — easy to spot and
    // guaranteed not to collide with the real seeded rules.
    const { data: policy } = await admin
      .from("policies")
      .insert([{ rule: "__integration_test_cap__", condition: "class=Economy", threshold: 1, active: true }])
      .select()
      .single();
    policyId = policy.id;

    const created = await request(app)
      .post("/api/travel-requests")
      .set("Authorization", `Bearer ${employee.token}`)
      .send(sampleRequest);
    requestId = created.body.request.id;
  });

  afterAll(async () => {
    await admin.from("policies").delete().eq("id", policyId);
    await admin.from("travel_options").delete().eq("request_id", requestId);
    await admin.from("travel_requests").delete().eq("id", requestId);
    await deleteUser(employee);
    await deleteUser(supervisor);
  });

  test("every option is flagged non-compliant against an active rule it violates", async () => {
    const res = await request(app)
      .post(`/api/travel-requests/${requestId}/score`)
      .set("Authorization", `Bearer ${supervisor.token}`)
      .expect(200);

    for (const option of res.body.options) {
      expect(option.compliant).toBe(false);
      expect(option.violations).toContain("__integration_test_cap__");
    }
  });
});

describe("policy management (administrator)", () => {
  let administrator, nonAdmin, policyId;

  beforeAll(async () => {
    administrator = await makeUser("it-policyadmin", "administrator");
    nonAdmin = await makeUser("it-policyadmin-emp", null);
  });

  afterAll(async () => {
    if (policyId) await admin.from("policies").delete().eq("id", policyId);
    await deleteUser(administrator);
    await deleteUser(nonAdmin);
  });

  test("a non-administrator is denied access to policy management", async () => {
    await request(app).get("/api/policies").set("Authorization", `Bearer ${nonAdmin.token}`).expect(403);
    await request(app)
      .post("/api/policies")
      .set("Authorization", `Bearer ${nonAdmin.token}`)
      .send({ rule: "x", condition: "*", threshold: 1 })
      .expect(403);
  });

  test("an administrator can create a policy with a valid condition", async () => {
    const res = await request(app)
      .post("/api/policies")
      .set("Authorization", `Bearer ${administrator.token}`)
      .send({ rule: "__it_policy_test__", condition: "class=Economy", threshold: 1234 })
      .expect(201);

    expect(res.body.policy.active).toBe(true);
    policyId = res.body.policy.id;
  });

  test("rejects an invalid condition format", async () => {
    const res = await request(app)
      .post("/api/policies")
      .set("Authorization", `Bearer ${administrator.token}`)
      .send({ rule: "bad", condition: "not-a-valid-condition", threshold: 100 })
      .expect(400);
    expect(res.body.error).toMatch(/condition must be/i);
  });

  test("the new policy appears in the administrator's list", async () => {
    const res = await request(app)
      .get("/api/policies")
      .set("Authorization", `Bearer ${administrator.token}`)
      .expect(200);
    expect(res.body.policies.some((p) => p.id === policyId)).toBe(true);
  });

  test("can deactivate a policy via PATCH", async () => {
    const res = await request(app)
      .patch(`/api/policies/${policyId}`)
      .set("Authorization", `Bearer ${administrator.token}`)
      .send({ active: false })
      .expect(200);
    expect(res.body.policy.active).toBe(false);
  });

  test("can delete a policy", async () => {
    await request(app)
      .delete(`/api/policies/${policyId}`)
      .set("Authorization", `Bearer ${administrator.token}`)
      .expect(200);

    const res = await request(app)
      .get("/api/policies")
      .set("Authorization", `Bearer ${administrator.token}`)
      .expect(200);
    expect(res.body.policies.some((p) => p.id === policyId)).toBe(false);
    policyId = null; // already gone, nothing for afterAll to clean up
  });
});
