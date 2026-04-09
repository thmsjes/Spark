import { useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function DashboardNavbar({ title = 'Dashboard', userName = 'Fleet Manager', userRole = 'User', onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <header className="navbar-shell">
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">EV</span>
          <div className="navbar-titles">
            <p className="navbar-title">S p a r K</p>
            <p className="navbar-subtitle">Welcome back, {userName} ({userRole})</p>
          </div>
        </div>

        <div className="navbar-actions" role="group" aria-label="Dashboard actions">
          <button
            type="button"
            className="navbar-action-btn navbar-action-btn-accent"
            onClick={handleLogout}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="navbar-action-icon">
              <path
                d="M16 12a1 1 0 0 1-1 1H9v-2h6a1 1 0 0 1 1 1Zm2.7-.8-1.4-1.4a1 1 0 0 0-1.4 1.4L15.6 12l.7.8a1 1 0 0 0 1.4-1.4ZM5 5h8v2H7v10h6v2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                fill="currentColor"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
