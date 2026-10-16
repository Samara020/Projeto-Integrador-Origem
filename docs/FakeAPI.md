# Fake API - Sistema Origem

Este documento explica, de forma simples, como o frontend do Origem funciona sem um backend real ainda ligado.

---

## 1. O que é a Fake API

O backend de verdade (Node.js + PostgreSQL) ainda não está pronto/integrado. Para as telas poderem ser desenvolvidas e testadas mesmo assim, o frontend **finge** que existe uma API: ele mesmo responde as próprias requisições, usando dados inventados (mocks), mas devolvendo tudo no mesmo formato que o backend real vai devolver no futuro.

Na prática, isso significa que as telas (catálogo, produto, carrinho, login, painel admin...) já funcionam de ponta a ponta hoje, com dados falsos, exatamente como vão funcionar quando o backend real entrar.

---

## 2. Por que fazer isso

- Permite construir e testar todas as telas sem esperar o backend ficar pronto.
- Permite testar loading, erro e "nenhum resultado encontrado" de propósito, de forma controlada.
- Quando o backend real ficar pronto, a troca é simples: como tudo já é consumido do mesmo jeito, só muda "de onde vêm os dados" — não é preciso reescrever as telas.

---

## 3. Como o fluxo funciona (de forma simples)

Pensa em quatro camadas, uma chamando a outra:

1. **Tela** (ex: página do Catálogo) — pede os dados que precisa, sem saber de onde eles vêm.
2. **Camada de serviço** — sabe qual "endereço" pedir (ex: "me dá a lista de produtos").
3. **Fake API** — recebe esse pedido, espera um tempinho (pra simular internet de verdade) e devolve dados fictícios prontos, no formato combinado.
4. **Dados falsos (mocks)** — uma lista de produtos, artesãos, avaliações etc., escrita à mão, que serve de "banco de dados" temporário.

```
Tela  →  pede dados  →  Fake API  →  busca nos dados falsos  →  devolve resposta
```

A tela nunca fala diretamente com os dados falsos — ela sempre passa pela mesma "porta de entrada", então trocar a Fake API pelo backend real não exige mexer nas telas.

---

## 4. Como a simulação é feita

Toda vez que uma tela pede alguma informação:

- A resposta **demora um pouco de propósito** (menos de meio segundo), simulando uma internet real. É por isso que aparece uma tela de carregamento (skeleton) antes do conteúdo — isso também acontece no sistema de verdade, então já fica testado.
- É possível **forçar um erro** de propósito, adicionando um parâmetro na URL do navegador. Isso serve para testar se a tela de erro aparece direito, sem precisar quebrar nada de verdade.

---

## 5. O que acontece quando dá erro ou quando não tem dado nenhum

O projeto trata três situações separadamente, sempre do mesmo jeito em todas as telas:

- **Carregando:** mostra um "esqueleto" da tela (blocos cinzas piscando) enquanto os dados não chegam.
- **Erro:** mostra uma mensagem explicando que algo deu errado, com um botão para tentar de novo.
- **Vazio:** quando a busca deu certo, mas não retornou nenhum resultado (ex: nenhum produto encontrado com aquele filtro), mostra uma mensagem explicando isso, em vez de uma tela em branco.

Esses três estados usam componentes visuais reutilizáveis — ou seja, a mesma "cara" de carregando, erro e vazio se repete em todas as telas do site, o que deixa a experiência consistente.

---

## 6. Nem tudo passa pela Fake API

Algumas funcionalidades (carrinho de compras, pedidos, comparação de produtos, suporte, entre outras) não têm uma "rota" de Fake API — elas guardam os dados direto no navegador da pessoa (no armazenamento local do navegador), porque não faz sentido simular um servidor pra algo que ainda vai ser trocado pelo backend depois.

Mesmo assim, essas funcionalidades já são chamadas do mesmo jeito que vão ser chamadas quando o backend real existir — só muda o que acontece "por dentro" delas, sem afetar a tela.

---

## 7. O que muda quando o backend de verdade entrar

Quando o backend real estiver pronto, a ideia é que a troca seja bem simples:

1. Aponta o frontend para o endereço do backend real (uma única configuração).
2. As poucas funcionalidades que hoje só guardam dado no navegador passam a de fato enviar e buscar informação do backend.
3. A Fake API (as respostas fictícias) deixa de ser usada.

Como todas as telas já foram construídas consumindo dados "como se" viessem de um backend real, elas não precisam ser reescritas — só a origem dos dados muda.

---

## 8. Resumindo

A Fake API é uma forma do frontend "brincar de backend" enquanto o backend de verdade não está pronto, respeitando o mesmo contrato de dados que será usado depois. Isso permite:

- Desenvolver e testar todas as telas desde já;
- Testar loading, erro e estado vazio de forma controlada;
- Trocar pela API real no futuro sem precisar reescrever o frontend.
