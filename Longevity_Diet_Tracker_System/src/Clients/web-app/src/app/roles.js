import { getSession } from '../shared/services/session';

// Phân quyền giao diện theo vai trò trong JWT. Backend vẫn là lớp bảo vệ thật (403); đây chỉ quyết định hiển thị.

export const ROLES = { USER: 'User', NUTRITIONIST: 'Nutritionist', ADMIN: 'Admin' };

export const ROLE_LABELS = {
  User: 'Hội viên',
  Nutritionist: 'Chuyên gia dinh dưỡng',
  Admin: 'Quản trị viên',
};

export const USER_TABS = ['overview', 'meals', 'fasting', 'fmd', 'consultation', 'profile'];
export const ADMIN_TABS = ['admin-overview', 'admin-fmd', 'admin-templates', 'admin-users', 'admin-notify'];

/** Role của phiên đăng nhập thật; chưa đăng nhập (demo) coi là hội viên. */
export const currentRole = () => getSession()?.role ?? ROLES.USER;

/** Portal giao diện cho một role. Chuyên gia hiện dùng portal hội viên (có tab Cổng Bác Sĩ trong mục Tư vấn). */
export const portalFor = (role) => (role === ROLES.ADMIN ? 'admin' : 'user');

export const tabsFor = (role) => (portalFor(role) === 'admin' ? ADMIN_TABS : USER_TABS);
export const defaultTab = (role) => tabsFor(role)[0];
export const canAccessTab = (role, tab) => tabsFor(role).includes(tab);
export const roleLabel = (role) => ROLE_LABELS[role] ?? ROLE_LABELS.User;
