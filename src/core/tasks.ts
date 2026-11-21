// Logic của Project và Task. Không phụ thuộc Electron hay giao diện.

import type { Project, Task, TaskStatus } from './types'

const DAY_MS = 86_400_000

export const isLive = (t: Task): boolean => !t.deletedAt
export const isArchived = (t: Task): boolean => t.archivedAt !== null

/** Đổi trạng thái: Done thì ghi lúc xong và vào Archived ngay; ra khỏi Done thì rời Archived. */
export function setStatus(t: Task, status: TaskStatus, now: number): Task {
  if (status === t.status) return t
  if (status === 'done') return { ...t, status, doneAt: now, archivedAt: now, updatedAt: now }
  return { ...t, status, doneAt: null, archivedAt: null, updatedAt: now }
}

/** Tick ô vuông: chưa xong thì thành Done, đã xong thì quay về Pending. */
export const toggleTask = (t: Task, now: number): Task => setStatus(t, t.status === 'done' ? 'pending' : 'done', now)

/** Task con của một task lớn, theo thứ tự tạo. */
export const childrenOf = (tasks: Task[], parentId: string): Task[] =>
  tasks.filter((t) => isLive(t) && t.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt)

/** Tiến độ task con: số đã xong trên tổng. */
export function progressOf(tasks: Task[], parentId: string): { done: number; total: number } {
  const kids = childrenOf(tasks, parentId)
  return { done: kids.filter((k) => k.status === 'done').length, total: kids.length }
}

/** Task cấp trên cùng (không phải task con) mà người dùng thấy trong danh sách. */
export const topLevel = (tasks: Task[]): Task[] => tasks.filter((t) => isLive(t) && !t.parentId)

/** Hạn đã qua (ngày kết thúc trước hôm nay) và chưa xong. */
export const isOverdue = (t: Task, today: string): boolean => !!t.end && t.end < today && t.status !== 'done'

/** Thứ tự danh sách đang làm: có hạn gần nhất trước, không hạn xuống cuối, rồi mới tạo trước. */
export function compareActive(a: Task, b: Task): number {
  if (a.end && b.end) return a.end.localeCompare(b.end) || a.createdAt - b.createdAt
  if (a.end) return -1
  if (b.end) return 1
  return a.createdAt - b.createdAt
}

/** Mốc cắt tính bằng ms: bây giờ trừ `months` tháng (theo lịch). */
export function cutoffMonthsAgo(now: number, months: number): number {
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return d.getTime()
}

/**
 * Task cần xóa vì đã archived quá hạn giữ (cấp trên cùng, kèm các task con của nó).
 * `months` = 0 nghĩa là không bao giờ xóa. Chỉ lấy task chưa bị xóa.
 */
export function expiredArchived(tasks: Task[], months: number, now: number): Task[] {
  if (!months || months < 0) return []
  const cutoff = cutoffMonthsAgo(now, months)
  const gone = tasks.filter((t) => isLive(t) && !t.parentId && t.archivedAt !== null && t.archivedAt < cutoff)
  const ids = new Set(gone.map((t) => t.id))
  return [...gone, ...tasks.filter((t) => isLive(t) && t.parentId && ids.has(t.parentId))]
}

/** Số task theo từng trạng thái của một project (không tính task con, không tính task đã xóa). */
export function countByStatus(tasks: Task[], projectId: string | null): Record<TaskStatus, number> {
  const out: Record<TaskStatus, number> = { pending: 0, in_progress: 0, redo: 0, done: 0 }
  for (const t of topLevel(tasks)) if (t.projectId === projectId) out[t.status]++
  return out
}

export const projectName = (projects: Project[], id: string | null): string => (id ? (projects.find((p) => p.id === id)?.name ?? '') : '')

export interface TaskAlert {
  /** Khóa chống nhắc trùng. */
  key: string
  kind: 'daily' | 'before'
  /** Số ngày còn lại tới hạn (0 = hôm nay; âm = đã quá hạn); null nếu không có hạn. */
  daysLeft: number | null
}

const dayNum = (s: string): number => Math.round(Date.parse(`${s}T00:00:00Z`) / DAY_MS)

/**
 * Các nhắc của một task trong ngày `today` ('YYYY-MM-DD'), áp dụng từ 9:00 sáng.
 * Task đã xong, đã archived hoặc đã xóa thì không nhắc.
 */
export function taskAlertsFor(t: Task, today: string): TaskAlert[] {
  if (!isLive(t) || t.archivedAt !== null || t.status === 'done') return []
  const out: TaskAlert[] = []
  const daysLeft = t.end ? dayNum(t.end) - dayNum(today) : null
  if (t.remindBeforeDays !== null && t.remindBeforeDays >= 0 && t.end && daysLeft === t.remindBeforeDays) {
    out.push({ key: `task:${t.id}:before:${t.end}:${t.remindBeforeDays}`, kind: 'before', daysLeft })
  }
  if (t.remindDaily) {
    const started = !t.start || t.start <= today
    const notEnded = !t.end || t.end >= today
    if (started && notEnded) out.push({ key: `task:${t.id}:daily:${today}`, kind: 'daily', daysLeft })
  }
  return out
}

/** Câu mô tả ngắn cho thông báo nhắc task. */
export function describeTaskAlert(a: TaskAlert): string {
  if (a.daysLeft === null) return 'Nhắc hằng ngày'
  if (a.daysLeft === 0) return 'Đến hạn hôm nay'
  if (a.daysLeft > 0) return `Còn ${a.daysLeft} ngày đến hạn`
  return `Đã quá hạn ${-a.daysLeft} ngày`
}

/**
 * Khoảng ngày task chiếm trên lịch ('YYYY-MM-DD', gồm cả hai đầu); null nếu task không có ngày nào.
 * Có cả ngày bắt đầu và kết thúc: kéo dài nhiều ngày. Chỉ có một mốc: đúng ngày đó.
 */
export function taskSpan(t: Task): [string, string] | null {
  if (t.start && t.end) return [t.start, t.end < t.start ? t.start : t.end]
  if (t.end) return [t.end, t.end]
  if (t.start) return [t.start, t.start]
  return null
}
