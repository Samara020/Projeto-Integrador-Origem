// DEMONSTRAÇÃO: teste quebrado de propósito para provar que o Quality Gate bloqueia o merge.
// Este arquivo não deve entrar na main. O PR que o traz é fechado sem mesclar.
describe("demonstração do quality gate", () => {
  it("falha de propósito", () => {
    expect(1 + 1).toBe(3);
  });
});
