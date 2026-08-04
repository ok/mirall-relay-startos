import { i18n } from './i18n'
import { sdk } from './sdk'
import { relayPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const relayHost = sdk.MultiHost.of(effects, 'relay')

  // No known protocol fits: this is raw UDP carrying a Noise handshake. A bind
  // with no SSL to add becomes a plain port forward, and StartOS forwards those
  // for both TCP and UDP, which is what HyperDHT needs. `secure: { ssl: false }`
  // says what ssh says — encrypted by the protocol itself, not by TLS — so
  // StartOS neither terminates nor wraps it.
  const relayOrigin = await relayHost.bindPort(relayPort, {
    protocol: null,
    preferredExternalPort: relayPort,
    addSsl: null,
    secure: { ssl: false },
  })

  const relay = sdk.createInterface(effects, {
    name: i18n('Relay Endpoint'),
    id: 'relay',
    description: i18n(
      'The UDP endpoint peers dial. Reachable from the public internet, or the relay is of no use.',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await relayOrigin.export([relay])]
})
