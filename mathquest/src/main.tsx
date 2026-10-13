import { createRoot } from 'react-dom/client'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

createRoot(root).render(
  <main>
    <h1>MathQuest</h1>
    <p>The shared core is underway. Playable screens belong to the game lane.</p>
  </main>,
)
