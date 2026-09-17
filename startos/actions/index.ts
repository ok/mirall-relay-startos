import { sdk } from '../sdk'
import { configure } from './configure'
import { showAdminToken } from './showAdminToken'
import { showRelayKey } from './showRelayKey'
import { testReachability } from './testReachability'

export const actions = sdk.Actions.of()
  .addAction(showRelayKey)
  .addAction(showAdminToken)
  .addAction(testReachability)
  .addAction(configure)
