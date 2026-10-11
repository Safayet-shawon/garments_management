import { describe, expect, it } from 'vitest'
import { apportion, hungarian, identity, matmul, matvec, transpose, vecmat, type Matrix } from '../shared/matrix'
import { assignLines, mrp, rankSuppliers, sizeColorMatrix } from '../shared/planning'

describe('matrix toolkit', () => {
  it('multiplies, transposes and applies identity', () => {
    const A = [[1, 2, 3], [4, 5, 6]]
    expect(matmul(A, transpose(A))).toEqual([[14, 32], [32, 77]])
    expect(matmul(A, identity(3))).toEqual(A)
    expect(matvec(A, [1, 0, 2])).toEqual([7, 16])
    expect(vecmat([1, 2], A)).toEqual([9, 12, 15])
  })
  it('rejects incompatible shapes', () => {
    expect(() => matmul([[1, 2]], [[1, 2]])).toThrow(/Cannot multiply/)
    expect(() => matvec([[1, 2]], [1])).toThrow()
  })
  it('apportions exactly to the requested total', () => {
    for (const total of [0, 1, 7, 100, 4999, 5000]) {
      const out = apportion([1, 2, 2, 1, 0.5], total)
      expect(out.reduce((s, x) => s + x, 0)).toBe(total)
      expect(out.every((x) => Number.isInteger(x) && x >= 0)).toBe(true)
    }
  })
})

// brute force minimum-cost assignment for small matrices
function brute(cost: Matrix): number {
  const n = cost.length, m = cost[0].length
  let best = Infinity
  const used = new Array(m).fill(false)
  const rec = (i: number, acc: number, assigned: number) => {
    if (i === n) { if (assigned === Math.min(n, m)) best = Math.min(best, acc); return }
    if (n > m) rec(i + 1, acc, assigned) // row may stay unassigned when there are more rows than columns
    for (let j = 0; j < m; j++) if (!used[j]) { used[j] = true; rec(i + 1, acc + cost[i][j], assigned + 1); used[j] = false }
  }
  rec(0, 0, 0)
  return best
}

describe('hungarian', () => {
  it('matches brute force on random rectangular matrices', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
    for (let t = 0; t < 120; t++) {
      const n = 1 + Math.floor(rnd() * 5), m = 1 + Math.floor(rnd() * 5)
      const cost = Array.from({ length: n }, () => Array.from({ length: m }, () => Math.round(rnd() * 50)))
      const a = hungarian(cost)
      const got = a.reduce((s, j, i) => s + (j >= 0 ? cost[i][j] : 0), 0)
      expect(got).toBe(brute(cost))
      const cols = a.filter((j) => j >= 0)
      expect(new Set(cols).size).toBe(cols.length) // no column used twice
    }
  })
})

describe('mrp', () => {
  it('reproduces the 5,000 piece T-shirt requirement from the spec', () => {
    const r = mrp({
      styles: [{ id: 'p1', name: 'Premium Cotton T-Shirt' }],
      materials: [
        { id: 'm1', name: 'Cotton Fabric', unit: 'kg', stock: 4800, price: 595 },
        { id: 'm5', name: 'Black Thread', unit: 'm', stock: 80000, price: 0.35 },
        { id: 'm7', name: 'Neck Label', unit: 'pcs', stock: 4500, price: 3.5 },
        { id: 'm10', name: 'Poly Bag', unit: 'pcs', stock: 10000, price: 5 },
      ],
      bom: [[1.2, 15, 1, 1]], qty: [5000],
    })
    expect(r.gross).toEqual([6000, 75000, 5000, 5000])
    expect(r.shortage).toEqual([1200, 0, 500, 0])
    expect(r.totals.shortMaterials).toBe(2)
    expect(r.totals.purchaseCost).toBe(1200 * 595 + 500 * 3.5)
    expect(r.rows.map((x) => x.status)).toEqual(['Short', 'Ready', 'Short', 'Ready'])
  })
  it('adds up several styles and applies waste', () => {
    const r = mrp({
      styles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      materials: [{ id: 'f', name: 'Fabric', unit: 'kg', stock: 100, onOrder: 50, price: 10, wastePct: 10 }],
      bom: [[1], [2]], qty: [100, 50],
    })
    expect(r.gross).toEqual([220]) // (100*1 + 50*2) * 1.1
    expect(r.contribution).toEqual([[110], [110]])
    expect(r.shortage).toEqual([70])
    expect(() => mrp({ styles: [{ id: 'a', name: 'A' }], materials: [], bom: [[1]], qty: [1] })).toThrow()
  })
})

describe('line assignment', () => {
  const lines = [
    { id: 'A', name: 'Line A', operators: 40, efficiency: 0.8, hoursPerDay: 9, specialty: ['tee'] },
    { id: 'B', name: 'Line B', operators: 36, efficiency: 0.75, hoursPerDay: 9, specialty: ['polo'] },
    { id: 'C', name: 'Line C', operators: 44, efficiency: 0.7, hoursPerDay: 9, specialty: ['hoodie'] },
  ]
  const jobs = [
    { id: 'J1', label: 'Hoodies', qty: 1500, sam: 22, category: 'hoodie', dueInDays: 20 },
    { id: 'J2', label: 'Tees', qty: 5000, sam: 7.5, category: 'tee', dueInDays: 14 },
    { id: 'J3', label: 'Polos', qty: 2200, sam: 11, category: 'polo', dueInDays: 18 },
  ]
  it('matches each job to the specialist line and never loses to the naive pairing', () => {
    const r = assignLines({ lines, jobs })
    expect(r.assignment).toEqual([1, 2, 0]) // A→tees, B→polos, C→hoodies
    expect(r.optimalCost).toBeLessThanOrEqual(r.baselineCost)
    expect(r.savingsPct).toBeGreaterThan(0)
  })
  it('queues surplus jobs behind the line that frees up first', () => {
    const r = assignLines({ lines: lines.slice(0, 2), jobs })
    expect(r.schedule.reduce((s, l) => s + l.jobs.length, 0)).toBe(3)
    expect(r.unassignedBeforeQueue).toHaveLength(1)
  })
})

describe('supplier ranking (TOPSIS)', () => {
  it('prefers the dominant supplier and keeps scores in [0,1]', () => {
    const r = rankSuppliers(
      [{ id: 's1', name: 'Good', values: { price: 90, quality: 5, lead: 7 } }, { id: 's2', name: 'Poor', values: { price: 120, quality: 3, lead: 21 } }, { id: 's3', name: 'Mid', values: { price: 100, quality: 4, lead: 12 } }],
      [{ key: 'price', label: 'Price', weight: 5, benefit: false }, { key: 'quality', label: 'Quality', weight: 3, benefit: true }, { key: 'lead', label: 'Lead time', weight: 2, benefit: false }],
    )
    expect(r.ranking.map((x) => x.id)).toEqual(['s1', 's3', 's2'])
    expect(r.ranking.every((x) => x.score >= 0 && x.score <= 1)).toBe(true)
    expect(r.ranking[0].score).toBe(1)
  })
})

describe('size × colour matrix', () => {
  it('splits a 5,000 pc order exactly and sums fabric from the cut plan', () => {
    const r = sizeColorMatrix({ total: 5000, sizes: ['S', 'M', 'L', 'XL', 'XXL'], ratio: [1, 2, 2, 1, 0.5], colors: ['Green', 'White', 'Black'], colorShare: [40, 30, 30], consumptionKg: [1.1, 1.2, 1.3, 1.4, 1.5], piecesPerCarton: 48, cuttingAllowancePct: 3 })
    expect(r.grandTotal).toBe(5000)
    expect(r.rowTotals).toEqual([2000, 1500, 1500])
    expect(r.colTotals.reduce((s, x) => s + x, 0)).toBe(5000)
    expect(r.cutTotal).toBeGreaterThanOrEqual(5150)
    expect(r.cartonsTotal).toBe(105)
    expect(r.fabricKg).toBeGreaterThan(6000)
  })
})
