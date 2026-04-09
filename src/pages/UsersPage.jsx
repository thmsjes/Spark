import { useEffect, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import { createUser, deleteUser, fetchDistricts, fetchUsers, updateUser } from '@/apiCalls';

const TABLE_COLUMNS = [
  { key: 'FirstName', label: 'First Name' },
  { key: 'LastName', label: 'Last Name' },
  { key: 'Email', label: 'Email' },
  { key: 'PhoneNumber', label: 'Phone Number' },
  { key: 'DistrictId', label: 'District' },
  { key: 'Role', label: 'Role' },

];

const USER_FORM_FIELDS = [
  { key: 'FirstName', label: 'First Name', type: 'text' },
  { key: 'LastName', label: 'Last Name', type: 'text' },
  { key: 'PhoneNumber', label: 'Phone Number', type: 'text' },
  { key: 'DistrictId', label: 'District', type: 'number' },
  { key: 'Role', label: 'Role', type: 'text' },
  { key: 'Email', label: 'Email', type: 'email' },
  { key: 'Password', label: 'Password', type: 'password' },
];

const ROLE_OPTIONS = ['User', 'Supervisor', 'Admin'];

function normalizeUsersResponse(response) {
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

function getFieldValue(entity, key) {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const matchedKey = Object.keys(entity).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return matchedKey ? entity[matchedKey] : null;
}

function getUserId(user) {
  return getFieldValue(user, 'Id');
}

function formatDateValue(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
}

function formatFieldLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDefaultFormData() {
  return USER_FORM_FIELDS.reduce((acc, field) => {
    acc[field.key] = '';
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

function getSerializablePayload(formData) {
  return USER_FORM_FIELDS.reduce((acc, field) => {
    const rawValue = formData[field.key];
    if (typeof rawValue !== 'string') {
      return acc;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return acc;
    }

    if (field.key === 'DistrictId') {
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

function getUserTableDisplayValue(user, columnKey, districtNameById) {
  const rawValue = getFieldValue(user, columnKey);
  let displayValue = rawValue;

  if (columnKey === 'DistrictId') {
    displayValue = districtNameById[String(rawValue)] || rawValue;
  }

  if (columnKey === 'LastLogin' || columnKey === 'DateTimeInserted') {
    displayValue = formatDateValue(rawValue);
  }

  if (displayValue === null || displayValue === undefined || displayValue === '') {
    return '-';
  }

  return String(displayValue);
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [districts, setDistricts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  const districtNameById = districts.reduce((acc, district) => {
    const districtId = getFieldValue(district, 'Id');
    const districtName = getFieldValue(district, 'Name');
    if (districtId !== null && districtId !== undefined && districtName) {
      acc[String(districtId)] = String(districtName);
    }
    return acc;
  }, {});

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((user) => TABLE_COLUMNS.some((column) =>
      getUserTableDisplayValue(user, column.key, districtNameById).toLowerCase().includes(normalizedSearch)
    ))
    : users;
  const sortedUsers = sortConfig.key
    ? [...filteredUsers].sort((left, right) => {
      const leftValue = getUserTableDisplayValue(left, sortConfig.key, districtNameById).toLowerCase();
      const rightValue = getUserTableDisplayValue(right, sortConfig.key, districtNameById).toLowerCase();
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    })
    : filteredUsers;

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
      const [usersResponse, districtsResponse] = await Promise.all([
        fetchUsers(),
        fetchDistricts(),
      ]);

      setUsers(normalizeUsersResponse(usersResponse));
      setDistricts(normalizeDistrictsResponse(districtsResponse));
    } catch (err) {
      setError(err.message || 'Unable to load users right now.');
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
    setSelectedUserId(null);
    setFormData(buildDefaultFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    const userId = getUserId(user);
    if (userId === null || userId === undefined || userId === '') {
      setError('Unable to determine the user ID for update.');
      return;
    }

    setError('');
    setModalMode('edit');
    setSelectedUserId(userId);

    const nextFormData = USER_FORM_FIELDS.reduce((acc, field) => {
      if (field.key === 'Password') {
        acc[field.key] = '';
        return acc;
      }

      const value = getFieldValue(user, field.key);
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
    setSelectedUserId(null);
    setFormData(buildDefaultFormData());
  };

  const handleDeleteUser = (user) => {
    const userId = getUserId(user);
    if (userId === null || userId === undefined || userId === '') {
      setError('Unable to determine the user ID for delete.');
      return;
    }

    setPendingDeleteUser(user);
  };

  const openViewModal = (user) => {
    setViewUser(user);
  };

  const closeViewModal = () => {
    setViewUser(null);
  };

  const confirmDeleteUser = async () => {
    const userId = getUserId(pendingDeleteUser);
    setPendingDeleteUser(null);
    setIsSubmitting(true);
    setError('');

    try {
      await deleteUser(userId);
      await loadPageData();
    } catch (err) {
      setError(err.message || 'Unable to delete user.');
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
        await createUser(payload);
      } else {
        if (selectedUserId === null || selectedUserId === undefined || selectedUserId === '') {
          throw new Error('Unable to determine the user ID for update.');
        }

        await updateUser(selectedUserId, {
          Id: Number(selectedUserId),
          ...payload,
        });
      }

      setIsModalOpen(false);
      setModalMode('create');
      setSelectedUserId(null);
      setFormData(buildDefaultFormData());
      await loadPageData();
    } catch (err) {
      setError(err.message || 'Unable to save user changes.');
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Workspace</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Users</h1>
            <p className="mt-3 text-slate-600">
              Manage user records and district assignments.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
            onClick={openCreateModal}
          >
            Add User
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
            placeholder="Search users..."
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
                    Loading users...
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMNS.length + 1}>
                    {searchTerm.trim() ? 'No users match your search.' : 'No Users Found'}
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user, index) => {
                  const rowId = getUserId(user) ?? index;

                  return (
                    <tr key={rowId}>
                      {TABLE_COLUMNS.map((column) => {
                        return (
                          <td key={`${rowId}-${column.key}`} className="whitespace-nowrap px-4 py-3 align-top">
                            {getUserTableDisplayValue(user, column.key, districtNameById)}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3 shadow-[-1px_0_0_0_rgba(226,232,240,1)]">
                        <div className="flex flex-nowrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => openViewModal(user)}
                            disabled={isSubmitting}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => openEditModal(user)}
                            disabled={isSubmitting}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleDeleteUser(user)}
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Users</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add User' : 'Update User'}
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
              {USER_FORM_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  {field.label}
                  {field.key === 'DistrictId' ? (
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
                      <option value="">Select district</option>
                      {districts.map((district, index) => {
                        const districtId = getFieldValue(district, 'Id') ?? index;
                        const districtName = getFieldValue(district, 'Name') ?? `District ${index + 1}`;
                        return (
                          <option key={districtId} value={String(districtId)}>{String(districtName)}</option>
                        );
                      })}
                    </select>
                  ) : field.key === 'Role' ? (
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
                      <option value="">Select role</option>
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Users</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">User Details</h2>
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
              {Object.keys(viewUser).length === 0 ? (
                <p className="text-sm text-slate-500">No user data available.</p>
              ) : (
                Object.keys(viewUser).map((key) => {
                  const rawValue = getFieldValue(viewUser, key);
                  let displayValue = rawValue;

                  if (key.toLowerCase() === 'districtid') {
                    displayValue = districtNameById[String(rawValue)] || rawValue;
                  }

                  if (key.toLowerCase() === 'lastlogin' || key.toLowerCase() === 'datetimeinserted') {
                    displayValue = formatDateValue(rawValue);
                  }

                  if (displayValue === null || displayValue === undefined || displayValue === '') {
                    displayValue = '-';
                  } else if (typeof displayValue === 'object') {
                    displayValue = JSON.stringify(displayValue);
                  }

                  return (
                    <div key={`view-${key}`} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatFieldLabel(key)}</p>
                      <p className="mt-1 break-words text-sm text-slate-800">{String(displayValue)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {pendingDeleteUser && (
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete User</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setPendingDeleteUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={confirmDeleteUser}
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
