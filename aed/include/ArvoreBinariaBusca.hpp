#ifndef ORIGEM_AED_ARVORE_BINARIA_BUSCA_HPP
#define ORIGEM_AED_ARVORE_BINARIA_BUSCA_HPP

#include <vector>
#include <functional>

template <typename T, typename Comparador = std::less<T>>
class ArvoreBinariaBusca {
public:
    struct No {
        T dado;
        No* esquerda;
        No* direita;
        explicit No(const T& d) : dado(d), esquerda(nullptr), direita(nullptr) {}
    };

    ArvoreBinariaBusca() = default;
    ~ArvoreBinariaBusca() { limpar(); }

    ArvoreBinariaBusca(const ArvoreBinariaBusca&) = delete;
    ArvoreBinariaBusca& operator=(const ArvoreBinariaBusca&) = delete;
    ArvoreBinariaBusca(ArvoreBinariaBusca&&) = delete;
    ArvoreBinariaBusca& operator=(ArvoreBinariaBusca&&) = delete;

    void inserir(const T& dado) {
        bool inserido = false;
        raiz = inserirRec(raiz, dado, inserido);
        if (inserido) {
            _tamanho++;
        }
    }

    bool buscar(const T& chave, T& saida) const {
        No* atual = raiz;
        while (atual != nullptr) {
            if (!comp(atual->dado, chave) && !comp(chave, atual->dado)) {
                saida = atual->dado;
                return true;
            }
            if (comp(chave, atual->dado)) {
                atual = atual->esquerda;
            } else {
                atual = atual->direita;
            }
        }
        return false;
    }

    template <typename Criterio, typename ComparadorChave>
    bool buscar(const Criterio& crit, T& saida, ComparadorChave compChave) const {
        No* atual = raiz;
        while (atual != nullptr) {
            int c = compChave(atual->dado, crit);
            if (c == 0) {
                saida = atual->dado;
                return true;
            }
            if (c > 0) {
                atual = atual->esquerda;
            } else {
                atual = atual->direita;
            }
        }
        return false;
    }

    bool remover(const T& dado) {
        bool removido = removerRec(raiz, dado);
        if (removido) {
            _tamanho--;
        }
        return removido;
    }

    std::vector<T> emOrdem() const {
        std::vector<T> resultado;
        resultado.reserve(_tamanho);
        emOrdemRec(raiz, resultado);
        return resultado;
    }

    std::vector<T> preOrdem() const {
        std::vector<T> resultado;
        resultado.reserve(_tamanho);
        preOrdemRec(raiz, resultado);
        return resultado;
    }

    std::vector<T> posOrdem() const {
        std::vector<T> resultado;
        resultado.reserve(_tamanho);
        posOrdemRec(raiz, resultado);
        return resultado;
    }

    bool minimo(T& saida) const {
        No* n = minNo(raiz);
        if (n == nullptr) return false;
        saida = n->dado;
        return true;
    }

    bool maximo(T& saida) const {
        No* n = maxNo(raiz);
        if (n == nullptr) return false;
        saida = n->dado;
        return true;
    }

    int altura() const { return alturaRec(raiz); }

    std::size_t tamanho() const { return _tamanho; }

    bool estaVazia() const { return _tamanho == 0; }

    void limpar() {
        destruir(raiz);
        raiz = nullptr;
        _tamanho = 0;
    }

private:
    No* raiz = nullptr;
    std::size_t _tamanho = 0;
    Comparador comp;

    No* inserirRec(No* no, const T& dado, bool& inserido) {
        if (no == nullptr) {
            inserido = true;
            return new No(dado);
        }
        if (comp(dado, no->dado)) {
            no->esquerda = inserirRec(no->esquerda, dado, inserido);
        } else if (comp(no->dado, dado)) {
            no->direita = inserirRec(no->direita, dado, inserido);
        } else {
            inserido = false;
        }
        return no;
    }

    bool removerRec(No*& no, const T& dado) {
        if (no == nullptr) return false;
        if (comp(dado, no->dado)) {
            return removerRec(no->esquerda, dado);
        }
        if (comp(no->dado, dado)) {
            return removerRec(no->direita, dado);
        }
        // No a remover encontrado.
        if (no->esquerda == nullptr) {
            No* tmp = no->direita;
            delete no;
            no = tmp;
            return true;
        }
        if (no->direita == nullptr) {
            No* tmp = no->esquerda;
            delete no;
            no = tmp;
            return true;
        }
        // Dois filhos: sucessor in-order (minimo da subarvore direita).
        No* sucessor = minNo(no->direita);
        no->dado = sucessor->dado;
        return removerRec(no->direita, sucessor->dado);
    }

    static void destruir(No* no) {
        if (no == nullptr) return;
        destruir(no->esquerda);
        destruir(no->direita);
        delete no;
    }

    static No* minNo(No* no) {
        while (no != nullptr && no->esquerda != nullptr) {
            no = no->esquerda;
        }
        return no;
    }

    static No* maxNo(No* no) {
        while (no != nullptr && no->direita != nullptr) {
            no = no->direita;
        }
        return no;
    }

    int alturaRec(No* no) const {
        if (no == nullptr) return 0;
        int he = alturaRec(no->esquerda);
        int hd = alturaRec(no->direita);
        return 1 + (he > hd ? he : hd);
    }

    void emOrdemRec(No* no, std::vector<T>& resultado) const {
        if (no == nullptr) return;
        emOrdemRec(no->esquerda, resultado);
        resultado.push_back(no->dado);
        emOrdemRec(no->direita, resultado);
    }

    void preOrdemRec(No* no, std::vector<T>& resultado) const {
        if (no == nullptr) return;
        resultado.push_back(no->dado);
        preOrdemRec(no->esquerda, resultado);
        preOrdemRec(no->direita, resultado);
    }

    void posOrdemRec(No* no, std::vector<T>& resultado) const {
        if (no == nullptr) return;
        posOrdemRec(no->esquerda, resultado);
        posOrdemRec(no->direita, resultado);
        resultado.push_back(no->dado);
    }
};

#endif // ORIGEM_AED_ARVORE_BINARIA_BUSCA_HPP
