import type { GameReviewResult } from './gameReviewService';

export class AiCoachNotConfiguredError extends Error {}

export interface CoachInsight { ply: number; message: string; }

/**
 * AI Koç, GameReviewResult'ı girdi alarak doğal dil açıklaması üretecek
 * şekilde tasarlanmıştır. Bunun için bir LLM API çağrısı gerekir ve
 * API anahtarı GÜVENLİ ŞEKİLDE yalnızca bir backend/proxy üzerinden
 * yönetilebilir — client koduna asla gömülmez.
 *
 * Bu projede henüz backend yoktur. Bu yüzden burada sahte/rastgele bir
 * açıklama üretmek yerine AÇIKÇA "yapılandırılmadı" hatası fırlatılır.
 * UI bu hatayı yakalayıp kullanıcıya gerçek durumu göstermelidir.
 */
export async function requestCoachInsights(_review: GameReviewResult): Promise<CoachInsight[]> {
  throw new AiCoachNotConfiguredError(
    'AI Koç şu anda kullanılamıyor: güvenli bir backend/proxy servisi gerektirir.'
  );
}
