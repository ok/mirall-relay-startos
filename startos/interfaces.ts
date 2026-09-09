import { i18n } from './i18n'
import { sdk } from './sdk'
import { adminPort, relayPort } from './utils'

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

  // The status page: the public key with a QR, whether peers can actually reach
  // this relay, and the traffic it has carried. The surface has no auth of its
  // own, so StartOS is what stands in front of it — the operator picks the
  // addresses on this interface, and a LAN or Tor address is the safe answer.
  // Nothing here can stop them choosing a public gateway; README says so under
  // Limitations rather than this comment pretending it is enforced.
  //
  // Upstream gates /admin/* separately on a bearer token from /data/admin-token,
  // so the membership write surface is not exposed by exporting this.
  const adminHost = sdk.MultiHost.of(effects, 'admin')
  const adminOrigin = await adminHost.bindPort(adminPort, { protocol: 'http' })

  const admin = sdk.createInterface(effects, {
    name: i18n('Status Page'),
    id: 'admin',
    description: i18n(
      'The relay’s public key with a QR code, whether peers can reach it, and the traffic it has carried',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await relayOrigin.export([relay]), await adminOrigin.export([admin])]
})
