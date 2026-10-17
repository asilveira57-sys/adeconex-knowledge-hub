import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'

export interface RatingItem {
  name: string
  /** 5 links: índice 0 = 1 estrela … índice 4 = 5 estrelas */
  links: string[]
}

export interface AppEmailProps {
  subject?: string
  heading?: string
  intro?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  closing?: string
  ratingItems?: RatingItem[]
}

/** Layout único da Adeconex — os textos chegam prontos do admin. */
export const AppEmail = ({ subject, heading, intro, body, ctaLabel, ctaUrl, closing, ratingItems }: AppEmailProps) => (
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
          {ratingItems?.length ? (
            <Section style={ratingBox}>
              {ratingItems.map((item, i) => (
                <Section key={i} style={ratingRow}>
                  <Text style={ratingName}>{item.name}</Text>
                  <Text style={starsLine}>
                    {item.links.slice(0, 5).map((href, s) => (
                      <Link key={s} href={href} style={star} title={`${s + 1} estrela${s ? 's' : ''}`}>★</Link>
                    ))}
                  </Text>
                </Section>
              ))}
            </Section>
          ) : null}
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
const ratingBox = { margin: '16px 0 4px' }
const ratingRow = { borderTop: '1px solid #f1f1f1', padding: '10px 0' }
const ratingName = { fontSize: '14px', color: '#111827', fontWeight: 600, margin: '0 0 4px' }
const starsLine = { margin: 0, fontSize: '30px', lineHeight: '34px' }
const star = { color: '#f5a524', textDecoration: 'none', padding: '0 3px' }
const button = { backgroundColor: '#e63946', color: '#ffffff', borderRadius: '6px', padding: '12px 22px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '16px' }
const signature = { fontSize: '14px', color: '#6b7280', marginTop: '24px' }
const hr = { borderColor: '#e5e7eb', margin: 0 }
const footer = { fontSize: '12px', color: '#9ca3af', padding: '16px 28px', margin: 0, lineHeight: '1.5' }
