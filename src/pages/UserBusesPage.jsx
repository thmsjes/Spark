import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createDistrictBus,
  deleteDistrictBus,
  fetchBuses,
  fetchDistrictBusByBusNumberAndRouteId,
  fetchDistrictBuses,
  fetchRoutesByDistrictId,
  fetchUserById,
  getCurrentUserId,
  updateDistrictBus,
} from '@/apiCalls';

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

function getFieldValue(entity, key) {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(entity).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? entity[matchedKey] : null;
}

function getRouteId(route) {
  return getFieldValue(route, 'Id') ?? getFieldValue(route, 'RouteId') ?? null;
}

function getRouteName(route) {
  return getFieldValue(route, 'RouteName')
    ?? getFieldValue(route, 'Name')
    ?? getFieldValue(route, 'RouteNumber')
    ?? '';
}

function getRouteNumber(route) {
  return getFieldValue(route, 'RouteNumber')
    ?? getFieldValue(route, 'RouteNo')
    ?? '';
}

function formatDateForInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toIsoDateTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
}

function formatCellValue(value, { isDate = false } = {}) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (isDate) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }

  return String(value);
}

function buildBusRow(bus, routeNameByRouteId = {}) {
  const busNumber = String(getFieldValue(bus, 'BusNumber') ?? '').trim();
  const routeId = Number(getFieldValue(bus, 'RouteId') ?? 0);
  const routeNameFromBus = String(
    getFieldValue(bus, 'RouteName')
      ?? getFieldValue(bus, 'RouteDescription')
      ?? getFieldValue(bus, 'RouteNumber')
      ?? ''
  ).trim();

  return {
    busNumber,
    routeName: routeNameFromBus || String(routeNameByRouteId[String(routeId)] ?? '').trim(),
    routeId: Number.isNaN(routeId) ? null : routeId,
    busTypeId: getFieldValue(bus, 'BusTypeId') ?? null,
    inServiceDate: String(getFieldValue(bus, 'InServiceDate') ?? '').trim(),
    routeNumber: String(getFieldValue(bus, 'RouteNumber') ?? '').trim(),
    routeDescription: String(getFieldValue(bus, 'RouteDescription') ?? '').trim(),
  };
}

function buildFormData(bus, fallbackRouteId = '') {
  const routeDescription = String(getFieldValue(bus, 'RouteDescription') ?? '').trim();
  const routeId = String(getFieldValue(bus, 'RouteId') ?? fallbackRouteId ?? '').trim();

  return {
    busNumber: String(getFieldValue(bus, 'BusNumber') ?? '').trim(),
    routeNumber: routeId,
    routeDescription,
    busTypeId: String(getFieldValue(bus, 'BusTypeId') ?? '').trim(),
    routeId,
    inServiceDate: formatDateForInput(getFieldValue(bus, 'InServiceDate')),
  };
}

function buildBusTypeOptions(busTypeRecords) {
  return busTypeRecords
    .map((record) => {
      const id = getFieldValue(record, 'Id');
      if (id === null || id === undefined || !String(id).trim()) {
        return null;
      }

      const vehicleOem = String(getFieldValue(record, 'VehicleOem') ?? '').trim();
      const model = String(getFieldValue(record, 'Model') ?? '').trim();
      const type = String(getFieldValue(record, 'Type') ?? '').trim();

      return {
        id: String(id).trim(),
        label: [vehicleOem, model, type].filter(Boolean).join(' - ') || `Bus Type ${String(id).trim()}`,
      };
    })
    .filter(Boolean);
}

function buildRouteOptions(routeRecords) {
  return routeRecords
    .map((route) => {
      const id = getRouteId(route);
      if (id === null || id === undefined || !String(id).trim()) {
        return null;
      }

      const routeName = String(getRouteName(route)).trim();
      const routeNumber = String(getRouteNumber(route)).trim();

      return {
        id: String(id).trim(),
        routeName,
        routeNumber,
        label: routeName || routeNumber || `Route ${String(id).trim()}`,
      };
    })
    .filter(Boolean);
}

export default function UserBusesPage() {
  const [districtId, setDistrictId] = useState(null);
  const [rows, setRows] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [busTypeOptions, setBusTypeOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedKey, setSelectedKey] = useState(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState(null);
  const [formData, setFormData] = useState({
    busNumber: '',
    routeNumber: '',
    routeDescription: '',
    busTypeId: '',
    routeId: '',
    inServiceDate: '',
  });
  const routeOptions = buildRouteOptions(routes);

  const loadData = async () => {
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

      setDistrictId(resolvedDistrictId);

      const routesResponse = await fetchRoutesByDistrictId(resolvedDistrictId);
      const routeItems = normalizeCollectionResponse(routesResponse);
      setRoutes(routeItems);

      try {
        const busTypeResponse = await fetchBuses();
        const busTypeItems = normalizeCollectionResponse(busTypeResponse);
        setBusTypeOptions(buildBusTypeOptions(busTypeItems));
      } catch {
        setBusTypeOptions([]);
      }

      const routeNameByRouteId = routeItems.reduce((acc, route) => {
        const routeId = getRouteId(route);
        if (routeId !== null && routeId !== undefined && String(routeId).trim()) {
          acc[String(routeId)] = getRouteName(route);
        }
        return acc;
      }, {});

      let districtBusItems = [];
      try {
        const districtBusesResponse = await fetchDistrictBuses();
        districtBusItems = normalizeCollectionResponse(districtBusesResponse);
      } catch {
        districtBusItems = [];
      }

      if (districtBusItems.length === 0) {
        const routeLookups = routeItems
          .map((route) => {
            const routeId = getRouteId(route);
            const busNumber = getFieldValue(route, 'BusNumber') ?? getFieldValue(route, 'BusId');
            if (routeId === null || routeId === undefined || routeId === '' || busNumber === null || busNumber === undefined || busNumber === '') {
              return null;
            }
            return {
              routeId,
              busNumber,
            };
          })
          .filter(Boolean);

        const lookupResults = await Promise.all(
          routeLookups.map(async (lookup) => {
            try {
              const response = await fetchDistrictBusByBusNumberAndRouteId(lookup.busNumber, lookup.routeId);
              return normalizeEntityResponse(response);
            } catch {
              return null;
            }
          })
        );

        districtBusItems = lookupResults.filter(Boolean);
      }

      const districtRouteIds = new Set(
        routeItems
          .map((route) => getRouteId(route))
          .filter((value) => value !== null && value !== undefined && String(value).trim())
          .map((value) => String(value))
      );

      const filtered = districtBusItems.filter((bus) => {
        const routeId = getFieldValue(bus, 'RouteId');
        if (routeId === null || routeId === undefined || !String(routeId).trim()) {
          return true;
        }
        return districtRouteIds.size === 0 || districtRouteIds.has(String(routeId));
      });

      setRows(filtered.map((bus) => buildBusRow(bus, routeNameByRouteId)));
    } catch (err) {
      setRows([]);
      setError(err.message || 'Unable to load buses right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setError('');
    setModalMode('create');
    setSelectedKey(null);
    setFormData({
      busNumber: '',
      routeNumber: '',
      routeDescription: '',
      busTypeId: '',
      routeId: '',
      inServiceDate: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (row) => {
    if (!row?.busNumber || !row?.routeId) {
      setError('Unable to determine busNumber/routeId for update.');
      return;
    }

    setError('');
    setModalMode('edit');
    setSelectedKey({ busNumber: row.busNumber, routeId: row.routeId });
    setIsSubmitting(true);

    try {
      const response = await fetchDistrictBusByBusNumberAndRouteId(row.busNumber, row.routeId);
      const bus = normalizeEntityResponse(response);
      setFormData(buildFormData(bus, String(row.routeId)));
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || 'Unable to load bus details for update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    setSelectedKey(null);
  };

  const requestDeleteRow = (row) => {
    if (!row?.busNumber || !row?.routeId) {
      setError('Unable to determine busNumber/routeId for delete.');
      return;
    }
    setError('');
    setPendingDeleteRow(row);
  };

  const cancelDelete = () => {
    if (isSubmitting) {
      return;
    }
    setPendingDeleteRow(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteRow?.busNumber || !pendingDeleteRow?.routeId) {
      setPendingDeleteRow(null);
      setError('Unable to determine busNumber/routeId for delete.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await deleteDistrictBus(pendingDeleteRow.busNumber, pendingDeleteRow.routeId);
      setPendingDeleteRow(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to delete bus right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const busNumber = String(formData.busNumber ?? '').trim();
    const selectedRoute = routes.find((route) => String(getRouteId(route)) === String(formData.routeId));
    const routeNumber = selectedRoute
      ? String(getRouteId(selectedRoute) ?? '').trim()
      : String(formData.routeNumber ?? '').trim();
    const routeDescription = selectedRoute
      ? String(getRouteName(selectedRoute) ?? '').trim()
      : String(formData.routeDescription ?? '').trim();
    const busTypeId = Number(formData.busTypeId);
    const routeId = Number(formData.routeId);
    const inServiceDate = toIsoDateTime(formData.inServiceDate);

    if (!busNumber) {
      setError('Bus Number is required.');
      return;
    }

    if (Number.isNaN(routeId)) {
      setError('Route Id must be a valid number.');
      return;
    }

    if (Number.isNaN(busTypeId)) {
      setError('Bus Type Id must be a valid number.');
      return;
    }

    if (districtId === null || districtId === undefined || districtId === '' || Number.isNaN(Number(districtId))) {
      setError('District Id is not available yet. Please try again in a moment.');
      return;
    }

    if (!inServiceDate) {
      setError('Inservice Date is required and must be a valid date/time.');
      return;
    }

    const normalizedDistrictId = Number(districtId);

    const payload = {
      busNumber,
      routeNumber,
      routeDescription,
      busTypeId,
      routeId,
      districtId: normalizedDistrictId,
      inServiceDate,
      BusNumber: busNumber,
      RouteNumber: routeNumber,
      RouteDescription: routeDescription,
      BusTypeId: busTypeId,
      RouteId: routeId,
      DistrictId: normalizedDistrictId,
      InServiceDate: inServiceDate,
    };

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createDistrictBus(payload);
      } else {
        if (!selectedKey?.busNumber || !selectedKey?.routeId) {
          throw new Error('Unable to determine busNumber/routeId for update.');
        }

        await updateDistrictBus(selectedKey.busNumber, selectedKey.routeId, payload);
      }

      setIsModalOpen(false);
      setSelectedKey(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to save bus changes right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Buses</h1>
          <p className="mt-3 text-slate-600">
            Showing district bus assignments for district {districtId !== null ? String(districtId) : '-' }.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={openCreateModal}
          disabled={isLoading || isSubmitting}
        >
          Add Bus
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Bus Number</th>
              <th className="whitespace-nowrap px-4 py-3">Route Name</th>
              <th className="whitespace-nowrap px-4 py-3">Route Id</th>
              <th className="whitespace-nowrap px-4 py-3">Bus Type Id</th>
              <th className="whitespace-nowrap px-4 py-3">Inservice Date</th>
              <th className="whitespace-nowrap px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  Loading buses...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  No buses found for this district.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.busNumber}-${row.routeId}-${index}`}>
                  <td className="whitespace-nowrap px-4 py-3 align-top">{formatCellValue(row.busNumber)}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">{formatCellValue(row.routeName)}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">{formatCellValue(row.routeId)}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">{formatCellValue(row.busTypeId)}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">{formatCellValue(row.inServiceDate, { isDate: true })}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => openEditModal(row)}
                        disabled={isSubmitting}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => requestDeleteRow(row)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && createPortal((
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true" style={{ zIndex: 140 }}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Buses</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{modalMode === 'create' ? 'Add User Bus' : 'Update User Bus'}</h2>
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

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Bus Number
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.busNumber}
                  onChange={(event) => setFormData((previous) => ({ ...previous, busNumber: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Route Name
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.routeId}
                  onChange={(event) => {
                    const selectedRouteId = event.target.value;
                    const selectedRoute = routes.find((route) => String(getRouteId(route)) === selectedRouteId);
                    setFormData((previous) => ({
                      ...previous,
                      routeId: selectedRouteId,
                      routeDescription: selectedRoute ? String(getRouteName(selectedRoute) ?? '').trim() : '',
                      routeNumber: selectedRouteId,
                    }));
                  }}
                  required
                >
                  <option value="">Select Route</option>
                  {routeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                  {formData.routeId && !routeOptions.some((option) => option.id === String(formData.routeId)) ? (
                    <option value={String(formData.routeId)}>{`Route ${String(formData.routeId)}`}</option>
                  ) : null}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Route Number
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.routeNumber}
                  readOnly
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Bus Type Id
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.busTypeId}
                  onChange={(event) => setFormData((previous) => ({ ...previous, busTypeId: event.target.value }))}
                  required
                >
                  <option value="">Select Bus Type</option>
                  {busTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                  {formData.busTypeId && !busTypeOptions.some((option) => option.id === String(formData.busTypeId)) ? (
                    <option value={String(formData.busTypeId)}>{`Bus Type ${String(formData.busTypeId)}`}</option>
                  ) : null}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Inservice Date
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.inServiceDate}
                  onChange={(event) => setFormData((previous) => ({ ...previous, inServiceDate: event.target.value }))}
                  required
                />
              </label>

              <div className="mt-2 flex justify-end gap-3">
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Bus' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {pendingDeleteRow && createPortal((
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true" style={{ zIndex: 150 }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete User Bus</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this bus assignment? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={cancelDelete}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
