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

- Downloads central: table public.downloads (public read of published rows via server fn with publishable client; staff writes via browser client under RLS is_staff); printer photos served from public/downloads/img. Why: simple, SEO-friendly SSR pages and admin CRUD without extra server fns.
