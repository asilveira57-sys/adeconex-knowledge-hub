# Trazer o portal de downloads antigo para o site Adeconex

## O que você precisa fazer
1. No GitHub, deixe o repositório do blog antigo público (pode voltar a privado depois).
2. Mande o link do repositório aqui no chat.

## O que eu faço depois
1. Leio o projeto antigo sem executar nada dele: páginas, lista de drivers, manuais e arquivos guardados.
2. Mostro um resumo do que encontrei: quantos drivers, quais fabricantes e modelos, e quais arquivos existem.
3. Copio os arquivos (drivers, manuais, PDFs) para o armazenamento do site.
4. Troco a página "Downloads" (hoje é só um aviso de "em construção") por uma central de verdade:
   - filtro por fabricante, modelo e tipo (driver, manual, datasheet, ZPL);
   - busca por nome do modelo;
   - página própria para cada impressora, pensada para aparecer no Google;
   - botão de download com contagem no Google Analytics.
5. No admin, crio uma tela para cadastrar, editar e remover downloads.
6. Mantenho os endereços antigos do blog: se ele tinha links conhecidos, redireciono para as páginas novas e não perco posição no Google.
7. Incluo as páginas novas no mapa do site.

## Detalhes técnicos
- Clone somente leitura em /tmp e inspeção sem executar scripts do repositório.
- Tabela `downloads` (fabricante, modelo, categoria, versão, sistema operacional, arquivo, tamanho, slug, publicado), com GRANT e RLS: leitura pública só do que está publicado, escrita só pela equipe.
- Bucket público `downloads` para os arquivos; arquivos grandes (acima de ~50 MB) ficam como link externo.
- Rotas `/downloads` e `/downloads/$slug` com head/JSON-LD e entrada no sitemap; redirects em legacy-redirects.ts.
- Seção "Downloads" no admin, respeitando as permissões de colaboradores.
