"""Segunda leitura de OCR com modelos PP-OCR do PaddleOCR (RapidOCR + onnxruntime, só CPU, local).

Usada só pela bancada da IA documental (scripts/ia-local/bancada). Não é parte do servidor.
Ambiente: ~/.aqr-ia/ocr-paddle (fora do Git). Os modelos são baixados uma vez, com rede; depois a
leitura roda dentro do sandbox sem rede.

Uso: python paddle-ocr.py <imagem.png>
Saída (stdout, JSON): mesmo formato do vision-ocr: linhas com texto, confiança e palavras com
caixa normalizada (0-1, origem no canto superior esquerdo).
"""
import json
import sys

from PIL import Image
from rapidocr import LangRec, ModelType, OCRVersion, RapidOCR


def main() -> int:
    if len(sys.argv) != 2:
        print("uso: paddle-ocr.py <imagem.png>", file=sys.stderr)
        return 2
    caminho = sys.argv[1]
    largura, altura = Image.open(caminho).size
    motor = RapidOCR(params={"Rec.lang_type": LangRec.LATIN, "Rec.ocr_version": OCRVersion.PPOCRV5, "Rec.model_type": ModelType.MOBILE, "Global.log_level": "critical"})
    resultado = motor(caminho, return_word_box=True)
    linhas = []
    caixas = resultado.boxes if resultado.boxes is not None else []
    textos = resultado.txts or ()
    notas = resultado.scores or ()
    palavras_por_linha = resultado.word_results or ()
    for indice, texto in enumerate(textos):
        palavras = []
        for item in (palavras_por_linha[indice] if indice < len(palavras_por_linha) else ()):
            palavra, _nota, caixa = item
            xs = [p[0] for p in caixa]
            ys = [p[1] for p in caixa]
            palavras.append({"texto": palavra, "x": min(xs) / largura, "y": min(ys) / altura, "largura": (max(xs) - min(xs)) / largura, "altura": (max(ys) - min(ys)) / altura})
        if not palavras and indice < len(caixas):
            xs = [p[0] for p in caixas[indice]]
            ys = [p[1] for p in caixas[indice]]
            palavras.append({"texto": texto, "x": min(xs) / largura, "y": min(ys) / altura, "largura": (max(xs) - min(xs)) / largura, "altura": (max(ys) - min(ys)) / altura})
        linhas.append({"texto": texto, "confianca": float(notas[indice]) if indice < len(notas) else 0.0, "palavras": palavras})
    json.dump({"linhas": linhas}, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
