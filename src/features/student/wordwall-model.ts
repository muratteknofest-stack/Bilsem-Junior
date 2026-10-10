import catalog from '../../content/wordwall-catalog.json';

export interface WordwallActivity {
  id: string; title: string; grade: number; category: string; template: string;
  resourceUrl: string; embedUrl: string; thumbnailUrl: string;
}
const safeUrl = (value: string, host: string, path: RegExp) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.host === host && !url.username && !url.password && !url.hash && path.test(url.pathname);
  } catch { return false; }
};
export function isSafeWordwallActivity(activity: WordwallActivity): boolean {
  return /^\d+$/.test(activity.id) && [1, 2, 3, 4].includes(activity.grade) && Boolean(activity.title.trim())
    && safeUrl(activity.resourceUrl, 'wordwall.net', new RegExp(`^/(?:tr/)?resource/${activity.id}(?:/|$)`))
    && safeUrl(activity.embedUrl, 'wordwall.net', /^\/(?:tr\/)?embed\/[a-f0-9]{32}$/)
    && safeUrl(activity.thumbnailUrl, 'screens.cdn.wordwall.net', /^\/\d+\/[a-f0-9]{32}(?:_\d+[a-z]?)?$/);
}
export const WORDWALL_AUTHOR = catalog.author;
export const WORDWALL_ACTIVITIES: readonly WordwallActivity[] = catalog.activities.filter(isSafeWordwallActivity);
export const wordwallSearchText = (value: string) => value.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function filterWordwallActivities(activities: readonly WordwallActivity[], grade: number | 'all', category: string, query: string) {
  const terms = wordwallSearchText(query).trim().split(/\s+/).filter(Boolean);
  return activities.filter(item => (grade === 'all' || item.grade === grade) && (!category || item.category === category)
    && terms.every(term => wordwallSearchText(`${item.title} ${item.category} ${item.template}`).includes(term)));
}
export const wordwallInitialGrade = (grade?: number) => [1, 2, 3, 4].includes(grade ?? 0) ? grade! : 4;
