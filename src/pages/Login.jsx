import './Login.css';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  return (
    <section className="login-page">
      <div className="login-panel">
        <button
          type="button"
          className="login-back"
          onClick={() => navigate('/')}
        >
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>

        <p className="login-kicker">Secure Access</p>
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">
          Sign in to manage routes, charging sessions, and fleet performance.
        </p>

        <form className="login-form" onSubmit={(event) => event.preventDefault()}>
          <label className="login-label" htmlFor="email">
            Email
          </label>
          <input
            className="login-input"
            id="email"
            name="email"
            type="email"
            placeholder="name@fleetcontrol.com"
            autoComplete="email"
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            className="login-input"
            id="password"
            name="password"
            type="password"
            placeholder="Enter password"
            autoComplete="current-password"
          />

          <button type="submit" className="login-submit">
            Login
          </button>
        </form>
      </div>
    </section>
  );
}
