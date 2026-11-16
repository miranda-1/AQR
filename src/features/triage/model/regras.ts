/**
 * Títulos e explicações das regras escritos para o servidor que usa a tela. São texto de interface:
 * o catálogo normativo (`docs/triagem/catalogo/regras_aqr_gca.json`) não muda, e a tela sempre
 * mostra junto o ID AQR-GCA, o título original, a versão, a fonte e a condição de aplicação.
 * Cada explicação resume o campo `logic` do catálogo, sem acrescentar exigência.
 */
export interface RegraLegivel {
  titulo: string
  explicacao: string
}

export const regrasLegiveis: Readonly<Record<string, RegraLegivel>> = {
  'AQR-GCA-001': {
    titulo: 'O assunto do requerimento é reconhecível',
    explicacao: 'Confere se o assunto do protocolo pode ser identificado. Se não puder, a modalidade fica indeterminada; o nome do arquivo nunca é usado para deduzi-la.',
  },
  'AQR-GCA-002': {
    titulo: 'Há um requerimento entre os anexos',
    explicacao: 'Procura um anexo que seja o requerimento. Se nenhum for reconhecido, aponta a ausência provável para conferência.',
  },
  'AQR-GCA-003': {
    titulo: 'A DRT anexada é a DRT 01',
    explicacao: 'Para remembramento, desdobro e desmembramento, espera a DRT 01. Outra DRT (como a 03) não a substitui.',
  },
  'AQR-GCA-006': {
    titulo: 'Cada lote tem documento de inscrição imobiliária',
    explicacao: 'Para cada lote declarado, procura ficha cadastral, IPTU, extrato ou similar. A falta é um alerta, não uma conclusão sobre o cadastro.',
  },
  'AQR-GCA-008': {
    titulo: 'Cada imóvel tem título registral (matrícula)',
    explicacao: 'Procura o título registral de cada imóvel de origem declarado e cita os imóveis quando algum não é localizado.',
  },
  'AQR-GCA-009': {
    titulo: 'Data de emissão da matrícula, para conferência do prazo',
    explicacao: 'Mostra a data de emissão do título e a do protocolo. A contagem dos 30 dias não é decidida automaticamente: fica sempre para o servidor.',
  },
  'AQR-GCA-010': {
    titulo: 'Prova de representação, quando um terceiro assina',
    explicacao: 'Só se aplica quando quem assina não é o titular aparente ou declara representação. Nesse caso, procura documento de representação, sem julgar os poderes.',
  },
  'AQR-GCA-011': {
    titulo: 'Há ART, RRT ou documento equivalente do projeto',
    explicacao: 'Procura um documento oficial de responsabilidade técnica. Se nenhum for reconhecido, alerta.',
  },
  'AQR-GCA-012': {
    titulo: 'Planta em PDF e desenho em DWG ou DXF',
    explicacao: 'Espera a planta em PDF e ao menos um arquivo DWG ou DXF. O arquivo CAD não é aberto: conta o formato real.',
  },
  'AQR-GCA-013': {
    titulo: 'Memorial descritivo em PDF',
    explicacao: 'Procura o memorial em PDF. Um memorial só em DOCX não atende ao formato expresso.',
  },
  'AQR-GCA-016': {
    titulo: 'Assinatura do responsável técnico na planta e no memorial',
    explicacao: 'Aponta campo de assinatura nitidamente vazio para verificação. Assinatura eletrônica depende de validador e não é julgada aqui.',
  },
  'AQR-GCA-018': {
    titulo: 'Dados da ART ou RRT batem com o requerimento e a matrícula',
    explicacao: 'Compara os campos exigidos pela Resolução 52 (assunto, titular, RT, lote, quadra, bairro, parcelamento, matrícula). Diferença ou campo não lido vira revisão, nunca suspeita de falsidade.',
  },
  'AQR-GCA-019': {
    titulo: 'O assunto é o mesmo em todos os documentos',
    explicacao: 'Se os documentos citam assuntos diferentes, mostra os pares e as páginas. A modalidade nunca é mudada sozinha.',
  },
  'AQR-GCA-020': {
    titulo: 'Os documentos descrevem o mesmo imóvel',
    explicacao: 'Compara lote, quadra, matrícula e inscrição entre os documentos, depois de uma normalização cuidadosa, e mostra as diferenças que persistem.',
  },
  'AQR-GCA-021': {
    titulo: 'Planta e memorial têm a mesma data de revisão',
    explicacao: 'Alerta quando as datas são diferentes e inequívocas. Data ambígua deixa a verificação inconclusiva.',
  },
  'AQR-GCA-022': {
    titulo: 'A planta de situação está na escala 1:10.000',
    explicacao: 'Confere a escala escrita na planta de situação. A escala não é medida pelo desenho.',
  },
  'AQR-GCA-023': {
    titulo: 'Formato da folha e carimbo da prancha',
    explicacao: 'Confere se a folha está num formato permitido pelo termo de referência e se há carimbo. Medidas exatas do layout são técnicas e não são feitas aqui.',
  },
  'AQR-GCA-028': {
    titulo: 'Guia de diretrizes urbanísticas (GDU) para área acima de 2 ha',
    explicacao: 'Só roda depois que um servidor confirmar que a área da situação passa de 2 hectares. A área lida nos documentos é só informação e não ativa a regra sozinha.',
  },
  'AQR-GCA-043': {
    titulo: 'Formato real de cada arquivo',
    explicacao: 'Compara o formato real do arquivo com o exigido (PDF ou JPG para documentos; PDF e DWG/DXF para a prancha). Arquivo corrompido é tratado como ilegível.',
  },
}

/** Título legível; sem entrada no mapa, o título original do catálogo. */
export function tituloDaRegra(regraId: string, nomeOriginal: string): string {
  return regrasLegiveis[regraId]?.titulo ?? nomeOriginal
}
