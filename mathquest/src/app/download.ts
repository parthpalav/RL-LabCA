export function downloadText(
  name: string,
  text: string,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function downloadSvg(container: HTMLElement | null, name: string) {
  const source = container?.querySelector('svg.recharts-surface')
  if (!source) return
  const svg = source.cloneNode(true) as SVGElement
  const bounds = source.getBoundingClientRect()
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', String(Math.round(bounds.width)))
  svg.setAttribute('height', String(Math.round(bounds.height)))
  svg.setAttribute(
    'style',
    'background:#1c2549;font-family:system-ui,sans-serif',
  )
  downloadText(
    name,
    new XMLSerializer().serializeToString(svg),
    'image/svg+xml',
  )
}
