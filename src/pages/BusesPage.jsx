import { useEffect, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import { createBus, deleteBus, fetchBusById, fetchBuses, updateBus } from '@/apiCalls';

const TABLE_COLUMNS = [
 // { key: 'Id', label: 'Id' },
  { key: 'VehicleOem', label: 'Vehicle OEM' },
  { key: 'Model', label: 'Model' },
  { key: 'Type', label: 'Type' },
  { key: 'StudentCapacity', label: 'Student Capacity' },
  { key: 'Charger', label: 'Charger' },
   { key: 'BatterySize', label: 'Battery Size (kWh)' },
  { key: 'AdvertisedRange', label: 'Advertised Range (miles)' },
];

const ALL_COLUMNS = [
  { key: 'Id', label: 'Id' },
  { key: 'VehicleOem', label: 'Vehicle OEM' },
  { key: 'Model', label: 'Model' },
  { key: 'Type', label: 'Type' },
  { key: 'AdvertisedRange', label: 'Advertised Range (miles)' },
  { key: 'BatterySize', label: 'Battery Size (kWh)' },
  { key: 'UsableBatterySize', label: 'Usable Battery Size (kWh)' },
  { key: 'UsableCapacity', label: 'Usable Capacity' },
  { key: 'LimpMode', label: 'Limp Mode (20%SOC kWh)' },
  { key: 'StudentCapacity', label: 'Student Capacity' },
  { key: 'Charger', label: 'Charger', type: 'number' },
  { key: 'DCMaxChargeRate', label: 'DC Max Charge Rate (kW)', type: 'number' },
  { key: 'ACMaxChargeRate', label: 'AC Max Charge Rate (kW)', type: 'number' },
];

const BUS_FORM_FIELDS = [
  { key: 'VehicleOem', label: 'Vehicle OEM', type: 'text' },
  { key: 'Model', label: 'Model', type: 'text' },
  { key: 'Type', label: 'Type', type: 'text' },
  { key: 'AdvertisedRange', label: 'Advertised Range (miles)', type: 'number' },
  { key: 'BatterySize', label: 'Battery Size (kWh)', type: 'number' },
  { key: 'UsableBatterySize', label: 'Usable Battery Size (kWh)', type: 'number' },
  { key: 'UsableCapacity', label: 'Usable Capacity', type: 'number' },
  { key: 'LimpMode', label: 'Limp Mode (20%SOC kWh)', type: 'number' },
  { key: 'StudentCapacity', label: 'Student Capacity', type: 'number' },
  { key: 'Charger', label: 'Charger', type: 'number' },
  { key: 'DCMaxChargeRate', label: 'DC Max Charge Rate (kW)', type: 'number' },
  { key: 'ACMaxChargeRate', label: 'AC Max Charge Rate (kW)', type: 'number' },
];

function normalizeBusesResponse(response) {
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

function getBusFieldValue(bus, key) {
  if (!bus || typeof bus !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(bus).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? bus[matchedKey] : null;
}

function getBusId(bus) {
  return getBusFieldValue(bus, 'Id');
}

function formatCellValue(value) {
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

function formatCardLabel(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function buildDefaultFormData(bus) {
  return BUS_FORM_FIELDS.reduce((acc, field) => {
    const value = getBusFieldValue(bus, field.key);
    acc[field.key] = value === undefined || value === null ? '' : String(value);
    return acc;
  }, {});
}

function getSerializablePayload(formData) {
  return BUS_FORM_FIELDS.reduce((acc, field) => {
    const rawValue = formData[field.key];
    if (typeof rawValue !== 'string') {
      acc[field.key] = rawValue;
      return acc;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return acc;
    }

    if (field.type === 'number') {
      const numericValue = Number(trimmed);
      if (!Number.isNaN(numericValue)) {
        acc[field.key] = numericValue;
      }
      return acc;
    }

    acc[field.key] = trimmed;
    return acc;
  }, {});
}

export default function BusesPage() {
  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [formData, setFormData] = useState({});
  const [pendingDeleteBus, setPendingDeleteBus] = useState(null);
  const [viewBus, setViewBus] = useState(null);

  const loadBuses = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetchBuses();
      setBuses(normalizeBusesResponse(response));
    } catch (err) {
      setError(err.message || 'Unable to load buses right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuses();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedBusId(null);
    setFormData(buildDefaultFormData());
    setIsModalOpen(true);
  };

  const openEditModal = async (bus) => {
    const busId = getBusId(bus);
    if (busId === null || busId === undefined || busId === '') {
      setError('Unable to determine the bus ID for update.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const busResponse = await fetchBusById(busId);
      const busDetails = busResponse?.data && typeof busResponse.data === 'object'
        ? busResponse.data
        : busResponse;

      setModalMode('edit');
      setSelectedBusId(busId);
      setFormData(buildDefaultFormData(busDetails));
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || 'Unable to load the selected bus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBusId(null);
    setFormData({});
  };

  const handleDeleteBus = (bus) => {
    const busId = getBusId(bus);
    if (busId === null || busId === undefined || busId === '') {
      setError('Unable to determine the bus ID for delete.');
      return;
    }
    setPendingDeleteBus(bus);
  };

  const confirmDeleteBus = async () => {
    const busId = getBusId(pendingDeleteBus);
    setPendingDeleteBus(null);
    setIsSubmitting(true);
    setError('');

    try {
      await deleteBus(busId);
      await loadBuses();
    } catch (err) {
      setError(err.message || 'Unable to delete bus.');
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
        await createBus(payload);
      } else {
        if (selectedBusId === null || selectedBusId === undefined || selectedBusId === '') {
          throw new Error('Unable to determine the bus ID for update.');
        }

        await updateBus(selectedBusId, payload);
      }

      closeModal();
      await loadBuses();
    } catch (err) {
      setError(err.message || 'Unable to save bus changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mr-auto grid w-full max-w-[92rem] gap-4 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-4 lg:px-6 xl:px-8">
      <SidebarMenu />
      <div className="glass-card min-w-0 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Operations</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Buses</h1>
            <p className="mt-3 text-slate-600">
              View and manage all bus fleet records.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
            onClick={openCreateModal}
          >
            Add Bus
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 hidden w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
          <table className="min-w-max w-full divide-y divide-slate-200 text-[11px]">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-2 py-2 text-center">{column.label}</th>
                ))}
                <th className="whitespace-nowrap px-2 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td className="px-2 py-4 text-center text-xs text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    Loading buses...
                  </td>
                </tr>
              ) : buses.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-center text-xs text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    No buses found.
                  </td>
                </tr>
              ) : (
                buses.map((bus, index) => {
                  const rowId = getBusId(bus) ?? index;

                  return (
                    <tr key={rowId}>
                      {TABLE_COLUMNS.map((column) => (
                        <td key={`${rowId}-${column.key}`} className="whitespace-nowrap px-2 py-2 text-center align-middle">
                          {formatCellValue(getBusFieldValue(bus, column.key))}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        <div className="flex flex-nowrap justify-center gap-1.5">
                          <button
                            type="button"
                            className="rounded-lg border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => setViewBus(bus)}
                            disabled={isSubmitting}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => openEditModal(bus)}
                            disabled={isSubmitting}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-2 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleDeleteBus(bus)}
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

        <div className="mt-6 space-y-3 md:hidden">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
              Loading buses...
            </div>
          ) : buses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
              No buses found.
            </div>
          ) : (
            buses.map((bus, index) => {
              const rowId = getBusId(bus) ?? index;

              return (
                <article key={rowId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="space-y-2">
                    {ALL_COLUMNS.map((column) => (
                      <div key={`${rowId}-card-${column.key}`} className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <p className="font-semibold text-slate-500">{formatCardLabel(column.label)}</p>
                        <p className="text-slate-800 break-words">{formatCellValue(getBusFieldValue(bus, column.key))}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => setViewBus(bus)}
                      disabled={isSubmitting}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => openEditModal(bus)}
                      disabled={isSubmitting}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleDeleteBus(bus)}
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Buses</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add Bus' : 'Update Bus'}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BUS_FORM_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  {field.label}
                  <input
                    type={field.type}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={formData[field.key] ?? ''}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}

              <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
      )}

      {viewBus && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Buses</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Bus Details</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setViewBus(null)}
              >
                Close
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ALL_COLUMNS.map((column) => (
                <div key={column.key} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 break-words">
                    {formatCellValue(getBusFieldValue(viewBus, column.key))}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setViewBus(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteBus && (
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete Bus</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this bus? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setPendingDeleteBus(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={confirmDeleteBus}
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
