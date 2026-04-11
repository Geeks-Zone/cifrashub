"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Eye, Minus, Plus, TextCursorInput, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  cleanSongSections,
  joinSectionPlainTexts,
  parsePlainTextCifra,
  sectionToPlainText,
  sectionsToPlainText,
} from "@/lib/parse-plain-cifra";
import { SONG_ARTICLE_WIDTH_CLASS } from "@/lib/song-article-layout";
import type { Section } from "@/lib/types";
import { SongContent } from "@/components/song/song-content";

/** Texto ainda igual ao exportado do `songData` → prévia usa o mesmo array (sem round-trip). */
function isEditorTextCanonical(fullText: string, songData: Section[]): boolean {
  const canonical = sectionsToPlainText(songData)
    .replace(/\r\n/g, "\n")
    .trimEnd();
  const t = fullText.replace(/\r\n/g, "\n").trimEnd();
  return t === canonical;
}

function sectionHeaderLabel(block: string, index: number): string {
  const first = block.split("\n")[0]?.trim() ?? "";
  if (/^\[[^\]]+\]$/.test(first)) return first;
  return `Seção ${index + 1}`;
}

const SECTION_SNIPPETS: { label: string; text: string }[] = [
  { label: "[Intro]", text: "[Intro]\n" },
  { label: "[Verso]", text: "[Verso]\n" },
  { label: "[Pré-Refrão]", text: "[Pré-Refrão]\n" },
  { label: "[Refrão]", text: "[Refrão]\n" },
  { label: "[Ponte]", text: "[Ponte]\n" },
  { label: "[Solo]", text: "[Solo]\n" },
  { label: "[Tablatura]", text: "[Tablatura]\n" },
  { label: "[Outro]", text: "[Outro]\n" },
];

/** Preferências da tela da música — prévia usa os mesmos valores (mais zoom local). */
type SongPreviewDisplayPrefs = {
  tone: number;
  capo: number;
  simplified: boolean;
  columns: number;
  spacingOffset: number;
};

type SongTextPreviewEditorProps = {
  songData: Section[];
  onApply: (next: Section[]) => void;
  onCancel: () => void;
  baseFontSizeOffsetPx?: number;
  previewDisplay?: SongPreviewDisplayPrefs;
  /** Envolve a faixa de ajuda + ferramentas (ex.: header da página + sticky único). */
  wrapStickyChrome?: (editorChrome: ReactNode, actionButtons: ReactNode) => ReactNode;
};

export function SongTextPreviewEditor({
  songData,
  onApply,
  onCancel,
  baseFontSizeOffsetPx = 0,
  previewDisplay,
  wrapStickyChrome,
}: SongTextPreviewEditorProps) {
  const [sectionTexts, setSectionTexts] = useState<string[]>(() =>
    songData.map(sectionToPlainText),
  );
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [editorFontBoostPx, setEditorFontBoostPx] = useState(0);
  const [applyError, setApplyError] = useState<string | null>(null);
  /** Índice da seção após a qual inserir; `null` = modal fechado. */
  const [addSectionAfterIndex, setAddSectionAfterIndex] = useState<number | null>(
    null,
  );
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSectionTexts(songData.map(sectionToPlainText));
     
    setActiveSectionIndex(0);
     
    setApplyError(null);
  }, [songData]);

  const fullText = useMemo(
    () => joinSectionPlainTexts(sectionTexts),
    [sectionTexts],
  );

  /**
   * Resultado do parser para seção individual — memoizado por texto da seção.
   * Evita O(n) re-parses a cada keystroke noutras seções.
   */
  const sectionParsed = useMemo(
    () => sectionTexts.map((t) => parsePlainTextCifra(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Comparação pelo conteúdo de cada seção; React faz referential equality no array,
    // mas o spread cria novo array só quando sectionTexts muda de comprimento ou de item.
    // useMemo re-runs sempre que sectionTexts muda — e cada result.ok vem de cada t.
    [sectionTexts],
  );

  // Parse global: só para validação do botão Aplicar e badge "ao vivo".
  const parsed = useMemo(() => parsePlainTextCifra(fullText), [fullText]);
  const isCanonical = isEditorTextCanonical(fullText, songData);

  const updateSectionText = useCallback((index: number, value: string) => {
    setSectionTexts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const insertSectionAfter = useCallback((index: number, initialPlain: string) => {
    setSectionTexts((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, initialPlain);
      return next;
    });
    setApplyError(null);
    const focusIdx = index + 1;
    const cursorPos = initialPlain.length;
    setActiveSectionIndex(focusIdx);
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const ta = textareaRefs.current[focusIdx];
          if (!ta) return;
          ta.focus({ preventScroll: true });
          const end = Math.min(cursorPos, ta.value.length);
          ta.setSelectionRange(end, end);
        });
      });
    });
  }, []);

  const removeSection = useCallback((index: number) => {
    setSectionTexts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, j) => j !== index);
    });
    setApplyError(null);
    setActiveSectionIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  }, []);

  const effectiveTransposition = useMemo(() => {
    const tone = previewDisplay?.tone ?? 0;
    const capo = previewDisplay?.capo ?? 0;
    return tone - capo;
  }, [previewDisplay?.tone, previewDisplay?.capo]);

  const simplified = previewDisplay?.simplified ?? false;
  const columns = previewDisplay?.columns ?? 1;
  const spacingOffset = previewDisplay?.spacingOffset ?? 0;

  const insertAtCursor = useCallback(
    (snippet: string) => {
      const i = activeSectionIndex;
      const row = sectionTexts[i];
      if (row === undefined) return;
      const el = textareaRefs.current[i];
      if (!el) {
        updateSectionText(i, row + snippet);
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const scrollTop = el.scrollTop;
      const scrollLeft = el.scrollLeft;
      updateSectionText(i, row.slice(0, start) + snippet + row.slice(end));
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          const ta = textareaRefs.current[i];
          if (!ta) return;
          ta.scrollTop = scrollTop;
          ta.scrollLeft = scrollLeft;
          ta.focus({ preventScroll: true });
          const pos = start + snippet.length;
          ta.setSelectionRange(pos, pos);
        });
      });
    },
    [activeSectionIndex, sectionTexts, updateSectionText],
  );

  const handleApply = () => {
    const result = parsePlainTextCifra(fullText);
    if (!result.ok) {
      setApplyError(result.error);
      return;
    }
    const cleaned = cleanSongSections(result.data);
    if (cleaned.length === 0) {
      setApplyError("A cifra ficou vazia após remover linhas em branco.");
      return;
    }
    setApplyError(null);
    onApply(cleaned);
  };

  const toolbarClass = "h-9 gap-1.5 rounded-lg px-2.5 text-xs sm:text-sm";

  const chromeBody = (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {/* modal=false: menu modal trava o scroll da página; ao fechar a restauração joga o viewport para o topo. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className={cn(toolbarClass, buttonVariants({ variant: "outline", size: "sm" }))}
          title="Inserir cabeçalho de seção na posição do cursor"
        >
          <TextCursorInput className="size-4 opacity-80" />
          Inserir seção
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Snippet no cursor</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SECTION_SNIPPETS.map((s) => (
              <DropdownMenuItem
                key={s.label}
                onClick={() => insertAtCursor(s.text)}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-0.5 hidden h-7 sm:block" />

      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        Texto
      </span>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title="Diminuir fonte do editor"
          disabled={editorFontBoostPx <= -4}
          onClick={() => setEditorFontBoostPx((n) => Math.max(-4, n - 2))}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title="Aumentar fonte do editor"
          disabled={editorFontBoostPx >= 10}
          onClick={() => setEditorFontBoostPx((n) => Math.min(10, n + 2))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );

  const actionButtons = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="button" size="sm" onClick={handleApply}>
        Aplicar
      </Button>
    </div>
  );

  const stickyChrome = wrapStickyChrome ? (
    wrapStickyChrome(
      <div className="px-3 py-2 sm:px-4">{chromeBody}</div>,
      actionButtons,
    )
  ) : (
    <div className="sticky top-0 z-20 shrink-0 border-b border-border/50 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        {chromeBody}
        {actionButtons}
      </div>
    </div>
  );

  return (
    <div className="no-print flex min-h-0 flex-1 flex-col">
      {stickyChrome}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-2 sm:px-4">
          <Eye className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Texto e pré-visualização alinhados por seção
          </span>
          {parsed.ok && !isCanonical ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
              ao vivo
            </span>
          ) : null}
        </div>

        {!parsed.ok ? (
          <div className="shrink-0 border-b border-amber-500/25 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
            {parsed.error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sectionTexts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma seção para editar.
            </p>
          ) : (
            sectionTexts.map((block, i) => {
              // Usa resultado já cacheado — sem re-parse por seção no render
              const blockParsed = sectionParsed[i]!;
              const rowPreviewData = blockParsed.ok ? blockParsed.data : null;
              const canRemove = sectionTexts.length > 1;
              const sectionLabel = sectionHeaderLabel(block, i);
              const editorRows = Math.max(
                4,
                Math.min(40, block.split("\n").length + 3),
              );

              return (
                <div
                  key={`sec-row-${i}`}
                  className="border-b border-border/40 last:border-b-0"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
                    <div className="flex h-full min-h-0 flex-col border-border/50 p-3 sm:p-4 lg:border-r lg:pb-5">
                      <div
                        className={cn(
                          "relative w-full shrink-0 rounded-xl border border-input bg-background shadow-inner",
                          "transition-[box-shadow] focus-within:ring-2 focus-within:ring-ring",
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={!canRemove}
                          className="absolute right-1 top-1 z-10 size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:text-muted-foreground/35"
                          title={
                            canRemove
                              ? "Remover esta seção inteira"
                              : "É preciso manter pelo menos uma seção"
                          }
                          aria-label={
                            canRemove
                              ? "Remover esta seção"
                              : "Não é possível remover a única seção"
                          }
                          onClick={() => canRemove && removeSection(i)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <textarea
                          ref={(el) => {
                            textareaRefs.current[i] = el;
                          }}
                          rows={editorRows}
                          value={block}
                          onChange={(e) => {
                            updateSectionText(i, e.target.value);
                            setApplyError(null);
                          }}
                          onFocus={() => setActiveSectionIndex(i)}
                          spellCheck={false}
                          className="min-h-[5.5rem] w-full resize-y rounded-xl border-0 bg-transparent px-3 pb-2.5 pl-3 pr-11 pt-9 font-mono text-sm leading-relaxed text-foreground outline-none transition-[font-size] focus-visible:ring-0 lg:resize-y"
                          style={{
                            fontSize: `calc(0.8125rem + ${editorFontBoostPx}px)`,
                          }}
                          aria-label={`Texto da seção ${i + 1}: ${sectionLabel}`}
                        />
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-col justify-start bg-muted/15 p-3 sm:p-4 lg:h-full lg:pb-5">
                      {rowPreviewData ? (
                        <div className={cn(SONG_ARTICLE_WIDTH_CLASS, "min-w-0")}>
                          <SongContent
                            songData={rowPreviewData}
                            showTabs
                            expandTabs
                            simplified={simplified}
                            effectiveTransposition={effectiveTransposition}
                            fontSizeOffset={baseFontSizeOffsetPx}
                            columns={columns}
                            spacingOffset={spacingOffset}
                            onChordClick={() => {}}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/55 px-4 py-10 text-center text-xs leading-relaxed text-muted-foreground">
                          Prévia desta seção aparece quando o texto da cifra estiver válido.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center border-t border-dashed border-border/45 bg-muted/10 px-3 py-2.5 sm:py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-dashed text-xs sm:text-sm"
                      onClick={() => setAddSectionAfterIndex(i)}
                    >
                      <Plus className="size-4 opacity-90" />
                      Nova seção abaixo
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {applyError ? (
        <p className="shrink-0 border-t border-border/40 px-4 py-2 text-sm text-destructive sm:px-6">
          {applyError}
        </p>
      ) : null}

      <Dialog
        open={addSectionAfterIndex !== null}
        onOpenChange={(open) => {
          if (!open) setAddSectionAfterIndex(null);
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Nova seção</DialogTitle>
            <DialogDescription>
              Escolha o tipo de seção. Ela será inserida vazia (só o cabeçalho) e o
              cursor ficará pronto para você digitar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[min(60vh,22rem)] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {SECTION_SNIPPETS.map((s) => (
              <Button
                key={s.label}
                type="button"
                variant="outline"
                className="h-auto min-h-10 justify-start px-3 py-2.5 font-mono text-xs sm:text-sm"
                onClick={() => {
                  const after = addSectionAfterIndex;
                  if (after === null) return;
                  setAddSectionAfterIndex(null);
                  insertSectionAfter(after, s.text);
                }}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
