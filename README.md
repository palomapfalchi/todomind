# ToDoMind — PWA de Organização em Caixas (Offline-First)

Aplicativo mobile-first em **pt-BR**, instalável no Android (PWA), pensado para ajudar pessoas neurodivergentes (especialmente com TDAH) a tirar tarefas da cabeça com o mínimo de atrito. Todos os dados são persistidos localmente via **IndexedDB (Dexie)** com esquema versionado por migrations.

Veja o plano completo das próximas versões em [ROADMAP.md](./ROADMAP.md).

## Stack
- Vite + React + TypeScript
- Dexie (`dexie` + `dexie-react-hooks`) — Schema `v3`
- `vite-plugin-pwa` (Workbox + App Shortcuts)
- CSS puro com tema claro/escuro automático + alternância manual
- Lucide React (ícones)

## Funcionalidades (v1.6)
- **Visual em Caixas (Grid Bento uniforme):** várias caixas com altura fixa na tela inicial exibindo os 2 primeiros itens pendentes, cor, ícone, fixação no topo e reordenação manual
- **Ações direto na caixa:** marque checkboxes e adicione ações rápidas diretamente nos cards sem abrir outra tela
- **Despejo Rápido multi-linha ("Tirar da cabeça"):** barra fixa no topo com caixa **Despejo (Inbox)** permanente onde pular linha (`Enter`) cria várias ações de uma única vez
- **Detalhes completos da ação:** título, descrição/nota opcional, prioridade (`Baixa`, `Média`, `Alta`), vencimento opcional, reordenação manual ou automática e opção de mover entre caixas
- **Notificações imediatas (toast):** feedback visual sempre que ações ou caixas são salvas, movidas ou atualizadas
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
