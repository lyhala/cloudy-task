import { useState } from 'react'
import { PROJECT_COLORS, TASK_STATUSES, newProject, type Project, type Task } from '@core/types'
import { countByStatus, topLevel } from '@core/tasks'
import { TasksView } from './TasksView'

interface Props {
  projects: Project[]
  tasks: Task[]
  today: string
  archiveMonths: number
  focusId?: string | null
  onSaveProject: (p: Project) => void
  onDeleteProject: (p: Project) => void
  onSaveTask: (t: Task) => void
  onDeleteTask: (t: Task) => void
}

function Colors({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="proj-colors">
      {PROJECT_COLORS.map((c) => (
        <button key={c} className={`swatch ${value === c ? 'on' : ''}`} style={{ background: c }} title={c} onClick={() => onPick(c)} />
      ))}
    </div>
  )
}

export function ProjectsView(props: Props) {
  const { projects, tasks, today, archiveMonths, onSaveProject, onDeleteProject } = props
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [desc, setDesc] = useState('')

  const live = projects.filter((p) => !p.deletedAt).sort((a, b) => Number(a.closed) - Number(b.closed) || a.createdAt - b.createdAt)
  const sel = live.find((p) => p.id === selected)

  if (sel) {
    const patch = (p: Partial<Project>) => onSaveProject({ ...sel, ...p, updatedAt: Date.now() })
    const counts = countByStatus(tasks, sel.id)
    return (
      <div className="page">
        <header className="main-head">
          <button onClick={() => setSelected(null)}>← Project</button>
          <h1>
            <i className="proj-dot" style={{ background: sel.color }} /> {sel.name || '(Chưa đặt tên)'}
          </h1>
          {sel.closed && <span className="st st-closed">Đã đóng</span>}
        </header>
        <div className="page-body">
          <div className="proj-info">
            <input value={sel.name} placeholder="Tên project" onChange={(e) => patch({ name: e.target.value })} />
            <Colors value={sel.color} onPick={(c) => patch({ color: c })} />
            <textarea value={sel.description} placeholder="Mô tả project..." rows={2} onChange={(e) => patch({ description: e.target.value })} />
            <div className="proj-stats">
              {TASK_STATUSES.map((s) => (
                <span key={s.id} className={`stat st-${s.id}`}>
                  <b>{counts[s.id]}</b> {s.label}
                </span>
              ))}
            </div>
            <div className="proj-actions">
              <label className="inline">
                <input type="checkbox" checked={sel.closed} onChange={(e) => patch({ closed: e.target.checked })} />
                Đã đóng project (không còn trong danh sách chọn khi tạo task mới)
              </label>
              <button className="danger" onClick={() => onDeleteProject(sel)}>
                Xóa project
              </button>
            </div>
          </div>
          <TasksView
            tasks={tasks}
            projects={projects}
            today={today}
            fixedProjectId={sel.id}
            archiveMonths={archiveMonths}
            focusId={props.focusId}
            onSave={props.onSaveTask}
            onDelete={props.onDeleteTask}
          />
        </div>
      </div>
    )
  }

  const create = () => {
    if (!name.trim()) return
    const p = newProject({ name: name.trim(), color, description: desc.trim() })
    onSaveProject(p)
    setName('')
    setDesc('')
    setCreating(false)
    setSelected(p.id)
  }

  return (
    <div className="page">
      <header className="main-head">
        <h1>Project</h1>
        <button className="primary" onClick={() => setCreating((v) => !v)}>
          ＋ Project mới
        </button>
      </header>
      <div className="page-body">
        {creating && (
          <div className="proj-new">
            <input autoFocus value={name} placeholder="Tên project" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
            <Colors value={color} onPick={setColor} />
            <textarea value={desc} placeholder="Mô tả (không bắt buộc)" rows={2} onChange={(e) => setDesc(e.target.value)} />
            <div className="pop-actions end">
              <button onClick={() => setCreating(false)}>Hủy</button>
              <button className="primary" disabled={!name.trim()} onClick={create}>
                Tạo project
              </button>
            </div>
          </div>
        )}
        {live.length === 0 && !creating && <p className="empty">Chưa có project nào. Bấm “＋ Project mới” để tạo. Task vẫn dùng được khi không có project.</p>}
        <div className="proj-grid">
          {live.map((p) => {
            const c = countByStatus(tasks, p.id)
            const total = topLevel(tasks).filter((t) => t.projectId === p.id).length
            return (
              <button key={p.id} className={`proj-card ${p.closed ? 'closed' : ''}`} onClick={() => setSelected(p.id)}>
                <span className="pc-head">
                  <i className="proj-dot" style={{ background: p.color }} />
                  <b>{p.name || '(Chưa đặt tên)'}</b>
                  {p.closed && <span className="st st-closed">Đã đóng</span>}
                </span>
                {p.description && <small className="pc-desc">{p.description}</small>}
                <small className="pc-count">
                  {total === 0 ? 'Chưa có task' : `${c.in_progress + c.pending + c.redo} đang làm · ${c.done} xong`}
                </small>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
