<p align="center">
  <a href="https://mirall.app">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/media/logo-dark.svg">
      <img src="docs/media/logo-light.svg" width="240" alt="Mirall Logo">
    </picture>
  </a>
</p>

# Mirall Relay on StartOS

> Everything not listed in this document should behave the same as upstream
> mirall-relay. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

A blind relay for [Mirall](https://mirall.app): it bridges two already-encrypted
streams between peers that cannot hole-punch to each other, and can read neither
side. Upstream source: <https://github.com/ok/mirall-relay>.

**The one thing to know before installing:** a relay is only useful if peers on
the internet can reach its UDP port. On a home server behind NAT that means a
port forward. Without one the service still runs, but the *Internet
Reachability* health check fails and nothing is relayed.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package builds upstream's own Dockerfile from a pinned git submodule rather
than pulling a published image, so the relay binary and its runtime are
upstream's, unmodified.

| Property      | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| Image         | Built from the upstream `Dockerfile` (git submodule)          |
| Architectures | x86_64, aarch64                                               |
| Base          | Upstream's distroless Node base, unmodified                   |
| Entrypoint    | Upstream's — `node bin/mirall-relay.js` via `useEntrypoint()`  |
| Runtime user  | uid 65532 (`nonroot`), as upstream intends                    |

The service runs in one long-lived subcontainer, **`mirall-relay-sub`** — the one
to attach to on a running install. Two short-lived subcontainers also appear:
`init-identity` during install and restore, and `show-relay-key` when that action
has to derive the key from the seed. Neither outlives its task.

The base is distroless — no shell, no coreutils. Every in-container helper this
package needs is therefore a `node -e` one-liner rather than a shell command, and
attaching to a subcontainer gives you Node rather than a prompt.

## Volume and Data Layout

One volume holds everything durable: the relay's identity and the package's own
settings.

| Path               | Contents                                                   |
| ------------------ | ---------------------------------------------------------- |
| `/data`            | The `main` volume                                          |
| `/data/seed`       | The relay identity. 64-hex, mode 0600, owned by uid 65532  |
| `/data/store.json` | StartOS-side settings and a cached copy of the public key   |

`/data/seed` is the only secret and the only durable state upstream has. Its
public key is the relay's address, so losing the seed strands every client
configured with it — see [Backups and Restore](#backups-and-restore).

A StartOS volume is mounted owned by root, but the image runs as uid 65532. A
`prepare-identity` oneshot runs as root before the relay starts and hands `/data`
and the seed to the runtime user; it is idempotent and also repairs ownership
after a restore.

`MIRALL_RELAY_SEED_SECRET_FILE` is left at its upstream default. Nothing is
mounted at `/run/secrets/relay_seed`, so the seed file is authoritative.

## File Models

The package owns one file, `store.json`, and writes no upstream configuration at
all — every upstream option is delivered as an environment variable instead.

**`/data/store.json`** (JSON, on the `main` volume) holds StartOS-side state: the
cached public key plus every setting exposed by *Configure Relay*. It is seeded
during init with the derived public key, and rewritten whenever *Configure Relay*
is saved. *Show Relay Public Key* also writes back to it if it had to derive the
key from the seed because the cache was empty.

Ownership splits cleanly. The configuration keys — region, operator, caps,
allowlist, banlist, log level, assume-reachable — belong to you: nothing
re-asserts them, and they persist until you change them again. The `publicKey`
key belongs to the package; it is derived from the seed and re-derived whenever
it is missing, so overwriting it by hand is pointless rather than harmful.

A hand edit to `store.json` survives on disk, but **it does not reach a running
relay**. Upstream reads its configuration only from the environment, and this
package builds that environment from `store.json` once, when the daemon starts. A
hand edit therefore takes effect on the next service restart and not before; use
*Configure Relay*, which restarts the relay for you.

## Dependencies

None. The relay talks to the public HyperDHT and to its peers, and needs no other
service on the server.

## Network Access and Interfaces

One interface is exported — the UDP port peers dial. The operator surface is
deliberately not exported.

| Interface       | Id      | Type | Port      | Protocol    | Exported |
| --------------- | ------- | ---- | --------- | ----------- | -------- |
| Relay Endpoint  | `relay` | api  | 49737/udp | Noise (raw) | Yes      |
| admin / metrics | —       | —    | 9200/tcp  | HTTP        | No       |

The relay interface is bound with no protocol and `secure: { ssl: false }` — the
same shape StartOS uses for ssh: encrypted by the protocol itself, not by TLS, so
StartOS neither terminates nor wraps it. Such a bind becomes a plain port
forward, and StartOS installs those for TCP and UDP alike, which is what HyperDHT
needs.

Tor and `.local` addresses are meaningless here: peers reach the relay by UDP at
its public IP, not by hostname. What matters is that **UDP 49737 arrives at this
server** — forward it on your router, or run the service on a host with a public
IP.

The admin surface (`/healthz`, `/readyz`, `/metrics`,
`/.well-known/mirall-relay.json`) has no authentication and exposes internals, so
this package keeps it on container loopback, where only the health checks and
actions can reach it. It is deliberately not available for Prometheus scraping
from another host.

## Installation and First-Run Flow

Upstream expects an operator to run `mirall-relay keygen`, store the seed, and
publish the printed public key. This package does that for you, and the identity
exists before the relay has ever started.

1. On install — and again on restore — init derives the identity inside a
   temporary container, creating the seed if there is none, and caches the public
   key in `store.json`. The key is therefore available while the service is still
   stopped, so you can hand it out while the port forward is still being sorted.
2. A critical task prompts you to run *Show Relay Public Key*. See
   [Tasks](#tasks) — it holds the service until you clear it.
3. `instructions.md` — the **Instructions** tab in StartOS — states the
   port-forwarding requirement and the consequence of losing the seed. StartOS
   has no per-package lifecycle alerts, so that is where those warnings live.

There is no admin account, no password, and no first-run wizard: the relay's
public key is its whole identity, and it is meant to be published.

## Actions

Three actions, none of them destructive. The relay's identity is never rotated or
regenerated by any of them.

**Show Relay Public Key** — run it whenever you need the key to paste into
Mirall, including while the service is stopped. It normally reads the cached
value from `store.json` and returns instantly; if the cache is empty it spins up
a temporary container to derive the key from the seed, which takes a few seconds
and writes the result back. It changes nothing else, never interrupts the running
relay, and is safe to repeat. Returns the z-base-32 key, copyable and as a QR
code.

**Test Reachability** — run it when the *Internet Reachability* health check is
red and you want the underlying detail, or after changing a port forward. It
queries the relay's own admin endpoint and reports whether HyperDHT considers the
node firewalled, along with the version and caps the relay advertises to clients.
Read-only, instant, safe to repeat, and requires the service to be running.

**Configure Relay** — run it to set the operator labels, the traffic caps, the
allow/ban lists, the log level, or *Assume Reachable*. Saving writes the form to
`store.json` and **restarts the relay**, which drops in-flight relayed
connections; clients re-establish, falling back to a direct path where one
exists. The seed and the public key are untouched, so the relay's address does
not change. Safe to repeat.

## Tasks

The package creates one task, and it is `critical` — which means it blocks the
service from starting and suspends the ordinary controls until it is cleared. A
user reporting "I can't start the relay and there are no buttons" is almost
certainly looking at it.

| Task                        | Severity | Raised by                  | Cleared by         |
| --------------------------- | -------- | -------------------------- | ------------------ |
| Run *Show Relay Public Key* | critical | Install, and every restore | Running the action |

It exists because a relay nobody has the key for is inert: the key is the only
address the relay has, and handing it out is the one setup step that cannot be
automated. It is raised on this service's own page, not on another package's. It
returns after a restore, because a restored instance runs init again — the key is
the same one as before, so clearing it a second time is a formality.

## Health Checks

Two checks, kept separate so that a relay which is running but unreachable is
visibly distinct from one that is not running at all.

| Check                     | Method                            | Grace | Meaning                                              |
| ------------------------- | --------------------------------- | ----- | ---------------------------------------------------- |
| **Relay**                 | UDP 49737 listening (`/proc/net`) | 10 s  | The process is up and bound                          |
| **Internet Reachability** | `GET /readyz` on 127.0.0.1:9200   | 120 s | 200 means listening, bootstrapped and not firewalled |

**Relay** failing means the process did not start or could not bind — check the
logs for a configuration error, since upstream refuses to boot on a malformed cap
or key list rather than starting with a bad value.

**Internet Reachability** failing is the common case and usually not a fault in
the package. It reports a failure when HyperDHT finds the relay firewalled; a
firewalled relay serves 503 on `/readyz` upstream too, and bridges nothing. The
fix is a working UDP port forward — or *Assume Reachable*, if the host genuinely
has a public IP and it is the probe that is wrong. The long grace period is
deliberate: the node has to join the DHT and have its address confirmed by other
nodes before it can know, so red for the first minute or two means nothing.

## Backups and Restore

The strategy is `sdk.Backups.ofVolumes('main')` — the whole volume copied
wholesale, nothing dumped and replayed. That captures both `/data/seed` and
`/data/store.json`.

Nothing is deliberately excluded, because nothing on the volume is a cache: the
relay's sessions, links and meter samples are all in memory and disposable by
design.

**Back this service up.** The seed is not recoverable by any other means, and
without it the relay comes back with a different public key that no existing
client is configured for. A restored instance re-derives the same key, repairs
file ownership automatically, and needs nothing re-entered — but it does raise the
setup task again, and the port forward has to exist wherever it now runs.

## Limitations and Differences

1. **A home server behind NAT needs a port forward.** UDP 49737 must reach this
   server. Nothing in StartOS can arrange that for you.
2. **Symmetric NAT cannot be worked around.** If your router rewrites the port of
   outbound UDP, HyperDHT cannot keep a stable mapping and the relay stays
   unusable. A host with a public IP is the only fix.
3. **The external port must be 49737, not merely forwarded.** StartOS prefers
   49737 but falls back to another port if it is already taken, and a fallback
   cannot work: HyperDHT probes reachability by asking remote nodes to send
   packets to its *local* socket port at the observed public IP, so an external
   port that differs can never pass. Check the Relay Endpoint interface after
   install, and if it did not get 49737, free that port rather than forwarding
   the one it shows.
4. **`/metrics` is not scrapable from outside the container.** The admin surface
   is loopback-only; upstream's `deploy/prometheus-scrape.example.yml` assumes a
   sidecar this package does not run.
5. **`scripts/probe.js` is not exposed as an action.** It needs outbound DHT
   access and two throwaway nodes; use *Test Reachability*, or run the probe from
   another machine against the public key.
6. **Allowlisting end users does not work**, exactly as upstream documents: a
   Mirall client's DHT node key is regenerated on every app start. The allowlist
   only pins infrastructure whose DHT identity you control.
7. **No seed rotation action.** Rotating the seed changes the relay's address and
   strands every configured client, so it is deliberately not a button. To do it
   anyway, uninstall and reinstall.
8. **Upstream's remaining knobs are not exposed.** `--bootstrap`, `--ephemeral`,
   `--max-link-ms`, `--max-pending`, `--session-rate`, `--over-rate-grace-ms` and
   `--meter-ms` are left at their upstream defaults and have no form field.

---

## Quick Reference for AI Consumers

```yaml
package_id: mirall-relay
image: built from upstream Dockerfile (submodule ./mirall-relay)
architectures: [x86_64, aarch64]
subcontainers: [mirall-relay-sub]
volumes:
  main: /data
file_models:
  - store.json
startos_managed_env_vars:
  - MIRALL_RELAY_SEED_FILE
  - MIRALL_RELAY_PORT
  - MIRALL_RELAY_ADMIN_HOST
  - MIRALL_RELAY_ADMIN_PORT
  - MIRALL_RELAY_REGION
  - MIRALL_RELAY_OPERATOR
  - MIRALL_RELAY_ASSUME_REACHABLE
  - MIRALL_RELAY_MAX_ACTIVE_LINKS
  - MIRALL_RELAY_MAX_SESSIONS_PER_KEY
  - MIRALL_RELAY_MAX_LINK_RATE
  - MIRALL_RELAY_MAX_LINK_BYTES
  - MIRALL_RELAY_ALLOWLIST
  - MIRALL_RELAY_BANLIST
  - MIRALL_RELAY_LOG_LEVEL
dependencies: none
interfaces:
  relay: { type: api, port: 49737 }
actions:
  - show-relay-key
  - test-reachability
  - configure
tasks:
  - { action: show-relay-key, severity: critical }
health_checks:
  - relay
  - reachability
```
