# Contributing

This repo packages [mirall-relay](https://github.com/ok/mirall-relay) for StartOS. The upstream project is a git submodule at `./mirall-relay`, and the image is built from its Dockerfile.

## Documentation — keep it in sync

- **`README.md`** — how this package differs from running mirall-relay under Docker. For developers and AI assistants.
- **`instructions.md`** — the user-facing instructions packed into the `.s9pk` and shown on the **Instructions** tab in StartOS.
- **`UPDATING.md`** — how to bump the pinned upstream version, and what to re-verify when you do.
- **`AGENTS.md`** — context for AI assistants working in this repo.
- **`CONTRIBUTING.md`** — this file.

**Any code change that warrants it must update `README.md` and `instructions.md` in the same change** — a new or renamed action, an added or removed volume / port / interface / dependency, a changed default, a new limitation, any altered user-visible behavior.

## Building

See the [StartOS Packaging Guide](https://docs.start9.com/packaging/) for environment setup, then:

```bash
git submodule update --init   # fetch the upstream source
npm ci                        # install dependencies
make                          # build .s9pk for x86_64 and aarch64
make install                  # sideload to the workspace's default host
```

The build plumbing comes from the SDK — `Makefile` includes
`node_modules/@start9labs/start-sdk/s9pk.mk`, and `tsconfig.json` extends
`@start9labs/start-sdk/tsconfig.base.json`, so bumping the SDK delivers build-system fixes too.
`make install` and `make publish` resolve the host and registry through `start-cli` — the
`host` / `registry` profiles in the packaging workspace's `.startos/config.yaml`, or `-H` / `-r`.

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

### Reproducing **Port unstable** on demand

To check that every surface reports a rewritten outbound port, inject one on the
StartOS server with a separate nftables table that runs ahead of StartOS's own NAT, so
nothing of StartOS's has to be edited or restored. Peers cannot connect for as long as
it is in place.

```bash
IF=<uplink interface>        # e.g. from: ip route show default
RIP=<relay container IP>     # e.g. from: sudo lxc-info -n <relay container> -iH
PUBLIC_IP=<the IP address on $IF>

sudo nft add table ip portfault
sudo nft add chain ip portfault post '{ type nat hook postrouting priority srcnat - 10; }'

# Fault A — a different port per destination:
sudo nft add rule ip portfault post ip saddr $RIP udp sport 49737 oifname "$IF" masquerade random
# Fault B — one consistent wrong port (only relay-initiated flows are rewritten):
#   sudo nft flush chain ip portfault post
#   sudo nft add rule ip portfault post ip saddr $RIP udp sport 49737 oifname "$IF" snat ip to $PUBLIC_IP:31562

sudo conntrack -D -p udp -s $RIP   # so existing flows pick up the rule
```

Then **restart the relay**. A relay that is already running re-samples its address
slowly (a known DHT node every 30 minutes) and can take that long to notice. And it
can come and go: replies on flows other nodes started keep the real port, so within
a minute of the restart the relay may settle on it again and genuinely be reachable.
Read the surfaces in the first minute after the restart: *Internet Reachability* red with "outbound port is being rewritten",
*Test Reachability* "Reachable from the internet: No", the status page **Port
unstable**, `/readyz` 503 with `state: "port-unstable"`. Remove it with
`sudo nft delete table ip portfault` and `sudo conntrack -D -p udp -s $RIP`; the relay
recovers on its own and logs `outbound UDP port is stable again`.

## Updating the upstream version

See [UPDATING.md](UPDATING.md).

## How to contribute

1. Fork the repository and create a branch from `main`.
2. Make your changes — including the doc updates above.
3. Run `npm run check` and `npm run prettier`.
4. Open a pull request to `main`.
