# Correção e reteste dos defeitos do Origem

Data: 23/11/2026. Base avaliada: b1c1e7102e1aee6953350512cee77bf7b122deaf.

- DEF04 / TC24: duas listagens completas de usuários e artesãos no painel administrativo, sem limite dos dez recentes e sem senha/hash/token. Backend exige administrador; vazios previstos.
- DEF06 / TC17: rotas canônicas /admin/produtos/pendentes e /admin/produtos/:id/validacao reutilizam a autenticação e autorização das rotas legadas. Aprovação/reprovação, selo, publicação e auditoria retestados.
- TC23: /artesao/painel/metricas disponível conforme contrato, preservando /painel/*. Testes conferem recentes, vazio e isolamento entre lojas.
- DEF07 / TC18: compra, pagamento, frete e histórico passaram no backend real com PostgreSQL descartável; detalhe e perfil público conferidos no portal.
- DEF09 / TC03: correção preexistente confirmada; busca por peça vendida retorna vazio no teste de vitrine.
- DEF10 / TC09: detalhes abrem. Catálogo, busca e detalhe passaram em dez medições por operação, com média <=2s e máximo <=4s.
- DEF11 / TC13: correção preexistente confirmada; duplo clique e concorrência não duplicaram pedido nos testes de API e navegador.

## Correções da automação

O intercept de rede bloqueava imagens públicas Supabase como se fossem API externa. A exceção agora exige GET, resourceType=image, HTTPS, host exato, bucket público e extensão de imagem; chamadas fetch/XHR e runtime principal continuam bloqueadas.

O teste de recuperação captura o token do e-mail enviado, mantém reset/revogação/uso único/novo login e exige ausência de token e tokenRecuperacao na resposta HTTP normal.

## Evidência local antes da publicação

- Backend: 14 suítes, 181/181 testes aprovados.
- Frontend: 16 suítes, 207/207 testes aprovados.
- Guard de rede: 8/8 testes aprovados.
- Cypress: 42/42 testes, sem skips. Acesso15, vitrine11 e desempenho3 em execuções isoladas Electron; compra10 e cadastro3 em Chrome for Testing146. Asserções de visibilidade preservadas.
- Builds frontend/backend e lint frontend passaram.
- Portal: detalhes e perfil reais, painel administrativo com duas tabelas. Sem overflow da página em1440px (1425/1425) e390px (375/375).
- Revisão independente aprovou código e testes. A fixture de recentes não cobre ordenação/limite5; não se alega essa cobertura.

Ambiente: cópia da main, API descartável :4200 e frontend produção :3200; banco exclusivo origem_bloqueios_20261123. O checkout com trabalho anterior foi preservado. Nenhum Playwright usado. Algumas tentativas Electron falharam por captura/opacity0; Chrome146 passou as mesmas asserções. Estes resultados locais não substituem a confirmação posterior do CI/deploy.
