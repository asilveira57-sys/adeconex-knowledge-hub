<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Downloads central: table public.downloads (public read via server fn; staff CRUD via RLS); new uploaded images use public catalog-media paths under downloads/, while audited legacy printer photos remain in public/downloads/img. Why: preserve stable legacy assets while enabling managed uploads and SEO-friendly SSR pages.
- Custom label catalog: types in public.custom_label_types (sizes jsonb, blog/SEO fields) with ready-made art in public.label_templates; no die-cut (faca) registry. Why: admin manages personalization options and per-type SEO pages without linking products to dies.
- Product customization represents square labels as rect with equal dimensions and exposes a synchronized square selector in the admin. Why: preserve compatibility with existing rendering and saved designs without introducing another storage shape.
- First-party visit tracking: anonymous events in public.site_events written only by /api/public/track (service role, validated, bot-filtered) and aggregated by staff-only getSalesDashboard. Why: the admin needs visit/funnel numbers without reading GA4 back.
- Product hard deletion uses delete_selected_products with per-product transactions; database triggers retain import-block identities and reject reinsertion even by privileged importers. Why: individual and bulk deletions must prevent future reimports while preserving sold products.
- App emails: every automatic email is sent through sendAppEmail (src/lib/app-emails.server.ts), which merges admin-edited texts from email_template_settings with defaults in app-emails.shared.ts and logs to app_email_log. Why: staff edit copy without code, and email failures never break orders or forms.
- Every tool page (/ferramentas/*, via the ferramentas layout) and every blog post ends with ProductShowcaseGrid (getToolShowcase: paid-order best sellers, category fallback). Why: tools and content act as product CTAs.
- Catalog category counts fetch product-category relationships through an embedded products query, never an IN filter containing the entire catalog's product IDs. Why: large UUID lists exceed request URL limits and prevent the catalog from loading.
- Catalog brand/application filters use URL slugs, published taxonomy via a session-free public client, and direct product foreign-key predicates before pagination. Why: combined filters persist in shared links and apply to the entire catalog without large product-ID lists.
- Institutional/legal pages: defaults live in src/content/institutional-pages.ts; admin edits are stored as full overrides in public.institutional_pages (public read, staff write) and merged by getInstitutionalPage in each route loader. Why: staff edit copy without code while defaults remain a safe fallback.
- Site banners: public.site_banners (placements home_hero, home_secondary, page_top by page_path; schedule + active) read via getActiveBanners; home loader SSRs them and falls back to bundled images when none are live; page_top renders in __root. Why: staff swap banners without code while keeping LCP/SEO safe.
