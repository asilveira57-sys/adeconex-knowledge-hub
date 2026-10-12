import type { ComponentType } from 'react'
import { AppEmail } from './app-email'
import { APP_EMAILS, interpolate } from '../app-emails.shared'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

const PREVIEW_VARS = {
  nome: 'Maria', numero_pedido: 'ADC-2026-000010', total: 'R$ 164,95', link: 'https://www.adeconex.com.br',
  transportadora: 'Correios SEDEX', rastreio: 'AB123456789BR', arquivo: 'Driver Zebra ZD220',
  empresa: 'Loja Exemplo', email: 'maria@exemplo.com', telefone: '(27) 99999-0000', segmento: 'Varejo', mensagem: 'Gostaria de um orçamento.',
}

/** Todos os e-mails usam o mesmo layout; os textos vêm prontos (já com variáveis aplicadas). */
export const TEMPLATES: Record<string, TemplateEntry> = Object.fromEntries(
  APP_EMAILS.map((def) => {
    const d = def.defaults
    const entry: TemplateEntry = {
      component: AppEmail,
      subject: (data) => (data.subject as string) || interpolate(d.subject, PREVIEW_VARS),
      displayName: def.name,
      previewData: {
        subject: interpolate(d.subject, PREVIEW_VARS),
        heading: interpolate(d.heading, PREVIEW_VARS),
        intro: interpolate(d.intro, PREVIEW_VARS),
        body: interpolate(d.body, PREVIEW_VARS),
        ctaLabel: d.cta_label,
        ctaUrl: 'https://www.adeconex.com.br',
        closing: d.closing,
      },
      ...(def.internal ? { to: 'vendas@adeconex.com.br' } : {}),
    }
    return [def.key, entry]
  }),
)
