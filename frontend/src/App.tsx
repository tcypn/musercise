import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ComingSoon } from './pages/ComingSoon'
import { Daily } from './pages/Daily'
import { Dashboard } from './pages/Dashboard'
import { Exercise } from './pages/Exercise'
import { MapPage } from './pages/MapPage'
import { Progress } from './pages/Progress'
import { Roadmap } from './pages/Roadmap'
import { Settings } from './pages/Settings'

/** Links from the first version of the app were /practice/<level>: those were intervals. */
function LegacyPractice() {
  const { level } = useParams()
  return <Navigate to={`/practice/intervals/${level}`} replace />
}

/** The dashboard uses a wider page than the reading pages. */
function Shell() {
  const wide = useLocation().pathname === '/'
  return (
    <div className={wide ? 'shell wide' : 'shell'}>
      <header className="site-header">
        <NavLink to="/" className="wordmark">musercise</NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/daily">Today</NavLink>
          <NavLink to="/progress">Progress</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/learn/:exercise" element={<Roadmap />} />
          <Route path="/practice/:exercise/:level" element={<Exercise />} />
          <Route path="/practice/:level" element={<LegacyPractice />} />
          <Route path="/soon/:concept" element={<ComingSoon />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      <footer className="site-footer">
        Piano sounds: Salamander Grand Piano by Alexander Holm, CC BY 3.0.
      </footer>
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
