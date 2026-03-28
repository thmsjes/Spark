import './ContactModal.css';

export default function ContactModal({ onClose }) {
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

        <form className="contact-modal-form" onSubmit={(event) => event.preventDefault()}>
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
            />
          </div>

          <div className="contact-modal-footer">
            <button type="submit" className="contact-modal-submit">
              Send Message
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
