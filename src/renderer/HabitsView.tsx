import { useMemo, useState } from 'react'
import { bestStreak, currentStreak, habitRange, habitStats, indexLogs, makeLog, newHabit, slotKey, slotState, slotsOn, type Habit, type HabitLog, type HabitResult, type ReportPeriod, type SlotState } from '@core/habits'
import { dateStr } from '@core/reminders'

// Hiển thị thứ: giá trị 0 = Chủ nhật ... 6 = thứ Bảy, nhưng xếp từ thứ Hai.
const DAYS: { v: number; label: string }[] = [
  { v: 1, label: 'T2' },
  { v: 2, label: 'T3' },
  { v: 3, label: 'T4' },
  { v: 4, label: 'T5' },
  { v: 5, label: 'T6' },
  { v: 6, label: 'T7' },
  { v: 0, label: 'CN' }
]

const STATE_LABEL: Record<SlotState, string> = { done: '✓ Đã làm', skipped: 'Bỏ qua', missed: 'Lỡ', pending: 'Chưa trả lời' }

const daysText = (h: Habit): string => {
  if (h.weekdays.length === 7) return 'Mỗi ngày'
  return DAYS.filter((d) => h.weekdays.includes(d.v)).map((d) => d.label).join(' ')
}

interface Props {
  habits: Habit[]
  logs: HabitLog[]
  now: number
  retentionMonths: number
  onSaveHabit: (h: Habit) => void
  onDeleteHabit: (h: Habit) => void
  onSaveLog: (l: HabitLog) => void
}

function HabitForm({ initial, onSave, onCancel }: { initial: Habit | null; onSave: (h: Habit) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 2, 3, 4, 5])
  const [times, setTimes] = useState<string[]>(initial?.times ?? ['09:00'])
  const cleanTimes = [...new Set(times.filter((t) => /^\d{2}:\d{2}$/.test(t)))].sort()
  const valid = name.trim() !== '' && weekdays.length > 0 && cleanTimes.length > 0

  const save = () => {
    if (!valid) return
    const base = initial ?? newHabit()
    onSave({ ...base, name: name.trim(), weekdays, times: cleanTimes, updatedAt: Date.now() })
  }

  return (
    <div className="habit-form">
      <input autoFocus value={name} placeholder="Tên habit, ví dụ: Uống nước, Tập thể dục" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      <div>
        <span className="lbl">Các ngày trong tuần</span>
        <div className="seg">
          {DAYS.map((d) => (
            <button key={d.v} className={weekdays.includes(d.v) ? 'on' : ''} onClick={() => setWeekdays((w) => (w.includes(d.v) ? w.filter((x) => x !== d.v) : [...w, d.v]))}>
              {d.label}
            </button>
          ))}
          <button onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}>Mỗi ngày</button>
        </div>
      </div>
      <div>
        <span className="lbl">Các khung giờ nhắc trong ngày</span>
        <div className="habit-times">
          {times.map((t, i) => (
            <span key={i} className="habit-time">
              <input type="time" value={t} onChange={(e) => setTimes((all) => all.map((x, j) => (j === i ? e.target.value : x)))} />
              {times.length > 1 && (
                <button className="icon" title="Bỏ khung giờ này" onClick={() => setTimes((all) => all.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </span>
          ))}
          <button onClick={() => setTimes((all) => [...all, '12:00'])}>＋ Thêm giờ</button>
        </div>
      </div>
      <div className="pop-actions end">
        <button onClick={onCancel}>Hủy</button>
        <button className="primary" disabled={!valid} onClick={save}>
          {initial ? 'Lưu' : 'Tạo habit'}
        </button>
      </div>
    </div>
  )
}

const dayClass = (scheduled: number, done: number): string => (scheduled === 0 ? 'none' : done === scheduled ? 'full' : done > 0 ? 'part' : 'zero')

export function HabitsView({ habits, logs, now, retentionMonths, onSaveHabit, onDeleteHabit, onSaveLog }: Props) {
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  const [period, setPeriod] = useState<ReportPeriod>('week')
  const [offset, setOffset] = useState(0)
  const today = dateStr(new Date(now))
  const logMap = useMemo(() => indexLogs(logs), [logs])
  const live = habits.filter((h) => !h.deletedAt).sort((a, b) => a.createdAt - b.createdAt)
  const range = habitRange(period, today, offset)
  // Chuỗi chỉ đếm trong phạm vi lịch sử còn giữ.
  const floor = (() => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - Math.max(1, retentionMonths || 12))
    return dateStr(d)
  })()

  const todayRows = live
    .map((h) => ({ h, slots: slotsOn(h, today) }))
    .filter((x) => x.slots.length > 0)

  const answer = (h: Habit, time: string, result: HabitResult) => onSaveLog(makeLog(h.id, today, time, result, Date.now()))

  return (
    <div className="page">
      <header className="main-head">
        <h1>Habit</h1>
        <button className="primary" onClick={() => setEditing('new')}>
          ＋ Habit mới
        </button>
      </header>
      <div className="page-body">
        {editing && (
          <HabitForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onSave={(h) => {
              onSaveHabit(h)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        <section className="habit-section">
          <h2>Hôm nay</h2>
          {todayRows.length === 0 && <p className="muted">{live.length === 0 ? 'Chưa có habit nào. Bấm “＋ Habit mới” để tạo.' : 'Hôm nay không có habit nào.'}</p>}
          {todayRows.map(({ h, slots }) => (
            <div key={h.id} className="habit-card">
              <b>{h.name}</b>
              <div className="habit-slots">
                {slots.map((time) => {
                  const st = slotState(h, today, time, logMap, today)
                  return (
                    <span key={time} className={`slot slot-${st}`}>
                      <i>{time}</i>
                      <em>{STATE_LABEL[st]}</em>
                      <button className={st === 'done' ? 'on' : ''} onClick={() => answer(h, time, 'done')}>
                        ✓ Đã làm
                      </button>
                      <button className={st === 'skipped' ? 'on' : ''} onClick={() => answer(h, time, 'skipped')}>
                        Bỏ qua
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="habit-section">
          <h2>Danh sách habit</h2>
          {live.map((h) => (
            <div key={h.id} className={`habit-row ${h.active ? '' : 'off'}`}>
              <div className="grow">
                <b>{h.name}</b>
                <small className="muted">
                  {daysText(h)} · {[...h.times].sort().join(', ')}
                </small>
              </div>
              <small className="streak" title="Chuỗi ngày liên tiếp làm đủ">
                🔥 {currentStreak(h, logMap, today, floor)} ngày
              </small>
              <label className="inline">
                <input type="checkbox" checked={h.active} onChange={(e) => onSaveHabit({ ...h, active: e.target.checked, updatedAt: Date.now() })} />
                Đang bật
              </label>
              <button className="icon" title="Sửa" onClick={() => setEditing(h)}>
                ✎
              </button>
              <button className="icon del" title="Xóa habit" onClick={() => onDeleteHabit(h)}>
                ✕
              </button>
            </div>
          ))}
        </section>

        <section className="habit-section">
          <div className="habit-report-head">
            <h2>Report</h2>
            <div className="seg">
              <button className={period === 'week' ? 'on' : ''} onClick={() => { setPeriod('week'); setOffset(0) }}>
                Tuần
              </button>
              <button className={period === 'month' ? 'on' : ''} onClick={() => { setPeriod('month'); setOffset(0) }}>
                Tháng
              </button>
            </div>
            <div className="period-nav">
              <button onClick={() => setOffset(offset - 1)} title="Kỳ trước">
                ‹
              </button>
              <b>{range.label}</b>
              <button onClick={() => setOffset(offset + 1)} title="Kỳ sau">
                ›
              </button>
              {offset !== 0 && <button onClick={() => setOffset(0)}>Kỳ hiện tại</button>}
            </div>
          </div>
          {live.length === 0 && <p className="muted">Chưa có habit nào để thống kê.</p>}
          {live.map((h) => {
            const s = habitStats(h, logMap, range.from, range.to, today)
            return (
              <div key={h.id} className="habit-stat">
                <div className="hs-head">
                  <b>{h.name}</b>
                  <small className="muted">
                    {s.scheduled === 0 ? 'Chưa có khung giờ nào trong kỳ' : `${s.done}/${s.scheduled} lần · ${Math.round(s.rate * 100)}%`}
                  </small>
                  <small className="streak">
                    🔥 {currentStreak(h, logMap, today, floor)} ngày (dài nhất {bestStreak(h, logMap, today, floor)})
                  </small>
                </div>
                {s.scheduled > 0 && (
                  <div className="hs-bar" title={`Đã làm ${s.done} · Bỏ qua ${s.skipped} · Lỡ ${s.missed}`}>
                    <i className="b-done" style={{ width: `${(s.done / s.scheduled) * 100}%` }} />
                    <i className="b-skip" style={{ width: `${(s.skipped / s.scheduled) * 100}%` }} />
                    <i className="b-miss" style={{ width: `${(s.missed / s.scheduled) * 100}%` }} />
                  </div>
                )}
                {s.scheduled > 0 && (
                  <small className="muted">
                    Đã làm {s.done} · Bỏ qua {s.skipped} · Lỡ {s.missed}
                  </small>
                )}
                <div className="hs-days">
                  {s.days.map((d) => (
                    <span key={d.date} className={`hd ${dayClass(d.scheduled, d.done)}`} title={`${d.date.slice(8)}/${d.date.slice(5, 7)}: ${d.scheduled ? `${d.done}/${d.scheduled}` : 'không có lịch'}`}>
                      {Number(d.date.slice(8))}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          <p className="muted habit-note">
            Dữ liệu habit chỉ lưu trên máy này (không đồng bộ Drive).{' '}
            {retentionMonths > 0 ? `Lịch sử giữ ${retentionMonths} tháng rồi tự xóa (đổi trong Setting).` : 'Đang tắt tự xóa lịch sử.'} Khung giờ chưa trả lời khi hết ngày được tính là “Lỡ”.
          </p>
        </section>
      </div>
    </div>
  )
}
