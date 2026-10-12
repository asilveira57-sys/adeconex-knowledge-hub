import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'

export interface AppEmailProps {
  subject?: string
  heading?: string
  intro?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  closing?: string
}

/** Layout único da Adeconex — os textos chegam prontos do admin. */
export const AppEmail = ({ subject, heading, intro, body, ctaLabel, ctaUrl, closing }: AppEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{intro || subject || 'Adeconex'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>ADECONEX</Text>
        </Section>
        <Section style={content}>
          {heading ? <Heading style={h1}>{heading}</Heading> : null}
          {intro ? <Text style={text}>{intro}</Text> : null}
          {(body || '').split('\n').map((line, i) => (
            <Text key={i} style={line.trim() ? text : spacer}>{line || ' '}</Text>
          ))}
          {ctaLabel && ctaUrl ? (
            <Button href={ctaUrl} style={button}>{ctaLabel}</Button>
          ) : null}
          {closing ? <Text style={signature}>{closing}</Text> : null}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Adeconex · R. Silva Xavier, 46 – Cristóvão Colombo, Vila Velha – ES · (27) 3318-6565 · WhatsApp (27) 99273-3033 · vendas@adeconex.com.br
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' as const }
const brandBar = { backgroundColor: '#e63946', padding: '14px 28px' }
const brand = { color: '#ffffff', fontSize: '16px', fontWeight: 700, letterSpacing: '3px', margin: 0 }
const content = { padding: '28px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 8px' }
const spacer = { fontSize: '8px', margin: 0, lineHeight: '8px' }
const button = { backgroundColor: '#e63946', color: '#ffffff', borderRadius: '6px', padding: '12px 22px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '16px' }
const signature = { fontSize: '14px', color: '#6b7280', marginTop: '24px' }
const hr = { borderColor: '#e5e7eb', margin: 0 }
const footer = { fontSize: '12px', color: '#9ca3af', padding: '16px 28px', margin: 0, lineHeight: '1.5' }
