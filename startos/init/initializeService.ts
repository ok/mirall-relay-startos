import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
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
      return res.stdout.toString().trim()
    },
  )

  await storeJson.merge(effects, { publicKey })

  // NO first-run task here. A 'critical' task blocks the service from starting
  // until it is cleared, and this one only asked the operator to look at a key
  // that Actions > Show Relay Public Key displays at any time. It also re-raised
  // on every reinstall, so a routine package update refused to start until
  // somebody acknowledged a prompt that told them nothing new.
})
