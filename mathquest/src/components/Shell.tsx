import type { ReactNode } from 'react'
export function Shell({
  children,
  onHome,
  onLab,
}: {
  children: ReactNode
  onHome: () => void
  onLab: () => void
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <button
          className="wordmark"
          onClick={onHome}
          aria-label="MathQuest home"
        >
          <span className="brand-symbol" aria-hidden="true">
            ✦
          </span>
          Math<span>Quest</span>
        </button>
        <button className="nav-link" onClick={onLab}>
          Research Lab <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <span>A little curiosity. A new constellation.</span>
        <span>Local play · No login</span>
      </footer>
    </>
  )
}
