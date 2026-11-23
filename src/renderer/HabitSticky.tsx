import { useEffect, useState } from 'react'
import { makeLog, type Habit, type HabitLog } from '@core/habits'
import { applyTheme } from './theme'

const { storage, desktop } = window.api

/** Cửa sổ nhắc nổi của habit: hỏi đã làm hay bỏ qua cho một khung giờ. Đóng mà không trả lời thì khung giờ còn chờ trong ngày. */
export function HabitSticky({ id, date, time }: { id: string; date: string; time: string }) {
  const [habit, setHabit] = useState<Habit | null>(null)
  const [log, setLog] = useState<HabitLog | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void storage.getSettings().then(applyTheme)
    void Promise.all([storage.listHabits(), storage.listHabitLogs()]).then(([hs, ls]) => {
      setHabit(hs.find((h) => h.id === id && !h.deletedAt) ?? null)
      setLog(ls.find((l) => l.habitId === id && l.date === date && l.time === time) ?? null)
      setLoaded(true)
    })
  }, [id, date, time])

  if (!loaded) return null
  if (!habit) return <div className="sticky-missing">Không tìm thấy habit.</div>

  const answer = async (result: 'done' | 'skipped') => {
    await storage.saveHabitLog(makeLog(id, date, time, result, Date.now()))
    void desktop.stickyClose()
  }

  return (
    <div className="remind-paper habit">
      <div className="remind-bar">
        <span>🌱 Habit</span>
        <button title="Đóng (chưa trả lời)" onClick={() => void desktop.stickyClose()}>
          ✕
        </button>
      </div>
      <h2>{habit.name}</h2>
      <p className="remind-due">Khung giờ {time}</p>
      {log && <p className="remind-notes">Bạn đã trả lời: {log.result === 'done' ? 'Đã làm ✓' : 'Bỏ qua'} (bấm lại để đổi).</p>}
      <div className="remind-actions">
        <button className="primary" onClick={() => void answer('done')}>
          ✓ Đã làm
        </button>
        <button onClick={() => void answer('skipped')}>Bỏ qua</button>
      </div>
    </div>
  )
}
