INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'launch_notice',
  jsonb_build_object(
    'enabled', true,
    'title', 'Estamos em fase de implementação',
    'message', 'Bem-vindo à nova plataforma Adeconex! Este sistema está em fase final de implementação. Os valores de produtos, fretes e condições de pagamento exibidos são meramente ilustrativos e não possuem validade até o lançamento oficial. Pedidos realizados neste período não serão processados.'
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;