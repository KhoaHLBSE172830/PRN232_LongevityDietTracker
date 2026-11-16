// Phiên đăng nhập dùng chung: đọc JWT trong localStorage.accessToken.
// Token không phải JWT hợp lệ (vd. 'demo-jwt-token') => coi như chưa đăng nhập thật (chế độ demo).

export const TOKEN_KEY = 'accessToken';

const NAME_ID_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const ROLE_URI = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const EMAIL_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** { token, userId, email, role } nếu có JWT còn hạn, ngược lại null. */
export function getSession() {
  const token = getAccessToken();
  if (!token || token.split('.').length !== 3) return null;

  const claims = decodeJwt(token);
  if (!claims) return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;

  const userId = claims.nameid || claims[NAME_ID_URI] || claims.sub;
  if (!userId) return null;

  return {
    token,
    userId,
    email: claims.email || claims[EMAIL_URI] || null,
    role: claims.role || claims[ROLE_URI] || 'User',
  };
}

export function isLoggedIn() {
  return getSession() !== null;
}

export function setAccessToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage không khả dụng: bỏ qua */
  }
}
