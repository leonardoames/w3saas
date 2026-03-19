interface WelcomeEmailProps {
  siteName: string
  siteUrl: string
  userName?: string
}

export function renderWelcomeEmail({ siteName, siteUrl, userName }: WelcomeEmailProps) {
  const greeting = userName ? `Olá, ${userName}! 👋` : 'Bem-vindo(a)! 👋'
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/></head>
<body style="background:#fff;font-family:'Montserrat',Arial,sans-serif;padding:20px 25px">
<h1 style="font-size:22px;font-weight:bold;color:#0a0a0a;margin:0 0 20px">${greeting}</h1>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">Estamos felizes por ter você aqui! Sua conta na <strong>${siteName}</strong> está pronta para uso.</p>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">Aqui estão algumas coisas que você pode fazer agora:</p>
<p style="font-size:14px;color:#444;line-height:1.5;margin:0 0 8px;padding-left:8px">📊 Acompanhar seus resultados diários</p>
<p style="font-size:14px;color:#444;line-height:1.5;margin:0 0 8px;padding-left:8px">💡 Organizar suas ideias de criativos</p>
<p style="font-size:14px;color:#444;line-height:1.5;margin:0 0 8px;padding-left:8px">📈 Analisar métricas por canal</p>
<p style="font-size:14px;color:#444;line-height:1.5;margin:0 0 8px;padding-left:8px">🤖 Usar a IA para otimizar sua operação</p>
<a href="${siteUrl}" style="display:inline-block;background:#F97316;color:#fff;font-size:14px;border-radius:12px;padding:12px 24px;text-decoration:none;font-weight:600;margin-top:10px">Acessar a plataforma</a>
<p style="font-size:12px;color:#999;margin:30px 0 0">Se precisar de ajuda, estamos aqui para te apoiar. Bons resultados! 🚀</p>
</body></html>`

  const text = `${greeting}\n\nEstamos felizes por ter você aqui! Sua conta na ${siteName} está pronta para uso.\n\nAcesse: ${siteUrl}`
  return { html, text }
}
