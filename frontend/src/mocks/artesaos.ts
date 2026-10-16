// Dados da Fake API. Só src/app/api importa daqui.
// Pessoas e ateliês fictícios. As cidades e técnicas são polos reais de Pernambuco.

export type ArtesaoMock = {
  id: string;
  nome: string;
  nomeLoja: string;
  biografia: string;
  cidade: string;
  regiaoId: string;
  tecnicaId: string;
  especialidade: string;
  foto: string | null;
  verificado: boolean;
  historia: string[];
  citacao: string;
  imagens: string[];
  pecasVendidas: number;
};

export const artesaos: ArtesaoMock[] = [
  {
    id: "usr_901",
    nome: "Ana Pereira",
    nomeLoja: "Barro do Alto",
    biografia:
      "Terceira geração de louceiras do Alto do Moura. Modela figuras e utilitários com o barro tirado da beira do rio Ipojuca.",
    cidade: "Caruaru, PE",
    regiaoId: "agreste",
    tecnicaId: "ceramica",
    especialidade: "Barro policromado",
    foto: "/artesaos/ana-pereira.png",
    verificado: true,
    historia: [
      "No Alto do Moura, em Caruaru, Ana Pereira encontrou no barro uma forma de guardar o que a família dela sabe há quatro gerações. Aprendeu com a mãe e com a avó a tirar o barro da beira do rio, deixar descansar e modelar sem molde.",
      "Cada figura sai das mãos dela com uma cena do Agreste: a feira, o forró, a procissão, o vaqueiro. Depois da queima no forno a lenha, a pintura a frio dá a cor viva que marca a cerâmica de Caruaru.",
      "Ana produz tudo no próprio terreiro, da modelagem à embalagem, e assina cada peça no fundo.",
    ],
    citacao: "O barro guarda histórias. Eu só ajudo a dar forma a elas.",
    imagens: ["/artesaos/ana-xilogravura.jpg"],
    pecasVendidas: 128,
  },
  {
    id: "usr_902",
    nome: "Maria de Lourdes",
    nomeLoja: "Linha de Passira",
    biografia:
      "Bordadeira desde os nove anos. Trabalha o ponto cheio e o richelieu em linho e algodão cru.",
    cidade: "Passira, PE",
    regiaoId: "agreste",
    tecnicaId: "bordado",
    especialidade: "Ponto cheio e richelieu",
    foto: null,
    verificado: true,
    historia: [
      "Maria de Lourdes bordou a primeira toalha aos nove anos, sentada na calçada com as vizinhas de Passira, cidade onde quase toda casa tem um bastidor.",
      "Hoje trabalha com linho e algodão cru, sempre à mão. Uma toalha grande leva cerca de quarenta horas de agulha, e o avesso sai tão caprichado quanto a frente.",
    ],
    citacao: "Bordado bom é aquele que a gente tem orgulho de virar do avesso.",
    imagens: [],
    pecasVendidas: 74,
  },
  {
    id: "usr_903",
    nome: "Seu Damião",
    nomeLoja: "Carrancas do Velho Chico",
    biografia:
      "Entalha umburana e cedro à beira do São Francisco. Aprendeu o ofício nas barcas, com o pai.",
    cidade: "Petrolina, PE",
    regiaoId: "sertao-do-sao-francisco",
    tecnicaId: "entalhe-em-madeira",
    especialidade: "Umburana e cedro",
    foto: null,
    verificado: true,
    historia: [
      "Seu Damião aprendeu a entalhar nas barcas do São Francisco, com o pai, que fazia carrancas de proa para espantar o mau agouro das viagens.",
      "Em Petrolina, escolhe a umburana pela leveza e pelo cheiro, e o cedro para as peças grandes. Cada pássaro leva de dois a três dias entre o corte, o lixamento e a pintura com pigmento à base de água.",
    ],
    citacao: "A madeira já sabe o que quer ser. Eu só tiro o que sobra.",
    imagens: [],
    pecasVendidas: 96,
  },
  {
    id: "usr_904",
    nome: "Severino Gravador",
    nomeLoja: "Matriz de Bezerros",
    biografia:
      "Corta a madeira e imprime à mão, uma cópia por vez. Suas gravuras contam festas, bichos e histórias do Agreste.",
    cidade: "Bezerros, PE",
    regiaoId: "agreste",
    tecnicaId: "xilogravura",
    especialidade: "Matrizes de umburana e impressão manual",
    foto: null,
    verificado: true,
    historia: [
      "Severino corta a madeira à faca e imprime cada cópia à mão, com a colher de pau esfregando o papel sobre a matriz, do jeito que aprendeu em Bezerros.",
      "As gravuras dele contam festas, bichos e histórias do Agreste. As tiragens são numeradas e assinadas a lápis, e a matriz de cada série é vendida como peça única.",
    ],
    citacao: "Cada cópia é diferente da outra, porque a mão nunca aperta igual.",
    imagens: [],
    pecasVendidas: 210,
  },
  {
    id: "usr_905",
    nome: "Ateliê Mãos da Mata",
    nomeLoja: "Ateliê Mãos da Mata",
    biografia:
      "Coletivo de seis ceramistas de Tracunhaém. Queimam em forno a lenha e pintam com engobes naturais.",
    cidade: "Tracunhaém, PE",
    regiaoId: "zona-da-mata",
    tecnicaId: "ceramica",
    especialidade: "Forno a lenha e engobes naturais",
    foto: null,
    verificado: false,
    historia: [
      "O Ateliê Mãos da Mata reúne seis ceramistas de Tracunhaém, cidade conhecida pelas imagens sacras de traço alongado.",
      "O grupo queima em forno a lenha e pinta com engobes feitos de terra da própria região. Cada peça é modelada por uma pessoa e assinada em nome do coletivo.",
    ],
    citacao: "Seis mãos diferentes, uma terra só.",
    imagens: [],
    pecasVendidas: 53,
  },
  {
    id: "usr_906",
    nome: "Zefa do Pajeú",
    nomeLoja: "Folhetos do Pajeú",
    biografia:
      "Poeta e cordelista. Escreve, ilustra e costura os próprios folhetos na terra dos repentistas.",
    cidade: "São José do Egito, PE",
    regiaoId: "sertao-do-pajeu",
    tecnicaId: "cordel",
    especialidade: "Sextilhas e capas em xilogravura",
    foto: null,
    verificado: true,
    historia: [
      "Zefa cresceu ouvindo repente na feira de São José do Egito, terra de poetas. Escreve os próprios folhetos, ilustra a capa em xilogravura e costura cada exemplar à mão.",
      "Os cordéis dela falam de festas, secas e amores do Sertão do Pajeú, e circulam em escolas e feiras de todo o estado.",
    ],
    citacao: "Cordel é jornal do sertão: conta o que aconteceu e o que a gente sonha.",
    imagens: [],
    pecasVendidas: 340,
  },
];
