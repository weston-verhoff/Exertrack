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
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/login';
import './index.css';

function App() {
  return (
    <BrowserRouter>
		<AuthProvider>
			<GlobalHeader />

			<main>
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
			</main>
		</AuthProvider>
    </BrowserRouter>
  );
}

export default App;
