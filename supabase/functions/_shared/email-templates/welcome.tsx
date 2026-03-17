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

interface WelcomeEmailProps {
  siteName: string
  siteUrl: string
  userName?: string
}

export const WelcomeEmail = ({
  siteName,
  siteUrl,
  userName,
}: WelcomeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo(a) à {siteName}! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {userName ? `Olá, ${userName}! 👋` : 'Bem-vindo(a)! 👋'}
        </Heading>
        <Text style={text}>
          Estamos felizes por ter você aqui! Sua conta na <strong>{siteName}</strong> está pronta para uso.
        </Text>
        <Text style={text}>
          Aqui estão algumas coisas que você pode fazer agora:
        </Text>
        <Text style={listItem}>📊 Acompanhar seus resultados diários</Text>
        <Text style={listItem}>💡 Organizar suas ideias de criativos</Text>
        <Text style={listItem}>📈 Analisar métricas por canal</Text>
        <Text style={listItem}>🤖 Usar a IA para otimizar sua operação</Text>
        <Button style={button} href={siteUrl}>
          Acessar a plataforma
        </Button>
        <Text style={footer}>
          Se precisar de ajuda, estamos aqui para te apoiar. Bons resultados! 🚀
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

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
const listItem = {
  fontSize: '14px',
  color: '#444444',
  lineHeight: '1.5',
  margin: '0 0 8px',
  paddingLeft: '8px',
}
const button = {
  backgroundColor: '#F97316',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: '600' as const,
  marginTop: '10px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
