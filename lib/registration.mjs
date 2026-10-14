const STATUSES = new Set(["pending", "approved", "denied"]);

export function registrationStatus(record) {
  const status = record.customClaims?.fazaRegistration;
  // Unknown registration states cannot accidentally grant team access.
  return status === undefined ? null : STATUSES.has(status) ? status : "pending";
}
