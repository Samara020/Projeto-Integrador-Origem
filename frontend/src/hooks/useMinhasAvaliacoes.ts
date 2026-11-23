"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSessao } from "@/hooks/useSessao";
import { ApiError } from "@/lib/http";
import { avaliacoesService } from "@/services/avaliacoes";
import { avaliacoesStore } from "@/store/avaliacoes";

export function useMinhasAvaliacoes() {
  const { usuario, pronta } = useSessao();
  const ehComprador = pronta && usuario?.papel === "COMPRADOR";
  const ultimoUsuario = useRef<string | null>(null);
  const [erro, setErro] = useState<ApiError | null>(null);
  const minhas = useSyncExternalStore(
    avaliacoesStore.assinar,
    avaliacoesStore.obter,
    () => null,
  );

  const recarregar = useCallback(async () => {
    if (!ehComprador) {
      setErro(null);
      avaliacoesStore.definir([]);
      return;
    }
    try {
      const lista = await avaliacoesService.minhas();
      setErro(null);
      avaliacoesStore.definir(lista);
    } catch (causa) {
      const apiErro =
        causa instanceof ApiError
          ? causa
          : new ApiError(0, "Não foi possível carregar suas avaliações.");
      setErro(apiErro);
      throw apiErro;
    }
  }, [ehComprador]);

  useEffect(() => {
    if (!pronta) return;
    if (!ehComprador) {
      ultimoUsuario.current = null;
      avaliacoesStore.definir([]);
      return;
    }
    if (ultimoUsuario.current === usuario.id) return;
    ultimoUsuario.current = usuario.id;
    const controle = new AbortController();
    avaliacoesService
      .minhas(controle.signal)
      .then((lista) => {
        if (controle.signal.aborted) return;
        setErro(null);
        avaliacoesStore.definir(lista);
      })
      .catch((causa) => {
        if (controle.signal.aborted) return;
        setErro(
          causa instanceof ApiError
            ? causa
            : new ApiError(0, "Não foi possível carregar suas avaliações."),
        );
        avaliacoesStore.definir([]);
      });
    return () => controle.abort();
  }, [pronta, ehComprador, usuario?.id]);

  return {
    minhas: minhas ?? [],
    carregando: ehComprador && minhas === null,
    erro: ehComprador ? erro : null,
    recarregar,
  };
}
