import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import DashboardNavbar from '@/components/DashboardNavbar';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import UsersPage from '@/pages/UsersPage';
import BusesPage from '@/pages/BusesPage';
import ChargersPage from '@/pages/ChargersPage';
import DistrictsPage from '@/pages/DistrictsPage';
import UserWorkspace from '@/pages/UserWorkspace';
import UserDashboardPage from '@/pages/UserDashboardPage';
import UserRoutesPage from '@/pages/UserRoutesPage';
import UserBusesPage from '@/pages/UserBusesPage';
import UserChargersPage from '@/pages/UserChargersPage';
import UserReportsPage from '@/pages/UserReportsPage';
import UserDistrictDetailsPage from '@/pages/UserDistrictDetailsPage';
import LoginModal from '@/components/LoginModal';
import ContactModal from '@/components/ContactModal';
import { sendVisitAnalytics, decodeTokenClaims } from '@/apiCalls';
import { buildVisitAnalyticsPayload } from '@/analytics/visitPayload';

function parseStoredRoles() {
  const raw = window.localStorage.getItem('spark-user-roles');
  if (!raw) {
    const singleRole = window.localStorage.getItem('spark-user-role');
    return singleRole ? [singleRole] : ['User'];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['User'];
  } catch {
    return ['User'];
  }
}

function hasAdminRole(roles) {
  return roles.some((role) => String(role).toLowerCase() === 'admin');
}

function extractUserIdFromClaims(claims) {
  if (!claims || typeof claims !== 'object') {
    return null;
  }

  return claims.sub
    ?? claims.userId
    ?? claims.id
    ?? claims.nameid
    ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    ?? null;
}

function AppContent() {
  const [activeModal, setActiveModal] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = window.localStorage.getItem('spark-authenticated') === 'true';
    const storedToken = window.localStorage.getItem('spark-token');
    return storedAuth || Boolean(storedToken);
  });
  const [userName, setUserName] = useState(() => {
    return window.localStorage.getItem('spark-user-name') || 'Fleet Manager';
  });
  const [userRole, setUserRole] = useState(() => {
    return window.localStorage.getItem('spark-user-role') || 'User';
  });
  const [userRoles, setUserRoles] = useState(() => parseStoredRoles());
  const location = useLocation(); // Tracks the current URL

  useEffect(() => {
    const storedToken = window.localStorage.getItem('spark-token');
    if (!storedToken) {
      return;
    }

    const claims = decodeTokenClaims(storedToken);
    if (!claims) {
      return;
    }

    const claimName = claims.name || claims.unique_name || claims.email;
    const claimRole =
      claims.role
      ?? claims.roles
      ?? claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

    if (claimName && !window.localStorage.getItem('spark-user-name')) {
      const normalizedName = claimName.includes('@') ? claimName.split('@')[0] : claimName;
      setUserName(normalizedName);
      window.localStorage.setItem('spark-user-name', normalizedName);
    }

    if (claimRole && !window.localStorage.getItem('spark-user-role')) {
      const normalizedRoles = Array.isArray(claimRole) ? claimRole.filter(Boolean) : [claimRole];
      if (normalizedRoles.length > 0) {
        setUserRoles(normalizedRoles);
        setUserRole(normalizedRoles[0]);
        window.localStorage.setItem('spark-user-role', normalizedRoles[0]);
        window.localStorage.setItem('spark-user-roles', JSON.stringify(normalizedRoles));
      }
    }

    const claimUserId = extractUserIdFromClaims(claims);
    if (claimUserId !== null && claimUserId !== undefined && !window.localStorage.getItem('spark-user-id')) {
      window.localStorage.setItem('spark-user-id', String(claimUserId));
    }
  }, []);

  useEffect(() => {
    const recordVisit = async () => {
      const payload = buildVisitAnalyticsPayload({
        location,
        isAuthenticated,
      });

      try {
        await sendVisitAnalytics(payload);
      } catch (err) {
        console.debug('Analytics sync deferred.', err);
      }
    };

    recordVisit();
  }, [isAuthenticated, location]); // This trigger fires every time the URL changes

  useEffect(() => {
    window.localStorage.setItem('spark-authenticated', isAuthenticated ? 'true' : 'false');
    if (!isAuthenticated) {
      window.localStorage.removeItem('spark-user-name');
      window.localStorage.removeItem('spark-user-role');
      window.localStorage.removeItem('spark-user-roles');
      window.localStorage.removeItem('spark-token');
      window.localStorage.removeItem('spark-user-id');
      setUserName('Fleet Manager');
      setUserRole('User');
      setUserRoles(['User']);
    }
  }, [isAuthenticated]);
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveModal(null);
    window.localStorage.removeItem('spark-authenticated');
  };

  const handleLoginSuccess = (auth) => {
    setIsAuthenticated(true);
    const normalizedName = auth?.name || auth?.email?.split('@')[0] || 'Fleet Manager';
    const normalizedRoles = Array.isArray(auth?.roles) && auth.roles.length > 0 ? auth.roles : ['User'];
    const normalizedRole = normalizedRoles[0];

    setUserName(normalizedName);
    setUserRole(normalizedRole);
    setUserRoles(normalizedRoles);

    window.localStorage.setItem('spark-user-name', normalizedName);
    window.localStorage.setItem('spark-user-role', normalizedRole);
    window.localStorage.setItem('spark-user-roles', JSON.stringify(normalizedRoles));
    const claimUserId = extractUserIdFromClaims(auth?.claims);
    if (claimUserId !== null && claimUserId !== undefined) {
      window.localStorage.setItem('spark-user-id', String(claimUserId));
    }
    if (auth?.token) {
      window.localStorage.setItem('spark-token', auth.token);
    }
  };

  const isAdmin = hasAdminRole(userRoles);
  const authPaths = [
    '/dashboard',
    '/users',
    '/buses',
    '/chargers',
    '/districts',
    '/workspace/dashboard',
    '/workspace/routes',
    '/workspace/buses',
    '/workspace/chargers',
    '/workspace/reports',
    '/workspace/district-details',
  ];
  const authTitles = {
    '/dashboard': 'Dashboard',
    '/users': 'Users',
    '/buses': 'Buses',
    '/chargers': 'Chargers',
    '/districts': 'Districts',
    '/workspace/dashboard': 'Dashboard',
    '/workspace/routes': 'Routes',
    '/workspace/buses': 'Buses',
    '/workspace/chargers': 'Chargers',
    '/workspace/reports': 'Reports',
    '/workspace/district-details': 'District Details',
  };
  const showAuthenticatedNavbar = isAuthenticated && authPaths.includes(location.pathname);
  const authNavbarTitle = authTitles[location.pathname] || 'Workspace';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100 text-slate-800">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(14,165,233,0.07),transparent_44%),radial-gradient(circle_at_70%_80%,rgba(148,163,184,0.08),transparent_48%)]" />
      {showAuthenticatedNavbar ? (
        <DashboardNavbar title={authNavbarTitle} userName={userName} userRole={userRole} onLogout={handleLogout} />
      ) : (
        <Navbar
          onLoginClick={() => setActiveModal('login')}
          onContactClick={() => setActiveModal('contact')}
          onLogout={handleLogout}
          isAuthenticated={isAuthenticated}
          isLoginActive={activeModal === 'login'}
          isContactActive={activeModal === 'contact'}
        />
      )}

      <main className="app-main relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              !isAuthenticated ? <Navigate to="/" replace /> : (isAdmin ? <Dashboard /> : <Navigate to="/users" replace />)
            }
          />
          <Route
            path="/users"
            element={
              !isAuthenticated ? <Navigate to="/" replace /> : <UsersPage />
            }
          />
          <Route
            path="/buses"
            element={
              !isAuthenticated ? <Navigate to="/" replace /> : <BusesPage />
            }
          />
          <Route
            path="/chargers"
            element={
              !isAuthenticated ? <Navigate to="/" replace /> : <ChargersPage />
            }
          />
          <Route
            path="/districts"
            element={
              !isAuthenticated ? <Navigate to="/" replace /> : <DistrictsPage />
            }
          />
          <Route
            path="/workspace"
            element={
              !isAuthenticated ? <Navigate to="/" replace /> : (isAdmin ? <Navigate to="/dashboard" replace /> : <UserWorkspace />)
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboardPage />} />
            <Route path="routes" element={<UserRoutesPage />} />
            <Route path="buses" element={<UserBusesPage />} />
            <Route path="chargers" element={<UserChargersPage />} />
            <Route path="reports" element={<UserReportsPage />} />
            <Route path="district-details" element={<UserDistrictDetailsPage />} />
          </Route>
        </Routes>
      </main>

      {activeModal === 'login' && (
        <LoginModal onClose={() => setActiveModal(null)} onSuccess={handleLoginSuccess} />
      )}

      {activeModal === 'contact' && (
        <ContactModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;