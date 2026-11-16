# Revisão de Code Smell: Long Function

**Responsável:** João Pedro do Monte Souza

**Módulo:** Frontend (Next.js + React + TypeScript)

**Arquivo analisado:** `frontend/src/components/conta/FormularioCadastro.tsx`

**Função analisada:** `enviar()`, dentro do componente `FormularioCadastro`

## 1. Code Smell identificado

O Code Smell identificado foi **Long Function** (função longa) com **baixa coesão**.

A função `enviar()` roda quando a pessoa clica em "Criar minha conta". Ela ocupava 43 linhas e fazia cinco coisas: validava os campos, montava os dados, chamava a API, avisava o usuário e tratava o erro.

O ponto mais crítico era a validação. As regras do cadastro estavam em três lugares diferentes:

1. `frontend/src/lib/validacao.ts`: nome, e-mail e senha.
2. Uma função `validarConvite()` solta no topo do arquivo da tela.
3. Condições escritas direto dentro de `enviar()`: técnica, região e termos.

```ts
const novos: Erros = {
  nome: validarNome(nome),
  email: validarEmail(email),
  senha: validarSenhaNova(senha),
  tecnica: artesao && !tecnica ? "Escolha sua técnica principal." : undefined,
  regiao: artesao && !regiao ? "Escolha a região onde você produz." : undefined,
  convite: administrador ? validarConvite(convite) : undefined,
  termos: termos ? undefined : "Aceite os termos para criar a conta.",
};
```

### Impactos na qualidade

- **Coesão:** o componente cuidava da aparência da tela e também guardava regra de negócio (quem precisa de técnica, quem precisa de convite).
- **Manutenibilidade:** para mudar uma regra do cadastro era preciso abrir o arquivo da tela e achar a regra no meio do código de interface.
- **Legibilidade:** quem lia `enviar()` precisava entender as regras de cada perfil antes de chegar na parte que envia os dados.
- **Testabilidade:** as regras de técnica, região, convite e termos não tinham teste. Como moravam dentro do componente, só dava para conferir abrindo a tela.
- **Extensibilidade:** um perfil novo ou uma regra nova aumentaria ainda mais a função.

## 2. Análise crítica e decisão

A decisão foi **REFATORAR**.

Não refatorar também foi avaliado. O argumento a favor: a função tem 43 linhas, funciona e só existe um formulário de cadastro. Pesou mais o fato de que essas regras decidem quem consegue criar conta (inclusive a de administrador) e não tinham teste nenhum. O custo era baixo e a mudança cabia em um commit pequeno.

### Técnica aplicada: Extract Function (Extrair Função)

As regras saíram da tela e foram para uma função pura, `validarCadastro()`, em `frontend/src/lib/validacao.ts`. Função pura é a que recebe dados e devolve um resultado, sem depender de tela nem de API. A `validarConvite()` foi movida para o mesmo arquivo.

**Depois**, em `enviar()`:

```ts
const novos = validarCadastro({
  papel, nome, email, senha, tecnica, regiao, convite, termos,
});
```

E em `lib/validacao.ts`:

```ts
export function validarCadastro(dados: DadosCadastro): ErrosCadastro {
  const artesao = dados.papel === "ARTESAO";
  const administrador = dados.papel === "ADMINISTRADOR";

  return {
    nome: validarNome(dados.nome),
    email: validarEmail(dados.email),
    senha: validarSenhaNova(dados.senha),
    tecnica: artesao && !dados.tecnica ? "Escolha sua técnica principal." : undefined,
    regiao: artesao && !dados.regiao ? "Escolha a região onde você produz." : undefined,
    convite: administrador ? validarConvite(dados.convite) : undefined,
    termos: dados.termos ? undefined : "Aceite os termos para criar a conta.",
  };
}
```

As condições e as mensagens são as mesmas de antes. Só mudaram de lugar.

## 3. Validação do comportamento

- **Testes escritos antes da função existir** (ciclo do `docs/TDD.md`): 11 testes novos em `frontend/tests/unit/validacao.test.ts`. Rodados antes da implementação, os 11 falharam. Depois da implementação, passaram.
- **Arquivo de validação:** 53 testes aprovados, 0 falhas (42 que já existiam + 11 novos).
- **Suíte unitária inteira do frontend:** 151 aprovados e 14 falhas. As 14 falhas estão todas em `painel-artesao.test.ts`, que precisa do backend ligado na porta 4000. Elas já falhavam antes da mudança (140 aprovados e 14 falhas) e não têm relação com o cadastro.
- **Tela `/cadastro`, antes e depois:** o formulário foi enviado vazio como Comprador, Artesão e Administrador. As mensagens de erro foram idênticas nos três perfis.
- **`npm run lint`:** sem problemas. **`npm run build`:** concluído sem erro.

## 4. Resultados, benefícios e riscos

**Benefícios esperados**

- As regras do cadastro ficam em um lugar só.
- Regras que não tinham teste agora têm 11.
- `enviar()` ficou mais curta e a tela deixou de conhecer as regras de cada perfil.

**Riscos e limitações**

- O formulário renderizado não tem teste automatizado de clique. O projeto não usa biblioteca para isso, então a conferência da tela foi manual.
- O caminho de sucesso (conta criada de verdade) não foi exercitado, porque depende do backend ligado. O código desse trecho não foi alterado.

## 5. Outros smells observados no mesmo arquivo (não tratados nesta intervenção)

- `enviar()` ainda monta os dados enviados e decide a mensagem de sucesso por perfil.
- As condições por perfil (`artesao`, `administrador`) se repetem na montagem dos dados e no JSX.
- O esqueleto de envio (`setEnviando`, `try`, `catch`, `setFalha`) se repete em `FormularioLogin.tsx` e `FormularioRecuperacao.tsx`.

Ficaram de fora de propósito. Mexer neles aumentaria o commit e o risco, sem teste automatizado da tela para proteger.
