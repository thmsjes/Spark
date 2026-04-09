import './Navbar.css';

export default function Navbar({
  onLoginClick,
  onContactClick,
  onLogout,
  isAuthenticated = false,
  isLoginActive = false,
  isContactActive = false,
}) {

  return (
    <header className="navbar-shell">
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">
            EV
          </span>
          <div className="navbar-titles">
            <p className="navbar-title">SparK</p>
            <p className="navbar-subtitle">Fleet Management</p>
          </div>
        </div>

        <div className="navbar-actions" role="group" aria-label="Primary actions">
          {isAuthenticated ? (
            <button
              type="button"
              className="navbar-action-btn navbar-action-btn-accent"
              onClick={onLogout}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="navbar-action-icon">
                <path
                  d="M16 12a1 1 0 0 1-1 1H9v-2h6a1 1 0 0 1 1 1Zm2.7-.8-1.4-1.4a1 1 0 0 0-1.4 1.4L15.6 12l.7.8a1 1 0 0 0 1.4-1.4ZM5 5h8v2H7v10h6v2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                  fill="currentColor"
                />
              </svg>
              <span>Logout</span>
            </button>
          ) : (
            <button
              type="button"
              className={`navbar-action-btn ${isLoginActive ? 'navbar-action-btn-active' : ''}`}
              onClick={onLoginClick}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="navbar-action-icon">
                <path
                  d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.6 0-7 1.8-7 4v1h14v-1c0-2.2-3.4-4-7-4Z"
                  fill="currentColor"
                />
              </svg>
              <span>Login</span>
            </button>
          )}

          <button
            type="button"
            className={`navbar-action-btn ${isContactActive ? 'navbar-action-btn-active' : ''}`}
            onClick={onContactClick}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="navbar-action-icon">
              <path
                d="M18.1 14.8a15.6 15.6 0 0 1-3.1-1 2 2 0 0 0-2 .4l-1.4 1.4a16.2 16.2 0 0 1-3.2-3.2L9.8 11a2 2 0 0 0 .4-2 15.6 15.6 0 0 1-1-3.1A2 2 0 0 0 7.3 4H5a2 2 0 0 0-2 2A17 17 0 0 0 20 23a2 2 0 0 0 2-2v-2.3a2 2 0 0 0-1.9-1.9Z"
                fill="currentColor"
              />
            </svg>
            <span>Contact Us</span>
          </button>

          <button type="button" className="navbar-action-btn navbar-action-btn-accent">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="navbar-action-icon">
              <path
                d="M4 4h16v16H4Zm2 2v12h12V6Zm2 9h2v1H8Zm0-3h2v2H8Zm0-3h2v2H8Zm3 6h2v1h-2Zm0-3h2v2h-2Zm0-3h2v2h-2Zm3 8h2v1h-2Zm0-6h2v4h-2Zm-8 7h10v1H6Z"
                fill="currentColor"
              />
            </svg>
            <span>Calculator</span>
          </button>
        </div>
      </nav>
    </header>
  );
}