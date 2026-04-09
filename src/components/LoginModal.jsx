import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginModal.css';
import { loginUser, parseLoginAuth } from '@/apiCalls';

export default function LoginModal({ onClose, onSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await loginUser({ email, password });
      const auth = parseLoginAuth(response, email);

      console.log('Login API response:', response);
      console.log('Extracted token preview:', auth.token ? `${auth.token.slice(0, 20)}...` : null);
      console.log('Decoded JWT claims:', auth.claims);

      if (auth.token) {
        window.localStorage.setItem('spark-token', auth.token);
      }

      const isAdmin = auth.roles.some((role) => String(role).toLowerCase() === 'admin');

      window.localStorage.setItem('spark-authenticated', 'true');
      setStatus({ type: 'success', message: 'Login successful. Redirecting...' });
      if (onSuccess) onSuccess(auth);
      onClose();
      navigate(isAdmin ? '/dashboard' : '/workspace/dashboard');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Login failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <form className="login-modal-form" onSubmit={handleSubmit} noValidate>
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {status && (
            <div className={`login-modal-status ${status.type}`}>{status.message}</div>
          )}

          <button type="submit" className="login-modal-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </section>
    </div>
  );
}
