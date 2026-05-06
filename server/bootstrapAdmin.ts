import bcrypt from 'bcryptjs';

export const BOOTSTRAP_ADMIN_USER_ID = 'u_admin';
export const BOOTSTRAP_ADMIN_EMAIL = 'robertstar@aol.com';
export const BOOTSTRAP_ADMIN_EMAIL_ALIASES = [
  BOOTSTRAP_ADMIN_EMAIL,
  'robertstarr@aol.com'
];
export const BOOTSTRAP_ADMIN_PASSWORD_HASH = '$2b$10$OyIPC8QP2X8EyB/G5IcBSODP6Zi6r3zdzxPu6OI2IGADC5TtqiFWm';
export const BOOTSTRAP_ADMIN_PROFILE = {
  user_id: BOOTSTRAP_ADMIN_USER_ID,
  display_name: 'Robert Starr',
  email: BOOTSTRAP_ADMIN_EMAIL,
  avatar_url: '',
  points: 2500,
  level: 12,
  branch_id: 'Addison',
  department: 'Governance',
  roles: ['Teacher'],
  status: 'active'
};

export const isBootstrapAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAIL_ALIASES.includes(email.trim().toLowerCase());
};

export const verifyBootstrapAdminPassword = async (password?: string | null) => {
  if (!password) return false;
  return bcrypt.compare(password, BOOTSTRAP_ADMIN_PASSWORD_HASH);
};
