#ifndef AED_LISTA_ENCADEADA_HPP
#define AED_LISTA_ENCADEADA_HPP

#include <cstddef>
#include <functional>
#include <stdexcept>
#include <vector>

namespace aed {

template <typename T>
struct NoDuplo {
    T dado;
    NoDuplo<T>* anterior;
    NoDuplo<T>* proximo;

    explicit NoDuplo(const T& valor)
        : dado(valor), anterior(nullptr), proximo(nullptr) {}
};

template <typename T>
class ListaEncadeada {
public:
    using Comparador = std::function<bool(const T&, const T&)>;

    ListaEncadeada() : cabeca_(nullptr), cauda_(nullptr), tamanho_(0) {}

    ~ListaEncadeada() {
        limpar();
    }

    ListaEncadeada(const ListaEncadeada&) = delete;
    ListaEncadeada& operator=(const ListaEncadeada&) = delete;

    void adicionarNoInicio(const T& dado) {
        NoDuplo<T>* novo = new NoDuplo<T>(dado);
        if (cabeca_ == nullptr) {
            cabeca_ = novo;
            cauda_ = novo;
        } else {
            novo->proximo = cabeca_;
            cabeca_->anterior = novo;
            cabeca_ = novo;
        }
        ++tamanho_;
    }

    void adicionarNoFim(const T& dado) {
        NoDuplo<T>* novo = new NoDuplo<T>(dado);
        if (cauda_ == nullptr) {
            cabeca_ = novo;
            cauda_ = novo;
        } else {
            novo->anterior = cauda_;
            cauda_->proximo = novo;
            cauda_ = novo;
        }
        ++tamanho_;
    }

    void inserirOrdenado(const T& dado, Comparador comp) {
        if (cabeca_ == nullptr || comp(dado, cabeca_->dado)) {
            adicionarNoInicio(dado);
            return;
        }
        if (comp(cauda_->dado, dado)) {
            adicionarNoFim(dado);
            return;
        }
        NoDuplo<T>* atual = cabeca_->proximo;
        while (atual != nullptr) {
            if (comp(dado, atual->dado)) {
                NoDuplo<T>* novo = new NoDuplo<T>(dado);
                NoDuplo<T>* anterior = atual->anterior;
                novo->anterior = anterior;
                novo->proximo = atual;
                anterior->proximo = novo;
                atual->anterior = novo;
                ++tamanho_;
                return;
            }
            atual = atual->proximo;
        }
        adicionarNoFim(dado);
    }

    T removerDoInicio() {
        if (cabeca_ == nullptr) {
            throw std::out_of_range("ListaEncadeada vazia: removerDoInicio");
        }
        NoDuplo<T>* no = cabeca_;
        T dado = no->dado;
        removerNo(no);
        return dado;
    }

    T removerDoFim() {
        if (cauda_ == nullptr) {
            throw std::out_of_range("ListaEncadeada vazia: removerDoFim");
        }
        NoDuplo<T>* no = cauda_;
        T dado = no->dado;
        removerNo(no);
        return dado;
    }

    bool removerPorCriterio(std::function<bool(const T&)> criterio) {
        NoDuplo<T>* atual = cabeca_;
        while (atual != nullptr) {
            if (criterio(atual->dado)) {
                removerNo(atual);
                return true;
            }
            atual = atual->proximo;
        }
        return false;
    }

    bool modificarPorCriterio(std::function<bool(const T&)> criterio,
                              std::function<void(T&)> modificador) {
        NoDuplo<T>* atual = cabeca_;
        while (atual != nullptr) {
            if (criterio(atual->dado)) {
                modificador(atual->dado);
                return true;
            }
            atual = atual->proximo;
        }
        return false;
    }

    const T& obter(size_t indice) const {
        if (indice >= tamanho_) {
            throw std::out_of_range("ListaEncadeada: indice fora do intervalo");
        }
        NoDuplo<T>* atual;
        if (indice < tamanho_ / 2) {
            atual = cabeca_;
            for (size_t i = 0; i < indice; ++i) {
                atual = atual->proximo;
            }
        } else {
            atual = cauda_;
            for (size_t i = tamanho_ - 1; i > indice; --i) {
                atual = atual->anterior;
            }
        }
        return atual->dado;
    }

    std::vector<T> paraVetor() const {
        std::vector<T> resultado;
        resultado.reserve(tamanho_);
        NoDuplo<T>* atual = cabeca_;
        while (atual != nullptr) {
            resultado.push_back(atual->dado);
            atual = atual->proximo;
        }
        return resultado;
    }

    void limpar() {
        NoDuplo<T>* atual = cabeca_;
        while (atual != nullptr) {
            NoDuplo<T>* proximo = atual->proximo;
            delete atual;
            atual = proximo;
        }
        cabeca_ = nullptr;
        cauda_ = nullptr;
        tamanho_ = 0;
    }

    size_t tamanho() const {
        return tamanho_;
    }

    bool estaVazia() const {
        return tamanho_ == 0;
    }

private:
    NoDuplo<T>* cabeca_;
    NoDuplo<T>* cauda_;
    size_t tamanho_;

    void removerNo(NoDuplo<T>* no) {
        if (no->anterior != nullptr) {
            no->anterior->proximo = no->proximo;
        } else {
            cabeca_ = no->proximo;
        }
        if (no->proximo != nullptr) {
            no->proximo->anterior = no->anterior;
        } else {
            cauda_ = no->anterior;
        }
        delete no;
        --tamanho_;
    }
};

}  // namespace aed

#endif  // AED_LISTA_ENCADEADA_HPP
