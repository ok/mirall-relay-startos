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

If your server truly has a public IP with unfiltered UDP but the check still fails, turn on **Assume Reachable** in **Configure Relay**. Only do this when you're certain — a relay that assumes wrongly advertises itself and then fails every connection it's offered.

## Back it up

The relay's identity is a seed file on this server, and its public key — the one you handed out — is derived from it. There is no way to recover it and no way to re-issue the same key.

Back this service up. If you lose the seed, everyone who added this relay has to be given a new key.

## Running it for other people

The relay is open to anyone by default, which is the normal way to run one. Bandwidth is the cost: every relayed byte comes in and goes out again.

**Configure Relay** covers the rest — capacity limits, per-connection rate and byte caps, a banlist for handling abuse, and the region/operator labels the relay publishes about itself.
