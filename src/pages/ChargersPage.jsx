import { useEffect, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import { createCharger, deleteCharger, fetchChargers, updateCharger } from '@/apiCalls';

const TABLE_COLUMNS = [
  { key: 'ChargerLevel', label: 'Charger Level' },
  { key: 'MaximumOutput', label: 'Maximum Output (kW)' },
  { key: 'RatedInput', label: 'Rated Input (V)' },
  { key: 'MaxEfficiency', label: 'Max Efficiency (%)' },
  { key: 'AdditionalLoss', label: 'Additional Loss (kW)' },
  { key: 'SteadyCharge', label: 'Steady Charge (kW)' },
];

const CHARGER_FORM_FIELDS = [
  { key: 'ChargerLevel', label: 'Charger Level (1=L1, 2=L2, 3=DC Fast)', type: 'number' },
  { key: 'MaximumOutput', label: 'Maximum Output (kW)', type: 'number' },
  { key: 'RatedInput', label: 'Rated Input (V)', type: 'text' },
  { key: 'MaxEfficiency', label: 'Max Efficiency (%)', type: 'number' },
  { key: 'AdditionalLoss', label: 'Additional Loss (kW)', type: 'number' },
  { key: 'SteadyCharge', label: 'Steady Charge (kW)', type: 'number' },
];

function normalizeChargersResponse(response) {
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

function getChargerFieldValue(charger, key) {
  if (!charger || typeof charger !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(charger).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? charger[matchedKey] : null;
}

function getChargerId(charger) {
  return getChargerFieldValue(charger, 'Id');
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

function buildDefaultFormData(charger) {
  return CHARGER_FORM_FIELDS.reduce((acc, field) => {
    const value = getChargerFieldValue(charger, field.key);
    acc[field.key] = value === undefined || value === null ? '' : String(value);
    return acc;
  }, {});
}

function getSerializablePayload(formData) {
  return CHARGER_FORM_FIELDS.reduce((acc, field) => {
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

export default function ChargersPage() {
  const [chargers, setChargers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedChargerId, setSelectedChargerId] = useState(null);
  const [formData, setFormData] = useState({});
  const [pendingDeleteCharger, setPendingDeleteCharger] = useState(null);

  const loadChargers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetchChargers();
      setChargers(normalizeChargersResponse(response));
    } catch (err) {
      setError(err.message || 'Unable to load chargers right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChargers();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedChargerId(null);
    setFormData(buildDefaultFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (charger) => {
    const chargerId = getChargerId(charger);
    setModalMode('edit');
    setSelectedChargerId(chargerId);
    setFormData(buildDefaultFormData(charger));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedChargerId(null);
    setFormData({});
  };

  const handleDeleteCharger = (charger) => {
    const chargerId = getChargerId(charger);
    if (chargerId === null || chargerId === undefined || chargerId === '') {
      setError('Unable to determine the charger ID for delete.');
      return;
    }
    setPendingDeleteCharger(charger);
  };

  const confirmDeleteCharger = async () => {
    const chargerId = getChargerId(pendingDeleteCharger);
    setPendingDeleteCharger(null);
    setIsSubmitting(true);
    setError('');

    try {
      await deleteCharger(chargerId);
      await loadChargers();
    } catch (err) {
      setError(err.message || 'Unable to delete charger.');
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
        await createCharger(payload);
      } else {
        if (selectedChargerId === null || selectedChargerId === undefined || selectedChargerId === '') {
          throw new Error('Unable to determine the charger ID for update.');
        }
        await updateCharger(selectedChargerId, {
          Id: Number(selectedChargerId),
          ...payload,
        });
      }

      closeModal();
      await loadChargers();
    } catch (err) {
      setError(err.message || 'Unable to save charger changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-[92rem] gap-4 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-4 lg:px-6 xl:px-8">
      <SidebarMenu />
      <div className="glass-card min-w-0 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Infrastructure</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Chargers</h1>
            <p className="mt-3 text-slate-600">
              View all chargers and manage records from one place.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
            onClick={openCreateModal}
          >
            Add Charger
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-max w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>
                ))}
                <th className="whitespace-nowrap px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    Loading chargers...
                  </td>
                </tr>
              ) : chargers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    No Charges Found
                  </td>
                </tr>
              ) : (
                chargers.map((charger, index) => {
                  const rowId = getChargerId(charger) ?? index;

                  return (
                    <tr key={rowId}>
                      {TABLE_COLUMNS.map((column) => (
                        <td key={`${rowId}-${column.key}`} className="whitespace-nowrap px-4 py-3 align-top">
                          {formatCellValue(getChargerFieldValue(charger, column.key))}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-nowrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            onClick={() => openEditModal(charger)}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleDeleteCharger(charger)}
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Chargers</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add Charger' : 'Update Charger'}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CHARGER_FORM_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  {field.label}
                  {field.key === 'ChargerLevel' ? (
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
                      <option value="">Select level</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  ) : field.key === 'RatedInput' ? (
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
                      <option value="">Select rated input</option>
                      <option value="240/208">240/208</option>
                      <option value="480">480</option>
                    </select>
                  ) : (
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
                  )}
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Charger' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDeleteCharger && (
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete Charger</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this charger? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setPendingDeleteCharger(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={confirmDeleteCharger}
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
