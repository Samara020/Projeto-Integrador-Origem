# Origem · guia do repositório

Marketplace de artesanato, literatura e arte de Pernambuco. Projeto Integrador, ADS, CESAR School, 2026.2.

Este arquivo vale para pessoas e para agentes de IA (Claude Code, Cursor, Copilot, Codex). Leia antes de abrir o editor.

## Mapa

- `frontend/`: aplicação Next.js. Regras de código em `frontend/AGENTS.md`. Regras visuais em `frontend/DESIGN.md`.
- `backend/`: API real, entra na Avaliação 2.
- `docs/ContratoDeAPI.md`: contrato da API. É a fonte dos nomes de campo e das rotas, no backend e no frontend.
- `docs/Origem_Brand_Guidelines_Identidade_Visual.pdf`: manual da marca (logo, paleta, tipografia).
- Figma: link no `README.md`.

## Ordem de leitura antes de codar no frontend

1. `frontend/AGENTS.md` (arquitetura, Fake API, estados de tela).
2. `frontend/DESIGN.md` (tokens, componentes, lista do que nunca usar).
3. A seção do `docs/ContratoDeAPI.md` que cobre a sua tela.
4. O frame da sua tela no Figma.

## Git

Decisão da equipe em 25/09/2026: o trabalho vai direto na `main`. Sem branch de feature e sem PR.

- `main` precisa estar sempre rodando. O deploy sai dela.
- Antes de commitar: `git pull --rebase origin main`. Nunca copie pastas por cima da `main`; isso apaga a história e cria conflito para todo mundo.
- Antes do push, em `frontend/`: `npm run build` e `npm run lint` verdes. Build quebrado na `main` para a equipe inteira.
- Commit pequeno: uma tela ou um recurso por vez. Se precisar de vários dias numa coisa, aí sim use uma branch e mescle quando terminar.

## Commits

- Português, minúscula no início, verbo no imperativo: `adiciona`, `ajusta`, `remove`, `corrige`.
- Diga o efeito, não o arquivo. Bom: `adiciona filtro por região no catálogo`. Ruim: `update page.tsx`.
- Cada pessoa commita com a própria conta. A avaliação mede participação pelo histórico.
- Sem co-autoria de IA na mensagem (`Co-Authored-By` de assistente).

## Segurança

- `.env*` nunca entra no git. Variável nova entra em `frontend/.env.example`, sem valor secreto.
- Antes de abrir PR no frontend: `npm audit --audit-level=high`. Vulnerabilidade alta bloqueia o merge.
