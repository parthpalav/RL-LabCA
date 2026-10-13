import { createRoot } from 'react-dom/client'
import { MathQuest } from './app/MathQuest'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

createRoot(root).render(<MathQuest />)
