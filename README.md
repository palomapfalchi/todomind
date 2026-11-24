# ToDoMind — PWA de Organização em Caixas (Offline-First)

Aplicativo mobile-first em **pt-BR**, instalável no Android (PWA), pensado para ajudar pessoas neurodivergentes (especialmente com TDAH) a tirar tarefas da cabeça com o mínimo de atrito. Todos os dados são persistidos localmente via **IndexedDB (Dexie)** com esquema versionado por migrations.

Veja o plano completo das próximas versões em [ROADMAP.md](./ROADMAP.md).

## Stack
- Vite + React + TypeScript
- Dexie (`dexie` + `dexie-react-hooks`) — Schema `v2`
- `vite-plugin-pwa` (Workbox + App Shortcuts)
- CSS puro com tema claro/escuro automático + alternância manual
- Lucide React (ícones)

## Funcionalidades (v1.5)
- **Visual em Caixas (Grid Bento):** várias caixas visíveis na tela inicial (ex.: *Despejo*, *Mercado*, *Presentes*, *Compromissos*), cada uma com cor, ícone, fixação no topo e prévia das ações pendentes
- **Ações direto na caixa:** marque checkboxes e adicione ações rápidas diretamente nos cards sem abrir outra tela
- **Despejo Rápido ("Tirar da cabeça"):** barra fixa no topo com caixa **Despejo (Inbox)** permanente e suporte a **entrada em lote** (cada linha vira uma ação)
- **Detalhes completos da ação:** prioridade (`Baixa`, `Média`, `Alta`), vencimento opcional, ordenação automática e opção de mover a ação entre caixas
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
