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

| Path                 | Contents                                                            |
| -------------------- | ------------------------------------------------------------------- |
| `/data`              | The `main` volume                                                   |
| `/data/seed`         | The relay identity. 64-hex, mode 0600, owned by uid 65532           |
| `/data/members.json` | The invite roster. Mode 0600 — holds every member's seed            |
| `/data/admin-token`  | Bearer token for `/admin/*`. Mode 0600, minted on first start       |
| `/data/store.json`   | StartOS-side settings and a cached copy of the public key            |

`/data/seed` and `/data/members.json` are the secrets. The seed's public key is
the relay's address, so losing it strands every client configured with it; the
roster holds one seed per member, so losing it revokes everyone and leaking it
hands over every membership. Both are covered by
[Backups and Restore](#backups-and-restore).

Upstream defaults the roster and the token to `./.keys/` under the working
directory. The image's own `ENV` already redirects all three files to `/data`,
and StartOS layers the daemon's environment *over* the image's rather than
replacing it, so those defaults would survive — but `relayEnv` sets
`MIRALL_RELAY_SEED_FILE`, `MIRALL_RELAY_ROSTER_FILE` and
`MIRALL_RELAY_ADMIN_TOKEN_FILE` explicitly anyway. Off the volume these files
would be recreated on every container replacement, losing the relay's address
and every membership with it, and nothing in the build would catch it.

A StartOS volume is mounted owned by root, but the image runs as uid 65532. A
`prepare-identity` oneshot runs as root before the relay starts and chowns
`/data` **recursively** to the runtime user. It runs on every start, is
idempotent, and the recursion is what makes a restore work: a backup returns the
whole volume owned by root, and upstream throws on an `admin-token` it cannot
read rather than minting a replacement, so a single root-owned file stops the
relay from starting.

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

Two interfaces are exported: the UDP port peers dial, and the operator status
page.

| Interface      | Id      | Type | Port      | Protocol    | Exported |
| -------------- | ------- | ---- | --------- | ----------- | -------- |
| Relay Endpoint | `relay` | api  | 49737/udp | Noise (raw) | Yes      |
| Status Page    | `admin` | ui   | 9200/tcp  | HTTP        | Yes      |

The `admin` interface carries two pages: the anonymous status page at `/`, and
upstream's token-gated members page at `/admin/` where invites are created and
revoked. Both are on the same port and therefore the same interface — exposing
one exposes the other's login.

The relay interface is bound with no protocol and `secure: { ssl: false }` — the
same shape StartOS uses for ssh: encrypted by the protocol itself, not by TLS, so
StartOS neither terminates nor wraps it. Such a bind becomes a plain port
forward, and StartOS installs those for TCP and UDP alike, which is what HyperDHT
needs.

Tor and `.local` addresses are meaningless here: peers reach the relay by UDP at
its public IP, not by hostname. What matters is that **UDP 49737 arrives at this
server** — forward it on your router, or run the service on a host with a public
IP.

The relay binds its admin server to `0.0.0.0` inside the container
(`MIRALL_RELAY_ADMIN_HOST`) so the StartOS proxy can serve the status page; the
health checks and actions still reach it on `127.0.0.1`. That surface splits in
two:

- **Anonymous reads** — the status page at `/`, plus `/healthz`, `/readyz`,
  `/metrics` and `/.well-known/mirall-relay.json`. Upstream's rule is that these
  show numbers, never names or secrets: no member labels, no tickets, no seed.
- **`/admin/`** — the members page: a browser UI to create, re-show and revoke
  invites. The **shell and its static assets are served without the token**
  (`/admin/`, `/admin/style.css`, `/admin/app.js`, `/admin/copy-button.js`), and
  deliberately so — a `<link>` cannot send an `Authorization` header, so
  requiring one there would mean no page could ever load to collect the token.
  The shell is static markup with empty slots; it carries no member data.
- **Everything else under `/admin/`** — the membership write surface, gated by
  upstream on a bearer token read from `/data/admin-token`. Without the token it
  answers 401. Every label, key and ticket the page shows arrives over one of
  these authenticated fetches. The token lives in the tab's `sessionStorage`
  rather than a cookie, so it is not carried on requests the page did not make.

The anonymous half has no authentication of its own, which is what makes *where
you expose it* an operator decision rather than a package one. StartOS controls
that: add the LAN or Tor addresses you want on the **Status Page** interface and
it is reachable there. **Do not bind it to a public gateway** — nothing in this
package prevents it, and doing so publishes your traffic counters and DHT state
to anyone who finds the address.

Because the interface is exported, `/metrics` *is* scrapable from wherever you
have made the interface reachable — a change from earlier revisions of this
package, which kept the surface on container loopback.

Upstream's DNS-rebinding Host guard is inert here by design: it engages only on
a loopback bind or when `MIRALL_RELAY_ADMIN_ALLOWED_HOSTS` is set, and a proxy
legitimately sets its own Host.

**Expect a warning in the logs on every start**, beginning *"the /admin/\* write
surface is bound off loopback…"*. It is upstream telling you that the bearer
token is the only thing in front of `/admin/*`, which is true and is the design
here — StartOS decides who reaches the port, and the token decides who may write.
It is not a fault and needs no action. This package leaves
`MIRALL_RELAY_ADMIN_WRITE` at upstream's default of `true` rather than disabling
the surface, because it is the only way to manage invites on StartOS short of
`start-cli package attach`. Set `MIRALL_RELAY_ADMIN_WRITE=false` in `relayEnv` if
you would rather the write surface did not exist; nothing in this package uses
it.

## Installation and First-Run Flow

Upstream expects an operator to run `mirall-relay keygen`, store the seed, and
publish the printed public key. This package does that for you, and the identity
exists before the relay has ever started.

1. On install — and again on restore — init derives the identity inside a
   temporary container, creating the seed if there is none, and caches the public
   key in `store.json`. The key is therefore available while the service is still
   stopped, so you can hand it out while the port forward is still being sorted.
2. Nothing blocks the first start. An earlier revision raised a `critical` task
   asking the operator to look at the public key; it is gone. See [Tasks](#tasks).
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
It distinguishes *measured* from *asserted*: with **Assume Reachable** on,
`firewalled: false` is something the relay was told rather than something it
found out, and the action says so instead of reporting success. Read-only,
instant, safe to repeat, and requires the service to be running.

**Configure Relay** — run it to set the operator labels, the traffic caps, the
allow/ban lists, the log level, or *Assume Reachable*. Saving writes the form to
`store.json` and **restarts the relay**, which drops in-flight relayed
connections; clients re-establish, falling back to a direct path where one
exists. The seed and the public key are untouched, so the relay's address does
not change. Safe to repeat.

## Tasks

**None.** The package raises no tasks.

It used to raise one `critical` task on install and on every restore, asking the
operator to run *Show Relay Public Key*. It was removed: a `critical` task blocks
the service from starting, and this one only asked someone to look at a key that
*Show Relay Public Key* displays at any time, including while the service is
stopped. Worse, it re-raised on every reinstall, so a routine package update
refused to start until somebody acknowledged a prompt that told them nothing new.

If a support conversation mentions a task blocking startup, the install predates
`0.1.0:2` and the fix is to update.

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
wholesale, nothing dumped and replayed. That captures `/data/seed`,
`/data/members.json`, `/data/admin-token` and `/data/store.json`. A backup of
this service therefore contains the relay's identity *and* every member's seed;
treat the backup with the care those two secrets deserve.

Nothing is deliberately excluded, because nothing on the volume is a cache: the
relay's sessions, links and meter samples are all in memory and disposable by
design.

**Back this service up.** The seed is not recoverable by any other means, and
without it the relay comes back with a different public key that no existing
client is configured for. Losing `members.json` separately revokes every member,
since each membership *is* its seed.

A restored instance re-derives the same key, repairs file ownership
automatically — see the recursive chown under
[Volume and Data Layout](#volume-and-data-layout) — and needs nothing re-entered.
It raises no task. The port forward has to exist wherever it now runs.

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
4. **Invites are managed on upstream's members page, not by a StartOS action.**
   Members are created, re-shown and revoked at `/admin/` on the **Status Page**
   interface — reached by appending `admin/` to that interface's address, because
   upstream only renders an on-page link to it once `access.mode` is already
   `invite` (`manageSentence` is gated on the mode in `src/admin-ui.js`). In this
   package's default `open` mode there is no link, which is worth knowing since
   minting members is the thing you must do *before* switching the mode. Auth is
   the admin token from `/data/admin-token`, logged exactly once on the boot that
   mints it, so recover it from that boot's service logs or read the file:

   ```
   start-cli package attach mirall-relay -n mirall-relay-sub -- \
     /nodejs/bin/node -e "console.log(require('fs').readFileSync('/data/admin-token','utf8'))"
   ```

   No *Create Invite* action is wrapped around this on purpose: upstream's page
   already does the job the actions would, and duplicating it would put two
   writers on the roster with no gain. `mirall-relay invite …` also still works
   through `start-cli package attach`.

   What is genuinely absent is an **access-mode field** — there is no toggle in
   *Configure Relay* for `MIRALL_RELAY_ACCESS`, so the relay stays in upstream's
   default `open` mode. It is left out because switching to `invite` with an
   empty roster refuses every connection, and a field that can do that without
   the operator having minted an invite first is a trap. Mint members on the
   page, then set the mode.

   The `mirall://relay/…` ticket a member receives is a **bearer credential** —
   whoever holds it is that member — and needs a Mirall client that understands
   tickets.
5. **`scripts/probe.js` is not exposed as an action.** It needs outbound DHT
   access and two throwaway nodes; use *Test Reachability*, or run the probe from
   another machine against the public key.
6. **The allowlist cannot pin end users**, exactly as upstream documents: a
   Mirall client's DHT node key is regenerated on every app start, so the
   *Allowlist* field in *Configure Relay* only pins infrastructure whose DHT
   identity you control. Upstream's answer to a private relay for people is
   invite membership, where the member's identity derives from the seed in their
   ticket and is therefore stable — see limitation 4 for its status here.
7. **No seed rotation action.** Rotating the seed changes the relay's address and
   strands every configured client, so it is deliberately not a button. To do it
   anyway, uninstall and reinstall.
8. **Upstream's remaining knobs are not exposed.** `--bootstrap`, `--ephemeral`,
   `--max-link-ms`, `--max-pending`, `--session-rate`, `--over-rate-grace-ms`,
   `--meter-ms`, `--access`, `--admin-write` and `--admin-ui` are left at their
   upstream defaults and have no form field.
9. **A changed WAN address makes reachability red for a while.** HyperDHT
   decides `firewalled` by probing the public address it has observed, so when
   the line reconnects on a new IP the verdict is stale until the node
   re-establishes what its address is. It *does* recover unattended — one
   instance was observed going from `firewalled: true` to `false` across roughly
   an hour and a half with no restart, tracking the address change — but not
   quickly. Restarting the service forces an immediate re-measure and is the
   faster fix. Suspect this whenever reachability goes red with no configuration
   change, on a connection whose ISP forces periodic reconnects; check the
   *Status Page* for the public address the relay currently believes it has, and
   whether your port forward matches it.
10. **The status page has no authentication of its own.** StartOS is what stands
   in front of it. Exposing the *Status Page* interface on a public gateway
   publishes the relay's traffic counters and DHT state — see
   [Network Access and Interfaces](#network-access-and-interfaces).

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
  - MIRALL_RELAY_ROSTER_FILE
  - MIRALL_RELAY_ADMIN_TOKEN_FILE
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
  relay: { type: api, port: 49737, protocol: udp }
  admin: { type: ui, port: 9200, protocol: http, name: Status Page }
actions:
  - show-relay-key
  - test-reachability
  - configure
admin_pages:
  "/": anonymous status page
  "/admin/": members page, bearer token from /data/admin-token (shell + assets anonymous)
tasks: none
health_checks:
  - relay
  - reachability
access_mode: open   # upstream default; invite membership is not exposed as an action
secrets_on_volume:
  - /data/seed
  - /data/members.json
  - /data/admin-token
```
