// Teste automatizado de integração ponta a ponta (Frontend :3000 via FRONTEND_BASE_URL + Backend :4000 + PostgreSQL + Módulo de IA :3001).
// Execução contra os containers do docker compose:
//   $env:BACKEND_URL="http://localhost:4000"; $env:FRONTEND_BASE_URL="http://localhost:3000"; $env:RECOMENDACAO_API_URL="http://localhost:3001"
//   npm --prefix frontend run test:api -- tests/api/recomendacoes-integracao.test.ts

const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/$/, "");
const FRONTEND_BASE_URL = (
  process.env.FRONTEND_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const IA_RECOMMENDATION_URL = (process.env.IA_BASE_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);

type ProdutoRecomendado = {
  id: string;
  nome: string;
  preco: number;
  imagemPrincipal: string;
  disponibilidade: string;
  artesao: { id: string; nome: string };
  regiao: { id: string; nome: string };
  motivo?: string;
  score?: number;
};

type RespostaApiRecomendacoes = {
  recomendados: ProdutoRecomendado[];
  produtosRecomendados: ProdutoRecomendado[];
};

const descreverIntegracao = BACKEND_URL ? describe : describe.skip;

descreverIntegracao(
  "integração real · Frontend (:3000 via FRONTEND_BASE_URL) + Backend (:4000) + PostgreSQL + Módulo de IA (:3001)",
  () => {
    test("serviços integrados respondem saudáveis (backend, módulo de IA e páginas do frontend)", async () => {
      const [healthBackend, readyIA, paginaProduto, paginaRecomendacoes] =
        await Promise.all([
          fetch(`${BACKEND_URL}/health`),
          fetch(`${IA_RECOMMENDATION_URL}/readyz`),
          fetch(`${FRONTEND_BASE_URL}/produto/2001`),
          fetch(`${FRONTEND_BASE_URL}/recomendacoes`),
        ]);

      expect(healthBackend.status).toBe(200);
      expect(readyIA.status).toBe(200);
      expect(paginaProduto.status).toBe(200);
      expect(paginaRecomendacoes.status).toBe(200);
    });

    test("GET /produtos/recomendacoes?produtoId=2001 consulta a IA com catálogo real, expõe CORS e retorna apenas peças válidas disponíveis", async () => {
      const resposta = await fetch(
        `${BACKEND_URL}/produtos/recomendacoes?produtoId=2001&limite=4`,
        {
          headers: {
            Accept: "application/json",
            Origin: FRONTEND_BASE_URL,
          },
        },
      );

      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("x-recomendacao-fonte")).toBe("ia");
      expect(
        resposta.headers
          .get("access-control-expose-headers")
          ?.toLowerCase(),
      ).toContain("x-recomendacao-fonte");

      const corpo = (await resposta.json()) as RespostaApiRecomendacoes;
      const itens = corpo.recomendados;

      expect(itens.length).toBeGreaterThan(0);
      expect(itens.length).toBeLessThanOrEqual(4);

      const ids = itens.map((p) => p.id);
      expect(ids).not.toContain("2001"); // exclui referência
      expect(ids).not.toContain("2008"); // exclui peça esgotada (estoque 0)
      expect(ids[0]).toBe("2013"); // maior afinidade (categoria + técnica + região)

      for (const item of itens) {
        expect(item.disponibilidade).toBe("DISPONIVEL");
        expect(item.nome.length).toBeGreaterThan(0);
        expect(item.preco).toBeGreaterThan(0);
        expect(item.motivo).toBeTruthy();
        expect(typeof item.score).toBe("number");
      }

      // Garante ordenação decrescente por score.
      const scores = itens.map((p) => p.score ?? 0);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));

      // Confirma que cada item recomendado corresponde a um produto real válido no catálogo do backend.
      const detalhes = await Promise.all(
        ids.map((id) => fetch(`${BACKEND_URL}/produtos/${encodeURIComponent(id)}`)),
      );
      expect(detalhes.every((r) => r.status === 200)).toBe(true);
    });

    test("GET /produtos/recomendacoes por filtro (técnica) sem produtoId retorna peças coerentes via IA", async () => {
      const resposta = await fetch(
        `${BACKEND_URL}/produtos/recomendacoes?tecnica=${encodeURIComponent("Cerâmica")}&limite=5`,
      );

      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("x-recomendacao-fonte")).toBe("ia");

      const corpo = (await resposta.json()) as RespostaApiRecomendacoes;
      expect(corpo.recomendados.length).toBeGreaterThan(0);
      expect(
        corpo.recomendados.every((p) => p.disponibilidade === "DISPONIVEL"),
      ).toBe(true);
      expect(
        corpo.recomendados.every((p) =>
          p.motivo?.includes("mesma técnica artesanal"),
        ),
      ).toBe(true);
    });

    test("GET /produtos/recomendacoes por filtro (região) retorna peças da região via IA", async () => {
      const resposta = await fetch(
        `${BACKEND_URL}/produtos/recomendacoes?regiao=${encodeURIComponent("Agreste - PE")}&limite=5`,
      );

      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("x-recomendacao-fonte")).toBe("ia");

      const corpo = (await resposta.json()) as RespostaApiRecomendacoes;
      expect(corpo.recomendados.length).toBeGreaterThan(0);
      expect(
        corpo.recomendados.every((p) => p.regiao.nome === "Agreste - PE"),
      ).toBe(true);
      expect(
        corpo.recomendados.every((p) => p.motivo?.includes("mesma região")),
      ).toBe(true);
    });

    test("retorna lista vazia quando não há candidatos elegíveis para o critério (RF-11)", async () => {
      const resposta = await fetch(
        `${BACKEND_URL}/produtos/recomendacoes?categoria=CategoriaInexistente`,
      );

      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("x-recomendacao-fonte")).toBe("ia");

      const corpo = (await resposta.json()) as RespostaApiRecomendacoes;
      expect(corpo.recomendados).toEqual([]);
    });

    test("retorna lista vazia sem erro 500 para produto de referência inexistente", async () => {
      const resposta = await fetch(
        `${BACKEND_URL}/produtos/recomendacoes?produtoId=999999`,
      );

      expect(resposta.status).toBe(200);
      const corpo = (await resposta.json()) as RespostaApiRecomendacoes;
      expect(corpo.recomendados).toEqual([]);
    });
  },
);
