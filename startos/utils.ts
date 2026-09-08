// Constants and in-container helper scripts shared across the package.
import { sdk } from './sdk'

// The relay's UDP port. Peers dial it after HyperDHT hole-punching, so it has
// to be reachable from the public internet — see interfaces.ts.
export const relayPort = 49737

// The operator surface: the status page, /healthz, /readyz, /metrics and the
// capability doc. Exported as a UI interface over LAN and Tor only — it has no
// authentication of its own, so StartOS supplies it and interfaces.ts keeps the
// binding off any public gateway.
export const adminPort = 9200
export const adminBaseUrl = `http://127.0.0.1:${adminPort}`

export const dataMountpoint = '/data'
export const seedFile = `${dataMountpoint}/seed`

// The seed and store.json are the only durable state; both live here.
export const relayMounts = sdk.Mounts.of().mountVolume({
  volumeId: 'main',
  subpath: null,
  mountpoint: dataMountpoint,
  readonly: false,
})

// The image's runtime user (distroless 'nonroot'). A freshly mounted StartOS
// volume belongs to root, so without prepareIdentityScript the relay can
// neither create its seed nor read one restored from a backup.
const runtimeUid = 65532

// Everything in-container runs through `node -e`: the image is distroless, so
// it has no shell and no coreutils — only /nodejs/bin/node.
export const nodeBin = '/nodejs/bin/node'

/**
 * Run as root before the relay starts. Hands the data directory to the runtime
 * user, materializes the seed if this is a first run, and prints the derived
 * public key — the z-base-32 string users paste into Mirall.
 *
 * Deriving the key here rather than reading it from /readyz means it is
 * available before the relay has joined the DHT, and while the service is
 * stopped.
 */
export const prepareIdentityScript = `
const fs = require('fs')
fs.mkdirSync('${dataMountpoint}', { recursive: true })
fs.chownSync('${dataMountpoint}', ${runtimeUid}, ${runtimeUid})
import('/app/src/keys.js')
  .then((keys) => {
    const seed = keys.loadOrCreateSeed({ seedFile: '${seedFile}' })
    fs.chownSync('${seedFile}', ${runtimeUid}, ${runtimeUid})
    process.stdout.write(keys.publicKeyZ32(keys.keyPairFromSeed(seed)))
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
`

/** The relay's /readyz response. */
export type ReadyzBody = {
  ready: boolean
  firewalled: boolean | null
  // False when MIRALL_RELAY_ASSUME_REACHABLE forced `firewalled` rather than
  // hyperdht measuring it. Without this, `firewalled: false` reads as a verdict
  // when it may only be an assertion.
  probed: boolean
  publicKey: string
}

/** Fetch /readyz. Rejects if the admin server is not answering. */
export async function fetchReadyz(): Promise<ReadyzBody> {
  const res = await fetch(`${adminBaseUrl}/readyz`, {
    signal: AbortSignal.timeout(3000),
  })
  return (await res.json()) as ReadyzBody
}
