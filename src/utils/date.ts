export function dateKeyOf(timestamp: number): string {
const d = new Date(timestamp);
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
return dateKeyOf(Date.now());
}

/** ISO parse yerine yerel gün/ay/yıl bileşenlerinden Date oluşturur (UTC kaymasını önler). */
export function dateFromKey(key: string): Date {
const [y, m, d] = key.split('-').map(Number);
return new Date(y, m - 1, d);
}
