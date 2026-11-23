// Habit tracker: thói quen lặp theo ngày trong tuần và khung giờ, tick "đã làm" hoặc "bỏ qua".
// Dữ liệu habit chỉ lưu trên máy (không đồng bộ Drive). Không phụ thuộc Electron hay giao diện.

import { addDays, dateStr, parseDate } from './reminders'
import { FORMAT_VERSION, newId } from './types'

export interface Habit {
  v: number
  id: string
  name: string
  /** Các thứ trong tuần: 0 = Chủ nhật ... 6 = thứ Bảy. */
  weekdays: number[]
  /** Các khung giờ nhắc trong ngày, 'HH:mm', đã sắp xếp. */
  times: string[]
  /** Tạm dừng thì không nhắc và không tính vào report. */
  active: boolean
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export type HabitResult = 'done' | 'skipped'

/** Một lần trả lời của một khung giờ. Khung giờ không có log nghĩa là chưa trả lời. */
export interface HabitLog {
  /** Khóa của khung giờ: `habitId|YYYY-MM-DD|HH:mm`. */
  id: string
  habitId: string
  date: string
  time: string
  result: HabitResult
  at: number
}

export const HABIT_RETENTION_MONTHS = 3

export function newHabit(partial: Partial<Habit> = {}): Habit {
  const now = Date.now()
  return { v: FORMAT_VERSION, id: newId(), name: '', weekdays: [1, 2, 3, 4, 5], times: ['09:00'], active: true, createdAt: now, updatedAt: now, deletedAt: null, ...partial }
}

export const slotKey = (habitId: string, date: string, time: string): string => `${habitId}|${date}|${time}`

export function makeLog(habitId: string, date: string, time: string, result: HabitResult, at: number): HabitLog {
  return { id: slotKey(habitId, date, time), habitId, date, time, result, at }
}

const dayOf = (date: string): number => parseDate(date).getDay()

/** Các khung giờ của habit vào ngày `date` (rỗng nếu không rơi vào ngày đó, hoặc habit tạo sau ngày đó). */
export function slotsOn(h: Habit, date: string): string[] {
  if (h.deletedAt || !h.active) return []
  if (!h.weekdays.includes(dayOf(date))) return []
  if (date < dateStr(new Date(h.createdAt))) return []
  return [...new Set(h.times)].sort()
}

/** done / skipped theo log; chưa có log: hôm nay còn chờ (pending), ngày đã qua tính là lỡ (missed). */
export type SlotState = 'done' | 'skipped' | 'missed' | 'pending'

export function slotState(h: Habit, date: string, time: string, logs: ReadonlyMap<string, HabitLog>, today: string): SlotState {
  const log = logs.get(slotKey(h.id, date, time))
  if (log) return log.result
  return date < today ? 'missed' : 'pending'
}

export const indexLogs = (logs: HabitLog[]): Map<string, HabitLog> => new Map(logs.map((l) => [l.id, l]))

export interface DayStat {
  date: string
  scheduled: number
  done: number
}

export interface HabitStats {
  /** Số khung giờ đã tới hạn trả lời (không tính khung giờ còn chờ của hôm nay). */
  scheduled: number
  done: number
  skipped: number
  missed: number
  /** done / scheduled, 0..1; 0 khi chưa có khung giờ nào. */
  rate: number
  days: DayStat[]
}

/** Thống kê của một habit trong khoảng ngày [from, to] (cắt ở hôm nay). */
export function habitStats(h: Habit, logs: ReadonlyMap<string, HabitLog>, from: string, to: string, today: string): HabitStats {
  const out: HabitStats = { scheduled: 0, done: 0, skipped: 0, missed: 0, rate: 0, days: [] }
  const last = to < today ? to : today
  for (let d = from; d <= last; d = addDays(d, 1)) {
    const day: DayStat = { date: d, scheduled: 0, done: 0 }
    for (const time of slotsOn(h, d)) {
      const s = slotState(h, d, time, logs, today)
      if (s === 'pending') continue
      day.scheduled++
      out.scheduled++
      if (s === 'done') {
        day.done++
        out.done++
      } else if (s === 'skipped') out.skipped++
      else out.missed++
    }
    out.days.push(day)
  }
  out.rate = out.scheduled ? out.done / out.scheduled : 0
  return out
}

/**
 * Chuỗi ngày liên tiếp làm đủ mọi khung giờ (chỉ tính những ngày habit có lịch).
 * Hôm nay chưa làm đủ thì chưa làm đứt chuỗi (vẫn còn thời gian trong ngày).
 */
export function currentStreak(h: Habit, logs: ReadonlyMap<string, HabitLog>, today: string, floor: string): number {
  let streak = 0
  for (let d = today; d >= floor; d = addDays(d, -1)) {
    const slots = slotsOn(h, d)
    if (!slots.length) continue
    const all = slots.every((t) => logs.get(slotKey(h.id, d, t))?.result === 'done')
    if (all) streak++
    else if (d === today) continue
    else break
  }
  return streak
}

/** Chuỗi dài nhất trong khoảng [floor, today]. */
export function bestStreak(h: Habit, logs: ReadonlyMap<string, HabitLog>, today: string, floor: string): number {
  let best = 0
  let run = 0
  for (let d = floor; d <= today; d = addDays(d, 1)) {
    const slots = slotsOn(h, d)
    if (!slots.length) continue
    const all = slots.every((t) => logs.get(slotKey(h.id, d, t))?.result === 'done')
    if (all) {
      run++
      best = Math.max(best, run)
    } else if (d !== today) run = 0
  }
  return best
}

/** Mốc ms bắt đầu của một khung giờ trong ngày (giờ địa phương). */
export function slotAt(date: string, time: string): number {
  const [h, m] = time.split(':').map(Number)
  const d = parseDate(date)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** Khung giờ của habit đã tới giờ nhắc hôm nay mà chưa có log (để nhắc). */
export function dueSlots(h: Habit, today: string, now: number, logs: ReadonlyMap<string, HabitLog>): string[] {
  return slotsOn(h, today).filter((t) => slotAt(today, t) <= now && !logs.has(slotKey(h.id, today, t)))
}

export type ReportPeriod = 'week' | 'month'

export interface HabitRange {
  from: string
  to: string
  label: string
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** Khoảng ngày của tuần (thứ Hai đến Chủ nhật) hoặc tháng chứa `anchor`, dịch `offset` kỳ. */
export function habitRange(kind: ReportPeriod, anchor: string, offset: number): HabitRange {
  if (kind === 'week') {
    const monday = addDays(anchor, -((dayOf(anchor) + 6) % 7) + offset * 7)
    const sunday = addDays(monday, 6)
    const f = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`
    return { from: monday, to: sunday, label: `Tuần ${f(monday)} – ${f(sunday)}/${sunday.slice(0, 4)}` }
  }
  const d = parseDate(anchor)
  const first = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  const from = `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`
  const to = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`
  return { from, to, label: `Tháng ${first.getMonth() + 1}/${first.getFullYear()}` }
}

/** Log cũ hơn mốc giữ (tháng) thì bỏ. months = 0: không bao giờ xóa. Trả về mốc ngày 'YYYY-MM-DD' cắt, hoặc null. */
export function logCutoffDate(now: number, months: number): string | null {
  if (!months || months < 0) return null
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return dateStr(d)
}
