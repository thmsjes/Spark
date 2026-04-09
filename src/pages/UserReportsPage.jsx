import { useEffect, useState } from 'react';
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

export default function UserReportsPage() {
  const [isAllowed, setIsAllowed] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadAccess = async () => {
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

        const setupProgress = buildSetupProgress({
          district,
          routeCount: routes.length,
          busCount,
          chargerCount: chargers.length,
        });

        setProgressPercent(setupProgress.progressPercent);
        setIsAllowed(setupProgress.reportsUnlocked);
      } catch {
        if (!isCancelled) {
          setIsAllowed(false);
        }
      }
    };

    loadAccess();

    const handleSetupProgressChanged = () => {
      loadAccess();
    };

    window.addEventListener(SETUP_PROGRESS_CHANGED_EVENT, handleSetupProgressChanged);

    return () => {
      isCancelled = true;
      window.removeEventListener(SETUP_PROGRESS_CHANGED_EVENT, handleSetupProgressChanged);
    };
  }, []);

  if (!isAllowed) {
    return (
      <div className="glass-card rounded-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Reports</h1>
        <p className="mt-3 text-slate-600">Reports unlock when setup reaches 100%.</p>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Current progress: {progressPercent}%
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Reports</h1>
      <p className="mt-3 text-slate-600">
        Operational reports and downloadable summaries will appear here.
      </p>
    </div>
  );
}
