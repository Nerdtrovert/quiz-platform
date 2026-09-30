/**
 * Utility for localStorage operations with expiration and error handling
 */

// Check if localStorage is available (browser) or use mock (Node.js)
const storage = typeof localStorage !== 'undefined' ? localStorage :
                (typeof global !== 'undefined' && global.localStorage) ? global.localStorage :
                {}; // We'll enhance this mock below

// Enhance the mock storage object if needed
if (typeof localStorage === 'undefined') {
  const mockStore = {};
  storage.getItem = (key) => mockStore[key] || null;
  storage.setItem = (key, value) => { mockStore[key] = value.toString(); };
  storage.removeItem = (key) => { delete mockStore[key]; };
  storage.clear = () => { Object.keys(mockStore).forEach(key => delete mockStore[key]); };
  storage.length = Object.keys(mockStore).length;
  storage.key = (index) => {
    const keys = Object.keys(mockStore);
    return keys[index] || null;
  };
}

const STORAGE_PREFIX = 'quiz_platform_';

/**
 * Get item from localStorage with expiration check
 * @param {string} key - Storage key (without prefix)
 * @param {number} ttlSeconds - Time to live in seconds (null for no expiration)
 * @returns {any|null} - Parsed value or null if not found/expired/error
 */
export const getItemWithExpiry = (key, ttlSeconds = null) => {
  try {
    const item = storage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!item) return null;

    const parsed = JSON.parse(item);

    // Check expiration if TTL is specified
    if (ttlSeconds !== null) {
      const now = Date.now();
      if (now - parsed.timestamp > ttlSeconds * 1000) {
        // Expired, remove it
        storage.removeItem(`${STORAGE_PREFIX}${key}`);
        return null;
      }
    }

    return parsed.value;
  } catch (error) {
    // Corrupted data or other error, remove to prevent issues
    console.warn(`Storage error for key ${key}:`, error);
    storage.removeItem(`${STORAGE_PREFIX}${key}`);
    return null;
  }
};

/**
 * Set item in localStorage with optional expiration
 * @param {string} key - Storage key (without prefix)
 * @param {any} value - Value to store
 * @param {number} ttlSeconds - Time to live in seconds (null for no expiration)
 */
export const setItemWithExpiry = (key, value, ttlSeconds = null) => {
  try {
    const item = {
      value: value,
      timestamp: Date.now(),
      ...(ttlSeconds !== null && { ttlSeconds })
    };
    storage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(item));
  } catch (error) {
    console.error(`Failed to set storage item ${key}:`, error);
    // Don't fail the app for storage issues
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key (without prefix)
 */
export const removeItem = (key) => {
  try {
    storage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Failed to remove storage item ${key}:`, error);
  }
};

/**
 * Clear all quiz platform items from localStorage
 */
export const clearQuizStorage = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
  } catch (error) {
    console.error(`Failed to clear quiz storage:`, error);
  }
};

/**
 * Get storage usage estimate (rough approximation)
 * @returns {number} - Estimated usage in bytes
 */
export const getStorageUsage = () => {
  try {
    let total = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        total += (storage.getItem(key).length * 2); // UTF-16 approx
      }
    }
    return total;
  } catch (error) {
    console.error(`Failed to get storage usage:`, error);
    return 0;
  }
};