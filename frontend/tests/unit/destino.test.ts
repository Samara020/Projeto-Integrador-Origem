// TC01 e TC08: depois de entrar, cada papel cai na própria área e um ?volta= para
// área de outro papel ou para fora do site é ignorado (lib/destino.ts).
import { destinoAposEntrar, voltaDaUrl } from "@/lib/destino";

describe("TC01 · destino depois do login, por papel", () => {
  test.each([
    ["COMPRADOR", "/"],
    ["ARTESAO", "/painel/artesao"],
    ["ADMINISTRADOR", "/painel/admin"],
  ] as const)("%s sem ?volta= vai para %s", (papel, esperado) => {
    expect(destinoAposEntrar(papel, null)).toBe(esperado);
  });

  test("?volta= interno e livre é respeitado", () => {
    expect(destinoAposEntrar("COMPRADOR", "/carrinho")).toBe("/carrinho");
  });

  test("?volta= para a área do próprio papel é respeitado", () => {
    expect(destinoAposEntrar("ADMINISTRADOR", "/painel/admin")).toBe("/painel/admin");
    expect(destinoAposEntrar("ARTESAO", "/painel/artesao/estoque")).toBe(
      "/painel/artesao/estoque",
    );
  });
});

describe("TC08 · ?volta= não abre área de outro papel nem site externo", () => {
  test.each([
    ["COMPRADOR", "/painel/admin", "/"],
    ["COMPRADOR", "/painel/artesao/pecas/nova", "/"],
    ["ARTESAO", "/painel/admin", "/painel/artesao"],
    ["ADMINISTRADOR", "/painel/artesao", "/painel/admin"],
  ] as const)("%s com ?volta=%s cai em %s", (papel, volta, esperado) => {
    expect(destinoAposEntrar(papel, volta)).toBe(esperado);
  });

  test.each(["//golpe.example", "/\\golpe.example", "https://golpe.example", "carrinho", ""])(
    "volta externa ou inválida %j é ignorada",
    (volta) => {
      expect(destinoAposEntrar("COMPRADOR", volta)).toBe("/");
    },
  );
});

describe("voltaDaUrl", () => {
  test("lê o ?volta= da barra de endereço", () => {
    window.history.pushState({}, "", "/entrar?volta=%2Fcheckout");
    expect(voltaDaUrl()).toBe("/checkout");
  });

  test("sem ?volta= devolve null", () => {
    window.history.pushState({}, "", "/entrar");
    expect(voltaDaUrl()).toBeNull();
  });
});
