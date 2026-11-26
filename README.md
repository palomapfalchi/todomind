# ToDoMind — PWA de Organização em Caixas (Offline-First)

Aplicativo mobile-first em **pt-BR**, instalável no Android (PWA), pensado para ajudar pessoas neurodivergentes (especialmente com TDAH) a tirar tarefas da cabeça com o mínimo de atrito. Todos os dados são persistidos localmente via **IndexedDB (Dexie)** com esquema versionado por migrations.

Veja o plano completo das próximas versões em [ROADMAP.md](./ROADMAP.md).

## Stack
- Vite + React + TypeScript
- Dexie (`dexie` + `dexie-react-hooks`) — Schema `v4`
- `vite-plugin-pwa` (Workbox + App Shortcuts)
- CSS puro com tema claro/escuro automático + alternância manual
- Lucide React (ícones)

## Funcionalidades (v2.0)
- **Visual em Caixas (Grid Bento uniforme):** várias caixas com altura fixa na tela inicial exibindo os 2 primeiros itens pendentes, cor, ícone, fixação no topo e reordenação por **arrastar e soltar** (ou setas)
- **Arrastar e soltar (touch + mouse):** arraste caixas para reordenar e arraste ações direto de uma caixa para outra (tanto na tela inicial quanto dentro de uma caixa aberta)
- **Despejo Rápido multi-linha ("Tirar da cabeça"):** barra fixa no topo com caixa **Despejo (Inbox)** permanente onde pular linha (`Enter`) cria várias ações de uma única vez
- **Recursos pensados para TDAH:**
  - **Micropassos / Subtarefas** com barra de progresso interativa em cada ação
  - **Rotinas reutilizáveis** com botão *"Resetar checklist"* (ideal para Mercado, Casa, Mala)
  - **Atrasos sem culpa** com botões de 1 toque *"Trazer para hoje"* e *"Adiar p/ amanhã"*
  - **Etiquetas de tempo estimado** (`2 min` a `1h`), **nível de energia** e **horário opcional**
  - **Feedback tátil leve** (`navigator.vibrate`) e micro-animação ao concluir ações
- **Detalhes completos & Notificações (toast):** descrição/nota opcional acima do vencimento, prioridade, ordenação manual ou automática e feedback imediato ao salvar/mover
- **Backup local em JSON:** exporte e importe suas caixas e ações (mesclando ou substituindo dados)
- **Atalhos PWA no Android:** segure o ícone do app para abrir direto em *Despejo Rápido* ou *Nova Caixa*
- **Tema claro e escuro:** sincronizado com o sistema e com preferência salva localmente

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
