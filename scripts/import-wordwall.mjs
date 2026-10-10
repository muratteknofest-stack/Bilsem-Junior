import fs from 'node:fs/promises';

// Read only the author's public folder tree and official oEmbed metadata.
// No login, cookies, tokens or student data are used by this importer.
const authorId = 13992153;
const authorName = 'Sayisalmuhakeme';
const seenFolders = new Set();
const found = new Map();
const pending = [{ id: 0, grade: null, category: '' }];
async function readJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Wordwall returned HTTP ${response.status}: ${new URL(url).pathname}`);
  return response.json();
}
const folderUrl = id => `https://wordwall.net/myactivitiesajax/loadfolder?folderId=${id}&authorUserId=${authorId}&myActivitiesVariation=1&firstLoad=true`;
while (pending.length) {
  const batch = pending.splice(0, 4).filter(item => !seenFolders.has(item.id));
  for (const item of batch) seenFolders.add(item.id);
  const pages = await Promise.all(batch.map(async folder => ({ folder, page: await readJson(folderUrl(folder.id)) })));
  for (const { folder, page } of pages) {
    if (!Array.isArray(page.Activities) || !Array.isArray(page.Folders)) throw new Error('Unexpected public folder response');
    for (const activity of page.Activities) {
      if (activity.AuthorUserId !== authorId || !activity.IsShared || !activity.IsShareable || activity.IsInRecycleBin || activity.HasCopyrightInfringement) continue;
      if (!Number.isSafeInteger(activity.ActivityId) || !/^[a-f0-9]{32}$/.test(activity.Guid)) throw new Error('Invalid activity identity');
      found.set(activity.ActivityId, { activity, grade: folder.grade, category: folder.category });
    }
    for (const child of page.Folders) {
      if (!child.Name || child.IsInRecycleBin || seenFolders.has(child.FolderId)) continue;
      const match = child.Name.match(/^([1-4])\s*\.\s*sınıf/i);
      pending.push({ id: child.FolderId, grade: match ? Number(match[1]) : folder.grade, category: match ? '' : child.Name.trim() });
    }
    console.log(`Public folder ${folder.id}: ${page.Activities.length} activities; ${found.size} collected`);
  }
}
const categories = {
  'şekil sınıflnmdırması': 'Şekil sınıflandırma', 'şekil sınıflandırma': 'Şekil sınıflandırma',
  'şekil sınıflandırması': 'Şekil sınıflandırma', 'şekil analizi': 'Şekil analizi',
  'sayı anolojisi': 'Sayı analojisi', 'sayı analojisi': 'Sayı analojisi',
  'sayı serisi': 'Sayı serileri', 'şekil matrisi': 'Şekil matrisleri', 'kağıt katlama': 'Kâğıt katlama',
  'şekil matrisleri': 'Şekil matrisleri', 'sayı bulmacası': 'Sayı bulmacası',
  'anoloji': 'Analoji', 'analoji': 'Analoji', 'görselde benzerlik': 'Görsel benzerlik',
  'matamatiksel işlemler': 'Matematiksel işlemler', 'sözlü analoji': 'Sözlü analoji',
  'uzlamsal': 'Uzamsal ilişkiler', 'uzamsal ilişkiler': 'Uzamsal ilişkiler',
  'resim analojisi': 'Resim analojisi', 'resim sınıflandırma': 'Resim sınıflandırma',
  'farklı resimleri bulun': 'Farklı resmi bul', 'fiziksel özellikler': 'Fiziksel özellikler',
  'geometrik şekiller': 'Geometrik şekiller',
};
const activities = [];
const queue = [...found.values()];
let completed = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) {
    const { activity, grade, category } = queue.shift();
    const resourceUrl = `https://wordwall.net/tr/resource/${activity.ActivityId}`;
    const metadata = await readJson(`https://wordwall.net/api/oembed?url=${encodeURIComponent(resourceUrl)}&format=json`);
    if (!new RegExp(`^https://wordwall\\.net/teacher/${authorId}(?:/|$)`).test(metadata.author_url)) throw new Error(`Author mismatch: ${activity.ActivityId}`);
    const embedUrl = metadata.html?.match(/\bsrc=["']([^"']+)["']/)?.[1]?.replaceAll('&amp;', '&');
    if (!embedUrl || !new RegExp(`^https://wordwall\\.net/(?:tr/)?embed/${activity.Guid}(?:\\?|$)`).test(embedUrl)) throw new Error(`Embed mismatch: ${activity.ActivityId}`);
    if (typeof metadata.title !== 'string' || !metadata.title.trim() || !new RegExp(`^https://screens\\.cdn\\.wordwall\\.net/\\d+/${activity.Guid}(?:_\\d+[a-z]?)?$`).test(metadata.thumbnail_url)) throw new Error(`Invalid presentation metadata: ${activity.ActivityId}`);
    if (![1, 2, 3, 4].includes(grade)) throw new Error(`Missing grade: ${activity.ActivityId}`);
    activities.push({ id: String(activity.ActivityId), title: metadata.title.trim(), grade,
      category: categories[category.toLocaleLowerCase('tr-TR')] || category || 'Zeka alıştırmaları',
      template: activity.TemplateName === 'Quiz' ? 'Test' : activity.TemplateName,
      resourceUrl, embedUrl, thumbnailUrl: metadata.thumbnail_url });
    completed++;
    if (completed % 20 === 0) console.log(`Verified oEmbed ${completed}/${found.size}`);
  }
}));
activities.sort((a, b) => a.grade - b.grade || a.category.localeCompare(b.category, 'tr') || a.title.localeCompare(b.title, 'tr', { numeric: true }));
if (!activities.some(item => item.id === '78822332')) throw new Error('The user-provided example is missing');
const catalog = { author: { id: authorId, name: authorName, url: `https://wordwall.net/teacher/${authorId}` },
  importedAt: new Date().toISOString(), activities };
const destination = new URL('../src/content/wordwall-catalog.json', import.meta.url);
const temporary = new URL('../src/content/wordwall-catalog.json.tmp', import.meta.url);
await fs.writeFile(temporary, JSON.stringify(catalog, null, 2) + '\n');
await fs.rename(temporary, destination);
console.log(`Saved ${activities.length} verified public Wordwall activities`);
