import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  fetchDistrictById,
  fetchDistrictChargersByDistrictId,
  fetchDistrictBuses,
  fetchRoutesByDistrictId,
  fetchUserById,
  getCurrentUserId,
} from '@/apiCalls';
import {
  buildSetupProgress,
  countDistrictBuses,
  getFieldValue,
  normalizeCollectionResponse,
  normalizeEntityResponse,
} from '@/utils/userSetupProgress';
import { SETUP_PROGRESS_CHANGED_EVENT } from '@/utils/setupProgressEvents';

const menuItems = [
  { label: 'Dashboard', path: '/workspace/dashboard' },
  { label: 'Routes', path: '/workspace/routes' },
  { label: 'Chargers', path: '/workspace/chargers' },
  { label: 'Buses', path: '/workspace/buses' },
  { label: 'Reports', path: '/workspace/reports' },
  { label: 'District Details', path: '/workspace/district-details' },
];

export default function UserSidebarMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [setupProgress, setSetupProgress] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const loadSetupProgress = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          return;
        }

        const userResponse = await fetchUserById(userId);
        const user = normalizeEntityResponse(userResponse);
        const districtId = getFieldValue(user, 'DistrictId');

        if (districtId === null || districtId === undefined || districtId === '') {
          return;
        }

        const [districtResponse, routesResponse, chargersResponse, busesResponse] = await Promise.all([
          fetchDistrictById(districtId),
          fetchRoutesByDistrictId(districtId),
          fetchDistrictChargersByDistrictId(districtId),
          fetchDistrictBuses(districtId),
        ]);

        if (isCancelled) {
          return;
        }

        const district = normalizeEntityResponse(districtResponse);
        const routes = normalizeCollectionResponse(routesResponse);
        const chargers = normalizeCollectionResponse(chargersResponse);
        const buses = normalizeCollectionResponse(busesResponse);
        const busCount = countDistrictBuses(buses, routes);

        setSetupProgress(buildSetupProgress({
          district,
          routeCount: routes.length,
          busCount,
          chargerCount: chargers.length,
        }));
      } catch {
        if (!isCancelled) {
          setSetupProgress(null);
        }
      }
    };

    loadSetupProgress();

    const handleSetupProgressChanged = () => {
      loadSetupProgress();
    };

    window.addEventListener(SETUP_PROGRESS_CHANGED_EVENT, handleSetupProgressChanged);

    return () => {
      isCancelled = true;
      window.removeEventListener(SETUP_PROGRESS_CHANGED_EVENT, handleSetupProgressChanged);
    };
  }, []);

  const lockByPath = useMemo(() => ({
    '/workspace/buses': setupProgress ? !setupProgress.busesUnlocked : false,
    '/workspace/chargers': setupProgress ? !setupProgress.chargersUnlocked : false,
    '/workspace/reports': setupProgress ? !setupProgress.reportsUnlocked : false,
  }), [setupProgress]);

  const lockHintByPath = useMemo(() => ({
    '/workspace/buses': setupProgress
      ? `Chargers ${setupProgress.current.chargers}/${setupProgress.targets.chargers} required before Buses.`
      : '',
    '/workspace/chargers': setupProgress
      ? `Routes ${setupProgress.current.routes}/${setupProgress.targets.routes} required before Chargers.`
      : '',
    '/workspace/reports': setupProgress
      ? `Setup must be 100% complete before Reports (${setupProgress.progressPercent}%).`
      : '',
  }), [setupProgress]);

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
        {menuItems.map((item) => {
          const isLocked = Boolean(lockByPath[item.path]);

          if (isLocked) {
            return (
              <div key={item.path} className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-slate-500">{item.label} (Locked)</p>
                <p className="mt-1 text-[11px] text-slate-500">{lockHintByPath[item.path]}</p>
              </div>
            );
          }

          return (
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
          );
        })}
      </nav>
    </aside>
  );
}
