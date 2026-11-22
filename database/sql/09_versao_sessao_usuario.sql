-- 09_versao_sessao_usuario.sql
-- Migration versionada para suporte a versão monotônica de sessão (sv - session version).
-- Permite distinguir tokens emitidos antes vs depois de invalidações/redefinições de senha,
-- inclusive na fronteira do mesmo segundo.
-- NÃO APLICADA DIRETAMENTE EM QUALQUER BANCO; mantida para controle de versão.

CREATE TABLE IF NOT EXISTS sessoes_invalidadas_usuario (
    usuario_id VARCHAR(64) PRIMARY KEY,
    invalidado_ate BIGINT NOT NULL,
    versao_sessao INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE sessoes_invalidadas_usuario
    ADD COLUMN IF NOT EXISTS versao_sessao INTEGER NOT NULL DEFAULT 1;
