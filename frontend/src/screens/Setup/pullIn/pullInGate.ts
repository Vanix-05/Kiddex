/**
 * Choose saves the buddy right away (so the picks are kept even if the clip
 * is skipped or the tab is closed), and SetupFrame sends anyone with a buddy
 * to the Customize Bridge. While "the buddy pulls you in" and the magic fall
 * play, this gate keeps the setup book on screen.
 *
 * Kept in memory only: after a reload it is closed, and a Student with a
 * buddy goes straight to the Customize Bridge.
 */
let playing = false

export const pullInGate = {
  start() {
    playing = true
  },
  end() {
    playing = false
  },
  isPlaying: () => playing,
}
