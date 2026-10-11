// Garment-factory planning engine built on the matrix toolkit.
//  1. mrp()           – material requirement planning: gross = qᵀ·B, shortage vs stock, purchase cost
//  2. assignLines()   – order → sewing-line assignment with the Hungarian method
//  3. rankSuppliers() – weighted TOPSIS decision matrix
//  4. sizeColorMatrix() – buyer-order size × colour breakdown with exact totals, cut plan and fabric need
import { apportion, colSums, diag, dot, hungarian, matmul, rowSums, roundTo, sum, vecmat, type Matrix } from './matrix'

// ---------- 1. MRP ----------
export interface MrpInput {
  styles: { id: string; name: string }[]
  materials: { id: string; name: string; unit: string; stock: number; onOrder?: number; price: number; wastePct?: number }[]
  /** styles × materials, quantity of each material per finished piece */
  bom: Matrix
  /** pieces to make per style */
  qty: number[]
}
export interface MrpResult {
  gross: number[]; net: number[]; shortage: number[]; cost: number[]; coverage: number[]
  contribution: Matrix // styles × materials: pieces × bom × (1 + waste)
  totals: { pieces: number; purchaseCost: number; shortMaterials: number; materialCost: number }
  rows: { id: string; name: string; unit: string; required: number; available: number; shortage: number; purchaseCost: number; status: 'Ready' | 'Short' }[]
}
export function mrp(inp: MrpInput): MrpResult {
  const { styles, materials, bom, qty } = inp
  if (bom.length !== styles.length || qty.length !== styles.length) throw new Error('bom/qty must have one row per style')
  if (bom.some((r) => r.length !== materials.length)) throw new Error('bom must have one column per material')
  const waste = materials.map((m) => 1 + (m.wastePct ?? 0) / 100)
  const rawNeed = vecmat(qty, bom) // qᵀ·B
  const gross = rawNeed.map((x, j) => x * waste[j])
  const contribution = matmul(matmul(diag(qty), bom), diag(waste)) // diag(q)·B·diag(1+w)
  const avail = materials.map((m) => m.stock + (m.onOrder ?? 0))
  const shortage = gross.map((g, j) => Math.max(0, g - avail[j]))
  const net = shortage
  const cost = shortage.map((s, j) => s * materials[j].price)
  const coverage = gross.map((g, j) => (g === 0 ? 1 : Math.min(1, avail[j] / g)))
  return {
    gross: gross.map((x) => roundTo(x)), net: net.map((x) => roundTo(x)), shortage: shortage.map((x) => roundTo(x)), cost: cost.map((x) => roundTo(x)), coverage: coverage.map((x) => roundTo(x, 3)),
    contribution: contribution.map((r) => r.map((x) => roundTo(x))),
    totals: { pieces: sum(qty), purchaseCost: roundTo(sum(cost)), shortMaterials: shortage.filter((x) => x > 1e-9).length, materialCost: roundTo(dot(gross, materials.map((m) => m.price))) },
    rows: materials.map((m, j) => ({ id: m.id, name: m.name, unit: m.unit, required: roundTo(gross[j]), available: roundTo(avail[j]), shortage: roundTo(shortage[j]), purchaseCost: roundTo(cost[j]), status: shortage[j] > 1e-9 ? 'Short' : 'Ready' })),
  }
}

// ---------- 2. Line assignment ----------
export interface LineInput { id: string; name: string; operators: number; efficiency: number; hoursPerDay: number; specialty: string[] }
export interface JobInput { id: string; label: string; qty: number; sam: number; category: string; dueInDays: number }
export interface AssignInput { lines: LineInput[]; jobs: JobInput[]; changeoverDays?: number; latePenalty?: number }
export interface AssignResult {
  days: Matrix; cost: Matrix
  /** per line: chosen job index or -1 */
  assignment: number[]
  schedule: { lineId: string; lineName: string; jobs: { id: string; label: string; days: number; startDay: number; endDay: number; late: number }[]; finishDay: number }[]
  optimalCost: number; baselineCost: number; savingsPct: number; unassignedBeforeQueue: string[]
  makespan: number; lateJobs: number
}
export function assignLines(inp: AssignInput): AssignResult {
  const { lines, jobs } = inp
  const changeover = inp.changeoverDays ?? 1.5
  const penalty = inp.latePenalty ?? 4
  if (!lines.length || !jobs.length) throw new Error('Need at least one line and one job')
  // D[i][j] = workload minutes / (60 · operators · efficiency · hours/day) = days for line i to finish job j
  const days = lines.map((l) => jobs.map((j) => {
    const capacityPerDay = 60 * Math.max(1, l.operators) * Math.max(0.05, l.efficiency) * Math.max(1, l.hoursPerDay)
    return (j.qty * j.sam) / capacityPerDay + (l.specialty.includes(j.category) ? 0 : changeover)
  }))
  const cost = days.map((row) => row.map((d, j) => d + penalty * Math.max(0, d - jobs[j].dueInDays)))
  const assignment = hungarian(cost)
  const optimalCost = assignment.reduce((s, j, i) => s + (j >= 0 ? cost[i][j] : 0), 0)
  const n = Math.min(lines.length, jobs.length)
  // naive baseline: job k goes to line k in the order they arrived
  const baselineCost = Array.from({ length: n }, (_, k) => cost[k][k]).reduce((s, x) => s + x, 0)
  // Hungarian only matches one job per line; surplus jobs queue behind the line that frees up first.
  const queue: Record<number, number[]> = {}
  lines.forEach((_, i) => { queue[i] = assignment[i] >= 0 ? [assignment[i]] : [] })
  const assignedJobs = new Set(assignment.filter((j) => j >= 0))
  const unassigned = jobs.map((_, j) => j).filter((j) => !assignedJobs.has(j)).sort((a, b) => jobs[a].dueInDays - jobs[b].dueInDays)
  const finish = lines.map((_, i) => queue[i].reduce((s, j) => s + days[i][j], 0))
  for (const j of unassigned) {
    let best = 0, bestF = Number.POSITIVE_INFINITY
    lines.forEach((_, i) => { const f = finish[i] + days[i][j]; if (f < bestF) { bestF = f; best = i } })
    queue[best].push(j); finish[best] = bestF
  }
  let late = 0
  const schedule = lines.map((l, i) => {
    let t = 0
    const js = queue[i].map((j) => { const d = days[i][j]; const startDay = t; t += d; const lateBy = Math.max(0, t - jobs[j].dueInDays); if (lateBy > 0) late++; return { id: jobs[j].id, label: jobs[j].label, days: roundTo(d), startDay: roundTo(startDay), endDay: roundTo(t), late: roundTo(lateBy) } })
    return { lineId: l.id, lineName: l.name, jobs: js, finishDay: roundTo(t) }
  })
  return {
    days: days.map((r) => r.map((x) => roundTo(x))), cost: cost.map((r) => r.map((x) => roundTo(x))), assignment,
    schedule, optimalCost: roundTo(optimalCost), baselineCost: roundTo(baselineCost), savingsPct: baselineCost > 0 ? roundTo(((baselineCost - optimalCost) / baselineCost) * 100, 1) : 0,
    unassignedBeforeQueue: unassigned.map((j) => jobs[j].id), makespan: roundTo(Math.max(...schedule.map((s) => s.finishDay))), lateJobs: late,
  }
}

// ---------- 3. Supplier ranking (TOPSIS) ----------
export interface Criterion { key: string; label: string; weight: number; benefit: boolean }
export interface SupplierRow { id: string; name: string; values: Record<string, number> }
export interface RankResult { ranking: { id: string; name: string; score: number; rank: number; dPlus: number; dMinus: number }[]; normalized: Matrix; weighted: Matrix; ideal: number[]; antiIdeal: number[] }
export function rankSuppliers(suppliers: SupplierRow[], criteria: Criterion[]): RankResult {
  if (!suppliers.length) throw new Error('No suppliers to rank')
  const wTotal = sum(criteria.map((c) => c.weight)) || 1
  const w = criteria.map((c) => c.weight / wTotal)
  const X = suppliers.map((s) => criteria.map((c) => s.values[c.key] ?? 0))
  const norms = criteria.map((_, j) => Math.sqrt(X.reduce((s, r) => s + r[j] ** 2, 0)) || 1)
  const R = X.map((r) => r.map((x, j) => x / norms[j]))
  const V = R.map((r) => r.map((x, j) => x * w[j]))
  const colMax = colSums(V).map((_, j) => Math.max(...V.map((r) => r[j])))
  const colMin = colSums(V).map((_, j) => Math.min(...V.map((r) => r[j])))
  const ideal = criteria.map((c, j) => (c.benefit ? colMax[j] : colMin[j]))
  const anti = criteria.map((c, j) => (c.benefit ? colMin[j] : colMax[j]))
  const dist = (row: number[], ref: number[]) => Math.sqrt(row.reduce((s, x, j) => s + (x - ref[j]) ** 2, 0))
  const scored = suppliers.map((s, i) => { const dp = dist(V[i], ideal), dm = dist(V[i], anti); return { id: s.id, name: s.name, dPlus: dp, dMinus: dm, score: dp + dm === 0 ? 0.5 : dm / (dp + dm) } })
  const ranking = [...scored].sort((a, b) => b.score - a.score).map((s, k) => ({ ...s, score: roundTo(s.score, 4), dPlus: roundTo(s.dPlus, 4), dMinus: roundTo(s.dMinus, 4), rank: k + 1 }))
  return { ranking, normalized: R.map((r) => r.map((x) => roundTo(x, 4))), weighted: V.map((r) => r.map((x) => roundTo(x, 4))), ideal: ideal.map((x) => roundTo(x, 4)), antiIdeal: anti.map((x) => roundTo(x, 4)) }
}

// ---------- 4. Size × colour matrix ----------
export interface SizeColorInput { total: number; sizes: string[]; ratio: number[]; colors: string[]; colorShare: number[]; consumptionKg: number[]; piecesPerCarton: number; cuttingAllowancePct: number }
export interface SizeColorResult { matrix: Matrix; rowTotals: number[]; colTotals: number[]; grandTotal: number; cutQty: number[]; cutTotal: number; fabricKg: number; cartons: number[]; cartonsTotal: number }
export function sizeColorMatrix(inp: SizeColorInput): SizeColorResult {
  const { total, sizes, ratio, colors, colorShare, consumptionKg, piecesPerCarton, cuttingAllowancePct } = inp
  if (sizes.length !== ratio.length || sizes.length !== consumptionKg.length) throw new Error('sizes, ratio and consumption must have the same length')
  if (colors.length !== colorShare.length) throw new Error('colors and colorShare must have the same length')
  const colorTotals = apportion(colorShare, total)
  const matrix = colorTotals.map((ct) => apportion(ratio, ct))
  const colTotals = colSums(matrix)
  const rowTotals = rowSums(matrix)
  const cutQty = colTotals.map((q) => Math.ceil(q * (1 + cuttingAllowancePct / 100)))
  const fabricKg = dot(cutQty, consumptionKg)
  const cartons = colTotals.map((q) => Math.ceil(q / Math.max(1, piecesPerCarton)))
  return { matrix, rowTotals, colTotals, grandTotal: sum(rowTotals), cutQty, cutTotal: sum(cutQty), fabricKg: roundTo(fabricKg), cartons, cartonsTotal: Math.ceil(total / Math.max(1, piecesPerCarton)) }
}
