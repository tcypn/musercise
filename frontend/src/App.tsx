import { HashRouter, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { ComingSoon } from './pages/ComingSoon'
import { Exercise } from './pages/Exercise'
import { Home } from './pages/Home'
import { Progress } from './pages/Progress'
import { Roadmap } from './pages/Roadmap'
import { Settings } from './pages/Settings'

/** Links from the first version of the app were /practice/<level>: those were intervals. */
function LegacyPractice() {
  const { level } = useParams()
  return <Navigate to={`/practice/intervals/${level}`} replace />
}

export default function App() {
  return (
    <HashRouter>
      <header className="site-header">
        <NavLink to="/" className="wordmark">musercise</NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>Map</NavLink>
          <NavLink to="/progress">Progress</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn/:exercise" element={<Roadmap />} />
          <Route path="/practice/:exercise/:level" element={<Exercise />} />
          <Route path="/practice/:level" element={<LegacyPractice />} />
          <Route path="/soon/:concept" element={<ComingSoon />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="site-footer">
        Piano sounds: Salamander Grand Piano by Alexander Holm, CC BY 3.0.
      </footer>
    </HashRouter>
  )
}
