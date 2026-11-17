// Segunda leitura de OCR com o Vision da Apple (local, no próprio macOS, sem rede nem download).
// Usada só pela bancada da IA documental (scripts/ia-local/bancada). Não é parte do servidor.
//
// Uso: vision-ocr <imagem.png>
// Saída (stdout, JSON): { "linhas": [ { "texto", "confianca", "palavras": [ { "texto", "x", "y", "largura", "altura" } ] } ] }
// Coordenadas normalizadas (0–1), origem no canto SUPERIOR esquerdo, como no resto do AQR.
//
// Correção de idioma DESLIGADA: ela "corrige" palavras pelo dicionário e pode trocar dígitos,
// o que seria inventar valor. Reconhecimento em modo preciso, português do Brasil.
import Foundation
import Vision

struct Palavra: Encodable { let texto: String; let x: Double; let y: Double; let largura: Double; let altura: Double }
struct Linha: Encodable { let texto: String; let confianca: Double; let palavras: [Palavra] }
struct Saida: Encodable { let linhas: [Linha] }

guard CommandLine.arguments.count == 2 else {
  FileHandle.standardError.write("uso: vision-ocr <imagem.png>\n".data(using: .utf8)!)
  exit(2)
}
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let pedido = VNRecognizeTextRequest()
pedido.recognitionLevel = .accurate
pedido.recognitionLanguages = ["pt-BR"]
pedido.usesLanguageCorrection = false
pedido.minimumTextHeight = 0

do {
  try VNImageRequestHandler(url: url, options: [:]).perform([pedido])
} catch {
  FileHandle.standardError.write("falha no reconhecimento\n".data(using: .utf8)!)
  exit(1)
}

func caixa(_ r: CGRect) -> (Double, Double, Double, Double) {
  (Double(r.minX), Double(1 - r.maxY), Double(r.width), Double(r.height))
}

var linhas: [Linha] = []
for observacao in pedido.results ?? [] {
  guard let melhor = observacao.topCandidates(1).first else { continue }
  let texto = melhor.string
  var palavras: [Palavra] = []
  // Palavras = trechos entre espaços ("486,75" fica inteiro, como no resto do AQR).
  var inicio = texto.startIndex
  while inicio < texto.endIndex {
    while inicio < texto.endIndex, texto[inicio].isWhitespace { inicio = texto.index(after: inicio) }
    guard inicio < texto.endIndex else { break }
    var fim = inicio
    while fim < texto.endIndex, !texto[fim].isWhitespace { fim = texto.index(after: fim) }
    if let retangulo = try? melhor.boundingBox(for: inicio..<fim)?.boundingBox {
      let (x, y, w, h) = caixa(retangulo)
      palavras.append(Palavra(texto: String(texto[inicio..<fim]), x: x, y: y, largura: w, altura: h))
    }
    inicio = fim
  }
  linhas.append(Linha(texto: texto, confianca: Double(melhor.confidence), palavras: palavras))
}
let codificador = JSONEncoder()
FileHandle.standardOutput.write(try! codificador.encode(Saida(linhas: linhas)))
