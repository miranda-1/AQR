import type { Raster } from '../pdf/render.ts'
import { diffRasters, inkColor } from './raster-diff.ts'

function blankRaster(width = 200, height = 200): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) }
}

function paint(raster: Raster, left: number, top: number, width: number, height: number, color: [number, number, number] = [0, 0, 0], alpha = 1) {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const index = (y * raster.width + x) * 4
      for (let channel = 0; channel < 3; channel += 1) {
        const current = raster.data[index + channel] ?? 255
        raster.data[index + channel] = Math.round(current * (1 - alpha) + (color[channel] ?? 0) * alpha)
      }
    }
  }
}

describe('diffRasters', () => {
  it('páginas iguais: nenhuma região', () => {
    const a = blankRaster()
    paint(a, 20, 20, 60, 10)
    const b = blankRaster()
    paint(b, 20, 20, 60, 10)
    expect(diffRasters(a, b).regions).toEqual([])
  })

  it('traço novo vira uma região, só no atualizado', () => {
    const a = blankRaster()
    const b = blankRaster()
    paint(b, 100, 120, 40, 20)
    const { regions } = diffRasters(a, b)
    expect(regions).toHaveLength(1)
    const [region] = regions
    expect(region?.inkOriginal).toBe(0)
    expect(region?.inkUpdated).toBeGreaterThan(0.5)
    expect(region?.updated.x).toBeCloseTo(0.5, 1)
  })

  it('borda deslocada por fração de pixel (serrilhado) não é diferença', () => {
    const a = blankRaster()
    paint(a, 20, 20, 60, 10)
    const b = blankRaster()
    paint(b, 20, 20, 60, 10)
    paint(b, 80, 20, 1, 10, [0, 0, 0], 0.5)
    paint(a, 19, 20, 1, 10, [0, 0, 0], 0.4)
    expect(diffRasters(a, b).regions).toEqual([])
  })

  it('página inteira deslocada é alinhada antes da comparação', () => {
    const a = blankRaster()
    paint(a, 20, 20, 60, 10)
    paint(a, 30, 100, 80, 12)
    const b = blankRaster()
    paint(b, 25, 26, 60, 10)
    paint(b, 35, 106, 80, 12)
    const diff = diffRasters(a, b)
    expect(diff.shift).toEqual({ dx: 5, dy: 6 })
    expect(diff.regions).toEqual([])
  })

  it('duas mudanças distantes viram duas regiões, não uma enorme', () => {
    const a = blankRaster()
    const b = blankRaster()
    paint(b, 10, 10, 20, 10)
    paint(b, 150, 170, 20, 10)
    expect(diffRasters(a, b).regions).toHaveLength(2)
  })

  it('pontos soltos de sujeira são descartados', () => {
    const a = blankRaster()
    const b = blankRaster()
    paint(b, 50, 50, 1, 1)
    paint(b, 120, 140, 2, 1)
    expect(diffRasters(a, b).regions).toEqual([])
  })
})

describe('inkColor', () => {
  it('mede a cor pelo miolo do traço, sem se deixar levar por um traço fino de outra cor', () => {
    const raster = blankRaster()
    paint(raster, 10, 10, 30, 12, [0, 0, 0])
    paint(raster, 10, 15, 30, 1, [200, 0, 0])
    const color = inkColor(raster, { x: 0.05, y: 0.05, width: 0.15, height: 0.06 })
    expect(color?.[0]).toBeLessThan(30)
    paint(raster, 10, 10, 30, 12, [204, 0, 0])
    expect(inkColor(raster, { x: 0.05, y: 0.05, width: 0.15, height: 0.06 })?.[0]).toBeGreaterThan(150)
  })
})
