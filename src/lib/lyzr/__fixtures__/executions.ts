import type { LyzrExecution } from "../types";

/**
 * Fixtures modelled on real Lyzr SuperFlow execution payloads observed from
 * GET /executions/{id}. Internal fields (confidence, escalation reasons,
 * evidence quality, raw webhook bodies) are included on purpose so tests can
 * prove the adapter never leaks them.
 */

export const runningExecution: LyzrExecution = {
  execution_id: "1caeef4f731fb4bcc66866542a3f2851",
  status: "running",
};

export const completedAnswerExecution: LyzrExecution = {
  execution_id: "1caeef4f731fb4bcc66866542a3f2851",
  status: "success",
  outputs: {
    "Answer Complete": {
      "0": [
        {
          answer:
            "To create an organization profile in SpreadBliss, a representative first searches for an existing organization or registry listing.",
          answerable: true,
          confidence: 0.7,
          confidence_score: 0.7,
          escalated: "false",
          escalation_reason: "",
          evidence_quality: "direct",
          message:
            "To create an organization profile in SpreadBliss, a representative first searches for an existing organization or registry listing.",
          sources: [
            {
              document: "SpreadBliss Customer Service Chatbot Knowledge Base.docx",
              section: "Nonprofit, company, and foundation profiles",
            },
          ],
          status: "answered",
        },
      ],
    },
  },
};

export const needsEmailExecution: LyzrExecution = {
  execution_id: "d01aab745cbba048086f3a9900ca9aca",
  status: "success",
  outputs: {
    Email_Required: {
      "0": [
        {
          answer: "",
          answerable: false,
          confidence: 0,
          confidence_score: 0,
          customer_email: "",
          customer_name: null,
          escalated: "false",
          escalation_reason:
            "The issue involves a payment dispute and possible duplicate charges, which requires human review.",
          evidence_quality: "none",
          has_valid_email: false,
          message:
            "I've received your question, but it needs review by our support team. Please provide your email address so we can send you the outcome.",
          question: "I was charged twice and want a refund immediately",
          session_id: "sess_test_2",
          sources: [],
          sources_json: "[]",
          status: "needs_email",
          ticket_id: "I was charged twice and want a refund immediately",
        },
      ],
    },
  },
};

export const acknowledgedExecution: LyzrExecution = {
  execution_id: "c93c6513c5287bb5d442d499abf3195f",
  status: "success",
  outputs: {
    "Escalation Submitted": {
      "0": [
        {
          body: { error: "internal webhook error detail" },
          escalated: "true",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          message:
            "Thanks—your question has been received and sent to a SpreadBliss support specialist. We'll email you after it has been reviewed.",
          status: "awaiting_human_review",
          statusCode: 400,
          ticket_id: "SB-TEST03",
        },
      ],
    },
  },
};

export const failedExecution: LyzrExecution = {
  execution_id: "aaaabbbbccccdddd0000111122223333",
  status: "failed",
  errors: ["node execution failed: internal stack trace details"],
};

/** Completed run whose outputs contain no recognizable terminal item. */
export const malformedExecution: LyzrExecution = {
  execution_id: "aaaabbbbccccdddd4444555566667777",
  status: "success",
  outputs: {
    Trigger: {
      "0": [
        {
          customer_email: "test@example.com",
          message: "How do I create an organization profile?",
          session_id: "sess_test_1",
          ticket_id: "SB-TEST01",
        },
      ],
    },
  },
};
