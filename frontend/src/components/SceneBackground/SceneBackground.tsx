import type { ReactNode } from 'react'
import { sceneArt } from '../../assets/art'
import { Sea } from './Sea'
import styles from './SceneBackground.module.css'

/**
 * Full-screen pastel sky + beach scene behind every screen.
 * Built from separate layers so it stays balanced on both tablets and laptops.
 */
export function SceneBackground({ children }: { children: ReactNode }) {
  return (
    <div className={styles.scene}>
      <div className={styles.decor} aria-hidden="true">
        <img src={sceneArt.sun} alt="" className={styles.sun} />
        <img src={sceneArt.cloud} alt="" className={styles.cloud1} />
        <img src={sceneArt.cloud} alt="" className={styles.cloud2} />
        <img src={sceneArt.cloud} alt="" className={styles.cloud3} />
        <img src={sceneArt.cloud} alt="" className={styles.cloud4} />
        <Sea />
        <img src={sceneArt.island} alt="" className={styles.island} />
        <img src={sceneArt.sailboat} alt="" className={styles.sailboat} />
        <img src={sceneArt.ground} alt="" className={styles.ground} />
        <img src={sceneArt.dock} alt="" className={styles.dock} />
        <img src={sceneArt.bush} alt="" className={styles.bush1} />
        <img src={sceneArt.bush} alt="" className={styles.bush2} />
      </div>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
