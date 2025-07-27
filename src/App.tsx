import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/index'
import PlanSession from './pages/plan'
import Templates from './pages/templates'
import WorkoutRunner from './pages/runner'
import Recap from './pages/recap'
import PastWorkouts from './pages/past'
import Analytics from './pages/analytics'
import PastDetail from './pages/past_detail'
import WorkoutRecap from './pages/workout'


function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '1rem', background: 'var(--bg-color)' }}>
        <Link to="/" style={{ color: 'var(--text-color)', marginRight: '1rem' }}>Dashboard</Link>
        <Link to="/plan" style={{ color: 'var(--text-color)', marginRight: '1rem' }}>Plan</Link>
        <Link to="/templates" style={{ color: 'var(--text-color)', marginRight: '1rem' }}>Templates</Link>
        <Link to="/past" style={{ color: 'var(--text-color)', marginRight: '1rem' }}>Past</Link>
        <Link to="/analytics" style={{ color: 'var(--text-color)' }}>Analytics</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plan" element={<PlanSession />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/runner" element={<WorkoutRunner />} />
        <Route path="/recap" element={<Recap />} />
        <Route path="/past" element={<PastWorkouts />} />
        <Route path="/analytics" element={<Analytics />} />
				<Route path="/past/:id" element={<PastDetail />} />
				<Route path="/workout/:id" element={<WorkoutRecap />} />
				<Route path="/runner/:id" element={<WorkoutRunner />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
