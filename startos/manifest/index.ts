import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'mirall-relay',
  title: 'Mirall Relay',
  license: 'AGPL-3.0-or-later',
  packageRepo: 'https://github.com/ok/mirall-relay-startos',
  upstreamRepo: 'https://github.com/ok/mirall-relay',
  marketingUrl: 'https://mirall.app/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    'mirall-relay': {
      // Upstream publishes no image yet (its CI builds without pushing), so we
      // build its Dockerfile from the submodule.
      source: { dockerBuild: { workdir: './mirall-relay' } },
      // The Dockerfile prunes prebuilt native addons by TARGETARCH and rejects
      // anything but amd64/arm64.
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
