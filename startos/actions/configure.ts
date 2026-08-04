import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  region: Value.text({
    name: i18n('Region'),
    description: i18n(
      'Label published in the relay’s capability document and metrics. Purely informational.',
    ),
    required: true,
    default: 'unknown',
  }),
  operator: Value.text({
    name: i18n('Operator'),
    description: i18n(
      'Label published in the relay’s capability document and metrics. Purely informational.',
    ),
    required: true,
    default: 'unknown',
  }),
  assumeReachable: Value.toggle({
    name: i18n('Assume Reachable'),
    description: i18n(
      'Skip reachability probing. Only turn this on for a host you know has a public IP with unfiltered UDP — otherwise the relay advertises itself and then fails every connection.',
    ),
    default: false,
  }),
  maxActiveLinks: Value.number({
    name: i18n('Max Active Links'),
    description: i18n(
      'Global ceiling on bridged streams. Two streams make one relayed connection.',
    ),
    required: true,
    default: 2000,
    min: 2,
    integer: true,
  }),
  maxSessionsPerKey: Value.number({
    name: i18n('Max Sessions Per Device'),
    description: i18n(
      'Sessions one peer device may hold. Relaying to N peers costs 2 × N sessions, so the default of 64 allows about 32 peers.',
    ),
    required: true,
    default: 64,
    min: 2,
    integer: true,
  }),
  maxLinkRate: Value.text({
    name: i18n('Max Link Rate'),
    description: i18n(
      'Throughput cap per link, per direction. Accepts sizes like 4MiB or 2MB.',
    ),
    required: true,
    default: '4MiB',
    patterns: [
      {
        regex: '^[0-9]+(\\.[0-9]+)?\\s*([kKmMgG][iI]?[bB]?|[bB])?$',
        description: 'a byte size, e.g. 4MiB, 512MB, 1073741824',
      },
    ],
  }),
  maxLinkBytes: Value.text({
    name: i18n('Max Link Bytes'),
    description: i18n(
      'Total bytes a link may carry per direction before it is torn down.',
    ),
    required: true,
    default: '512MB',
    patterns: [
      {
        regex: '^[0-9]+(\\.[0-9]+)?\\s*([kKmMgG][iI]?[bB]?|[bB])?$',
        description: 'a byte size, e.g. 4MiB, 512MB, 1073741824',
      },
    ],
  }),
  allowlist: Value.text({
    name: i18n('Allowlist'),
    description: i18n(
      'Private relay: only these peer keys may connect, and BOTH peers of a connection must be listed. Note that a Mirall client’s DHT key is fresh on every app start, so this can only pin infrastructure you control. Leave empty for an open relay.',
    ),
    required: false,
    default: null,
    placeholder: 'key1, key2',
  }),
  banlist: Value.text({
    name: i18n('Banlist'),
    description: i18n(
      'Peer keys refused at connect time. The right tool for ad-hoc abuse handling on an open relay.',
    ),
    required: false,
    default: null,
    placeholder: 'key1, key2',
  }),
  logLevel: Value.select({
    name: i18n('Log Level'),
    default: 'info',
    values: {
      trace: 'trace',
      debug: 'debug',
      info: 'info',
      warn: 'warn',
      error: 'error',
      fatal: 'fatal',
    },
  }),
})

export const configure = sdk.Action.withInput(
  'configure',

  async () => ({
    name: i18n('Configure Relay'),
    description: i18n(
      'Set the relay’s labels, capacity limits and access control',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const store = await storeJson.read((s) => s).once()
    if (!store) return null
    return {
      region: store.region,
      operator: store.operator,
      assumeReachable: store.assumeReachable,
      maxActiveLinks: store.maxActiveLinks,
      maxSessionsPerKey: store.maxSessionsPerKey,
      maxLinkRate: store.maxLinkRate,
      maxLinkBytes: store.maxLinkBytes,
      allowlist: store.allowlist || null,
      banlist: store.banlist || null,
      logLevel: store.logLevel,
    }
  },

  // main.ts reads the store reactively, so saving restarts the relay with the
  // new environment.
  async ({ effects, input }) =>
    storeJson.merge(effects, {
      ...input,
      allowlist: input.allowlist ?? '',
      banlist: input.banlist ?? '',
    }),
)
