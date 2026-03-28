import './LoginModal.css';

export default function LoginModal({ onClose }) {
  return (
    <div className="login-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="login-modal-header">
          <p className="login-modal-kicker">Secure Access</p>
          <button type="button" className="login-modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        <h1 id="login-modal-title" className="login-modal-title">
          Welcome Back
        </h1>
        <p className="login-modal-subtitle">
          Sign in to manage routes, charging sessions, and fleet performance.
        </p>

        <form className="login-modal-form" onSubmit={(event) => event.preventDefault()}>
          <label className="login-modal-label" htmlFor="modal-email">
            Email
          </label>
          <input
            className="login-modal-input"
            id="modal-email"
            name="email"
            type="email"
            placeholder="name@fleetcontrol.com"
            autoComplete="email"
          />

          <label className="login-modal-label" htmlFor="modal-password">
            Password
          </label>
          <input
            className="login-modal-input"
            id="modal-password"
            name="password"
            type="password"
            placeholder="Enter password"
            autoComplete="current-password"
          />

          <button type="submit" className="login-modal-submit">
            Login
          </button>
        </form>
      </section>
    </div>
  );
}
