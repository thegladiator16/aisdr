describe("Leads", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("redirects to /sign-in when not authenticated", () => {
    cy.visit("/leads");
    cy.url().should("include", "/sign-in");
  });

  describe("authenticated (requires a QA test account — see cypress/support/commands.js)", () => {
    // Runs against the production DB at https://aryasdr.in — every lead
    // created here uses a unique "cypress-test+<timestamp>@example.com"
    // email and is deleted in afterEach so the run doesn't leave test data
    // behind.
    let createdLeadId = null;

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
      cy.url({ timeout: 15000 }).should("not.include", "/sign-in");
      createdLeadId = null;
    });

    afterEach(() => {
      if (createdLeadId) {
        cy.request({
          method: "DELETE",
          url: `/api/v1/leads/${createdLeadId}`,
          failOnStatusCode: false,
        });
      }
    });

    it("lists leads for the signed-in user", () => {
      cy.request("/api/leads").its("body.data").should("be.an", "array");
    });

    it("creates a lead and sees it in the list", () => {
      const stamp = Date.now();
      const email = `cypress-test+${stamp}@example.com`;

      cy.request("POST", "/api/leads", {
        firstName: "Cypress",
        lastName: `Test${stamp}`,
        email,
        companyName: "Test Co",
        jobTitle: "QA Engineer",
        status: "new",
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.data).to.have.property("id");
        createdLeadId = res.body.data.id;

        cy.visit("/leads");
        cy.contains(email).should("be.visible");
      });
    });

    it("filters leads by status via the /api/leads query param", () => {
      cy.request("/api/leads?status=new")
        .its("body.data")
        .each((lead) => {
          expect(lead.status).to.eq("new");
        });
    });
  });
});
