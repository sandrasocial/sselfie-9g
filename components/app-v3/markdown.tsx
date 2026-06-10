"use client"

// SSELFIE Studio 3.0 — inline styled markdown (MAYA-REBUILD-05 Phase A).
// Maya's streamed replies render with real hierarchy (serif headings, bold, bullets) instead
// of a plain text blob. Mapping lifted from the live Studio chat, reskinned light editorial.

import ReactMarkdown from "react-markdown"

export function Markdown({ children }: { children: string }) {
  if (!children.trim()) return null
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h3 className="mb-2 mt-4 font-serif text-[20px] font-light leading-tight text-[#0D0E10] first:mt-0">
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h3 className="mb-2 mt-4 font-serif text-[18px] font-light leading-tight text-[#0D0E10] first:mt-0">
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#818283] first:mt-0">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="mb-3 text-[15px] leading-relaxed text-[#282728] last:mb-0">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold text-[#0D0E10]">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => (
          <ul className="mb-3 ml-4 list-disc space-y-1.5 text-[15px] leading-relaxed text-[#282728] last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-4 list-decimal space-y-1.5 text-[15px] leading-relaxed text-[#282728] last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-[#0D0E10] underline underline-offset-2">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
