#ifndef ORIGEM_AED_BUSCA_BINARIA_HPP
#define ORIGEM_AED_BUSCA_BINARIA_HPP

#include <vector>
#include <cstddef>

template <typename T, typename K = T>
struct ComparadorTresVias {
    int operator()(const T& a, const K& b) const {
        if (a < b) return -1;
        if (b < a) return 1;
        return 0;
    }
};

template <typename T, typename K = T>
struct ResultadoBusca {
    int index;
    bool encontrado;
    int comparacoes;
};

namespace detalhe {

template <typename T, typename K, typename Comparador>
ResultadoBusca<T, K> buscaBinariaRecursivaImpl(
    const std::vector<T>& array,
    const K& chave,
    Comparador comp,
    int esquerda,
    int direita,
    int comparacoes) {
    if (esquerda > direita) {
        return ResultadoBusca<T, K>{-1, false, comparacoes};
    }
    int meio = esquerda + (direita - esquerda) / 2;
    int c = comp(array[meio], chave);
    comparacoes++;
    if (c == 0) {
        return ResultadoBusca<T, K>{meio, true, comparacoes};
    }
    if (c < 0) {
        return buscaBinariaRecursivaImpl(array, chave, comp, meio + 1, direita, comparacoes);
    }
    return buscaBinariaRecursivaImpl(array, chave, comp, esquerda, meio - 1, comparacoes);
}

} // namespace detalhe

template <typename T, typename K = T, typename Comparador = ComparadorTresVias<T, K>>
ResultadoBusca<T, K> buscaBinaria(
    const std::vector<T>& array,
    const K& chave,
    Comparador comp = Comparador()) {
    int esquerda = 0;
    int direita = static_cast<int>(array.size()) - 1;
    int comparacoes = 0;
    while (esquerda <= direita) {
        int meio = esquerda + (direita - esquerda) / 2;
        int c = comp(array[meio], chave);
        comparacoes++;
        if (c == 0) {
            return ResultadoBusca<T, K>{meio, true, comparacoes};
        }
        if (c < 0) {
            esquerda = meio + 1;
        } else {
            direita = meio - 1;
        }
    }
    return ResultadoBusca<T, K>{-1, false, comparacoes};
}

template <typename T, typename K = T, typename Comparador = ComparadorTresVias<T, K>>
ResultadoBusca<T, K> buscaBinariaRecursiva(
    const std::vector<T>& array,
    const K& chave,
    Comparador comp = Comparador()) {
    return detalhe::buscaBinariaRecursivaImpl(
        array, chave, comp, 0, static_cast<int>(array.size()) - 1, 0);
}

#endif // ORIGEM_AED_BUSCA_BINARIA_HPP
