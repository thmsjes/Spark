import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Users', path: '/users' },
  { label: 'Buses', path: '/buses' },
  { label: 'Chargers', path: '/chargers' },
  { label: 'Districts', path: '/districts' },
  { label: 'Reports', path: '/reports' },
  { label: 'Base Settings', path: '/base-settings' },
];

export default function SidebarMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="glass-card w-fit h-fit rounded-2xl p-2 sm:p-3 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-blue-700 whitespace-nowrap px-1">Menu</p>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-controls="sidebar-menu-nav"
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      <nav
        id="sidebar-menu-nav"
        className={`mt-2 flex-col gap-0.5 ${isOpen ? 'flex' : 'hidden'} lg:flex`}
        aria-label="Section navigation"
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `rounded-lg px-2 py-1.5 text-xs whitespace-nowrap font-semibold transition ${
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
