/** Explains a denied full-study request; never grants or changes entitlement. */
export function membershipRequiredMessage(salesReady: boolean | null, state?: string): string {
  const free = 'Günün üç ücretsiz görevini ve iki kısa pratiği kullanabilirsiniz. Örnek konu anlatımları da açıktır.';
  if (state === 'SUBSCRIPTION_STATE_PENDING')
    return `Google Play ödemeniz henüz tamamlanmadı. Veliniz mevcut ödemenin durumunu Google Play'den kontrol edebilir. ${free}`;
  if (state === 'SUBSCRIPTION_STATE_ON_HOLD')
    return `Aboneliğinizde bir ödeme sorunu var. Veliniz Google Play'deki mevcut aboneliğin ödeme bilgilerini kontrol edebilir. ${free}`;
  if (state === 'SUBSCRIPTION_STATE_PAUSED')
    return `Aboneliğiniz duraklatılmış. Veliniz mevcut aboneliği Google Play'den yönetebilir. ${free}`;
  if (salesReady === null)
    return `Bu tam çalışma için aktif öğrenci aboneliği gerekli. Üyelik bilgileri şu anda alınamıyor; biraz sonra yeniden deneyebilirsiniz. ${free}`;
  return salesReady
    ? `Bu tam çalışma için aktif öğrenci aboneliği gerekli. Veliniz Üyelik bölümünden devam edebilir. ${free}`
    : `Bu tam çalışma için aktif öğrenci aboneliği gerekli. Yeni abonelikler henüz satışa açılmadı. ${free}`;
}
