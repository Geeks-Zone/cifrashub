import { cn } from "@/lib/utils";

/** Largura máxima e padding X iguais ao conteúdo da cifra na SongView. */
export const SONG_ARTICLE_WIDTH_CLASS =
  "mx-auto w-full max-w-5xl px-5 md:px-8 lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[min(96rem,calc(100vw-4rem))]";

/** `<main>` da tela da música (inclui altura mínima e padding vertical). */
export function songViewMainClassName(extra?: string) {
  return cn(
    SONG_ARTICLE_WIDTH_CLASS,
    "min-h-[80vh] cursor-default py-4 md:py-6",
    extra,
  );
}
