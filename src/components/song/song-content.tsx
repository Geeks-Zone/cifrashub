"use client";

import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { simplifyChord, transposeChord } from "@/lib/music";
import { cn } from "@/lib/utils";
import type { LyricLine, Section } from "@/lib/types";

type SongContentProps = {
  songData: Section[];
  showTabs: boolean;
  simplified: boolean;
  effectiveTransposition: number;
  fontSizeOffset: number;
  columns: number;
  spacingOffset: number;
  onChordClick: (chord: string) => void;
  /** Prévia do editor: tablatura sempre expandida (conteúdo visível por completo). */
  expandTabs?: boolean;
};

type ContentChunk =
  | { type: "lyrics"; lines: LyricLine[] }
  | { type: "tabs"; lines: LyricLine[] };

function chunkLinesByTab(content: LyricLine[]): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  for (const line of content) {
    const isTab = line.length > 0 && Boolean(line[0]?.isTab);
    const last = chunks[chunks.length - 1];
    if (isTab) {
      if (last?.type === "tabs") last.lines.push(line);
      else chunks.push({ type: "tabs", lines: [line] });
    } else {
      if (last?.type === "lyrics") last.lines.push(line);
      else chunks.push({ type: "lyrics", lines: [line] });
    }
  }
  return chunks;
}

const SECTION_COLOR: Record<string, string> = {
  chorus: "text-primary",
  solo: "text-chart-4",
  "pre-chorus": "text-chart-2",
  bridge: "text-chart-5",
  intro: "text-muted-foreground/80",
  outro: "text-muted-foreground/80",
};

const BAR_COLOR: Record<string, string> = {
  chorus: "bg-primary",
  solo: "bg-chart-4",
  "pre-chorus": "bg-chart-2",
};

export const SongContent = memo(function SongContent({
  songData,
  showTabs,
  simplified,
  effectiveTransposition,
  fontSizeOffset,
  columns,
  spacingOffset,
  onChordClick,
  expandTabs = false,
}: SongContentProps) {
  const sectionSpacing = 16 + spacingOffset;
  const lineSpacing = spacingOffset;
  const lineRowGap = spacingOffset * 0.5;
  const chordTextGap = spacingOffset * 0.25;

  const lineHasDisplayChord = (line: LyricLine): boolean =>
    line.some((block) => {
      let c = block.chord;
      if (!c) return false;
      if (simplified) c = simplifyChord(c);
      c = transposeChord(c, effectiveTransposition);
      return Boolean(c);
    });

  const renderLineRow = (line: LyricLine, rowKey: string, isLineTab: boolean) => {
    const compactTab = isLineTab && !lineHasDisplayChord(line);

    if (compactTab) {
      return (
        <div
          key={rowKey}
          className="flex min-w-0 max-w-max flex-wrap items-center"
        >
          {line.map((block, bIdx) => (
            <div
              key={bIdx}
              className={cn(block.spaceAfter !== false && "mr-2 md:mr-3")}
            >
              <div className="whitespace-pre font-mono text-[0.9em] leading-[1.35] text-muted-foreground">
                {block.text || "\u00A0"}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        key={rowKey}
        className={cn(
          "flex flex-wrap items-end",
          isLineTab && "min-w-0 max-w-max",
        )}
        style={{
          marginBottom: `${lineSpacing}px`,
          rowGap: `${lineRowGap}px`,
        }}
      >
        {line.map((block, bIdx) => {
          let displayChord = block.chord;
          if (displayChord) {
            if (simplified) displayChord = simplifyChord(displayChord);
            displayChord = transposeChord(displayChord, effectiveTransposition);
          }

          return (
            <div
              key={bIdx}
              className={cn(
                "flex flex-col",
                block.spaceAfter !== false && "mr-2 md:mr-3",
              )}
            >
              <span
                role="button"
                tabIndex={displayChord ? 0 : -1}
                aria-label={displayChord ? `Acorde ${displayChord}` : undefined}
                className="chord-name -ml-0.5 cursor-pointer rounded-sm px-0.5 font-mono text-[1.05em] font-bold text-primary select-none whitespace-pre transition-colors hover:bg-primary/15"
                onClick={(e) => {
                  e.stopPropagation();
                  if (displayChord) onChordClick(displayChord);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    if (displayChord) onChordClick(displayChord);
                  }
                }}
              >
                {displayChord || "\u00A0"}
              </span>
              <div
                className={cn(
                  "text-[1em] leading-relaxed whitespace-pre text-foreground/85",
                  isLineTab && "font-mono text-[0.9em] text-muted-foreground",
                )}
                style={{
                  marginTop: `${chordTextGap}px`,
                }}
              >
                {block.text || "\u00A0"}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="relative z-10 min-w-0 transition-all duration-300"
      style={{
        fontSize: `calc(1rem + ${fontSizeOffset}px)`,
        columnCount: columns,
        columnGap: "3rem",
      }}
    >
      {songData.map((section, idx) => {
        const isSectionOnlyTabs =
          section.content.length > 0 &&
          section.content.every(
            (line) => line.length > 0 && line[0]?.isTab,
          );
        if (isSectionOnlyTabs && !showTabs) return null;

        const barColor = BAR_COLOR[section.type];
        const labelColor = SECTION_COLOR[section.type] ?? "text-muted-foreground";
        const chunks = chunkLinesByTab(section.content);

        return (
          <div
            key={idx}
            className={cn("relative min-w-0 break-inside-avoid", idx > 0 && "mt-6")}
            style={{
              marginBottom: `${sectionSpacing}px`,
            }}
          >
            {barColor && (
              <div
                className={cn(
                  "absolute top-0 bottom-0 -left-4 hidden w-[3px] rounded-full md:block no-print",
                  barColor,
                )}
              />
            )}

            <details
              open
              className="song-section-accordion group/section relative pl-0 md:pl-6"
            >
              <summary
                className={cn(
                  "mb-3 flex cursor-pointer list-none items-center gap-1.5 select-none",
                  "[&::-webkit-details-marker]:hidden",
                  section.label
                    ? cn(
                        "text-[0.7em] font-semibold tracking-[0.1em] uppercase",
                        "transition-opacity hover:opacity-75",
                        labelColor,
                      )
                    : "pointer-events-none opacity-0 h-0 mb-0 overflow-hidden",
                )}
              >
                {section.label
                  ? section.label.replace(/^\[|\]$/g, "")
                  : null}
                {section.label && (
                  <ChevronDown className="no-print size-[1.1em] shrink-0 opacity-50 transition-transform duration-200 group-open/section:rotate-180" />
                )}
              </summary>
              {chunks.map((chunk, cIdx) => {
                if (chunk.type === "lyrics") {
                  return chunk.lines.map((line, lIdx) =>
                    renderLineRow(line, `ly-${idx}-${cIdx}-${lIdx}`, false),
                  );
                }

                if (!showTabs) return null;

                const nLines = chunk.lines.length;
                return (
                  <details
                    key={`tab-${idx}-${cIdx}`}
                    open={expandTabs ? true : undefined}
                    className={cn(
                      "song-tab-accordion group/tab-acc no-print mb-3 w-full min-w-0 max-w-full break-inside-avoid rounded-lg border border-border/60 bg-card/40 shadow-sm",
                      "open:border-border open:bg-card/60",
                    )}
                  >
                    <summary
                      className={cn(
                        "flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2",
                        "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
                        "select-none hover:bg-muted/50",
                        "[&::-webkit-details-marker]:hidden",
                      )}
                    >
                      <span>
                        Tablatura
                        {nLines > 1 ? (
                          <span className="ml-1.5 font-normal normal-case text-muted-foreground/80">
                            ({nLines} linhas)
                          </span>
                        ) : null}
                      </span>
                      <ChevronDown className="song-tab-chevron size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open/tab-acc:rotate-180" />
                    </summary>
                    <div
                      className={cn(
                        "song-tab-body border-t border-border/50 px-2 pb-2.5 pt-2",
                        "motion-reduce:transition-none",
                      )}
                    >
                      <div className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
                        <div className="w-max max-w-none pr-1">
                          {chunk.lines.map((line, lIdx) =>
                            renderLineRow(line, `tb-${idx}-${cIdx}-${lIdx}`, true),
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
            </details>
          </div>
        );
      })}
    </div>
  );
});
