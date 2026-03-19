interface AccessBlockedEmailProps {
  siteName: string
  siteUrl: string
  userName?: string
  reason?: string
}

export function renderAccessBlockedEmail({ siteName, siteUrl, userName, reason }: AccessBlockedEmailProps) {
  const greeting = userName ? `Olá, ${userName}.` : 'Olá.'
  const reasonBlock = reason
    ? `<p style="font-size:14px;color:#444;line-height:1.5;margin:0 0 15px;padding:12px 16px;background:#FFF7ED;border-left:4px solid #F97316;border-radius:4px"><strong>Motivo:</strong> ${reason}</p>`
    : ''

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/></head>
<body style="background:#fff;font-family:'Montserrat',Arial,sans-serif;padding:20px 25px">
<h1 style="font-size:22px;font-weight:bold;color:#0a0a0a;margin:0 0 20px">Acesso suspenso</h1>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">${greeting}</p>
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">Informamos que o seu acesso à plataforma <strong>${siteName}</strong> foi suspenso.</p>
${reasonBlock}
<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 15px">Se você acredita que isso é um engano ou deseja reativar seu acesso, entre em contato com nossa equipe de suporte.</p>
<a href="${siteUrl}" style="display:inline-block;background:#F97316;color:#fff;font-size:14px;border-radius:12px;padding:12px 24px;text-decoration:none;font-weight:600">Falar com o suporte</a>
<p style="font-size:12px;color:#999;margin:30px 0 0">Este é um email automático. Se você não reconhece esta plataforma, pode ignorar este email.</p>
</body></html>`

  const text = `${greeting}\n\nSeu acesso à ${siteName} foi suspenso.${reason ? `\nMotivo: ${reason}` : ''}\n\nEntre em contato: ${siteUrl}`
  return { html, text }
}
