# Mirall Relay

You've installed a relay for [Mirall](https://mirall.app). It connects two Mirall peers that can't reach each other directly — office Wi-Fi, mobile hotspots, symmetric NAT — by bridging their already-encrypted connection. It cannot read what passes through it: not identities, not spaces, not file names, not contents.

## Documentation

- [mirall-relay README](https://github.com/ok/mirall-relay/blob/main/README.md) — what a blind relay is and what it can and cannot see.
- [OPERATIONS.md](https://github.com/ok/mirall-relay/blob/main/OPERATIONS.md) — running one in earnest: metrics, caps, abuse handling.

## Getting set up

**1. Make UDP port 49737 reach this server.**

This is the whole job, and it's the one thing StartOS can't do for you. Peers connect to the relay directly over UDP after a hole punch, so the port has to arrive here:

- **Server with a public IP** (VPS, colo): nothing to do, beyond any firewall it has.
- **Home server behind a router**: forward UDP 49737 to this server. Check the **Relay Endpoint** interface on the Dashboard first — StartOS prefers port 49737 but will pick another if it's taken, and you forward the one shown there.

**2. Copy the relay's public key.**

Run the **Show Relay Public Key** action. That key is the relay's entire address — there's no host, port, token or account. It's safe to publish anywhere.

**3. Add it in Mirall.**

In Mirall, go to **Settings → Network → Add a relay** and paste the key, then press **Test**. Do this on both peers when you can: one side is enough for a connection to succeed, but if the peer *without* a relay is the one on the restrictive network, the connection only recovers after the direct attempt times out.

Relaying only engages when a direct connection can't be made, so configuring a relay costs nothing on networks that already work.

## Checking that it works

The **Internet Reachability** health check answers the only question that matters. Green means peers can reach you and the relay is bridging. Red means they can't — go back to step 1.

Give it a couple of minutes after starting: the relay has to join the DHT and have its address confirmed by other nodes before it knows whether it's reachable.

For more detail, run **Test Reachability**: it reports whether the relay is firewalled, along with the version and limits it advertises to clients.

**If reachability goes red on its own, restart the service first.** Many home connections are given a new public IP by the ISP every so often, and when that happens the relay keeps reporting *firewalled* for a while even though your port forward is fine — it's still probing the address it used to have. It does sort itself out eventually, but that can take an hour or more; restarting re-checks straight away.

If it stays red after a restart, check the public address shown on the **Status Page** and make sure your router still forwards UDP 49737 to this server — a forward set up against an older address, or pointed at a LAN address the server no longer has, is the usual culprit.

If your server truly has a public IP with unfiltered UDP but the check still fails, turn on **Assume Reachable** in **Configure Relay**. Only do this when you're certain — a relay that assumes wrongly advertises itself and then fails every connection it's offered. With it on, the health check and **Test Reachability** both say the reachability was *asserted rather than measured*, because at that point nothing has actually tested it.

## The status page

The **Status Page** interface, on the service's Dashboard, shows the same things in a browser: the public key with a QR code to scan from a phone, whether peers can reach the relay in plain language, and the traffic it has carried.

It has no password of its own — StartOS is what keeps it private, so reach it over your LAN or a Tor address and **don't put it on a public gateway**. Anyone who can open it can read your relay's traffic counters.

## Back it up

The relay's identity is a seed file on this server, and its public key — the one you handed out — is derived from it. There is no way to recover it and no way to re-issue the same key.

Back this service up. If you lose the seed, everyone who added this relay has to be given a new key. If you have invited members (below), their memberships live on the same volume and go the same way.

A backup of this service therefore contains your relay's identity and every member's credential. Keep it somewhere you'd keep a password file.

The same applies to uninstalling: it deletes the seed, and with it the public key. Anyone who added this relay in Mirall is left holding a key that no longer resolves to anything.

## Running it for other people

The relay is open to anyone by default, which is the normal way to run one. Bandwidth is the cost: every relayed byte comes in and goes out again.

**Configure Relay** covers the rest — capacity limits, per-connection rate and byte caps, a banlist for handling abuse, and the region/operator labels the relay publishes about itself.

### Running a private relay

The relay can also run closed, admitting only people you've invited. You manage that from the **members page** in your browser.

**1. Get the admin token.** It's generated the first time the relay starts and written to the service's data. Read it with:

```
start-cli package attach mirall-relay -n mirall-relay-sub -- \
  /nodejs/bin/node -e "console.log(require('fs').readFileSync('/data/admin-token','utf8'))"
```

**2. Open the members page.** Take the **Status Page** address from your Dashboard and add `admin/` to the end of it. Paste the token once — the page keeps it for that browser tab only, and asks again in a new one.

(The status page only links to the members page once the relay is already in invite mode, so while it's still open you have to type the address yourself.)

**3. Add a member.** Give them a short label. You get back a `mirall://relay/…` invite line; send it to that person and they paste it into Mirall in place of a relay key. You can re-show an invite later if they lose it, and revoke one at any time — revoking cuts their live connections, not just future ones.

Two things to know. An invite is a **bearer credential** — whoever holds the string is that member, so send it like a password and issue one per person, not one per device. And the relay is still **open** until you switch it: this package doesn't expose that switch, deliberately, because turning on invite mode before you've added anyone refuses *every* connection. Add your members first, then set `MIRALL_RELAY_ACCESS=invite` as described in [OPERATIONS.md](https://github.com/ok/mirall-relay/blob/main/OPERATIONS.md).

Keep the members list in your backups — it holds every member's credential, and losing it means re-inviting everyone.

The **Allowlist** field in **Configure Relay** is not a substitute: Mirall picks a new network identity every time the app starts, so an allowlist can only pin servers you run, never people.
