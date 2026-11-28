"""Resumo do log de uso dos dados do módulo de IA.

Uso (dentro de modulo-ia/):
    python resumo_uso_dados.py
    python resumo_uso_dados.py --log logs/uso_dados.jsonl --catalogo data/catalogo_origem.json

Lê o arquivo .jsonl gerado por app/data_log.py e mostra:
- quantas vezes cada função de acesso foi chamada (e por quem);
- quantos erros e quais foram;
- quais produtos foram mais consultados e quais nunca foram;
- as requisições (eventos modulo_ia_execucao): quantas, quantas vazias,
  quantas sugestões e a latência, separadas das linhas de acesso aos dados.
Logs antigos, só com linhas de acesso, continuam funcionando.
"""

import argparse
import json
import os
from collections import Counter, defaultdict
from pathlib import Path


RAIZ = Path(__file__).resolve().parent
LOG_PADRAO = Path(os.getenv("LOG_USO_DADOS", RAIZ / "logs" / "uso_dados.jsonl"))
CATALOGO_PADRAO = Path(
    os.getenv("CATALOGO_IA", RAIZ / "data" / "catalogo_origem.json")
)

# Funções que consultam produtos específicos. As que listam o catálogo
# inteiro (get_catalog_items, get_repository_available_products) não
# entram na contagem por produto, senão todo produto pareceria "consultado".
CONSULTA_POR_PRODUTO = {
    "get_repository_product",
    "get_repository_products_by_ids",
    "get_repository_filtered_products",
}


def ler_log(caminho):
    linhas = []
    invalidas = 0
    with caminho.open("r", encoding="utf-8") as arquivo:
        for texto in arquivo:
            texto = texto.strip()
            if not texto:
                continue
            try:
                linhas.append(json.loads(texto))
            except json.JSONDecodeError:
                invalidas += 1
    return linhas, invalidas


def e_execucao(linha):
    """Evento de execução de rota (não é uma linha de acesso aos dados)."""
    return linha.get("evento") == "modulo_ia_execucao"


def estatisticas(valores):
    """Média, p95 (posição mais próxima) e máximo, em ms."""
    valores = sorted(v for v in valores if isinstance(v, (int, float)))
    if not valores:
        return None
    posicao = max(0, -(-95 * len(valores) // 100) - 1)
    return {
        "amostras": len(valores),
        "media": round(sum(valores) / len(valores), 2),
        "p95": valores[posicao],
        "max": valores[-1],
    }


def resumir_execucoes(linhas):
    """Resume as requisições e a latência das consultas de acesso."""
    eventos = [linha for linha in linhas if e_execucao(linha)]
    acessos = [linha for linha in linhas if not e_execucao(linha)]

    por_rota = defaultdict(Counter)
    resultados = Counter()
    for evento in eventos:
        rota = evento.get("rota", "?")
        por_rota[rota]["requisicoes"] += 1
        por_rota[rota][evento.get("status", "?")] += 1
        resultado = evento.get("resultado")
        if resultado is None and evento.get("status") == "sucesso":
            resultado = "?"
        resultados[resultado or evento.get("status", "?")] += 1
        sugestoes = evento.get("total_sugestoes")
        if isinstance(sugestoes, int):
            por_rota[rota]["sugestoes"] += sugestoes

    return {
        "requisicoes": len(eventos),
        "sucesso": sum(1 for e in eventos if e.get("status") == "sucesso"),
        "erro": sum(1 for e in eventos if e.get("status") == "erro"),
        "vazias": resultados["vazio"],
        "sugestoes": sum(c["sugestoes"] for c in por_rota.values()),
        "por_rota": por_rota,
        "latencia_ms": estatisticas(e.get("elapsed_ms") for e in eventos),
        "latencia_consultas_ms": estatisticas(a.get("duracao_ms") for a in acessos),
    }


def ids_do_catalogo(caminho):
    with caminho.open("r", encoding="utf-8") as arquivo:
        return [item["product_id"] for item in json.load(arquivo)]


def ids_inexistentes(linha):
    erro = linha.get("erro") or ""
    if "nao encontrado" not in erro:
        return []
    lista = erro.split(":", 1)[1]
    return [pid.strip() for pid in lista.split(",") if pid.strip()]


def resumir(linhas, catalogo_ids):
    por_funcao = defaultdict(Counter)
    por_chamador = Counter()
    erros = Counter()
    consultas = Counter()
    pedidos_inexistentes = Counter()

    for linha in linhas:
        if e_execucao(linha):
            continue
        funcao = linha.get("funcao", "?")
        status = linha.get("status", "?")
        por_funcao[funcao]["total"] += 1
        por_funcao[funcao][status] += 1
        por_chamador[linha.get("chamador", "?")] += 1

        if status == "erro":
            erros[f"{funcao}: {linha.get('erro', 'sem detalhe')}"] += 1

        if funcao in CONSULTA_POR_PRODUTO:
            consultas.update(linha.get("ids") or [])

        for pid in ids_inexistentes(linha):
            pedidos_inexistentes[pid] += 1

    nunca = [pid for pid in catalogo_ids if pid not in consultas]

    return {
        "por_funcao": por_funcao,
        "por_chamador": por_chamador,
        "erros": erros,
        "consultas": consultas,
        "nunca": nunca,
        "inexistentes": pedidos_inexistentes,
        "execucoes": resumir_execucoes(linhas),
    }


def _linha_latencia(titulo, dados):
    if dados is None:
        return f"  {titulo}: sem medições"
    return (
        f"  {titulo}: média {dados['media']} ms | p95 {dados['p95']} ms "
        f"| máx {dados['max']} ms ({dados['amostras']} medições)"
    )


def imprimir_execucoes(execucoes):
    print("\nRequisições (eventos de execução)")
    if not execucoes["requisicoes"]:
        print("  (nenhum evento de execução; logs antigos só têm acessos a dados)")
    else:
        print(
            f"  total {execucoes['requisicoes']} | sucesso {execucoes['sucesso']} "
            f"| erro {execucoes['erro']} | vazias (0 sugestões) {execucoes['vazias']} "
            f"| sugestões retornadas {execucoes['sugestoes']}"
        )
        for rota, c in sorted(execucoes["por_rota"].items()):
            print(
                f"  {rota:<28} requisições {c['requisicoes']:>3} "
                f"erro {c['erro']:>3} sugestões {c['sugestoes']:>4}"
            )
        print(_linha_latencia("latência das requisições", execucoes["latencia_ms"]))
    print(_linha_latencia("latência das consultas", execucoes["latencia_consultas_ms"]))


def imprimir(resumo, linhas, invalidas, caminho_log):
    print(f"Log: {caminho_log}")
    print(f"Linhas lidas: {len(linhas)}" + (f" (ignoradas {invalidas} inválidas)" if invalidas else ""))
    eventos = resumo["execucoes"]["requisicoes"]
    print(f"  acessos a dados: {len(linhas) - eventos} | eventos de requisição: {eventos}")
    if linhas:
        print(f"Período: {linhas[0].get('data_hora')} até {linhas[-1].get('data_hora')}")

    imprimir_execucoes(resumo["execucoes"])

    print("\nChamadas por função (acessos a dados, não requisições)")
    print(f"  {'função':<36}{'total':>6}{'sucesso':>9}{'vazio':>7}{'erro':>6}")
    for funcao, c in sorted(resumo["por_funcao"].items(), key=lambda kv: -kv[1]["total"]):
        print(f"  {funcao:<36}{c['total']:>6}{c['sucesso']:>9}{c['vazio']:>7}{c['erro']:>6}")

    print("\nChamadas por quem chamou")
    for nome, total in resumo["por_chamador"].most_common():
        print(f"  {nome:<36}{total:>6}")

    total_erros = sum(resumo["erros"].values())
    print(f"\nErros: {total_erros}")
    for motivo, total in resumo["erros"].most_common():
        print(f"  {total}x {motivo}")

    print("\nProdutos mais consultados")
    if resumo["consultas"]:
        for pid, total in resumo["consultas"].most_common(5):
            print(f"  {pid:<12}{total:>4}")
    else:
        print("  (nenhum)")

    print(f"\nProdutos do catálogo nunca consultados ({len(resumo['nunca'])})")
    print("  " + (", ".join(resumo["nunca"]) if resumo["nunca"] else "(nenhum)"))

    if resumo["inexistentes"]:
        print("\nIdentificadores pedidos que não existem no catálogo")
        for pid, total in resumo["inexistentes"].most_common():
            print(f"  {pid:<12}{total:>4}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--log", type=Path, default=LOG_PADRAO)
    parser.add_argument("--catalogo", type=Path, default=CATALOGO_PADRAO)
    args = parser.parse_args()

    if not args.log.exists():
        print(f"Log não encontrado: {args.log}")
        print("Chame o módulo pelo menos uma vez (veja o README) e rode de novo.")
        return 1

    linhas, invalidas = ler_log(args.log)
    resumo = resumir(linhas, ids_do_catalogo(args.catalogo))
    imprimir(resumo, linhas, invalidas, args.log)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
