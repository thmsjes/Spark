import { useEffect, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import { fetchDistrictById, fetchDistrictStatusByDistrictId, fetchDistricts, fetchUsers } from '@/apiCalls';

function normalizeList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function getField(obj, key) {
  if (!obj || typeof obj !== 'object') return null;
  const match = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
  return match ? obj[match] : null;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function formatDistrictDetailValue(key, value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '-';
    }

    const normalizedKey = String(key || '').toLowerCase();
    if (normalizedKey === 'users') {
      const labels = value.slice(0, 3).map((user) => {
        if (!user || typeof user !== 'object') {
          return String(user);
        }

        const firstName = getField(user, 'FirstName');
        const lastName = getField(user, 'LastName');
        const email = getField(user, 'Email');
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        return fullName || (email ? String(email) : 'User');
      });

      const remainingCount = value.length - labels.length;
      return remainingCount > 0
        ? `${labels.join(', ')} +${remainingCount} more`
        : labels.join(', ');
    }

    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  if (typeof value === 'object') {
    const jsonValue = JSON.stringify(value);
    return jsonValue && jsonValue !== '{}' ? jsonValue : '-';
  }

  return String(value);
}

function avg(total, count) {
  if (!count) return '0';
  return (total / count).toFixed(1);
}

function formatProgressValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `${numeric}%`;
}

function getProgressToneClass(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 'border-slate-200 bg-slate-100 text-slate-700';
  if (numeric < 40) return 'border-red-200 bg-red-50 text-red-700';
  if (numeric < 80) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function normalizeStatusResponse(response) {
  if (!response || typeof response !== 'object') return null;
  if (Array.isArray(response)) return response[0] || null;
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items[0] || null;
  return response;
}

export default function Dashboard() {
  const [districts, setDistricts] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [viewDistrict, setViewDistrict] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setIsLoading(true);
      try {
        const [districtsRes, usersRes] = await Promise.allSettled([
          fetchDistricts(),
          fetchUsers(),
        ]);

        if (cancelled) return;

        const districtsList = districtsRes.status === 'fulfilled' ? normalizeList(districtsRes.value) : [];

        const districtsWithStatus = await Promise.all(
          districtsList.map(async (district) => {
            const districtId = getField(district, 'Id');
            if (districtId === null || districtId === undefined || String(districtId).trim() === '') {
              return district;
            }

            try {
              const statusResponse = await fetchDistrictStatusByDistrictId(districtId);
              const statusEntity = normalizeStatusResponse(statusResponse);

              return {
                ...district,
                Progress: getField(statusEntity, 'status'),
                Step: getField(statusEntity, 'step'),
              };
            } catch {
              return {
                ...district,
                Progress: null,
                Step: null,
              };
            }
          })
        );

        if (cancelled) return;

        setDistricts(districtsWithStatus);
        setUsers(usersRes.status === 'fulfilled' ? normalizeList(usersRes.value) : []);
      } catch {
        if (!cancelled) setError('Failed to load dashboard data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(''), 3000);
    return () => window.clearTimeout(id);
  }, [error]);

  const totalBusCount = districts.reduce((sum, d) => sum + (Number(getField(d, 'BusCount')) || 0), 0);
  const totalChargerCount = districts.reduce((sum, d) => sum + (Number(getField(d, 'ChargerCount')) || 0), 0);
  const totalRouteCount = districts.reduce((sum, d) => sum + (Number(getField(d, 'RouteCount')) || 0), 0);
  const districtCount = districts.length;

  const stats = [
    { label: 'Districts', value: districtCount },
    { label: 'Users', value: users.length },
    { label: 'Total Routes', value: totalRouteCount },
    { label: 'Total Buses', value: totalBusCount },
    { label: 'Total Chargers', value: totalChargerCount },
    { label: 'Avg Buses / District', value: avg(totalBusCount, districtCount) },
    { label: 'Avg Chargers / District', value: avg(totalChargerCount, districtCount) },
    { label: 'Avg Routes / District', value: avg(totalRouteCount, districtCount) },
  ];

  const openViewModal = async (district) => {
    const districtId = getField(district, 'Id');
    if (districtId === null || districtId === undefined || String(districtId).trim() === '') {
      setError('Unable to determine district id for view.');
      return;
    }

    setError('');
    setIsViewModalOpen(true);
    setIsViewLoading(true);

    try {
      const detailsResponse = await fetchDistrictById(districtId);
      const details = normalizeStatusResponse(detailsResponse);
      setViewDistrict(details && typeof details === 'object' ? details : district);
    } catch {
      setViewDistrict(district);
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
  };

  return (
    <section className="mx-auto grid w-full max-w-[92rem] gap-4 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-4 lg:px-6 xl:px-8">
      <div className="flex flex-col gap-4">
        <SidebarMenu />
        {!isLoading && (
          <div className="glass-card rounded-2xl p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Summary</p>
            <table className="w-full">
              <tbody>
                {stats.map(({ label, value }) => (
                  <tr key={label} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 text-xs text-slate-500">{label}</td>
                    <td className="py-1.5 text-right text-xs font-semibold text-slate-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-6">

        {/* Header */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Admin</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">Fleet-wide overview across all districts.</p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Loading dashboard data...</p>
        ) : (
          <>
            {/* Districts Table */}
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Districts</h2>
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-max w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Name</th>
                      <th className="whitespace-nowrap px-4 py-3">City</th>
                      <th className="whitespace-nowrap px-4 py-3">State</th>
                      <th className="whitespace-nowrap px-4 py-3">Phone</th>
                      <th className="whitespace-nowrap px-4 py-3">Buses</th>
                      <th className="whitespace-nowrap px-4 py-3">Chargers</th>
                      <th className="whitespace-nowrap px-4 py-3">Routes</th>
                      <th className="whitespace-nowrap px-4 py-3">Progress</th>
                      <th className="whitespace-nowrap px-4 py-3">Step</th>
                      <th className="whitespace-nowrap px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {districts.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-center text-slate-500" colSpan={10}>No districts found.</td>
                      </tr>
                    ) : (
                      districts.map((district, i) => {
                        const id = getField(district, 'Id') ?? i;
                        return (
                          <tr key={id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatValue(getField(district, 'Name'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'City'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'State'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'PhoneNumber'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'BusCount'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'ChargerCount'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'RouteCount'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getProgressToneClass(getField(district, 'Progress'))}`}>
                                {formatProgressValue(getField(district, 'Progress'))}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(district, 'Step'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <button
                                type="button"
                                className="rounded border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                onClick={() => openViewModal(district)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Users</h2>
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-max w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Name</th>
                      <th className="whitespace-nowrap px-4 py-3">Email</th>
                      <th className="whitespace-nowrap px-4 py-3">Role</th>
                      <th className="whitespace-nowrap px-4 py-3">District</th>
                      <th className="whitespace-nowrap px-4 py-3">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {users.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-center text-slate-500" colSpan={5}>No users found.</td>
                      </tr>
                    ) : (
                      users.map((user, i) => {
                        const id = getField(user, 'Id') ?? i;
                        const districtId = getField(user, 'DistrictId');
                        const district = districts.find((d) => String(getField(d, 'Id')) === String(districtId));
                        return (
                          <tr key={id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                              {[formatValue(getField(user, 'FirstName')), formatValue(getField(user, 'LastName'))].filter((p) => p !== '-').join(' ') || '-'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(user, 'Email'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(user, 'Role'))}</td>
                            <td className="whitespace-nowrap px-4 py-3">{district ? formatValue(getField(district, 'Name')) : formatValue(districtId)}</td>
                            <td className="whitespace-nowrap px-4 py-3">{formatValue(getField(user, 'PhoneNumber'))}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {isViewModalOpen && (
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">District Details</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{formatValue(getField(viewDistrict, 'Name'))}</h2>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.keys(viewDistrict || {}).sort((a, b) => a.localeCompare(b)).map((key) => (
                  <div key={`district-view-${key}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</p>
                    <p className="mt-1 break-words text-sm text-slate-800">{formatDistrictDetailValue(key, getField(viewDistrict, key))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}