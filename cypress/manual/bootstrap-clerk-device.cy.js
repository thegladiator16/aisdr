/**
 * MANUAL, ONE-TIME (or periodic) bootstrap — NOT part of the automated
 * suite. This file lives outside cypress/e2e/ specifically so it's never
 * picked up by a normal `cypress run` or `cypress open`'s spec list —
 * Cypress's default specPattern only scans cypress/e2e/**.
 *
 * WHY THIS EXISTS:
 * Clerk shows a "new device" email-verification challenge
 * (/sign-in/factor-two) on the QA test account's first sign-in from a fresh
 * Cypress browser profile — every `cypress run`/`cypress open` invocation
 * starts with a wiped cookie jar, so every cold run looks like a brand-new
 * device to Clerk. This is confirmed to be Clerk's device-recognition
 * security feature, not registered MFA (auth_config.second_factors is
 * empty on this instance, yet the challenge still fires).
 *
 * There's no way to automate reading that emailed OTP without granting an
 * email-reading integration (e.g. Gmail API) access to the QA account's
 * real inbox — a meaningfully sensitive integration that wasn't wired up
 * here without an explicit decision from the project owner. Instead, a
 * human completes this challenge ONCE, and we persist the resulting
 * "trusted device" cookies to disk (cypress/.auth/clerk-device-cookies.json,
 * gitignored) so every subsequent automated run can replay them and skip
 * the challenge entirely.
 *
 * HOW TO RUN:
 *   1. Make sure cypress.env.json has CLERK_TEST_USER_EMAIL and
 *      CLERK_TEST_USER_PASSWORD filled in.
 *   2. npx cypress open --config specPattern="cypress/manual/**\/*.cy.js"
 *      which opens the Test Runner scoped to just this file.
 *   3. Click this spec to run it. Watch the real Electron browser window —
 *      it fills in the QA email + password automatically.
 *   4. If it lands on /sign-in/factor-two, this test PAUSES (not fails) for
 *      up to 5 minutes: check the QA account's real inbox (see
 *      CLERK_TEST_USER_EMAIL in cypress.env.json) for the 6-digit code,
 *      click into the visible browser window yourself, type it in, and
 *      submit. The test resumes automatically the instant the URL changes —
 *      no need to re-run the spec.
 *   5. This run either goes GREEN (cookies verifiably persisted — look for
 *      "✅ Verified N cookies genuinely on disk" in the log) or RED with a
 *      specific reason. A green run is now the ONLY way this file reports
 *      success, and it always means the file genuinely exists — every
 *      branch below either verifiably saves cookies or throws. (A prior
 *      version could report green from a branch that silently skipped
 *      saving anything — fixed; see cy.saveClerkDeviceCookies() in
 *      cypress/support/commands.js for the shared verification.)
 *   6. Run the real suite normally: `npx cypress run`. signInAsTestUser()
 *      will now restore these cookies and skip the challenge.
 *
 * Re-run this whenever cypress/support/commands.js's signInAsTestUser()
 * starts throwing the "no valid persisted device cookies" error again —
 * that means Clerk's device-trust period has expired.
 */
const FACTOR_TWO_HUMAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes to read the email + type the code

describe("MANUAL bootstrap — establish a Clerk-trusted device for the QA account", () => {
  it("logs in (completing the new-device email challenge inline if shown) and verifiably persists trusted-device cookies", () => {
    const email = Cypress.env("CLERK_TEST_USER_EMAIL");
    const password = Cypress.env("CLERK_TEST_USER_PASSWORD");
    if (!email || !password) {
      throw new Error(
        "Set CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD in cypress.env.json first."
      );
    }

    cy.visit("/dashboard", { failOnStatusCode: false });

    cy.url().then((url) => {
      if (!url.includes("/sign-in")) {
        cy.log("Already authenticated — verifying + saving trusted-device cookies.");
        cy.saveClerkDeviceCookies();
        return;
      }

      cy.visit("/sign-in");
      cy.get('input[name="identifier"], input[type="email"]', { timeout: 10000 })
        .should("be.visible")
        .type(email);
      cy.contains("button", /^continue$/i).click();
      cy.get('input[name="password"], input[type="password"]', { timeout: 10000 })
        .should("be.visible")
        .type(password, { log: false });
      cy.contains("button", /^continue$/i).click();

      // cy.url()/cy.location() alone do NOT retry — they grab whatever the
      // value is at that exact instant. Only .should() retries the whole
      // assertion until it passes or times out. A plain
      // cy.url({ timeout }).then(...) right after this click can sample the
      // URL mid-navigation (still /sign-in, a split second before Clerk's
      // client-side redirect fires) even though the real destination
      // (/dashboard/manage) renders moments later — this was the actual
      // cause of a prior false "login failed" report while the dashboard
      // was already visibly on screen. Wait for the path to actually move
      // past the bare sign-in form first, THEN sample/branch on where it
      // landed.
      cy.location("pathname", { timeout: 15000 }).should("not.eq", "/sign-in");

      cy.url().then((landedUrl) => {
        if (landedUrl.includes("/sign-in/factor-two")) {
          cy.log(
            `⚠ Landed on the new-device challenge. Check ${email}'s inbox for the 6-digit ` +
              `code, click into the visible browser window, and type it in within ` +
              `${FACTOR_TWO_HUMAN_TIMEOUT_MS / 1000}s. This test keeps waiting and finishes ` +
              "automatically once you submit it — no need to re-run anything."
          );
          // Cypress's real retry-until-timeout on cy.url().should(...) — NOT
          // a fixed cy.wait — so this proceeds the instant the human submits
          // the code, and fails LOUDLY (not silently) if they don't in time.
          cy.url({ timeout: FACTOR_TWO_HUMAN_TIMEOUT_MS }).should((finalUrl) => {
            expect(
              finalUrl,
              "still on the factor-two challenge — code was not entered in time"
            ).not.to.include("/sign-in/factor-two");
            expect(finalUrl, "still on /sign-in — login did not complete").not.to.include(
              "/sign-in"
            );
          });
          cy.log("Challenge completed — verifying + saving trusted-device cookies.");
          cy.saveClerkDeviceCookies();
        } else if (!landedUrl.includes("/sign-in")) {
          cy.log("Signed in without a challenge — verifying + saving trusted-device cookies.");
          cy.saveClerkDeviceCookies();
        } else {
          throw new Error(
            "Still on /sign-in after submitting credentials — login failed. Check " +
              "CLERK_TEST_USER_EMAIL/CLERK_TEST_USER_PASSWORD in cypress.env.json."
          );
        }
      });
    });
  });
});
