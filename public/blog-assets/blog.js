document.documentElement.classList.add('js');
const normalize = value => value.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const input = document.querySelector('#blog-search');
const cards = [...document.querySelectorAll('[data-article]')];
const filters = [...document.querySelectorAll('[data-filter]')];
if (input && filters.length) {
  const params = new URLSearchParams(location.search);
  let category = params.get('category') || '';
  if (!filters.some(button => button.dataset.filter === category)) category = '';
  input.value = params.get('q') || '';
  const apply = (updateUrl = true) => {
    const query = normalize(input.value.trim());
    let count = 0;
    for (const card of cards) {
      const matches = (!category || card.dataset.category === category) && (!query || normalize(card.dataset.search || '').includes(query));
      card.hidden = !matches;
      if (matches) count++;
    }
    for (const filter of filters) {
      const active = filter.dataset.filter === category;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    }
    document.querySelector('#result-count').textContent = String(count);
    document.querySelector('#result-context').textContent = `${category || 'Tüm keşif alanları'}${input.value.trim() ? ` · “${input.value.trim()}”` : ''}`;
    document.querySelector('#empty-state').hidden = count !== 0;
    if (updateUrl) {
      const url = new URL(location.href);
      for (const key of ['q', 'category']) url.searchParams.delete(key);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim());
      if (category) url.searchParams.set('category', category);
      history.replaceState(null, '', url);
    }
  };
  input.addEventListener('input', () => apply());
  input.closest('form').addEventListener('submit', event => { event.preventDefault(); apply(); });
  filters.forEach(filter => filter.addEventListener('click', () => { category = filter.dataset.filter || ''; apply(); }));
  document.querySelector('#clear-search').addEventListener('click', () => { category = ''; input.value = ''; apply(); input.focus(); });
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(location.search);
    input.value = params.get('q') || '';
    category = params.get('category') || '';
    if (!filters.some(f => f.dataset.filter === category)) category = '';
    apply(false);
  });
  apply(false);
}
const share = document.querySelector('[data-share]');
if (share) share.addEventListener('click', async () => {
  const status = document.querySelector('#share-status');
  try {
    await navigator.clipboard.writeText(new URL(location.pathname, location.origin).href);
    status.textContent = 'Yazı bağlantısı kopyalandı.';
    share.textContent = 'Bağlantı kopyalandı ✓';
  } catch {
    status.textContent = 'Otomatik kopyalama kullanılamıyor. Tarayıcının adres çubuğundan yazı bağlantısını kopyalayabilirsiniz.';
    status.classList.remove('sr-only');
  }
});
