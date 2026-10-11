import * as D from './data'
import type { Attendance, BomLine, Buyer, Country, Employee, Leave, Material, Movement, Order, PO, Plan, Product, Requirement, Supplier, Warehouse } from './data'

export type Activity = { id: string; icon: string; text: string; by: string; time: string }

/** Everything that is persisted in the database (the rest of the UI state is browser-only). */
export interface DataState {
  products: Product[]; materials: Material[]; warehouses: Warehouse[]; movements: Movement[]; bom: Record<string, BomLine[]>
  suppliers: Supplier[]; reqs: Requirement[]; pos: PO[]; plans: Plan[]; employees: Employee[]; attendance: Attendance[]; leaves: Leave[]
  buyers: Buyer[]; countries: Country[]; orders: Order[]; activities: Activity[]
  payrollStage: number; payrollHistory: ReturnType<typeof D.seedPayrollHistory>; salesAdj: number; outputToday: number
}

/** Deterministic seed data set used by the offline demo and by `db:seed`. Call once per process. */
export function buildSeed(): DataState {
  const products = D.seedProducts()
  const employees = D.seedEmployees()
  const buyers = D.seedBuyers(employees.filter((e) => e.dept === 'Merchandising').map((e) => e.id))
  const plans = D.seedPlans().map((p) => (p.id === 'PP-2026-006' ? { ...p, qcStatus: 'Pending' as const } : p))
  return {
    products, materials: D.seedMaterials(), warehouses: D.seedWarehouses(), movements: D.seedMovements(), bom: D.seedBom(),
    suppliers: D.seedSuppliers(), reqs: D.seedRequirements(), pos: D.seedPOs(), plans, employees, attendance: D.seedAttendance(employees),
    leaves: D.seedLeaves(), buyers, countries: D.seedCountries(), orders: D.seedOrders(products, buyers), activities: D.seedActivities(),
    payrollStage: 2, payrollHistory: D.seedPayrollHistory(), salesAdj: 0, outputToday: 2350,
  }
}
export type { Country }
