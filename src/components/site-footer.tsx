import { GitBranch } from "lucide-react";

const REPO_URL = "https://github.com/Geeks-Zone/cifrashub";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-border/50 bg-background/95 px-4 py-5 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs"
      role="contentinfo"
    >
      <p className="mx-auto max-w-lg">
        <strong className="font-medium text-foreground/90">CifrasHub</strong>{" "}
        é um projeto de{" "}
        <span className="whitespace-nowrap">código aberto</span> (licença MIT).
        Contribuições são bem-vindas.
      </p>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center justify-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
      >
        <GitBranch className="size-3.5 shrink-0 opacity-90" aria-hidden />
        Código-fonte no GitHub
      </a>
    </footer>
  );
}
