import { profileById, type Ability } from '../core/index'
import type { PlayAvailability } from '../app/playRuntime'
import { Orbit } from '../illustrations/Expedition'

export function StartingPath({
  ability,
  correct,
  nickname,
  availability,
  onPlay,
  onRetry,
  onAgain,
  onHome,
}: {
  ability: Ability
  correct: number
  nickname: string
  availability: PlayAvailability
  onPlay: () => void
  onRetry: () => void
  onAgain: () => void
  onHome: () => void
}) {
  const profile = profileById(ability)
  return (
    <section className="page-section starting-path">
      <Orbit />
      <p className="eyebrow">YOUR STARTING PATH</p>
      <h1>{profile.label}</h1>
      <p className="intro">
        {nickname ? `${nickname}, ` : ''}
        {profile.blurb}
      </p>
      <p>
        You found {correct} of 6 answers. This is a starting suggestion; it
        isn’t a measure of your potential.
      </p>
      {availability.status === 'ready' ? (
        <div className="ready-card">
          <h2>Your 20-stop adventure is ready.</h2>
          <p>
            After each answer, the saved controller chooses whether to ease,
            hold, or raise the next challenge. Your path can change one level at
            a time.
          </p>
          <button className="button primary" onClick={onPlay}>
            Begin my adventure →
          </button>
        </div>
      ) : (
        <div className="empty-state" role="status">
          <span className="empty-symbol" aria-hidden="true">
            ◌
          </span>
          <h2>
            {availability.status === 'loading'
              ? 'Checking the saved model…'
              : availability.title}
          </h2>
          <p>
            {availability.status === 'loading'
              ? 'Your starting path is ready. Checking whether the full adventure can begin.'
              : availability.detail}
          </p>
          <button
            className="button subtle"
            disabled={availability.status === 'loading'}
            onClick={onRetry}
          >
            Check again
          </button>
        </div>
      )}
      <div className="actions">
        <button className="text-button" onClick={onAgain}>
          Try the starting questions again
        </button>
        <button className="text-button" onClick={onHome}>
          Back to the stars
        </button>
      </div>
    </section>
  )
}
