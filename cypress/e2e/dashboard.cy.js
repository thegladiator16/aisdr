describe("Dashboard", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("redirects to /sign-in when not authenticated", () => {
    cy.visit("/dashboard");
    cy.url().should("include", "/sign-in");
  });

  it("redirects /dashboard/manage to /sign-in when not authenticated", () => {
    cy.visit("/dashboard/manage");
    cy.url().should("include", "/sign-in");
  });

  describe("authenticated (requires a QA test account — see cypress/support/commands.js)", () => {
    beforeEach(function () {
      if (!Cypress.env("CLERK_TEST_USER_EMAIL") || !Cypress.env("CLERK_TEST_USER_PASSWORD")) {
        cy.log(
          "Skipping — set CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD in " +
            "cypress.env.json to run authenticated specs."
        );
        this.skip();
      }
      cy.signInAsTestUser();
      cy.visit("/dashboard");
      cy.url({ timeout: 15000 }).should("include", "/dashboard");
    });

    it("loads the dashboard shell (sidebar + trial banner) instead of bouncing to /sign-in", () => {
      cy.url().should("not.include", "/sign-in");
      cy.get('[data-cy="sidebar"], nav').should("exist");
      cy.contains(/credits|trial|upgrade/i).should("exist");
    });

    it("fetches subscription data without a 401", () => {
      cy.intercept("GET", "/api/user/subscription").as("subscription");
      cy.reload();
      cy.wait("@subscription").its("response.statusCode").should("eq", 200);
    });
  });
});
