# Admin: Etiqueta personalizada (tipos, facas, artes prontas e post de blog)

## O que será criado

1. **Novo menu "Etiqueta personalizada" no admin** (ao lado de "Artes", que continua só com as artes dos pedidos dos clientes).
   - Lista de tipos de etiqueta: Preço, Corretor de imóveis, Patrimônio, Cartão de visita, Doce, Quadrada, Redonda, Identificação etc.
   - Cada tipo tem: nome, descrição curta, uso, foto de capa, ativo/oculto e ordem.

2. **Cadastro de facas**
   - Cada faca tem: código, formato (retangular, arredondada, redonda, oval), largura, altura, raio do canto, colunas, linhas, espaçamentos e margem.
   - Cada tipo de etiqueta fica **sempre vinculado a pelo menos uma faca** (as medidas possíveis). Sem faca, não salva.
   - A faca pode ser ligada ao produto em branco do catálogo, para virar pedido com preço.

3. **Artes prontas por tipo**
   - Botão "Criar arte pronta" abre o mesmo editor que o cliente usa, já na medida da faca escolhida.
   - O cliente vê essas artes como modelos para começar no editor.

4. **Importar o que já existe**
   - Os 6 modelos atuais do editor (preço 40×25, corretor 90×45, identificação etc.) e os produtos já marcados como "permite personalizar" entram como tipos, facas e artes prontas. Assim nada se perde.

5. **Post de blog para cada tipo**
   - Aba "Blog" no tipo: título, resumo, para que serve, dicas de configuração, imagens, título e descrição para o Google.
   - Página pública em `/etiquetas/personalizada/<tipo>` com o post, as medidas disponíveis, as artes prontas e o botão "Personalizar esta etiqueta".
   - Entra no sitemap e na listagem do blog. Nesta primeira etapa, o texto pode ser gerado como rascunho e você revisa antes de publicar.

6. **Página pública** `/etiquetas/personalizada` passa a mostrar os tipos cadastrados no admin.

## Fora desta primeira etapa
- Mudar as artes dos pedidos (menu Artes continua como está).
- Preço diferente por tipo (segue a tabela atual por quantidade).

## Detalhes técnicos
- Tabelas novas: `label_dies` (facas), `custom_label_types` (com campos de blog/SEO), `custom_label_type_dies` (vínculo N:N, validação de ≥1 faca no servidor), `label_templates` (layout jsonb, die_id, type_id, thumbnail). GRANTs + RLS: leitura pública só de publicados; escrita por `is_staff`.
- Server fns em `src/lib/label-catalog.functions.ts`; seção de permissão `etiquetas` em staff_permissions/nav do admin.
- Rotas: `_authenticated.admin.etiquetas.index.tsx`, `_authenticated.admin.etiquetas.$id.tsx`, `etiquetas.personalizada.$tipo.tsx` (head com SEO, JSON-LD Article + BreadcrumbList).
- Editor recebe `?template=ID` e `?die=ID`; LABEL_TEMPLATES estáticos viram fallback.
- Imagens no bucket catalog-media em `label-types/`.
- Importação inicial via SQL dos templates atuais e produtos `is_customizable`.
