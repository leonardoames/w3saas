/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface AccessExpiringEmailProps {
  siteName: string
  siteUrl: string
  userName?: string
  daysRemaining: number
  expiresAt: string
}

export const AccessExpiringEmail = ({
  siteName,
  siteUrl,
  userName,
  daysRemaining,
  expiresAt,
}: AccessExpiringEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso à {siteName} expira em {daysRemaining} dia{daysRemaining > 1 ? 's' : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⏳ Acesso expirando</Heading>
        <Text style={text}>
          {userName ? `Olá, ${userName}.` : 'Olá.'}
        </Text>
        <Text style={text}>
          Seu acesso à plataforma <strong>{siteName}</strong> expira em{' '}
          <strong>{daysRemaining} dia{daysRemaining > 1 ? 's' : ''}</strong> ({expiresAt}).
        </Text>
        <Text style={warningBox}>
          Após a data de expiração, você não conseguirá mais acessar a plataforma e seus dados.
        </Text>
        <Text style={text}>
          Para renovar seu acesso e continuar utilizando todas as funcionalidades, 
          entre em contato com nossa equipe.
        </Text>
        <Button style={button} href={siteUrl}>
          Renovar acesso
        </Button>
        <Text style={footer}>
          Este é um email automático. Se você já renovou seu acesso, pode ignorar este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AccessExpiringEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#666666',
  lineHeight: '1.5',
  margin: '0 0 15px',
}
const warningBox = {
  fontSize: '14px',
  color: '#92400E',
  lineHeight: '1.5',
  margin: '0 0 15px',
  padding: '12px 16px',
  backgroundColor: '#FFFBEB',
  borderLeft: '4px solid #F59E0B',
  borderRadius: '4px',
}
const button = {
  backgroundColor: '#F97316',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: '600' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
