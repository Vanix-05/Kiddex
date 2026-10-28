import { Outlet } from 'react-router-dom'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { SignPost } from '../../components/SignPost/SignPost'
import { characterArt } from '../../assets/art'
import { useMouseTilt } from '../../hooks/useMouseTilt'
import styles from './LoginScreen.module.css'

/**
 * The beach scene shared by every login step. Only the card on the right
 * changes: each step (steps/*.tsx) renders its own <LoginCard> into <Outlet />.
 * The scene stays mounted between steps, so it never flickers.
 */
export function LoginScreen() {
  const kidsRef = useMouseTilt<HTMLImageElement>()

  return (
    <SceneBackground>
      <div className={styles.layout}>
        <header className={styles.brand}>
          <KiddexLogo />
        </header>

        <div className={styles.hero} aria-hidden="true">
          <SignPost className={styles.sign} />
          <img
            ref={kidsRef}
            src={characterArt.girlFoxLogin}
            alt=""
            className={styles.kids}
            width={371}
            height={474}
          />
        </div>

        {/* The login card for the current step (see steps/ and router.tsx). */}
        <Outlet />
      </div>
    </SceneBackground>
  )
}
