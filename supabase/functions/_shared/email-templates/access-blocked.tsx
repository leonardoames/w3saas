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

interface AccessBlockedEmailProps {
  siteName: string
  siteUrl: string
  userName?: string
  reason?: string
}

export const AccessBlockedEmail = ({
  siteName,
  siteUrl,
  userName,
  reason,
}: AccessBlockedEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso à {siteName} foi suspenso</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Acesso suspenso</Heading>
        <Text style={text}>
          {userName ? `Olá, ${userName}.` : 'Olá.'}
        </Text>
        <Text style={text}>
          Informamos que o seu acesso à plataforma <strong>{siteName}</strong> foi suspenso.
        </Text>
        {reason && (
          <Text style={reasonBox}>
            <strong>Motivo:</strong> {reason}
          </Text>
        )}
        <Text style={text}>
          Se você acredita que isso é um engano ou deseja reativar seu acesso, 
          entre em contato com nossa equipe de suporte.
        </Text>
        <Button style={button} href={siteUrl}>
          Falar com o suporte
        </Button>
        <Text style={footer}>
          Este é um email automático. Se você não reconhece esta plataforma, pode ignorar este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AccessBlockedEmail

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
const reasonBox = {
  fontSize: '14px',
  color: '#444444',
  lineHeight: '1.5',
  margin: '0 0 15px',
  padding: '12px 16px',
  backgroundColor: '#FFF7ED',
  borderLeft: '4px solid #F97316',
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
