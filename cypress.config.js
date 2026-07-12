const { defineConfig } = require("cypress");
const { clerkSetup } = require("@clerk/testing/cypress");
const fs = require("fs");
const path = require("path");

// Anchor all file paths to THIS file's own directory, not process.cwd().
// process.cwd() depends on how/where `cypress open`/`cypress run` was
// launched from — a prior version resolved paths against cwd, and a save
// task reported success (verified via fs.existsSync right after writing)
// while the file was never found at the expected path from a different
// terminal/process. __dirname is the one thing that's always unambiguous:
// this file lives at the project root, full stop.
const PROJECT_ROOT = __dirname;

function resolveProjectPath(relativeOrAbsolute) {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(PROJECT_ROOT, relativeOrAbsolute);
}

module.exports = defineConfig({
  projectId: "yzp2k3",
  viewportWidth: 1280,
  viewportHeight: 720,
  e2e: {
    baseUrl: "https://aryasdr.in",
    async setupNodeEvents(on, config) {
      on("task", {
        // Returns the parsed JSON contents of `path` (resolved against
        // PROJECT_ROOT), or null if the file doesn't exist. cy.readFile()
        // alone throws/fails the test on a missing file, which is the wrong
        // behavior for "restore persisted device cookies if we have them" —
        // this task makes a missing file a normal, expected first-run case
        // instead of a hard failure.
        readFileMaybe(filePath) {
          const absolutePath = resolveProjectPath(filePath);
          if (!fs.existsSync(absolutePath)) return null;
          return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
        },
        // Explicit Node-side write with its own directory creation and
        // return confirmation — used instead of cy.writeFile() so a failure
        // here surfaces as a thrown error (red X, failed test) rather than
        // silently doing nothing. Returns { path, absolutePath, cwd, count }.
        saveJsonFile({ path: filePath, data }) {
          const absolutePath = resolveProjectPath(filePath);
          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2), "utf8");
          if (!fs.existsSync(absolutePath)) {
            throw new Error(`saveJsonFile: write appeared to succeed but ${absolutePath} does not exist`);
          }
          return {
            path: filePath,
            absolutePath,
            cwd: process.cwd(),
            count: Array.isArray(data) ? data.length : undefined,
          };
        },
      });

      // @clerk/testing's clerkSetup() reads CLERK_PUBLISHABLE_KEY /
      // CLERK_SECRET_KEY from process.env, not from Cypress's config.env —
      // bridge the values from cypress.env.json (config.env) into
      // process.env explicitly so cypress.env.json stays the single place
      // to configure these.
      if (config.env.CLERK_PUBLISHABLE_KEY) {
        process.env.CLERK_PUBLISHABLE_KEY = config.env.CLERK_PUBLISHABLE_KEY;
      }
      if (config.env.CLERK_SECRET_KEY) {
        process.env.CLERK_SECRET_KEY = config.env.CLERK_SECRET_KEY;
      }

      // Only call clerkSetup() when both keys are present. Calling it with
      // a missing key throws and crashes the ENTIRE Cypress run — including
      // specs that don't need Clerk at all. Instead, leave config untouched
      // when unconfigured; the authenticated describe blocks in each spec
      // already check for CLERK_SECRET_KEY themselves and skip gracefully
      // (see cypress/support/commands.js).
      if (process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
        config = await clerkSetup({ config });
      }

      return config;
    },
  },
});
