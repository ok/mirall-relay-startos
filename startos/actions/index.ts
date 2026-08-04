import { sdk } from '../sdk'
import { configure } from './configure'
import { showRelayKey } from './showRelayKey'
import { testReachability } from './testReachability'

export const actions = sdk.Actions.of()
  .addAction(showRelayKey)
  .addAction(testReachability)
  .addAction(configure)
