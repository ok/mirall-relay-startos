export const DEFAULT_LANG = 'en_US'

const dict = {
  // actions/configure.ts
  Region: 0,
  'Label published in the relay’s capability document and metrics. Purely informational.': 1,
  Operator: 2,
  'Assume Reachable': 3,
  'Skip reachability probing. Only turn this on for a host you know has a public IP with unfiltered UDP — otherwise the relay advertises itself and then fails every connection.': 4,
  'Max Active Links': 5,
  'Global ceiling on bridged streams. Two streams make one relayed connection.': 6,
  'Max Sessions Per Device': 7,
  'Sessions one peer device may hold. Relaying to N peers costs 2 × N sessions, so the default of 64 allows about 32 peers.': 8,
  'Max Link Rate': 9,
  'Throughput cap per link, per direction. Accepts sizes like 4MiB or 2MB.': 10,
  'Max Link Bytes': 11,
  'Total bytes a link may carry per direction before it is torn down.': 12,
  Allowlist: 13,
  'Private relay: only these peer keys may connect, and BOTH peers of a connection must be listed. Note that a Mirall client’s DHT key is fresh on every app start, so this can only pin infrastructure you control. Leave empty for an open relay.': 14,
  Banlist: 15,
  'Peer keys refused at connect time. The right tool for ad-hoc abuse handling on an open relay.': 16,
  'Log Level': 17,
  'Configure Relay': 18,
  'Set the relay’s labels, capacity limits and access control': 19,

  // actions/showRelayKey.ts
  'Show Relay Public Key': 20,
  'Display the key to paste into Mirall under Settings → Network. It is safe to publish.': 21,
  'Relay Public Key': 22,
  'Paste this into Mirall under Settings → Network → Add a relay, on both peers where you can. There is no host, port or token — the key is the whole address.': 23,
  'Public Key': 24,

  // actions/testReachability.ts
  'Test Reachability': 25,
  'Ask the relay whether the internet can reach it, and show the limits it advertises.': 26,
  'The relay is still starting up. Try again in a minute.': 27,
  'Firewalled: peers cannot reach this relay. Forward UDP port 49737 to this server, or turn on "Assume Reachable" if it already has a public IP.': 28,
  'Reachable: the relay is bridging connections.': 29,
  Reachability: 30,
  'Reachable from the internet': 31,
  Yes: 32,
  No: 33,
  Version: 34,
  Labels: 35,
  Limits: 36,

  // init/initializeService.ts

  // interfaces.ts
  'Relay Endpoint': 38,
  'The UDP endpoint peers dial. Reachable from the public internet, or the relay is of no use.': 39,

  // main.ts
  'Peers on the internet can reach this relay': 40,
  'Peers cannot reach this relay. Forward UDP port 49737 to this server, or turn on "Assume Reachable" if it already has a public IP.': 41,
  'Joining the DHT and probing reachability': 42,
  'Waiting for the relay to answer': 43,
  Relay: 44,
  'The relay is listening': 45,
  'The relay is not listening': 46,
  'Internet Reachability': 47,
  'Status Page': 48,
  'The relay’s public key with a QR code, whether peers can reach it, and the traffic it has carried': 49,
  'Running, but reachability was asserted rather than measured — "Assume Reachable" is on. Confirm it from another machine.': 50,
  'Assumed reachable: "Assume Reachable" is on, so nothing measured this. Run the probe from another machine before publishing the key.': 51,
  'Assumed — not measured': 52,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
