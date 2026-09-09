# Updating the upstream version

Upstream is [mirall-relay](https://github.com/ok/mirall-relay), vendored as a git submodule at
`./mirall-relay`. There is no published image — upstream's CI builds the Dockerfile without
pushing it — so this package builds that Dockerfile from the pinned submodule commit. The
submodule pointer *is* the version pin.

## Determining the upstream version

The pin is the submodule commit recorded in this repo (`git submodule status`), and the version
it corresponds to is declared in `startos/versions/current.ts` as the upstream half of
`version: '<upstream>:<downstream>'`.

The latest upstream release:

```bash
gh release view -R ok/mirall-relay --json tagName -q .tagName
```

## Applying the bump

1. **Move the submodule** to the new tag and commit the new pointer:

   ```bash
   git -C mirall-relay fetch --tags
   git -C mirall-relay checkout <tag>
   git add mirall-relay
   ```

2. **Edit `startos/versions/current.ts` in place** — set `version` to the new upstream version
   with the downstream revision reset to `0`, and rewrite `releaseNotes` for every locale.
   Do not add a new file under `startos/versions/`: the latest version always lives in
   `current.ts`, and a new file is spun off only when the version already there carries a
   migration. See [Versions](https://docs.start9.com/packaging/versions.html).

   For a wrapper-only change with no submodule move, leave the upstream half alone and
   increment the downstream revision instead. Do the same when the submodule moves to
   commits upstream has not tagged: its `package.json` version is unchanged, that version
   is what the relay reports in its capability document, and claiming a version upstream
   has not released would disagree with it.

3. **Re-check the four assumptions `startos/utils.ts` makes about the image.** None of them
   are enforced by the build, and each fails at runtime rather than at `tsc`:

   - the runtime user is still uid 65532 (`runtimeUid`),
   - `node` is still at `/nodejs/bin/node` (`nodeBin`),
   - `src/keys.js` still exports `loadOrCreateSeed`, `keyPairFromSeed` and `publicKeyZ32`
     (`prepareIdentityScript`),
   - `/readyz` still returns `{ ready, firewalled, probed, publicKey }` (`ReadyzBody`).

   Also re-check that every `MIRALL_RELAY_*` variable in `relayEnv` (`startos/main.ts`) is
   still the name upstream reads, and that the capability document consumed by
   `testReachability` still has the shape that action expects.

4. **Check what upstream now keeps on the volume.** Every durable file the relay writes has
   to live under `/data` and be owned by the runtime uid, and upstream adds to that set:
   `members.json` and `admin-token` arrived with invite membership. Two things follow.

   - Anything upstream defaults to a path outside `/data` needs a `MIRALL_RELAY_*_FILE`
     override in `relayEnv`, or it lands in `/app` and is lost on every container
     replacement. `relayEnv` sets `SEED_FILE`, `ROSTER_FILE` and `ADMIN_TOKEN_FILE`
     explicitly for that reason, even though the image's own `ENV` currently agrees —
     StartOS layers the daemon's env over the image's, so the image default would survive,
     but an upstream Dockerfile that dropped it would fail silently.
   - Re-check which paths under `/admin/` upstream serves **without** the token.
     Today it is the page shell and its static assets (`/admin/`,
     `/admin/style.css`, `/admin/app.js`, `/admin/copy-button.js`), because a
     `<link>` cannot send an `Authorization` header. That carve-out is part of
     this package's exposure story — the `admin` interface is exported — so if
     upstream widens it, README's Network Access section has to say so.
   - `prepareIdentityScript` chowns `/data` **recursively** so a restored backup does not
     leave a root-owned file the relay cannot read. Keep it recursive rather than listing
     filenames; upstream throws on an unreadable `admin-token` instead of minting a new
     one, so getting this wrong stops the relay from starting at all.

5. **Rebuild, sideload, and walk the test steps** in CONTRIBUTING.md § Testing the thing that
   actually matters. A green `make` proves the package builds, not that the relay bridges.
