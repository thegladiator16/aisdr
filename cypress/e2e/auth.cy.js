describe("Auth — sign-in flow", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("loads the sign-in page with Clerk's SignIn component", () => {
    cy.visit("/sign-in");
    // Assert on Clerk's actual rendered form, not the branding panel. The
    // left-side AuthBrandPanel is `hidden lg:flex` (Tailwind) — it IS
    // visible at this 1280x720 desktop viewport (>= the 1024px lg
    // breakpoint), but we still test the real Clerk integration here
    // rather than decorative content that could change independently.
    cy.contains(/sign in/i).should("be.visible");
    cy.contains(/continue with google/i).should("be.visible");
    cy.get('input[name="identifier"], input[type="email"]')
      .should("be.visible")
      .and("not.be.disabled");
  });

  it("shows a Sign up link that routes to /sign-up", () => {
    cy.visit("/sign-in");
    cy.contains(/sign up/i).click();
    cy.url().should("include", "/sign-up");
    cy.contains(/create/i).should("be.visible");
  });

  it("redirects unauthenticated users away from protected routes back to /sign-in", () => {
    cy.visit("/dashboard");
    cy.url().should("include", "/sign-in");
    cy.url().should("include", "redirect_url");
  });

  it("does not expose Google's OAuth click-through in an automated test", () => {
    // Google actively blocks automated browsers at its real login screen, so
    // we can't (and shouldn't try to) script "click Continue with Google,
    // then fill in Google's own form" here. This spec verifies our side of
    // the integration (the button exists and points at Clerk's OAuth
    // start), not Google's UI.
    cy.visit("/sign-in");
    cy.contains(/continue with google/i)
      .should("be.visible")
      .and("not.be.disabled");
  });

  describe("authenticated session (requires a QA test account — see cypress/support/commands.js)", () => {
    beforeEach(function () {
      if (!Cypress.env("CLERK_TEST_USER_EMAIL") || !Cypress.env("CLERK_TEST_USER_PASSWORD")) {
        cy.log(
          "Skipping — set CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD in " +
            "cypress.env.json to run authenticated specs. See cypress/support/commands.js " +
            "for setup instructions."
        );
        this.skip();
      }
    });

    it("signs in as the QA test account and establishes an authenticated session", () => {
      cy.signInAsTestUser();
      cy.visit("/dashboard");
      cy.url({ timeout: 15000 }).should("not.include", "/sign-in");
    });
  });
});
