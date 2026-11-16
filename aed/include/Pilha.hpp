#ifndef AED_PILHA_HPP
#define AED_PILHA_HPP

#include <cstddef>
#include <stdexcept>
#include <vector>

namespace aed {

template <typename T>
struct NoPilha {
    T item;
    NoPilha<T>* proximo;

    explicit NoPilha(const T& valor)
        : item(valor), proximo(nullptr) {}
};

template <typename T>
class Pilha {
public:
    Pilha() : topo_(nullptr), tamanho_(0) {}

    ~Pilha() {
        while (topo_ != nullptr) {
            NoPilha<T>* prox = topo_->proximo;
            delete topo_;
            topo_ = prox;
        }
        tamanho_ = 0;
    }

    Pilha(const Pilha&) = delete;
    Pilha& operator=(const Pilha&) = delete;

    void empilhar(const T& item) {
        NoPilha<T>* novo = new NoPilha<T>(item);
        novo->proximo = topo_;
        topo_ = novo;
        ++tamanho_;
    }

    T desempilhar() {
        if (topo_ == nullptr) {
            throw std::out_of_range("Pilha vazia: desempilhar");
        }
        NoPilha<T>* no = topo_;
        T item = no->item;
        topo_ = no->proximo;
        delete no;
        --tamanho_;
        return item;
    }

    const T& topo() const {
        if (topo_ == nullptr) {
            throw std::out_of_range("Pilha vazia: topo");
        }
        return topo_->item;
    }

    bool estaVazia() const {
        return tamanho_ == 0;
    }

    size_t tamanho() const {
        return tamanho_;
    }

    std::vector<T> paraVetor() const {
        std::vector<T> resultado;
        resultado.reserve(tamanho_);
        NoPilha<T>* atual = topo_;
        while (atual != nullptr) {
            resultado.push_back(atual->item);
            atual = atual->proximo;
        }
        return resultado;
    }

private:
    NoPilha<T>* topo_;
    size_t tamanho_;
};

}  // namespace aed

#endif  // AED_PILHA_HPP
