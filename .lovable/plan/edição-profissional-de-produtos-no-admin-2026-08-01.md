# Edição profissional de produtos no Admin

Hoje `/admin/produtos/$id` é apenas uma tela de **pré-visualização**: mostra dados, edita dimensões e kits, e nada mais. Não existe edição de conteúdo, estoque, status, SEO, "Compre Junto" nem selos (não há hoje nenhuma coluna de selo no banco).

O objetivo é transformar essa página num editor completo de produto, em abas.

## Nova estrutura da página do produto (abas)

```text
[ Visão geral ] [ Conteúdo/CMS ] [ Preço & Estoque ] [ Mídia ] [ SEO ] [ Kits ] [ Compre Junto ] [ Selos ]
```

Barra fixa no topo com: nome do produto, status atual, botões **Salvar**, **Publicar/Ocultar**, **Duplicar**, **Excluir**, e link "Ver na loja".

### 1. Visão geral
Nome, slug (com aviso de que mudar slug gera redirect 301 automático), SKU, EAN, modelo, referência, marca, categorias (principal + secundárias), família, material, aplicação, mercado, descrição curta.

### 2. Conteúdo / CMS
Editor rico (TipTap) para descrição comercial e descrição técnica, com:
- Barra de formatação: títulos H2/H3, negrito, itálico, listas, tabelas, links, imagem, citação.
- Alternância **Visual ↔ HTML** (edição direta do código para o conteúdo legado importado).
- Botão "Reprocessar com IA" reaproveitando o enriquecimento já existente.
- FAQs: adicionar, editar, reordenar, marcar como revisada, excluir.

### 3. Preço & Estoque
Preço, preço promocional com janela de datas, preço de custo, estoque, estoque mínimo, status de disponibilidade, disponível sim/não, dimensões e peso (card atual reaproveitado), venda por kit.
Ação rápida de "ajuste de estoque" (definir / somar / subtrair) direto na listagem também.

### 4. Mídia
Grade de imagens com reordenação, definir imagem principal, editar alt text/legenda, upload para o bucket `catalog-media` e exclusão. Vídeos (YouTube/Vimeo/MP4) com título e posição.

### 5. SEO avançado
- Título SEO, meta description, palavras-chave, URL canônica, indexável sim/não.
- Contadores de caracteres com limites recomendados (60 / 160) e barra de saúde SEO (tem H1? descrição mínima? imagem com alt? slug limpo?).
- Pré-visualização de como aparece no Google e no compartilhamento social.
- Gerenciar redirects 301 do produto (URL antiga → nova).
- JSON-LD já gerado na página pública passa a refletir esses campos.

### 6. Kits
Card já existente, movido para a aba.

### 7. Compre Junto
Gestão das ofertas de bundle do produto (a lógica de cálculo já existe, falta a interface no admin):
listar ofertas, criar/editar (nome, tipo de desconto, valor, vigência, ativo, ordem), montar os itens (produto, variação ou kit, quantidade, item âncora, alvo do complemento), ativar/desativar, duplicar, excluir. Mostra métricas já gravadas: impressões, adições ao carrinho, conversões, receita e desconto concedido.

### 8. Selos
Não existe nada disso hoje — será criado.
Selos previstos: **Mais vendido**, **Campeão de vendas**, **Últimas unidades**, **Frete grátis**, **Novidade**, **Promoção**, e selos livres criados pelo admin (texto + cor).

Dois modos combináveis por produto:
- **Automático**, por regra: "Últimas unidades" quando estoque ≤ X; "Mais vendido" pelos N produtos com mais vendas nos últimos 30 dias; "Novidade" nos primeiros N dias após publicação; "Promoção" quando há preço promocional vigente.
- **Manual**, fixando ou removendo um selo específico no produto, com vigência opcional.

Exibição: cantos do card no catálogo/carrossel e faixa na página do produto, usando os tokens de cor do design system.

## Ações de ciclo de vida
Na página do produto e em lote na listagem: **publicar, ocultar, marcar como descontinuado, ativar/inativar disponibilidade, duplicar, excluir**.
Exclusão é lógica por padrão (status `discontinued` + fora do sitemap e do catálogo); exclusão definitiva só quando o produto nunca foi vendido, com confirmação digitando o nome.

## Detalhes técnicos

- **Banco (migração):** tabela `product_badges` (chave do selo, rótulo, cor, prioridade, ativo) e `product_badge_assignments` (produto, selo, manual/automático, vigência); tabela `badge_rules` ou colunas de configuração para os limiares automáticos. Coluna `search_vector`/nada mais é necessário. Todas com GRANT + RLS: leitura pública dos selos ativos, escrita apenas para staff (`is_staff`).
- **Server functions** novas em `src/lib/admin.functions.ts` (ou um novo `admin.product.functions.ts` para não inchar): `updateProduct`, `updateProductPricing`, `adjustStock`, `updateProductSeo`, `upsertProductFaq`/`deleteProductFaq`, `reorderProductImages`, `uploadProductImage`, `deleteProductImage`, `duplicateProduct`, `deleteProduct`, `setProductBadges`. Todas com `requireSupabaseAuth` + `assertStaff`, validação Zod espelhada no cliente.
- **Bundles admin** em `src/lib/bundles.admin.functions.ts`: CRUD de `bundle_offers` e `bundle_offer_items`.
- **Selos no catálogo:** `src/lib/catalog.functions.ts` passa a retornar os selos resolvidos; `product-carousel.tsx`, `/catalogo` e `/produto/$slug` renderizam.
- **Editor rico:** adicionar `@tiptap/react` + extensões básicas (link, tabela, imagem), carregado só no admin.
- **Cache:** invalidar `["admin","product-preview",id]` e as queries públicas do catálogo após cada salvamento.

## Entrega sugerida em etapas
1. Migração (selos) + server functions de escrita e ações de ciclo de vida.
2. Página em abas com Visão geral, Preço & Estoque, SEO (inclui salvar/publicar/excluir).
3. Conteúdo/CMS com editor rico e FAQs + Mídia.
4. Compre Junto no admin.
5. Selos: configuração, atribuição e exibição na vitrine.
