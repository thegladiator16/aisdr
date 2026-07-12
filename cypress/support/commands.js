// Custom Cypress commands for AryaSDR e2e tests.
import { setupClerkTestingToken } from "@clerk/testing/cypress";

const DEVICE_COOKIE_FILE = "cypress/.auth/clerk-device-cookies.json";

/**
 * Whether a dedicated QA test account is configured for authenticated tests.
 *
 * Set in cypress.env.json (gitignored — never commit it):
 *   {
 *     "CLERK_PUBLISHABLE_KEY": "pk_live_...",
 *     "CLERK_SECRET_KEY": "sk_live_...",
 *     "CLERK_TEST_USER_EMAIL": "...",
 *     "CLERK_TEST_USER_PASSWORD": "..."
 *   }
 */
Cypress.Commands.add("hasClerkCredentials", () => {
  return !!(
    Cypress.env("CLERK_PUBLISHABLE_KEY") &&
    Cypress.env("CLERK_SECRET_KEY") &&
    Cypress.env("CLERK_TEST_USER_EMAIL") &&
    Cypress.env("CLERK_TEST_USER_PASSWORD")
  );
});

/**
 * Persists every cookie for the current domain to disk. Called after a
 * successful sign-in (fresh login or manual bootstrap) so future runs can
 * replay these cookies instead of hitting Clerk's new-device challenge.
 *
 * Uses an explicit cy.task() (Node-side fs.writeFileSync + fs.existsSync
 * verification) instead of cy.writeFile() — a prior version used
 * cy.writeFile() and the bootstrap spec reported a passing test with no
 * file ever appearing on disk, with no visible error. This version throws
 * loudly (failing the test with a real stack trace) if the write doesn't
 * actually land, instead of failing silently.
 *
 * IMPORTANT — this command is the single choke point every caller (the
 * manual bootstrap AND signInAsTestUser()'s fallback save) goes through.
 * The root cause of a real prior incident: the bootstrap spec's own
 * branches never threw on failure, so "test went green" never actually
 * meant "cookies were persisted" — there was no way to distinguish a real
 * save from a silent no-op. Fixed here, once, for every caller: read the
 * file back through the EXACT SAME task restoreClerkDeviceCookies() uses in
 * production, and hard-fail if it's missing or doesn't match what was just
 * written. This command resolving without throwing is now a real guarantee,
 * not an assumption.
 */
Cypress.Commands.add("saveClerkDeviceCookies", () => {
  cy.getCookies().then((cookies) => {
    expect(cookies, "cookies to persist").to.have.length.greaterThan(0);
    cy.log(`Cookie names about to be persisted: ${cookies.map((c) => c.name).join(", ")}`);

    cy.task("saveJsonFile", { path: DEVICE_COOKIE_FILE, data: cookies }).then((result) => {
      // Deliberately verbose — a prior version silently wrote to an
      // unexpected location (process.cwd() mismatch between how Cypress was
      // launched and where it was checked from). Logging the absolute path
      // and cwd here makes that class of bug visible without needing to
      // dig through the command log.
      cy.log(`Saved ${result.count} cookies → ${result.absolutePath}`);
      cy.log(`(cwd was: ${result.cwd})`);

      cy.task("readFileMaybe", DEVICE_COOKIE_FILE).then((persisted) => {
        expect(
          persisted,
          `${DEVICE_COOKIE_FILE} to be readable immediately after saving`
        ).to.not.equal(null);
        expect(
          persisted,
          "persisted cookie count to match what was just saved"
        ).to.have.length(cookies.length);
        cy.log(`✅ Verified ${persisted.length} cookies genuinely on disk`);
      });
    });
  });
});

/**
 * Restores previously-persisted cookies into the browser, if a snapshot
 * exists. No-ops silently if the file doesn't exist yet (first run, or
 * after the snapshot was deleted) — the caller is responsible for checking
 * whether the restore actually resulted in an authenticated session.
 */
Cypress.Commands.add("restoreClerkDeviceCookies", () => {
  cy.task("readFileMaybe", DEVICE_COOKIE_FILE).then((cookies) => {
    if (!cookies) return;
    cookies.forEach((c) => {
      cy.setCookie(c.name, c.value, {
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expiry: c.expiry,
      });
    });
  });
});

/**
 * Signs in as the pre-seeded QA test account through the REAL <SignIn/> UI,
 * using password auth, and caches the resulting Clerk session via
 * cy.session() so subsequent calls within the same `cypress run` restore
 * cookies instantly instead of re-driving the UI every time.
 *
 * WHY PASSWORD AUTH, NOT EMAIL+OTP:
 * Clerk's "+clerk_test@" magic-OTP pattern only works when the instance has
 * "test_mode" enabled, which is off by default on production instances and
 * which Clerk's own docs call "highly discouraged" to enable in production.
 * Confirmed directly against this instance: GET
 * https://clerk.aryasdr.in/v1/environment → auth_config.test_mode: false.
 *
 * WHY A SEPARATE "TRUSTED DEVICE" COOKIE CACHE, ON TOP OF cy.session():
 * cy.session() only caches WITHIN one `cypress run`/`cypress open` process —
 * it does not survive across separate invocations, because each fresh
 * Cypress run launches a brand-new Electron profile with zero cookies. That
 * means Clerk sees a "new device" on literally every cold run and challenges
 * with an emailed 6-digit code at /sign-in/factor-two (this is Clerk's
 * device-recognition security feature — NOT a registered MFA/second-factor;
 * confirmed auth_config.second_factors: [] on this instance, yet the
 * challenge still fires). There's no way to complete that challenge
 * headlessly without granting an email-reading integration (e.g. Gmail API)
 * access to the QA account's real inbox — a meaningfully sensitive
 * integration we deliberately did not wire up without an explicit decision
 * from the project owner.
 *
 * Instead: a human completes the challenge ONCE, interactively, via
 * cypress/manual/bootstrap-clerk-device.cy.js (run through `cypress open`,
 * outside the normal automated suite). We persist the resulting
 * "recognized device" cookies to cypress/.auth/clerk-device-cookies.json
 * (gitignored) and replay them here on every subsequent automated run, so
 * Clerk recognizes the browser as the same trusted device and skips the
 * challenge entirely. Re-run the bootstrap whenever this starts failing
 * again (Clerk's device-trust has its own expiry).
 */
Cypress.Commands.add("signInAsTestUser", () => {
  const email = Cypress.env("CLERK_TEST_USER_EMAIL");
  const password = Cypress.env("CLERK_TEST_USER_PASSWORD");

  cy.session(
    email,
    () => {
      // Try the persisted "trusted device" cookies first — if Clerk
      // recognizes them, we land straight on /dashboard with no login UI
      // and no challenge at all.
      cy.restoreClerkDeviceCookies();
      cy.visit("/dashboard", { failOnStatusCode: false });

      cy.url().then((url) => {
        if (!url.includes("/sign-in")) {
          return; // restored cookies were valid — already authenticated
        }

        // No valid persisted device — do a full UI login.
        setupClerkTestingToken();
        cy.visit("/sign-in");

        cy.get('input[name="identifier"], input[type="email"]', { timeout: 10000 })
          .should("be.visible")
          .type(email);
        // Clerk's sign-in card also renders a "Continue with Google" button
        // above the email field, which also matches a loose /continue/i
        // selector. Anchor on the exact button text to disambiguate.
        cy.contains("button", /^continue$/i).click();

        cy.get('input[name="password"], input[type="password"]', { timeout: 10000 })
          .should("be.visible")
          .type(password, { log: false }); // log: false — don't print the password
        cy.contains("button", /^continue$/i).click();

        cy.url({ timeout: 15000 }).should((finalUrl) => {
          if (finalUrl.includes("/sign-in/factor-two")) {
            throw new Error(
              "Clerk challenged this sign-in with a new-device email code, and no valid " +
                "persisted device cookies were found. This can't be completed headlessly. " +
                "Run the one-time interactive bootstrap: see " +
                "cypress/manual/bootstrap-clerk-device.cy.js for exact steps, then re-run."
            );
          }
          expect(finalUrl).not.to.include("/sign-in");
        });

        // Full login succeeded without a challenge (or the persisted cookies
        // were stale and got refreshed) — save the current cookies so the
        // NEXT cold run can skip straight to the dashboard too.
        cy.saveClerkDeviceCookies();
      });
    },
    {
      validate() {
        cy.visit("/dashboard");
        cy.url().should("not.include", "/sign-in");
      },
    }
  );
});
