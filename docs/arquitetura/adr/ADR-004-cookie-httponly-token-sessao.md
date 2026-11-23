# ADR-004: Adotar cookie HttpOnly para armazenar o token de sessão

- **Status:** Proposta
- **Data:** 2026-11-21
- **Autor:** LARA THAYLANNE HO DA SILVA (lths@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem usa login com JWT válido por 7 dias, e o frontend guarda o token no localStorage, onde qualquer script da página consegue lê-lo. A plataforma tem três perfis (comprador, artesão e administrador) com dados pessoais e permissões diferentes. A equipe é pequena, o prazo é de um semestre, a stack (Next.js, Express e PostgreSQL) já está definida e não há orçamento de infraestrutura

## Preocupações

confidencialidade, roubo de sessão, XSS, CSRF, custo de mudança, prazo

## Decisão

O backend passará a enviar o token de sessão em um cookie HttpOnly, Secure e SameSite, e o frontend deixará de guardar o token no localStorage

## Justificativa

O cookie HttpOnly é enviado automaticamente pelo navegador, mas não pode ser lido por JavaScript. Assim, o token não aparece em document.cookie nem no localStorage, atendendo à medida do cenário, sem custo extra de infraestrutura

## Consequências

Ganha: o token não pode ser roubado por XSS.
Perde: surge o risco de CSRF (mitigado com SameSite e CORS); é preciso uma requisição extra (/auth/me) para identificar o usuário; é preciso alterar o backend, o cliente HTTP e a Fake API. O XSS não é eliminado, só o roubo do token

## Alternativas consideradas

localStorage (atual): expõe o token a scripts. Token em memória com refresh token: complexo demais para o prazo

## Rastreabilidade

**Atributo de qualidade:** Segurança (security) · Confidencialidade

**Cenário que originou a decisão:**

> Em operação normal, com o usuário autenticado, um atacante externo consegue executar um script malicioso na página (ataque XSS) e tenta ler o token de sessão de um comprador logado no frontend (navegador) e no mecanismo de sessão e autenticação. O sistema o token de sessão não fica acessível ao JavaScript, e o script não consegue copiá-lo para usar em outro lugar, em 100% das execuções do teste automatizado, o token não aparece em document.cookie nem no localStorage.

**Padrão arquitetural adotado:** Cliente-servidor

**Táticas empacotadas:** Centralizar regra e dado no servidor; Limitar a exposição da API

frontend/src/lib/http.ts, frontend/src/hooks/useSessao.ts, backend/app/src/routes/auth.routes.ts, backend/app/src/services/auth.service.ts, frontend/tests/api/auth.test.ts

## Verificação

- **Teste do cenário:** Teste automatizado (Cypress) que faz login e verifica que o token não aparece em document.cookie nem no localStorage, e teste de API (Jest) que confirma que a resposta do login envia o cookie com as flags HttpOnly, Secure e SameSite. Os dois devem passar em 100% das execuçõe

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
