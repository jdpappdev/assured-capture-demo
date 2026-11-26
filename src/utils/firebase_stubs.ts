export const doc = (...args: any[]) => ({});
export const getDoc = async (...args: any[]) => ({ exists: () => false, data: (): Record<string, any> => ({}) });
export const setDoc = async (...args: any[]) => ({});
export const updateProfile = async (...args: any[]) => ({});
export const enqueueSync = (...args: any[]) => {};
export const clearSyncQueueForUser = (...args: any[]) => {};
export const fetchUserProfileFromFirestore = async (...args: any[]) => null;
export const saveUserProfileToAccount = async (...args: any[]) => {};
export const createEmptyGuestProfile = () => ({});
export const clearStoredUserProfile = () => {};
export const migrateExistingLocalData = async () => {};
export const clearLocalCacheOnSignOut = async () => {};
export const subscribeToQuotaStatus = (callback: (exhausted: boolean) => void) => {
    callback(false);
    return () => {};
};
export const db = {};
