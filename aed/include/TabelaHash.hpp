#ifndef ORIGEM_AED_TABELA_HASH_HPP
#define ORIGEM_AED_TABELA_HASH_HPP

#include <vector>
#include <list>
#include <string>
#include <functional>
#include <cstddef>

template <typename K>
struct FuncaoHash {
    std::size_t operator()(const K& chave) const {
        return std::hash<K>{}(chave);
    }
};

template <>
struct FuncaoHash<std::string> {
    std::size_t operator()(const std::string& chave) const {
        std::size_t hash = 5381;
        for (char c : chave) {
            hash = ((hash << 5) + hash) + static_cast<unsigned char>(c);
        }
        return hash;
    }
};

template <typename K, typename V>
struct EntradaHash {
    K chave;
    V valor;
};

template <typename K, typename V, typename Hash = FuncaoHash<K>>
class TabelaHash {
public:
    using Bucket = std::list<EntradaHash<K, V>>;

    explicit TabelaHash(std::size_t capacidadeInicial = 8)
        : buckets(std::max<std::size_t>(1, capacidadeInicial)) {}

    ~TabelaHash() = default;

    TabelaHash(const TabelaHash&) = delete;
    TabelaHash& operator=(const TabelaHash&) = delete;
    TabelaHash(TabelaHash&&) = default;
    TabelaHash& operator=(TabelaHash&&) = default;

    void inserir(const K& chave, const V& valor) {
        std::size_t idx = indice(chave);
        for (auto& e : buckets[idx]) {
            if (e.chave == chave) {
                e.valor = valor;
                return;
            }
        }
        buckets[idx].push_back(EntradaHash<K, V>{chave, valor});
        _tamanho++;
        if (fatorDeCarga() > 0.75) {
            rehash();
        }
    }

    bool buscar(const K& chave, V& saida) const {
        std::size_t idx = indice(chave);
        for (const auto& e : buckets[idx]) {
            if (e.chave == chave) {
                saida = e.valor;
                return true;
            }
        }
        return false;
    }

    bool remover(const K& chave) {
        std::size_t idx = indice(chave);
        auto& b = buckets[idx];
        for (auto it = b.begin(); it != b.end(); ++it) {
            if (it->chave == chave) {
                b.erase(it);
                _tamanho--;
                return true;
            }
        }
        return false;
    }

    bool contem(const K& chave) const {
        V saida;
        return buscar(chave, saida);
    }

    std::vector<K> chaves() const {
        std::vector<K> resultado;
        resultado.reserve(_tamanho);
        for (const auto& b : buckets) {
            for (const auto& e : b) {
                resultado.push_back(e.chave);
            }
        }
        return resultado;
    }

    std::vector<V> valores() const {
        std::vector<V> resultado;
        resultado.reserve(_tamanho);
        for (const auto& b : buckets) {
            for (const auto& e : b) {
                resultado.push_back(e.valor);
            }
        }
        return resultado;
    }

    std::size_t tamanho() const { return _tamanho; }

    std::size_t capacidade() const { return buckets.size(); }

    double fatorDeCarga() const {
        if (buckets.empty()) return 0.0;
        return static_cast<double>(_tamanho) / static_cast<double>(buckets.size());
    }

    void limpar() {
        for (auto& b : buckets) {
            b.clear();
        }
        _tamanho = 0;
    }

private:
    std::vector<Bucket> buckets;
    std::size_t _tamanho = 0;
    Hash hash_fn;

    std::size_t indice(const K& chave) const {
        return hash_fn(chave) % buckets.size();
    }

    void rehash() {
        std::vector<Bucket> antiga = std::move(buckets);
        buckets.assign(antiga.size() * 2, Bucket{});
        _tamanho = 0;
        for (auto& b : antiga) {
            for (auto& e : b) {
                inserirSemRehash(e.chave, e.valor);
            }
        }
    }

    void inserirSemRehash(const K& chave, const V& valor) {
        std::size_t idx = indice(chave);
        for (auto& e : buckets[idx]) {
            if (e.chave == chave) {
                e.valor = valor;
                return;
            }
        }
        buckets[idx].push_back(EntradaHash<K, V>{chave, valor});
        _tamanho++;
    }
};

#endif // ORIGEM_AED_TABELA_HASH_HPP
