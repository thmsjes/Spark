import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { label: 'Routes', path: '/workspace/routes' },
  { label: 'Buses', path: '/workspace/buses' },
  { label: 'Chargers', path: '/workspace/chargers' },
  { label: 'Reports', path: '/workspace/reports' },
  { label: 'District Details', path: '/workspace/district-details' },
];

export default function UserSidebarMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="glass-card h-fit rounded-2xl p-4 sm:p-5 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-controls="user-sidebar-menu-nav"
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      <nav
        id="user-sidebar-menu-nav"
        className={`mt-4 flex-col gap-2 ${isOpen ? 'flex' : 'hidden'} lg:flex`}
        aria-label="User workspace navigation"
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)]'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
