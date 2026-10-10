interface StudentAuth {
  setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  signOut: (options: { scope: 'local' }) => Promise<unknown>;
}

export async function activateStudentSession(response: Response, studentId: string, auth: StudentAuth): Promise<void> {
  const parsed = await response.json().catch(() => null);
  const payload = parsed && typeof parsed === 'object' ? parsed : {};
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Öğrenci paneli açılamadı. Tekrar deneyin.');
  if (payload.studentId !== studentId || typeof payload.access_token !== 'string' || !payload.access_token ||
      typeof payload.refresh_token !== 'string' || !payload.refresh_token) {
    throw new Error('Öğrenci oturumu doğrulanamadı. Veli panelinden tekrar deneyin.');
  }
  let result: Awaited<ReturnType<StudentAuth['setSession']>>;
  try {
    result = await auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token });
  } catch {
    throw new Error('Öğrenci oturumu açılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
  }
  if (result.error) throw new Error('Öğrenci oturumu açılamadı. Tekrar deneyin.');
  if (result.data.user?.id !== studentId) {
    await auth.signOut({ scope: 'local' }).catch(() => undefined);
    throw new Error('Öğrenci hesabı doğrulanamadı. Yeniden giriş yapın.');
  }
}
