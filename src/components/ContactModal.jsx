import { useState } from 'react';
import './ContactModal.css';
import { submitContactForm } from '@/apiCalls';

export default function ContactModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSubmitting(true);
    setStatus(null);

    try {
      await submitContactForm({ email, subject, message });
      setStatus({ type: 'success', message: 'Message sent successfully. We will reply shortly.' });
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="contact-modal-header">
          <p className="contact-modal-kicker">Contact Us</p>
          <button type="button" className="contact-modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        <h1 id="contact-modal-title" className="contact-modal-title">
          Get in Touch
        </h1>
        <p className="contact-modal-subtitle">
          Contact us by email at
          <a href="mailto:test@test.com" className="contact-modal-email"> test@test.com</a>
        </p>

        <form className="contact-modal-form" onSubmit={handleSubmit}>
          <div className="contact-modal-fields">
            <label className="contact-modal-label" htmlFor="contact-email">
              Email
            </label>
            <input
              className="contact-modal-input"
              id="contact-email"
              name="email"
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className="contact-modal-label" htmlFor="contact-subject">
              Subject
            </label>
            <input
              className="contact-modal-input"
              id="contact-subject"
              name="subject"
              type="text"
              placeholder="How can we help?"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />

            <label className="contact-modal-label" htmlFor="contact-message">
              Message
            </label>
            <textarea
              className="contact-modal-textarea"
              id="contact-message"
              name="message"
              rows="5"
              placeholder="Write your message here"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </div>

          {status && (
            <div className={`contact-modal-status ${status.type}`}>{status.message}</div>
          )}

          <div className="contact-modal-footer">
            <button type="submit" className="contact-modal-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
