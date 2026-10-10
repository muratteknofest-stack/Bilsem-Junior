# ZekaPark editorial blog

## Content and design

30 original Turkish articles in `content/blog/*.md`, six categories, about 12,200 words including summaries and FAQs. Each article has an answer summary, five practical sections, three FAQs, a named organization author, a content date, source notes and three related articles. No invented personal expertise, official exam questions, medical claims or admission promises.

The blog and articles are complete static HTML emitted by `blogPlugin` during both Vite build commands. Search, Turkish character normalization, categories and copy-link are progressive enhancements. Text and article links work without JavaScript. The public landing page links to `/blog` in desktop/mobile navigation and the footer.

## Photography

Each article uses a different photo listed on Pexels. `photos.json` preserves the exact photo source page, image CDN URL and license page; every article displays attribution links. The photographed people are illustrative stock subjects, not claimed customers or BİLSEM participants. Selected photographs are existing photos from established older education/family collections; no images were generated for this blog.

Images load directly from `images.pexels.com` with responsive widths, descriptive Turkish alt text, reserved dimensions, lazy loading on cards and high priority on the lead photo. The article's subject explains any difference between a generic stock prop and the precise activity (e.g. geometric puzzle versus classic tangram). Third-party image requests are disclosed on the editorial policy page. Downloading originals from this execution environment returned HTTP 403, so there are no unverified downloaded image files or fake local assets. Photo source pages and descriptions were retrieved through search; live browser image loading has not been verified here.

## Canonical domain and indexing

Set `PUBLIC_SITE_URL` to the final public HTTPS origin if a custom domain is used. Otherwise Vercel's `VERCEL_PROJECT_PRODUCTION_URL` supplies the production origin; `APP_BASE_URL` is accepted only when it is HTTPS. Never use a branch-preview URL as the canonical domain. The production build fails if none is available. Credentials or path/query fragments are rejected in the canonical origin.

Production HTML includes unique titles/descriptions, canonical URLs, Open Graph/Twitter photo cards, `BlogPosting` and `BreadcrumbList` JSON-LD, RSS and a sitemap with 33 URLs. Preview builds use `noindex,follow` and deny crawling in robots.txt. No origin locally means no canonical and no indexing. Google does not require a special AI text file or special AI schema; none is presented as a ranking shortcut. There is no hidden instruction attempting to manipulate AI answers.

`/blog`, `/blog/:slug`, `/blog/feed.xml`, `/robots.txt`, `/sitemap.xml` and blog assets are excluded from the SPA fallback. Unknown blog paths return 404 rather than the application homepage. Production Express and development Vite also serve the blog explicitly.

## Release sequence

This work is based on `fix/verified-learning-20261010`; retain its learning/API fixes and staged database rollout. A branch preview is for review. Public search visibility requires an accessible production deployment, the correct canonical domain and crawler access through Vercel/CDN protections. Preview links are intentionally not indexable.

After production rollout, verify the final `/blog`, one article, image URLs, canonical/robots and sitemap over the public domain. Submit `/sitemap.xml` in the owner's Google Search Console property; no Search Console account connection is available here and no submission is claimed. Check indexing and impressions over time. Neither ranking, indexing timing nor inclusion in AI-generated search responses is guaranteed.

The existing Vercel management connector returns HTTP 403 for this team's project. The GitHub-connected preview build can still run. Production promotion/domain management remains dependent on authorized project access; no unchanged permission retries or speculative domain changes were attempted.

## Verification

`npm run test:blog` verifies complete content, 30 unique photo sources, metadata/JSON-LD agreement, internal links, production/preview separation, routing, Turkish search, empty results and copy-link. Standard TypeScript, project tests, student tests and Vercel build apply as usual. Browser QA is unavailable under the managed Sites environment because no `control-browser` capability is installed; no substitute browser automation or unverified screenshot is claimed.
