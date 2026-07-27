export function isNotificationVisible(data: { status?: unknown }): boolean {
  return data.status !== 'archived';
}