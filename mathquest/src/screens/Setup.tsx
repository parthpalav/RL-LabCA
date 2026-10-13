import { WORLDS, type Settings } from '../app/types'
export function Setup({
  settings,
  onChange,
  onStart,
  onBack,
  onReset,
  notice,
}: {
  settings: Settings
  onChange: (value: Settings) => void
  onStart: () => void
  onBack: () => void
  onReset: () => void
  notice: string
}) {
  return (
    <section className="setup page-section">
      <button className="text-button back" onClick={onBack}>
        ← Back to the stars
      </button>
      <p className="eyebrow">PACK A LITTLE CURIOSITY</p>
      <h1>Make this journey yours.</h1>
      <p className="intro">
        A world to wander. A name if you like. Then six questions to find a
        starting path.
      </p>
      <label className="field-label" htmlFor="nickname">
        What should Orbit call you? <span>(optional)</span>
      </label>
      <input
        id="nickname"
        className="nickname"
        maxLength={24}
        value={settings.nickname}
        placeholder="Explorer"
        autoComplete="off"
        onChange={(event) =>
          onChange({ ...settings, nickname: event.target.value })
        }
      />
      <fieldset className="world-picker">
        <legend>Choose your world</legend>
        <div className="world-grid">
          {WORLDS.map((world) => (
            <label
              key={world.id}
              className={`world-tile ${world.id} ${settings.world === world.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="world"
                value={world.id}
                checked={settings.world === world.id}
                onChange={() => onChange({ ...settings, world: world.id })}
              />
              <span className="world-preview" aria-hidden="true">
                <span>{world.symbol}</span>
                <i />
                <b>✦</b>
              </span>
              <strong>{world.name}</strong>
              <small>{world.detail}</small>
              <span className="world-status">
                {settings.world === world.id ? '✓ Selected' : 'Choose world'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="microcopy">
        Worlds change the scenery. The mathematics stays the same. Full world
        illustrations arrive in the visual slice.
      </p>
      <div className="preferences">
        <label>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) =>
              onChange({ ...settings, reducedMotion: event.target.checked })
            }
          />{' '}
          Reduce motion
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.remember}
            onChange={(event) =>
              onChange({ ...settings, remember: event.target.checked })
            }
          />{' '}
          Remember settings and completed summaries on this device
        </label>
      </div>
      <p className="keyboard-help">
        Keys 1–4 answer · Enter continues after feedback · Esc pauses
        <br />
        No timer or sound. Take as long as you need.
      </p>
      <div className="actions">
        <button className="button primary" onClick={onStart}>
          Find my starting path →
        </button>
        <button className="text-button" onClick={onReset}>
          Reset Local Data
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </section>
  )
}
