import { useNavigate } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { Btn, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './ComingSoon.module.css'

function ComingSoonLeft({ title, line }: { title: string; line: string }) {
  const navigate = useNavigate()
  return (
    <PageBody side="L">
      <Title>{title}</Title>
      <Sub>Coming soon</Sub>
      <p className={styles.line}>{line}</p>
      <Btn className={styles.home} onClick={() => navigate(paths.teacher.home)}>
        Back to Home
      </Btn>
    </PageBody>
  )
}

function ComingSoonRight() {
  return (
    <PageBody side="R">
      <div className={styles.blank} aria-hidden="true">
        Coming soon
      </div>
      <OllieNote>This page is still being made. Everything else in your planner works.</OllieNote>
    </PageBody>
  )
}

export const ProgressLeft = () => <ComingSoonLeft title="Progress" line="Charts for each student and topic will show up here." />
export const LobbyLeft = () => <ComingSoonLeft title="Lobby" line="Here you’ll see your class on Rene Island." />
export { ComingSoonRight }
