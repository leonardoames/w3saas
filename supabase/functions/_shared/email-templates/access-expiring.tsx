interface AccessExpiringEmailProps {
  siteName: string
  siteUrl: string
  userName?: string
  daysRemaining: number
  expiresAt: string
}

export function renderAccessExpiringEmail({ siteName, siteUrl, userName, daysRemaining, expiresAt }: AccessExpiringEmailProps) {
  const greeting = userName ? `Olá, ${userName}.` : 'Olá.'
  const plural = daysRemaining > 1 ? 's' : ''

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/></head>
<body style="background:#fff;font-family:'Montserrat',Arial,sans-serif;padding:20px 25px">
<h1 style="font-size:22px;font-weight:bold;color:#0a0a0a;margin:0 0 20px">⏳ Acesso expirando</h1>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">${greeting}</p>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">Seu acesso à plataforma <strong>${siteName}</strong> expira em <strong>${daysRemaining} dia${plural}</strong> (${expiresAt}).</p>
<p style="font-size:14px;color:#92400E;line-height:1.5;margin:0 0 15px;padding:12px 16px;background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:4px">Após a data de expiração, você não conseguirá mais acessar a plataforma e seus dados.</p>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">Para renovar seu acesso e continuar utilizando todas as funcionalidades, entre em contato com nossa equipe.</p>
<a href="${siteUrl}" style="display:inline-block;background:#F97316;color:#fff;font-size:14px;border-radius:12px;padding:12px 24px;text-decoration:none;font-weight:600">Renovar acesso</a>
<p style="font-size:12px;color:#999;margin:30px 0 0">Este é um email automático. Se você já renovou seu acesso, pode ignorar este email.</p>
</body></html>`

  const text = `${greeting}\n\nSeu acesso à ${siteName} expira em ${daysRemaining} dia${plural} (${expiresAt}).\n\nRenove: ${siteUrl}`
  return { html, text }
}
