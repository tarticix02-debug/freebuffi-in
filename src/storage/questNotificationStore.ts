import { dbGetAll, dbPut } from './db';

interface NotificationRecord {
  id: string;
  notifiedAt: number;
}

function key(dateKey: string, templateId: string) {
  return `${dateKey}__${templateId}`;
}

export async function hasBeenNotified(dateKey: string, templateId: string): Promise<boolean> {
  const all = await dbGetAll<NotificationRecord>('questNotifications');
  return all.some((r) => r.id === key(dateKey, templateId));
}

export async function markNotified(dateKey: string, templateId: string): Promise<void> {
  await dbPut('questNotifications', { id: key(dateKey, templateId), notifiedAt: Date.now() });
}
