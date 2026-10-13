export type Series = { name: string; color: string; points: { x: number; y: number }[] }

export function lineChart(title: string, xLabel: string, yLabel: string, series: Series[]): string {
  const width = 860
  const height = 460
  const left = 70
  const right = 20
  const top = 50
  const bottom = 70
  const points = series.flatMap((item) => item.points)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const xSpan = maxX - minX || 1
  const ySpan = maxY - minY || 1
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const sx = (x: number) => left + ((x - minX) / xSpan) * plotWidth
  const sy = (y: number) => top + (1 - (y - minY) / ySpan) * plotHeight
  const lines = series.map((item) => {
    const path = item.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${sx(point.x).toFixed(1)} ${sy(point.y).toFixed(1)}`).join(' ')
    return `<path d="${path}" fill="none" stroke="${item.color}" stroke-width="2"/>`
  })
  const legend = series.map((item, index) => `<text x="${left + index * 140}" y="${height - 16}" fill="${item.color}" font-size="12">${escapeXml(item.name)}</text>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fffaf0"/>
  <text x="${left}" y="28" font-size="16" fill="#17203a">${escapeXml(title)}</text>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#17203a"/>
  <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="#17203a"/>
  <text x="${left}" y="${top - 8}" font-size="12" fill="#17203a">${yLabel} ${maxY.toFixed(2)}</text>
  <text x="${left}" y="${height - bottom + 16}" font-size="12" fill="#17203a">${yLabel} ${minY.toFixed(2)}</text>
  <text x="${width / 2}" y="${height - 36}" font-size="12" fill="#17203a">${escapeXml(xLabel)} ${minX} to ${maxX}</text>
  ${lines.join('\n  ')}
  ${legend}
</svg>`
}

export function barChart(title: string, yLabel: string, bars: { name: string; value: number; color: string }[]): string {
  const width = 860
  const height = 420
  const left = 70
  const top = 50
  const bottom = 80
  const plotWidth = width - left - 20
  const plotHeight = height - top - bottom
  const minY = Math.min(0, ...bars.map((bar) => bar.value))
  const maxY = Math.max(0, ...bars.map((bar) => bar.value))
  const span = maxY - minY || 1
  const zero = top + (1 - (0 - minY) / span) * plotHeight
  const slot = plotWidth / bars.length
  const rects = bars.map((bar, index) => {
    const y = top + (1 - (bar.value - minY) / span) * plotHeight
    const barTop = Math.min(y, zero)
    const barHeight = Math.max(1, Math.abs(zero - y))
    const x = left + index * slot + slot * 0.2
    return `<rect x="${x.toFixed(1)}" y="${barTop.toFixed(1)}" width="${(slot * 0.6).toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${bar.color}"/>
  <text x="${(x + slot * 0.3).toFixed(1)}" y="${height - 48}" text-anchor="middle" font-size="12" fill="#17203a">${escapeXml(bar.name)}</text>
  <text x="${(x + slot * 0.3).toFixed(1)}" y="${(barTop - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#17203a">${bar.value.toFixed(2)}</text>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fffaf0"/>
  <text x="${left}" y="28" font-size="16" fill="#17203a">${escapeXml(title)}</text>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#17203a"/>
  <line x1="${left}" y1="${zero.toFixed(1)}" x2="${width - 20}" y2="${zero.toFixed(1)}" stroke="#17203a"/>
  <text x="16" y="${top + plotHeight / 2}" font-size="12" fill="#17203a">${escapeXml(yLabel)}</text>
  ${rects.join('\n  ')}
</svg>`
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
