#ifndef AED_FILA_HPP
#define AED_FILA_HPP

#include <cstddef>
#include <stdexcept>
#include <vector>

namespace aed {

template <typename T>
struct NoFila {
    T item;
    NoFila<T>* proximo;

    explicit NoFila(const T& valor)
        : item(valor), proximo(nullptr) {}
};

template <typename T>
class Fila {
public:
    Fila() : frente_(nullptr), tras_(nullptr), tamanho_(0) {}

    ~Fila() {
        while (frente_ != nullptr) {
            NoFila<T>* prox = frente_->proximo;
            delete frente_;
            frente_ = prox;
        }
        tras_ = nullptr;
        tamanho_ = 0;
    }

    Fila(const Fila&) = delete;
    Fila& operator=(const Fila&) = delete;

    void enfileirar(const T& item) {
        NoFila<T>* novo = new NoFila<T>(item);
        if (tras_ != nullptr) {
            tras_->proximo = novo;
        } else {
            frente_ = novo;
        }
        tras_ = novo;
        ++tamanho_;
    }

    T desenfileirar() {
        if (frente_ == nullptr) {
            throw std::out_of_range("Fila vazia: desenfileirar");
        }
        NoFila<T>* no = frente_;
        T item = no->item;
        frente_ = no->proximo;
        if (frente_ == nullptr) {
            tras_ = nullptr;
        }
        delete no;
        --tamanho_;
        return item;
    }

    const T& espiar() const {
        if (frente_ == nullptr) {
            throw std::out_of_range("Fila vazia: espiar");
        }
        return frente_->item;
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
        NoFila<T>* atual = frente_;
        while (atual != nullptr) {
            resultado.push_back(atual->item);
            atual = atual->proximo;
        }
        return resultado;
    }

private:
    NoFila<T>* frente_;
    NoFila<T>* tras_;
    size_t tamanho_;
};

}  // namespace aed

#endif  // AED_FILA_HPP
