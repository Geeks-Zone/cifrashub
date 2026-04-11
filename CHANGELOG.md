# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### Adicionado
- Estrutura completa para código aberto: README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- Templates de issues e pull requests para GitHub
- GitHub Actions CI (lint + build em todo PR)
- `.env.example` com documentação das variáveis de ambiente

### Alterado
- Renomeação do projeto de **CifrasPro** para **CifrasHub**
- Chaves do `localStorage` migradas de `cifraspro_*` para `cifrashub_*`

---

## [0.1.0] — 2024

### Adicionado
- Visualização de cifras integrada com Cifra Club
- Organização em pastas com reordenação por drag-and-drop
- Transposição automática com cálculo de capotraste
- Setlists para repertórios ao vivo
- Metrônomo com controle de BPM e subdivisão
- Afinador via Web Audio API
- Modo palco para apresentações
- Compartilhamento público de setlists via link
- PWA com suporte offline via Service Worker
- Integração com YouTube (associar vídeo à cifra)
- Autenticação com Neon Auth (Better Auth)
- Sincronização de dados na nuvem (Neon PostgreSQL)
- Auto-scroll configurável para o modo palco
