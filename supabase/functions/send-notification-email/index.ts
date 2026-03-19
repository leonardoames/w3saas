import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { renderWelcomeEmail } from '../_shared/email-templates/welcome.tsx'
import { renderAccessBlockedEmail } from '../_shared/email-templates/access-blocked.tsx'
import { renderAccessExpiringEmail } from '../_shared/email-templates/access-expiring.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'w3saas'
const SENDER_DOMAIN = 'notify.app.leonardoames.com.br'
const FROM_DOMAIN = 'notify.app.leonardoames.com.br'
const SITE_URL = 'https://app.leonardoames.com.br'

const EMAIL_SUBJECTS: Record<string, string> = {
  welcome: `Bem-vindo(a) à ${SITE_NAME}! 🎉`,
  access_blocked: `Seu acesso à ${SITE_NAME} foi suspenso`,
  access_expiring: `Seu acesso à ${SITE_NAME} está expirando`,
}

type RenderFn = (props: any) => { html: string; text: string }

const RENDERERS: Record<string, RenderFn> = {
  welcome: renderWelcomeEmail,
  access_blocked: renderAccessBlockedEmail,
  access_expiring: renderAccessExpiringEmail,
}

interface NotificationRequest {
  type: string
  user_id?: string
  email?: string
  data?: Record<string, any>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey = Deno.env.get('LOVABLE_API_KEY')

    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured')

    const authHeader = req.headers.get('Authorization')
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`

    if (!isServiceRole) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader || '' } },
      })
      const token = (authHeader || '').replace('Bearer ', '')
      const { data: { user }, error } = await anonClient.auth.getUser(token)
      if (error || !user) throw new Error('Not authenticated')

      const adminClient = createClient(supabaseUrl, serviceRoleKey)
      const { data: isAdmin } = await adminClient.rpc('is_admin_user', { check_user_id: user.id })
      if (!isAdmin) throw new Error('Not authorized')
    }

    const { type, user_id, email: directEmail, data: extraData }: NotificationRequest = await req.json()

    const renderer = RENDERERS[type]
    if (!renderer) throw new Error(`Unknown notification type: ${type}`)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    let recipientEmail = directEmail
    let userName: string | null = null

    if (user_id) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', user_id)
        .maybeSingle()

      if (profile) {
        recipientEmail = recipientEmail || profile.email
        userName = profile.full_name
      }
    }

    if (!recipientEmail) throw new Error('No email address available')

    const { html, text } = renderer({
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      userName: userName || undefined,
      ...extraData,
    })

    const sendResponse = await fetch('https://api.lovable.dev/v1/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: recipientEmail,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: EMAIL_SUBJECTS[type] || 'Notificação',
        html,
        text,
        purpose: 'transactional',
      }),
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('Email API error:', errorText)
      throw new Error(`Failed to send email: ${sendResponse.status}`)
    }

    const result = await sendResponse.json()
    console.log('Notification email sent', { type, email: recipientEmail, message_id: result.message_id })

    return new Response(
      JSON.stringify({ success: true, message_id: result.message_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in send-notification-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
