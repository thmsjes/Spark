import { BrowserRouter as Router, Routes, Route,useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar'; 
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import LoginModal from '@/components/LoginModal';
import ContactModal from '@/components/ContactModal';


function AppContent() {
  const [activeModal, setActiveModal] = useState(null);
  const location = useLocation(); // Tracks the current URL

  useEffect(() => {
    const recordVisit = async () => {
      const payload = {
        path: location.pathname,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
        screenWidth: window.screen.width,
        userAgent: navigator.userAgent
      };

      try {
        // Point this to your future .NET endpoint
        await fetch('/api/analytics/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        // We fail silently so the user experience isn't affected
        console.debug("Analytics sync deferred.");
      }
    };

    recordVisit();
  }, [location]); // This trigger fires every time the URL changes
  
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100 text-slate-800">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(14,165,233,0.07),transparent_44%),radial-gradient(circle_at_70%_80%,rgba(148,163,184,0.08),transparent_48%)]" />
      <Navbar
        onLoginClick={() => setActiveModal('login')}
        onContactClick={() => setActiveModal('contact')}
        isLoginActive={activeModal === 'login'}
        isContactActive={activeModal === 'contact'}
      />

      <main className="app-main relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      {activeModal === 'login' && <LoginModal onClose={() => setActiveModal(null)} />}

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