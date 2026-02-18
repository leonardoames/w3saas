import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// LGPD compliance webhooks for Nuvemshop
// These endpoints handle store redact, customers redact, and customers data request
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop() || ''
    
    // Parse the webhook type from query param or body
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    
    // Determine webhook type from the URL search params
    const webhookType = url.searchParams.get('type') || 'unknown'

    console.log(`Nuvemshop LGPD webhook received - type: ${webhookType}`, JSON.stringify(body))

    switch (webhookType) {
      case 'store_redact':
        // Store data has been deleted from Nuvemshop
        // We acknowledge the request - no user data to delete as we only store aggregated metrics
        console.log('Store redact webhook processed')
        break

      case 'customers_redact':
        // Customer data deletion request
        // We don't store individual customer data, only aggregated metrics
        console.log('Customers redact webhook processed')
        break

      case 'customers_data_request':
        // Customer data request
        // We don't store individual customer data
        console.log('Customers data request webhook processed')
        break

      default:
        console.log(`Unknown webhook type: ${webhookType}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Nuvemshop webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
