
BEGIN;

-- ============================================================
-- Seed de dados reais (não mockados)
-- Apenas 1 usuário administrador; demais tabelas preenchidas
-- com base nos produtos de frontend/src/mocks/produtos.ts
-- ============================================================

-- Usuário administrador
INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1001, 'Equipe Origem', 'admin@origem.dev', 'origem123', '81999990000', 'ADMINISTRADOR');

-- Usuário comprador demo
INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1000, 'Joana Compradora', 'comprador@origem.dev', 'origem123', '81999990000', 'COMPRADOR');

-- Usuários artesãos (vinculados às lojas)
INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1002, 'Ana Pereira', 'artesao@origem.dev', 'origem123', '81999990001', 'ARTESAO');

INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1003, 'Maria de Lourdes', 'maria.lourdes@origem.dev', 'artesao123', '81999990002', 'ARTESAO');

INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1004, 'Seu Damião', 'damiao@origem.dev', 'artesao123', '81999990003', 'ARTESAO');

INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1005, 'Severino Gravador', 'severino@origem.dev', 'artesao123', '81999990004', 'ARTESAO');

INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1006, 'Ateliê Mãos da Mata', 'atelie@origem.dev', 'artesao123', '81999990005', 'ARTESAO');

INSERT INTO usuario (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES (1007, 'Zefa do Pajeú', 'zefa@origem.dev', 'artesao123', '81999990006', 'ARTESAO');

-- Lojas (vinculadas aos artesãos)
INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES (1001, 'Barro do Alto', 'Terceira geração de louceiras do Alto do Moura. Barro policromado.', 1002);

INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES (1002, 'Linha de Passira', 'Bordadeira desde os nove anos. Ponto cheio e richelieu.', 1003);

INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES (1003, 'Carrancas do Velho Chico', 'Entalha umburana e cedro à beira do São Francisco.', 1004);

INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES (1004, 'Matriz de Bezerros', 'Corta a madeira e imprime à mão, uma cópia por vez.', 1005);

INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES (1005, 'Ateliê Mãos da Mata', 'Coletivo de seis ceramistas de Tracunhaém. Forno a lenha e engobes naturais.', 1006);

INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES (1006, 'Folhetos do Pajeú', 'Poeta e cordelista. Escreve, ilustra e costura os próprios folhetos.', 1007);

-- Categorias
INSERT INTO categoria (id_categoria, nome, descricao)
VALUES (1001, 'Arte e Decoração', 'Peças decorativas de artesanato pernambucano.');

INSERT INTO categoria (id_categoria, nome, descricao)
VALUES (1002, 'Artesanato', 'Peças utilitárias e decorativas feitas à mão.');

INSERT INTO categoria (id_categoria, nome, descricao)
VALUES (1003, 'Literatura', 'Folhetos de cordel e publicações regionais.');

-- Produtos (todos os 14 de mocks/produtos.ts)
INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2001, 'Vaso Cerâmica Raízes', 'Modelado e pintado à mão, este vaso reúne grafismos e memórias da Zona da Mata. Cada marca revela o gesto de quem fez e torna a peça irrepetível.', 'Cerâmica', 160.00, 'Zona da Mata - PE', 'PECA_UNICA', TRUE, 1005, 1001);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2002, 'Luminária de Barro', 'Cúpula vazada à faca, ainda com o barro úmido. A luz atravessa os recortes e desenha a parede.', 'Cerâmica', 120.00, 'Agreste - PE', 'PRONTA_ENTREGA', FALSE, 1002, 1001);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2003, 'Pássaro de Madeira', 'Entalhado em umburana, madeira leve do sertão. Pintura com pigmento à base de água e acabamento em cera.', 'Entalhe em Madeira', 70.00, 'Sertão do São Francisco - PE', 'PRONTA_ENTREGA', FALSE, 1004, 1002);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2004, 'Toalha Bordada Ponto Cheio', 'Linho cru com flores em ponto cheio. Cerca de quarenta horas de agulha em cada toalha.', 'Bordado', 85.00, 'Agreste - PE', 'SOB_ENCOMENDA', FALSE, 1003, 1002);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2005, 'Galo do Alto do Moura', 'Figura de barro queimada em forno a lenha e pintada a frio, no estilo das feiras de Caruaru.', 'Cerâmica', 95.00, 'Agreste - PE', 'PRONTA_ENTREGA', FALSE, 1002, 1002);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2006, 'Carranca Guardiã', 'Carranca de proa com 40 cm, talhada em cedro. Nas barcas do São Francisco, espantava o mau agouro.', 'Entalhe em Madeira', 340.00, 'Sertão do São Francisco - PE', 'PECA_UNICA', TRUE, 1004, 1001);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2007, 'Xilogravura A Chegada da Chuva', 'Impressão manual em papel de algodão, 33 por 48 cm. Tiragem de 50 cópias, numeradas e assinadas.', 'Xilogravura', 180.00, 'Agreste - PE', 'PRONTA_ENTREGA', FALSE, 1005, 1001);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2008, 'Matriz Entalhada Pavão', 'A própria matriz de madeira usada na impressão, pronta para pendurar. Só existe uma.', 'Xilogravura', 520.00, 'Agreste - PE', 'PECA_UNICA', TRUE, 1005, 1001);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2009, 'Folheto O Vaqueiro e a Lua', 'Cordel de 16 páginas em sextilhas, com capa em xilogravura. Costurado à mão.', 'Cordel', 12.00, 'Sertão do Pajeú - PE', 'PRONTA_ENTREGA', FALSE, 1006, 1003);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2010, 'Coleção Pajeú em Versos', 'Caixa com seis folhetos sobre festas, secas e amores do sertão. Acompanha marcador em xilogravura.', 'Cordel', 58.00, 'Sertão do Pajeú - PE', 'PRONTA_ENTREGA', FALSE, 1006, 1003);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2011, 'Caminho de Mesa Richelieu', 'Algodão branco recortado e bordado em richelieu, 1,60 m. Feito sob medida em até 20 dias.', 'Bordado', 210.00, 'Agreste - PE', 'SOB_ENCOMENDA', FALSE, 1003, 1002);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2012, 'Moringa com Caneca', 'Barro sem esmalte, que mantém a água fresca. A caneca encaixa como tampa.', 'Cerâmica', 78.00, 'Zona da Mata - PE', 'PRONTA_ENTREGA', FALSE, 1005, 1002);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2013, 'Santo Antônio de Barro', 'Imagem sacra de 30 cm no traço alongado de Tracunhaém. Queima única, sem pintura.', 'Cerâmica', 260.00, 'Zona da Mata - PE', 'PECA_UNICA', TRUE, 1005, 1001);

INSERT INTO produto (id_produto, nome, descricao, tecnica, preco, origem, modalidade_producao, peca_unica, fk_loja_id_loja, fk_categoria_id_categoria)
VALUES (2014, 'Trio de Aves do Sertão', 'Carcará, asa-branca e galo-de-campina em umburana. Vendidos juntos, com base de apoio.', 'Entalhe em Madeira', 150.00, 'Sertão do São Francisco - PE', 'PRONTA_ENTREGA', FALSE, 1004, 1002);

-- Estoque (um registro por produto)
INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3001, 1, 5, 2001);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3002, 6, 5, 2002);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3003, 9, 5, 2003);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3004, 3, 5, 2004);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3005, 12, 5, 2005);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3006, 1, 5, 2006);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3007, 14, 5, 2007);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3008, 0, 5, 2008);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3009, 80, 5, 2009);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3010, 22, 5, 2010);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3011, 2, 5, 2011);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3012, 15, 5, 2012);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3013, 1, 5, 2013);

INSERT INTO estoque (id_estoque, quantidade_disponivel, ponto_reposicao, fk_produto_id_produto)
VALUES (3014, 4, 5, 2014);

-- Imagens (pelo menos uma por produto, baseadas nas URLs do mock)
INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4001, '/produtos/vaso-ceramica.jpg', 2001);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4002, '/produtos/luminaria-barro.jpg', 2002);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4003, '/produtos/passaro-madeira.jpg', 2003);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4004, '/produtos/toalha-bordada.jpg', 2004);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4005, '/produtos/passaro-madeira.jpg', 2005);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4006, '/produtos/passaro-madeira-entalhe.jpg', 2006);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4007, '/produtos/luminaria-barro.jpg', 2007);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4008, '/produtos/passaro-madeira.jpg', 2008);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4009, '/produtos/vaso-ceramica.jpg', 2009);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4010, '/produtos/passaro-madeira.jpg', 2010);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4011, '/produtos/toalha-bordada.jpg', 2011);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4012, '/produtos/vaso-ceramica.jpg', 2012);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4013, '/produtos/vaso-ceramica.jpg', 2013);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES (4014, '/produtos/passaro-madeira-entalhe.jpg', 2014);

-- Alinha as sequências de IDs com os valores inseridos explicitamente acima,
-- para que novos cadastros pela API não colidam com os IDs do seed.
SELECT setval(pg_get_serial_sequence('usuario', 'id_usuario'), (SELECT MAX(id_usuario) FROM usuario));
SELECT setval(pg_get_serial_sequence('categoria', 'id_categoria'), (SELECT MAX(id_categoria) FROM categoria));
SELECT setval(pg_get_serial_sequence('loja', 'id_loja'), (SELECT MAX(id_loja) FROM loja));
SELECT setval(pg_get_serial_sequence('produto', 'id_produto'), (SELECT MAX(id_produto) FROM produto));
SELECT setval(pg_get_serial_sequence('estoque', 'id_estoque'), (SELECT MAX(id_estoque) FROM estoque));
SELECT setval(pg_get_serial_sequence('imagem', 'id_imagem'), (SELECT MAX(id_imagem) FROM imagem));

COMMIT;
