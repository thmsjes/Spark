import {
  fetchDistrictById,
  fetchDistrictBuses,
  fetchDistrictChargersByDistrictId,
  fetchRoutesByDistrictId,
  updateDistrictStatus,
} from '@/apiCalls';
import {
  buildSetupProgress,
  countDistrictBuses,
  normalizeCollectionResponse,
  normalizeEntityResponse,
} from '@/utils/userSetupProgress';

const STEP_LABELS = {
  routes: 'Routes',
  chargers: 'Chargers',
  buses: 'Buses',
  reports: 'Reports',
};

export async function syncDistrictStatusUpdate(districtId, currentStep) {
  const normalizedDistrictId = Number(districtId);
  if (Number.isNaN(normalizedDistrictId) || normalizedDistrictId <= 0) {
    return;
  }

  try {
    const [districtResponse, routesResponse, chargersResponse, busesResponse] = await Promise.all([
      fetchDistrictById(normalizedDistrictId),
      fetchRoutesByDistrictId(normalizedDistrictId),
      fetchDistrictChargersByDistrictId(normalizedDistrictId),
      fetchDistrictBuses(normalizedDistrictId),
    ]);

    const district = normalizeEntityResponse(districtResponse);
    const routes = normalizeCollectionResponse(routesResponse);
    const chargers = normalizeCollectionResponse(chargersResponse);
    const buses = normalizeCollectionResponse(busesResponse);
    const busCount = countDistrictBuses(buses, routes);

    const progress = buildSetupProgress({
      district,
      routeCount: routes.length,
      busCount,
      chargerCount: chargers.length,
    });

    const derivedStep = progress.nextStep?.key || 'reports';
    const normalizedStep = String(currentStep || '').trim().toLowerCase();
    const step = STEP_LABELS[normalizedStep] || STEP_LABELS[derivedStep] || 'Reports';

    await updateDistrictStatus({
      status: progress.progressPercent,
      step,
      districtId: normalizedDistrictId,
    });
  } catch {
    // Status sync should not interrupt CRUD flows.
  }
}
