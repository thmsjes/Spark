import { useEffect, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import { createBaseSetting, deleteBaseSetting, fetchBaseSettings, updateBaseSetting } from '@/apiCalls';

const TABLE_COLUMNS = [
  { key: 'busType', label: 'Bus Type' },
  { key: 'springSetting', label: 'Spring Setting' },
  { key: 'summerSetting', label: 'Summer Setting' },
  { key: 'fallSetting', label: 'Fall Setting' },
  { key: 'winterSetting', label: 'Winter Setting' },
];

const BASE_SETTING_FORM_FIELDS = [
  { key: 'busType', label: 'Bus Type', type: 'text' },
  { key: 'springSetting', label: 'Spring Setting', type: 'number' },
  { key: 'summerSetting', label: 'Summer Setting', type: 'number' },
  { key: 'fallSetting', label: 'Fall Setting', type: 'number' },
  { key: 'winterSetting', label: 'Winter Setting', type: 'number' },
];

function normalizeBaseSettingsResponse(response) {
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

function getBaseSettingId(baseSetting) {
  return getFieldValue(baseSetting, 'id');
}

function buildDefaultFormData() {
  return BASE_SETTING_FORM_FIELDS.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

function getSerializablePayload(formData) {
  return BASE_SETTING_FORM_FIELDS.reduce((acc, field) => {
    const rawValue = formData[field.key];
    if (typeof rawValue !== 'string') {
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

function getBaseSettingTableDisplayValue(baseSetting, columnKey) {
  const rawValue = getFieldValue(baseSetting, columnKey);

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '-';
  }

  return String(rawValue);
}

export default function BaseSettingsPage() {
  const [baseSettings, setBaseSettings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedBaseSettingId, setSelectedBaseSettingId] = useState(null);
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [pendingDeleteBaseSetting, setPendingDeleteBaseSetting] = useState(null);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBaseSettings = normalizedSearch
    ? baseSettings.filter((baseSetting) => TABLE_COLUMNS.some((column) =>
      getBaseSettingTableDisplayValue(baseSetting, column.key).toLowerCase().includes(normalizedSearch)
    ))
    : baseSettings;
  const sortedBaseSettings = sortConfig.key
    ? [...filteredBaseSettings].sort((left, right) => {
      const leftValue = getBaseSettingTableDisplayValue(left, sortConfig.key).toLowerCase();
      const rightValue = getBaseSettingTableDisplayValue(right, sortConfig.key).toLowerCase();
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    })
    : filteredBaseSettings;

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

  const loadPageData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const baseSettingsResponse = await fetchBaseSettings();
      setBaseSettings(normalizeBaseSettingsResponse(baseSettingsResponse));
    } catch (err) {
      setError(err.message || 'Unable to load base settings right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const openCreateModal = () => {
    setError('');
    setModalMode('create');
    setSelectedBaseSettingId(null);
    setFormData(buildDefaultFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (baseSetting) => {
    const baseSettingId = getBaseSettingId(baseSetting);
    if (baseSettingId === null || baseSettingId === undefined || baseSettingId === '') {
      setError('Unable to determine the base setting ID for update.');
      return;
    }

    setError('');
    setModalMode('edit');
    setSelectedBaseSettingId(baseSettingId);

    const nextFormData = BASE_SETTING_FORM_FIELDS.reduce((acc, field) => {
      const value = getFieldValue(baseSetting, field.key);
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
    setSelectedBaseSettingId(null);
    setFormData(buildDefaultFormData());
  };

  const handleDeleteBaseSetting = (baseSetting) => {
    const baseSettingId = getBaseSettingId(baseSetting);
    if (baseSettingId === null || baseSettingId === undefined || baseSettingId === '') {
      setError('Unable to determine the base setting ID for delete.');
      return;
    }

    setPendingDeleteBaseSetting(baseSetting);
  };

  const confirmDeleteBaseSetting = async () => {
    const baseSettingId = getBaseSettingId(pendingDeleteBaseSetting);
    setPendingDeleteBaseSetting(null);
    setIsSubmitting(true);
    setError('');

    try {
      await deleteBaseSetting(baseSettingId);
      await loadPageData();
    } catch (err) {
      setError(err.message || 'Unable to delete base setting.');
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
        await createBaseSetting(payload);
      } else {
        if (selectedBaseSettingId === null || selectedBaseSettingId === undefined || selectedBaseSettingId === '') {
          throw new Error('Unable to determine the base setting ID for update.');
        }

        await updateBaseSetting(selectedBaseSettingId, {
          id: Number(selectedBaseSettingId),
          ...payload,
        });
      }

      setIsModalOpen(false);
      setModalMode('create');
      setSelectedBaseSettingId(null);
      setFormData(buildDefaultFormData());
      await loadPageData();
    } catch (err) {
      setError(err.message || 'Unable to save base setting changes.');
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Admin</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Base Settings</h1>
            <p className="mt-3 text-slate-600">
              Manage base settings for different bus types and seasons.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
            onClick={openCreateModal}
          >
            Add Base Setting
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
            placeholder="Search base settings..."
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
                <th className="sticky right-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-3 shadow-[-1px_0_0_0_rgba(226,232,240,1)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    Loading base settings...
                  </td>
                </tr>
              ) : sortedBaseSettings.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    {searchTerm.trim() ? 'No base settings match your search.' : 'No Base Settings Found'}
                  </td>
                </tr>
              ) : (
                sortedBaseSettings.map((baseSetting, index) => {
                  const rowId = getBaseSettingId(baseSetting) ?? index;

                  return (
                    <tr key={rowId}>
                      {TABLE_COLUMNS.map((column) => {
                        return (
                          <td key={`${rowId}-${column.key}`} className="whitespace-nowrap px-4 py-3 align-top">
                            {getBaseSettingTableDisplayValue(baseSetting, column.key)}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3 shadow-[-1px_0_0_0_rgba(226,232,240,1)]">
                        <div className="flex flex-nowrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => openEditModal(baseSetting)}
                            disabled={isSubmitting}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleDeleteBaseSetting(baseSetting)}
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Base Settings</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add Base Setting' : 'Update Base Setting'}
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
              {BASE_SETTING_FORM_FIELDS.map((field) => (
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
                    required
                  />
                </label>
              ))}
              <div className="col-span-full mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                  {isSubmitting ? 'Saving...' : (modalMode === 'create' ? 'Create' : 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDeleteBaseSetting && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Base Settings</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Delete Base Setting</h2>
              <p className="mt-2 text-slate-600">
                Are you sure you want to delete the base setting for bus type "{getFieldValue(pendingDeleteBaseSetting, 'busType')}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setPendingDeleteBaseSetting(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDeleteBaseSetting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}