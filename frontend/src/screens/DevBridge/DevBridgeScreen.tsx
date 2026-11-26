import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Look } from '../../setup/customizeData'
import { Bridge } from '../Customize/CustomizeScreen'

/**
 * Dev only (/dev/bridge): the Customize Bridge with no login. ?kid=girl (default)
 * or ?kid=boy; picks are kept on this page only (nothing is saved).
 */
export function DevBridgeScreen() {
  const [params] = useSearchParams()
  const avatar = params.get('kid') === 'boy' ? 'boy' : 'girl'
  const [look, setLook] = useState<Look>({})
  const [name, setName] = useState<string | null>('Mochi')
  return (
    <Bridge
      avatar={avatar}
      buddy="fox"
      buddyName={name}
      look={look}
      saveLook={setLook}
      renameBuddy={setName}
      onLobby={() => {}}
      onLogOut={() => window.location.assign('/')}
    />
  )
}
