import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createRoute,
  createRouteDetail,
  deleteRoute,
  deleteRouteDetail,
  fetchChargers,
  fetchDistrictChargersByDistrictId,
  fetchRouteById,
  fetchRouteDetailsByRouteId,
  fetchRoutesByDistrictId,
  fetchUserById,
  getCurrentUserId,
  updateRoute,
  updateRouteDetail,
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

function formatFieldLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRouteRowId(route, index) {
  return getFieldValue(route, 'Id')
    ?? getFieldValue(route, 'RouteId')
    ?? getFieldValue(route, 'RouteNumber')
    ?? index;
}

function getRouteId(route) {
  return getFieldValue(route, 'Id') ?? getFieldValue(route, 'RouteId') ?? null;
}

function getCreatedRouteId(response) {
  const directId = response?.id ?? response?.routeId;
  if (directId !== null && directId !== undefined && String(directId).trim()) {
    return directId;
  }

  const nestedId = response?.data?.id ?? response?.data?.routeId;
  if (nestedId !== null && nestedId !== undefined && String(nestedId).trim()) {
    return nestedId;
  }

  return null;
}

function toTimeSpanString(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const normalized = normalizeTimeInput(raw);
  if (!normalized) {
    return raw;
  }

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  return normalized;
}

function normalizeTimeInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (/^\d{3,4}$/.test(raw)) {
    const digits = raw.padStart(4, '0');
    const hours = Number(digits.slice(0, 2));
    const minutes = Number(digits.slice(2, 4));
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hourPart, minutePart] = raw.split(':');
    const hours = Number(hourPart);
    const minutes = Number(minutePart);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) {
    const hours = Number(raw.slice(0, 2));
    const minutes = Number(raw.slice(3, 5));
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${raw.slice(0, 2)}:${raw.slice(3, 5)}`;
    }
  }

  return raw;
}

function normalizeRouteDetails(detailsResponse) {
  const details = normalizeCollectionResponse(detailsResponse);
  if (!Array.isArray(details)) {
    return [];
  }

  return details.map((detail) => ({
    id: getFieldValue(detail, 'Id') ?? getFieldValue(detail, 'RouteDetailId') ?? null,
    startTime: String(getFieldValue(detail, 'StartTime') ?? '').trim(),
    endTime: String(getFieldValue(detail, 'EndTime') ?? '').trim(),
    miles: String(getFieldValue(detail, 'Miles') ?? '').trim(),
    chargerAvailable: Boolean(getFieldValue(detail, 'ChargerAvailable') ?? getFieldValue(detail, 'chargerAvailable') ?? false),
    chargerId: String(getFieldValue(detail, 'ChargerId') ?? getFieldValue(detail, 'chargerId') ?? '').trim(),
    chargerType: String(getFieldValue(detail, 'ChargerType') ?? getFieldValue(detail, 'chargerType') ?? '').trim(),
    isNew: false,
    isDirty: false,
    isDeleted: false,
  }));
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
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }

  return (hours * 60) + minutes + (seconds / 60);
}

function buildRouteSummary(details) {
  const totalMiles = details.reduce((sum, detail) => sum + (Number(detail.miles) || 0), 0);

  const totalMinutes = details.reduce((sum, detail) => {
    const start = parseTimeSpanToMinutes(detail.startTime);
    const end = parseTimeSpanToMinutes(detail.endTime);
    if (start === null || end === null) {
      return sum;
    }

    const delta = end >= start ? end - start : (24 * 60) - start + end;
    return sum + delta;
  }, 0);

  return {
    totalMiles,
    totalMinutes,
  };
}

function formatMinutes(totalMinutes) {
  const minutes = Math.round(Number(totalMinutes) || 0);
  const hoursPart = Math.floor(minutes / 60);
  const minutesPart = minutes % 60;

  if (hoursPart === 0) {
    return `${minutesPart}m`;
  }

  return `${hoursPart}h ${String(minutesPart).padStart(2, '0')}m`;
}

function buildChargerTypeLabel(charger, fallbackIndex = 1) {
  const chargerId = getFieldValue(charger, 'Id');
  const chargerLevel = getFieldValue(charger, 'ChargerLevel');
  const maximumOutput = getFieldValue(charger, 'MaximumOutput');
  const optionValue = chargerId === null || chargerId === undefined ? '' : String(chargerId);

  return [
    chargerLevel !== null && chargerLevel !== undefined ? `Level ${chargerLevel}` : null,
    maximumOutput !== null && maximumOutput !== undefined ? `${maximumOutput} kW` : null,
    optionValue ? `ID ${optionValue}` : null,
  ].filter(Boolean).join(' | ') || `Charger ${fallbackIndex}`;
}

function getSelectedOptionText(event) {
  const selectedIndex = event?.target?.selectedIndex;
  if (selectedIndex === null || selectedIndex === undefined || selectedIndex < 0) {
    return '';
  }

  const selectedOption = event.target.options?.[selectedIndex];
  return String(selectedOption?.text ?? '').trim();
}

function getDistrictChargerId(option) {
  return getFieldValue(option, 'Id') ?? getFieldValue(option, 'DistrictChargerId') ?? null;
}

function buildDistrictChargerLabel(option, fallbackIndex = 1) {
  const chargerType = String(getFieldValue(option, 'ChargerType') ?? getFieldValue(option, 'chargerType') ?? '').trim();
  if (chargerType) {
    return chargerType;
  }

  const chargerId = getFieldValue(option, 'ChargerId') ?? getFieldValue(option, 'chargerId') ?? null;
  const districtChargerId = getDistrictChargerId(option);

  return [
    chargerId !== null && chargerId !== undefined ? `Charger ${chargerId}` : null,
    districtChargerId !== null && districtChargerId !== undefined ? `District Charger ${districtChargerId}` : null,
  ].filter(Boolean).join(' | ') || `District Charger ${fallbackIndex}`;
}

export default function UserRoutesPage() {
  const [districtId, setDistrictId] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewRoute, setViewRoute] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editFormData, setEditFormData] = useState({ routeName: '', busId: '', routeDetails: [] });
  const [routeSummariesByRouteId, setRouteSummariesByRouteId] = useState({});
  const [pendingDeleteRoute, setPendingDeleteRoute] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [districtChargers, setDistrictChargers] = useState([]);
  const [isChargersLoading, setIsChargersLoading] = useState(false);
  const [formData, setFormData] = useState({
    routeName: '',
    busId: '',
    routeDetails: [],
  });
  const [detailForm, setDetailForm] = useState({
    startTime: '',
    endTime: '',
    miles: '',
    chargerAvailable: false,
    chargerId: '',
    chargerType: '',
  });

  const loadRoutes = async () => {
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

      const routesResponse = await fetchRoutesByDistrictId(resolvedDistrictId);
      const normalizedRoutes = normalizeCollectionResponse(routesResponse);
      setRoutes(normalizedRoutes);
      setDistrictId(resolvedDistrictId);

      try {
        const districtChargersResponse = await fetchDistrictChargersByDistrictId(resolvedDistrictId);
        setDistrictChargers(normalizeCollectionResponse(districtChargersResponse));
      } catch {
        setDistrictChargers([]);
      }

      const summaries = await Promise.all(
        normalizedRoutes.map(async (route) => {
          const routeId = getRouteId(route);
          if (!routeId) {
            return [null, null];
          }

          try {
            const detailsResponse = await fetchRouteDetailsByRouteId(routeId);
            const details = normalizeRouteDetails(detailsResponse);
            return [String(routeId), buildRouteSummary(details)];
          } catch {
            return [String(routeId), { totalMiles: 0, totalMinutes: 0 }];
          }
        })
      );

      const summaryMap = {};
      summaries.forEach(([routeId, summary]) => {
        if (routeId && summary) {
          summaryMap[routeId] = summary;
        }
      });
      setRouteSummariesByRouteId(summaryMap);
    } catch (err) {
      setError(err.message || 'Unable to load routes right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  useEffect(() => {
    if (!isDetailsModalOpen) {
      return;
    }

    let isActive = true;

    const loadChargers = async () => {
      setIsChargersLoading(true);
      try {
        const chargersResponse = await fetchChargers();
        if (isActive) {
          setChargers(normalizeCollectionResponse(chargersResponse));
        }
      } catch (err) {
        if (isActive) {
          setChargers([]);
          setError(err.message || 'Unable to load chargers right now.');
        }
      } finally {
        if (isActive) {
          setIsChargersLoading(false);
        }
      }
    };

    loadChargers();

    return () => {
      isActive = false;
    };
  }, [isDetailsModalOpen]);

  const openCreateModal = () => {
    setError('');
    setFormData({
      routeName: '',
      busId: '',
      routeDetails: [],
    });
    setDetailForm({
      startTime: '',
      endTime: '',
      miles: '',
      chargerAvailable: false,
      chargerId: '',
      chargerType: '',
    });
    setIsDetailsModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsDetailsModalOpen(false);
    setIsCreateModalOpen(false);
  };

  const openDetailsModal = () => {
    setDetailForm({
      startTime: '',
      endTime: '',
      miles: '',
      chargerAvailable: false,
      chargerId: '',
      chargerType: '',
    });
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsDetailsModalOpen(false);
  };

  const handleAddDetail = (event) => {
    event.preventDefault();

    const startTime = toTimeSpanString(detailForm.startTime);
    const endTime = toTimeSpanString(detailForm.endTime);
    const milesValue = Number(detailForm.miles);

    if (!startTime || !endTime) {
      setError('Start Time and End Time are required for route details.');
      return;
    }

    if (!/^\d{2}:\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}:\d{2}$/.test(endTime)) {
      setError('Start Time and End Time must be valid times in HH:mm format.');
      return;
    }

    if (Number.isNaN(milesValue)) {
      setError('Miles must be a valid number.');
      return;
    }

    if (detailForm.chargerAvailable && !String(detailForm.chargerId).trim()) {
      setError('Charger Type is required when charger is available.');
      return;
    }

    const selectedChargerTypeLabel = String(detailForm.chargerType || '').trim();

    setError('');
    setFormData((previous) => ({
      ...previous,
      routeDetails: [
        ...previous.routeDetails,
        {
          startTime,
          endTime,
          miles: milesValue,
          chargerAvailable: detailForm.chargerAvailable,
          chargerId: detailForm.chargerAvailable ? String(detailForm.chargerId) : '',
          chargerType: detailForm.chargerAvailable && selectedChargerTypeLabel
            ? String(selectedChargerTypeLabel)
            : '',
        },
      ],
    }));
    setIsDetailsModalOpen(false);
  };

  const handleRemoveDetail = (indexToRemove) => {
    setFormData((previous) => ({
      ...previous,
      routeDetails: previous.routeDetails.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleCreateRoute = async (event) => {
    event.preventDefault();
    setError('');

    if (!districtId) {
      setError('District is not loaded yet. Please try again in a moment.');
      return;
    }

    const routeName = formData.routeName.trim();
    if (!routeName) {
      setError('Route name is required.');
      return;
    }

    const busId = Number(formData.busId);
    if (Number.isNaN(busId)) {
      setError('Bus number must be a valid number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const routePayload = {
        routeName,
        RouteName: routeName,
        busId,
        BusId: busId,
        districtId: Number(districtId),
        DistrictId: Number(districtId),
        routeDetails: [],
        RouteDetails: [],
      };

      const createdRouteResponse = await createRoute(routePayload);
      const createdRouteId = getCreatedRouteId(createdRouteResponse);

      if (!createdRouteId) {
        throw new Error('Route was created but no route id was returned.');
      }

      if (formData.routeDetails.length > 0) {
        await Promise.all(
          formData.routeDetails.map((detail) =>
            createRouteDetail({
              routeId: Number(createdRouteId),
              RouteId: Number(createdRouteId),
              startTime: detail.startTime,
              StartTime: detail.startTime,
              endTime: detail.endTime,
              EndTime: detail.endTime,
              miles: Number(detail.miles),
              Miles: Number(detail.miles),
              chargerAvailable: Boolean(detail.chargerAvailable),
              ChargerAvailable: Boolean(detail.chargerAvailable),
              chargerId: detail.chargerAvailable && String(detail.chargerId ?? '').trim()
                ? Number(detail.chargerId)
                : undefined,
              ChargerId: detail.chargerAvailable && String(detail.chargerId ?? '').trim()
                ? Number(detail.chargerId)
                : undefined,
              chargerType: detail.chargerAvailable && String(detail.chargerType ?? '').trim()
                ? String(detail.chargerType)
                : undefined,
              ChargerType: detail.chargerAvailable && String(detail.chargerType ?? '').trim()
                ? String(detail.chargerType)
                : undefined,
            })
          )
        );
      }

      setIsCreateModalOpen(false);
      setIsDetailsModalOpen(false);
      await loadRoutes();
    } catch (err) {
      setError(err.message || 'Unable to add route right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openViewModal = async (route) => {
    const routeId = getRouteId(route);
    if (!routeId) {
      setError('Unable to determine route id for viewing.');
      return;
    }

    setError('');
    setIsViewLoading(true);
    setViewRoute({});

    try {
      const [routeResponse, detailsResponse] = await Promise.all([
        fetchRouteById(routeId),
        fetchRouteDetailsByRouteId(routeId),
      ]);
      const hydratedRoute = normalizeEntityResponse(routeResponse);
      if (hydratedRoute) {
        setViewRoute({
          ...hydratedRoute,
          RouteDetails: normalizeRouteDetails(detailsResponse),
        });
      } else {
        throw new Error('Unable to load route details right now.');
      }
    } catch (err) {
      setViewRoute(null);
      setError(err.message || 'Unable to load route details right now.');
    } finally {
      setIsViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewRoute(null);
    setIsViewLoading(false);
  };

  const openEditModal = async (route) => {
    const routeId = getRouteId(route);
    if (!routeId) {
      setError('Unable to determine route id for update.');
      return;
    }

    setError('');
    setEditingRouteId(routeId);
    setIsEditModalOpen(true);
    setIsEditLoading(true);

    const fallbackEditData = {
      routeName: String(getFieldValue(route, 'RouteName') ?? getFieldValue(route, 'Name') ?? '').trim(),
      busId: String(getFieldValue(route, 'BusId') ?? '').trim(),
      routeDetails: [],
    };

    setEditFormData({
      ...fallbackEditData,
    });

    try {
      const [routeResponse, detailsResponse] = await Promise.all([
        fetchRouteById(routeId),
        fetchRouteDetailsByRouteId(routeId),
      ]);
      const hydratedRoute = normalizeEntityResponse(routeResponse);
      if (hydratedRoute) {
        setEditFormData({
          routeName: String(getFieldValue(hydratedRoute, 'RouteName') ?? getFieldValue(hydratedRoute, 'Name') ?? '').trim(),
          busId: String(getFieldValue(hydratedRoute, 'BusId') ?? '').trim(),
          routeDetails: normalizeRouteDetails(detailsResponse),
        });
      }
    } catch {
      setEditFormData(fallbackEditData);
    } finally {
      setIsEditLoading(false);
    }
  };

  const closeEditModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsEditModalOpen(false);
    setEditingRouteId(null);
    setEditFormData({ routeName: '', busId: '', routeDetails: [] });
  };

  const addEditDetailRow = () => {
    setEditFormData((previous) => ({
      ...previous,
      routeDetails: [
        ...previous.routeDetails,
        {
          id: null,
          startTime: '',
          endTime: '',
          miles: '',
          chargerAvailable: false,
          chargerId: '',
          chargerType: '',
          isNew: true,
          isDirty: true,
          isDeleted: false,
        },
      ],
    }));
  };

  const updateEditDetailField = (indexToUpdate, key, value) => {
    setEditFormData((previous) => ({
      ...previous,
      routeDetails: previous.routeDetails.map((detail, index) => {
        if (index !== indexToUpdate) {
          return detail;
        }
        return {
          ...detail,
          [key]: value,
          isDirty: true,
        };
      }),
    }));
  };

  const removeEditDetailRow = (indexToRemove) => {
    setEditFormData((previous) => {
      const target = previous.routeDetails[indexToRemove];
      if (!target) {
        return previous;
      }

      if (target.id) {
        return {
          ...previous,
          routeDetails: previous.routeDetails.map((detail, index) =>
            index === indexToRemove
              ? { ...detail, isDeleted: true, isDirty: true }
              : detail
          ),
        };
      }

      return {
        ...previous,
        routeDetails: previous.routeDetails.filter((_, index) => index !== indexToRemove),
      };
    });
  };

  const handleUpdateRoute = async (event) => {
    event.preventDefault();
    setError('');

    if (!editingRouteId) {
      setError('Unable to determine route id for update.');
      return;
    }

    if (!districtId) {
      setError('District is not loaded yet. Please try again in a moment.');
      return;
    }

    const routeName = editFormData.routeName.trim();
    if (!routeName) {
      setError('Route name is required.');
      return;
    }

    const busId = Number(editFormData.busId);
    if (Number.isNaN(busId)) {
      setError('Bus number must be a valid number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRoute(editingRouteId, {
        routeName,
        RouteName: routeName,
        busId,
        BusId: busId,
        districtId: Number(districtId),
        DistrictId: Number(districtId),
      });

      const activeDetails = editFormData.routeDetails.filter((detail) => !detail.isDeleted);
      const invalidDetail = activeDetails.find((detail) => {
        const startTime = toTimeSpanString(detail.startTime);
        const endTime = toTimeSpanString(detail.endTime);
        const miles = Number(detail.miles);
        return !/^\d{2}:\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}:\d{2}$/.test(endTime) || Number.isNaN(miles);
      });

      if (invalidDetail) {
        throw new Error('Each route detail must include Start Time, End Time, and numeric Miles.');
      }

      const createdDetails = editFormData.routeDetails.filter((detail) => !detail.isDeleted && !detail.id);
      const updatedDetails = editFormData.routeDetails.filter((detail) => !detail.isDeleted && detail.id && detail.isDirty);
      const deletedDetails = editFormData.routeDetails.filter((detail) => detail.isDeleted && detail.id);

      if (createdDetails.length > 0) {
        await Promise.all(
          createdDetails.map((detail) =>
            createRouteDetail({
              routeId: Number(editingRouteId),
              RouteId: Number(editingRouteId),
              startTime: toTimeSpanString(detail.startTime),
              StartTime: toTimeSpanString(detail.startTime),
              endTime: toTimeSpanString(detail.endTime),
              EndTime: toTimeSpanString(detail.endTime),
              miles: Number(detail.miles),
              Miles: Number(detail.miles),
              chargerAvailable: Boolean(detail.chargerAvailable),
              ChargerAvailable: Boolean(detail.chargerAvailable),
              chargerId: detail.chargerAvailable && String(detail.chargerId ?? '').trim()
                ? Number(detail.chargerId)
                : undefined,
              ChargerId: detail.chargerAvailable && String(detail.chargerId ?? '').trim()
                ? Number(detail.chargerId)
                : undefined,
              chargerType: detail.chargerAvailable && String(detail.chargerType ?? '').trim()
                ? String(detail.chargerType)
                : undefined,
              ChargerType: detail.chargerAvailable && String(detail.chargerType ?? '').trim()
                ? String(detail.chargerType)
                : undefined,
            })
          )
        );
      }

      if (updatedDetails.length > 0) {
        await Promise.all(
          updatedDetails.map((detail) =>
            updateRouteDetail(detail.id, {
              routeId: Number(editingRouteId),
              RouteId: Number(editingRouteId),
              startTime: toTimeSpanString(detail.startTime),
              StartTime: toTimeSpanString(detail.startTime),
              endTime: toTimeSpanString(detail.endTime),
              EndTime: toTimeSpanString(detail.endTime),
              miles: Number(detail.miles),
              Miles: Number(detail.miles),
              chargerAvailable: Boolean(detail.chargerAvailable),
              ChargerAvailable: Boolean(detail.chargerAvailable),
              chargerId: detail.chargerAvailable && String(detail.chargerId ?? '').trim()
                ? Number(detail.chargerId)
                : undefined,
              ChargerId: detail.chargerAvailable && String(detail.chargerId ?? '').trim()
                ? Number(detail.chargerId)
                : undefined,
              chargerType: detail.chargerAvailable && String(detail.chargerType ?? '').trim()
                ? String(detail.chargerType)
                : undefined,
              ChargerType: detail.chargerAvailable && String(detail.chargerType ?? '').trim()
                ? String(detail.chargerType)
                : undefined,
            })
          )
        );
      }

      if (deletedDetails.length > 0) {
        await Promise.all(deletedDetails.map((detail) => deleteRouteDetail(detail.id)));
      }

      closeEditModal();
      await loadRoutes();
    } catch (err) {
      setError(err.message || 'Unable to update route right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteRoute = (route) => {
    const routeId = getRouteId(route);
    if (!routeId) {
      setError('Unable to determine route id for delete.');
      return;
    }

    setError('');
    setPendingDeleteRoute(route);
  };

  const cancelDeleteRoute = () => {
    if (isSubmitting) {
      return;
    }
    setPendingDeleteRoute(null);
  };

  const confirmDeleteRoute = async () => {
    const routeId = getRouteId(pendingDeleteRoute);
    if (!routeId) {
      setError('Unable to determine route id for delete.');
      setPendingDeleteRoute(null);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await deleteRoute(routeId);
      setPendingDeleteRoute(null);
      await loadRoutes();
    } catch (err) {
      setError(err.message || 'Unable to delete route right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    if (routes.length === 0) {
      return [];
    }

    return Object.keys(routes[0] || {}).filter((key) => {
      const normalized = String(key).toLowerCase();
      return normalized !== 'districtid' && normalized !== 'id' && normalized !== 'routeid' && normalized !== 'routedetails';
    });
  }, [routes]);

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">My Workspace</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Routes</h1>
          <p className="mt-3 text-slate-600">
            Showing routes for district {districtId !== null ? String(districtId) : '-'}.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={openCreateModal}
          disabled={isLoading || !districtId}
        >
          Add Route
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3">{formatFieldLabel(column)}</th>
              ))}
              <th className="whitespace-nowrap px-4 py-3">Total Mileage</th>
              <th className="whitespace-nowrap px-4 py-3">Total Time</th>
              <th className="whitespace-nowrap px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={Math.max(columns.length + 3, 1)}>
                  Loading routes...
                </td>
              </tr>
            ) : routes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={Math.max(columns.length + 3, 1)}>
                  No routes found for this district.
                </td>
              </tr>
            ) : (
              routes.map((route, index) => (
                <tr key={String(getRouteRowId(route, index))}>
                  {columns.map((column) => {
                    const value = getFieldValue(route, column);
                    const displayValue = value === null || value === undefined || value === ''
                      ? '-'
                      : typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value);

                    return (
                      <td key={`${String(getRouteRowId(route, index))}-${column}`} className="whitespace-nowrap px-4 py-3 align-top">
                        {displayValue}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    {(() => {
                      const routeId = getRouteId(route);
                      const summary = routeId ? routeSummariesByRouteId[String(routeId)] : null;
                      if (!summary) {
                        return '-';
                      }
                      return `${summary.totalMiles.toFixed(1)} mi`;
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    {(() => {
                      const routeId = getRouteId(route);
                      const summary = routeId ? routeSummariesByRouteId[String(routeId)] : null;
                      if (!summary) {
                        return '-';
                      }
                      return formatMinutes(summary.totalMinutes);
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        onClick={() => openViewModal(route)}
                        disabled={isSubmitting}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => openEditModal(route)}
                        disabled={isSubmitting}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => requestDeleteRoute(route)}
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

      {isCreateModalOpen && createPortal((
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true" style={{ zIndex: 130 }}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Routes</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Add Route</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeCreateModal}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Route Name
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.routeName}
                  onChange={(event) => setFormData((previous) => ({ ...previous, routeName: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Bus Number
                <input
                  type="number"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.busId}
                  onChange={(event) => setFormData((previous) => ({ ...previous, busId: event.target.value }))}
                  required
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">Route Details</p>
                  <button
                    type="button"
                    className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    onClick={openDetailsModal}
                  >
                    Add Details
                  </button>
                </div>

                {formData.routeDetails.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No route details added yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Start Time</th>
                          <th className="px-3 py-2">End Time</th>
                          <th className="px-3 py-2">Miles</th>
                          <th className="px-3 py-2">Charger Available</th>
                          <th className="px-3 py-2">Charger Type</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {formData.routeDetails.map((detail, index) => (
                          <tr key={`detail-${index}`}>
                            <td className="px-3 py-2">{detail.startTime}</td>
                            <td className="px-3 py-2">{detail.endTime}</td>
                            <td className="px-3 py-2">{String(detail.miles)}</td>
                            <td className="px-3 py-2">{detail.chargerAvailable ? 'Yes' : 'No'}</td>
                            <td className="px-3 py-2">{detail.chargerAvailable ? (detail.chargerType || '-') : '-'}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                                onClick={() => handleRemoveDetail(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeCreateModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {isDetailsModalOpen && createPortal((
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true" style={{ zIndex: 140 }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Routes</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Add Route Details</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeDetailsModal}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddDetail} className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Start Time
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="830 or 08:30"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={detailForm.startTime}
                  onChange={(event) => setDetailForm((previous) => ({ ...previous, startTime: event.target.value }))}
                  onBlur={(event) => setDetailForm((previous) => ({ ...previous, startTime: normalizeTimeInput(event.target.value) }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                End Time
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1215 or 12:15"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={detailForm.endTime}
                  onChange={(event) => setDetailForm((previous) => ({ ...previous, endTime: event.target.value }))}
                  onBlur={(event) => setDetailForm((previous) => ({ ...previous, endTime: normalizeTimeInput(event.target.value) }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Miles
                <input
                  type="number"
                  step="0.1"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={detailForm.miles}
                  onChange={(event) => setDetailForm((previous) => ({ ...previous, miles: event.target.value }))}
                  required
                />
              </label>

              <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                <p>Charger Available</p>
                <button
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    detailForm.chargerAvailable
                      ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setDetailForm((previous) => ({
                    ...previous,
                    chargerAvailable: !previous.chargerAvailable,
                    chargerId: previous.chargerAvailable ? '' : previous.chargerId,
                    chargerType: previous.chargerAvailable ? '' : previous.chargerType,
                  }))}
                >
                  {detailForm.chargerAvailable ? 'Yes — Charger Available' : 'No — Charger Not Available'}
                </button>
              </div>

              {detailForm.chargerAvailable && (
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Charger Type
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={detailForm.chargerId}
                    onChange={(event) => setDetailForm((previous) => ({
                      ...previous,
                      chargerId: event.target.value,
                      chargerType: getSelectedOptionText(event),
                    }))}
                    required
                  >
                    <option value="">Select charger type</option>
                    {chargers.map((charger, index) => {
                      const chargerId = getFieldValue(charger, 'Id');
                      const optionValue = chargerId === null || chargerId === undefined ? '' : String(chargerId);
                      const optionLabel = buildChargerTypeLabel(charger, index + 1);

                      if (!optionValue) {
                        return null;
                      }

                      return (
                        <option key={`charger-option-${optionValue}`} value={optionValue}>
                          {optionLabel}
                        </option>
                      );
                    })}
                  </select>
                  {isChargersLoading && (
                    <span className="text-xs text-slate-500">Loading chargers...</span>
                  )}
                </label>
              )}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeDetailsModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  Save Detail
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {viewRoute && createPortal((
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true" style={{ zIndex: 150 }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Routes</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Route Details</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={closeViewModal}
              >
                Close
              </button>
            </div>

            {isViewLoading ? (
              <p className="text-sm text-slate-600">Loading route details...</p>
            ) : (
              <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.keys(viewRoute).filter((key) => String(key).toLowerCase() !== 'routedetails').map((key) => {
                  const value = getFieldValue(viewRoute, key);
                  const displayValue = value === null || value === undefined || value === ''
                    ? '-'
                    : typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value);

                  return (
                    <div key={`view-route-${key}`} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatFieldLabel(key)}</p>
                      <p className="mt-1 break-words text-sm text-slate-800">{displayValue}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Route Details</p>
                {Array.isArray(viewRoute.RouteDetails) && viewRoute.RouteDetails.length > 0 ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Start Time</th>
                          <th className="px-3 py-2">End Time</th>
                          <th className="px-3 py-2">Miles</th>
                          <th className="px-3 py-2">Charger Available</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewRoute.RouteDetails.map((detail, index) => (
                          <tr key={`view-detail-${detail.id ?? index}`}>
                            <td className="px-3 py-2">{detail.startTime || '-'}</td>
                            <td className="px-3 py-2">{detail.endTime || '-'}</td>
                            <td className="px-3 py-2">{detail.miles || '-'}</td>
                            <td className="px-3 py-2">{detail.chargerAvailable ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No route details found.</p>
                )}
              </div>
              </>
            )}
          </div>
        </div>
      ), document.body)}

      {isEditModalOpen && createPortal((
        <div className="app-modal-overlay app-modal-overlay--top" role="dialog" aria-modal="true" style={{ zIndex: 150 }}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Routes</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Update Route</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeEditModal}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateRoute} className="grid grid-cols-1 gap-4">
              {isEditLoading ? (
                <p className="text-sm text-slate-600">Loading route details...</p>
              ) : (
                <>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Route Name
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={editFormData.routeName}
                  onChange={(event) => setEditFormData((previous) => ({ ...previous, routeName: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Bus Number
                <input
                  type="number"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={editFormData.busId}
                  onChange={(event) => setEditFormData((previous) => ({ ...previous, busId: event.target.value }))}
                  required
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">Route Details</p>
                  <button
                    type="button"
                    className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    onClick={addEditDetailRow}
                  >
                    Add Detail
                  </button>
                </div>

                {editFormData.routeDetails.filter((detail) => !detail.isDeleted).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No route details.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {editFormData.routeDetails.map((detail, index) => {
                      if (detail.isDeleted) {
                        return null;
                      }

                      return (
                        <div
                          key={`edit-detail-${detail.id ?? `new-${index}`}`}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Departure Time
                              <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="830 or 08:30"
                                className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                                  value={detail.startTime}
                                onChange={(event) => updateEditDetailField(index, 'startTime', event.target.value)}
                                  onBlur={(event) => updateEditDetailField(index, 'startTime', normalizeTimeInput(event.target.value))}
                                required
                              />
                            </label>

                            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Arrival Time
                              <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="1215 or 12:15"
                                className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                                  value={detail.endTime}
                                onChange={(event) => updateEditDetailField(index, 'endTime', event.target.value)}
                                  onBlur={(event) => updateEditDetailField(index, 'endTime', normalizeTimeInput(event.target.value))}
                                required
                              />
                            </label>

                            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:col-span-2">
                              Miles
                              <input
                                type="number"
                                step="0.1"
                                className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                                value={detail.miles}
                                onChange={(event) => updateEditDetailField(index, 'miles', event.target.value)}
                                required
                              />
                            </label>

                            <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:col-span-2">
                              <p>Charger Available</p>
                              <button
                                type="button"
                                className={`rounded border px-3 py-2 text-sm font-normal transition ${
                                  detail.chargerAvailable
                                    ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  const nextValue = !detail.chargerAvailable;
                                  updateEditDetailField(index, 'chargerAvailable', nextValue);
                                  if (!nextValue) {
                                    updateEditDetailField(index, 'chargerId', '');
                                    updateEditDetailField(index, 'chargerType', '');
                                  }
                                }}
                              >
                                {detail.chargerAvailable ? 'Yes — Charger Available' : 'No — Charger Not Available'}
                              </button>
                            </div>

                            {detail.chargerAvailable && (
                              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:col-span-2">
                                Charger Type
                                <select
                                  className="rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                                  value={String(detail.chargerId ?? '')}
                                  onChange={(event) => {
                                    const selectedText = getSelectedOptionText(event);
                                    updateEditDetailField(index, 'chargerId', event.target.value);
                                    updateEditDetailField(index, 'chargerType', selectedText);
                                  }}
                                >
                                  <option value="">Select district charger</option>
                                  {districtChargers.map((option, optionIndex) => {
                                    const optionValue = getDistrictChargerId(option);
                                    if (optionValue === null || optionValue === undefined || String(optionValue).trim() === '') {
                                      return null;
                                    }

                                    const optionLabel = buildDistrictChargerLabel(option, optionIndex + 1);
                                    return (
                                      <option key={`edit-district-charger-${String(optionValue)}`} value={String(optionValue)}>
                                        {optionLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                              </label>
                            )}
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => removeEditDetailRow(index)}
                            >
                              Delete Detail
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeEditModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
                </>
              )}
            </form>
          </div>
        </div>
      ), document.body)}

      {pendingDeleteRoute && createPortal((
        <div className="app-modal-overlay app-modal-overlay--center" role="dialog" aria-modal="true" style={{ zIndex: 150 }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete Route</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this route? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={cancelDeleteRoute}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDeleteRoute}
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
