import assert from 'node:assert/strict'
import { bestStreak, currentStreak, dueSlots, habitRange, habitStats, indexLogs, logCutoffDate, makeLog, newHabit, slotAt, slotKey, slotState, slotsOn } from './habits'

const t = (name: string, fn: () => void) => (fn(), console.log('ok   ', name))
// 2026-11-23 là thứ Hai. Habit tạo từ đầu tháng để các ngày trước đó đều tính.
const created = new Date(2026, 10, 1, 8).getTime()
const mk = (p = {}) => newHabit({ name: 'Uống nước', weekdays: [1, 2, 3, 4, 5], times: ['10:00', '08:00'], createdAt: created, ...p })

t('khung giờ theo thứ trong tuần, sắp xếp, bỏ ngày trước khi habit được tạo, bỏ habit tạm dừng hoặc đã xóa', () => {
  const h = mk()
  assert.deepEqual(slotsOn(h, '2026-11-23'), ['08:00', '10:00']) // thứ Hai
  assert.deepEqual(slotsOn(h, '2026-11-22'), []) // Chủ nhật
  assert.deepEqual(slotsOn(h, '2026-10-30'), []) // trước ngày tạo
  assert.deepEqual(slotsOn(mk({ active: false }), '2026-11-23'), [])
  assert.deepEqual(slotsOn(mk({ deletedAt: 1 }), '2026-11-23'), [])
  assert.deepEqual(slotsOn(mk({ times: ['09:00', '09:00'] }), '2026-11-23'), ['09:00'])
})

t('trạng thái khung giờ: có log theo log; chưa có log thì hôm nay chờ, ngày đã qua là lỡ', () => {
  const h = mk()
  const logs = indexLogs([makeLog(h.id, '2026-11-23', '08:00', 'done', 1), makeLog(h.id, '2026-11-23', '10:00', 'skipped', 2)])
  assert.equal(slotState(h, '2026-11-23', '08:00', logs, '2026-11-23'), 'done')
  assert.equal(slotState(h, '2026-11-23', '10:00', logs, '2026-11-23'), 'skipped')
  assert.equal(slotState(h, '2026-11-24', '08:00', logs, '2026-11-24'), 'pending')
  assert.equal(slotState(h, '2026-11-23', '08:00', new Map(), '2026-11-24'), 'missed')
  assert.equal(slotKey('h', '2026-11-23', '08:00'), 'h|2026-11-23|08:00')
})

t('thống kê một tuần: không tính khung giờ còn chờ của hôm nay', () => {
  const h = mk()
  // Tuần 16-22/11 (thứ Hai 16 -> Chủ nhật 22) đã qua hết; hôm nay 23/11
  const logs = indexLogs([
    makeLog(h.id, '2026-11-16', '08:00', 'done', 1),
    makeLog(h.id, '2026-11-16', '10:00', 'done', 1),
    makeLog(h.id, '2026-11-17', '08:00', 'skipped', 1),
    makeLog(h.id, '2026-11-23', '08:00', 'done', 1)
  ])
  const s = habitStats(h, logs, '2026-11-16', '2026-11-22', '2026-11-23')
  assert.equal(s.scheduled, 10) // 5 ngày × 2 khung
  assert.equal(s.done, 2)
  assert.equal(s.skipped, 1)
  assert.equal(s.missed, 7)
  assert.equal(s.rate, 0.2)
  // Tuần hiện tại: thứ Hai 23 còn 1 khung chờ (10:00) nên không tính, 08:00 đã làm
  const cur = habitStats(h, logs, '2026-11-23', '2026-11-29', '2026-11-23')
  assert.deepEqual([cur.scheduled, cur.done, cur.rate], [1, 1, 1])
  assert.equal(cur.days.length, 1) // cắt ở hôm nay
  assert.equal(habitStats(h, logs, '2026-12-01', '2026-12-07', '2026-11-23').days.length, 0)
})

t('chuỗi ngày liên tiếp: đứt khi một ngày có lịch làm thiếu, hôm nay chưa đủ thì chưa đứt, ngày không có lịch bị bỏ qua', () => {
  const h = mk({ times: ['08:00'] }) // thứ Hai-thứ Sáu
  const done = (d: string) => makeLog(h.id, d, '08:00', 'done', 1)
  // Thứ Tư 18 -> thứ Sáu 20 xong, Chủ nhật/thứ Bảy nghỉ, thứ Hai 23 (hôm nay) chưa làm
  const logs = indexLogs([done('2026-11-18'), done('2026-11-19'), done('2026-11-20')])
  assert.equal(currentStreak(h, logs, '2026-11-23', '2026-11-01'), 3)
  // Thứ Ba 17 bỏ sót -> chuỗi dừng ở 3
  assert.equal(currentStreak(h, indexLogs([done('2026-11-18'), done('2026-11-19'), done('2026-11-20'), done('2026-11-23')]), '2026-11-23', '2026-11-01'), 4)
  // Hôm nay đã làm thì cộng thêm
  assert.equal(currentStreak(h, indexLogs([done('2026-11-19'), done('2026-11-20'), done('2026-11-23')]), '2026-11-23', '2026-11-01'), 3)
  assert.equal(currentStreak(h, new Map(), '2026-11-23', '2026-11-01'), 0)
  assert.equal(bestStreak(h, logs, '2026-11-23', '2026-11-01'), 3)
})

t('khung giờ đã tới giờ mà chưa trả lời mới được nhắc', () => {
  const h = mk()
  const logs = indexLogs([makeLog(h.id, '2026-11-23', '08:00', 'done', 1)])
  const at = (hh: number, mm: number) => slotAt('2026-11-23', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
  assert.deepEqual(dueSlots(h, '2026-11-23', at(7, 59), new Map()), [])
  assert.deepEqual(dueSlots(h, '2026-11-23', at(8, 0), new Map()), ['08:00'])
  assert.deepEqual(dueSlots(h, '2026-11-23', at(10, 30), logs), ['10:00']) // 08:00 đã làm
  assert.deepEqual(dueSlots(h, '2026-11-22', at(10, 30), new Map()), []) // Chủ nhật không có lịch
})

t('khoảng tuần và tháng, chuyển kỳ', () => {
  const w = habitRange('week', '2026-11-25', 0) // thứ Tư
  assert.deepEqual([w.from, w.to], ['2026-11-23', '2026-11-29'])
  const wp = habitRange('week', '2026-11-25', -1)
  assert.deepEqual([wp.from, wp.to], ['2026-11-16', '2026-11-22'])
  const wSun = habitRange('week', '2026-11-29', 0) // Chủ nhật thuộc tuần bắt đầu thứ Hai 23
  assert.equal(wSun.from, '2026-11-23')
  const m = habitRange('month', '2026-11-25', 0)
  assert.deepEqual([m.from, m.to, m.label], ['2026-11-01', '2026-11-30', 'Tháng 11/2026'])
  const mp = habitRange('month', '2026-01-15', -1)
  assert.deepEqual([mp.from, mp.to], ['2025-12-01', '2025-12-31'])
})

t('mốc cắt log cũ theo số tháng; 0 = không xóa', () => {
  const now = new Date(2026, 10, 23, 12).getTime()
  assert.equal(logCutoffDate(now, 3), '2026-08-23')
  assert.equal(logCutoffDate(now, 0), null)
})
console.log('7 test habit đạt')
