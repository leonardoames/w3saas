import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { renderAccessExpiringEmail } from '../_shared/email-templates/access-expiring.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'w3saas'
const SENDER_DOMAIN = 'notify.app.leonardoames.com.br'
const FROM_DOMAIN = 'notify.app.leonardoames.com.br'
const SITE_URL = 'https://app.leonardoames.com.br'

const WARNING_DAYS = [7, 3, 1]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey = Deno.env.get('LOVABLE_API_KEY')

    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const now = new Date()
    const results: any[] = []

    for (const days of WARNING_DAYS) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + days)

      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: expiringUsers, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, access_expires_at')
        .eq('access_status', 'active')
        .not('access_expires_at', 'is', null)
        .gte('access_expires_at', startOfDay.toISOString())
        .lte('access_expires_at', endOfDay.toISOString())

      if (error) {
        console.error(`Error querying expiring users (${days} days):`, error)
        continue
      }

      for (const user of expiringUsers || []) {
        if (!user.email) continue

        const expiresAt = new Date(user.access_expires_at)
        const formattedDate = expiresAt.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })

        const { html, text } = renderAccessExpiringEmail({
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          userName: user.full_name || undefined,
          daysRemaining: days,
          expiresAt: formattedDate,
        })

        try {
          const sendResponse = await fetch('https://api.lovable.dev/v1/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              to: user.email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: `Seu acesso à ${SITE_NAME} expira em ${days} dia${days > 1 ? 's' : ''}`,
              html,
              text,
              purpose: 'transactional',
            }),
          })

          if (sendResponse.ok) {
            results.push({ email: user.email, days, status: 'sent' })
          } else {
            results.push({ email: user.email, days, status: 'error', error: await sendResponse.text() })
          }
        } catch (err: any) {
          results.push({ email: user.email, days, status: 'error', error: err.message })
        }
      }
    }

    console.log('Expiring access check complete', {
      sent: results.filter(r => r.status === 'sent').length,
      errors: results.filter(r => r.status === 'error').length,
    })

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in check-expiring-access:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
