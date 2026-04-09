import { useEffect, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import {
  createDistrict,
  deleteDistrict,
  fetchBuses,
  fetchDistrictById,
  fetchDistricts,
  fetchRouteDetailsByRouteId,
  updateDistrict,
} from '@/apiCalls';

const TABLE_COLUMNS = [
  { key: 'Name', label: 'Name' },
  { key: 'City', label: 'City' },
  { key: 'State', label: 'State' },
  { key: 'BusCount', label: 'Bus Count' },
  { key: 'ChargerCount', label: 'Charger Count' },
  { key: 'RouteCount', label: 'Route Count' },
];

const DISTRICT_FORM_FIELDS = [
  { key: 'Name', label: 'Name' },
  { key: 'Address', label: 'Address' },
  { key: 'City', label: 'City' },
  { key: 'State', label: 'State' },
  { key: 'Zip', label: 'Zip' },
  { key: 'PhoneNumber', label: 'Phone Number' },
  { key: 'BusCount', label: 'Bus Count', type: 'number', payloadKey: 'busCount' },
  { key: 'ChargerCount', label: 'Charger Count', type: 'number', payloadKey: 'chargerCount' },
  { key: 'RouteCount', label: 'Route Count', type: 'number', payloadKey: 'routeCount' },
];

const STATE_OPTIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
];

function normalizeDistrictsResponse(response) {
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

function getDistrictFieldValue(district, key) {
  if (!district || typeof district !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(district).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? district[matchedKey] : null;
}

function getDistrictId(district) {
  return getDistrictFieldValue(district, 'Id');
}

function getObjectFieldValue(entity, key) {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(entity).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? entity[matchedKey] : null;
}

function getDistrictUsers(district) {
  const users = getDistrictFieldValue(district, 'Users')
    ?? getDistrictFieldValue(district, 'DistrictUsers');
  return Array.isArray(users) ? users : [];
}

function getDistrictBuses(district) {
  const buses = getDistrictFieldValue(district, 'Buses')
    ?? getDistrictFieldValue(district, 'DistrictBuses')
    ?? getDistrictFieldValue(district, 'BusAssignments');
  return Array.isArray(buses) ? buses : [];
}

function getDistrictRoutes(district) {
  const directRoutes = getDistrictFieldValue(district, 'Routes')
    ?? getDistrictFieldValue(district, 'DistrictRoutes');

  if (Array.isArray(directRoutes) && directRoutes.length > 0) {
    return directRoutes;
  }

  const buses = getDistrictBuses(district);
  const routeMap = new Map();

  buses.forEach((bus, index) => {
    const routeId = getObjectFieldValue(bus, 'RouteId');
    const routeNumber = getObjectFieldValue(bus, 'RouteNumber');
    const routeDescription = getObjectFieldValue(bus, 'RouteDescription');

    if (!routeId && !routeNumber && !routeDescription) {
      return;
    }

    const routeKey = String(routeId ?? routeNumber ?? `route-${index}`);
    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, {
        RouteId: routeId,
        RouteNumber: routeNumber,
        RouteDescription: routeDescription,
      });
    }
  });

  return Array.from(routeMap.values());
}

function normalizeCollectionResponse(response) {
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

function buildBusTypeLabelMap(busTypeRecords) {
  return busTypeRecords.reduce((acc, record) => {
    const id = getObjectFieldValue(record, 'Id') ?? getObjectFieldValue(record, 'BusTypeId');
    if (id === null || id === undefined || String(id).trim() === '') {
      return acc;
    }

    const vehicleOem = String(getObjectFieldValue(record, 'VehicleOem') ?? '').trim();
    const model = String(getObjectFieldValue(record, 'Model') ?? '').trim();
    const studentCapacity = String(getObjectFieldValue(record, 'StudentCapacity') ?? '').trim();

    const friendly = [vehicleOem, model, studentCapacity].filter(Boolean).join(' / ');
    if (friendly) {
      acc[String(id)] = friendly;
      return acc;
    }

    const fallback = String(getObjectFieldValue(record, 'Type') ?? getObjectFieldValue(record, 'BusTypeName') ?? '').trim();
    if (fallback) {
      acc[String(id)] = fallback;
    }

    return acc;
  }, {});
}

function getRouteIdentity(route) {
  const routeId = getObjectFieldValue(route, 'RouteId') ?? getObjectFieldValue(route, 'Id');
  const routeNumber = getObjectFieldValue(route, 'RouteNumber') ?? getObjectFieldValue(route, 'RouteNo');
  const routeDescription = String(
    getObjectFieldValue(route, 'RouteDescription')
      ?? getObjectFieldValue(route, 'RouteName')
      ?? ''
  ).trim().toLowerCase();

  return { routeId, routeNumber, routeDescription };
}

function getBusesForRoute(district, route) {
  const buses = getDistrictBuses(district);
  if (buses.length === 0) {
    return [];
  }

  const { routeId, routeNumber, routeDescription } = getRouteIdentity(route);

  return buses.filter((bus) => {
    const busRouteId = getObjectFieldValue(bus, 'RouteId');
    const busRouteNumber = getObjectFieldValue(bus, 'RouteNumber') ?? getObjectFieldValue(bus, 'RouteNo');
    const busRouteDescription = String(getObjectFieldValue(bus, 'RouteDescription') ?? '').trim().toLowerCase();

    if (routeId !== null && routeId !== undefined && routeId !== '') {
      return String(busRouteId ?? '') === String(routeId);
    }

    if (routeNumber !== null && routeNumber !== undefined && routeNumber !== '') {
      return String(busRouteNumber ?? '') === String(routeNumber);
    }

    if (routeDescription) {
      return busRouteDescription === routeDescription;
    }

    return false;
  });
}

function getBusNumbersForRoute(district, route) {
  const uniqueBusNumbers = Array.from(new Set(
    getBusesForRoute(district, route)
      .map((bus) => getObjectFieldValue(bus, 'BusNumber'))
      .filter((busNumber) => busNumber !== null && busNumber !== undefined && String(busNumber).trim() !== '')
      .map((busNumber) => String(busNumber))
  ));

  if (uniqueBusNumbers.length === 0) {
    return '-';
  }

  return uniqueBusNumbers.join(', ');
}

function getFriendlyBusTypeLabel(bus, busTypeLabelById = {}) {
  const busTypeObject = getObjectFieldValue(bus, 'BusType');
  const busTypeId = getObjectFieldValue(bus, 'BusTypeId') ?? getObjectFieldValue(bus, 'TypeId');

  if (busTypeId !== null && busTypeId !== undefined && String(busTypeId).trim() !== '') {
    const mappedLabel = busTypeLabelById[String(busTypeId)];
    if (typeof mappedLabel === 'string' && mappedLabel.trim()) {
      return mappedLabel.trim();
    }
  }

  const vehicleOem = String(
    getObjectFieldValue(bus, 'VehicleOem')
      ?? getObjectFieldValue(busTypeObject, 'VehicleOem')
      ?? ''
  ).trim();
  const model = String(
    getObjectFieldValue(bus, 'Model')
      ?? getObjectFieldValue(busTypeObject, 'Model')
      ?? ''
  ).trim();
  const studentCapacity = String(
    getObjectFieldValue(bus, 'StudentCapacity')
      ?? getObjectFieldValue(busTypeObject, 'StudentCapacity')
      ?? ''
  ).trim();

  const friendlyParts = [vehicleOem, model, studentCapacity].filter(Boolean);
  if (friendlyParts.length > 0) {
    return friendlyParts.join(' / ');
  }

  const namedType = getObjectFieldValue(bus, 'BusTypeName')
    ?? getObjectFieldValue(busTypeObject, 'BusTypeName')
    ?? getObjectFieldValue(bus, 'BusType')
    ?? getObjectFieldValue(bus, 'BusTypeDescription')
    ?? getObjectFieldValue(busTypeObject, 'BusTypeDescription')
    ?? getObjectFieldValue(bus, 'TypeName');

  if (typeof namedType === 'string' && namedType.trim()) {
    return namedType.trim();
  }

  if (busTypeId === null || busTypeId === undefined || String(busTypeId).trim() === '') {
    return null;
  }

  return `Type ${String(busTypeId).trim()}`;
}

function getAssignedRouteLabel(district, bus) {
  const directRouteLabel = getObjectFieldValue(bus, 'RouteDescription') ?? getObjectFieldValue(bus, 'RouteName');
  if (typeof directRouteLabel === 'string' && directRouteLabel.trim()) {
    return directRouteLabel.trim();
  }

  const busRouteId = getObjectFieldValue(bus, 'RouteId');
  const busRouteNumber = getObjectFieldValue(bus, 'RouteNumber') ?? getObjectFieldValue(bus, 'RouteNo');
  const routes = getDistrictRoutes(district);

  const matchedRoute = routes.find((route) => {
    const routeId = getObjectFieldValue(route, 'RouteId') ?? getObjectFieldValue(route, 'Id');
    const routeNumber = getObjectFieldValue(route, 'RouteNumber') ?? getObjectFieldValue(route, 'RouteNo');

    if (busRouteId !== null && busRouteId !== undefined && String(busRouteId).trim() !== '') {
      return String(routeId ?? '') === String(busRouteId);
    }

    if (busRouteNumber !== null && busRouteNumber !== undefined && String(busRouteNumber).trim() !== '') {
      return String(routeNumber ?? '') === String(busRouteNumber);
    }

    return false;
  });

  if (matchedRoute) {
    const matchedLabel = getObjectFieldValue(matchedRoute, 'RouteDescription')
      ?? getObjectFieldValue(matchedRoute, 'RouteName');
    if (typeof matchedLabel === 'string' && matchedLabel.trim()) {
      return matchedLabel.trim();
    }
  }

  if (busRouteNumber !== null && busRouteNumber !== undefined && String(busRouteNumber).trim() !== '') {
    return `Route ${String(busRouteNumber).trim()}`;
  }

  return null;
}

function getRouteEmbeddedTotalMiles(route) {
  const directMiles = getObjectFieldValue(route, 'TotalMiles') ?? getObjectFieldValue(route, 'totalMiles');
  if (directMiles !== null && directMiles !== undefined && String(directMiles).trim() !== '') {
    const parsed = Number(directMiles);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const details = getObjectFieldValue(route, 'RouteDetails') ?? getObjectFieldValue(route, 'Details');
  if (!Array.isArray(details) || details.length === 0) {
    return null;
  }

  return details.reduce((sum, detail) => {
    const miles = Number(getObjectFieldValue(detail, 'Miles') ?? 0);
    return Number.isNaN(miles) ? sum : sum + miles;
  }, 0);
}

function parseTimeSpanToMinutes(value) {
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

function formatDurationMinutes(totalMinutes) {
  const roundedMinutes = Math.round(Number(totalMinutes) || 0);
  const hoursPart = Math.floor(roundedMinutes / 60);
  const minutesPart = roundedMinutes % 60;

  if (hoursPart === 0) {
    return `${minutesPart}m`;
  }

  return `${hoursPart}h ${String(minutesPart).padStart(2, '0')}m`;
}

function getRouteEmbeddedTotalMinutes(route) {
  const directMinutes = getObjectFieldValue(route, 'TotalMinutes')
    ?? getObjectFieldValue(route, 'totalMinutes')
    ?? getObjectFieldValue(route, 'DurationMinutes')
    ?? getObjectFieldValue(route, 'durationMinutes');
  if (directMinutes !== null && directMinutes !== undefined && String(directMinutes).trim() !== '') {
    const parsed = Number(directMinutes);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const details = getObjectFieldValue(route, 'RouteDetails') ?? getObjectFieldValue(route, 'Details');
  if (!Array.isArray(details) || details.length === 0) {
    return null;
  }

  return details.reduce((sum, detail) => {
    const start = parseTimeSpanToMinutes(getObjectFieldValue(detail, 'StartTime'));
    const end = parseTimeSpanToMinutes(getObjectFieldValue(detail, 'EndTime'));
    if (start === null || end === null) {
      return sum;
    }

    const delta = end >= start ? end - start : (24 * 60) - start + end;
    return sum + delta;
  }, 0);
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

function formatDateValue(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString();
}

function formatDistrictCellValue(district, key) {
  if (key === 'Users' || key === 'Buses') {
    const items = getDistrictFieldValue(district, key);
    if (!Array.isArray(items) || items.length === 0) {
      return '0';
    }
    return String(items.length);
  }

  const value = getDistrictFieldValue(district, key);

  if (key === 'DateTimeInserted') {
    return formatDateValue(value);
  }

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

function buildDefaultFormData() {
  return DISTRICT_FORM_FIELDS.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

function getSerializablePayload(formData) {
  return DISTRICT_FORM_FIELDS.reduce((acc, field) => {
    const rawValue = formData[field.key];

    if (field.type === 'number') {
      const parsed = parseInt(String(rawValue ?? ''), 10);
      if (!Number.isNaN(parsed)) {
        acc[field.payloadKey ?? field.key] = parsed;
      }
      return acc;
    }

    if (typeof rawValue !== 'string') {
      return acc;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return acc;
    }

    acc[field.key] = trimmed;
    return acc;
  }, {});
}

function formatPhoneNumberInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);

  if (digits.length <= 3) {
    return digits ? `(${digits}` : '';
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function DistrictsPage() {
  const [districts, setDistricts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [pendingDeleteDistrict, setPendingDeleteDistrict] = useState(null);
  const [viewDistrict, setViewDistrict] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [routeMilesByRouteId, setRouteMilesByRouteId] = useState({});
  const [routeMinutesByRouteId, setRouteMinutesByRouteId] = useState({});
  const [busTypeLabelById, setBusTypeLabelById] = useState({});

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  const loadDistricts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetchDistricts();
      setDistricts(normalizeDistrictsResponse(response));
    } catch (err) {
      setError(err.message || 'Unable to load districts right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDistricts();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBusTypeLabels = async () => {
      try {
        const response = await fetchBuses();
        const records = normalizeCollectionResponse(response);
        if (!isMounted) {
          return;
        }
        setBusTypeLabelById(buildBusTypeLabelMap(records));
      } catch {
        if (isMounted) {
          setBusTypeLabelById({});
        }
      }
    };

    loadBusTypeLabels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isViewModalOpen || !viewDistrict) {
      setRouteMilesByRouteId({});
      setRouteMinutesByRouteId({});
      return;
    }

    const routes = getDistrictRoutes(viewDistrict);
    const routeIds = Array.from(new Set(
      routes
        .map((route) => getObjectFieldValue(route, 'RouteId') ?? getObjectFieldValue(route, 'Id'))
        .filter((routeId) => routeId !== null && routeId !== undefined && String(routeId).trim() !== '')
        .map((routeId) => String(routeId))
    ));

    if (routeIds.length === 0) {
      setRouteMilesByRouteId({});
      setRouteMinutesByRouteId({});
      return;
    }

    let isMounted = true;

    const loadRouteMetrics = async () => {
      const entries = await Promise.all(routeIds.map(async (routeId) => {
        try {
          const detailsResponse = await fetchRouteDetailsByRouteId(routeId);
          const details = normalizeCollectionResponse(detailsResponse);
          const totalMiles = details.reduce((sum, detail) => {
            const miles = Number(getObjectFieldValue(detail, 'Miles') ?? 0);
            return Number.isNaN(miles) ? sum : sum + miles;
          }, 0);
          const totalMinutes = details.reduce((sum, detail) => {
            const start = parseTimeSpanToMinutes(getObjectFieldValue(detail, 'StartTime'));
            const end = parseTimeSpanToMinutes(getObjectFieldValue(detail, 'EndTime'));
            if (start === null || end === null) {
              return sum;
            }

            const delta = end >= start ? end - start : (24 * 60) - start + end;
            return sum + delta;
          }, 0);

          return [routeId, { totalMiles, totalMinutes }];
        } catch {
          return [routeId, { totalMiles: null, totalMinutes: null }];
        }
      }));

      if (!isMounted) {
        return;
      }

      const nextMilesMap = {};
      const nextMinutesMap = {};
      entries.forEach(([routeId, metrics]) => {
        nextMilesMap[routeId] = metrics?.totalMiles ?? null;
        nextMinutesMap[routeId] = metrics?.totalMinutes ?? null;
      });
      setRouteMilesByRouteId(nextMilesMap);
      setRouteMinutesByRouteId(nextMinutesMap);
    };

    loadRouteMetrics();

    return () => {
      isMounted = false;
    };
  }, [isViewModalOpen, viewDistrict]);

  const openCreateModal = () => {
    setError('');
    setModalMode('create');
    setSelectedDistrictId(null);
    setFormData(buildDefaultFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (district) => {
    const districtId = getDistrictId(district);
    if (districtId === null || districtId === undefined || districtId === '') {
      setError('Unable to determine the district ID for update.');
      return;
    }

    setError('');
    setModalMode('edit');
    setSelectedDistrictId(districtId);

    const nextFormData = DISTRICT_FORM_FIELDS.reduce((acc, field) => {
      const value = getDistrictFieldValue(district, field.key);
      acc[field.key] = value === null || value === undefined ? '' : String(value);
      return acc;
    }, {});

    setFormData(nextFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setModalMode('create');
    setSelectedDistrictId(null);
    setFormData(buildDefaultFormData());
  };

  const handleDeleteDistrict = (district) => {
    const districtId = getDistrictId(district);
    if (districtId === null || districtId === undefined || districtId === '') {
      setError('Unable to determine the district ID for delete.');
      return;
    }

    setPendingDeleteDistrict(district);
  };

  const openViewModal = async (district) => {
    const districtId = getDistrictId(district);
    if (districtId === null || districtId === undefined || districtId === '') {
      setError('Unable to determine the district ID for view.');
      return;
    }

    setError('');
    setIsViewModalOpen(true);
    setIsViewLoading(true);

    try {
      const response = await fetchDistrictById(districtId);
      const details = response?.data && typeof response.data === 'object' ? response.data : response;
      setViewDistrict(details && typeof details === 'object' ? details : district);
    } catch (err) {
      setViewDistrict(district);
      setError(err.message || 'Unable to load district details.');
    } finally {
      setIsViewLoading(false);
    }
  };

  const closeViewModal = () => {
    if (isViewLoading) {
      return;
    }

    setIsViewModalOpen(false);
    setViewDistrict(null);
    setRouteMilesByRouteId({});
    setRouteMinutesByRouteId({});
  };

  const confirmDeleteDistrict = async () => {
    const districtId = getDistrictId(pendingDeleteDistrict);
    setPendingDeleteDistrict(null);
    setIsSubmitting(true);
    setError('');

    try {
      await deleteDistrict(districtId);
      await loadDistricts();
    } catch (err) {
      setError(err.message || 'Unable to delete district.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = getSerializablePayload(formData);
      if (modalMode === 'create') {
        await createDistrict(payload);
      } else {
        if (selectedDistrictId === null || selectedDistrictId === undefined || selectedDistrictId === '') {
          throw new Error('Unable to determine the district ID for update.');
        }

        await updateDistrict(selectedDistrictId, {
          Id: Number(selectedDistrictId),
          ...payload,
        });
      }

      setIsModalOpen(false);
      setModalMode('create');
      setSelectedDistrictId(null);
      setFormData(buildDefaultFormData());
      await loadDistricts();
    } catch (err) {
      setError(err.message || 'Unable to save district changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDistricts = normalizedSearch
    ? districts.filter((district) => TABLE_COLUMNS.some((column) =>
      String(formatDistrictCellValue(district, column.key)).toLowerCase().includes(normalizedSearch)
    ))
    : districts;
  const sortedDistricts = sortConfig.key
    ? [...filteredDistricts].sort((left, right) => {
      const leftValue = String(formatDistrictCellValue(left, sortConfig.key) ?? '').toLowerCase();
      const rightValue = String(formatDistrictCellValue(right, sortConfig.key) ?? '').toLowerCase();
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    })
    : filteredDistricts;

  const handleSort = (columnKey) => {
    setSortConfig((previous) => {
      if (previous.key === columnKey) {
        return {
          key: columnKey,
          direction: previous.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key: columnKey,
        direction: 'asc',
      };
    });
  };

  return (
    <section className="mx-auto grid w-full max-w-[92rem] gap-4 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-4 lg:px-6 xl:px-8">
      <SidebarMenu />
      <div className="glass-card min-w-0 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Geography</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Districts</h1>
            <p className="mt-3 text-slate-600">
              View district records, location details, and assignment counts.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
            onClick={openCreateModal}
          >
            Add District
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search districts..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:flex-1"
          />
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setSortConfig({ key: null, direction: 'asc' })}
            disabled={!sortConfig.key}
          >
            Clear Sort
          </button>
        </div>

        <div className="mt-6 w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-max w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left"
                      onClick={() => handleSort(column.key)}
                    >
                      <span>{column.label}</span>
                      {sortConfig.key === column.key && (
                        <span className="text-[10px] text-slate-500">{sortConfig.direction === 'asc' ? '(asc)' : '(desc)'}</span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    Loading districts...
                  </td>
                </tr>
              ) : sortedDistricts.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    {searchTerm.trim() ? 'No districts match your search.' : 'No Districts Found'}
                  </td>
                </tr>
              ) : (
                sortedDistricts.map((district, index) => {
                  const rowId = getDistrictId(district) ?? index;

                  return (
                    <tr key={rowId}>
                      {TABLE_COLUMNS.map((column) => (
                        <td key={`${rowId}-${column.key}`} className="whitespace-nowrap px-4 py-3 align-top">
                          {formatDistrictCellValue(district, column.key)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-nowrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => openViewModal(district)}
                            disabled={isSubmitting}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => openEditModal(district)}
                            disabled={isSubmitting}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleDeleteDistrict(district)}
                            disabled={isSubmitting}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Districts</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add District' : 'Update District'}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              {DISTRICT_FORM_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  {field.label}
                  {field.key === 'State' ? (
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={formData[field.key] ?? ''}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select state</option>
                      {STATE_OPTIONS.map((stateCode) => (
                        <option key={stateCode} value={stateCode}>{stateCode}</option>
                      ))}
                    </select>
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      min="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={formData[field.key] ?? ''}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      type="text"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={formData[field.key] ?? ''}
                      maxLength={field.key === 'PhoneNumber' ? 14 : undefined}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          [field.key]: field.key === 'PhoneNumber'
                            ? formatPhoneNumberInput(event.target.value)
                            : event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}

              <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create District' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">District Details</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {formatValue(getDistrictFieldValue(viewDistrict, 'Name'))}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeViewModal}
                disabled={isViewLoading}
              >
                Close
              </button>
            </div>

            {isViewLoading ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Loading district details...</p>
            ) : (
              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">District Info</h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3">
                    {[
                      { label: 'Address', key: 'Address' },
                      { label: 'City', key: 'City' },
                      { label: 'State', key: 'State' },
                      { label: 'Zip', key: 'Zip' },
                      { label: 'Phone Number', key: 'PhoneNumber' },
                      { label: 'Bus Count', key: 'BusCount' },
                      { label: 'Charger Count', key: 'ChargerCount' },
                      { label: 'Route Count', key: 'RouteCount' },
                      { label: 'Created', key: 'DateTimeInserted' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                        <dd className="mt-0.5 text-slate-800">{formatValue(getDistrictFieldValue(viewDistrict, key))}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Users</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="whitespace-nowrap px-3 py-2">Name</th>
                          <th className="whitespace-nowrap px-3 py-2">Role</th>
                          <th className="whitespace-nowrap px-3 py-2">Email</th>
                          <th className="whitespace-nowrap px-3 py-2">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {getDistrictUsers(viewDistrict).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-center text-slate-500" colSpan={4}>No users found.</td>
                          </tr>
                        ) : (
                          getDistrictUsers(viewDistrict).map((user, index) => {
                            const userId = getObjectFieldValue(user, 'Id') ?? index;
                            const firstName = formatValue(getObjectFieldValue(user, 'FirstName'));
                            const lastName = formatValue(getObjectFieldValue(user, 'LastName'));

                            return (
                              <tr key={userId}>
                                <td className="whitespace-nowrap px-3 py-2">
                                  {[firstName, lastName].filter((namePart) => namePart !== '-').join(' ') || '-'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(getObjectFieldValue(user, 'Role'))}</td>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(getObjectFieldValue(user, 'Email'))}</td>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(getObjectFieldValue(user, 'PhoneNumber'))}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Routes</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="whitespace-nowrap px-3 py-2">Route</th>
                          <th className="whitespace-nowrap px-3 py-2">Total Miles</th>
                          <th className="whitespace-nowrap px-3 py-2">Total Duration</th>
                          <th className="whitespace-nowrap px-3 py-2">Bus Number Assigned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {getDistrictRoutes(viewDistrict).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-center text-slate-500" colSpan={4}>No routes found.</td>
                          </tr>
                        ) : (
                          getDistrictRoutes(viewDistrict).map((route, index) => {
                            const routeId = getObjectFieldValue(route, 'RouteId') ?? getObjectFieldValue(route, 'Id');
                            const routeNumber = getObjectFieldValue(route, 'RouteNumber') ?? getObjectFieldValue(route, 'RouteNo');
                            const routeName = getObjectFieldValue(route, 'RouteDescription') ?? getObjectFieldValue(route, 'RouteName');
                            const routeKey = routeId ?? routeNumber ?? index;
                            const embeddedMiles = getRouteEmbeddedTotalMiles(route);
                            const mappedMiles = routeId ? routeMilesByRouteId[String(routeId)] : null;
                            const totalMiles = embeddedMiles ?? mappedMiles;
                            const embeddedMinutes = getRouteEmbeddedTotalMinutes(route);
                            const mappedMinutes = routeId ? routeMinutesByRouteId[String(routeId)] : null;
                            const totalMinutes = embeddedMinutes ?? mappedMinutes;

                            return (
                              <tr key={routeKey}>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(routeName)}</td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  {totalMiles === null || totalMiles === undefined
                                    ? '-'
                                    : `${Number(totalMiles).toFixed(1)} mi`}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  {totalMinutes === null || totalMinutes === undefined
                                    ? '-'
                                    : formatDurationMinutes(totalMinutes)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">{getBusNumbersForRoute(viewDistrict, route)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Buses</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="whitespace-nowrap px-3 py-2">Bus Number</th>
                          <th className="whitespace-nowrap px-3 py-2">Bus Type</th>
                          <th className="whitespace-nowrap px-3 py-2">Assigned Route</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {getDistrictBuses(viewDistrict).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-center text-slate-500" colSpan={3}>No buses found.</td>
                          </tr>
                        ) : (
                          getDistrictBuses(viewDistrict).map((bus, index) => {
                            const busKey = getObjectFieldValue(bus, 'BusNumber') ?? getObjectFieldValue(bus, 'RouteId') ?? index;

                            return (
                              <tr key={busKey}>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(getObjectFieldValue(bus, 'BusNumber'))}</td>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(getFriendlyBusTypeLabel(bus, busTypeLabelById))}</td>
                                <td className="whitespace-nowrap px-3 py-2">{formatValue(getAssignedRouteLabel(viewDistrict, bus))}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingDeleteDistrict && (
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete District</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this district? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setPendingDeleteDistrict(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={confirmDeleteDistrict}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
