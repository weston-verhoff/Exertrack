import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlobalHeader } from './components/GlobalHeader';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import './index.css';

const Dashboard = lazy(() => import('./pages/index'));
const PlanSession = lazy(() => import('./pages/plan'));
const Templates = lazy(() => import('./pages/templates'));
const WorkoutRunner = lazy(() => import('./pages/runner'));
const Recap = lazy(() => import('./pages/recap'));
const PastWorkouts = lazy(() => import('./pages/past'));
const Analytics = lazy(() => import('./pages/analytics'));
const PastDetail = lazy(() => import('./pages/past_detail'));
const WorkoutRecap = lazy(() => import('./pages/workout'));
const Login = lazy(() => import('./pages/login'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlobalHeader />

        <main>
          <Suspense fallback={<div className="page-loading">Loading...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/templates/:id/edit"
                element={
                  <ProtectedRoute>
                    <PlanSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan"
                element={
                  <ProtectedRoute>
                    <PlanSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/templates"
                element={
                  <ProtectedRoute>
                    <Templates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/runner"
                element={
                  <ProtectedRoute>
                    <WorkoutRunner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recap"
                element={
                  <ProtectedRoute>
                    <Recap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/past"
                element={
                  <ProtectedRoute>
                    <PastWorkouts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/past/:id"
                element={
                  <ProtectedRoute>
                    <PastDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workout/:id"
                element={
                  <ProtectedRoute>
                    <WorkoutRecap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/runner/:id"
                element={
                  <ProtectedRoute>
                    <WorkoutRunner />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
