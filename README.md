# ToDoMind — PWA de Organização em Caixas (Offline-First)

Aplicativo mobile-first em **pt-BR**, instalável no Android (PWA), pensado para ajudar pessoas neurodivergentes (especialmente com TDAH) a tirar tarefas da cabeça com o mínimo de atrito. Todos os dados são persistidos localmente via **IndexedDB (Dexie)** com esquema versionado por migrations.

Veja o plano completo das próximas versões em [ROADMAP.md](./ROADMAP.md).

## Stack
- Vite + React + TypeScript
- Dexie (`dexie` + `dexie-react-hooks`) — Schema `v4`
- `vite-plugin-pwa` (Workbox + App Shortcuts)
- CSS puro com tema claro/escuro automático + alternância manual
- Lucide React (ícones)

## Funcionalidades (v2.5)
- **Interface limpa com Menu Hambúrguer (`☰`) e menu `⋮` nas caixinhas:** tela inicial minimalista (apenas `☰` e `🔍` no topo), reunindo reordenação, lembretes, arquivadas, tema e backup no drawer lateral
- **Visual em Caixas (Grid Bento uniforme):** caixas com altura fixa exibindo o nome completo e os 2 primeiros itens pendentes, cor, ícone, fixação no topo e arquivamento de caixas pausadas
- **Busca global instantânea (`🔍`) & Filtros rápidos:** pesquise em todas as caixas, notas e micropassos e filtre por tempo livre (`Até 5/15/30 min`), energia ou prioridade
- **Despejo Rápido multi-linha ("Tirar da cabeça"):** barra fixa no topo com caixa **Despejo (Inbox)** permanente onde pular linha (`Enter`) cria várias ações de uma única vez
- **Arrastar e soltar (touch + mouse):** arraste ações de uma caixa para outra (na tela inicial ou pela barra destino dentro da caixa) e reordene arrastando
- **Recursos pensados para TDAH:**
  - **Micropassos / Subtarefas** com barra de progresso interativa em cada ação
  - **Rotinas reutilizáveis** com botão *"Resetar checklist"* (ideal para Mercado, Casa, Mala)
  - **Atrasos sem culpa** com botões de 1 toque *"Trazer para hoje"* e *"Adiar p/ amanhã"*
  - **Etiquetas de tempo estimado** (`2 min` a `1h`), **nível de energia**, **horário opcional** e **lembretes locais** (Notification API)
  - **Feedback tátil leve** (`navigator.vibrate`) e micro-animação ao concluir ações
- **Backup local em JSON & PWA instalável:** exporte/importe dados e use os atalhos no ícone do app Android (*Despejo Rápido* e *Nova Caixa*)

## Como rodar localmente

```bash
npm install
npm run pwa-assets
npm run dev
```

## Publicação no GitHub Pages (HTTPS para instalar no Android)
1. Suba o repositório para o GitHub (branch `main`).
2. Vá em **Settings -> Pages -> Source** e selecione **GitHub Actions**.
3. O workflow em `.github/workflows/deploy.yml` fará o build e deploy automaticamente.
4. Abra a URL gerada no Chrome do Android e toque em **Instalar app**.
