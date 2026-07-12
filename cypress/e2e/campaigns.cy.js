describe("Campaigns", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("redirects to /sign-in when not authenticated", () => {
    cy.visit("/campaigns");
    cy.url().should("include", "/sign-in");
  });

  describe("authenticated (requires a QA test account — see cypress/support/commands.js)", () => {
    // Runs against the production DB at https://aryasdr.in — every campaign
    // created here is tagged with a unique "[cypress]" name and deleted in
    // afterEach so the run doesn't leave test data behind.
    let createdCampaignId = null;

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
      createdCampaignId = null;
    });

    afterEach(() => {
      if (createdCampaignId) {
        cy.request({
          method: "DELETE",
          url: `/api/campaigns/${createdCampaignId}`,
          failOnStatusCode: false,
        });
      }
    });

    it("lists campaigns for the signed-in user", () => {
      cy.request("/api/campaigns").its("body.data").should("be.an", "array");
    });

    it("creates a campaign and sees it in the list", () => {
      const name = `[cypress] Test campaign ${Date.now()}`;

      cy.request("POST", "/api/campaigns", {
        name,
        description: "Created by Cypress e2e test — safe to delete.",
        status: "draft",
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.data).to.have.property("id");
        createdCampaignId = res.body.data.id;

        cy.visit("/campaigns");
        cy.contains(name).should("be.visible");
      });
    });

    it("archives a campaign via the UI three-dot menu", () => {
      const name = `[cypress] Archive test ${Date.now()}`;

      cy.request("POST", "/api/campaigns", { name, status: "draft" }).then((res) => {
        createdCampaignId = res.body.data.id;

        cy.visit("/campaigns");
        cy.contains(name)
          .parents('[class*="rounded-xl"]')
          .first()
          .within(() => {
            cy.get("button").last().click();
          });
        cy.contains(/archive/i).click();
        cy.contains(/archive campaign\?/i).should("be.visible");
        cy.contains("button", /^archive$/i).click();
        cy.contains(name).should("not.exist");
      });
    });
  });
});
