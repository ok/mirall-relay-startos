<p align="center">
  <a href="https://mirall.app">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/media/logo-dark.svg">
      <img src="docs/media/logo-light.svg" width="240" alt="Mirall">
    </picture>
  </a>
</p>

# Mirall Relay on StartOS

> **Upstream docs:** <https://github.com/ok/mirall-relay/blob/main/README.md> and [OPERATIONS.md](https://github.com/ok/mirall-relay/blob/main/OPERATIONS.md)
>
> Everything not listed in this document should behave the same as upstream
> mirall-relay 0.1.0. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable.

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
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property      | Value                                                       |
| ------------- | ----------------------------------------------------------- |
| Image         | Built from the upstream `Dockerfile` (git submodule)         |
| Architectures | x86_64, aarch64                                              |
| Base          | `gcr.io/distroless/nodejs22-debian12:nonroot`, unmodified    |
| Entrypoint    | Upstream's — `node bin/mirall-relay.js` via `useEntrypoint()` |
| Runtime user  | uid 65532 (`nonroot`), as upstream intends                   |

Upstream's CI builds the image but does not push it, so there is no
`ghcr.io/ok/mirall-relay` tag to pull; this package builds the same Dockerfile
from the pinned submodule instead.

The image is distroless — no shell, no coreutils. Every in-container helper this
package needs is therefore a `node -e` one-liner rather than a shell command.

## Volume and Data Layout

| Path              | Contents                                                     |
| ----------------- | ------------------------------------------------------------ |
| `/data`           | The `main` volume                                            |
| `/data/seed`      | The relay identity. 64-hex, mode 0600, owned by uid 65532    |
| `/data/store.json`| StartOS-side settings and a cached copy of the public key     |

`/data/seed` is the only secret and the only durable state upstream has. Its
public key is the relay's address, so losing the seed strands every client
configured with it — see [Backups](#backups-and-restore).

A StartOS volume is mounted owned by root, but the image runs as uid 65532. A
`prepare-identity` oneshot runs as root before the relay starts and hands `/data`
and the seed to the runtime user; it is idempotent and also repairs ownership
after a restore.

`MIRALL_RELAY_SEED_SECRET_FILE` is left at its upstream default. Nothing is
mounted at `/run/secrets/relay_seed`, so the seed file is authoritative.

## Installation and First-Run Flow

Upstream expects an operator to run `mirall-relay keygen`, store the seed, and
publish the printed public key. This package does that for you:

1. On install (and on restore), init derives the identity inside the container —
   creating the seed if there is none — and caches the public key in
   `store.json`, so the key is known before the relay has ever started.
2. A **critical task** prompts you to run *Show Relay Public Key*.
3. The install alert states the port-forwarding requirement and the consequence
   of losing the seed.

There is no admin account, no password, and no first-run wizard: the relay's
public key is its whole identity, and it is meant to be published.

## Configuration Management

Every upstream option is a `MIRALL_RELAY_*` environment variable, so nothing is
configured by file. The ones this package pins, and the ones it hands to you:

| Setting                             | Managed by | Value / notes                                       |
| ----------------------------------- | ---------- | --------------------------------------------------- |
| `MIRALL_RELAY_SEED_FILE`            | StartOS    | `/data/seed`                                        |
| `MIRALL_RELAY_PORT`                 | StartOS    | `49737`, pinned so the bind and firewall rules match |
| `MIRALL_RELAY_ADMIN_HOST` / `_PORT` | StartOS    | `127.0.0.1:9200`, never exported                    |
| `MIRALL_RELAY_REGION` / `_OPERATOR` | You        | *Configure Relay*                                   |
| `MIRALL_RELAY_ASSUME_REACHABLE`     | You        | *Configure Relay*, off by default                   |
| `MIRALL_RELAY_MAX_ACTIVE_LINKS`     | You        | *Configure Relay*, default 2000                     |
| `MIRALL_RELAY_MAX_SESSIONS_PER_KEY` | You        | *Configure Relay*, default 64                       |
| `MIRALL_RELAY_MAX_LINK_RATE`        | You        | *Configure Relay*, default 4MiB                     |
| `MIRALL_RELAY_MAX_LINK_BYTES`       | You        | *Configure Relay*, default 512MB                    |
| `MIRALL_RELAY_ALLOWLIST` / `_BANLIST` | You      | *Configure Relay*, unset by default                 |
| `MIRALL_RELAY_LOG_LEVEL`            | You        | *Configure Relay*, default `info`                   |

Upstream's remaining knobs (`--bootstrap`, `--ephemeral`, `--max-link-ms`,
`--max-pending`, `--session-rate`, `--over-rate-grace-ms`, `--meter-ms`) are left
at their defaults and are not exposed. Saving *Configure Relay* restarts the
relay; the identity is unaffected.

## Network Access and Interfaces

| Interface        | Port      | Protocol      | Exported |
| ---------------- | --------- | ------------- | -------- |
| `relay`          | 49737/udp | Noise (raw)   | Yes      |
| admin / metrics  | 9200/tcp  | HTTP          | No       |

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

## Actions (StartOS UI)

| Action                      | Availability | Input | Output                                                     |
| --------------------------- | ------------ | ----- | ---------------------------------------------------------- |
| **Show Relay Public Key**   | Any status   | None  | The z-base-32 key, copyable and as a QR code                |
| **Test Reachability**       | Only running | None  | Firewalled or not, plus the advertised version and limits   |
| **Configure Relay**         | Any status   | Form  | Saves to `store.json` and restarts the relay                |

*Show Relay Public Key* reads the cached key from `store.json`, falling back to
deriving it from the seed in a temporary container — so it answers while the
service is stopped, and after a restore.

## Backups and Restore

`sdk.Backups.ofVolumes('main')` — the whole volume, so both `/data/seed` and
`/data/store.json`.

**Back this service up.** The seed is not recoverable by any other means, and
without it the relay comes back with a different public key that no existing
client is configured for. Restoring re-derives the same key and repairs file
ownership automatically.

## Health Checks

| Check                    | Method                          | Grace  | Meaning                                             |
| ------------------------ | ------------------------------- | ------ | --------------------------------------------------- |
| **Relay**                | UDP 49737 listening (`/proc/net`) | 10 s   | The process is up and bound                         |
| **Internet Reachability** | `GET /readyz` on 127.0.0.1:9200 | 120 s  | 200 means listening, bootstrapped and not firewalled |

*Internet Reachability* reports a **failure** when HyperDHT finds the relay
firewalled. That is not a packaging bug: a firewalled relay serves 503 on
`/readyz` upstream too, and bridges nothing. The fix is a UDP port forward — or
*Assume Reachable*, if the host genuinely has a public IP and the probe is what
is wrong.

The two checks are separate on purpose, so a relay that is running but
unreachable is visibly distinct from one that is not running at all.

## Limitations and Differences

1. **A home server behind NAT needs a port forward.** UDP 49737 must reach this
   server. Nothing in StartOS can arrange that for you.
2. **Symmetric NAT cannot be worked around.** If your router rewrites the port of
   outbound UDP, HyperDHT cannot keep a stable mapping and the relay stays
   unusable. A host with a public IP is the only fix.
3. **The external port may not be 49737.** StartOS assigns it, preferring 49737
   but falling back if it is taken. Check the interface in the UI and forward
   whatever port it actually shows.
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

## What Is Unchanged from Upstream

- The relay binary, its Dockerfile, and its distroless runtime — no patches.
- The blind-relay guarantee: the relay bridges ciphertext and holds no session
  key.
- Every cap, its units, and its per-direction accounting.
- Access control semantics, including "both peers must be allowlisted" and the
  automatic ban after repeated cap violations.
- The admin endpoints and the capability document, byte for byte.
- The identity model: one seed, one derived ed25519 key, no rotation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build and release instructions.

---

## Quick Reference for AI Consumers

```yaml
package_id: mirall-relay
upstream_version: 0.1.0
upstream_repo: https://github.com/ok/mirall-relay
image: built from upstream Dockerfile (submodule ./mirall-relay)
architectures: [x86_64, aarch64]
volumes:
  main: /data
ports:
  relay: 49737 # udp, exported
  admin: 9200 # tcp, loopback only, not exported
dependencies: none
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
actions:
  - show-relay-key
  - test-reachability
  - configure
health_checks:
  - relay
  - reachability
```
