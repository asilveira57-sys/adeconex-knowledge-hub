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
