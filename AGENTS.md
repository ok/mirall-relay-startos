# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes. `UPDATING.md` covers upstream
version bumps; `CONTRIBUTING.md` covers the contribution flow.

**Fix a defect you spot rather than reporting it** — you have the package open and the
context to be sure. File **a GitHub issue on this repo** only when the call isn't yours to
make: you can't pin the cause down, two defensible fixes exist, or it's too large to ride on
the work in hand. An open issue is a report, not a queue — implement one when you're asked
to or when it's labelled `Approved`, then close it with `Closes #<n>`.

Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The upstream application is a git submodule at `./mirall-relay`, and the image is built
  from its Dockerfile.** Upstream's CI builds but does not push, so there is no tag to pull.
  `git submodule update --init` before the first build.

- **The base branch is `main`, not `master`.** The workflows are pointed at it accordingly.

- **The image is distroless** (`gcr.io/distroless/nodejs22-debian12:nonroot`) — no shell, no
  coreutils. Every in-container helper runs through `/nodejs/bin/node -e <script>`; see
  `prepareIdentityScript` in `startos/utils.ts`. A command written as a shell pipeline, or
  relying on a `#!/usr/bin/env node` shebang, fails with a bare "No such file or directory".

- **A `prepare-identity` oneshot runs as root before the daemon**, because the image runs as
  uid 65532 and a StartOS volume arrives owned by root. It chowns `/data`, materializes the
  seed, and prints the derived public key. It runs on every start and is idempotent.

- **`startos/utils.ts` encodes four assumptions about the upstream image** that the build does
  not enforce: the runtime uid, the path to `node`, the exports of `src/keys.js`, and the shape
  of `/readyz`. Re-check all four when bumping the submodule — `UPDATING.md` lists them.

- **The relay's port is raw UDP.** `interfaces.ts` binds it with `protocol: null` and
  `secure: { ssl: false }`, which makes it a plain port forward — StartOS forwards those for
  both TCP and UDP, which is what HyperDHT needs. Don't "fix" it to an http protocol.

- **Compiling proves nothing here.** The only question that matters is whether peers on the
  internet can reach the UDP port; `tsc` and `make` cannot answer it. See CONTRIBUTING.md
  § Testing the thing that actually matters.
