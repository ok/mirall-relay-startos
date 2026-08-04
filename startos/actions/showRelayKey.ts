import { T } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { nodeBin, prepareIdentityScript, relayMounts } from '../utils'

/**
 * Derive the public key from the seed on the volume. The cached copy in
 * store.json covers the normal case; this is the fallback for a restore, or for
 * a seed a user replaced by hand.
 */
async function deriveFromSeed(effects: T.Effects): Promise<string> {
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'mirall-relay' },
    relayMounts,
    'show-relay-key',
    async (sub) => {
      const res = await sub.execFail([nodeBin, '-e', prepareIdentityScript], {
        user: 'root',
      })
      return `${res.stdout}`.trim()
    },
  )
}

export const showRelayKey = sdk.Action.withoutInput(
  'show-relay-key',

  async () => ({
    name: i18n('Show Relay Public Key'),
    description: i18n(
      'Display the key to paste into Mirall under Settings → Network. It is safe to publish.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const cached = await storeJson.read((s) => s.publicKey).once()
    const publicKey = cached || (await deriveFromSeed(effects))
    if (!cached) await storeJson.merge(effects, { publicKey })

    return {
      version: '1' as const,
      title: i18n('Relay Public Key'),
      message: i18n(
        'Paste this into Mirall under Settings → Network → Add a relay, on both peers where you can. There is no host, port or token — the key is the whole address.',
      ),
      result: {
        type: 'single' as const,
        name: i18n('Public Key'),
        description: null,
        value: publicKey,
        masked: false,
        copyable: true,
        qr: true,
      },
    }
  },
)
