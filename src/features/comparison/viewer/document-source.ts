import type { SimulatedDocument } from './simulated-document'

/**
 * De onde vêm as páginas exibidas no visualizador: o documento fictício do modo demonstrativo,
 * ou o PDF que a pessoa escolheu (mantido só na memória do navegador).
 */
export type DocumentSource = { kind: 'simulated'; document: SimulatedDocument } | { kind: 'pdf'; file: File }
