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

// Upstream's Dockerfile defaults both of these to /data, and StartOS layers the
// daemon's env on top of the image's rather than replacing it, so the defaults
// would in fact survive. They are set explicitly anyway, exactly as seedFile is:
// an upstream Dockerfile that dropped them would silently relocate the roster
// and the token to /app — off the volume, lost on every container replacement,
// and taking every membership with them.
export const rosterFile = `${dataMountpoint}/members.json`
export const adminTokenFile = `${dataMountpoint}/admin-token`

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
const path = require('path')

// Recursive, and deliberately not a list of known filenames. A restore brings
// the whole volume back owned by root, and upstream keeps adding files to it:
// members.json and admin-token arrived with invite membership. A root-owned
// 0600 admin-token is unreadable to uid ${runtimeUid}, and upstream throws on it
// rather than minting a second token, so the relay does not start at all.
const chownAll = (p) => {
  fs.chownSync(p, ${runtimeUid}, ${runtimeUid})
  let entries = []
  try {
    entries = fs.readdirSync(p, { withFileTypes: true })
  } catch {
    return // not a directory
  }
  for (const e of entries) chownAll(path.join(p, e.name))
}

fs.mkdirSync('${dataMountpoint}', { recursive: true })
chownAll('${dataMountpoint}')
import('/app/src/keys.js')
  .then((keys) => {
    const seed = keys.loadOrCreateSeed({ seedFile: '${seedFile}' })
    // Again, because loadOrCreateSeed may have just created the seed as root.
    chownAll('${dataMountpoint}')
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
