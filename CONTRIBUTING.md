# Contributing

This repo packages [mirall-relay](https://github.com/ok/mirall-relay) for StartOS. The upstream project is a git submodule at `./mirall-relay`, and the image is built from its Dockerfile.

## Documentation — keep it in sync

- **`README.md`** — how this package differs from running mirall-relay under Docker. For developers and AI assistants.
- **`instructions.md`** — the user-facing instructions packed into the `.s9pk` and shown on the **Instructions** tab in StartOS.
- **`CONTRIBUTING.md`** — this file.

**Any code change that warrants it must update `README.md` and `instructions.md` in the same change** — a new or renamed action, an added or removed volume / port / interface / dependency, a changed default, a new limitation, any altered user-visible behavior.

## Building

See the [StartOS Packaging Guide](https://docs.start9.com/packaging/) for environment setup, then:

```bash
git submodule update --init   # fetch the upstream source
npm ci                        # install dependencies
make                          # build .s9pk for x86_64 and aarch64
make install                  # sideload to the server in ~/.startos/config.yaml
```

`ARCHES` is `x86 arm`: upstream's Dockerfile keeps only the prebuilt Holepunch addons matching `TARGETARCH` and rejects anything but amd64/arm64, so riscv64 is not buildable.

## Testing the thing that actually matters

The relay's job is to be reachable from the internet, and neither `npm run check` nor `make` can tell you whether it is. After sideloading:

1. Confirm the **Relay** health check is green — the process is bound to UDP 49737.
2. Confirm **Internet Reachability** is green. On a laptop or an unforwarded home server it will not be, and that is the correct answer.
3. From another machine, prove it end to end with upstream's probe against the key from *Show Relay Public Key*:

   ```bash
   node scripts/probe.js --relay <public-key>
   ```

   Exit 0 means the relay bridged real traffic.

## Updating the upstream version

1. Update the submodule: `git -C mirall-relay fetch && git -C mirall-relay checkout <tag>`, then commit the new pointer.
2. Add a version file under `startos/versions/` for the new upstream version, reset the downstream revision to 0, and point `versionGraph` at it — see [Versions](https://docs.start9.com/packaging/versions.html).
3. Re-check the assumptions this package makes about the image, since they are not enforced by the build:
   - the runtime user is still uid 65532 (`startos/utils.ts`),
   - `node` is still at `/nodejs/bin/node`,
   - `src/keys.js` still exports `loadOrCreateSeed`, `keyPairFromSeed` and `publicKeyZ32`,
   - `/readyz` still returns `{ ready, firewalled, publicKey }`.
4. Rebuild, sideload, and walk the test steps above.

## How to contribute

1. Fork the repository and create a branch from `main`.
2. Make your changes — including the doc updates above.
3. Run `npm run check` and `npm run prettier`.
4. Open a pull request to `main`.
