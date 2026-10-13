type Page<T> = { data: T[] | null; error: unknown };

/** Keyset pagination cannot silently truncate the bank at a provider row limit. */
export async function readQuestionPages<T extends { id: string }>(
  fetchPage: (afterId: string | null, pageSize: number) => PromiseLike<Page<T>>,
  failureMessage: string,
  pageSize = 250,
  maxRows = 50_000,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let afterId: string | null = null;
  for (;;) {
    const { data, error } = await fetchPage(afterId, pageSize);
    if (error || !Array.isArray(data)) throw new Error(failureMessage);
    if (!data.length) return rows;
    for (const row of data) {
      if (!row || typeof row.id !== 'string' || seen.has(row.id)) throw new Error(failureMessage);
      seen.add(row.id);
      rows.push(row);
    }
    if (rows.length > maxRows) throw new Error(failureMessage);
    afterId = data[data.length - 1].id;
    // Always ask for the next page, even if the provider capped this page below our request.
  }
}
