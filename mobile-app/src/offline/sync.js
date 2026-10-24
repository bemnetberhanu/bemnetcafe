import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { create } from 'zustand';
import { ordersApi, purchasesApi, expensesApi } from '../api/client';
import {
  enqueueRecord,
  getConflictRecords,
  getPendingRecords,
  getRecordCounts,
  retryConflictRecords,
  updateRecord,
} from './database';

export const useOfflineSyncStore = create((set, get) => ({
  userId: null,
  online: null,
  syncing: false,
  pending: 0,
  conflicts: 0,
  conflictRecords: [],
  refresh: async (userId = get().userId) => {
    if (!userId) return;
    const [counts, conflictRecords] = await Promise.all([
      getRecordCounts(userId),
      getConflictRecords(userId),
    ]);
    set({ userId, ...counts, conflictRecords });
  },
  setOnline: (online) => set({ online }),
}));

const operationApi = {
  order: ordersApi.create,
  purchase: purchasesApi.create,
  expense: expensesApi.create,
};

let activeSync;
function operationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function temporaryFailure(error) {
  return !error.response || error.response.status >= 500;
}

function errorMessage(error) {
  return error.response?.data?.error
    || error.response?.data?.message
    || error.message
    || 'The server rejected this record.';
}

export async function refreshSyncStatus(userId) {
  await useOfflineSyncStore.getState().refresh(userId);
}

export async function recordManagerOperation(type, payload, userId) {
  if (!operationApi[type]) throw new Error(`Unsupported offline record type: ${type}`);
  if (!userId) throw new Error('A signed-in manager is required to save records.');

  const id = operationId();
  const recordPayload = { ...payload, client_operation_id: id };
  const network = await Network.getNetworkStateAsync();
  const offline = network.isConnected === false || network.isInternetReachable === false;

  if (!offline) {
    try {
      await operationApi[type](recordPayload);
      return { queued: false, id };
    } catch (error) {
      if (!temporaryFailure(error) || error.response?.status === 401) throw error;
    }
  }

  await enqueueRecord({ id, userId, type, payload });
  await refreshSyncStatus(userId);
  return { queued: true, id };
}

export async function syncPendingRecords(userId) {
  if (!userId) return;
  if (activeSync) return activeSync;

  activeSync = (async () => {
    useOfflineSyncStore.setState({ syncing: true });
    try {
      const network = await Network.getNetworkStateAsync();
      const online = network.isConnected !== false && network.isInternetReachable !== false;
      useOfflineSyncStore.getState().setOnline(online);
      if (!online) return;

      const records = await getPendingRecords(userId);
      for (const record of records) {
        try {
          await operationApi[record.type]({
            ...JSON.parse(record.payload),
            client_operation_id: record.id,
          });
          await updateRecord(record.id, 'synced');
        } catch (error) {
          const status = error.response?.status;
          if (status === 401 || temporaryFailure(error)) {
            await updateRecord(record.id, 'pending', errorMessage(error));
            break;
          }
          await updateRecord(record.id, 'conflict', errorMessage(error));
        }
      }
    } finally {
      useOfflineSyncStore.setState({ syncing: false });
      await refreshSyncStatus(userId);
    }
  })();

  try {
    await activeSync;
  } finally {
    activeSync = null;
  }
}

export async function retryConflicts(userId) {
  if (!userId) return;
  await retryConflictRecords(userId);
  await syncPendingRecords(userId);
}

export function startOfflineSync(userId) {
  if (!userId) return () => {};

  refreshSyncStatus(userId).then(() => syncPendingRecords(userId)).catch((error) => {
    console.error('Could not initialize offline sync:', error);
  });

  const triggerSync = () => syncPendingRecords(userId).catch((error) => {
    console.error('Could not sync offline records:', error);
  });
  const networkSubscription = Network.addNetworkStateListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    useOfflineSyncStore.getState().setOnline(online);
    if (online) triggerSync();
  });

  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') triggerSync();
  });

  return () => {
    networkSubscription.remove();
    appStateSubscription.remove();
  };
}
