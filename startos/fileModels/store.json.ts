import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  // Derived from the seed on install, cached so the key can be shown while the
  // service is stopped. The seed itself never leaves the container.
  publicKey: z.string().catch(''),

  // Labels published in /metrics and the capability doc.
  region: z.string().catch('unknown'),
  operator: z.string().catch('unknown'),

  // Skips HyperDHT's reachability probing. Only correct on a host that really
  // is directly reachable; setting it while firewalled produces a relay that
  // advertises itself and then fails every connection.
  assumeReachable: z.boolean().catch(false),

  // Caps, in upstream's units. Byte sizes stay strings ('512MB', '4MiB') so
  // they read the same here as in upstream's docs.
  maxActiveLinks: z.number().int().catch(2000),
  maxSessionsPerKey: z.number().int().catch(64),
  maxLinkRate: z.string().catch('4MiB'),
  maxLinkBytes: z.string().catch('512MB'),

  // Comma- or space-separated public keys. Empty means unset: an empty
  // allowlist would otherwise read as "allow nobody".
  allowlist: z.string().catch(''),
  banlist: z.string().catch(''),

  logLevel: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .catch('info'),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)

export type StoreShape = z.infer<typeof shape>
