import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const QUICK_LINKS = [
  { title: 'Manage Routes', description: 'Add and update route details and schedules.', path: '/workspace/routes' },
  { title: 'Manage Buses', description: 'Maintain district bus assignments.', path: '/workspace/buses' },
  { title: 'Manage Chargers', description: 'Assign and review district chargers.', path: '/workspace/chargers' },
  { title: 'District Details', description: 'View district information and users.', path: '/workspace/district-details' },
];

export default function UserDashboardPage() {
  const [districtId, setDistrictId] = useState(null);
  const [stats, setStats] = useState({ routes: 0, buses: 0, chargers: 0 });
  const [setupProgress, setSetupProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    let isCancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error('Unable to determine the logged-in user id.');
        }

        const userResponse = await fetchUserById(userId);
        const user = normalizeEntityResponse(userResponse);
        const resolvedDistrictId = getFieldValue(user, 'DistrictId');

        if (resolvedDistrictId === null || resolvedDistrictId === undefined || resolvedDistrictId === '') {
          throw new Error('No district is assigned to this user.');
        }

        if (isCancelled) {
          return;
        }

        setDistrictId(resolvedDistrictId);

        const [districtResponse, routesResponse, districtChargersResponse, districtBusesResponse] = await Promise.all([
          fetchDistrictById(resolvedDistrictId),
          fetchRoutesByDistrictId(resolvedDistrictId),
          fetchDistrictChargersByDistrictId(resolvedDistrictId),
          fetchDistrictBuses(resolvedDistrictId),
        ]);

        const district = normalizeEntityResponse(districtResponse);
        const routeItems = normalizeCollectionResponse(routesResponse);
        const chargerItems = normalizeCollectionResponse(districtChargersResponse);
        const districtBusItems = normalizeCollectionResponse(districtBusesResponse);

        const districtBusCount = countDistrictBuses(districtBusItems, routeItems);
        const progress = buildSetupProgress({
          district,
          routeCount: routeItems.length,
          busCount: districtBusCount,
          chargerCount: chargerItems.length,
        });

        if (isCancelled) {
          return;
        }

        setStats({
          routes: routeItems.length,
          buses: districtBusCount,
          chargers: chargerItems.length,
        });
        setSetupProgress(progress);
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Unable to load dashboard right now.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    const handleSetupProgressChanged = () => {
      loadDashboard();
    };

    window.addEventListener(SETUP_PROGRESS_CHANGED_EVENT, handleSetupProgressChanged);

    return () => {
      isCancelled = true;
      window.removeEventListener(SETUP_PROGRESS_CHANGED_EVENT, handleSetupProgressChanged);
    };
  }, []);

  const statCards = useMemo(() => ([
    { label: 'Routes', value: stats.routes },
    { label: 'Buses', value: stats.buses },
    { label: 'Chargers', value: stats.chargers },
  ]), [stats]);

  const setupRows = useMemo(() => {
    if (!setupProgress) {
      return [];
    }

    return [
      {
        key: 'routes',
        label: 'Routes',
        current: setupProgress.current.routes,
        target: setupProgress.targets.routes,
        status: setupProgress.routesComplete ? 'Complete' : 'In Progress',
      },
      {
        key: 'chargers',
        label: 'Chargers',
        current: setupProgress.current.chargers,
        target: setupProgress.targets.chargers,
        status: !setupProgress.chargersUnlocked ? 'Locked' : setupProgress.chargersComplete ? 'Complete' : 'In Progress',
      },
      {
        key: 'buses',
        label: 'Buses',
        current: setupProgress.current.buses,
        target: setupProgress.targets.buses,
        status: !setupProgress.busesUnlocked ? 'Locked' : setupProgress.busesComplete ? 'Complete' : 'In Progress',
      },
    ];
  }, [setupProgress]);

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-3 text-slate-600">
            Overview for district {districtId !== null ? String(districtId) : '-'}.
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[260px]">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{isLoading ? '-' : String(card.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!isLoading && setupProgress && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Setup Progress</p>
            <p className="text-sm font-bold text-slate-900">{setupProgress.progressPercent}%</p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-300"
              style={{ width: `${setupProgress.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-900">Quick Actions</p>
        {setupProgress?.nextStep ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Next Step</p>
            <p className="mt-1 text-sm text-amber-800">{setupProgress.nextStep.hint}</p>
            <Link
              to={setupProgress.nextStep.path}
              className="mt-3 inline-flex rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              {setupProgress.nextStep.label}
            </Link>
          </div>
        ) : setupProgress?.allComplete ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            District setup targets are complete.
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const busesLocked = link.path === '/workspace/buses' && setupProgress && !setupProgress.busesUnlocked;
            const chargersLocked = link.path === '/workspace/chargers' && setupProgress && !setupProgress.chargersUnlocked;
            const isLocked = Boolean(busesLocked || chargersLocked);

            if (isLocked) {
              return (
                <div key={link.path} className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-600">{link.title} (Locked)</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {busesLocked
                      ? `Complete Chargers first (${setupProgress.current.chargers}/${setupProgress.targets.chargers}).`
                      : `Complete Routes first (${setupProgress.current.routes}/${setupProgress.targets.routes}).`}
                  </p>
                </div>
              );
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="text-sm font-semibold text-slate-800">{link.title}</p>
                <p className="mt-1 text-xs text-slate-600">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {!isLoading && setupRows.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Setup Progress</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">Step</th>
                  <th className="whitespace-nowrap px-3 py-2">Current</th>
                  <th className="whitespace-nowrap px-3 py-2">Required</th>
                  <th className="whitespace-nowrap px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {setupRows.map((row) => (
                  <tr key={row.key}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{row.label}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.current}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.target}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
