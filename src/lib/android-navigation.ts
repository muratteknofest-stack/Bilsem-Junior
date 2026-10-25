/** The native Back button first belongs to the visible screen, never browser history. */
export const ANDROID_BACK_EVENT = 'bilsem:android-back';

export function claimAndroidBack(target: EventTarget, handler: () => void) {
  const listener = (event: Event) => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    handler();
  };
  target.addEventListener(ANDROID_BACK_EVENT, listener);
  return () => target.removeEventListener(ANDROID_BACK_EVENT, listener);
}

export function dispatchAndroidBack(target: EventTarget) {
  return !target.dispatchEvent(new Event(ANDROID_BACK_EVENT, { cancelable: true }));
}

export function androidParentRoute(route: string, role: string): string | null {
  if (route === 'login') return 'landing';
  if (role !== 'student' || ['dashboard', 'landing'].includes(route)) return null;
  if (['student-tests', 'student-topics', 'student-plan', 'student-skills', 'mistakes', 'glossary'].includes(route)) return 'student-study';
  if (['student-challenges', 'student-progress', 'achievements', 'leaderboard'].includes(route)) return 'student-rewards';
  return 'dashboard';
}
