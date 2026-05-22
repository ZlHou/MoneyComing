/**
 * 本地存储工具 - Capacitor Preferences + localStorage 双备份
 */
import { Preferences } from '@capacitor/preferences';

const STORAGE_PREFIX = 'asset_mgr_';

function isNative() {
  try {
    return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function saveLocal(key, value) {
  const fullKey = STORAGE_PREFIX + key;
  const json = JSON.stringify(value);

  try {
    if (isNative()) {
      await Preferences.set({ key: fullKey, value: json });
    }
  } catch (e) {
    console.warn('Preferences.set failed:', e);
  }

  try {
    localStorage.setItem(fullKey, json);
  } catch (e) {
    console.warn('localStorage.setItem failed:', e);
  }
}

export async function loadLocal(key, defaultValue = null) {
  const fullKey = STORAGE_PREFIX + key;

  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key: fullKey });
      if (value != null) return JSON.parse(value);
    }
  } catch (e) {
    console.warn('Preferences.get failed:', e);
  }

  try {
    const raw = localStorage.getItem(fullKey);
    if (raw != null) return JSON.parse(raw);
  } catch (e) {
    console.warn('localStorage.getItem failed:', e);
  }

  return defaultValue;
}

export async function removeLocal(key) {
  const fullKey = STORAGE_PREFIX + key;

  try {
    if (isNative()) {
      await Preferences.remove({ key: fullKey });
    }
  } catch (e) {
    console.warn('Preferences.remove failed:', e);
  }

  try {
    localStorage.removeItem(fullKey);
  } catch (e) {
    console.warn('localStorage.removeItem failed:', e);
  }
}
