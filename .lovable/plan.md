## Diagnóstico

Rodei o profiler do banco e li o código do admin. As telas demoram 5–10s por três motivos empilhados:

1. **Toda troca de tela do admin refaz a checagem de papel no servidor.** O `beforeLoad` do layout `_authenticated/admin` chama `getMyRoles()` (round-trip completo) antes de renderizar qualquer sub-rota. É o maior vilão: bloqueia cada clique no menu lateral.
2. **Links do menu não fazem preload.** O router está sem `defaultPreload`, então nada é buscado quando o mouse passa sobre "Produtos"/"Importação"/"Enriquecimento" — só depois do clique é que os dados começam a ser pedidos.
3. **A listagem de produtos usa `count: 'exact'`.** O Postgres precisa varrer a tabela inteira só para dizer o total (30 chamadas custaram 4 s no total nas queries mais lentas). Numa lista de 830 produtos isso ainda dói, e vai piorar rápido.

## O que vou mudar

- **Cachear a checagem de papel por sessão.** `getMyRoles()` passa a rodar uma única vez e ficar no cache do TanStack Query (`staleTime: Infinity`). O `beforeLoad` do admin só re-executa quando o usuário faz login/logout. Ganho: primeira troca de tela deixa de ter ~300–800 ms de latência fixa.
- **Ligar preload por intenção no router.** `defaultPreload: "intent"` + `defaultPreloadDelay: 50`. Passar o mouse sobre um link do menu já começa a carregar dados e código; o clique fica instantâneo se o usuário hesitar meio segundo.
- **Trocar `count: 'exact'` por `'estimated'` na listagem.** Para paginação a estimativa é mais que suficiente; se algum dia precisarmos do total exato dá para reintroduzir só num botão "ver total".
- **Prefetch da preview ao passar o mouse na linha do produto.** Assim que o cursor entra numa linha da tabela, disparo `queryClient.prefetchQuery` do `getProductPreview`. Clicar abre a página com os dados já em cache.
- **Aumentar o `staleTime` das stats do dashboard de 60 s para 5 min.** Elas mudam devagar; não precisa refetch a cada minuto.

## Detalhes técnicos

Arquivos:
- `src/router.tsx` — adicionar `defaultPreload: "intent"` e `defaultPreloadDelay: 50`.
- `src/routes/_authenticated.admin.tsx` — substituir a chamada direta a `getMyRoles()` no `beforeLoad` por `context.queryClient.ensureQueryData({ queryKey: ["admin","my-roles"], queryFn: getMyRoles, staleTime: Infinity, gcTime: Infinity })`. Manter a expulsão via `redirect` se não tiver papel `admin`/`editor`.
- `src/lib/admin.functions.ts` — em `listProducts`, trocar `{ count: "exact" }` por `{ count: "estimated" }` no `.select(...)`.
- `src/routes/_authenticated.admin.produtos.tsx` — adicionar `onMouseEnter` nas linhas da tabela chamando `qc.prefetchQuery` de um `previewOptions(id)` (mesma queryKey usada em `produtos/$id`); exportar/duplicar o helper `previewOptions` num arquivo compartilhado (`src/lib/admin.queries.ts`) para reuso.
- `src/routes/_authenticated.admin.index.tsx` — subir `staleTime` do `statsOptions` para `5 * 60_000`.

Nada de mudar UI visível, business logic, schema, RLS ou índices — os índices já foram criados na rodada anterior de otimização. É só rota, cache e forma de contar.
