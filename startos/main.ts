import { T } from '@start9labs/start-sdk'
import { StoreShape, storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  adminPort,
  adminTokenFile,
  fetchReadyz,
  nodeBin,
  prepareIdentityScript,
  relayMounts,
  relayPort,
  rosterFile,
  seedFile,
} from './utils'

type HealthResult = Omit<T.NamedHealthCheckResult, 'name'>

// Every knob upstream exposes has a MIRALL_RELAY_* equivalent, so the relay
// needs no arguments and no config file — just this environment.
function relayEnv(store: StoreShape | null): Record<string, string> {
  const env: Record<string, string> = {
    MIRALL_RELAY_SEED_FILE: seedFile,
    // Both belong on the volume with the seed: members.json holds every
    // member's seed and is the same class of secret, and a regenerated admin
    // token would silently invalidate the operator's copy. Access mode is left
    // at upstream's default of 'open' — see README, Limitations.
    MIRALL_RELAY_ROSTER_FILE: rosterFile,
    MIRALL_RELAY_ADMIN_TOKEN_FILE: adminTokenFile,
    MIRALL_RELAY_PORT: `${relayPort}`,
    // Bound to all interfaces so the StartOS proxy can serve the status page;
    // health checks and actions still reach it on 127.0.0.1 from inside the
    // container. The surface has no auth of its own — StartOS supplies it, and
    // interfaces.ts keeps the binding off any public gateway. Upstream's
    // DNS-rebinding check stays off on a non-loopback bind by design, because a
    // proxy legitimately sets its own Host.
    MIRALL_RELAY_ADMIN_HOST: '0.0.0.0',
    MIRALL_RELAY_ADMIN_PORT: `${adminPort}`,
    MIRALL_RELAY_REGION: store?.region || 'unknown',
    MIRALL_RELAY_OPERATOR: store?.operator || 'unknown',
    MIRALL_RELAY_MAX_ACTIVE_LINKS: `${store?.maxActiveLinks ?? 2000}`,
    MIRALL_RELAY_MAX_SESSIONS_PER_KEY: `${store?.maxSessionsPerKey ?? 64}`,
    MIRALL_RELAY_MAX_LINK_RATE: store?.maxLinkRate || '4MiB',
    MIRALL_RELAY_MAX_LINK_BYTES: store?.maxLinkBytes || '512MB',
    MIRALL_RELAY_LOG_LEVEL: store?.logLevel || 'info',
  }
  // Left unset rather than empty: upstream validates these at startup and
  // refuses to boot on a malformed list.
  if (store?.assumeReachable) env.MIRALL_RELAY_ASSUME_REACHABLE = 'true'
  if (store?.allowlist) env.MIRALL_RELAY_ALLOWLIST = store.allowlist
  if (store?.banlist) env.MIRALL_RELAY_BANLIST = store.banlist
  return env
}

// /readyz is 200 only when the relay is listening, bootstrapped and NOT
// firewalled — exactly the condition that makes a relay useful, and the one a
// home server behind an unforwarded router fails.
async function checkReachability(): Promise<HealthResult> {
  try {
    const { ready, firewalled, probed } = await fetchReadyz()
    if (ready && firewalled === false) {
      // `firewalled: false` is forced by ASSUME_REACHABLE, so on its own it is
      // not evidence. Saying "peers can reach this relay" on an unprobed node
      // is the overstatement this check existed to avoid.
      return probed === false
        ? {
            result: 'success',
            message: i18n(
              'Running, but reachability was asserted rather than measured — "Assume Reachable" is on. Confirm it from another machine.',
            ),
          }
        : {
            result: 'success',
            message: i18n('Peers on the internet can reach this relay'),
          }
    }
    if (firewalled) {
      return {
        result: 'failure',
        message: i18n(
          'Peers cannot reach this relay. Forward UDP port 49737 to this server, or turn on "Assume Reachable" if it already has a public IP.',
        ),
      }
    }
    return {
      result: 'starting',
      message: i18n('Joining the DHT and probing reachability'),
    }
  } catch {
    return {
      result: 'starting',
      message: i18n('Waiting for the relay to answer'),
    }
  }
}

export const main = sdk.setupMain(async ({ effects }) => {
  const store = await storeJson.read((s) => s).const(effects)

  const relaySub = sdk.SubContainer.of(
    effects,
    { imageId: 'mirall-relay' },
    relayMounts,
    'mirall-relay-sub',
  )

  return (
    sdk.Daemons.of(effects)
      // The image runs as uid 65532 but a StartOS volume arrives owned by root,
      // so the relay could neither create its seed nor read one that came back
      // from a backup. Runs as root; the relay itself does not.
      .addOneshot('prepare-identity', {
        subcontainer: relaySub,
        exec: {
          command: [nodeBin, '-e', prepareIdentityScript],
          user: 'root',
        },
        requires: [],
      })
      .addDaemon('relay', {
        subcontainer: relaySub,
        exec: {
          command: sdk.useEntrypoint(),
          env: relayEnv(store),
        },
        ready: {
          display: i18n('Relay'),
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, relayPort, {
              successMessage: i18n('The relay is listening'),
              errorMessage: i18n('The relay is not listening'),
            }),
        },
        requires: ['prepare-identity'],
      })
      .addHealthCheck('reachability', {
        ready: {
          display: i18n('Internet Reachability'),
          fn: checkReachability,
          // HyperDHT takes a while to bootstrap and have its address confirmed
          // by other nodes; a red flash before that means nothing.
          gracePeriod: 120_000,
        },
        requires: ['relay'],
      })
  )
})
