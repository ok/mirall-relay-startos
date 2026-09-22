import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  adminBaseUrl,
  fetchReadyz,
  fetchStatus,
  StatusReachability,
} from '../utils'

// The address the relay believes the internet sees, and why it is not usable
// when it is not. The configured port is never printed as if it were observed.
function seenFromOutside(r: StatusReachability): string {
  if (!r.publicHost) return i18n('not known yet')
  if (r.portRandomized || !r.publicPort) {
    return `${r.publicHost} (${i18n('port changes per destination')})`
  }
  if (r.bound && r.publicPort !== r.bound.port) {
    return `${r.publicHost}:${r.publicPort} (${i18n('listens on')} ${r.bound.port})`
  }
  return `${r.publicHost}:${r.publicPort}`
}

type CapabilityDoc = {
  version: string
  publicKey: string
  region: string
  operator: string
  caps: {
    maxSessionsPerKey: number
    maxActiveLinks: number
    maxLinkBytes: number
    maxLinkRateBytesPerSecond: number
    maxLinkDurationMs: number
  }
}

export const testReachability = sdk.Action.withoutInput(
  'test-reachability',

  async () => ({
    name: i18n('Test Reachability'),
    description: i18n(
      'Ask the relay whether the internet can reach it, and show the limits it advertises.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  async () => {
    const { ready, state, firewalled, probed } = await fetchReadyz()
    const { reachability } = await fetchStatus()
    const res = await fetch(`${adminBaseUrl}/.well-known/mirall-relay.json`, {
      signal: AbortSignal.timeout(3000),
    })
    const doc = (await res.json()) as CapabilityDoc

    // Before upstream 0.4.2 there is no `state`; firewalled: false was the
    // whole verdict then.
    const reachable =
      state === undefined ? firewalled === false : state === 'reachable'

    const verdict = !ready
      ? i18n('The relay is still starting up. Try again in a minute.')
      : firewalled
        ? i18n(
            'Firewalled: peers cannot reach this relay. Forward UDP port 49737 to this server, or turn on "Assume Reachable" if it already has a public IP.',
          )
        : state === 'port-unstable'
          ? i18n(
              'Port unstable: peers can reach the relay, but its outbound UDP port is rewritten on the way out, so they cannot connect to it directly. Check in this order: its Outbound Gateway must be the gateway its public address is on (StartTunnel if you publish through StartTunnel); restart the relay to clear stale NAT state; if it persists, the network in front of it rewrites ports, so use a router port forward on a public IPv4, or StartTunnel. See Limitations in the instructions.',
            )
          : state === 'unknown'
            ? i18n(
                'Still learning its public address, as after a change of your public IP. Try again in a few minutes.',
              )
            : probed === false
              ? i18n(
                  'Assumed reachable: "Assume Reachable" is on, so nothing measured this. Run the probe from another machine before publishing the key.',
                )
              : i18n('Reachable: the relay is bridging connections.')

    return {
      version: '1' as const,
      title: i18n('Reachability'),
      message: verdict,
      result: {
        type: 'group' as const,
        value: [
          {
            type: 'single' as const,
            name: i18n('Public Key'),
            description: null,
            value: doc.publicKey,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Reachable from the internet'),
            description: null,
            value: reachable
              ? probed === false
                ? i18n('Assumed — not measured')
                : i18n('Yes')
              : i18n('No'),
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Seen from outside as'),
            description: null,
            value: seenFromOutside(reachability),
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Version'),
            description: null,
            value: doc.version,
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Labels'),
            description: null,
            value: `${doc.operator} / ${doc.region}`,
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Limits'),
            description: null,
            // Per link and per direction, as upstream accounts them.
            value: [
              `${doc.caps.maxActiveLinks} links`,
              `${doc.caps.maxSessionsPerKey} sessions/key`,
              `${Math.round(doc.caps.maxLinkRateBytesPerSecond / 1024 / 1024)} MiB/s`,
              `${Math.round(doc.caps.maxLinkBytes / 1024 / 1024)} MiB`,
            ].join(' · '),
            masked: false,
            copyable: false,
            qr: false,
          },
        ],
      },
    }
  },
)
