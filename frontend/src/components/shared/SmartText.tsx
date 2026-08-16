"use client";

import { useMemo } from "react";
import { TERM_PATTERNS } from "@/lib/concepts";
import { useExplainer } from "@/context/ExplainerContext";

interface SmartTextProps {
  text: string;
  className?: string;
}

interface Piece {
  text: string;
  id?: string;
}

export function SmartText({ text, className = "" }: SmartTextProps) {
  const { open } = useExplainer();
  const pieces = useMemo(() => highlight(text), [text]);

  return (
    <span className={className}>
      {pieces.map((piece, i) =>
        piece.id ? (
          <button
            key={`${piece.id}-${i}`}
            type="button"
            onClick={() => open(piece.id!)}
            className="mx-0.5 rounded-sm border-b border-dotted border-blue-500 text-blue-700 hover:bg-blue-50"
          >
            {piece.text}
          </button>
        ) : (
          <span key={i}>{piece.text}</span>
        )
      )}
    </span>
  );
}

function highlight(text: string): Piece[] {
  const hits: { start: number; end: number; id: string }[] = [];
  for (const { id, re } of TERM_PATTERNS) {
    const copy = new RegExp(re.source, re.flags);
    let match: RegExpExecArray | null;
    while ((match = copy.exec(text)) !== null) {
      hits.push({ start: match.index, end: match.index + match[0].length, id });
      if (!copy.global) break;
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: typeof hits = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    kept.push(hit);
    cursor = hit.end;
  }
  const out: Piece[] = [];
  let i = 0;
  for (const hit of kept) {
    if (hit.start > i) out.push({ text: text.slice(i, hit.start) });
    out.push({ text: text.slice(hit.start, hit.end), id: hit.id });
    i = hit.end;
  }
  if (i < text.length) out.push({ text: text.slice(i) });
  return out.length ? out : [{ text }];
}
