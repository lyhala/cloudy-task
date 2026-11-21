import { useEffect, useMemo, useRef, useState } from 'react'
import { TASK_STATUSES, newTask, type Project, type Task, type TaskStatus } from '@core/types'
import { childrenOf, compareActive, isOverdue, progressOf, setStatus, toggleTask, topLevel } from '@core/tasks'

const STATUS_LABEL: Record<TaskStatus, string> = { pending: 'Pending', in_progress: 'In progress', redo: 'Re-do', done: 'Done' }

/** 'YYYY-MM-DD' -> 'dd/MM' (khác năm hiện tại thì thêm năm). */
function shortDate(s: string, today: string): string {
  const [y, m, d] = s.split('-')
  return y === today.slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${y}`
}

function dateText(t: Task, today: string): string {
  if (t.start && t.end) return `${shortDate(t.start, today)} → ${shortDate(t.end, today)}`
  if (t.end) return `Hạn ${shortDate(t.end, today)}`
  if (t.start) return `Từ ${shortDate(t.start, today)}`
  return ''
}

interface Ctx {
  tasks: Task[]
  projects: Project[]
  today: string
  open: Set<string>
  toggleOpen: (id: string) => void
  save: (t: Task) => void
  del: (t: Task) => void
  addChild: (parent: Task, title: string) => void
}

function TaskRow({ task, depth, ctx }: { task: Task; depth: 0 | 1; ctx: Ctx }) {
  const open = ctx.open.has(task.id)
  const done = task.status === 'done'
  const proj = task.projectId ? ctx.projects.find((p) => p.id === task.projectId) : undefined
  const prog = depth === 0 ? progressOf(ctx.tasks, task.id) : { done: 0, total: 0 }
  const dates = dateText(task, ctx.today)
  const late = isOverdue(task, ctx.today)
  return (
    <div className={`task-item ${open ? 'open' : ''} ${depth ? 'sub' : ''}`} data-task-id={task.id}>
      <div className="task-row" onClick={() => ctx.toggleOpen(task.id)}>
        <span className="chev">{open ? '▾' : '▸'}</span>
        <input
          type="checkbox"
          checked={done}
          title={done ? 'Bỏ đánh dấu xong' : 'Đánh dấu xong (chuyển sang Archived)'}
          onClick={(e) => e.stopPropagation()}
          onChange={() => ctx.save(toggleTask(task, Date.now()))}
        />
        <span className={`t-title ${done ? 'struck' : ''}`}>{task.title.trim() || '(Chưa đặt tên)'}</span>
        {prog.total > 0 && <small className="t-prog">{prog.done}/{prog.total}</small>}
        {depth === 0 && proj && (
          <span className="proj-chip" title={proj.name}>
            <i style={{ background: proj.color }} />
            {proj.name}
          </span>
        )}
        {dates && <small className={`t-dates ${late ? 'late' : ''}`}>{dates}</small>}
        <span className={`st st-${task.status}`}>{STATUS_LABEL[task.status]}</span>
      </div>
      {open && <TaskDetail task={task} depth={depth} ctx={ctx} />}
    </div>
  )
}

function TaskDetail({ task, depth, ctx }: { task: Task; depth: 0 | 1; ctx: Ctx }) {
  const [sub, setSub] = useState('')
  const patch = (p: Partial<Task>) => ctx.save({ ...task, ...p, updatedAt: Date.now() })
  const kids = depth === 0 ? childrenOf(ctx.tasks, task.id) : []
  const choices = ctx.projects.filter((p) => !p.deletedAt && (!p.closed || p.id === task.projectId))
  const badRange = !!task.start && !!task.end && task.end < task.start
  return (
    <div className="task-detail" onClick={(e) => e.stopPropagation()}>
      <input className="td-title" value={task.title} placeholder="Tên task" onChange={(e) => patch({ title: e.target.value })} />
      <div className="td-grid">
        <label>
          Trạng thái
          <select value={task.status} onChange={(e) => ctx.save(setStatus(task, e.target.value as TaskStatus, Date.now()))}>
            {TASK_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {depth === 0 && (
          <label>
            Project
            <select value={task.projectId ?? ''} onChange={(e) => patch({ projectId: e.target.value || null })}>
              <option value="">(Không có project)</option>
              {choices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Ngày bắt đầu
          <input type="date" value={task.start ?? ''} onChange={(e) => patch({ start: e.target.value || null })} />
        </label>
        <label>
          Ngày kết thúc
          <input type="date" value={task.end ?? ''} onChange={(e) => patch({ end: e.target.value || null })} />
        </label>
      </div>
      {badRange && <small className="bad">Ngày kết thúc đang trước ngày bắt đầu.</small>}
      <div className="td-remind">
        <label className="inline">
          <input type="checkbox" checked={task.remindDaily} onChange={(e) => patch({ remindDaily: e.target.checked })} />
          Nhắc hằng ngày (9:00 sáng)
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={task.remindBeforeDays !== null}
            disabled={!task.end}
            onChange={(e) => patch({ remindBeforeDays: e.target.checked ? 1 : null })}
          />
          Nhắc trước hạn
          <input
            className="td-num"
            type="number"
            min={0}
            max={60}
            disabled={task.remindBeforeDays === null}
            value={task.remindBeforeDays ?? 1}
            onChange={(e) => patch({ remindBeforeDays: Math.min(60, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
          />
          ngày
        </label>
        {!task.end && <small className="muted">Cần có ngày kết thúc mới nhắc trước hạn được.</small>}
      </div>
      <textarea className="td-notes" value={task.notes} placeholder="Mô tả, ghi chú..." rows={3} onChange={(e) => patch({ notes: e.target.value })} />
      {depth === 0 && (
        <div className="td-subs">
          <b>Task con</b>
          {kids.map((k) => (
            <TaskRow key={k.id} task={k} depth={1} ctx={ctx} />
          ))}
          <input
            className="sub-add"
            value={sub}
            placeholder="＋ Thêm task con (Enter)"
            onChange={(e) => setSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && sub.trim()) {
                ctx.addChild(task, sub.trim())
                setSub('')
              }
            }}
          />
        </div>
      )}
      <div className="td-foot">
        <button className="danger" onClick={() => ctx.del(task)}>
          Xóa task
        </button>
      </div>
    </div>
  )
}

interface Props {
  tasks: Task[]
  projects: Project[]
  today: string
  /** Khi nhúng trong trang chi tiết project: chỉ hiện task của project này. */
  fixedProjectId?: string
  archiveMonths: number
  /** Mở sẵn task có id này (ví dụ từ tìm kiếm hoặc thông báo). */
  focusId?: string | null
  onSave: (t: Task) => void
  onDelete: (t: Task) => void
}

type StatusFilter = 'all' | Exclude<TaskStatus, 'done'>

export function TasksView({ tasks, projects, today, fixedProjectId, archiveMonths, focusId, onSave, onDelete }: Props) {
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [quick, setQuick] = useState('')
  // Task vừa đánh dấu xong trong lúc đang xem: vẫn nằm trong danh sách (gạch ngang) cho tới khi đổi tab hoặc rời trang.
  const [recent, setRecent] = useState<Set<string>>(new Set())
  const quickRef = useRef<HTMLInputElement>(null)

  const projFilter = fixedProjectId ?? projectFilter
  const tops = useMemo(() => {
    let list = topLevel(tasks)
    if (projFilter === 'none') list = list.filter((t) => !t.projectId)
    else if (projFilter !== 'all') list = list.filter((t) => t.projectId === projFilter)
    return list
  }, [tasks, projFilter])

  const activeAll = tops.filter((t) => t.archivedAt === null || recent.has(t.id))
  const active = activeAll.filter((t) => statusFilter === 'all' || t.status === statusFilter || recent.has(t.id)).sort(compareActive)
  const archived = tops.filter((t) => t.archivedAt !== null && !recent.has(t.id)).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
  const archivedCount = tops.filter((t) => t.archivedAt !== null).length

  const toggleOpen = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // Mở sẵn task được chỉ định: sang đúng tab, mở task lớn (nếu là task con) và cuộn tới.
  useEffect(() => {
    if (!focusId) return
    const t = tasks.find((x) => x.id === focusId && !x.deletedAt)
    if (!t) return
    const top = t.parentId ? (tasks.find((x) => x.id === t.parentId) ?? t) : t
    setTab(top.archivedAt !== null ? 'archived' : 'active')
    setProjectFilter('all')
    setStatusFilter('all')
    setOpen((s) => new Set([...s, top.id, t.id]))
    const timer = window.setTimeout(() => document.querySelector(`[data-task-id="${t.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId])

  const save = (t: Task) => {
    const prev = tasks.find((x) => x.id === t.id)
    if (prev && prev.status !== 'done' && t.status === 'done') setRecent((s) => new Set(s).add(t.id))
    else if (prev && prev.status === 'done' && t.status !== 'done')
      setRecent((s) => {
        const n = new Set(s)
        n.delete(t.id)
        return n
      })
    onSave(t)
    // Đổi project của task lớn thì task con đi theo.
    if (prev && prev.projectId !== t.projectId && !t.parentId) for (const k of childrenOf(tasks, t.id)) onSave({ ...k, projectId: t.projectId, updatedAt: Date.now() })
  }

  const addTop = (title: string) => {
    const proj = fixedProjectId ?? (projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : null)
    onSave(newTask({ title, projectId: proj }))
  }
  const addChild = (parent: Task, title: string) => onSave(newTask({ title, parentId: parent.id, projectId: parent.projectId }))

  const ctx: Ctx = { tasks, projects, today, open, toggleOpen, save, del: onDelete, addChild }
  const shown = tab === 'active' ? active : archived
  const liveProjects = projects.filter((p) => !p.deletedAt)

  return (
    <div className="tasks-view">
      <div className="tasks-bar">
        <div className="seg">
          <button className={tab === 'active' ? 'on' : ''} onClick={() => { setTab('active'); setRecent(new Set()) }}>
            Đang làm ({activeAll.length})
          </button>
          <button className={tab === 'archived' ? 'on' : ''} onClick={() => { setTab('archived'); setRecent(new Set()) }}>
            Archived ({archivedCount})
          </button>
        </div>
        {!fixedProjectId && (
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} title="Lọc theo project">
            <option value="all">Mọi project</option>
            <option value="none">(Không có project)</option>
            {liveProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {tab === 'active' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} title="Lọc theo trạng thái">
            <option value="all">Mọi trạng thái</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="redo">Re-do</option>
          </select>
        )}
      </div>

      {tab === 'active' && (
        <input
          ref={quickRef}
          className="quick-add"
          value={quick}
          placeholder="＋ Thêm task mới, gõ tên rồi nhấn Enter"
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quick.trim()) {
              addTop(quick.trim())
              setQuick('')
            }
          }}
        />
      )}
      {tab === 'archived' && (
        <p className="muted archive-note">
          {archiveMonths > 0 ? `Task đã xong nằm ở đây ${archiveMonths} tháng rồi tự xóa (đổi trong Setting).` : 'Đang tắt tự xóa: task đã xong được giữ mãi (đổi trong Setting).'}
        </p>
      )}

      <div className="task-list">
        {shown.length === 0 && (
          <p className="empty">{tab === 'active' ? 'Chưa có task nào. Gõ tên vào ô phía trên rồi nhấn Enter để thêm.' : 'Chưa có task nào trong Archived.'}</p>
        )}
        {shown.map((t) => (
          <TaskRow key={t.id} task={t} depth={0} ctx={ctx} />
        ))}
      </div>
    </div>
  )
}
