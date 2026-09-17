import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { nodeBin, readAdminTokenScript, relayMountsReadonly } from '../utils'

/**
 * Reveal the bearer token that gates upstream's members page.
 *
 * Upstream logs the token exactly once, on the boot that mints it, because an
 * operator on StartOS has no shell. That line scrolls away, and recovering it
 * afterwards meant `start-cli package attach` — which is not a thing a StartOS
 * user has. The token is on the volume the whole time; this reads it.
 *
 * Nothing here mints, rotates or writes: upstream refuses to mint a second
 * token over an existing file precisely so an operator's copy cannot be
 * silently invalidated, and this action keeps that property by mounting the
 * volume read-only.
 */
export const showAdminToken = sdk.Action.withoutInput(
  'show-admin-token',

  async () => ({
    name: i18n('Show Admin Token'),
    description: i18n(
      'Reveal the token that unlocks the Members Page, where invites are created and revoked.',
    ),
    warning: i18n(
      'Anyone holding this token can add and remove members. Treat it like a password.',
    ),
    // 'any' on purpose: the token is a file on the volume, so this works with
    // the service stopped — which is exactly when an operator who has lost it
    // is most likely to be looking.
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const { token, exitCode, stderr } = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'mirall-relay' },
      relayMountsReadonly,
      'show-admin-token',
      async (sub) => {
        const res = await sub.exec([nodeBin, '-e', readAdminTokenScript], {
          user: 'root',
        })
        return {
          token: res.stdout.toString().trim(),
          exitCode: res.exitCode,
          stderr: res.stderr.toString().trim(),
        }
      },
    )

    if (exitCode === 3) {
      return {
        version: '1' as const,
        title: i18n('Admin Token'),
        message: i18n(
          'No token exists yet. The relay mints it on its first successful start — start the service, then run this action again.',
        ),
        result: null,
      }
    }
    if (exitCode !== 0) {
      throw new Error(stderr || `reading the admin token failed (${exitCode})`)
    }

    return {
      version: '1' as const,
      title: i18n('Admin Token'),
      message: i18n(
        'Open the Members Page from the Interfaces tab and paste this when it asks. The page keeps it for that browser tab only, so a new tab asks again.',
      ),
      result: {
        type: 'single' as const,
        name: i18n('Admin Token'),
        description: null,
        value: token,
        masked: true,
        copyable: true,
        qr: false,
      },
    }
  },
)
