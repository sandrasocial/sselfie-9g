"use client"

import { Group, Text } from "react-konva"
import type { EditorState } from "./types"
import { FORMATS } from "./types"

type FontFamilies = {
  headline: string
  subtext: string
}

type Props = {
  state: EditorState
  fonts: FontFamilies
}

const H_PAD = 48
const BOTTOM_BASE = 96
const GAP = 20
const SUB_FONT_SIZE = 20

/** Konva text stack: headline above subtext, block anchored bottom-left inside the stage. */
export function EditorialTextLayer({ state, fonts }: Props) {
  const { width: cw, height: ch } = FORMATS[state.format]
  const bottomY = ch - BOTTOM_BASE - state.textY

  const hasHead = state.headline.trim().length > 0
  const hasSub = state.subtext.trim().length > 0
  const headlineLines = hasHead ? state.headline.split("\n") : []
  const subLines = hasSub ? state.subtext.split("\n") : []
  const headlineLineHeight = state.fontSize * 1.12
  const subLineHeight = SUB_FONT_SIZE * 1.35
  const headlineBlockH = headlineLines.length * headlineLineHeight
  const subBlockH = subLines.length * subLineHeight

  let headTop = 0
  let subTop = 0
  if (hasSub && hasHead) {
    subTop = bottomY - subBlockH
    headTop = subTop - GAP - headlineBlockH
  } else if (hasSub) {
    subTop = bottomY - subBlockH
  } else if (hasHead) {
    headTop = bottomY - headlineBlockH
  }

  return (
    <Group listening={false}>
      {hasHead ? (
        <Text
          x={H_PAD}
          y={headTop}
          width={cw - H_PAD * 2}
          text={state.headline}
          fontSize={state.fontSize}
          fontFamily={fonts.headline}
          fill="#ffffff"
          lineHeight={1.12}
          letterSpacing={-0.5}
          shadowColor="rgba(0,0,0,0.35)"
          shadowBlur={8}
          shadowOffsetY={2}
          shadowOpacity={1}
        />
      ) : null}
      {hasSub ? (
        <Text
          x={H_PAD}
          y={subTop}
          width={cw - H_PAD * 2}
          text={state.subtext}
          fontSize={SUB_FONT_SIZE}
          fontFamily={fonts.subtext}
          fill="rgba(255,255,255,0.92)"
          lineHeight={1.35}
          letterSpacing={0.02}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={6}
          shadowOffsetY={1}
          shadowOpacity={1}
        />
      ) : null}
    </Group>
  )
}
