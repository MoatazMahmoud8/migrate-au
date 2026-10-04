export function isNotificationVisible(data: { status?: unknown; isTest?: unknown }): boolean {
  // "isTest" docs are published via the admin compose drawer's
  // "Admin Test Only" audience option — never show them to real users.
  return data.status !== 'archived' && data.isTest !== true;
}
