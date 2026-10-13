import type { PlayAvailability } from '../app/playRuntime'
import { Expedition } from '../illustrations/Expedition'
export function Landing({
  onStart,
  onFutureMode,
  availability,
}: {
  onStart: () => void
  onFutureMode: (mode: 'profile' | 'train') => void
  availability: PlayAvailability
}) {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> YOUR NEXT LITTLE ADVENTURE
          </p>
          <h1>
            A little math.
            <br />
            <em>A big adventure.</em>
          </h1>
          <p className="intro">
            A math adventure that adjusts the challenge as you play. Follow
            the stars, one question at a time.
          </p>
          <button className="button primary" onClick={onStart}>
            Start Adventure <span aria-hidden="true">→</span>
          </button>
          <p className="microcopy">
            6 starting questions · 20 adventure stops · Your pace
          </p>
        </div>
        <div className="hero-art">
          <Expedition />
          <span className="art-caption">☾ FIRST DESTINATION / MOON GARDEN</span>
        </div>
      </section>
      {availability.status === 'unavailable' && (
        <div className="availability-note">
          <span aria-hidden="true">◌</span>
          <p>
            <strong>The starting questions are ready.</strong> The full
            adventure is waiting for the saved model and game controller.
          </p>
        </div>
      )}
      <section className="mode-grid" aria-label="Ways to explore">
        <article className="mode-card">
          <span className="mode-number">01 / EXPLORE</span>
          <h2>Play a round</h2>
          <p>
            Choose a world and find your starting path with six gentle
            questions.
          </p>
          <button className="text-button" onClick={onStart}>
            Begin your journey →
          </button>
          <span className="slice-label">Starting questions available now</span>
        </article>
        <article className="mode-card">
          <span className="mode-number">02 / TRY A PATH</span>
          <h2>Test a profile</h2>
          <p>
            Starting out or ready for a challenge? Answer yourself or watch a
            simulated player.
          </p>
          <button
            className="text-button"
            onClick={() => onFutureMode('profile')}
          >
            Explore profiles →
          </button>
          <span className="slice-label">Coming in the next slice</span>
        </article>
        <article className="mode-card">
          <span className="mode-number">03 / SEE LEARNING</span>
          <h2>Train a profile</h2>
          <p>
            A browser demonstration of how a difficulty controller learns from
            simulated play.
          </p>
          <button className="text-button" onClick={() => onFutureMode('train')}>
            About the demonstration →
          </button>
          <span className="slice-label">Planned demonstration</span>
        </article>
      </section>
    </div>
  )
}
