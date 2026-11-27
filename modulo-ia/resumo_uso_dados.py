"""Resumo do log de uso dos dados do módulo de IA.

Uso (dentro de modulo-ia/):
    python resumo_uso_dados.py
    python resumo_uso_dados.py --log logs/uso_dados.jsonl --catalogo data/catalogo_origem.json

Lê o arquivo .jsonl gerado por app/data_log.py e mostra:
- quantas vezes cada função de acesso foi chamada (e por quem);
- quantos erros e quais foram;
- quais produtos foram mais consultados e quais nunca foram.
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
    }


def imprimir(resumo, linhas, invalidas, caminho_log):
    print(f"Log: {caminho_log}")
    print(f"Linhas lidas: {len(linhas)}" + (f" (ignoradas {invalidas} inválidas)" if invalidas else ""))
    if linhas:
        print(f"Período: {linhas[0].get('data_hora')} até {linhas[-1].get('data_hora')}")

    print("\nChamadas por função")
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
