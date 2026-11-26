# Roadmap & TODO de Versões — ToDoMind

Plano de evolução do **ToDoMind** com foco em organização visual em caixas, redução de atrito para pessoas neurodivergentes (especialmente TDAH) e sincronização futura com conta e Google Agenda.

---

## v1.0 — Base Offline (Concluída)
- [x] PWA instalável (Android/Desktop) 100% offline com Dexie (IndexedDB)
- [x] CRUD de listas e tarefas (título, prioridade, vencimento opcional, checkbox)
- [x] Ordenação automática (pendentes no topo por vencimento → prioridade → criação)
- [x] Tema claro e escuro com preferência salva localmente

---

## v1.5 — Visual em Caixas & Despejo Rápido (Concluída)
- [x] Migration Dexie `v2` (`color`, `icon`, `pinned`, `order`, `isInbox` nas caixas; `order` nas ações)
- [x] Tela inicial em grade de **Caixas** (estilo Bento / Google Keep) com cor, ícone e opção de fixar no topo
- [x] Checkboxes clicáveis e criação rápida inline direto dentro de cada caixa
- [x] Caixa permanente **Despejo (Inbox)** + barra de captura rápida ("Tirar da cabeça")
- [x] Entrada em lote (multi-linha): colar ou digitar várias linhas gera uma ação por linha
- [x] Mover ação entre caixas ao editar (facilita organizar o que caiu no Despejo)
- [x] Atalhos de aplicativo no PWA (`Despejo Rápido` e `Nova Caixa`)
- [x] Exportação e importação de backup local em JSON (mesclar ou substituir)

---

## v1.6 — Polimento Mobile, Reordenação & Notas (Concluída)
- [x] Migration Dexie `v3` (`description` nas ações e `sortMode` manual/automático nas caixas)
- [x] Despejo e entrada rápida com quebra de linha nativa (`Enter` cria várias linhas → várias ações de uma vez)
- [x] Notificação visual (toast) sempre que itens ou caixas são salvos/movidos
- [x] Reordenação manual de caixas na tela inicial e de ações dentro de cada caixa (com opção de voltar à ordenação automática)
- [x] Campo de **Descrição / Nota** acima do vencimento da ação (exibido no detalhe e sinalizado no card)
- [x] Caixas com altura fixa uniforme exibindo os 2 primeiros itens pendentes + tipografia mais compacta e confortável no celular
- [x] Auditoria completa de botões, fechamento de modais com `×`/`Esc` e botão para limpar data

---

## v2.0 — Foco & Recursos TDAH (Concluída)
- [x] Migration Dexie `v4` (`subtasks`, `dueTime`, `estimatedMinutes`, `energy`, `archivedAt`, `isReusable`)
- [x] **Subtarefas / Micropassos:** quebrar tarefas grandes em passos pequenos com barra de progresso
- [x] **Rotinas reutilizáveis:** botão *"Resetar checklist"* em caixas como Mercado, Rotina da Manhã ou Mala
- [x] **Atrasos sem culpa:** botão de 1 toque *"Trazer atrasadas para hoje"* ou *"Adiar para amanhã"*
- [x] **Etiquetas de tempo e energia:** marcar ações rápidas (2 min / 5 min / 15 min / 30 min / 1h) e nível de energia
- [x] Feedback tátil leve (`navigator.vibrate`) e micro-animação ao concluir ações
- [x] Arrastar e soltar (drag-and-drop) para reordenar caixas e mover ações entre caixas (funciona no celular e no PC)

---

## v2.5 — Busca, Organização & Lembretes (Próxima)
- [ ] Busca global instantânea entre todas as caixas e ações
- [ ] Arquivar/recolher caixas pausadas sem excluir histórico
- [ ] Filtros rápidos por tempo livre, nível de energia ou prioridade
- [ ] Lembretes locais (Notification API / Service Worker) para ações com horário definido (`dueTime`)
- [ ] Adicionar horário opcional junto do calendário ao criar uma ação

---

## v3.0 — Login por E-mail & Nuvem Offline-First
- [ ] Migration Dexie `v5` (`uuid`, `syncStatus`, `deletedAt` para soft-delete, `lastSyncedAt`)
- [ ] Autenticação com **e-mail** (Magic Link ou e-mail/senha) e login com Google (via Supabase ou Firebase)
- [ ] Migração automática dos dados locais do dispositivo ao criar conta
- [ ] Sincronização em segundo plano entre celular e computador mantendo a interface 100% instantânea offline

---

## v4.0 — Integração com Google Agenda
- [ ] Conexão OAuth com Google Calendar via Edge/Cloud Functions (tokens protegidos no backend)
- [ ] Sincronização bidirecional seletiva: ações com data + horário (ou de caixas como *Compromissos*) criam/atualizam eventos no Google Agenda
- [ ] Caixa especial **"Agenda de Hoje"** dentro do ToDoMind exibindo compromissos do Google Calendar
- [ ] *Time-blocking* em 1 toque: agendar uma tarefa diretamente em um bloco de horário no calendário

---

## v4.5+ — Expansão & Comando de Voz
- [ ] **Captura por voz (Web Speech API):** ditar ideias direto para a caixa *Despejo* ou para uma caixa específica
- [ ] Compartilhamento de caixas específicas com outras pessoas (ex.: caixa *Mercado* compartilhada com família)
- [ ] Assistente opcional para quebrar uma tarefa complexa em 3 a 5 micropassos automaticamente
- [ ] Estatísticas gentis de progresso (foco no que foi feito, sem punição por sequências perdidas)
- [ ] **Modo Foco / Agora:** ocultar todas as caixas e focar em 1 a 3 ações com timer visual suave (5 / 15 / 25 min)
- [ ] **Modo Baixo Estímulo:** paleta mais neutra e menos badges na tela para dias de sobrecarga sensorial
