export function getFieldValue(entity, key) {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(entity).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? entity[matchedKey] : null;
}

export function normalizeEntityResponse(response) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  if (Array.isArray(response)) {
    return response[0] || null;
  }

  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.items)) {
    return response.items[0] || null;
  }

  return response;
}

export function normalizeCollectionResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
}

export function getRouteId(route) {
  return getFieldValue(route, 'Id') ?? getFieldValue(route, 'RouteId') ?? null;
}

function toTargetCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function findFieldValueDeep(entity, candidateKeys, depth = 0) {
  if (!entity || depth > 3) {
    return null;
  }

  if (Array.isArray(entity)) {
    for (const item of entity) {
      const nestedValue = findFieldValueDeep(item, candidateKeys, depth + 1);
      if (nestedValue !== null && nestedValue !== undefined) {
        return nestedValue;
      }
    }
    return null;
  }

  if (typeof entity !== 'object') {
    return null;
  }

  const objectKeys = Object.keys(entity);
  const matchedOwnKey = objectKeys.find((key) =>
    candidateKeys.some((candidate) => key.toLowerCase() === candidate.toLowerCase())
  );
  if (matchedOwnKey) {
    return entity[matchedOwnKey];
  }

  for (const key of objectKeys) {
    const value = entity[key];
    if (value && typeof value === 'object') {
      const nestedValue = findFieldValueDeep(value, candidateKeys, depth + 1);
      if (nestedValue !== null && nestedValue !== undefined) {
        return nestedValue;
      }
    }
  }

  return null;
}

function getDistrictTarget(district, keys) {
  return toTargetCount(findFieldValueDeep(district, keys));
}

function getStepRatio(current, target) {
  if (target <= 0) {
    return 1;
  }

  return Math.max(0, Math.min(current / target, 1));
}

export function countDistrictBuses(districtBusItems, routeItems) {
  const routeIds = new Set(
    routeItems
      .map((route) => getRouteId(route))
      .filter((value) => value !== null && value !== undefined && String(value).trim())
      .map((value) => String(value))
  );

  return districtBusItems.filter((bus) => {
    const routeId = getFieldValue(bus, 'RouteId');
    if (routeId === null || routeId === undefined || String(routeId).trim() === '') {
      return true;
    }
    return routeIds.has(String(routeId));
  }).length;
}

export function buildSetupProgress({ district, routeCount, busCount, chargerCount }) {
  const targets = {
    routes: getDistrictTarget(district, ['RouteCount', 'RoutesCount', 'routeCount', 'routesCount']),
    buses: getDistrictTarget(district, ['BusCount', 'BusesCount', 'busCount', 'busesCount']),
    chargers: getDistrictTarget(district, ['ChargerCount', 'ChargersCount', 'chargerCount', 'chargersCount']),
  };

  const current = {
    routes: Math.max(0, Number(routeCount) || 0),
    buses: Math.max(0, Number(busCount) || 0),
    chargers: Math.max(0, Number(chargerCount) || 0),
  };

  const routesComplete = current.routes >= targets.routes;
  const chargersUnlocked = routesComplete;
  const chargersComplete = chargersUnlocked && current.chargers >= targets.chargers;
  const busesUnlocked = chargersComplete;
  const busesComplete = busesUnlocked && current.buses >= targets.buses;

  const unmet = {
    routes: Math.max(targets.routes - current.routes, 0),
    buses: Math.max(targets.buses - current.buses, 0),
    chargers: Math.max(targets.chargers - current.chargers, 0),
  };

  // Progress is sequential: Chargers do not contribute until Routes are complete,
  // and Buses do not contribute until Chargers are complete.
  const routeContribution = getStepRatio(current.routes, targets.routes) / 3;
  const chargerContribution = routesComplete ? (getStepRatio(current.chargers, targets.chargers) / 3) : 0;
  const busContribution = chargersComplete ? (getStepRatio(current.buses, targets.buses) / 3) : 0;
  const progressPercent = Math.round((routeContribution + chargerContribution + busContribution) * 100);

  let nextStep = null;
  if (!routesComplete) {
    nextStep = {
      key: 'routes',
      path: '/workspace/routes',
      label: 'Complete Routes',
      hint: `Add ${unmet.routes} more route${unmet.routes === 1 ? '' : 's'} to unlock Chargers.`,
    };
  } else if (!chargersComplete) {
    nextStep = {
      key: 'chargers',
      path: '/workspace/chargers',
      label: 'Complete Chargers',
      hint: `Add ${unmet.chargers} more charger${unmet.chargers === 1 ? '' : 's'} to unlock Buses.`,
    };
  } else if (!busesComplete) {
    nextStep = {
      key: 'buses',
      path: '/workspace/buses',
      label: 'Complete Buses',
      hint: `Add ${unmet.buses} more bus${unmet.buses === 1 ? '' : 'es'} to finish setup.`,
    };
  }

  return {
    targets,
    current,
    unmet,
    routesComplete,
    busesUnlocked,
    busesComplete,
    chargersUnlocked,
    chargersComplete,
    allComplete: routesComplete && busesComplete && chargersComplete,
    progressPercent,
    reportsUnlocked: progressPercent >= 100,
    nextStep,
  };
}
