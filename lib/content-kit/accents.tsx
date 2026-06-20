export const TUTORIAL_ACCENT = "#3A3A3A"

/** Hand-drawn underline: a slightly wobbly stroke for editorial emphasis. */
export function Squiggle({ color, width: w }: { color: string; width: number }) {
  return (
    <svg width={w} height={14} viewBox={`0 0 ${w} 14`}>
      <path
        d={`M 4 9 Q ${w * 0.22} 2, ${w * 0.46} 8 T ${w * 0.78} 7 T ${w - 4} 5`}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Imperfect hand-drawn ellipse around the CTA keyword or a tutorial setting. */
export function KeywordCircle({ color, w, h }: { color: string; w: number; h: number }) {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2 - 8
  const ry = h / 2 - 4
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <ellipse
        cx={cx}
        cy={cy + 3}
        rx={rx}
        ry={ry}
        stroke={color}
        strokeWidth={5}
        fill="none"
        transform={`rotate(-3 ${cx} ${cy})`}
      />
      <ellipse
        cx={cx - 4}
        cy={cy}
        rx={rx - 5}
        ry={ry + 2}
        stroke={color}
        strokeWidth={3}
        fill="none"
        opacity={0.6}
        transform={`rotate(2 ${cx} ${cy})`}
      />
    </svg>
  )
}

/** Small hand-drawn arrow for pointing to the practical action. */
export function Arrow({ color }: { color: string }) {
  return (
    <svg width={56} height={72} viewBox="0 0 56 72">
      <path
        d="M 28 6 Q 20 36, 27 60"
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 16 50 Q 22 58, 27 62 Q 33 57, 38 49"
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
