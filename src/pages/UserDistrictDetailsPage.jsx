import { useEffect, useState } from 'react';
import { fetchDistrictById, fetchUserById, getCurrentUserId } from '@/apiCalls';

function normalizeEntityResponse(response) {
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

function getFieldValue(entity, key) {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(entity).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? entity[matchedKey] : null;
}

function formatFieldLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldHideField(key) {
  const normalized = String(key).toLowerCase();
  return normalized === 'id'
    || normalized === 'districtid'
    || normalized === 'users'
    || normalized === 'buses'
    || normalized === 'districtbuses'
    || normalized === 'busassignments'
    || normalized === 'routes'
    || normalized === 'districtroutes';
}

function getUsersFromDistrict(district) {
  const users = getFieldValue(district, 'Users') ?? getFieldValue(district, 'DistrictUsers');
  return Array.isArray(users) ? users : [];
}

function getBusesFromDistrict(district) {
  const buses = getFieldValue(district, 'Buses')
    ?? getFieldValue(district, 'DistrictBuses')
    ?? getFieldValue(district, 'BusAssignments');

  return Array.isArray(buses) ? buses : [];
}

function getRoutesFromDistrict(district) {
  const directRoutes = getFieldValue(district, 'Routes') ?? getFieldValue(district, 'DistrictRoutes');
  if (Array.isArray(directRoutes) && directRoutes.length > 0) {
    return directRoutes;
  }

  const buses = getBusesFromDistrict(district);
  const routeMap = new Map();

  buses.forEach((bus, index) => {
    const routeId = getFieldValue(bus, 'RouteId');
    const routeNumber = getFieldValue(bus, 'RouteNumber') ?? getFieldValue(bus, 'RouteNo');
    const routeName = getFieldValue(bus, 'RouteDescription') ?? getFieldValue(bus, 'RouteName');

    if (routeId === null && routeNumber === null && !routeName) {
      return;
    }

    const routeKey = String(routeId ?? routeNumber ?? `route-${index}`);
    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, {
        RouteId: routeId,
        RouteNumber: routeNumber,
        RouteName: routeName,
      });
    }
  });

  return Array.from(routeMap.values());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDurationMinutes(totalMinutes) {
  const rounded = Math.round(Number(totalMinutes) || 0);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function parseTimeToMinutes(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);

  if (
    Number.isNaN(hours)
    || Number.isNaN(minutes)
    || Number.isNaN(seconds)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
    || seconds < 0
    || seconds > 59
  ) {
    return null;
  }

  return (hours * 60) + minutes + (seconds / 60);
}

function getRouteMetrics(route) {
  const details = getFieldValue(route, 'RouteDetails') ?? getFieldValue(route, 'Details');
  if (!Array.isArray(details) || details.length === 0) {
    return { miles: null, minutes: null };
  }

  const miles = details.reduce((sum, detail) => {
    const next = Number(getFieldValue(detail, 'Miles') ?? 0);
    return Number.isNaN(next) ? sum : sum + next;
  }, 0);

  const minutes = details.reduce((sum, detail) => {
    const start = parseTimeToMinutes(getFieldValue(detail, 'StartTime') ?? getFieldValue(detail, 'startTime'));
    const end = parseTimeToMinutes(getFieldValue(detail, 'EndTime') ?? getFieldValue(detail, 'endTime'));

    if (start !== null && end !== null) {
      const delta = end >= start ? end - start : (24 * 60) - start + end;
      return sum + delta;
    }

    const travelTime = Number(getFieldValue(detail, 'TravelTimeMinutes') ?? getFieldValue(detail, 'travelTimeMinutes') ?? 0);
    if (Number.isNaN(travelTime) || travelTime < 0) {
      return sum;
    }

    return sum + travelTime;
  }, 0);

  return {
    miles,
    minutes,
  };
}

function getBusTypeLabel(bus) {
  const vehicleOem = String(getFieldValue(bus, 'VehicleOem') ?? '').trim();
  const model = String(getFieldValue(bus, 'Model') ?? '').trim();
  const studentCapacity = String(getFieldValue(bus, 'StudentCapacity') ?? '').trim();
  const parts = [vehicleOem, model, studentCapacity].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' / ');
  }

  const typeName = String(getFieldValue(bus, 'BusTypeName') ?? getFieldValue(bus, 'Type') ?? '').trim();
  if (typeName) {
    return typeName;
  }

  const typeId = getFieldValue(bus, 'BusTypeId') ?? getFieldValue(bus, 'TypeId');
  if (typeId === null || typeId === undefined || String(typeId).trim() === '') {
    return '-';
  }

  return `Type ${String(typeId)}`;
}

function getAssignedRouteLabel(bus) {
  const routeName = getFieldValue(bus, 'RouteDescription') ?? getFieldValue(bus, 'RouteName');
  if (typeof routeName === 'string' && routeName.trim()) {
    return routeName.trim();
  }

  const routeNumber = getFieldValue(bus, 'RouteNumber') ?? getFieldValue(bus, 'RouteNo');
  if (routeNumber === null || routeNumber === undefined || String(routeNumber).trim() === '') {
    return '-';
  }

  return `Route ${String(routeNumber)}`;
}

function getUserDisplayName(user) {
  const fullName = getFieldValue(user, 'Name');
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  const firstName = getFieldValue(user, 'FirstName');
  const lastName = getFieldValue(user, 'LastName');
  const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (combined) {
    return combined;
  }

  const email = getFieldValue(user, 'Email');
  if (typeof email === 'string' && email.trim()) {
    return email.trim();
  }

  return 'Unknown User';
}

export default function UserDistrictDetailsPage() {
  const [district, setDistrict] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDistrictDetails = async () => {
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

        const districtResponse = await fetchDistrictById(resolvedDistrictId);
        const districtDetails = normalizeEntityResponse(districtResponse);

        if (!districtDetails) {
          throw new Error('District details could not be loaded.');
        }

        setDistrict(districtDetails);
      } catch (err) {
        setError(err.message || 'Unable to load district details right now.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDistrictDetails();
  }, []);

  return (
    <div className="glass-card rounded-2xl p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">District Details</h1>
      <p className="mt-3 text-slate-600">
        District information is loaded from the logged-in user record.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {isLoading ? (
        <p className="mt-6 text-slate-600">Loading district details...</p>
      ) : district ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.keys(district).filter((key) => !shouldHideField(key)).map((key) => {
              const value = getFieldValue(district, key);
              const displayValue = value === null || value === undefined || value === ''
                ? '-'
                : typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value);

              return (
                <div key={`district-${key}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatFieldLabel(key)}</p>
                  <p className="mt-1 break-words text-sm text-slate-800">{displayValue}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Users</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {getUsersFromDistrict(district).length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-slate-500">No users found for this district.</td>
                    </tr>
                  ) : (
                    getUsersFromDistrict(district).map((user, index) => (
                      <tr key={`district-user-${index}`}>
                        <td className="px-3 py-2">{getUserDisplayName(user)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Routes</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2">Route</th>
                    <th className="whitespace-nowrap px-3 py-2">Total Miles</th>
                    <th className="whitespace-nowrap px-3 py-2">Total Duration</th>
                    <th className="whitespace-nowrap px-3 py-2">Bus Number Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {getRoutesFromDistrict(district).length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-slate-500" colSpan={4}>No routes found for this district.</td>
                    </tr>
                  ) : (
                    getRoutesFromDistrict(district).map((route, index) => {
                      const routeName = getFieldValue(route, 'RouteName') ?? getFieldValue(route, 'RouteDescription');
                      const routeNumber = getFieldValue(route, 'RouteNumber') ?? getFieldValue(route, 'RouteNo');
                      const routeBus = getFieldValue(route, 'BusId') ?? getFieldValue(route, 'BusNumber') ?? getFieldValue(route, 'busId');
                      const metrics = getRouteMetrics(route);
                      const routeKey = getFieldValue(route, 'RouteId') ?? getFieldValue(route, 'Id') ?? routeNumber ?? index;

                      return (
                        <tr key={`district-route-${routeKey}`}>
                          <td className="px-3 py-2">{formatValue(routeName || routeNumber)}</td>
                          <td className="px-3 py-2">
                            {metrics.miles === null || metrics.miles === undefined ? '-' : `${metrics.miles.toFixed(1)} mi`}
                          </td>
                          <td className="px-3 py-2">
                            {metrics.minutes === null || metrics.minutes === undefined ? '-' : formatDurationMinutes(metrics.minutes)}
                          </td>
                          <td className="px-3 py-2">{formatValue(routeBus)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Buses</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2">Bus Number</th>
                    <th className="whitespace-nowrap px-3 py-2">Bus Type</th>
                    <th className="whitespace-nowrap px-3 py-2">Assigned Route</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {getBusesFromDistrict(district).length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-slate-500" colSpan={3}>No buses found for this district.</td>
                    </tr>
                  ) : (
                    getBusesFromDistrict(district).map((bus, index) => {
                      const busKey = getFieldValue(bus, 'BusNumber') ?? getFieldValue(bus, 'Id') ?? index;

                      return (
                        <tr key={`district-bus-${busKey}`}>
                          <td className="px-3 py-2">{formatValue(getFieldValue(bus, 'BusNumber'))}</td>
                          <td className="px-3 py-2">{getBusTypeLabel(bus)}</td>
                          <td className="px-3 py-2">{getAssignedRouteLabel(bus)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
