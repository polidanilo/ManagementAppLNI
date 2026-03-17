import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AppProvider, useAppContext } from './context/AppContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Orders from './pages/Orders.tsx';
import Works from './pages/Works.tsx';
import Boats from './pages/Boats.tsx';
import BoatsDetails from './pages/BoatsDetails.tsx';
import BoatsNew from './pages/BoatsNew.tsx';
import Reports from './pages/Reports.tsx';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppContext();
  
  // If there is no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// If already authenticated, redirect to home
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppContext();
  
  // If a token exists, redirect to home
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/works"
              element={
                <ProtectedRoute>
                  <Works />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Reports />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/boats"
              element={
                <ProtectedRoute>
                  <Boats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/boats/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <BoatsDetails />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/boats/new"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <BoatsNew />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AppProvider>
    </QueryClientProvider>
  );
};

export default App;