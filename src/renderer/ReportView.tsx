import { useMemo, useState } from 'react'
import { PERIOD_KINDS, currentPeriod, periodRange, reportDateOf, shiftPeriod, summarize, tasksInPeriod, type Period, type PeriodKind } from '@core/report'
import { TASK_STATUSES, type Project, type Task, type TaskStatus } from '@core/types'

const STATUS_COLOR: Record<TaskStatus, string> = { pending: '#7d8590', in_progress: 'var(--accent)', redo: '#e8590c', done: '#2fa874' }
const STATUS_LABEL: Record<TaskStatus, string> = { pending: 'Pending', in_progress: 'In progress', redo: 'Re-do', done: 'Done' }

const pct = (n: number, total: number): string => (total ? `${Math.round((n / total) * 100)}%` : '0%')

function Donut({ slices, total, active, onPick }: { slices: { key: string; color: string; count: number; name: string }[]; total: number; active: string | null; onPick: (key: string) => void }) {
  const R = 78
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <svg viewBox="0 0 200 200" className="donut" role="img" aria-label="Biểu đồ tròn tỷ lệ task theo project">
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface)" strokeWidth="34" />
      {slices.map((s) => {
        const len = (s.count / total) * C
        const el = (
          <circle
            key={s.key}
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={active === s.key ? 40 : 34}
            strokeDasharray={`${Math.max(0, len - (slices.length > 1 ? 2 : 0))} ${C}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 100 100)"
            opacity={active && active !== s.key ? 0.35 : 1}
            style={{ cursor: 'pointer' }}
            onClick={() => onPick(s.key)}
          >
            <title>{`${s.name}: ${s.count} (${pct(s.count, total)})`}</title>
          </circle>
        )
        offset += len
        return el
      })}
      <text x="100" y="98" textAnchor="middle" className="donut-total">
        {total}
      </text>
      <text x="100" y="118" textAnchor="middle" className="donut-sub">
        task
      </text>
    </svg>
  )
}

function Bars({ counts, active, onPick }: { counts: Record<TaskStatus, number>; active: TaskStatus | null; onPick: (s: TaskStatus) => void }) {
  const max = Math.max(1, ...TASK_STATUSES.map((s) => counts[s.id]))
  const H = 150
  return (
    <svg viewBox="0 0 320 210" className="bars" role="img" aria-label="Biểu đồ cột số task theo trạng thái">
      <line x1="10" y1={H + 20} x2="310" y2={H + 20} stroke="var(--border)" />
      {TASK_STATUSES.map((s, i) => {
        const n = counts[s.id]
        const h = (n / max) * H
        const x = 24 + i * 74
        return (
          <g key={s.id} style={{ cursor: 'pointer' }} opacity={active && active !== s.id ? 0.35 : 1} onClick={() => onPick(s.id)}>
            <title>{`${STATUS_LABEL[s.id]}: ${n}`}</title>
            <rect x={x} y={H + 20 - h} width="52" height={Math.max(h, n ? 2 : 0)} rx="8" fill={STATUS_COLOR[s.id]} />
            <rect x={x} y="0" width="52" height={H + 40} fill="transparent" />
            <text x={x + 26} y={H + 14 - h} textAnchor="middle" className="bar-n">
              {n}
            </text>
            <text x={x + 26} y={H + 38} textAnchor="middle" className="bar-l">
              {STATUS_LABEL[s.id]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function shortDate(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export function ReportView({ tasks, projects, now, onOpenTask }: { tasks: Task[]; projects: Project[]; now: number; onOpenTask: (id: string) => void }) {
  const [kind, setKind] = useState<PeriodKind>('month')
  const [period, setPeriod] = useState<Period>(() => currentPeriod('month', now))
  const [projFilter, setProjFilter] = useState<string | null>(null) // 'none' = không có project
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null)

  const range = periodRange(period)
  const inPeriod = useMemo(() => tasksInPeriod(tasks, range), [tasks, range.from, range.to])
  const sum = useMemo(() => summarize(inPeriod, projects), [inPeriod, projects])
  const slices = sum.byProject.map((p) => ({ key: p.projectId ?? 'none', color: p.color, count: p.count, name: p.name }))

  const shown = inPeriod.filter((t) => (!projFilter || (t.projectId ?? 'none') === projFilter) && (!statusFilter || t.status === statusFilter))
  const projOf = (t: Task) => (t.projectId ? projects.find((p) => p.id === t.projectId) : undefined)
  const isCurrent = period.year === currentPeriod(kind, now).year && period.index === currentPeriod(kind, now).index

  const changeKind = (k: PeriodKind) => {
    setKind(k)
    setPeriod(currentPeriod(k, now))
    setProjFilter(null)
    setStatusFilter(null)
  }

  return (
    <div className="page">
      <header className="main-head">
        <h1>Report</h1>
      </header>
      <div className="page-body">
        <div className="report-bar">
          <div className="seg">
            {PERIOD_KINDS.map((k) => (
              <button key={k.id} className={kind === k.id ? 'on' : ''} onClick={() => changeKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="period-nav">
            <button onClick={() => setPeriod(shiftPeriod(period, -1))} title="Kỳ trước">
              ‹
            </button>
            <b>{range.label}</b>
            <button onClick={() => setPeriod(shiftPeriod(period, 1))} title="Kỳ sau">
              ›
            </button>
            {!isCurrent && <button onClick={() => setPeriod(currentPeriod(kind, now))}>Kỳ hiện tại</button>}
          </div>
        </div>

        {sum.total === 0 ? (
          <p className="empty">Không có task nào trong kỳ này. Task được tính theo ngày kết thúc (không có thì theo ngày tạo).</p>
        ) : (
          <>
            <div className="report-cards">
              <section className="report-card">
                <b>Tỷ lệ theo project</b>
                <div className="pie-wrap">
                  <Donut slices={slices} total={sum.total} active={projFilter} onPick={(k) => setProjFilter((cur) => (cur === k ? null : k))} />
                  <ul className="legend">
                    {slices.map((s) => (
                      <li key={s.key} className={projFilter === s.key ? 'on' : ''} onClick={() => setProjFilter((cur) => (cur === s.key ? null : s.key))}>
                        <i style={{ background: s.color }} />
                        <span>{s.name}</span>
                        <small>
                          {s.count} · {pct(s.count, sum.total)}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
              <section className="report-card">
                <b>Số task theo trạng thái</b>
                <Bars counts={sum.byStatus} active={statusFilter} onPick={(s) => setStatusFilter((cur) => (cur === s ? null : s))} />
              </section>
            </div>

            <div className="report-list-head">
              <b>
                Task trong kỳ ({shown.length}
                {shown.length !== sum.total ? `/${sum.total}` : ''})
              </b>
              {(projFilter || statusFilter) && (
                <button
                  onClick={() => {
                    setProjFilter(null)
                    setStatusFilter(null)
                  }}
                >
                  Bỏ lọc
                </button>
              )}
              <small className="muted">Bấm vào biểu đồ để lọc danh sách.</small>
            </div>
            <div className="report-list">
              {shown.map((t) => {
                const p = projOf(t)
                return (
                  <div key={t.id} className="report-row" onClick={() => onOpenTask(t.id)} title="Mở task">
                    <span className={`st st-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                    <span className={`t-title ${t.status === 'done' ? 'struck' : ''}`}>{t.title.trim() || '(Chưa đặt tên)'}</span>
                    {p && (
                      <span className="proj-chip">
                        <i style={{ background: p.color }} />
                        {p.name}
                      </span>
                    )}
                    <small className="t-dates">
                      {t.end ? `Hạn ${shortDate(t.end)}` : `Tạo ${shortDate(reportDateOf(t))}`}
                    </small>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
