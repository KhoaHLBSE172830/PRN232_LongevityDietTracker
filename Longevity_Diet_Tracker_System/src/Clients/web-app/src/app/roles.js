import { getSession } from '../shared/services/session';

// Phân quyền giao diện theo vai trò trong JWT. Backend vẫn là lớp bảo vệ thật (403); đây chỉ quyết định hiển thị.

export const ROLES = { USER: 'User', NUTRITIONIST: 'Nutritionist', ADMIN: 'Admin' };

export const ROLE_LABELS = {
  User: 'Hội viên',
  Nutritionist: 'Chuyên gia dinh dưỡng',
  Admin: 'Quản trị viên',
};

export const USER_TABS = ['overview', 'meals', 'fasting', 'fmd', 'consultation', 'profile'];
export const DOCTOR_TABS = ['doctor-overview', 'doctor-schedule', 'doctor-patients', 'doctor-advice'];
export const ADMIN_TABS = ['admin-overview', 'admin-fmd', 'admin-templates', 'admin-users', 'admin-notify'];

/** Role của phiên đăng nhập thật; chưa đăng nhập (demo) coi là hội viên. */
export const currentRole = () => getSession()?.role ?? ROLES.USER;

/** Portal giao diện cho một role: admin, doctor (chuyên gia) hoặc user (hội viên, mặc định). */
export const portalFor = (role) => (role === ROLES.ADMIN ? 'admin' : role === ROLES.NUTRITIONIST ? 'doctor' : 'user');

const TABS_BY_PORTAL = { admin: ADMIN_TABS, doctor: DOCTOR_TABS, user: USER_TABS };
export const tabsFor = (role) => TABS_BY_PORTAL[portalFor(role)];
export const defaultTab = (role) => tabsFor(role)[0];
export const canAccessTab = (role, tab) => tabsFor(role).includes(tab);
export const roleLabel = (role) => ROLE_LABELS[role] ?? ROLE_LABELS.User;
