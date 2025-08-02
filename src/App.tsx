import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/index';
import PlanSession from './pages/plan';
import Templates from './pages/templates';
import WorkoutRunner from './pages/runner';
import Recap from './pages/recap';
import PastWorkouts from './pages/past';
import Analytics from './pages/analytics';
import PastDetail from './pages/past_detail';
import WorkoutRecap from './pages/workout';
import { GlobalHeader } from './components/GlobalHeader';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <GlobalHeader /> {}

      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates/:id/edit" element={<PlanSession />} />
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
      </main>
    </BrowserRouter>
  );
}

export default App;
