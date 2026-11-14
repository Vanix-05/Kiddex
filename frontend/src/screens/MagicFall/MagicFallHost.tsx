import { useSyncExternalStore } from 'react'
import { paths } from '../../routes/paths'
import { router } from '../../routes/router'
import { pullInGate } from '../Setup/pullIn/pullInGate'
import { MagicFall } from './MagicFall'
import { magicFall } from './magicFallStore'
import { magicVideo } from './magicVideo'

/**
 * Draws the magic fall when the setup storybook asks for it (magicFallStore),
 * above the routes: when the video ends it opens the Customize Bridge
 * underneath and fades out over it. Skip opens it straight away.
 */
export function MagicFallHost() {
  const job = useSyncExternalStore(magicFall.subscribe, magicFall.current)
  if (!job) return null
  return (
    <MagicFall
      buddy={job.buddy}
      buddyColor={job.buddyColor}
      video={magicVideo}
      onLeave={() => {
        // The buddy is saved already (at Choose): the setup book may let go now.
        pullInGate.end()
        return router.navigate(paths.customize, { replace: true })
      }}
      onGone={magicFall.clear}
    />
  )
}
