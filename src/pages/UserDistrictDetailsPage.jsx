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
  return normalized === 'id' || normalized === 'districtid' || normalized === 'users';
}

function getUsersFromDistrict(district) {
  const users = getFieldValue(district, 'Users');
  return Array.isArray(users) ? users : [];
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
        </div>
      ) : null}
    </div>
  );
}
