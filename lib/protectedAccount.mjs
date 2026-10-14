export const PROTECTED_ADMIN_EMAIL = "fazahomeae@gmail.com";

export function isProtectedAccount(record) {
  return typeof record?.email === "string" && record.email.trim().toLowerCase() === PROTECTED_ADMIN_EMAIL;
}
