// Report task theo kỳ. Không phụ thuộc Electron hay giao diện.

import { dateStr } from './reminders'
import { topLevel } from './tasks'
import type { Project, Task, TaskStatus } from './types'

/** Tháng, quý (cụm 3 tháng), nửa năm (cụm 6 tháng) hoặc cả năm, tính theo lịch. */
export type PeriodKind = 'month' | 'quarter' | 'half' | 'year'

export const PERIOD_KINDS: { id: PeriodKind; label: string }[] = [
  { id: 'month', label: 'Tháng' },
  { id: 'quarter', label: '3 tháng' },
  { id: 'half', label: '6 tháng' },
  { id: 'year', label: '1 năm' }
]

const SPAN: Record<PeriodKind, number> = { month: 1, quarter: 3, half: 6, year: 12 }

export interface Period {
  kind: PeriodKind
  year: number
  /** Tháng 0-11 / quý 0-3 / nửa năm 0-1 / 0 với cả năm. */
  index: number
}

export interface PeriodRange {
  /** 'YYYY-MM-DD' đầu kỳ và cuối kỳ (gồm cả hai). */
  from: string
  to: string
  label: string
}

/** Kỳ chứa thời điểm `now`. */
export function currentPeriod(kind: PeriodKind, now: number): Period {
  const d = new Date(now)
  return { kind, year: d.getFullYear(), index: kind === 'year' ? 0 : Math.floor(d.getMonth() / SPAN[kind]) }
}

/** Đổi sang kỳ trước (delta = -1) hoặc kỳ sau (delta = 1). */
export function shiftPeriod(p: Period, delta: number): Period {
  const total = p.year * 12 + p.index * SPAN[p.kind] + delta * SPAN[p.kind]
  const year = Math.floor(total / 12)
  const startMonth = total - year * 12
  return { kind: p.kind, year, index: Math.floor(startMonth / SPAN[p.kind]) }
}

const pad = (n: number): string => String(n).padStart(2, '0')

export function periodRange(p: Period): PeriodRange {
  const span = SPAN[p.kind]
  const startMonth = p.index * span
  const endMonth = startMonth + span - 1
  const lastDay = new Date(p.year, endMonth + 1, 0).getDate()
  const from = `${p.year}-${pad(startMonth + 1)}-01`
  const to = `${p.year}-${pad(endMonth + 1)}-${pad(lastDay)}`
  const months = `T${startMonth + 1}–T${endMonth + 1}`
  const label =
    p.kind === 'month'
      ? `Tháng ${startMonth + 1}/${p.year}`
      : p.kind === 'quarter'
        ? `Quý ${p.index + 1}/${p.year} (${months})`
        : p.kind === 'half'
          ? `${p.index === 0 ? '6 tháng đầu' : '6 tháng cuối'} ${p.year} (${months})`
          : `Năm ${p.year}`
  return { from, to, label }
}

/** Ngày để xếp task vào kỳ: ngày kết thúc nếu có, không thì ngày tạo. */
export const reportDateOf = (t: Task): string => t.end ?? dateStr(new Date(t.createdAt))

/** Task cấp trên cùng (chưa xóa, kể cả đã archived) thuộc kỳ. */
export function tasksInPeriod(tasks: Task[], range: PeriodRange): Task[] {
  return topLevel(tasks)
    .filter((t) => {
      const d = reportDateOf(t)
      return d >= range.from && d <= range.to
    })
    .sort((a, b) => reportDateOf(a).localeCompare(reportDateOf(b)) || a.createdAt - b.createdAt)
}

export interface ProjectSlice {
  /** null = không thuộc project nào. */
  projectId: string | null
  name: string
  color: string
  count: number
}

export const NO_PROJECT_COLOR = '#9aa5b5'

export interface ReportSummary {
  total: number
  byProject: ProjectSlice[]
  byStatus: Record<TaskStatus, number>
}

/** Số task theo project (nhiều nhất trước, "Không có project" xuống cuối) và theo trạng thái. */
export function summarize(list: Task[], projects: Project[]): ReportSummary {
  const byStatus: Record<TaskStatus, number> = { pending: 0, in_progress: 0, redo: 0, done: 0 }
  const counts = new Map<string | null, number>()
  for (const t of list) {
    byStatus[t.status]++
    counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1)
  }
  const byProject: ProjectSlice[] = [...counts].map(([projectId, count]) => {
    const p = projectId ? projects.find((x) => x.id === projectId) : undefined
    return { projectId, name: p ? p.name || '(Chưa đặt tên)' : projectId ? '(Project đã xóa)' : 'Không có project', color: p?.color ?? NO_PROJECT_COLOR, count }
  })
  byProject.sort((a, b) => (a.projectId === null ? 1 : 0) - (b.projectId === null ? 1 : 0) || b.count - a.count || a.name.localeCompare(b.name))
  return { total: list.length, byProject, byStatus }
}
