import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Exercise } from './pages/Exercise'
import { Progress } from './pages/Progress'
import { Roadmap } from './pages/Roadmap'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <header className="site-header">
        <NavLink to="/" className="wordmark">musercise</NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>Roadmap</NavLink>
          <NavLink to="/progress">Progress</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Roadmap />} />
          <Route path="/practice/:levelId" element={<Exercise />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Roadmap />} />
        </Routes>
      </main>
      <footer className="site-footer">
        Piano sounds: Salamander Grand Piano by Alexander Holm, CC BY 3.0.
      </footer>
    </HashRouter>
  )
}
