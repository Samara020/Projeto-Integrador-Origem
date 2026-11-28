# product.md — Produto

Extraído de `docs/Baseline de IA.pdf` (seção 2.3, SDD). Coerente com `requirements.md` e `design.md`.

## 2.3.1 Contexto do projeto

O Origem é um marketplace voltado à comercialização de artesanato pernambucano.

## 2.3.2 Problema de negócio ou necessidade do usuário

O comprador pode ter dificuldade para descobrir produtos relacionados dentro de um catálogo diversificado.

## 2.3.3 Público-alvo

Compradores do marketplace.

## 2.3.4 Objetivo do módulo

Apresentar produtos relacionados ao produto de referência ou aos filtros utilizados pelo cliente durante a navegação e pesquisa.

## 2.3.5 Benefícios esperados

Facilitar a descoberta de produtos relacionados no catálogo.

## 2.3.6 Limites do produto

O módulo não realiza pagamentos, pedidos, cadastro, estoque, atendimento ou outras funções fora da recomendação e integração.

Itens explicitamente fora do escopo (do Documento de Requisitos): processamento de pagamentos, pedidos, cadastro de produtos, alteração de estoque, gestão de preços, atendimento, triagem de chamados e recomendações de locais, eventos, rotas, vendedores ou anúncios. A HU-23 — Triagem Inteligente e Escalonamento do Suporte permanece fora do escopo desta especificação.

## Rastreabilidade

- Contexto, problema, público, objetivo e limites mapeados para HU-17 (Recomendação de produtos).
- `product.md` é coerente com `requirements.md` (RF-01 a RF-12, RNF-01 a RNF-09) e `design.md` (INT-01, estratégia, baseline e fallback).
