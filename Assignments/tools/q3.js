const { h1, h2, p, table, img, Paragraph, PageBreak } = require("./build_assignment3");

const q3 = [
  h1("Question 3 — Final Design (as Implemented)"),

  h2("3.1 High-level system architecture"),
  p("The implemented architecture keeps the emerging-technology component isolated as its own tier, exactly as proposed in Assignment 2, though the deployment target differs from what was originally planned (see the note on the diagram and 5.4)."),
  ...img("architecture.png", 5600, "Figure 1: Architecture diagram — TravelWise (as implemented)"),

  new Paragraph({ children: [new PageBreak()] }),

  h2("3.2 Updated use-case diagram and detailed use-case description"),
  p("The diagram below reflects only the use cases that are actually reachable in the running system. “Manage Policies” and “View Reports” (Administrator) were part of the original design but have no implementation, so they are omitted from the diagram and reported as “Not met” in the traceability matrix (2.2) rather than drawn here as if functional."),
  ...img("usecase.png", 5600, "Figure 2: Use-case diagram — TravelWise (updated)"),
  p("Detailed use-case description — Submit Travel Request:", { bold: true }),
  table(
    ["Field", "Description"],
    [
      ["Actor", "Employee"],
      ["Precondition", "The employee is authenticated (has a valid session)."],
      ["Normal flow", "1. Employee selects origin, destination and class from the supported list. 2. Employee enters purpose, start date, end date, and (optionally) their own cost estimate. 3. Employee submits the form. 4. System validates required fields and that origin ≠ destination. 5. System saves the request with status = pending. 6. System calls the Cost Prediction Service and stores the returned predicted_cost on the request. 7. System returns the created request to the UI, which displays it in the employee's list."],
      ["Alternative flow — validation failure", "At step 4, if destination, start date or end date is missing, or origin equals destination, the system returns a 400 error and the form displays the message without creating a request."],
      ["Alternative flow — prediction unavailable", "At step 6, if the ML service cannot be reached, the system logs a warning, leaves predicted_cost as null, and still completes the request creation (status = pending). Scoring later falls back to the employee's own estimated_cost."],
      ["Postcondition", "A travel_requests row exists with status = pending, and (if the ML service was reachable) a non-null predicted_cost."],
    ],
    [2200, 7150]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  h2("3.3 Updated class diagram"),
  p("Unlike the Assignment 2 class diagram, this one shows only the classes and attributes that actually exist in the implemented schema. Policy, PolicyCheck, Approval and AuditLog were not built as separate tables — their responsibilities were folded into fields on TravelRequest and TravelOption, which is called out directly on the diagram."),
  ...img("class.png", 5600, "Figure 3: Class diagram — TravelWise domain model (updated)"),

  new Paragraph({ children: [new PageBreak()] }),

  h2("3.4 Sequence diagram — core transaction"),
  p("This sequence covers the two real, separately-triggered API interactions that make up the core “submit and cost a request” transaction, including the emerging-technology call and its non-fatal failure path."),
  ...img("sequence.png", 5600, "Figure 4: Sequence diagram — submit a travel request and predict cost"),

  new Paragraph({ children: [new PageBreak()] }),

  h2("3.5 Activity diagram — end-to-end workflow"),
  p("This reflects the actual implemented workflow, including the two decision points (input validation, and the supervisor's decision) and the graceful-degradation branch when the ML service is unavailable."),
  ...img("activity.png", 5200, "Figure 5: Activity diagram — end-to-end travel request workflow"),

  new Paragraph({ children: [new PageBreak()] }),

  h2("3.6 Component and deployment diagrams"),
  p("The component diagram shows the real module boundaries across all three source trees in the repository."),
  ...img("component.png", 5600, "Figure 6: Component diagram — TravelWise"),
  p("The deployment diagram shows the system's actual current execution environment — three local processes against a cloud-hosted Supabase instance — rather than the three-host cloud deployment originally targeted in Assignment 2, which has not yet been carried out (see 5.4)."),
  ...img("deployment.png", 5000, "Figure 7: Deployment diagram — TravelWise (current, as-run state)"),
];

module.exports = q3;
