import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeEvidence } from './evidenceFiles'
import type { StudyOutput } from '../src/core/study'

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(import.meta.dirname, '..')
  const summaryPath = resolve(root, 'artifacts/metrics/summary.json')
  let raw: string
  try {
    raw = readFileSync(summaryPath, 'utf8')
  } catch {
    throw new Error('No artifacts/metrics/summary.json. Run npm run experiments first.')
  }
  writeEvidence(root, JSON.parse(raw) as StudyOutput['summary'])
  console.log('Rewrote comparison CSV, trace, and SVG figures from the saved summary.')
}
