import { createRoot } from 'react-dom/client'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/latin-ext-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/latin-ext-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/lora/latin-400.css'
import '@fontsource/lora/latin-ext-400.css'
import '@fontsource/lora/vietnamese-400.css'
import '@fontsource/patrick-hand/latin-400.css'
import '@fontsource/patrick-hand/latin-ext-400.css'
import '@fontsource/patrick-hand/vietnamese-400.css'
import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-ext-400.css'
import '@fontsource/roboto-mono/vietnamese-400.css'
import './styles.css'
import { App } from './App'
import { EventSticky } from './EventSticky'
import { HabitSticky } from './HabitSticky'
import { ReminderSticky } from './ReminderSticky'
import { StickyApp } from './StickyApp'

const sticky = /^#\/sticky\/(.+)$/.exec(location.hash)
const reminder = /^#\/reminder\/(.+)$/.exec(location.hash)
const eventWin = /^#\/event\/([^/]+)\/(\d+)$/.exec(location.hash)
const habitWin = /^#\/habit\/([^/]+)\/(\d{4}-\d{2}-\d{2})\/(\d{4})$/.exec(location.hash)
if (sticky || reminder || eventWin || habitWin) document.body.classList.add('sticky-window')

createRoot(document.getElementById('root')!).render(
  sticky ? (
    <StickyApp noteId={sticky[1]} />
  ) : reminder ? (
    <ReminderSticky id={reminder[1]} />
  ) : eventWin ? (
    <EventSticky id={eventWin[1]} start={Number(eventWin[2])} />
  ) : habitWin ? (
    <HabitSticky id={habitWin[1]} date={habitWin[2]} time={`${habitWin[3].slice(0, 2)}:${habitWin[3].slice(2)}`} />
  ) : <App compactStart={location.hash === '#/compact'} />
)
