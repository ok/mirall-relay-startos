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

  // Same origin, same binding — only the path differs, so this adds no new
  // exposure: /admin/ has always been served on the port the Status Page is on.
  // What it adds is a StartOS-level entry point. Upstream 0.3.0 does now link the
  // page from the status page's nav in every access mode (pageNav in
  // src/operator/status/page.js), which it did not before, so this is no longer
  // the only way in — it is the direct one: the page is listed and clickable
  // beside every other interface, without a detour through the status page.
  //
  // The write surface stays gated on the bearer token from /data/admin-token;
  // the Show Admin Token action is how the operator gets it. Only the page shell
  // and its assets are anonymous.
  //
  // Reusing adminOrigin rather than binding a second port matters: addresses are
  // enabled per binding, so this inherits whatever the user already enabled for
  // the Status Page instead of arriving with everything switched off.
  const members = sdk.createInterface(effects, {
    name: i18n('Members Page'),
    id: 'members',
    description: i18n(
      'Create, re-show and revoke member invites. Unlocked with the admin token — run the Show Admin Token action to get it.',
    ),
    type: 'ui',
    // The URL carries no credential: the token is typed into the page, never
    // put in the address.
    masked: false,
    schemeOverride: null,
    username: null,
    // Trailing slash required. Upstream 308s /admin to admin/ because the page's
    // asset URLs are document-relative, and a bare /admin would resolve
    // style.css against the root.
    path: '/admin/',
    query: {},
  })

  return [
    await relayOrigin.export([relay]),
    await adminOrigin.export([admin, members]),
  ]
})
