/**
 * Respostas REAIS da API de triagem (pacotes sintéticos DSD-16 e DSD-15 do corpus), gravadas
 * por um teste do servidor em 12/11/2026. Só dados fictícios. Usadas pelos testes da interface:
 * cada resposta passa pelos mesmos esquemas zod que o serviço HTTP usa.
 *
 * Em 16/11/2026 (E10), os resumos ganharam `condicoesPendentes` e `naoAvaliaveis`, calculados
 * pela mesma regra do servidor a partir das avaliações gravadas aqui (análise atual de cada resumo). As avaliações ganharam `aplicacao`, a pré-condição da regra no
 * catálogo 1.0-review (o mesmo das análises gravadas). Na estabilização da E10, as revisões ganharam
 * `baseRevisaoId` (nulo em todas as gravadas aqui: nenhuma mantém decisão de análise anterior).
 */
export const respostasReais: Record<string, unknown> = {
 "statusAnalista": {
  "disponivel": true,
  "modo": "experimental-sintetico",
  "modalidadesSuportadas": [
   "D"
  ],
  "etapasSuportadas": [
   "abertura"
  ],
  "limites": {
   "maxAnexos": 12,
   "maxBytesArquivo": 52428800,
   "maxBytesPacote": 209715200
  },
  "conteudoArmazenado": true,
  "retencaoHoras": 72,
  "pessoa": {
   "usuario": "ana.analista",
   "papel": "analista",
   "podeCriar": true
  }
 },
 "statusAdmin": {
  "disponivel": true,
  "modo": "experimental-sintetico",
  "modalidadesSuportadas": [
   "D"
  ],
  "etapasSuportadas": [
   "abertura"
  ],
  "limites": {
   "maxAnexos": 12,
   "maxBytesArquivo": 52428800,
   "maxBytesPacote": 209715200
  },
  "conteudoArmazenado": true,
  "retencaoHoras": 72,
  "pessoa": {
   "usuario": "carla.admin",
   "papel": "administrador",
   "podeCriar": false
  }
 },
 "criada": {
  "triagem": {
   "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "processando",
   "versao": 1,
   "analiseAtual": null,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:26.830Z",
   "atualizadaEm": "2026-11-13T00:19:26.830Z",
   "retencaoAte": "2026-11-16T00:19:26.832Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 1,
    "situacao": "processando",
    "encerradaEm": null
   },
   "achados": null,
   "pendentesRevisao": null,
   "condicoesPendentes": null,
   "naoAvaliaveis": null
  },
  "anexos": [
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "ordem": 1,
    "nome": "requerimento.pdf",
    "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
    "bytes": 2138,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "ordem": 2,
    "nome": "drt-01.pdf",
    "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
    "bytes": 1764,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "ordem": 3,
    "nome": "matricula.pdf",
    "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
    "bytes": 1483,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "ordem": 4,
    "nome": "ficha-cadastral.pdf",
    "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
    "bytes": 1335,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "ordem": 5,
    "nome": "art.pdf",
    "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
    "bytes": 1812,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "ordem": 6,
    "nome": "prancha.pdf",
    "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
    "bytes": 2036,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "ordem": 7,
    "nome": "prancha.dxf",
    "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
    "bytes": 430,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "ordem": 8,
    "nome": "memorial.pdf",
    "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
    "bytes": 1832,
    "conteudo": "armazenado",
    "tipoReal": null,
    "extensaoConfere": null,
    "integridade": null,
    "isolado": null,
    "motivosIsolamento": [],
    "classificacao": null,
    "justificativa": null,
    "paginas": []
   }
  ],
  "nova": true
 },
 "lista": {
  "itens": [
   {
    "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
    "referencia": "SINTETICO-001",
    "modo": "experimental-sintetico",
    "situacao": "aguardando-revisao",
    "versao": 2,
    "analiseAtual": 1,
    "protocoladoEm": "2026-11-05T13:00:00.000Z",
    "criadaEm": "2026-11-13T00:19:26.830Z",
    "atualizadaEm": "2026-11-13T00:19:27.259Z",
    "retencaoAte": "2026-11-16T00:19:26.832Z",
    "criadaPorMim": true,
    "modalidade": "D",
    "etapa": "abertura",
    "ultimaAnalise": {
     "numero": 1,
     "situacao": "concluida",
     "encerradaEm": "2026-11-13T00:19:27.259Z"
    },
    "achados": 2,
    "pendentesRevisao": 2,
    "condicoesPendentes": 1,
    "naoAvaliaveis": 0
   }
  ],
  "total": 1
 },
 "listaAdmin": {
  "itens": [
   {
    "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
    "referencia": "SINTETICO-001",
    "modo": "experimental-sintetico",
    "situacao": "aguardando-revisao",
    "versao": 2,
    "analiseAtual": 1,
    "protocoladoEm": "2026-11-05T13:00:00.000Z",
    "criadaEm": "2026-11-13T00:19:26.830Z",
    "atualizadaEm": "2026-11-13T00:19:27.259Z",
    "retencaoAte": "2026-11-16T00:19:26.832Z",
    "criadaPorMim": false,
    "modalidade": "D",
    "etapa": "abertura",
    "ultimaAnalise": {
     "numero": 1,
     "situacao": "concluida",
     "encerradaEm": "2026-11-13T00:19:27.259Z"
    },
    "achados": 2,
    "pendentesRevisao": 2,
    "condicoesPendentes": 1,
    "naoAvaliaveis": 0
   }
  ],
  "total": 1
 },
 "detalhe": {
  "triagem": {
   "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 2,
   "analiseAtual": 1,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:26.830Z",
   "atualizadaEm": "2026-11-13T00:19:27.259Z",
   "retencaoAte": "2026-11-16T00:19:26.832Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 1,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:27.259Z"
   },
   "achados": 2,
   "pendentesRevisao": 2,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 0
  },
  "natureza": "verificacao-tecnica-experimental",
  "aviso": "Verificação técnica experimental com catálogo não homologado pela GCA, para revisão de servidor. Não é decisão administrativa e não deve ser enviada ao requerente sem revisão.",
  "enquadramento": {
   "modalidade": {
    "valor": "D",
    "origem": "declarado"
   },
   "etapa": {
    "valor": "abertura",
    "origem": "declarado"
   },
   "integridadeDoPacote": {
    "valor": "desconhecida",
    "origem": "declarado"
   },
   "condicoes": []
  },
  "analises": [
   {
    "numero": 1,
    "motivo": "inicial",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
     "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
     "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
     "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6"
    ],
    "baseAnalise": null,
    "iniciadaEm": "2026-11-13T00:19:26.832Z",
    "encerradaEm": "2026-11-13T00:19:27.259Z",
    "falha": null
   }
  ],
  "confirmacoes": [],
  "revisoes": []
 },
 "detalheAdmin": {
  "triagem": {
   "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 2,
   "analiseAtual": 1,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:26.830Z",
   "atualizadaEm": "2026-11-13T00:19:27.259Z",
   "retencaoAte": "2026-11-16T00:19:26.832Z",
   "criadaPorMim": false,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 1,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:27.259Z"
   },
   "achados": 2,
   "pendentesRevisao": 2,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 0
  },
  "natureza": "verificacao-tecnica-experimental",
  "aviso": "Verificação técnica experimental com catálogo não homologado pela GCA, para revisão de servidor. Não é decisão administrativa e não deve ser enviada ao requerente sem revisão.",
  "enquadramento": {
   "modalidade": {
    "valor": "D",
    "origem": "declarado"
   },
   "etapa": {
    "valor": "abertura",
    "origem": "declarado"
   },
   "integridadeDoPacote": {
    "valor": "desconhecida",
    "origem": "declarado"
   },
   "condicoes": []
  },
  "analises": [
   {
    "numero": 1,
    "motivo": "inicial",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
     "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
     "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
     "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6"
    ],
    "baseAnalise": null,
    "iniciadaEm": "2026-11-13T00:19:26.832Z",
    "encerradaEm": "2026-11-13T00:19:27.259Z",
    "falha": null
   }
  ],
  "confirmacoes": [],
  "revisoes": []
 },
 "anexos": {
  "analise": 1,
  "itens": [
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "ordem": 1,
    "nome": "requerimento.pdf",
    "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
    "bytes": 2138,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "requerimento",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
       "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.598494825964252,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
       "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.26599673613833164,
         "width": 0.6747496976212867,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Assina este requerimento: Carla Ficticia de Exemplo, na qualidade de proprietária.",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
       "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.18279129149307888,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Assunto: DESDOBRO",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "requerimento: título \"requerimento\"; fórmula de requerimento; campo \"Assunto\" (5 pontos, página 1); alternativas com menos evidência: art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "ordem": 2,
    "nome": "drt-01.pdf",
    "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
    "bytes": 1764,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "drt-01",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
       "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.6573377234242717,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
       "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.14424686382722213,
         "width": 0.5905422658244858,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Declaro ser o responsável técnico pelas peças técnicas deste processo.",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "drt-01: título de DRT 01; declaração do responsável técnico (4 pontos, página 1); alternativas com menos evidência: requerimento (1), drt-02-projeto (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "ordem": 3,
    "nome": "matricula.pdf",
    "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
    "bytes": 1483,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "matricula-transcricao",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.5953433678269053,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.2254586077140167,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "9º Serviço Registral Fictício",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.19294681275166592,
         "width": 0.26807048783765586,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Certidão emitida em 20/10/2026.",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "matricula-transcricao: título \"certidão de inteiro teor\"; título com número de matrícula; serventia de registro de imóveis; fórmula de certidão (9 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "ordem": 4,
    "nome": "ficha-cadastral.pdf",
    "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
    "bytes": 1335,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "inscricao-imobiliaria",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
       "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.36592191909689575,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
       "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.295788536487031,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Inscrição imobiliária: 9999.0001.001",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "inscricao-imobiliaria: título \"ficha cadastral\"; campo \"Inscrição imobiliária\" no início da linha (4 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "ordem": 5,
    "nome": "art.pdf",
    "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
    "bytes": 1812,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "art-rrt-similar",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.5932972718720602,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.44467141513237485,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.14424686382722213,
         "width": 0.3162998924875685,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Contratante: Carla Ficticia de Exemplo",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.16859683828944402,
         "width": 0.25062659588764935,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Atividade: projeto de desdobro",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "art-rrt-similar: título \"anotação de responsabilidade técnica\"; sigla ART/RRT/TRT no título; conselho profissional; campo \"Contratante\"; campo \"Atividade\" (8 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "ordem": 6,
    "nome": "prancha.pdf",
    "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
    "bytes": 2036,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "prancha",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.08003203729109507,
         "width": 0.1352433749107556,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "PRANCHA - DESDOBRO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.29034671060055356,
         "width": 0.14945697366763244,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Planta de situação - escala 1:10.000",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.3146966850627755,
         "width": 0.1268573348452395,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Formato A3 Data: 01/11/2026",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.24164676167610974,
         "width": 0.14174205199277634,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Situação atual: lote F7 - 450,00 m²",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "prancha: título \"prancha\"; planta de situação; escala declarada; formato de folha declarado; quadro de situação atual/final (8 pontos, página 1); folha maior que A4; alternativas com menos evidência: requerimento (1), art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 1190.55,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "ordem": 7,
    "nome": "prancha.dxf",
    "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
    "bytes": 430,
    "conteudo": "armazenado",
    "tipoReal": "dxf",
    "extensaoConfere": true,
    "integridade": "nao-verificada",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "cad",
     "confianca": "alta",
     "metodo": "tipo-de-arquivo",
     "evidencias": [
      {
       "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
       "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
       "trecho": "Conteúdo reconhecido como DXF em texto",
       "origem": "metadado-arquivo"
      }
     ],
     "alternativas": []
    },
    "justificativa": "O conteúdo do arquivo tem a estrutura de desenho CAD (DXF em texto); a classe vem do tipo real, não do nome.",
    "paginas": []
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "ordem": 8,
    "nome": "memorial.pdf",
    "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
    "bytes": 1832,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "memorial",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
       "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.27572906867356534,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "MEMORIAL DESCRITIVO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
       "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.19294681275166592,
         "width": 0.6285529498723283,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Área total: 450,00 m². Lotes resultantes: F7A (225,00 m²) e F7B (225,00 m²).",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "memorial: título \"memorial descritivo\"; título \"memorial\"; quadro de lotes resultantes (6 pontos, página 1); alternativas com menos evidência: requerimento (1), art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   }
  ]
 },
 "avaliacoes": {
  "analise": 1,
  "natureza": "verificacao-tecnica-experimental",
  "decisaoAdministrativa": null,
  "itens": [
   {
    "regraId": "AQR-GCA-001",
    "regraVersao": "AQR-GCA-001@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto reconhecível",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto do requerimento reconhecível (modalidade D).",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A modalidade do assunto não altera o enquadramento: só o servidor confirma a modalidade."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Protocolo recebido",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:assunto"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-002",
    "regraVersao": "AQR-GCA-002@1.0-review+fd9b3e3b9db5",
    "nome": "Requerimento presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Requerimento: localizado entre os anexos recebidos (9af0c33a-35eb-41ff-8352-3ca1d8d3a923).",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.598494825964252,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-003",
    "regraVersao": "AQR-GCA-003@1.0-review+fd9b3e3b9db5",
    "nome": "DRT 01 correta",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). DRT 01: localizado entre os anexos recebidos (0af4821e-e6bf-42d7-8404-bfe865afd632).",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.6573377234242717,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade R/D/DM",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-006",
    "regraVersao": "AQR-GCA-006@1.0-review+fd9b3e3b9db5",
    "nome": "Documento de inscrição imobiliária",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Documento de inscrição imobiliária: localizado entre os anexos recebidos (824dbdc6-68dc-423a-ba6f-44e6f0b8abfd).",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.36592191909689575,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Lote(s) declarados",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-008",
    "regraVersao": "AQR-GCA-008@1.0-review+fd9b3e3b9db5",
    "nome": "Título registral presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Certidão de matrícula ou transcrição: localizado entre os anexos recebidos (12791a44-7f50-4755-92f9-0cbe58bfc938).",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5953433678269053,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Imóvel identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-009",
    "regraVersao": "AQR-GCA-009@1.0-review+fd9b3e3b9db5",
    "nome": "Data do título registral para revisão",
    "resultado": "achado",
    "tipo": "condicao-indeterminada",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas para conferência do prazo do título (protocolo registrado em 2026-11-05T13:00:00.000Z, dia 2026-11-05 no fuso de Campo Grande): emissão em 2026-10-20; intervalo aparente de 16 dia(s) corrido(s) até o dia do protocolo. O sistema não aplica critério de contagem, não declara validade nem vencimento; a avaliação temporal é do servidor.",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A forma de contagem do prazo de 30 dias (corrida ou útil, marco inicial, fuso) não é homologada: pergunta 5 do dossiê.",
     "O intervalo em dias corridos é só apresentação, não critério."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Título e datas legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "12791a44-7f50-4755-92f9-0cbe58bfc938:data-emissao"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-010",
    "regraVersao": "AQR-GCA-010@1.0-review+fd9b3e3b9db5",
    "nome": "Prova de representação condicional",
    "resultado": "nao-aplicavel",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Signatário e titular aparente coincidem: não há representação a comprovar.",
    "motivo": "O signatário coincide com o titular aparente do requerimento.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Signatário não coincide com titular aparente ou declara representação",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:signatario",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:titular"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-011",
    "regraVersao": "AQR-GCA-011@1.0-review+fd9b3e3b9db5",
    "nome": "ART RRT ou similar de projeto",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). ART, RRT ou documento similar de responsabilidade técnica: localizado entre os anexos recebidos (1500dfbc-1bac-487c-bf79-0b00fdc062c8).",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5932972718720602,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "RT identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-012",
    "regraVersao": "AQR-GCA-012@1.0-review+fd9b3e3b9db5",
    "nome": "Planta e CAD para R D DM RET",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em PDF e desenho DWG/DXF localizados.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.08003203729109507,
        "width": 0.1352433749107556,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "PRANCHA - DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "Conteúdo reconhecido como DXF em texto",
      "origem": "metadado-arquivo"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "O conteúdo do DWG/DXF não é aberto nem interpretado."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-013",
    "regraVersao": "AQR-GCA-013@1.0-review+fd9b3e3b9db5",
    "nome": "Memorial PDF para R D DM RET",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Memorial descritivo em PDF: localizado entre os anexos recebidos (9f473d39-0583-4ad8-9979-79206e69b6d9).",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.27572906867356534,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "MEMORIAL DESCRITIVO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-016",
    "regraVersao": "AQR-GCA-016@1.0-review+fd9b3e3b9db5",
    "nome": "Assinatura do RT nas peças",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Área de assinatura do RT com traço em todas as peças verificadas.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.8222030657954127,
        "width": 0.20158750157490235,
        "height": 0.03088289443989123
       },
       {
        "x": 0.04703708370081055,
        "y": 0.8625883892937319,
        "width": 0.11512410230565728,
        "height": 0.011942994334176671
       }
      ],
      "trecho": "Assinatura do responsável técnico",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.8222030657954127,
        "width": 0.4031716167181831,
        "height": 0.03088289443989123
       },
       {
        "x": 0.09407337723424271,
        "y": 0.8625883892937319,
        "width": 0.23024627066254583,
        "height": 0.011942994334176671
       }
      ],
      "trecho": "Assinatura do responsável técnico",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §4",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Só a presença de traço na área de assinatura é vista; autoria, assinatura eletrônica e validade não são verificadas."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Planta e memorial existentes na etapa exigível",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-018",
    "regraVersao": "AQR-GCA-018@1.0-review+fd9b3e3b9db5",
    "nome": "Campos da ART RRT coerentes",
    "resultado": "achado",
    "tipo": "divergencia",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Campos da ART/RRT: lote difere entre requerimento e matrícula/transcrição × ART/RRT. Os valores e as páginas estão no quadro comparativo. O sistema não indica qual documento está correto.",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14182761533588034,
        "y": 0.19294681275166592,
        "width": 0.022095244494787558,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [
     {
      "campo": "lote",
      "valores": [
       {
        "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
        "classe": "requerimento",
        "valorBruto": "F7",
        "evidencias": [
         {
          "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
          "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
          "pagina": 1,
          "regioes": [
           {
            "x": 0.14042530834400688,
            "y": 0.19294681275166592,
            "width": 0.021446415886607256,
            "height": 0.014596993075104842
           }
          ],
          "trecho": "Lote: F7 Quadra: 12",
          "origem": "camada-de-texto"
         }
        ]
       },
       {
        "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
        "classe": "matricula-transcricao",
        "valorBruto": "F7",
        "evidencias": [
         {
          "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
          "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
          "pagina": 1,
          "regioes": [
           {
            "x": 0.19285761461880266,
            "y": 0.14424686382722213,
            "width": 0.022352637656360308,
            "height": 0.014596993075104814
           }
          ],
          "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
          "origem": "camada-de-texto"
         }
        ]
       },
       {
        "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
        "classe": "art-rrt-similar",
        "valorBruto": "C3",
        "evidencias": [
         {
          "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
          "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
          "pagina": 1,
          "regioes": [
           {
            "x": 0.14182761533588034,
            "y": 0.19294681275166592,
            "width": 0.022095244494787558,
            "height": 0.014596993075104842
           }
          ],
          "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
          "origem": "camada-de-texto"
         }
        ]
       }
      ]
     }
    ],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §3",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Não extraídos da ART/RRT: parcelamento."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "ART/RRT legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:lote",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:lote",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:lote"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-019",
    "regraVersao": "AQR-GCA-019@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto das peças: assunto coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1,6",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Textos legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:assunto",
     "0af4821e-e6bf-42d7-8404-bfe865afd632:assunto",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:assunto",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:assunto"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-020",
    "regraVersao": "AQR-GCA-020@1.0-review+fd9b3e3b9db5",
    "nome": "Identidade do imóvel consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Identidade do imóvel: matrícula, lote, quadra, inscrição imobiliária, bairro coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4158057205635909,
        "y": 0.14424686382722213,
        "width": 0.05590640495072763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.4 VIII-XI",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1-3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Campos extraídos com confiança",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:matricula",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:matricula",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:matricula",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:matricula",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:lote",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:lote",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:lote",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:lote",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:lote",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:quadra",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:quadra",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:quadra",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:quadra",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:quadra",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:inscricao",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:inscricao",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:bairro",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:bairro",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:bairro"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-021",
    "regraVersao": "AQR-GCA-021@1.0-review+fd9b3e3b9db5",
    "nome": "Datas de revisão planta memorial",
    "resultado": "sem-achado",
    "severidade": "minor",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Data de revisão da planta e do memorial: data de revisão coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1272405910833528,
        "y": 0.3146966850627755,
        "width": 0.04665382746269725,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14253508552997865,
        "y": 0.21729678721388784,
        "width": 0.09330687119626763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.2 campo Data",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.13 item 2.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Ambas as peças na etapa",
    "condicoesPendentes": [],
    "camposUsados": [
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:data-revisao",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:data-revisao"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-022",
    "regraVersao": "AQR-GCA-022@1.0-review+fd9b3e3b9db5",
    "nome": "Escala da situação",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). A planta de situação declara 1:10.000.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:escala-situacao"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-023",
    "regraVersao": "AQR-GCA-023@1.0-review+fd9b3e3b9db5",
    "nome": "Carimbo e formato da prancha",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em formato permitido pelo TR n.º 002 (A3, A2, A1).",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Formatos permitidos: A3, A2, A1 (S07, p. 4, item VII).",
     "Presença e conteúdo do carimbo não são verificados."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:formato-folha"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-028",
    "regraVersao": "AQR-GCA-028@1.0-review+fd9b3e3b9db5",
    "nome": "GDU desdobro maior que dois hectares",
    "resultado": "condicao-pendente",
    "severidade": "review",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Regra aguardando confirmação de servidor (area-situacao-acima-2ha). Pré-condição do catálogo: \"Área da situação pertinente >20.000 m² confirmada por servidor\".",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 IX",
      "membroDoPacote": null
     },
     {
      "fonte": "L03",
      "url": "https://gerencialleisweb.campogrande.ms.gov.br/api/documentos/visualizar/36601?tipo=consolidado",
      "local": "art.22 I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Sem a confirmação, a regra não é executada."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Área da situação pertinente >20.000 m² confirmada por servidor",
    "condicoesPendentes": [
     "area-situacao-acima-2ha"
    ],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-043",
    "regraVersao": "AQR-GCA-043@1.0-review+fd9b3e3b9db5",
    "nome": "Validação de formato do arquivo",
    "resultado": "sem-achado",
    "severidade": "minor",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Os anexos abrem e têm formato compatível com o requisito em que foram classificados.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Anexo sem classe não tem requisito de formato a conferir."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Anexo classificado em requisito com formato expresso",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   }
  ]
 },
 "campos": {
  "analise": 1,
  "itens": [
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:assunto",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:titular",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2217132905877872,
        "y": 0.14424686382722213,
        "width": 0.21018766358503901,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:rt-nome",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.16859683828944402,
        "width": 0.1717637007766416,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:rt-registro",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.46271030284173853,
        "y": 0.16859683828944402,
        "width": 0.15102105047098835,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:lote",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:quadra",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:parcelamento",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.21506080630781574,
        "y": 0.21729678721388784,
        "width": 0.12134223091836346,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:bairro",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4114500540736735,
        "y": 0.21729678721388784,
        "width": 0.126222973745168,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:matricula",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:inscricao",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "inscricao",
    "estado": "encontrado",
    "valorBruto": "9999.0001.001",
    "valorNormalizado": "99990001001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4197786999933135,
        "y": 0.24164676167610974,
        "width": 0.12312379967070997,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:signatario",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "signatario",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3152067561616748,
        "y": 0.26599673613833164,
        "width": 0.217106115403919,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Assina este requerimento: Carla Ficticia de Exemplo, na qualidade de proprietária.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:assunto",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:rt-nome",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.16859683828944402,
        "width": 0.17105534469639827,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:rt-registro",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.38834655497465687,
        "y": 0.16859683828944402,
        "width": 0.15039823739196068,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:lote",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:quadra",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:matricula",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3717986431532996,
        "y": 0.19294681275166592,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:matricula",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:cartorio",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "cartorio",
    "estado": "encontrado",
    "valorBruto": "9º Serviço Registral Fictício",
    "confianca": 0.8,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.1198968893650002,
        "width": 0.2254586077140167,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "9º Serviço Registral Fictício",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:lote",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:quadra",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3046208029006039,
        "y": 0.14424686382722213,
        "width": 0.020189479173486735,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:parcelamento",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.7,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3543734480066961,
        "y": 0.14424686382722213,
        "width": 0.12870792973097783,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:area",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.593041933950414,
        "y": 0.14424686382722213,
        "width": 0.09157370910831475,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:titular",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.22159519291875746,
        "y": 0.16859683828944402,
        "width": 0.21544283960375293,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:data-emissao",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "data-emissao",
    "estado": "encontrado",
    "valorBruto": "20/10/2026",
    "valorNormalizado": "2026-10-20",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:inscricao",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "inscricao",
    "estado": "encontrado",
    "valorBruto": "9999.0001.001",
    "valorNormalizado": "99990001001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26673811405056386,
        "y": 0.1198968893650002,
        "width": 0.12312379967070985,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:lote",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:quadra",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.14424686382722213,
        "width": 0.02121778757922982,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:bairro",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.15370915903268442,
        "y": 0.16859683828944402,
        "width": 0.12622297374516792,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:rt-nome",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.1198968893650002,
        "width": 0.17105534469639827,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:rt-registro",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.38834655497465687,
        "y": 0.1198968893650002,
        "width": 0.15039823739196068,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:titular",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.75,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20047506322604244,
        "y": 0.14424686382722213,
        "width": 0.20989820649576876,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Contratante: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:lote",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "C3",
    "valorNormalizado": "C3",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14182761533588034,
        "y": 0.19294681275166592,
        "width": 0.022095244494787558,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:quadra",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2505652388957063,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:bairro",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3468300433224303,
        "y": 0.19294681275166592,
        "width": 0.126222973745168,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:matricula",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.21729678721388784,
        "width": 0.050973833664332224,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:assunto",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:titular",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07853764062644052,
        "y": 0.14424686382722213,
        "width": 0.104041839445795,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Titular: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:lote",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1270124480493796,
        "y": 0.24164676167610974,
        "width": 0.011068019173239463,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Situação atual: lote F7 - 450,00 m²",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:quadra",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.12425809534235106,
        "y": 0.16859683828944402,
        "width": 0.010608982898797956,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:parcelamento",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.107531306353296,
        "y": 0.19294681275166592,
        "width": 0.06067162506495605,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:bairro",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20572675501992893,
        "y": 0.19294681275166592,
        "width": 0.06311201697620727,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:matricula",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:area",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14611370694513157,
        "y": 0.24164676167610974,
        "width": 0.04266542874845533,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Situação atual: lote F7 - 450,00 m²",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:escala-situacao",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "escala-situacao",
    "estado": "encontrado",
    "valorBruto": "1:10.000",
    "valorNormalizado": 10000,
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:data-revisao",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "data-revisao",
    "estado": "encontrado",
    "valorBruto": "01/11/2026",
    "valorNormalizado": "2026-11-01",
    "confianca": 0.85,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1272405910833528,
        "y": 0.3146966850627755,
        "width": 0.04665382746269725,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:formato-folha",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "formato-folha",
    "estado": "encontrado",
    "valorBruto": "A3",
    "valorNormalizado": "A3",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:rt-nome",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.13728656587997423,
        "y": 0.33904665952499735,
        "width": 0.08588257175113956,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:rt-registro",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2313570946836589,
        "y": 0.33904665952499735,
        "width": 0.0755111594845827,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a:lote",
    "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "LOTE F7 QUADRA 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a:quadra",
    "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "LOTE F7 QUADRA 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:assunto",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:lote",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.192901473727787,
        "y": 0.14424686382722213,
        "width": 0.022362561980291046,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:quadra",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.304714283629242,
        "y": 0.14424686382722213,
        "width": 0.025608740332268787,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:matricula",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4158057205635909,
        "y": 0.14424686382722213,
        "width": 0.05590640495072763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:titular",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1570739619134,
        "y": 0.16859683828944402,
        "width": 0.208081931111731,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Titular: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:area",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18169627300059316,
        "y": 0.19294681275166592,
        "width": 0.08974280453489125,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Área total: 450,00 m². Lotes resultantes: F7A (225,00 m²) e F7B (225,00 m²).",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:data-revisao",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "data-revisao",
    "estado": "encontrado",
    "valorBruto": "01/11/2026",
    "valorNormalizado": "2026-11-01",
    "confianca": 0.85,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14253508552997865,
        "y": 0.21729678721388784,
        "width": 0.09330687119626763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:rt-nome",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.24164676167610974,
        "width": 0.1717637007766416,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:rt-registro",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.46271030284173853,
        "y": 0.24164676167610974,
        "width": 0.15102105047098835,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   }
  ]
 },
 "revisaoCorrecao": {
  "triagem": {
   "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 3,
   "analiseAtual": 1,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:26.830Z",
   "atualizadaEm": "2026-11-13T00:19:27.279Z",
   "retencaoAte": "2026-11-16T00:19:26.832Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 1,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:27.259Z"
   },
   "achados": 2,
   "pendentesRevisao": 2,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 0
  },
  "revisaoId": "0f20b614-9702-4da2-b442-cfaab3346fdd",
  "reprocessamentoNecessario": true
 },
 "reprocessar": {
  "triagem": {
   "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 4,
   "analiseAtual": 2,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:26.830Z",
   "atualizadaEm": "2026-11-13T00:19:27.291Z",
   "retencaoAte": "2026-11-16T00:19:26.832Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 2,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:27.291Z"
   },
   "achados": 1,
   "pendentesRevisao": 1,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 0
  },
  "analise": 2,
  "alteradas": [
   "AQR-GCA-018"
  ],
  "recalculadas": [
   "AQR-GCA-006",
   "AQR-GCA-008",
   "AQR-GCA-018",
   "AQR-GCA-020"
  ],
  "reaproveitadas": [
   "AQR-GCA-001",
   "AQR-GCA-002",
   "AQR-GCA-003",
   "AQR-GCA-009",
   "AQR-GCA-010",
   "AQR-GCA-011",
   "AQR-GCA-012",
   "AQR-GCA-013",
   "AQR-GCA-016",
   "AQR-GCA-019",
   "AQR-GCA-021",
   "AQR-GCA-022",
   "AQR-GCA-023",
   "AQR-GCA-028",
   "AQR-GCA-043"
  ]
 },
 "detalheDepois": {
  "triagem": {
   "id": "b9a8de93-7306-4248-8e7c-8e535bf62d7c",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 4,
   "analiseAtual": 2,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:26.830Z",
   "atualizadaEm": "2026-11-13T00:19:27.291Z",
   "retencaoAte": "2026-11-16T00:19:26.832Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 2,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:27.291Z"
   },
   "achados": 1,
   "pendentesRevisao": 1,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 0
  },
  "natureza": "verificacao-tecnica-experimental",
  "aviso": "Verificação técnica experimental com catálogo não homologado pela GCA, para revisão de servidor. Não é decisão administrativa e não deve ser enviada ao requerente sem revisão.",
  "enquadramento": {
   "modalidade": {
    "valor": "D",
    "origem": "declarado"
   },
   "etapa": {
    "valor": "abertura",
    "origem": "declarado"
   },
   "integridadeDoPacote": {
    "valor": "desconhecida",
    "origem": "declarado"
   },
   "condicoes": []
  },
  "analises": [
   {
    "numero": 1,
    "motivo": "inicial",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
     "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
     "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
     "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6"
    ],
    "baseAnalise": null,
    "iniciadaEm": "2026-11-13T00:19:26.832Z",
    "encerradaEm": "2026-11-13T00:19:27.259Z",
    "falha": null
   },
   {
    "numero": 2,
    "motivo": "reprocessamento",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
     "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
     "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
     "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6"
    ],
    "baseAnalise": 1,
    "iniciadaEm": "2026-11-13T00:19:27.287Z",
    "encerradaEm": "2026-11-13T00:19:27.291Z",
    "falha": null
   }
  ],
  "confirmacoes": [],
  "revisoes": [
   {
    "id": "0f20b614-9702-4da2-b442-cfaab3346fdd",
    "analise": 1,
    "regraId": null,
    "campoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:lote",
    "decisao": "corrigido",
    "justificativa": "Conferido na ART sintética: o lote é F7.",
    "correcao": {
     "anterior": "C3",
     "novo": "F7"
    },
    "revisor": "ana.analista",
    "em": "2026-11-13T00:19:27.279Z",
    "baseRevisaoId": null
   }
  ]
 },
 "avaliacoesDepois": {
  "analise": 2,
  "natureza": "verificacao-tecnica-experimental",
  "decisaoAdministrativa": null,
  "itens": [
   {
    "regraId": "AQR-GCA-001",
    "regraVersao": "AQR-GCA-001@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto reconhecível",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto do requerimento reconhecível (modalidade D).",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A modalidade do assunto não altera o enquadramento: só o servidor confirma a modalidade."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Protocolo recebido",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:assunto"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-002",
    "regraVersao": "AQR-GCA-002@1.0-review+fd9b3e3b9db5",
    "nome": "Requerimento presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Requerimento: localizado entre os anexos recebidos (9af0c33a-35eb-41ff-8352-3ca1d8d3a923).",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.598494825964252,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-003",
    "regraVersao": "AQR-GCA-003@1.0-review+fd9b3e3b9db5",
    "nome": "DRT 01 correta",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). DRT 01: localizado entre os anexos recebidos (0af4821e-e6bf-42d7-8404-bfe865afd632).",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.6573377234242717,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade R/D/DM",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-006",
    "regraVersao": "AQR-GCA-006@1.0-review+fd9b3e3b9db5",
    "nome": "Documento de inscrição imobiliária",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Documento de inscrição imobiliária: localizado entre os anexos recebidos (824dbdc6-68dc-423a-ba6f-44e6f0b8abfd).",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.36592191909689575,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Lote(s) declarados",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-008",
    "regraVersao": "AQR-GCA-008@1.0-review+fd9b3e3b9db5",
    "nome": "Título registral presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Certidão de matrícula ou transcrição: localizado entre os anexos recebidos (12791a44-7f50-4755-92f9-0cbe58bfc938).",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5953433678269053,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Imóvel identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-009",
    "regraVersao": "AQR-GCA-009@1.0-review+fd9b3e3b9db5",
    "nome": "Data do título registral para revisão",
    "resultado": "achado",
    "tipo": "condicao-indeterminada",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas para conferência do prazo do título (protocolo registrado em 2026-11-05T13:00:00.000Z, dia 2026-11-05 no fuso de Campo Grande): emissão em 2026-10-20; intervalo aparente de 16 dia(s) corrido(s) até o dia do protocolo. O sistema não aplica critério de contagem, não declara validade nem vencimento; a avaliação temporal é do servidor.",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A forma de contagem do prazo de 30 dias (corrida ou útil, marco inicial, fuso) não é homologada: pergunta 5 do dossiê.",
     "O intervalo em dias corridos é só apresentação, não critério."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Título e datas legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "12791a44-7f50-4755-92f9-0cbe58bfc938:data-emissao"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-010",
    "regraVersao": "AQR-GCA-010@1.0-review+fd9b3e3b9db5",
    "nome": "Prova de representação condicional",
    "resultado": "nao-aplicavel",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Signatário e titular aparente coincidem: não há representação a comprovar.",
    "motivo": "O signatário coincide com o titular aparente do requerimento.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Signatário não coincide com titular aparente ou declara representação",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:signatario",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:titular"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-011",
    "regraVersao": "AQR-GCA-011@1.0-review+fd9b3e3b9db5",
    "nome": "ART RRT ou similar de projeto",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). ART, RRT ou documento similar de responsabilidade técnica: localizado entre os anexos recebidos (1500dfbc-1bac-487c-bf79-0b00fdc062c8).",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5932972718720602,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "RT identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-012",
    "regraVersao": "AQR-GCA-012@1.0-review+fd9b3e3b9db5",
    "nome": "Planta e CAD para R D DM RET",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em PDF e desenho DWG/DXF localizados.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.08003203729109507,
        "width": 0.1352433749107556,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "PRANCHA - DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "Conteúdo reconhecido como DXF em texto",
      "origem": "metadado-arquivo"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "O conteúdo do DWG/DXF não é aberto nem interpretado."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-013",
    "regraVersao": "AQR-GCA-013@1.0-review+fd9b3e3b9db5",
    "nome": "Memorial PDF para R D DM RET",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Memorial descritivo em PDF: localizado entre os anexos recebidos (9f473d39-0583-4ad8-9979-79206e69b6d9).",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.27572906867356534,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "MEMORIAL DESCRITIVO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-016",
    "regraVersao": "AQR-GCA-016@1.0-review+fd9b3e3b9db5",
    "nome": "Assinatura do RT nas peças",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Área de assinatura do RT com traço em todas as peças verificadas.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.8222030657954127,
        "width": 0.20158750157490235,
        "height": 0.03088289443989123
       },
       {
        "x": 0.04703708370081055,
        "y": 0.8625883892937319,
        "width": 0.11512410230565728,
        "height": 0.011942994334176671
       }
      ],
      "trecho": "Assinatura do responsável técnico",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.8222030657954127,
        "width": 0.4031716167181831,
        "height": 0.03088289443989123
       },
       {
        "x": 0.09407337723424271,
        "y": 0.8625883892937319,
        "width": 0.23024627066254583,
        "height": 0.011942994334176671
       }
      ],
      "trecho": "Assinatura do responsável técnico",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §4",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Só a presença de traço na área de assinatura é vista; autoria, assinatura eletrônica e validade não são verificadas."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Planta e memorial existentes na etapa exigível",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-018",
    "regraVersao": "AQR-GCA-018@1.0-review+fd9b3e3b9db5",
    "nome": "Campos da ART RRT coerentes",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Campos da ART/RRT: titular, responsável técnico, lote, quadra, bairro, matrícula coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2217132905877872,
        "y": 0.14424686382722213,
        "width": 0.21018766358503901,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.22159519291875746,
        "y": 0.16859683828944402,
        "width": 0.21544283960375293,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo.",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20047506322604244,
        "y": 0.14424686382722213,
        "width": 0.20989820649576876,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Contratante: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.16859683828944402,
        "width": 0.1717637007766416,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.1198968893650002,
        "width": 0.17105534469639827,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "trecho": "Corrigido por servidor (revisão 0f20b614)",
      "origem": "servidor"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §3",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Não extraídos da ART/RRT: parcelamento."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "ART/RRT legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:titular",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:titular",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:titular",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:rt-nome",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:rt-nome",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:lote",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:lote",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:lote",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:quadra",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:quadra",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:quadra",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:bairro",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:bairro",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:matricula",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:matricula",
     "1500dfbc-1bac-487c-bf79-0b00fdc062c8:matricula"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-019",
    "regraVersao": "AQR-GCA-019@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto das peças: assunto coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1,6",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Textos legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:assunto",
     "0af4821e-e6bf-42d7-8404-bfe865afd632:assunto",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:assunto",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:assunto"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-020",
    "regraVersao": "AQR-GCA-020@1.0-review+fd9b3e3b9db5",
    "nome": "Identidade do imóvel consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Identidade do imóvel: matrícula, lote, quadra, inscrição imobiliária, bairro coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4158057205635909,
        "y": 0.14424686382722213,
        "width": 0.05590640495072763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.4 VIII-XI",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1-3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Campos extraídos com confiança",
    "condicoesPendentes": [],
    "camposUsados": [
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:matricula",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:matricula",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:matricula",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:matricula",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:lote",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:lote",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:lote",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:lote",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:lote",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:quadra",
     "12791a44-7f50-4755-92f9-0cbe58bfc938:quadra",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:quadra",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:quadra",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:quadra",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:inscricao",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:inscricao",
     "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:bairro",
     "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:bairro",
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:bairro"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-021",
    "regraVersao": "AQR-GCA-021@1.0-review+fd9b3e3b9db5",
    "nome": "Datas de revisão planta memorial",
    "resultado": "sem-achado",
    "severidade": "minor",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Data de revisão da planta e do memorial: data de revisão coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1272405910833528,
        "y": 0.3146966850627755,
        "width": 0.04665382746269725,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14253508552997865,
        "y": 0.21729678721388784,
        "width": 0.09330687119626763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.2 campo Data",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.13 item 2.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Ambas as peças na etapa",
    "condicoesPendentes": [],
    "camposUsados": [
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:data-revisao",
     "9f473d39-0583-4ad8-9979-79206e69b6d9:data-revisao"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-022",
    "regraVersao": "AQR-GCA-022@1.0-review+fd9b3e3b9db5",
    "nome": "Escala da situação",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). A planta de situação declara 1:10.000.",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:escala-situacao"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-023",
    "regraVersao": "AQR-GCA-023@1.0-review+fd9b3e3b9db5",
    "nome": "Carimbo e formato da prancha",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em formato permitido pelo TR n.º 002 (A3, A2, A1).",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Formatos permitidos: A3, A2, A1 (S07, p. 4, item VII).",
     "Presença e conteúdo do carimbo não são verificados."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:formato-folha"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-028",
    "regraVersao": "AQR-GCA-028@1.0-review+fd9b3e3b9db5",
    "nome": "GDU desdobro maior que dois hectares",
    "resultado": "condicao-pendente",
    "severidade": "review",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Regra aguardando confirmação de servidor (area-situacao-acima-2ha). Pré-condição do catálogo: \"Área da situação pertinente >20.000 m² confirmada por servidor\".",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 IX",
      "membroDoPacote": null
     },
     {
      "fonte": "L03",
      "url": "https://gerencialleisweb.campogrande.ms.gov.br/api/documentos/visualizar/36601?tipo=consolidado",
      "local": "art.22 I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Sem a confirmação, a regra não é executada."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Área da situação pertinente >20.000 m² confirmada por servidor",
    "condicoesPendentes": [
     "area-situacao-acima-2ha"
    ],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-043",
    "regraVersao": "AQR-GCA-043@1.0-review+fd9b3e3b9db5",
    "nome": "Validação de formato do arquivo",
    "resultado": "sem-achado",
    "severidade": "minor",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Os anexos abrem e têm formato compatível com o requisito em que foram classificados.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Anexo sem classe não tem requisito de formato a conferir."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Anexo classificado em requisito com formato expresso",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   }
  ]
 },
 "camposDepois": {
  "analise": 2,
  "itens": [
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:assunto",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:titular",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2217132905877872,
        "y": 0.14424686382722213,
        "width": 0.21018766358503901,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:rt-nome",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.16859683828944402,
        "width": 0.1717637007766416,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:rt-registro",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.46271030284173853,
        "y": 0.16859683828944402,
        "width": 0.15102105047098835,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:lote",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:quadra",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:parcelamento",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.21506080630781574,
        "y": 0.21729678721388784,
        "width": 0.12134223091836346,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:bairro",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4114500540736735,
        "y": 0.21729678721388784,
        "width": 0.126222973745168,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:matricula",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:inscricao",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "inscricao",
    "estado": "encontrado",
    "valorBruto": "9999.0001.001",
    "valorNormalizado": "99990001001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4197786999933135,
        "y": 0.24164676167610974,
        "width": 0.12312379967070997,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923:signatario",
    "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "campo": "signatario",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
      "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3152067561616748,
        "y": 0.26599673613833164,
        "width": 0.217106115403919,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Assina este requerimento: Carla Ficticia de Exemplo, na qualidade de proprietária.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:assunto",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:rt-nome",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.16859683828944402,
        "width": 0.17105534469639827,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:rt-registro",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.38834655497465687,
        "y": 0.16859683828944402,
        "width": 0.15039823739196068,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:lote",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:quadra",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632:matricula",
    "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
      "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3717986431532996,
        "y": 0.19294681275166592,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:matricula",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:cartorio",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "cartorio",
    "estado": "encontrado",
    "valorBruto": "9º Serviço Registral Fictício",
    "confianca": 0.8,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.1198968893650002,
        "width": 0.2254586077140167,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "9º Serviço Registral Fictício",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:lote",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:quadra",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3046208029006039,
        "y": 0.14424686382722213,
        "width": 0.020189479173486735,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:parcelamento",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.7,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3543734480066961,
        "y": 0.14424686382722213,
        "width": 0.12870792973097783,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:area",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.593041933950414,
        "y": 0.14424686382722213,
        "width": 0.09157370910831475,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:titular",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.22159519291875746,
        "y": 0.16859683828944402,
        "width": 0.21544283960375293,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938:data-emissao",
    "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "campo": "data-emissao",
    "estado": "encontrado",
    "valorBruto": "20/10/2026",
    "valorNormalizado": "2026-10-20",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:inscricao",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "inscricao",
    "estado": "encontrado",
    "valorBruto": "9999.0001.001",
    "valorNormalizado": "99990001001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26673811405056386,
        "y": 0.1198968893650002,
        "width": 0.12312379967070985,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:lote",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:quadra",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.14424686382722213,
        "width": 0.02121778757922982,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd:bairro",
    "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.15370915903268442,
        "y": 0.16859683828944402,
        "width": 0.12622297374516792,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:rt-nome",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.1198968893650002,
        "width": 0.17105534469639827,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:rt-registro",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.38834655497465687,
        "y": 0.1198968893650002,
        "width": 0.15039823739196068,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:titular",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.75,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20047506322604244,
        "y": 0.14424686382722213,
        "width": 0.20989820649576876,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Contratante: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:lote",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 1,
    "metodo": "servidor",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "trecho": "Corrigido por servidor (revisão 0f20b614)",
      "origem": "servidor"
     }
    ],
    "corrigidoPor": "0f20b614-9702-4da2-b442-cfaab3346fdd"
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:quadra",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2505652388957063,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:bairro",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3468300433224303,
        "y": 0.19294681275166592,
        "width": 0.126222973745168,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8:matricula",
    "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
      "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.21729678721388784,
        "width": 0.050973833664332224,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:assunto",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:titular",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07853764062644052,
        "y": 0.14424686382722213,
        "width": 0.104041839445795,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Titular: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:lote",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1270124480493796,
        "y": 0.24164676167610974,
        "width": 0.011068019173239463,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Situação atual: lote F7 - 450,00 m²",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:quadra",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.12425809534235106,
        "y": 0.16859683828944402,
        "width": 0.010608982898797956,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:parcelamento",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.107531306353296,
        "y": 0.19294681275166592,
        "width": 0.06067162506495605,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:bairro",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20572675501992893,
        "y": 0.19294681275166592,
        "width": 0.06311201697620727,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:matricula",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:area",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14611370694513157,
        "y": 0.24164676167610974,
        "width": 0.04266542874845533,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Situação atual: lote F7 - 450,00 m²",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:escala-situacao",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "escala-situacao",
    "estado": "encontrado",
    "valorBruto": "1:10.000",
    "valorNormalizado": 10000,
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:data-revisao",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "data-revisao",
    "estado": "encontrado",
    "valorBruto": "01/11/2026",
    "valorNormalizado": "2026-11-01",
    "confianca": 0.85,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1272405910833528,
        "y": 0.3146966850627755,
        "width": 0.04665382746269725,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:formato-folha",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "formato-folha",
    "estado": "encontrado",
    "valorBruto": "A3",
    "valorNormalizado": "A3",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:rt-nome",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.13728656587997423,
        "y": 0.33904665952499735,
        "width": 0.08588257175113956,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b:rt-registro",
    "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
      "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2313570946836589,
        "y": 0.33904665952499735,
        "width": 0.0755111594845827,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a:lote",
    "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "LOTE F7 QUADRA 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a:quadra",
    "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "LOTE F7 QUADRA 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:assunto",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:lote",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.192901473727787,
        "y": 0.14424686382722213,
        "width": 0.022362561980291046,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:quadra",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.304714283629242,
        "y": 0.14424686382722213,
        "width": 0.025608740332268787,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:matricula",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4158057205635909,
        "y": 0.14424686382722213,
        "width": 0.05590640495072763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12, matrícula 90417, Jardim Ficticio.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:titular",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1570739619134,
        "y": 0.16859683828944402,
        "width": 0.208081931111731,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Titular: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:area",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18169627300059316,
        "y": 0.19294681275166592,
        "width": 0.08974280453489125,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Área total: 450,00 m². Lotes resultantes: F7A (225,00 m²) e F7B (225,00 m²).",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:data-revisao",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "data-revisao",
    "estado": "encontrado",
    "valorBruto": "01/11/2026",
    "valorNormalizado": "2026-11-01",
    "confianca": 0.85,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14253508552997865,
        "y": 0.21729678721388784,
        "width": 0.09330687119626763,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:rt-nome",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.24164676167610974,
        "width": 0.1717637007766416,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9:rt-registro",
    "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
      "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.46271030284173853,
        "y": 0.24164676167610974,
        "width": 0.15102105047098835,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   }
  ]
 },
 "anexosDepois": {
  "analise": 2,
  "itens": [
   {
    "id": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
    "ordem": 1,
    "nome": "requerimento.pdf",
    "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
    "bytes": 2138,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "requerimento",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
       "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.598494825964252,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
       "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.26599673613833164,
         "width": 0.6747496976212867,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Assina este requerimento: Carla Ficticia de Exemplo, na qualidade de proprietária.",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "9af0c33a-35eb-41ff-8352-3ca1d8d3a923",
       "sha256": "7b0b5cbd8e56a6f0976285edb709fd4273e5e9b82e7ee81ec2fea6ae9cdd04dc",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.18279129149307888,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Assunto: DESDOBRO",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "requerimento: título \"requerimento\"; fórmula de requerimento; campo \"Assunto\" (5 pontos, página 1); alternativas com menos evidência: art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "0af4821e-e6bf-42d7-8404-bfe865afd632",
    "ordem": 2,
    "nome": "drt-01.pdf",
    "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
    "bytes": 1764,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "drt-01",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
       "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.6573377234242717,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "0af4821e-e6bf-42d7-8404-bfe865afd632",
       "sha256": "df356d3f51cdaccff9a81aa4629d0618f64c00e6b2c7ac13bfdfe2e1b6db311c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.14424686382722213,
         "width": 0.5905422658244858,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Declaro ser o responsável técnico pelas peças técnicas deste processo.",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "drt-01: título de DRT 01; declaração do responsável técnico (4 pontos, página 1); alternativas com menos evidência: requerimento (1), drt-02-projeto (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "12791a44-7f50-4755-92f9-0cbe58bfc938",
    "ordem": 3,
    "nome": "matricula.pdf",
    "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
    "bytes": 1483,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "matricula-transcricao",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.5953433678269053,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.2254586077140167,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "9º Serviço Registral Fictício",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "12791a44-7f50-4755-92f9-0cbe58bfc938",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.19294681275166592,
         "width": 0.26807048783765586,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Certidão emitida em 20/10/2026.",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "matricula-transcricao: título \"certidão de inteiro teor\"; título com número de matrícula; serventia de registro de imóveis; fórmula de certidão (9 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
    "ordem": 4,
    "nome": "ficha-cadastral.pdf",
    "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
    "bytes": 1335,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "inscricao-imobiliaria",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
       "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.36592191909689575,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "824dbdc6-68dc-423a-ba6f-44e6f0b8abfd",
       "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.295788536487031,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Inscrição imobiliária: 9999.0001.001",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "inscricao-imobiliaria: título \"ficha cadastral\"; campo \"Inscrição imobiliária\" no início da linha (4 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
    "ordem": 5,
    "nome": "art.pdf",
    "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
    "bytes": 1812,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "art-rrt-similar",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.5932972718720602,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.44467141513237485,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.14424686382722213,
         "width": 0.3162998924875685,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Contratante: Carla Ficticia de Exemplo",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "1500dfbc-1bac-487c-bf79-0b00fdc062c8",
       "sha256": "5a087240d7f86e41cf0690b6323bd8650fb04639fa5d8c342f489a1740e386d3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.16859683828944402,
         "width": 0.25062659588764935,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Atividade: projeto de desdobro",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "art-rrt-similar: título \"anotação de responsabilidade técnica\"; sigla ART/RRT/TRT no título; conselho profissional; campo \"Contratante\"; campo \"Atividade\" (8 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
    "ordem": 6,
    "nome": "prancha.pdf",
    "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
    "bytes": 2036,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "prancha",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.08003203729109507,
         "width": 0.1352433749107556,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "PRANCHA - DESDOBRO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.29034671060055356,
         "width": 0.14945697366763244,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Planta de situação - escala 1:10.000",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.3146966850627755,
         "width": 0.1268573348452395,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Formato A3 Data: 01/11/2026",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "a5adc10c-c1fd-4f90-a127-fc2ebc55684b",
       "sha256": "66f0e6ca425f031ef4b8aedb25362b4817b439497a06bbc33fc166468e0f1f59",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.24164676167610974,
         "width": 0.14174205199277634,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Situação atual: lote F7 - 450,00 m²",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "prancha: título \"prancha\"; planta de situação; escala declarada; formato de folha declarado; quadro de situação atual/final (8 pontos, página 1); folha maior que A4; alternativas com menos evidência: requerimento (1), art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 1190.55,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
    "ordem": 7,
    "nome": "prancha.dxf",
    "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
    "bytes": 430,
    "conteudo": "armazenado",
    "tipoReal": "dxf",
    "extensaoConfere": true,
    "integridade": "nao-verificada",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "cad",
     "confianca": "alta",
     "metodo": "tipo-de-arquivo",
     "evidencias": [
      {
       "anexoId": "afb6bb83-8241-4b5b-9507-9782f2dbc57a",
       "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
       "trecho": "Conteúdo reconhecido como DXF em texto",
       "origem": "metadado-arquivo"
      }
     ],
     "alternativas": []
    },
    "justificativa": "O conteúdo do arquivo tem a estrutura de desenho CAD (DXF em texto); a classe vem do tipo real, não do nome.",
    "paginas": []
   },
   {
    "id": "9f473d39-0583-4ad8-9979-79206e69b6d9",
    "ordem": 8,
    "nome": "memorial.pdf",
    "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
    "bytes": 1832,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "memorial",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
       "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.27572906867356534,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "MEMORIAL DESCRITIVO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "9f473d39-0583-4ad8-9979-79206e69b6d9",
       "sha256": "d5376242d8331954075c399cabdb838828340a11b02582e552e3150c534f3de6",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.19294681275166592,
         "width": 0.6285529498723283,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Área total: 450,00 m². Lotes resultantes: F7A (225,00 m²) e F7B (225,00 m²).",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "memorial: título \"memorial descritivo\"; título \"memorial\"; quadro de lotes resultantes (6 pontos, página 1); alternativas com menos evidência: requerimento (1), art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   }
  ]
 },
 "incompletoDetalhe": {
  "triagem": {
   "id": "f0ae3c41-e2f7-4b6f-b460-46ee8004e2a4",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 2,
   "analiseAtual": 1,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:43.881Z",
   "atualizadaEm": "2026-11-13T00:19:44.280Z",
   "retencaoAte": "2026-11-16T00:19:43.883Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 1,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:44.280Z"
   },
   "achados": 1,
   "pendentesRevisao": 1,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 2
  },
  "natureza": "verificacao-tecnica-experimental",
  "aviso": "Verificação técnica experimental com catálogo não homologado pela GCA, para revisão de servidor. Não é decisão administrativa e não deve ser enviada ao requerente sem revisão.",
  "enquadramento": {
   "modalidade": {
    "valor": "D",
    "origem": "declarado"
   },
   "etapa": {
    "valor": "abertura",
    "origem": "declarado"
   },
   "integridadeDoPacote": {
    "valor": "desconhecida",
    "origem": "declarado"
   },
   "condicoes": []
  },
  "analises": [
   {
    "numero": 1,
    "motivo": "inicial",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
     "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
     "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79"
    ],
    "baseAnalise": null,
    "iniciadaEm": "2026-11-13T00:19:43.883Z",
    "encerradaEm": "2026-11-13T00:19:44.280Z",
    "falha": null
   }
  ],
  "confirmacoes": [],
  "revisoes": []
 },
 "incompletoAvaliacoes": {
  "analise": 1,
  "natureza": "verificacao-tecnica-experimental",
  "decisaoAdministrativa": null,
  "itens": [
   {
    "regraId": "AQR-GCA-001",
    "regraVersao": "AQR-GCA-001@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto reconhecível",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto do requerimento reconhecível (modalidade D).",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A modalidade do assunto não altera o enquadramento: só o servidor confirma a modalidade."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Protocolo recebido",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:assunto"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-002",
    "regraVersao": "AQR-GCA-002@1.0-review+fd9b3e3b9db5",
    "nome": "Requerimento presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Requerimento: localizado entre os anexos recebidos (e65adb99-9db1-4e16-ac91-09b8766b9355).",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.598494825964252,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-003",
    "regraVersao": "AQR-GCA-003@1.0-review+fd9b3e3b9db5",
    "nome": "DRT 01 correta",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). DRT 01: localizado entre os anexos recebidos (ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e).",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.6573377234242717,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade R/D/DM",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-006",
    "regraVersao": "AQR-GCA-006@1.0-review+fd9b3e3b9db5",
    "nome": "Documento de inscrição imobiliária",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Documento de inscrição imobiliária: localizado entre os anexos recebidos (f06d1897-8468-4ebf-9cd1-4bfbde49c7ba).",
    "evidencias": [
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.36592191909689575,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Lote(s) declarados",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-008",
    "regraVersao": "AQR-GCA-008@1.0-review+fd9b3e3b9db5",
    "nome": "Título registral presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Certidão de matrícula ou transcrição: localizado entre os anexos recebidos (c60f2b5b-4c8a-4e2a-89de-7f52f28ef834).",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5953433678269053,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Imóvel identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-009",
    "regraVersao": "AQR-GCA-009@1.0-review+fd9b3e3b9db5",
    "nome": "Data do título registral para revisão",
    "resultado": "achado",
    "tipo": "condicao-indeterminada",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas para conferência do prazo do título (protocolo registrado em 2026-11-05T13:00:00.000Z, dia 2026-11-05 no fuso de Campo Grande): emissão em 2026-10-20; intervalo aparente de 16 dia(s) corrido(s) até o dia do protocolo. O sistema não aplica critério de contagem, não declara validade nem vencimento; a avaliação temporal é do servidor.",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A forma de contagem do prazo de 30 dias (corrida ou útil, marco inicial, fuso) não é homologada: pergunta 5 do dossiê.",
     "O intervalo em dias corridos é só apresentação, não critério."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Título e datas legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:data-emissao"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-010",
    "regraVersao": "AQR-GCA-010@1.0-review+fd9b3e3b9db5",
    "nome": "Prova de representação condicional",
    "resultado": "nao-aplicavel",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Signatário e titular aparente coincidem: não há representação a comprovar.",
    "motivo": "O signatário coincide com o titular aparente do requerimento.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Signatário não coincide com titular aparente ou declara representação",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:signatario",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:titular"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-011",
    "regraVersao": "AQR-GCA-011@1.0-review+fd9b3e3b9db5",
    "nome": "ART RRT ou similar de projeto",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). ART, RRT ou documento similar de responsabilidade técnica: localizado entre os anexos recebidos (af5ade62-ea09-4e2d-a947-2d8ed9a1dc94).",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5932972718720602,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "RT identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-012",
    "regraVersao": "AQR-GCA-012@1.0-review+fd9b3e3b9db5",
    "nome": "Planta e CAD para R D DM RET",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em PDF e desenho DWG/DXF localizados.",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.08003203729109507,
        "width": 0.1352433749107556,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "PRANCHA - DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "Conteúdo reconhecido como DXF em texto",
      "origem": "metadado-arquivo"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "O conteúdo do DWG/DXF não é aberto nem interpretado."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-013",
    "regraVersao": "AQR-GCA-013@1.0-review+fd9b3e3b9db5",
    "nome": "Memorial PDF para R D DM RET",
    "resultado": "nao-avaliavel",
    "severidade": "major",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Memorial descritivo em PDF: não localizado entre os anexos recebidos, mas o pacote não foi confirmado como completo. Nada a apontar sem conferência do protocolo.",
    "motivo": "Integridade do pacote não confirmada: o documento pode estar entre os anexos não recebidos.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Ausência nos anexos recebidos não comprova ausência no processo."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-016",
    "regraVersao": "AQR-GCA-016@1.0-review+fd9b3e3b9db5",
    "nome": "Assinatura do RT nas peças",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Área de assinatura do RT com traço em todas as peças verificadas.",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.8222030657954127,
        "width": 0.20158750157490235,
        "height": 0.03088289443989123
       },
       {
        "x": 0.04703708370081055,
        "y": 0.8625883892937319,
        "width": 0.11512410230565728,
        "height": 0.011942994334176671
       }
      ],
      "trecho": "Assinatura do responsável técnico",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §4",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Só a presença de traço na área de assinatura é vista; autoria, assinatura eletrônica e validade não são verificadas."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Planta e memorial existentes na etapa exigível",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-018",
    "regraVersao": "AQR-GCA-018@1.0-review+fd9b3e3b9db5",
    "nome": "Campos da ART RRT coerentes",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Campos da ART/RRT: titular, responsável técnico, lote, quadra, bairro, matrícula coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2217132905877872,
        "y": 0.14424686382722213,
        "width": 0.21018766358503901,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.22159519291875746,
        "y": 0.16859683828944402,
        "width": 0.21544283960375293,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo.",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20047506322604244,
        "y": 0.14424686382722213,
        "width": 0.20989820649576876,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Contratante: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.16859683828944402,
        "width": 0.1717637007766416,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.1198968893650002,
        "width": 0.17105534469639827,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §3",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Não extraídos da ART/RRT: parcelamento."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "ART/RRT legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:titular",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:titular",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:titular",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:rt-nome",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:rt-nome",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:lote",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:lote",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:lote",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:quadra",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:quadra",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:quadra",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:bairro",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:bairro",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:matricula",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:matricula",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:matricula"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-019",
    "regraVersao": "AQR-GCA-019@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto das peças: assunto coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1,6",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Textos legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:assunto",
     "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:assunto",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:assunto"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-020",
    "regraVersao": "AQR-GCA-020@1.0-review+fd9b3e3b9db5",
    "nome": "Identidade do imóvel consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Identidade do imóvel: matrícula, lote, quadra, inscrição imobiliária, bairro coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.4 VIII-XI",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1-3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Campos extraídos com confiança",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:matricula",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:matricula",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:matricula",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:lote",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:lote",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:lote",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:lote",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:quadra",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:quadra",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:quadra",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:quadra",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:inscricao",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:inscricao",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:bairro",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:bairro",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:bairro"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-021",
    "regraVersao": "AQR-GCA-021@1.0-review+fd9b3e3b9db5",
    "nome": "Datas de revisão planta memorial",
    "resultado": "nao-avaliavel",
    "severidade": "minor",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas de revisão não comparadas: falta uma das peças.",
    "motivo": "Planta e memorial não estão ambos entre os anexos classificados.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.2 campo Data",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.13 item 2.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Ambas as peças na etapa",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-022",
    "regraVersao": "AQR-GCA-022@1.0-review+fd9b3e3b9db5",
    "nome": "Escala da situação",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). A planta de situação declara 1:10.000.",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:escala-situacao"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-023",
    "regraVersao": "AQR-GCA-023@1.0-review+fd9b3e3b9db5",
    "nome": "Carimbo e formato da prancha",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em formato permitido pelo TR n.º 002 (A3, A2, A1).",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Formatos permitidos: A3, A2, A1 (S07, p. 4, item VII).",
     "Presença e conteúdo do carimbo não são verificados."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:formato-folha"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-028",
    "regraVersao": "AQR-GCA-028@1.0-review+fd9b3e3b9db5",
    "nome": "GDU desdobro maior que dois hectares",
    "resultado": "condicao-pendente",
    "severidade": "review",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Regra aguardando confirmação de servidor (area-situacao-acima-2ha). Pré-condição do catálogo: \"Área da situação pertinente >20.000 m² confirmada por servidor\".",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 IX",
      "membroDoPacote": null
     },
     {
      "fonte": "L03",
      "url": "https://gerencialleisweb.campogrande.ms.gov.br/api/documentos/visualizar/36601?tipo=consolidado",
      "local": "art.22 I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Sem a confirmação, a regra não é executada."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Área da situação pertinente >20.000 m² confirmada por servidor",
    "condicoesPendentes": [
     "area-situacao-acima-2ha"
    ],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-043",
    "regraVersao": "AQR-GCA-043@1.0-review+fd9b3e3b9db5",
    "nome": "Validação de formato do arquivo",
    "resultado": "sem-achado",
    "severidade": "minor",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Os anexos abrem e têm formato compatível com o requisito em que foram classificados.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Anexo sem classe não tem requisito de formato a conferir."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Anexo classificado em requisito com formato expresso",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   }
  ]
 },
 "incompletoAnexos": {
  "analise": 1,
  "itens": [
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "ordem": 1,
    "nome": "requerimento.pdf",
    "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
    "bytes": 2143,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "requerimento",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
       "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.598494825964252,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
       "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.26599673613833164,
         "width": 0.6747496976212867,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Assina este requerimento: Carla Ficticia de Exemplo, na qualidade de proprietária.",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
       "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.18279129149307888,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Assunto: DESDOBRO",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "requerimento: título \"requerimento\"; fórmula de requerimento; campo \"Assunto\" (5 pontos, página 1); alternativas com menos evidência: art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "ordem": 2,
    "nome": "drt-01.pdf",
    "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
    "bytes": 1761,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "drt-01",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
       "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.6573377234242717,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
       "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.14424686382722213,
         "width": 0.5905422658244858,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Declaro ser o responsável técnico pelas peças técnicas deste processo.",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "drt-01: título de DRT 01; declaração do responsável técnico (4 pontos, página 1); alternativas com menos evidência: requerimento (1), drt-02-projeto (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "ordem": 3,
    "nome": "matricula.pdf",
    "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
    "bytes": 1483,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "matricula-transcricao",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.5953433678269053,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.2254586077140167,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "9º Serviço Registral Fictício",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
       "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.19294681275166592,
         "width": 0.26807048783765586,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Certidão emitida em 20/10/2026.",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "matricula-transcricao: título \"certidão de inteiro teor\"; título com número de matrícula; serventia de registro de imóveis; fórmula de certidão (9 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
    "ordem": 4,
    "nome": "ficha-cadastral.pdf",
    "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
    "bytes": 1335,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "inscricao-imobiliaria",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
       "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.36592191909689575,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
       "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.295788536487031,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Inscrição imobiliária: 9999.0001.001",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "inscricao-imobiliaria: título \"ficha cadastral\"; campo \"Inscrição imobiliária\" no início da linha (4 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "ordem": 5,
    "nome": "art.pdf",
    "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
    "bytes": 1814,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "art-rrt-similar",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
       "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.08003203729109507,
         "width": 0.5932972718720602,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
       "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.1198968893650002,
         "width": 0.44467141513237485,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
       "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.14424686382722213,
         "width": 0.3162998924875685,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Contratante: Carla Ficticia de Exemplo",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
       "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.09407337723424271,
         "y": 0.16859683828944402,
         "width": 0.25062659588764935,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Atividade: projeto de desdobro",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "art-rrt-similar: título \"anotação de responsabilidade técnica\"; sigla ART/RRT/TRT no título; conselho profissional; campo \"Contratante\"; campo \"Atividade\" (8 pontos, página 1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 595.28,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "ordem": 6,
    "nome": "prancha.pdf",
    "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
    "bytes": 2045,
    "conteudo": "armazenado",
    "tipoReal": "pdf",
    "extensaoConfere": true,
    "integridade": "legivel",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "prancha",
     "confianca": "alta",
     "metodo": "regra-lexica",
     "evidencias": [
      {
       "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
       "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.08003203729109507,
         "width": 0.1352433749107556,
         "height": 0.018577991186497042
        }
       ],
       "trecho": "PRANCHA - DESDOBRO",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
       "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.29034671060055356,
         "width": 0.14945697366763244,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Planta de situação - escala 1:10.000",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
       "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.3146966850627755,
         "width": 0.1268573348452395,
         "height": 0.014596993075104814
        }
       ],
       "trecho": "Formato A3 Data: 01/11/2026",
       "origem": "camada-de-texto"
      },
      {
       "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
       "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
       "pagina": 1,
       "regioes": [
        {
         "x": 0.04703708370081055,
         "y": 0.24164676167610974,
         "width": 0.14174205199277634,
         "height": 0.014596993075104842
        }
       ],
       "trecho": "Situação atual: lote F7 - 450,00 m²",
       "origem": "camada-de-texto"
      }
     ],
     "alternativas": []
    },
    "justificativa": "prancha: título \"prancha\"; planta de situação; escala declarada; formato de folha declarado; quadro de situação atual/final (8 pontos, página 1); folha maior que A4; alternativas com menos evidência: requerimento (1), art-rrt-similar (1).",
    "paginas": [
     {
      "pagina": 1,
      "conteudo": "text",
      "metodo": "camada-de-texto",
      "rotacao": 0,
      "larguraPt": 1190.55,
      "alturaPt": 841.89
     }
    ]
   },
   {
    "id": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
    "ordem": 7,
    "nome": "prancha.dxf",
    "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
    "bytes": 430,
    "conteudo": "armazenado",
    "tipoReal": "dxf",
    "extensaoConfere": true,
    "integridade": "nao-verificada",
    "isolado": false,
    "motivosIsolamento": [],
    "classificacao": {
     "classe": "cad",
     "confianca": "alta",
     "metodo": "tipo-de-arquivo",
     "evidencias": [
      {
       "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
       "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
       "trecho": "Conteúdo reconhecido como DXF em texto",
       "origem": "metadado-arquivo"
      }
     ],
     "alternativas": []
    },
    "justificativa": "O conteúdo do arquivo tem a estrutura de desenho CAD (DXF em texto); a classe vem do tipo real, não do nome.",
    "paginas": []
   }
  ]
 },
 "incompletoCampos": {
  "analise": 1,
  "itens": [
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:assunto",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:titular",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2217132905877872,
        "y": 0.14424686382722213,
        "width": 0.21018766358503901,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:rt-nome",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.16859683828944402,
        "width": 0.1717637007766416,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:rt-registro",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.46271030284173853,
        "y": 0.16859683828944402,
        "width": 0.15102105047098835,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:lote",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:quadra",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:parcelamento",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.21506080630781574,
        "y": 0.21729678721388784,
        "width": 0.12134223091836346,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:bairro",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4114500540736735,
        "y": 0.21729678721388784,
        "width": 0.126222973745168,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:matricula",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:inscricao",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "inscricao",
    "estado": "encontrado",
    "valorBruto": "9999.0001.001",
    "valorNormalizado": "99990001001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.4197786999933135,
        "y": 0.24164676167610974,
        "width": 0.12312379967070997,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "e65adb99-9db1-4e16-ac91-09b8766b9355:signatario",
    "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
    "campo": "signatario",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3152067561616748,
        "y": 0.26599673613833164,
        "width": 0.217106115403919,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Assina este requerimento: Carla Ficticia de Exemplo, na qualidade de proprietária.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:assunto",
    "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:rt-nome",
    "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.16859683828944402,
        "width": 0.17105534469639827,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:rt-registro",
    "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.38834655497465687,
        "y": 0.16859683828944402,
        "width": 0.15039823739196068,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:lote",
    "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:quadra",
    "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:matricula",
    "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3717986431532996,
        "y": 0.19294681275166592,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:matricula",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:cartorio",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "cartorio",
    "estado": "encontrado",
    "valorBruto": "9º Serviço Registral Fictício",
    "confianca": 0.8,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.1198968893650002,
        "width": 0.2254586077140167,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "9º Serviço Registral Fictício",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:lote",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:quadra",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3046208029006039,
        "y": 0.14424686382722213,
        "width": 0.020189479173486735,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:parcelamento",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.7,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3543734480066961,
        "y": 0.14424686382722213,
        "width": 0.12870792973097783,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:area",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.593041933950414,
        "y": 0.14424686382722213,
        "width": 0.09157370910831475,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:titular",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.22159519291875746,
        "y": 0.16859683828944402,
        "width": 0.21544283960375293,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:data-emissao",
    "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
    "campo": "data-emissao",
    "estado": "encontrado",
    "valorBruto": "20/10/2026",
    "valorNormalizado": "2026-10-20",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:inscricao",
    "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
    "campo": "inscricao",
    "estado": "encontrado",
    "valorBruto": "9999.0001.001",
    "valorNormalizado": "99990001001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26673811405056386,
        "y": 0.1198968893650002,
        "width": 0.12312379967070985,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:lote",
    "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:quadra",
    "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.14424686382722213,
        "width": 0.02121778757922982,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:bairro",
    "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.15370915903268442,
        "y": 0.16859683828944402,
        "width": 0.12622297374516792,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:rt-nome",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.1198968893650002,
        "width": 0.17105534469639827,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:rt-registro",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.38834655497465687,
        "y": 0.1198968893650002,
        "width": 0.15039823739196068,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:titular",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.75,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20047506322604244,
        "y": 0.14424686382722213,
        "width": 0.20989820649576876,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Contratante: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:lote",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:quadra",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:bairro",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.3447789077223765,
        "y": 0.19294681275166592,
        "width": 0.126222973745168,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:matricula",
    "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.21729678721388784,
        "width": 0.050973833664332224,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:assunto",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "assunto",
    "estado": "encontrado",
    "valorBruto": "DESDOBRO",
    "confianca": 0.95,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:titular",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "titular",
    "estado": "encontrado",
    "valorBruto": "Carla Ficticia de Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07853764062644052,
        "y": 0.14424686382722213,
        "width": 0.104041839445795,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Titular: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:lote",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1270124480493796,
        "y": 0.24164676167610974,
        "width": 0.011068019173239463,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Situação atual: lote F7 - 450,00 m²",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:quadra",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.12425809534235106,
        "y": 0.16859683828944402,
        "width": 0.010608982898797956,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:parcelamento",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "parcelamento",
    "estado": "encontrado",
    "valorBruto": "Jardim Ficticio",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.107531306353296,
        "y": 0.19294681275166592,
        "width": 0.06067162506495605,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:bairro",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "bairro",
    "estado": "encontrado",
    "valorBruto": "Bairro Exemplo",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20572675501992893,
        "y": 0.19294681275166592,
        "width": 0.06311201697620727,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Parcelamento: Jardim Ficticio Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:matricula",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "matricula",
    "estado": "encontrado",
    "valorBruto": "90417",
    "valorNormalizado": "90417",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:area",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "area",
    "estado": "encontrado",
    "valorBruto": "450,00 m²",
    "valorNormalizado": 450,
    "unidade": "m2",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14611370694513157,
        "y": 0.24164676167610974,
        "width": 0.04266542874845533,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Situação atual: lote F7 - 450,00 m²",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:escala-situacao",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "escala-situacao",
    "estado": "encontrado",
    "valorBruto": "1:10.000",
    "valorNormalizado": 10000,
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:data-revisao",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "data-revisao",
    "estado": "encontrado",
    "valorBruto": "01/11/2026",
    "valorNormalizado": "2026-11-01",
    "confianca": 0.85,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.1272405910833528,
        "y": 0.3146966850627755,
        "width": 0.04665382746269725,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:formato-folha",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "formato-folha",
    "estado": "encontrado",
    "valorBruto": "A3",
    "valorNormalizado": "A3",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:rt-nome",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "rt-nome",
    "estado": "encontrado",
    "valorBruto": "João Exemplo Teste",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.13728656587997423,
        "y": 0.33904665952499735,
        "width": 0.08588257175113956,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:rt-registro",
    "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
    "campo": "rt-registro",
    "estado": "encontrado",
    "valorBruto": "CREA-FIC 000001",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2313570946836589,
        "y": 0.33904665952499735,
        "width": 0.0755111594845827,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55:lote",
    "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
    "campo": "lote",
    "estado": "encontrado",
    "valorBruto": "F7",
    "valorNormalizado": "F7",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "LOTE F7 QUADRA 12",
      "origem": "camada-de-texto"
     }
    ]
   },
   {
    "id": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55:quadra",
    "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
    "campo": "quadra",
    "estado": "encontrado",
    "valorBruto": "12",
    "valorNormalizado": "12",
    "confianca": 0.9,
    "metodo": "padrao",
    "evidencias": [
     {
      "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "LOTE F7 QUADRA 12",
      "origem": "camada-de-texto"
     }
    ]
   }
  ]
 },
 "confirmacao": {
  "triagem": {
   "id": "f0ae3c41-e2f7-4b6f-b460-46ee8004e2a4",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 3,
   "analiseAtual": 1,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:43.881Z",
   "atualizadaEm": "2026-11-13T00:19:44.315Z",
   "retencaoAte": "2026-11-16T00:19:43.883Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 1,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:44.280Z"
   },
   "achados": 1,
   "pendentesRevisao": 1,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 2
  },
  "reprocessamentoNecessario": true
 },
 "completoReprocessar": {
  "triagem": {
   "id": "f0ae3c41-e2f7-4b6f-b460-46ee8004e2a4",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 4,
   "analiseAtual": 2,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:43.881Z",
   "atualizadaEm": "2026-11-13T00:19:44.325Z",
   "retencaoAte": "2026-11-16T00:19:43.883Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 2,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:44.325Z"
   },
   "achados": 2,
   "pendentesRevisao": 2,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 1
  },
  "analise": 2,
  "alteradas": [
   "AQR-GCA-013"
  ],
  "recalculadas": [
   "AQR-GCA-002",
   "AQR-GCA-003",
   "AQR-GCA-006",
   "AQR-GCA-008",
   "AQR-GCA-010",
   "AQR-GCA-011",
   "AQR-GCA-012",
   "AQR-GCA-013",
   "AQR-GCA-028"
  ],
  "reaproveitadas": [
   "AQR-GCA-001",
   "AQR-GCA-009",
   "AQR-GCA-016",
   "AQR-GCA-018",
   "AQR-GCA-019",
   "AQR-GCA-020",
   "AQR-GCA-021",
   "AQR-GCA-022",
   "AQR-GCA-023",
   "AQR-GCA-043"
  ]
 },
 "completoAvaliacoes": {
  "analise": 2,
  "natureza": "verificacao-tecnica-experimental",
  "decisaoAdministrativa": null,
  "itens": [
   {
    "regraId": "AQR-GCA-001",
    "regraVersao": "AQR-GCA-001@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto reconhecível",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto do requerimento reconhecível (modalidade D).",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A modalidade do assunto não altera o enquadramento: só o servidor confirma a modalidade."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Protocolo recebido",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:assunto"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-002",
    "regraVersao": "AQR-GCA-002@1.0-review+fd9b3e3b9db5",
    "nome": "Requerimento presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Requerimento: localizado entre os anexos recebidos (e65adb99-9db1-4e16-ac91-09b8766b9355).",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.598494825964252,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "REQUERIMENTO PARA PROCESSO CARTOGRÁFICO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-003",
    "regraVersao": "AQR-GCA-003@1.0-review+fd9b3e3b9db5",
    "nome": "DRT 01 correta",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). DRT 01: localizado entre os anexos recebidos (ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e).",
    "evidencias": [
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.6573377234242717,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade R/D/DM",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-006",
    "regraVersao": "AQR-GCA-006@1.0-review+fd9b3e3b9db5",
    "nome": "Documento de inscrição imobiliária",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Documento de inscrição imobiliária: localizado entre os anexos recebidos (f06d1897-8468-4ebf-9cd1-4bfbde49c7ba).",
    "evidencias": [
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.36592191909689575,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "FICHA CADASTRAL IMOBILIÁRIA",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3 item III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Lote(s) declarados",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-008",
    "regraVersao": "AQR-GCA-008@1.0-review+fd9b3e3b9db5",
    "nome": "Título registral presente",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Certidão de matrícula ou transcrição: localizado entre os anexos recebidos (c60f2b5b-4c8a-4e2a-89de-7f52f28ef834).",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5953433678269053,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Imóvel identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-009",
    "regraVersao": "AQR-GCA-009@1.0-review+fd9b3e3b9db5",
    "nome": "Data do título registral para revisão",
    "resultado": "achado",
    "tipo": "condicao-indeterminada",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas para conferência do prazo do título (protocolo registrado em 2026-11-05T13:00:00.000Z, dia 2026-11-05 no fuso de Campo Grande): emissão em 2026-10-20; intervalo aparente de 16 dia(s) corrido(s) até o dia do protocolo. O sistema não aplica critério de contagem, não declara validade nem vencimento; a avaliação temporal é do servidor.",
    "evidencias": [
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.26297957892057067,
        "y": 0.19294681275166592,
        "width": 0.09916428615132789,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Certidão emitida em 20/10/2026.",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3 item IV",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item IV",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A forma de contagem do prazo de 30 dias (corrida ou útil, marco inicial, fuso) não é homologada: pergunta 5 do dossiê.",
     "O intervalo em dias corridos é só apresentação, não critério."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Título e datas legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:data-emissao"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-010",
    "regraVersao": "AQR-GCA-010@1.0-review+fd9b3e3b9db5",
    "nome": "Prova de representação condicional",
    "resultado": "nao-aplicavel",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Signatário e titular aparente coincidem: não há representação a comprovar.",
    "motivo": "O signatário coincide com o titular aparente do requerimento.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item V",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Signatário não coincide com titular aparente ou declara representação",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:signatario",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:titular"
    ],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-011",
    "regraVersao": "AQR-GCA-011@1.0-review+fd9b3e3b9db5",
    "nome": "ART RRT ou similar de projeto",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). ART, RRT ou documento similar de responsabilidade técnica: localizado entre os anexos recebidos (af5ade62-ea09-4e2d-a947-2d8ed9a1dc94).",
    "evidencias": [
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09407337723424271,
        "y": 0.08003203729109507,
        "width": 0.5932972718720602,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VI",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "RT identificado",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-012",
    "regraVersao": "AQR-GCA-012@1.0-review+fd9b3e3b9db5",
    "nome": "Planta e CAD para R D DM RET",
    "resultado": "sem-achado",
    "severidade": "major",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em PDF e desenho DWG/DXF localizados.",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.08003203729109507,
        "width": 0.1352433749107556,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "PRANCHA - DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
      "sha256": "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79",
      "trecho": "Conteúdo reconhecido como DXF em texto",
      "origem": "metadado-arquivo"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "O conteúdo do DWG/DXF não é aberto nem interpretado."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-013",
    "regraVersao": "AQR-GCA-013@1.0-review+fd9b3e3b9db5",
    "nome": "Memorial PDF para R D DM RET",
    "resultado": "achado",
    "tipo": "nao-localizado",
    "severidade": "major",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Possível pendência: memorial descritivo em PDF não localizado nos anexos recebidos. Servidor confere antes de qualquer comunicação.",
    "evidencias": [],
    "valoresConflitantes": [],
    "procura": {
     "integridadeDoPacote": "completo",
     "anexosProcurados": [
      {
       "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
       "classe": "requerimento"
      },
      {
       "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
       "classe": "drt-01"
      },
      {
       "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
       "classe": "matricula-transcricao"
      },
      {
       "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
       "classe": "inscricao-imobiliaria"
      },
      {
       "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
       "classe": "art-rrt-similar"
      },
      {
       "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
       "classe": "prancha"
      },
      {
       "anexoId": "8ca4e925-e312-4cc9-b3bc-fd28eb792a55",
       "classe": "cad"
      }
     ]
    },
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 item VIII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "A busca cobre só os anexos recebidos, classificados pelo conteúdo; um documento com cabeçalho fora do padrão pode não ter sido reconhecido."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Modalidade identificada",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-016",
    "regraVersao": "AQR-GCA-016@1.0-review+fd9b3e3b9db5",
    "nome": "Assinatura do RT nas peças",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Área de assinatura do RT com traço em todas as peças verificadas.",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.04703708370081055,
        "y": 0.8222030657954127,
        "width": 0.20158750157490235,
        "height": 0.03088289443989123
       },
       {
        "x": 0.04703708370081055,
        "y": 0.8625883892937319,
        "width": 0.11512410230565728,
        "height": 0.011942994334176671
       }
      ],
      "trecho": "Assinatura do responsável técnico",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §4",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 III",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Só a presença de traço na área de assinatura é vista; autoria, assinatura eletrônica e validade não são verificadas."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Planta e memorial existentes na etapa exigível",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-018",
    "regraVersao": "AQR-GCA-018@1.0-review+fd9b3e3b9db5",
    "nome": "Campos da ART RRT coerentes",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Campos da ART/RRT: titular, responsável técnico, lote, quadra, bairro, matrícula coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2217132905877872,
        "y": 0.14424686382722213,
        "width": 0.21018766358503901,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.22159519291875746,
        "y": 0.16859683828944402,
        "width": 0.21544283960375293,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Proprietário(a): Carla Ficticia de Exemplo.",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.20047506322604244,
        "y": 0.14424686382722213,
        "width": 0.20989820649576876,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Contratante: Carla Ficticia de Exemplo",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2745708255080018,
        "y": 0.16859683828944402,
        "width": 0.1717637007766416,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Responsável técnico: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.2009829676694918,
        "y": 0.1198968893650002,
        "width": 0.17105534469639827,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Profissional: João Exemplo Teste - CREA-FIC 000001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94",
      "sha256": "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12 Bairro: Bairro Exemplo",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.3 §3",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.1 II",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Não extraídos da ART/RRT: parcelamento."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "ART/RRT legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:titular",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:titular",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:titular",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:rt-nome",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:rt-nome",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:lote",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:lote",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:lote",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:quadra",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:quadra",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:quadra",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:bairro",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:bairro",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:matricula",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:matricula",
     "af5ade62-ea09-4e2d-a947-2d8ed9a1dc94:matricula"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-019",
    "regraVersao": "AQR-GCA-019@1.0-review+fd9b3e3b9db5",
    "nome": "Assunto consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto das peças: assunto coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e",
      "sha256": "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.17477179134309687,
        "y": 0.1198968893650002,
        "width": 0.1020928773842247,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.08738662966756432,
        "y": 0.1198968893650002,
        "width": 0.05104686745561403,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Assunto: DESDOBRO",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1,6",
      "membroDoPacote": null
     },
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.2",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Textos legíveis",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:assunto",
     "ab2c1f0a-ac1a-4a9b-b6f7-f8376a27c34e:assunto",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:assunto"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-020",
    "regraVersao": "AQR-GCA-020@1.0-review+fd9b3e3b9db5",
    "nome": "Identidade do imóvel consistente",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Identidade do imóvel: matrícula, lote, quadra, inscrição imobiliária, bairro coincidem entre os anexos em que foram encontrados.",
    "evidencias": [
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.18072889446360757,
        "y": 0.24164676167610974,
        "width": 0.050973833664332224,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Matrícula: 90417 Inscrição imobiliária: 9999.0001.001",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.6236329475112137,
        "y": 0.08003203729109507,
        "width": 0.06578379754993435,
        "height": 0.018577991186497042
       }
      ],
      "trecho": "CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.09036520624610166,
        "y": 0.21729678721388784,
        "width": 0.025487130908994723,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Matrícula: 90417",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.19294681275166592,
        "width": 0.021446415886607256,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834",
      "sha256": "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.19285761461880266,
        "y": 0.14424686382722213,
        "width": 0.022352637656360308,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m².",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba",
      "sha256": "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.14042530834400688,
        "y": 0.14424686382722213,
        "width": 0.021446415886607256,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.07021324392173399,
        "y": 0.16859683828944402,
        "width": 0.010723298012666069,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     },
     {
      "anexoId": "e65adb99-9db1-4e16-ac91-09b8766b9355",
      "sha256": "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.24851410329565254,
        "y": 0.19294681275166592,
        "width": 0.02121778757922982,
        "height": 0.014596993075104842
       }
      ],
      "trecho": "Lote: F7 Quadra: 12",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S04",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/05/RESOLUCAO-N.-52-2021.pdf",
      "local": "art.4 VIII-XI",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "pp.1-3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Campos extraídos com confiança",
    "condicoesPendentes": [],
    "camposUsados": [
     "e65adb99-9db1-4e16-ac91-09b8766b9355:matricula",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:matricula",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:matricula",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:lote",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:lote",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:lote",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:lote",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:quadra",
     "c60f2b5b-4c8a-4e2a-89de-7f52f28ef834:quadra",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:quadra",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:quadra",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:inscricao",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:inscricao",
     "e65adb99-9db1-4e16-ac91-09b8766b9355:bairro",
     "f06d1897-8468-4ebf-9cd1-4bfbde49c7ba:bairro",
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:bairro"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-021",
    "regraVersao": "AQR-GCA-021@1.0-review+fd9b3e3b9db5",
    "nome": "Datas de revisão planta memorial",
    "resultado": "nao-avaliavel",
    "severidade": "minor",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas de revisão não comparadas: falta uma das peças.",
    "motivo": "Planta e memorial não estão ambos entre os anexos classificados.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.2 campo Data",
      "membroDoPacote": null
     },
     {
      "fonte": "A01",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2012/07/MANUAL-DE-ORIENTACAO-AO-PROFISSIONAL-PARA-APRESENTACAO-DE-PROJETOS-CARTOGRAFICOS.docx",
      "local": "p.13 item 2.3",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Ambas as peças na etapa",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-022",
    "regraVersao": "AQR-GCA-022@1.0-review+fd9b3e3b9db5",
    "nome": "Escala da situação",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). A planta de situação declara 1:10.000.",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.16044962279330144,
        "y": 0.29034671060055356,
        "width": 0.03604443457514156,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Planta de situação - escala 1:10.000",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:escala-situacao"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-023",
    "regraVersao": "AQR-GCA-023@1.0-review+fd9b3e3b9db5",
    "nome": "Carimbo e formato da prancha",
    "resultado": "sem-achado",
    "severidade": "review",
    "confianca": "media",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Prancha em formato permitido pelo TR n.º 002 (A3, A2, A1).",
    "evidencias": [
     {
      "anexoId": "035bd8b0-8045-4ca9-bfbb-22d7439d30c8",
      "sha256": "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
      "pagina": 1,
      "regioes": [
       {
        "x": 0.0841376586890419,
        "y": 0.3146966850627755,
        "width": 0.011166192472186129,
        "height": 0.014596993075104814
       }
      ],
      "trecho": "Formato A3 Data: 01/11/2026",
      "origem": "camada-de-texto"
     }
    ],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S06",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/1.-TERMO-DE-REFERENCIA-N.-01-GFCG-MODALIDADE-LOTEAMENTO.pdf",
      "local": "p.3 VIII",
      "membroDoPacote": null
     },
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "p.4 VII",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Formatos permitidos: A3, A2, A1 (S07, p. 4, item VII).",
     "Presença e conteúdo do carimbo não são verificados."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Prancha legível",
    "condicoesPendentes": [],
    "camposUsados": [
     "035bd8b0-8045-4ca9-bfbb-22d7439d30c8:formato-folha"
    ],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-028",
    "regraVersao": "AQR-GCA-028@1.0-review+fd9b3e3b9db5",
    "nome": "GDU desdobro maior que dois hectares",
    "resultado": "condicao-pendente",
    "severidade": "review",
    "confianca": "baixa",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Regra aguardando confirmação de servidor (area-situacao-acima-2ha). Pré-condição do catálogo: \"Área da situação pertinente >20.000 m² confirmada por servidor\".",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "p.4 IX",
      "membroDoPacote": null
     },
     {
      "fonte": "L03",
      "url": "https://gerencialleisweb.campogrande.ms.gov.br/api/documentos/visualizar/36601?tipo=consolidado",
      "local": "art.22 I",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Sem a confirmação, a regra não é executada."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Área da situação pertinente >20.000 m² confirmada por servidor",
    "condicoesPendentes": [
     "area-situacao-acima-2ha"
    ],
    "camposUsados": [],
    "recalculada": true,
    "origemAnalise": null,
    "revisoes": []
   },
   {
    "regraId": "AQR-GCA-043",
    "regraVersao": "AQR-GCA-043@1.0-review+fd9b3e3b9db5",
    "nome": "Validação de formato do arquivo",
    "resultado": "sem-achado",
    "severidade": "minor",
    "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Os anexos abrem e têm formato compatível com o requisito em que foram classificados.",
    "evidencias": [],
    "valoresConflitantes": [],
    "fundamentos": [
     {
      "fonte": "S07",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/2.-TERMO-DE-REFERENCIA-%E2%80%93-002-%E2%80%93-GFCG-MODALIDADE-REMEMBRAMENTO-DESDOBRO-E-DESMEMBRAMENTO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     },
     {
      "fonte": "S08",
      "url": "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/24/2024/04/3.-TERMO-DE-REFERENCIA-%E2%80%93-003-%E2%80%93-GFCG-MODALIDADE-RETIFICACAO-DE-REGISTRO-IMOBILIARIO.pdf",
      "local": "pp.3-4",
      "membroDoPacote": null
     }
    ],
    "limitacoes": [
     "Anexo sem classe não tem requisito de formato a conferir."
    ],
    "revisaoHumana": "Servidor GCA valida achado e comunicação",
    "aplicacao": "Anexo classificado em requisito com formato expresso",
    "condicoesPendentes": [],
    "camposUsados": [],
    "recalculada": false,
    "origemAnalise": 1,
    "revisoes": []
   }
  ]
 },
 "completoDetalhe": {
  "triagem": {
   "id": "f0ae3c41-e2f7-4b6f-b460-46ee8004e2a4",
   "referencia": "SINTETICO-001",
   "modo": "experimental-sintetico",
   "situacao": "aguardando-revisao",
   "versao": 4,
   "analiseAtual": 2,
   "protocoladoEm": "2026-11-05T13:00:00.000Z",
   "criadaEm": "2026-11-13T00:19:43.881Z",
   "atualizadaEm": "2026-11-13T00:19:44.325Z",
   "retencaoAte": "2026-11-16T00:19:43.883Z",
   "criadaPorMim": true,
   "modalidade": "D",
   "etapa": "abertura",
   "ultimaAnalise": {
    "numero": 2,
    "situacao": "concluida",
    "encerradaEm": "2026-11-13T00:19:44.325Z"
   },
   "achados": 2,
   "pendentesRevisao": 2,
   "condicoesPendentes": 1,
   "naoAvaliaveis": 1
  },
  "natureza": "verificacao-tecnica-experimental",
  "aviso": "Verificação técnica experimental com catálogo não homologado pela GCA, para revisão de servidor. Não é decisão administrativa e não deve ser enviada ao requerente sem revisão.",
  "enquadramento": {
   "modalidade": {
    "valor": "D",
    "origem": "declarado"
   },
   "etapa": {
    "valor": "abertura",
    "origem": "declarado"
   },
   "integridadeDoPacote": {
    "valor": "completo",
    "origem": "confirmado-servidor",
    "confirmadoPor": "1945b860-f911-473e-bb82-faba08598786",
    "confirmadoEm": "2026-11-13T00:19:44.315Z"
   },
   "condicoes": []
  },
  "analises": [
   {
    "numero": 1,
    "motivo": "inicial",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
     "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
     "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79"
    ],
    "baseAnalise": null,
    "iniciadaEm": "2026-11-13T00:19:43.883Z",
    "encerradaEm": "2026-11-13T00:19:44.280Z",
    "falha": null
   },
   {
    "numero": 2,
    "motivo": "reprocessamento",
    "situacao": "concluida",
    "motorVersao": "aqr-triagem@6.1.0",
    "catalogo": {
     "versao": "1.0-review",
     "sha256": "fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb"
    },
    "anexosSha256": [
     "3e9dbe52f055c54a6be10dcd49dc3cd701da7b4637e5ea5f5a10d02a521afe4c",
     "cb9bd83ec5dd730dbf873f6d6bcf9870f2b7d1aa7aac76c1666cc45f310b1cf7",
     "2596a64ad52eac5e2969f3fbd2b0c1182d65b3a0f9c1ecc3ad33a3dd00c0110e",
     "0e61e86b465bee8ac2cb8e58c9cebe86f5b8fe5598aa3f0b75aca96225425fbd",
     "f7d2509b6e191e9676c3253ff59d614e1197a023748dcaba2ef07c7190816ad3",
     "b565cc7469096c14cacb580251e2b5c50d1b207de32e7fbd3a5e9da3021a59ca",
     "64e10740736618864aaac14fb8a77dd17305d7cddc5532e31a6e2cc96a967b79"
    ],
    "baseAnalise": 1,
    "iniciadaEm": "2026-11-13T00:19:44.321Z",
    "encerradaEm": "2026-11-13T00:19:44.325Z",
    "falha": null
   }
  ],
  "confirmacoes": [
   {
    "id": "ff3e8eea-e23a-47b8-9882-30f4845e197f",
    "tipo": "integridade",
    "chave": "integridade",
    "valor": "completo",
    "justificativa": "Conferido com o protocolo sintético.",
    "autor": "ana.analista",
    "em": "2026-11-13T00:19:44.315Z"
   }
  ],
  "revisoes": []
 },
 "listaDuas": {
  "itens": [
   {
    "id": "f0ae3c41-e2f7-4b6f-b460-46ee8004e2a4",
    "referencia": "SINTETICO-001",
    "modo": "experimental-sintetico",
    "situacao": "aguardando-revisao",
    "versao": 4,
    "analiseAtual": 2,
    "protocoladoEm": "2026-11-05T13:00:00.000Z",
    "criadaEm": "2026-11-13T00:19:43.881Z",
    "atualizadaEm": "2026-11-13T00:19:44.325Z",
    "retencaoAte": "2026-11-16T00:19:43.883Z",
    "criadaPorMim": true,
    "modalidade": "D",
    "etapa": "abertura",
    "ultimaAnalise": {
     "numero": 2,
     "situacao": "concluida",
     "encerradaEm": "2026-11-13T00:19:44.325Z"
    },
    "achados": 2,
    "pendentesRevisao": 2,
    "condicoesPendentes": 1,
    "naoAvaliaveis": 1
   }
  ],
  "total": 1
 }
}
