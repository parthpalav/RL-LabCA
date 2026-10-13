export function Expedition() {
  return (
    <svg
      className="expedition"
      viewBox="0 0 600 480"
      role="img"
      aria-label="A star guide exploring a moon garden along an orbital trail"
    >
      <defs>
        <linearGradient id="moon-fill" x2=".8" y2="1">
          <stop stopColor="#fffaf0" />
          <stop offset="1" stopColor="#cac2ed" />
        </linearGradient>
        <linearGradient id="garden-fill" x2="0" y2="1">
          <stop stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#227e78" />
        </linearGradient>
      </defs>
      <circle cx="310" cy="233" r="197" fill="#1c2549" />
      <ellipse
        cx="300"
        cy="264"
        rx="278"
        ry="95"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="1.5"
        transform="rotate(-22 300 264)"
      />
      <ellipse
        cx="300"
        cy="264"
        rx="246"
        ry="73"
        fill="none"
        stroke="#b5a0fa"
        strokeDasharray="3 12"
        transform="rotate(-22 300 264)"
      />
      <g fill="#fffaf0">
        <circle cx="94" cy="118" r="3" />
        <circle cx="475" cy="96" r="3" />
        <circle cx="530" cy="278" r="2" />
        <circle cx="159" cy="58" r="2" />
        <circle cx="400" cy="406" r="3" />
        <circle cx="44" cy="303" r="2" />
      </g>
      <path
        d="M432 38v18m-9-9h18M105 362v18m-9-9h18M516 151v12m-6-6h12"
        stroke="#6ee7b7"
        strokeWidth="2"
      />
      <circle cx="286" cy="266" r="128" fill="url(#moon-fill)" />
      <path d="M179 337q96-77 215-10a128 128 0 0 1-215 10" fill="#9e93c6" />
      <ellipse cx="234" cy="207" rx="24" ry="16" fill="#bcb1db" opacity=".6" />
      <ellipse cx="345" cy="282" rx="33" ry="20" fill="#bcb1db" opacity=".6" />
      <circle cx="294" cy="177" r="10" fill="#bcb1db" opacity=".6" />
      <path
        d="M213 351v-51m0 24q-34-1-33-33 33 1 33 33m0-9q32-4 29-31-30 4-29 31M356 333v-54m0 25q-33-2-30-32 30 3 30 32m0-12q30-4 27-28-29 3-27 28"
        fill="url(#garden-fill)"
        stroke="#6ee7b7"
        strokeWidth="2"
      />
      <g transform="translate(352 66) rotate(10)">
        <path
          d="m48 0 14 30 33 5-24 24 5 34-28-16-30 16 6-34L0 35l34-5z"
          fill="#fbbf24"
        />
        <ellipse cx="35" cy="43" rx="3" ry="5" fill="#17203a" />
        <ellipse cx="59" cy="43" rx="3" ry="5" fill="#17203a" />
        <path
          d="M39 57q9 9 18 0"
          fill="none"
          stroke="#17203a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g fontFamily="system-ui" textAnchor="middle" fill="#fffaf0">
        <g transform="translate(100 203) rotate(-12)">
          <rect x="-30" y="-29" width="60" height="58" rx="16" fill="#6849b3" />
          <text y="11" fontSize="34">
            +
          </text>
        </g>
        <g transform="translate(469 325) rotate(12)">
          <rect x="-30" y="-29" width="60" height="58" rx="16" fill="#276b64" />
          <text y="10" fontSize="30">
            ÷
          </text>
        </g>
        <text x="499" y="220" fontSize="22" fill="#bac4df">
          x²
        </text>
      </g>
    </svg>
  )
}
export function Orbit({ encouraging = false }: { encouraging?: boolean }) {
  return (
    <svg
      className="orbit"
      viewBox="0 0 100 100"
      role="img"
      aria-label={
        encouraging
          ? 'Orbit, your encouraging star guide'
          : 'Orbit, your star guide'
      }
    >
      <path
        d="m50 4 14 29 32 5-23 23 5 33-28-15-29 15 6-33L4 38l32-5z"
        fill="#fbbf24"
        stroke="#ffe4a0"
        strokeWidth="2"
      />
      <circle cx="38" cy="46" r="3" fill="#17203a" />
      <circle cx="62" cy="46" r="3" fill="#17203a" />
      <path
        d={encouraging ? 'M42 58q8 5 16 0' : 'M40 58q10 11 20 0'}
        stroke="#17203a"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
