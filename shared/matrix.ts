// Small, dependency-free linear algebra toolkit used by the planning engine
// (shared by the API server and the browser so offline mode gives identical answers).

export type Matrix = number[][]
export type Vector = number[]

const assertRect = (A: Matrix, name = 'matrix') => {
  if (!A.length) return
  const c = A[0].length
  for (const row of A) if (row.length !== c) throw new Error(`${name} is not rectangular`)
}

export const shape = (A: Matrix): [number, number] => [A.length, A.length ? A[0].length : 0]
export const zeros = (r: number, c: number): Matrix => Array.from({ length: r }, () => new Array<number>(c).fill(0))
export const identity = (n: number): Matrix => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
export const diag = (v: Vector): Matrix => v.map((x, i) => v.map((_, j) => (i === j ? x : 0)))

export function transpose(A: Matrix): Matrix {
  assertRect(A)
  const [r, c] = shape(A)
  const T = zeros(c, r)
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j]
  return T
}

export function matmul(A: Matrix, B: Matrix): Matrix {
  assertRect(A, 'A'); assertRect(B, 'B')
  const [ar, ac] = shape(A)
  const [br, bc] = shape(B)
  if (ac !== br) throw new Error(`Cannot multiply ${ar}x${ac} by ${br}x${bc}`)
  const C = zeros(ar, bc)
  for (let i = 0; i < ar; i++) for (let k = 0; k < ac; k++) { const a = A[i][k]; if (a === 0) continue; for (let j = 0; j < bc; j++) C[i][j] += a * B[k][j] }
  return C
}

/** y = A·x */
export function matvec(A: Matrix, x: Vector): Vector {
  const [r, c] = shape(A)
  if (c !== x.length) throw new Error(`Cannot multiply ${r}x${c} matrix by vector of length ${x.length}`)
  return A.map((row) => row.reduce((s, a, j) => s + a * x[j], 0))
}

/** yᵀ = xᵀ·A  (row vector times matrix) */
export function vecmat(x: Vector, A: Matrix): Vector {
  const [r, c] = shape(A)
  if (r !== x.length) throw new Error(`Cannot multiply vector of length ${x.length} by ${r}x${c} matrix`)
  const y = new Array<number>(c).fill(0)
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) y[j] += x[i] * A[i][j]
  return y
}

export const hadamard = (A: Matrix, B: Matrix): Matrix => A.map((row, i) => row.map((a, j) => a * B[i][j]))
export const scale = (A: Matrix, k: number): Matrix => A.map((row) => row.map((a) => a * k))
export const add = (A: Matrix, B: Matrix): Matrix => A.map((row, i) => row.map((a, j) => a + B[i][j]))
export const rowSums = (A: Matrix): Vector => A.map((r) => r.reduce((s, x) => s + x, 0))
export const colSums = (A: Matrix): Vector => (A.length ? A[0].map((_, j) => A.reduce((s, r) => s + r[j], 0)) : [])
export const sum = (v: Vector) => v.reduce((s, x) => s + x, 0)
export const dot = (a: Vector, b: Vector) => a.reduce((s, x, i) => s + x * b[i], 0)
export const roundTo = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d
export const roundMatrix = (A: Matrix, d = 2): Matrix => A.map((r) => r.map((x) => roundTo(x, d)))

/**
 * Minimum-cost assignment (Hungarian / Kuhn–Munkres, O(n²m)).
 * Works for rectangular matrices: returns, for every row, the chosen column or -1 when the row stays unassigned.
 */
export function hungarian(cost: Matrix): number[] {
  assertRect(cost, 'cost')
  const [rows, cols] = shape(cost)
  if (!rows || !cols) return new Array(rows).fill(-1)
  if (rows > cols) {
    const t = hungarian(transpose(cost)) // t[col] = row
    const res = new Array<number>(rows).fill(-1)
    t.forEach((r, c) => { if (r >= 0) res[r] = c })
    return res
  }
  const n = rows, m = cols
  const INF = Number.POSITIVE_INFINITY
  const u = new Array<number>(n + 1).fill(0), v = new Array<number>(m + 1).fill(0)
  const p = new Array<number>(m + 1).fill(0), way = new Array<number>(m + 1).fill(0)
  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array<number>(m + 1).fill(INF)
    const used = new Array<boolean>(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF, j1 = 0
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0 }
        if (minv[j] < delta) { delta = minv[j]; j1 = j }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta } else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1 } while (j0)
  }
  const res = new Array<number>(n).fill(-1)
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1
  return res
}

/** Largest-remainder rounding: integer parts that add up to exactly `total`. */
export function apportion(weights: Vector, total: number): number[] {
  const s = sum(weights)
  if (!weights.length) return []
  if (s <= 0) { const out = new Array<number>(weights.length).fill(0); out[0] = total; return out }
  const raw = weights.map((w) => (w / s) * total)
  const out = raw.map(Math.floor)
  let left = total - sum(out)
  const order = raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i)
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k].i]++
  return out
}
