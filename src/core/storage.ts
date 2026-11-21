import type { CalEvent, CalendarSource } from './calendar'
import type { AppNotification, Folder, Note, Project, Reminder, Settings, Task } from './types'

/** Lớp trung gian lưu trữ. Desktop dùng SQLite, mobile sau này dùng cách khác. */
export interface Storage {
  listNotes(): Promise<Note[]>
  saveNote(note: Note): Promise<void>
  listFolders(): Promise<Folder[]>
  saveFolder(folder: Folder): Promise<void>
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  /** Xóa hẳn các mục đã vào thùng rác trước mốc `before` (ms). Trả về số mục đã dọn. */
  purgeTrash(before: number): Promise<number>
  /** Xóa hẳn một note khỏi thùng rác. */
  deleteNoteForever(id: string): Promise<void>
  listReminders(): Promise<Reminder[]>
  /** Project và task (gồm cả mục đã xóa; giao diện tự lọc). */
  listProjects(): Promise<Project[]>
  saveProject(project: Project): Promise<void>
  listTasks(): Promise<Task[]>
  saveTask(task: Task): Promise<void>
  saveReminder(reminder: Reminder): Promise<void>
  /** Trung tâm thông báo trong app, mới nhất trước. */
  listNotifications(): Promise<AppNotification[]>
  saveNotification(n: AppNotification): Promise<void>
  markAllNotificationsRead(at: number): Promise<void>
  /** Lịch trong app và các lịch kết nối (Google, iCal). */
  listCalendars(): Promise<CalendarSource[]>
  saveCalendar(c: CalendarSource): Promise<void>
  listEvents(): Promise<CalEvent[]>
  /** Chỉ dùng cho sự kiện của lịch trong app; sự kiện Google đi qua IPC riêng để ghi lên Google. */
  saveEvent(e: CalEvent): Promise<void>
}

export const STORAGE_METHODS = [
  'listNotes',
  'saveNote',
  'listFolders',
  'saveFolder',
  'getSettings',
  'saveSettings',
  'purgeTrash',
  'deleteNoteForever',
  'listReminders',
  'saveReminder',
  'listProjects',
  'saveProject',
  'listTasks',
  'saveTask',
  'listNotifications',
  'saveNotification',
  'markAllNotificationsRead',
  'listCalendars',
  'saveCalendar',
  'listEvents',
  'saveEvent'
] as const
