import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createDistrictCharger,
  deleteDistrictCharger,
  fetchChargers,
  fetchDistrictChargersByDistrictId,
  fetchUserById,
  getCurrentUserId,
  updateDistrictCharger,
} from '@/apiCalls';

const TABLE_COLUMNS = [
  { key: 'ChargerType', label: 'Charger Type' },
];

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

function getDistrictChargerId(row) {
  return getFieldValue(row, 'DistrictChargerId') ?? getFieldValue(row, 'Id') ?? null;
}

function getChargerId(row) {
  return getFieldValue(row, 'ChargerId') ?? getFieldValue(row, 'Id') ?? null;
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

function buildDefaultFormData(row) {
  return {
    chargerId: String(getChargerId(row) ?? '').trim(),
    chargerType: String(getFieldValue(row, 'ChargerType') ?? getFieldValue(row, 'chargerType') ?? '').trim(),
  };
}

function buildChargerOptionLabel(charger) {
  const id = getFieldValue(charger, 'Id');
  const level = getFieldValue(charger, 'ChargerLevel');
  const maximumOutput = getFieldValue(charger, 'MaximumOutput');

  const segments = [
    id !== null && id !== undefined ? `Id ${id}` : null,
    level !== null && level !== undefined ? `Level ${level}` : null,
    maximumOutput !== null && maximumOutput !== undefined ? `${maximumOutput} kW` : null,
  ].filter(Boolean);

  return segments.join(' | ') || 'Charger';
}

function getRowChargerType(row, chargerOptions) {
  const explicitType = String(getFieldValue(row, 'ChargerType') ?? getFieldValue(row, 'chargerType') ?? '').trim();
  if (explicitType) {
    return explicitType;
  }

  const rowChargerId = String(getChargerId(row) ?? '').trim();
  if (!rowChargerId) {
    return '-';
  }

  const matched = chargerOptions.find((charger) => String(getFieldValue(charger, 'Id') ?? '').trim() === rowChargerId);
  return matched ? buildChargerOptionLabel(matched) : '-';
}

export default function UserChargersPage() {
  const [districtId, setDistrictId] = useState(null);
  const [rows, setRows] = useState([]);
  const [chargerOptions, setChargerOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRow, setSelectedRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState(null);
  const [formData, setFormData] = useState(buildDefaultFormData());

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

      const [districtChargersResponse, chargersResponse] = await Promise.all([
        fetchDistrictChargersByDistrictId(resolvedDistrictId),
        fetchChargers(),
      ]);

      setRows(normalizeCollectionResponse(districtChargersResponse));
      setChargerOptions(normalizeCollectionResponse(chargersResponse));
    } catch (err) {
      setError(err.message || 'Unable to load district chargers right now.');
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
    setSelectedRow(null);
    setFormData(buildDefaultFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setError('');
    setModalMode('edit');
    setSelectedRow(row);
    setFormData(buildDefaultFormData(row));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setSelectedRow(null);
    setFormData(buildDefaultFormData());
  };

  const closeViewModal = () => {
    setViewRow(null);
  };

  const openViewModal = (row) => {
    const rowChargerId = String(getChargerId(row) ?? '').trim();
    if (!rowChargerId) {
      setViewRow(row);
      return;
    }

    const matchedCharger = chargerOptions.find(
      (charger) => String(getFieldValue(charger, 'Id') ?? '').trim() === rowChargerId
    );

    setViewRow(matchedCharger || row);
  };

  const requestDeleteRow = (row) => {
    setError('');
    setPendingDeleteRow(row);
  };

  const cancelDelete = () => {
    if (isSubmitting) {
      return;
    }
    setPendingDeleteRow(null);
  };

  const handleChargerSelection = (value, label) => {
    setFormData({
      chargerId: value,
      chargerType: label,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedDistrictId = Number(districtId);
    const chargerId = Number(formData.chargerId);

    if (!districtId || Number.isNaN(normalizedDistrictId)) {
      setError('District is not loaded yet. Please try again in a moment.');
      return;
    }

    if (Number.isNaN(chargerId)) {
      setError('Charger is required.');
      return;
    }

    const payload = {
      districtId: normalizedDistrictId,
      DistrictId: normalizedDistrictId,
      chargerId,
      ChargerId: chargerId,
      chargerType: String(formData.chargerType || '').trim() || undefined,
      ChargerType: String(formData.chargerType || '').trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createDistrictCharger(payload);
      } else {
        const identifiers = {
          districtChargerId: getDistrictChargerId(selectedRow),
          chargerId: getChargerId(selectedRow),
          districtId: normalizedDistrictId,
        };
        await updateDistrictCharger(identifiers, payload);
      }

      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to save district charger changes right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteRow) {
      setPendingDeleteRow(null);
      return;
    }

    const normalizedDistrictId = Number(districtId);
    const identifiers = {
      districtChargerId: getDistrictChargerId(pendingDeleteRow),
      chargerId: getChargerId(pendingDeleteRow),
      districtId: Number.isNaN(normalizedDistrictId) ? null : normalizedDistrictId,
    };

    setIsSubmitting(true);
    setError('');
    try {
      await deleteDistrictCharger(identifiers);
      setPendingDeleteRow(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to delete district charger right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewFields = useMemo(() => {
    if (!viewRow || typeof viewRow !== 'object') {
      return [];
    }

    return Object.keys(viewRow).sort((a, b) => a.localeCompare(b));
  }, [viewRow]);

  return (
    <div className="glass-card min-w-0 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Chargers</h1>
          <p className="mt-3 text-slate-600">
            Showing chargers for district {districtId !== null ? String(districtId) : '-'}.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-start"
          onClick={openCreateModal}
          disabled={isLoading || !districtId}
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
                  Loading district chargers...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                  No chargers found for this district.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const rowKey = getDistrictChargerId(row) ?? `${String(getChargerId(row) ?? '')}-${index}`;

                return (
                  <tr key={String(rowKey)}>
                    {TABLE_COLUMNS.map((column) => (
                      <td key={`${String(rowKey)}-${column.key}`} className="whitespace-nowrap px-4 py-3 align-top">
                        {column.key === 'ChargerType'
                          ? getRowChargerType(row, chargerOptions)
                          : formatCellValue(getFieldValue(row, column.key))}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          onClick={() => openViewModal(row)}
                          disabled={isSubmitting}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => openEditModal(row)}
                          disabled={isSubmitting}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          onClick={() => requestDeleteRow(row)}
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

      {isModalOpen && createPortal((
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true" style={{ zIndex: 130 }}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Chargers</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{modalMode === 'create' ? 'Add Charger' : 'Update Charger'}</h2>
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
                Charger
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.chargerId}
                  onChange={(event) => handleChargerSelection(
                    event.target.value,
                    event.target.options?.[event.target.selectedIndex]?.text || ''
                  )}
                  required
                >
                  <option value="">Select charger</option>
                  {chargerOptions.map((charger) => {
                    const optionValue = getFieldValue(charger, 'Id');
                    if (optionValue === null || optionValue === undefined || String(optionValue).trim() === '') {
                      return null;
                    }

                    return (
                      <option key={`charger-option-${String(optionValue)}`} value={String(optionValue)}>
                        {buildChargerOptionLabel(charger)}
                      </option>
                    );
                  })}
                </select>
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Add Charger' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {viewRow && createPortal((
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true" style={{ zIndex: 140 }}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Chargers</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Charger Details</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={closeViewModal}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {viewFields.map((key) => (
                <div key={`view-${key}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</p>
                  <p className="mt-1 break-words text-sm text-slate-800">{formatCellValue(getFieldValue(viewRow, key))}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ), document.body)}

      {pendingDeleteRow && createPortal((
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true" style={{ zIndex: 150 }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete Charger</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this district charger? This action cannot be undone.</p>
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
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
