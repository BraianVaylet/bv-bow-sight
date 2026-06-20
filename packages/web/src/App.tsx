import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Spinner } from './components/ui';
import { useMe } from './hooks/useAuth';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Recover } from './pages/Recover';
import { Register } from './pages/Register';
import { Setups } from './pages/Setups';
import { SightCreate } from './pages/SightCreate';
import { SightDetail } from './pages/SightDetail';
import { SightEdit } from './pages/SightEdit';

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

/** Solo accesible con sesión. */
function Protected() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Solo accesible sin sesión (login/registro). */
function PublicOnly() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<Recover />} />
      </Route>

      <Route element={<Protected />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/setups/bow-setups"
            element={<Setups kind="bow-setups" title="Setups de arco" />}
          />
          <Route
            path="/setups/arrow-setups"
            element={<Setups kind="arrow-setups" title="Sets de flechas" />}
          />
          <Route path="/sight/new" element={<SightCreate />} />
          <Route path="/sight/:id" element={<SightDetail />} />
          <Route path="/sight/:id/edit" element={<SightEdit />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
