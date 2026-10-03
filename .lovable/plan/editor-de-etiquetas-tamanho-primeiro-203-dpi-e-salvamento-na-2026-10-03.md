# Editor de etiquetas: tamanho primeiro, 203 DPI e salvamento na conta

## O que será alterado

1. **Escolha da etiqueta no início**
   - Colocar a seleção da etiqueta-base logo abaixo do título, antes das ferramentas e da área de criação.
   - Mostrar claramente nome, medidas e formato da opção selecionada.
   - Remover a seleção duplicada que hoje fica no final da coluna de pedido.
   - Enquanto nenhuma etiqueta for escolhida, orientar o cliente a começar por essa escolha.

2. **PDF fixo em 203 DPI**
   - Remover as opções 300, 600 e 1200 DPI.
   - Gerar códigos, QR Codes e imagens em 203 DPI, preservando as medidas reais em milímetros.
   - Exibir apenas a informação de que o arquivo é preparado para impressoras térmicas de 203 DPI.

3. **Salvamento vinculado à conta**
   - Manter o editor protegido por login.
   - Salvar e atualizar cada arte usando o cliente autenticado, sem permitir acesso às artes de outra conta.
   - Após salvar, confirmar que a arte aparece em “Minha conta > Minhas artes salvas” e pode ser reaberta no editor.
   - Preservar o rascunho automático local como proteção contra perda antes do salvamento definitivo.

## Validação

- Testar a escolha da etiqueta no topo e confirmar que medidas/formato atualizam a área de criação.
- Baixar um PDF e verificar que a rasterização usa 203 DPI sem alterar o tamanho físico.
- Salvar uma arte com sessão autenticada, abrir a área da conta e reabrir a mesma arte.
