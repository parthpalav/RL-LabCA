import { PROFILES } from '../core/index'
import { Orbit } from '../illustrations/Expedition'

export function PendingMode({
  mode,
  onBack,
}: {
  mode: 'profile' | 'train' | 'lab'
  onBack: () => void
}) {
  return (
    <section className="page-section pending-mode">
      <button className="text-button back" onClick={onBack}>
        ← Back to the stars
      </button>
      <p className="eyebrow">
        {mode === 'lab' ? 'BEHIND THE ADVENTURE' : 'ANOTHER WAY TO EXPLORE'}
      </p>
      <h1>
        {mode === 'profile'
          ? 'A path for every starting point.'
          : mode === 'train'
            ? 'Watch a controller learn.'
            : 'Research Lab'}
      </h1>
      <p className="intro">
        {mode === 'profile'
          ? 'Profile testing arrives in B2. You’ll be able to answer with a chosen profile or watch a simulated player.'
          : mode === 'train'
            ? 'The browser training demonstration arrives in B4. It will learn from simulated players and leave the saved Play model untouched.'
            : 'The experiment charts, policy inspector, and exports arrive in B5. No measured results have been bundled yet.'}
      </p>
      {mode !== 'lab' && (
        <div className="profile-list">
          {PROFILES.map((profile) => (
            <article key={profile.id}>
              <span className="profile-id">0{profile.id + 1}</span>
              <h2>{profile.label}</h2>
              <p>{profile.blurb}</p>
            </article>
          ))}
        </div>
      )}
      <div className="empty-state">
        <Orbit />
        <h2>
          {mode === 'lab'
            ? 'Waiting for real experiment evidence'
            : 'This mode is not available yet'}
        </h2>
        <p>
          {mode === 'lab'
            ? 'Play uses a frozen Q-learning policy. This view will show the actual model, its decisions, and measured comparisons when Lane A’s artifacts and the Lab screens are ready.'
            : 'You can explore setup and the six starting questions from Play a round.'}
        </p>
        <button className="button subtle" onClick={onBack}>
          Return to MathQuest
        </button>
      </div>
    </section>
  )
}
