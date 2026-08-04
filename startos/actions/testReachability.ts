import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { adminBaseUrl, fetchReadyz } from '../utils'

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
    const { ready, firewalled } = await fetchReadyz()
    const res = await fetch(`${adminBaseUrl}/.well-known/mirall-relay.json`, {
      signal: AbortSignal.timeout(3000),
    })
    const doc = (await res.json()) as CapabilityDoc

    const verdict = !ready
      ? i18n('The relay is still starting up. Try again in a minute.')
      : firewalled
        ? i18n(
            'Firewalled: peers cannot reach this relay. Forward UDP port 49737 to this server, or turn on "Assume Reachable" if it already has a public IP.',
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
            value: firewalled === false ? i18n('Yes') : i18n('No'),
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
