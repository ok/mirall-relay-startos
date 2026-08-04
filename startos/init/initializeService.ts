import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { showRelayKey } from '../actions/showRelayKey'
import { nodeBin, prepareIdentityScript, relayMounts } from '../utils'

export const initializeService = sdk.setupOnInit(async (effects, kind) => {
  if (kind === null) return

  // Mint the identity before the first start so the public key is available
  // immediately — a user can hand it out while the port forward is still being
  // sorted out. On restore the seed comes back with the volume and this just
  // re-derives the same key.
  const publicKey = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'mirall-relay' },
    relayMounts,
    'init-identity',
    async (sub) => {
      const res = await sub.execFail([nodeBin, '-e', prepareIdentityScript], {
        user: 'root',
      })
      return `${res.stdout}`.trim()
    },
  )

  await storeJson.merge(effects, { publicKey })

  await sdk.action.createOwnTask(effects, showRelayKey, 'critical', {
    reason: i18n(
      'Copy the relay’s public key — it is how anyone tells Mirall to use this relay',
    ),
  })
})
