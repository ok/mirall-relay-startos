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
   increment the downstream revision instead.

3. **Re-check the four assumptions `startos/utils.ts` makes about the image.** None of them
   are enforced by the build, and each fails at runtime rather than at `tsc`:

   - the runtime user is still uid 65532 (`runtimeUid`),
   - `node` is still at `/nodejs/bin/node` (`nodeBin`),
   - `src/keys.js` still exports `loadOrCreateSeed`, `keyPairFromSeed` and `publicKeyZ32`
     (`prepareIdentityScript`),
   - `/readyz` still returns `{ ready, firewalled, publicKey }` (`ReadyzBody`).

   Also re-check that every `MIRALL_RELAY_*` variable in `relayEnv` (`startos/main.ts`) is
   still the name upstream reads, and that the capability document consumed by
   `testReachability` still has the shape that action expects.

4. **Rebuild, sideload, and walk the test steps** in CONTRIBUTING.md § Testing the thing that
   actually matters. A green `make` proves the package builds, not that the relay bridges.
