import { useSyncExternalStore } from 'react';
import { DEMO_USER } from './apiClient';
import { getSession } from './session';

// Người dùng hiện tại của UI (thay cho việc import thẳng DEMO_USER ở từng màn hình).
// Lưu localStorage để giữ sau khi tải lại trang. Chưa đăng nhập => DEMO_USER (chế độ demo).

const KEY = 'longevity_user';
const listeners = new Set();
let cachedRaw = undefined;
let cachedUser = DEMO_USER;

function read() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* bỏ qua */
  }
  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;
  try {
    cachedUser = raw ? { ...DEMO_USER, ...JSON.parse(raw) } : DEMO_USER;
  } catch {
    cachedUser = DEMO_USER;
  }
  return cachedUser;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getCurrentUser() {
  return read();
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* bỏ qua */
  }
  emit();
}

export function clearCurrentUser() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('accessToken');
  } catch {
    /* bỏ qua */
  }
  emit();
}

/** true nếu đang dùng tài khoản demo (không có JWT thật). */
export function isDemoMode() {
  return getSession() === null;
}

/** Có người dùng đã đăng nhập (thật hoặc demo) được lưu lại. */
export function hasStoredUser() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCurrentUser() {
  return useSyncExternalStore(subscribe, read, read);
}
