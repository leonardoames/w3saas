import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-http-method-override, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
}

// AES-GCM encryption for phone numbers using Web Crypto API
async function encryptPhone(phone: string, key: string): Promise<string> {
  if (!phone) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(phone)

  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(key), 'PBKDF2', false, ['deriveKey']
  )
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data)

  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decryptPhone(encrypted: string, key: string): Promise<string> {
  if (!encrypted) return ''
  try {
    const encoder = new TextEncoder()
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))

    // Try AES-GCM first (new format: 16 salt + 12 iv + ciphertext)
    if (combined.length > 28) {
      try {
        const salt = combined.slice(0, 16)
        const iv = combined.slice(16, 28)
        const ciphertext = combined.slice(28)

        const keyMaterial = await crypto.subtle.importKey(
          'raw', encoder.encode(key), 'PBKDF2', false, ['deriveKey']
        )
        const cryptoKey = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        )
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext)
        return new TextDecoder().decode(decrypted)
      } catch {
        // Fall through to legacy XOR decryption
      }
    }

    // Legacy XOR fallback for existing data
    const keyBytes = encoder.encode(key)
    const decrypted = new Uint8Array(combined.length)
    for (let i = 0; i < combined.length; i++) {
      decrypted[i] = combined[i] ^ keyBytes[i % keyBytes.length]
    }
    return new TextDecoder().decode(decrypted)
  } catch {
    return ''
  }
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  return `****${digits.slice(-4)}`
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  limit: number = 100,
  windowMinutes: number = 60
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(Math.floor(now.getTime() / (windowMinutes * 60 * 1000)) * (windowMinutes * 60 * 1000))
  const resetAt = new Date(windowStart.getTime() + windowMinutes * 60 * 1000)
  
  // Use raw query via RPC or direct table access with service role
  const { data: existing, error: fetchError } = await supabase
    .from('api_rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle()
  
  if (fetchError) {
    console.error('Rate limit fetch error:', fetchError)
    // Allow on error, but log it
    return { allowed: true, remaining: limit, resetAt }
  }

  const currentCount = (existing as { request_count: number } | null)?.request_count || 0
  
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, resetAt }
  }
  
  // Increment counter
  if (existing) {
    await supabase
      .from('api_rate_limits')
      .update({ request_count: currentCount + 1 } as never)
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart.toISOString())
  } else {
    await supabase
      .from('api_rate_limits')
      .insert({
        user_id: userId,
        endpoint,
        window_start: windowStart.toISOString(),
        request_count: 1
      } as never)
  }
  
  return { allowed: true, remaining: limit - currentCount - 1, resetAt }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const encryptionKey = Deno.env.get('INFLUENCIADORES_PHONE_ENCRYPTION_KEY')!
    
    if (!encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify user token
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop() || ''

    // supabase-js `functions.invoke` uses POST; allow overriding for routing
    const methodOverride = req.headers.get('x-http-method-override')
    const method = (methodOverride || req.method).toUpperCase()

    console.log(`[influenciadores-api] ${method} ${path} by user ${user.id}`)

    // Check rate limit for all operations
    const rateLimit = await checkRateLimit(supabaseAdmin, user.id, 'influenciadores', 100, 60)
    if (!rateLimit.allowed) {
      console.warn(`[influenciadores-api] Rate limit exceeded for user ${user.id}`)
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        resetAt: rateLimit.resetAt.toISOString()
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
        }
      })
    }

    // LIST - Get all influenciadores for user
    if (method === 'GET' && (!path || path === 'influenciadores-api')) {
      const { data, error } = await supabaseAdmin
        .from('influenciadores')
        .select('*')
        .eq('user_id', user.id)
        .order('stage_order', { ascending: true })
      
      if (error) throw error
      
      // Get encrypted contacts and decrypt
      const influenciadorIds = (data || []).map((i: { id: string }) => i.id)
      
      if (influenciadorIds.length > 0) {
        const { data: contacts } = await supabaseAdmin
          .from('influenciador_contacts')
          .select('*')
          .in('influenciador_id', influenciadorIds)
        
        type ContactRow = { influenciador_id: string; telefone_encrypted: string }
        const contactMap = new Map((contacts as ContactRow[] || []).map(c => [c.influenciador_id, c]))
        
        // Merge decrypted phones
        type InfluenciadorRow = { id: string; telefone: string | null; tags: string[] | null; status: string | null }
        const result = await Promise.all((data as InfluenciadorRow[] || []).map(async inf => {
          const contact = contactMap.get(inf.id)
          return {
            ...inf,
            telefone: contact ? await decryptPhone(contact.telefone_encrypted, encryptionKey) : inf.telefone,
            tags: inf.tags || [],
            status: inf.status || 'em_aberto'
          }
        }))
        
        return new Response(JSON.stringify(result), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimit.remaining)
          }
        })
      }
      
      return new Response(JSON.stringify(data || []), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        }
      })
    }

    // CREATE - Add new influenciador
    if (method === 'POST') {
      const body = await req.json()
      const { nome, social_handle, telefone, observacoes, stage, stage_order, tags, status } = body
      
      if (!nome?.trim()) {
        return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Insert influenciador without phone
      const { data: newInf, error: insertError } = await supabaseAdmin
        .from('influenciadores')
        .insert({
          user_id: user.id,
          nome: nome.trim(),
          social_handle: social_handle?.trim() || null,
          telefone: null, // Phone stored separately encrypted
          observacoes: observacoes?.trim() || null,
          stage: stage || 'em_qualificacao',
          stage_order: stage_order ?? 0,
          tags: tags || [],
          status: status || 'em_aberto'
        } as never)
        .select()
        .single()
      
      if (insertError) throw insertError

      const newInfluenciador = newInf as { id: string; tags: string[] | null; status: string | null }

      // Store encrypted phone separately
      if (telefone) {
        const phoneDigits = telefone.replace(/\D/g, '')
        if (phoneDigits) {
          await supabaseAdmin
            .from('influenciador_contacts')
            .insert({
              influenciador_id: newInfluenciador.id,
              user_id: user.id,
              telefone_encrypted: await encryptPhone(phoneDigits, encryptionKey),
              telefone_masked: maskPhone(phoneDigits)
            } as never)
        }
      }

      console.log(`[influenciadores-api] Created influenciador ${newInfluenciador.id} for user ${user.id}`)
      
      return new Response(JSON.stringify({ 
        ...newInfluenciador, 
        telefone: telefone?.replace(/\D/g, '') || null,
        tags: newInfluenciador.tags || [],
        status: newInfluenciador.status || 'em_aberto'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // UPDATE - Update influenciador
    if (method === 'PUT' || method === 'PATCH') {
      const body = await req.json()
      const { id, nome, social_handle, telefone, observacoes, stage, stage_order, tags, status } = body
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verify ownership
      const { data: existing } = await supabaseAdmin
        .from('influenciadores')
        .select('id, user_id')
        .eq('id', id)
        .single()
      
      const existingInf = existing as { id: string; user_id: string } | null
      if (!existingInf || existingInf.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Não encontrado ou sem permissão' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Build update object
      const updateData: Record<string, unknown> = {}
      if (nome !== undefined) updateData.nome = nome.trim()
      if (social_handle !== undefined) updateData.social_handle = social_handle?.trim() || null
      if (observacoes !== undefined) updateData.observacoes = observacoes?.trim() || null
      if (stage !== undefined) updateData.stage = stage
      if (stage_order !== undefined) updateData.stage_order = stage_order
      if (tags !== undefined) updateData.tags = tags
      if (status !== undefined) updateData.status = status

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('influenciadores')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single()
      
      if (updateError) throw updateError

      const updatedInf = updated as { id: string; tags: string[] | null; status: string | null }

      // Update encrypted phone if provided
      if (telefone !== undefined) {
        const phoneDigits = telefone?.replace(/\D/g, '') || ''
        
        // Delete existing contact
        await supabaseAdmin
          .from('influenciador_contacts')
          .delete()
          .eq('influenciador_id', id)
        
        // Insert new if phone provided
        if (phoneDigits) {
          await supabaseAdmin
            .from('influenciador_contacts')
            .insert({
              influenciador_id: id,
              user_id: user.id,
              telefone_encrypted: await encryptPhone(phoneDigits, encryptionKey),
              telefone_masked: maskPhone(phoneDigits)
            } as never)
        }
      }

      console.log(`[influenciadores-api] Updated influenciador ${id} for user ${user.id}`)
      
      return new Response(JSON.stringify({
        ...updatedInf,
        telefone: telefone !== undefined ? telefone?.replace(/\D/g, '') || null : null,
        tags: updatedInf.tags || [],
        status: updatedInf.status || 'em_aberto'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE - Remove influenciador
    if (method === 'DELETE') {
      const body = await req.json()
      const { id } = body
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verify ownership
      const { data: existing } = await supabaseAdmin
        .from('influenciadores')
        .select('id, user_id')
        .eq('id', id)
        .single()
      
      const existingInf = existing as { id: string; user_id: string } | null
      if (!existingInf || existingInf.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Não encontrado ou sem permissão' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Contact will be deleted via CASCADE
      const { error: deleteError } = await supabaseAdmin
        .from('influenciadores')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError

      console.log(`[influenciadores-api] Deleted influenciador ${id} for user ${user.id}`)
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    const error = err as Error
    console.error('[influenciadores-api] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
