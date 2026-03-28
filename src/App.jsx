import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Navbar from '@/components/Navbar'; 
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import LoginModal from '@/components/LoginModal';
import ContactModal from '@/components/ContactModal';

function AppContent() {
  const [activeModal, setActiveModal] = useState(null);

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