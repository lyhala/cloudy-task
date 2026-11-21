import assert from 'node:assert/strict'
import { buildBackup, parseBackup, planImport } from './backup'
import { search } from './search'
import { childrenOf, compareActive, countByStatus, describeTaskAlert, expiredArchived, isOverdue, progressOf, setStatus, taskAlertsFor, taskSpan, toggleTask } from './tasks'
import { DEFAULT_SETTINGS, newProject, newTask } from './types'

const t = (name: string, fn: () => void) => (fn(), console.log('ok   ', name))
const NOW = Date.UTC(2026, 10, 20, 12) // 2026-11-20, giữa trưa UTC: ngày không đổi ở mọi múi giờ gần

t('Done thì vào Archived ngay, ra khỏi Done thì rời Archived', () => {
  const a = setStatus(newTask({ title: 'A' }), 'done', NOW)
  assert.equal(a.status, 'done')
  assert.equal(a.archivedAt, NOW)
  assert.equal(a.doneAt, NOW)
  const back = setStatus(a, 'redo', NOW + 1)
  assert.equal(back.archivedAt, null)
  assert.equal(back.doneAt, null)
  assert.equal(back.status, 'redo')
})

t('tick ô vuông: xong rồi bỏ tick thì về Pending', () => {
  const a = toggleTask(newTask(), NOW)
  assert.equal(a.status, 'done')
  assert.equal(toggleTask(a, NOW + 1).status, 'pending')
})

t('đổi sang cùng trạng thái thì không đổi gì', () => {
  const a = newTask()
  assert.equal(setStatus(a, 'pending', NOW), a)
})

t('task con và tiến độ', () => {
  const p = newTask({ title: 'Lớn' })
  const k1 = newTask({ title: 'a', parentId: p.id, createdAt: 2 })
  const k2 = setStatus(newTask({ title: 'b', parentId: p.id, createdAt: 1 }), 'done', NOW)
  const gone = newTask({ title: 'c', parentId: p.id, deletedAt: 5 })
  const all = [p, k1, k2, gone]
  assert.deepEqual(childrenOf(all, p.id).map((x) => x.title), ['b', 'a'])
  assert.deepEqual(progressOf(all, p.id), { done: 1, total: 2 })
})

t('quá hạn và thứ tự danh sách', () => {
  const soon = newTask({ end: '2026-11-21', createdAt: 5 })
  const late = newTask({ end: '2026-11-10', createdAt: 9 })
  const none = newTask({ createdAt: 1 })
  assert.deepEqual([none, soon, late].sort(compareActive), [late, soon, none])
  assert.equal(isOverdue(late, '2026-11-20'), true)
  assert.equal(isOverdue(setStatus(late, 'done', NOW), '2026-11-20'), false)
  assert.equal(isOverdue(none, '2026-11-20'), false)
})

t('tự xóa Archived quá hạn giữ, kèm task con; 0 = không bao giờ', () => {
  const old = new Date(NOW)
  old.setMonth(old.getMonth() - 25)
  const fresh = new Date(NOW)
  fresh.setMonth(fresh.getMonth() - 23)
  const a = newTask({ title: 'cũ', status: 'done', archivedAt: old.getTime() })
  const kid = newTask({ title: 'con của cũ', parentId: a.id })
  const b = newTask({ title: 'mới', status: 'done', archivedAt: fresh.getTime() })
  const live = newTask({ title: 'đang làm' })
  const all = [a, kid, b, live]
  assert.deepEqual(expiredArchived(all, 24, NOW).map((x) => x.title), ['cũ', 'con của cũ'])
  assert.deepEqual(expiredArchived(all, 0, NOW), [])
  assert.deepEqual(expiredArchived(all, 12, NOW).map((x) => x.title), ['cũ', 'mới', 'con của cũ'])
})

t('đếm theo trạng thái của một project, bỏ task con và task đã xóa', () => {
  const P = 'p1'
  const all = [
    newTask({ projectId: P, status: 'pending' }),
    newTask({ projectId: P, status: 'in_progress' }),
    newTask({ projectId: P, status: 'done' }),
    newTask({ projectId: P, status: 'pending', parentId: 'x' }),
    newTask({ projectId: P, status: 'redo', deletedAt: 3 }),
    newTask({ projectId: null, status: 'redo' })
  ]
  assert.deepEqual(countByStatus(all, P), { pending: 1, in_progress: 1, redo: 0, done: 1 })
  assert.equal(countByStatus(all, null).redo, 1)
})

t('nhắc trước n ngày chỉ nổ đúng một ngày', () => {
  const task = newTask({ end: '2026-11-25', remindBeforeDays: 2 })
  assert.equal(taskAlertsFor(task, '2026-11-22').length, 0)
  const on = taskAlertsFor(task, '2026-11-23')
  assert.equal(on.length, 1)
  assert.equal(on[0].kind, 'before')
  assert.equal(describeTaskAlert(on[0]), 'Còn 2 ngày đến hạn')
  assert.equal(taskAlertsFor(task, '2026-11-24').length, 0)
})

t('nhắc hằng ngày trong khoảng bắt đầu đến kết thúc', () => {
  const task = newTask({ start: '2026-11-20', end: '2026-11-22', remindDaily: true })
  assert.equal(taskAlertsFor(task, '2026-11-19').length, 0)
  assert.equal(taskAlertsFor(task, '2026-11-20').length, 1)
  assert.equal(taskAlertsFor(task, '2026-11-22').length, 1)
  assert.equal(taskAlertsFor(task, '2026-11-23').length, 0)
  const open = newTask({ remindDaily: true })
  assert.equal(taskAlertsFor(open, '2030-01-01').length, 1)
  assert.equal(describeTaskAlert(taskAlertsFor(open, '2030-01-01')[0]), 'Nhắc hằng ngày')
})

t('khóa chống trùng khác nhau theo ngày, task xong hoặc đã xóa thì không nhắc', () => {
  const task = newTask({ remindDaily: true })
  assert.notEqual(taskAlertsFor(task, '2026-11-20')[0].key, taskAlertsFor(task, '2026-11-21')[0].key)
  assert.equal(taskAlertsFor(setStatus(task, 'done', NOW), '2026-11-20').length, 0)
  assert.equal(taskAlertsFor({ ...task, deletedAt: 1 }, '2026-11-20').length, 0)
})

t('sao lưu có project và task, nhập gộp theo bản mới hơn', () => {
  const proj = newProject({ name: 'P' })
  const task = newTask({ title: 'T', projectId: proj.id })
  const base = { notes: [], folders: [], reminders: [], calendars: [], events: [], settings: DEFAULT_SETTINGS }
  const b = buildBackup({ ...base, projects: [proj, newProject({ name: 'đã xóa', deletedAt: 1 })], tasks: [task] })
  assert.equal(b.projects.length, 1)
  const back = parseBackup(JSON.stringify(b))
  assert.equal(back.tasks[0].title, 'T')
  const have = { ...base, projects: [], tasks: [{ ...task, updatedAt: task.updatedAt + 5 }] }
  const plan = planImport(back, have)
  assert.equal(plan.projects.length, 1)
  assert.equal(plan.tasks.length, 0)
  // file sao lưu cũ không có project/task vẫn đọc được
  const legacy = parseBackup(JSON.stringify({ app: 'cloudy-task', format: 1, notes: [] }))
  assert.deepEqual(legacy.tasks, [])
})

t('tìm kiếm thấy task theo tiêu đề và ghi chú, không dấu', () => {
  const tasks = [newTask({ title: 'Báo cáo tháng', notes: 'gửi Nguyễn' }), newTask({ title: 'Khác', deletedAt: 1 })]
  const hits = search({ notes: [], reminders: [], events: [], tasks }, 'bao cao', new Set(['task']))
  assert.equal(hits.length, 1)
  assert.equal(hits[0].kind, 'task')
  assert.equal(search({ notes: [], reminders: [], events: [], tasks }, 'nguyen', new Set(['task'])).length, 1)
})
t('khoảng ngày của task trên lịch', () => {
  assert.deepEqual(taskSpan(newTask({ start: '2026-11-20', end: '2026-11-23' })), ['2026-11-20', '2026-11-23'])
  assert.deepEqual(taskSpan(newTask({ end: '2026-11-23' })), ['2026-11-23', '2026-11-23'])
  assert.deepEqual(taskSpan(newTask({ start: '2026-11-20' })), ['2026-11-20', '2026-11-20'])
  assert.equal(taskSpan(newTask()), null)
  // kết thúc trước bắt đầu (nhập sai): thu về một ngày, không vẽ ngược
  assert.deepEqual(taskSpan(newTask({ start: '2026-11-20', end: '2026-11-10' })), ['2026-11-20', '2026-11-20'])
})
console.log('12 test task đạt')
