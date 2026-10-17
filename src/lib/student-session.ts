interface StudentAuth {
  setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  signOut: (options: { scope: 'local' }) => Promise<unknown>;
}

export async function activateStudentSession(response: Response, studentId: string, auth: StudentAuth, isCurrent = () => true): Promise<void> {
  const parsed = await response.json().catch(() => null);
  const payload = parsed && typeof parsed === 'object' ? parsed : {};
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Öğrenci paneli açılamadı. Tekrar deneyin.');
  if (payload.studentId !== studentId || typeof payload.access_token !== 'string' || !payload.access_token ||
      typeof payload.refresh_token !== 'string' || !payload.refresh_token) {
    throw new Error('Öğrenci oturumu doğrulanamadı. Veli panelinden tekrar deneyin.');
  }
  let result: Awaited<ReturnType<StudentAuth['setSession']>>;
  if (!isCurrent()) throw new Error('Hesap geçişi iptal edildi. Yeniden deneyin.');
  try {
    result = await auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token });
  } catch {
    throw new Error('Öğrenci oturumu açılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
  }
  if (result.error) throw new Error('Öğrenci oturumu açılamadı. Tekrar deneyin.');
  if (!isCurrent() || result.data.user?.id !== studentId) {
    await auth.signOut({ scope: 'local' }).catch(() => undefined);
    throw new Error('Öğrenci hesabı doğrulanamadı. Yeniden giriş yapın.');
  }
}

export async function activateParentSession(response: Response, parentId: string, auth: StudentAuth, isCurrent = () => true): Promise<void> {
  const parsed = await response.json().catch(() => null);
  const payload = parsed && typeof parsed === 'object' ? parsed : {};
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Veli paneli açılamadı.');
  if (payload.parentId !== parentId || typeof payload.access_token !== 'string' || !payload.access_token || typeof payload.refresh_token !== 'string' || !payload.refresh_token)
    throw new Error('Veli oturumu doğrulanamadı. Veli giriş ekranını kullanın.');
  let result: Awaited<ReturnType<StudentAuth['setSession']>>;
  if (!isCurrent()) throw new Error('Hesap geçişi iptal edildi. Yeniden deneyin.');
  try { result = await auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token }); }
  catch { throw new Error('Veli oturumu açılamadı. Bağlantınızı kontrol edin.'); }
  if (result.error) throw new Error('Veli oturumu açılamadı. Tekrar deneyin.');
  if (!isCurrent() || result.data.user?.id !== parentId) {
    await auth.signOut({ scope: 'local' }).catch(() => undefined);
    throw new Error('Veli hesabı doğrulanamadı. Yeniden giriş yapın.');
  }
}
