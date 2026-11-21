import assert from 'node:assert/strict'
import { currentPeriod, periodRange, reportDateOf, shiftPeriod, summarize, tasksInPeriod } from './report'
import { newProject, newTask } from './types'

const t = (name: string, fn: () => void) => (fn(), console.log('ok   ', name))
const NOV20 = new Date(2026, 10, 20, 12).getTime() // 20/11/2026 giữa trưa giờ địa phương

t('kỳ hiện tại của từng loại', () => {
  assert.deepEqual(currentPeriod('month', NOV20), { kind: 'month', year: 2026, index: 10 })
  assert.deepEqual(currentPeriod('quarter', NOV20), { kind: 'quarter', year: 2026, index: 3 })
  assert.deepEqual(currentPeriod('half', NOV20), { kind: 'half', year: 2026, index: 1 })
  assert.deepEqual(currentPeriod('year', NOV20), { kind: 'year', year: 2026, index: 0 })
})

t('khoảng ngày và nhãn của từng loại kỳ', () => {
  const m = periodRange({ kind: 'month', year: 2026, index: 1 })
  assert.deepEqual([m.from, m.to, m.label], ['2026-02-01', '2026-02-28', 'Tháng 2/2026'])
  assert.equal(periodRange({ kind: 'month', year: 2028, index: 1 }).to, '2028-02-29') // năm nhuận
  const q = periodRange({ kind: 'quarter', year: 2026, index: 3 })
  assert.deepEqual([q.from, q.to], ['2026-10-01', '2026-12-31'])
  assert.match(q.label, /Quý 4\/2026/)
  const h = periodRange({ kind: 'half', year: 2026, index: 0 })
  assert.deepEqual([h.from, h.to], ['2026-01-01', '2026-06-30'])
  assert.match(h.label, /6 tháng đầu 2026/)
  const y = periodRange({ kind: 'year', year: 2026, index: 0 })
  assert.deepEqual([y.from, y.to, y.label], ['2026-01-01', '2026-12-31', 'Năm 2026'])
})

t('chuyển kỳ trước và sau, qua ranh giới năm', () => {
  assert.deepEqual(shiftPeriod({ kind: 'month', year: 2026, index: 0 }, -1), { kind: 'month', year: 2025, index: 11 })
  assert.deepEqual(shiftPeriod({ kind: 'month', year: 2026, index: 11 }, 1), { kind: 'month', year: 2027, index: 0 })
  assert.deepEqual(shiftPeriod({ kind: 'quarter', year: 2026, index: 0 }, -1), { kind: 'quarter', year: 2025, index: 3 })
  assert.deepEqual(shiftPeriod({ kind: 'half', year: 2026, index: 1 }, 1), { kind: 'half', year: 2027, index: 0 })
  assert.deepEqual(shiftPeriod({ kind: 'year', year: 2026, index: 0 }, -1), { kind: 'year', year: 2025, index: 0 })
})

t('task thuộc kỳ theo ngày kết thúc, không có thì theo ngày tạo; bỏ task con và task đã xóa', () => {
  const a = newTask({ title: 'a', end: '2026-11-05' })
  const b = newTask({ title: 'b', end: '2026-12-01' })
  const c = newTask({ title: 'c', createdAt: NOV20 }) // không có hạn: tính theo ngày tạo (tháng 11)
  const kid = newTask({ title: 'con', end: '2026-11-06', parentId: a.id })
  const gone = newTask({ title: 'xóa', end: '2026-11-07', deletedAt: 1 })
  const range = periodRange({ kind: 'month', year: 2026, index: 10 })
  assert.equal(reportDateOf(c), '2026-11-20')
  assert.deepEqual(tasksInPeriod([c, b, kid, gone, a], range).map((x) => x.title), ['a', 'c'])
  // ranh giới: ngày đầu và ngày cuối kỳ đều thuộc kỳ
  const first = newTask({ title: 'đầu', end: '2026-11-01' })
  const last = newTask({ title: 'cuối', end: '2026-11-30' })
  assert.equal(tasksInPeriod([first, last], range).length, 2)
})

t('tổng hợp theo project và trạng thái', () => {
  const pa = newProject({ name: 'A', color: '#111111' })
  const pb = newProject({ name: 'B', color: '#222222' })
  const list = [
    newTask({ projectId: pa.id, status: 'done' }),
    newTask({ projectId: pa.id, status: 'pending' }),
    newTask({ projectId: pb.id, status: 'redo' }),
    newTask({ projectId: null, status: 'in_progress' }),
    newTask({ projectId: null, status: 'in_progress' }),
    newTask({ projectId: 'đã-xóa', status: 'done' })
  ]
  const s = summarize(list, [pa, pb])
  assert.equal(s.total, 6)
  assert.deepEqual(s.byStatus, { pending: 1, in_progress: 2, redo: 1, done: 2 })
  // Project nhiều task trước, "Không có project" luôn ở cuối dù có 2 task
  assert.deepEqual(s.byProject.map((x) => [x.name, x.count]), [['A', 2], ['(Project đã xóa)', 1], ['B', 1], ['Không có project', 2]])
  assert.equal(s.byProject[0].color, '#111111')
  assert.deepEqual(summarize([], []).byProject, [])
})
console.log('4 test report đạt')
