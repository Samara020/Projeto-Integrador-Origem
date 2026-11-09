# Testes automatizados do Origem

## O que instalar

Para executar todas as suítes principais no Windows:

- Node.js 24 e npm (mesma versão principal de Node usada pela CI).
- Python 3.13 (com o launcher `py`) para BentoML e pytest.
- Docker Desktop aberto, com containers Linux, para PostgreSQL 17 isolado.
- Chrome para o padrão de Cypress; alternativamente use o Electron incluído no Cypress (`$env:E2E_BROWSER="electron"`).
- SDK .NET 10 somente para a demonstração C# de concorrência, separada das suítes principais.

Execute na raiz do repositório, em PowerShell, um comando por vez:

```powershell
cd C:\integrador\Projeto-Integrador-Origem
npm.cmd ci --prefix frontend
npm.cmd ci --prefix backend/app
npm.cmd --prefix backend/app run prisma:generate
npm.cmd ci --prefix e2e
Push-Location e2e
npx.cmd cypress install
npx.cmd cypress verify
Pop-Location
py -3.13 -m venv modulo-ia\.venv
.\modulo-ia\.venv\Scripts\python.exe -m pip install -r modulo-ia\requirements.txt
```

Jest, Supertest, Prisma, jest-junit e Cypress são instalados pelos manifests. Não é
necessário instalar essas bibliotecas globalmente. Não é necessário ativar a venv.
Se a versão de npm exigir aprovação de scripts de instalação, revise os pacotes
indicados no próprio log; não desabilite globalmente essa proteção.

## Banco exclusivo para testes

O Compose abaixo é separado do banco de desenvolvimento, usa porta **5434** e
credenciais públicas exclusivas de teste. Não exige o `.env` da raiz.

```powershell
docker compose -f compose.testes.yaml up -d --wait
$env:DATABASE_URL_TEST="postgresql://origem_test:teste_local@localhost:5434/origem_teste"
npm.cmd --prefix backend/app run test:db
```

`test:db` aplica migrações no banco existente. Não usa `db push`, não reseta o
banco e não importa seeds de desenvolvimento. Os testes limpam as tabelas antes
de cada cenário: o banco deve ser exclusivo e descartável. A configuração exige
nome terminado em `_teste` ou `_test` e recusa o mesmo banco de `DATABASE_URL`.
Para um PostgreSQL já instalado, crie um banco com esse sufixo e ajuste a URL.

## Executar por camada

| Comando na raiz | Dependências/serviços |
| --- | --- |
| `npm.cmd --prefix frontend run test:unit -- --runInBand` | Somente dependências do frontend; sem servidor |
| `npm.cmd run test:unit` | Frontend + Python/IA; não inicia servidor BentoML |
| `npm.cmd run test:backend` | Dependências do backend, Prisma gerado, PostgreSQL e `DATABASE_URL_TEST`; não exige servidor Node separado |
| `npm.cmd run test:api` | Backend/banco + frontend em 3000 + IA em 3001 |
| `npm.cmd run test:e2e` | Cypress + frontend em 3000 (e IA se configurada no frontend) |
| `npm.cmd run test:all` | Todos os requisitos das linhas anteriores |

O Supertest cria a aplicação Express durante os testes. Não use a API de produção
ou um servidor compartilhado ligado ao mesmo banco de testes.

## Subir serviços para API e E2E

**Terminal 1, na raiz:**

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
$env:CATALOGO_IA="$PWD\modulo-ia\data\catalogo_origem.json"
.\modulo-ia\.venv\Scripts\python.exe -m bentoml serve app.service:RecommendationService --host 127.0.0.1 --port 3001
```

**Terminal 2, na raiz:**

```powershell
$env:NEXT_PUBLIC_API_URL="/api"
$env:RECOMENDACAO_API_URL="http://localhost:3001"
$env:RECOMENDACAO_API_KEY="origem-mockup-key"
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend start
```

O Cypress existente usa os dados da Fake API, por isso `/api` deve estar definido
também durante o build. A suíte de backend verifica separadamente a API real e
o banco; não há ainda E2E do navegador inteiro contra o backend Node.

**Terminal 3, na raiz:**

```powershell
$env:DATABASE_URL_TEST="postgresql://origem_test:teste_local@localhost:5434/origem_teste"
$env:IA_BASE_URL="http://localhost:3001"
$env:RECOMENDACAO_API_URL="http://localhost:3001"
npm.cmd run test:all
```

Com `IA_BASE_URL`, pytest reutiliza o BentoML externo e verifica `/readyz`.
Sem essa variável, somente os testes HTTP de pytest iniciam/encerram um serviço
local na porta 3001; os unitários de IA não precisam dele. Não deixe outro serviço
nessa porta quando optar pelo servidor gerenciado pelo pytest.

Para validar compilação e lint:

```powershell
npm.cmd --prefix backend/app run build
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Relatórios JUnit ficam em `relatorios/`, incluindo `api-backend.xml`. Cypress
guarda capturas/vídeos de falhas e registra os avisos de hidratação já tolerados
pelo suporte da suíte. `test:all` executa todas as camadas mesmo se uma falhar e
retorna código diferente de zero se qualquer suíte falhar.

Se o Electron falhar com `bad option: --smoke-test` e existir a variável
`ELECTRON_RUN_AS_NODE`, abra um terminal normal ou remova-a somente dessa sessão:
`$env:ELECTRON_RUN_AS_NODE=$null`. Em seguida execute novamente o Cypress.

Para encerrar somente o PostgreSQL de testes:

```powershell
docker compose -f compose.testes.yaml down
```

## Demonstração C# opcional

Com SDK .NET 10, em um terminal:

```powershell
dotnet run --project backend/backend/Origem.Concorrencia --urls http://localhost:5000
```

Em outro, execute `./backend/testar-demo.ps1`. O script exige estoque inicial 1;
reinicie a demonstração antes de repetir. Ele verifica disputa concorrente,
idempotência da tentativa e processamento de fila. Não integra `test:all` nem
substitui os testes transacionais do backend Node.

## Escopo e limites

- Casos críticos usam asserções HTTP e consultas ao banco, inclusive duas
  requisições concorrentes e falha injetada no histórico para provar rollback.
- Reserva é descontada no checkout e devolvida por cancelamento de pedido não
  pago. Não há expiração automática de reserva, gateway real nem estorno.
- Pedidos antigos sem registro de reserva no histórico não podem ser pagos por
  este fluxo (409; refazer checkout). Cancelá-los não incrementa estoque que nunca
  foi reservado. Pedidos já pagos continuam sendo reconhecidos nas repetições.
- Dados de validação de origem continuam em memória conforme a arquitetura atual.
- Pedidos com várias lojas não podem ter o status global alterado por uma única
  loja. Logística por loja exige evolução do modelo.
- A CI executa testes com PostgreSQL e só constrói imagens após regressão verde.
  A integração Git da Vercel continua independente; seu bloqueio de publicação
  exige configuração na plataforma. Não foi alterada pela implementação local.
- A suíte não define uma porcentagem mínima de cobertura de código.

## Validação desta implementação (09/11/2026)

- Frontend: 138 testes unitários passaram em 8 arquivos.
- API do frontend e integração com IA: 66 testes passaram em 6 arquivos, com
  BentoML conectado e fonte de recomendação `ia`. Execução:
  `npm.cmd --prefix frontend run test:api -- --runInBand`, com `IA_BASE_URL` e
  `RECOMENDACAO_API_URL` apontando para o serviço local em 3001.
- IA com Python 3.14.7: 18 testes de lógica/desempenho e 7 testes HTTP passaram.
  `pip check` não encontrou dependências inconsistentes. Houve avisos de
  descontinuação nas dependências, sem falhas nos testes. CI e Docker mantêm 3.13.
- Cypress/Electron: 31 testes passaram em 4 arquivos, sem falhas ou casos
  ignorados, incluindo os dois cenários reativados. Nesta execução foi necessário
  remover `ELECTRON_RUN_AS_NODE` somente do processo e autorizar o navegador.
- Build do frontend, lint e build do backend passaram. Os novos testes do backend
  também passaram pela verificação TypeScript; isso não comprova sua execução.
- Os 20 novos testes de backend, além dos 18 existentes, dependem da execução com
  PostgreSQL. Docker/PostgreSQL não foram encontrados neste ambiente;
  a suíte de backend ficou pendente de execução. Os resultados acima não
  comprovam ausência de regressões no fluxo transacional do backend real.
- Workflows e Compose passaram pela leitura YAML e `git diff --check` não apontou
  erros. A configuração da CI não foi executada no GitHub nesta sessão.
