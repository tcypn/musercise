import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Brand, SideNav } from './components/SideNav'
import { TabBar } from './components/TabBar'
import { ComingSoon } from './pages/ComingSoon'
import { Daily } from './pages/Daily'
import { Exercise, Mistakes } from './pages/Exercise'
import { Goals } from './pages/Goals'
import { Learn } from './pages/Learn'
import { MapPage } from './pages/MapPage'
import { Progress } from './pages/Progress'
import { Roadmap } from './pages/Roadmap'
import { Settings } from './pages/Settings'
import { Streak } from './pages/Streak'

/** Links from the first version of the app were /practice/<level>: those were intervals. */
function LegacyPractice() {
  const { level } = useParams()
  return <Navigate to={`/practice/intervals/${level}`} replace />
}

/** Home is wider than the reading pages, and a lesson in progress takes over the whole screen. */
function Shell() {
  const path = useLocation().pathname
  const mode = path === '/' ? ' wide' : path.startsWith('/practice/') || path.startsWith('/mistakes/') ? ' focus' : ''
  return (
    <div className={`shell${mode}`}>
      <SideNav />
      <div className="app-col">
        <header className="site-header">
          <Brand />
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Learn />} />
            <Route path="/streak" element={<Streak />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/learn/:exercise" element={<Roadmap />} />
            <Route path="/practice/:exercise/:level" element={<Exercise />} />
            <Route path="/mistakes/:exercise" element={<Mistakes />} />
            <Route path="/practice/:level" element={<LegacyPractice />} />
            <Route path="/soon/:concept" element={<ComingSoon />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Learn />} />
          </Routes>
        </main>
      </div>
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
