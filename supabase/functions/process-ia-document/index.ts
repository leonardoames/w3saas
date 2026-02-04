import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========== AUTENTICAÇÃO ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user auth for validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.log("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Autenticação inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Admin client for storage and DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { filePath } = await req.json();
    
    if (!filePath || typeof filePath !== "string") {
      return new Response(
        JSON.stringify({ error: "filePath é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the file belongs to the user
    if (!filePath.startsWith(userId)) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing document:", filePath);

    // Find the document record
    const { data: docRecord, error: docError } = await supabase
      .from("ia_documents")
      .select("*")
      .eq("file_path", filePath)
      .eq("user_id", userId)
      .single();

    if (docError || !docRecord) {
      console.error("Document not found:", docError);
      return new Response(
        JSON.stringify({ error: "Documento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await updateIaDocument(supabase, docRecord.id, {
      status: "processing",
      error_message: null,
    }, "set status=processing");

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("iaw3-brain")
        .download(filePath);

      if (downloadError || !fileData) {
        throw new Error(`Erro ao baixar arquivo: ${downloadError?.message}`);
      }

      console.log("File downloaded, size:", fileData.size);

      // Extract text based on file type
      let extractedText = "";
      const fileType = docRecord.file_type.toLowerCase();

      if (fileType === "txt" || fileType === "md") {
        // Plain text files
        extractedText = await fileData.text();
      } else if (fileType === "pdf") {
        // PDF extraction using pdf-parse equivalent
        extractedText = await extractPdfText(fileData);
      } else if (fileType === "docx") {
        // DOCX extraction
        extractedText = await extractDocxText(fileData);
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
      }

       // Normalize text to be safe for storage
       extractedText = normalizeExtractedText(extractedText);

       // Limit text size
      const MAX_TEXT_SIZE = 500000; // ~500KB of text
      if (extractedText.length > MAX_TEXT_SIZE) {
        extractedText = extractedText.substring(0, MAX_TEXT_SIZE);
        console.log("Text truncated to max size");
      }

      console.log("Text extracted, length:", extractedText.length);

       // Update document with extracted text
       await updateIaDocument(supabase, docRecord.id, {
         content_text: extractedText,
         status: "ready",
         error_message: null,
       }, "set status=ready + content_text");

      console.log("Document processed successfully:", docRecord.id);

      return new Response(
        JSON.stringify({ success: true, textLength: extractedText.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (processingError) {
      console.error("Processing error:", processingError);

       // Update document with error (best-effort)
       try {
         await updateIaDocument(supabase, docRecord.id, {
           status: "error",
           error_message: processingError instanceof Error
             ? processingError.message
             : "Erro ao processar documento",
         }, "set status=error + error_message");
       } catch (persistError) {
         console.error("Failed to persist error status:", persistError);
       }

      return new Response(
        JSON.stringify({ 
          error: processingError instanceof Error 
            ? processingError.message 
            : "Erro ao processar documento" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in process-ia-document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateIaDocument(
  supabase: any,
  id: string,
  patch: Record<string, unknown>,
  step: string,
) {
  const { data, error } = await supabase
    .from("ia_documents")
    .update(patch)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error(`[${step}] DB update error:`, error);
    throw new Error(`${step}: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(`${step}: update did not affect any rows`);
  }
}

function normalizeExtractedText(input: string): string {
  // Postgres TEXT cannot store \u0000 and may reject other control chars.
  // Keep it conservative: strip control chars and collapse whitespace.
  return input
    .replace(/\u0000/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple PDF text extraction
async function extractPdfText(fileData: Blob): Promise<string> {
  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to string and look for text streams
  const pdfString = new TextDecoder("latin1").decode(bytes);
  
  // Simple extraction - look for text between stream/endstream markers
  const textMatches: string[] = [];
  
  // Pattern to find text in PDF
  const textPattern = /\(([^)]+)\)/g;
  let match;
  while ((match = textPattern.exec(pdfString)) !== null) {
    const text = match[1];
    // Filter out non-printable and control characters
    const cleanText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, " ").trim();
    if (cleanText.length > 2 && !/^[\d\s.]+$/.test(cleanText)) {
      textMatches.push(cleanText);
    }
  }

  // Also try to find text with Tj and TJ operators
  const tjPattern = /\[([^\]]+)\]\s*TJ|\(([^)]+)\)\s*Tj/g;
  while ((match = tjPattern.exec(pdfString)) !== null) {
    const content = match[1] || match[2] || "";
    // Parse TJ array format
    const texts = content.match(/\(([^)]+)\)/g);
    if (texts) {
      texts.forEach(t => {
        const clean = t.slice(1, -1).replace(/[\x00-\x1F\x7F-\x9F]/g, " ").trim();
        if (clean.length > 0) {
          textMatches.push(clean);
        }
      });
    }
  }

  if (textMatches.length === 0) {
    // Fallback: try to extract any readable text
    const readablePattern = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s,.\-:;!?]{10,}/g;
    const readable = pdfString.match(readablePattern);
    if (readable) {
      return readable.join(" ").replace(/\s+/g, " ");
    }
    throw new Error("Não foi possível extrair texto do PDF. O arquivo pode conter apenas imagens.");
  }

  return textMatches.join(" ").replace(/\s+/g, " ");
}

// DOCX text extraction using JSZip (DOCX is a ZIP with XML)
async function extractDocxText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Use JSZip to properly decompress the DOCX file
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Get the main document content
    const documentXml = zip.file("word/document.xml");
    if (!documentXml) {
      throw new Error("Arquivo DOCX inválido: word/document.xml não encontrado");
    }
    
    const xmlContent = await documentXml.async("string");
    
    // Extract text from <w:t> elements (where Word stores text)
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const texts: string[] = [];
    let match;
    
    while ((match = textPattern.exec(xmlContent)) !== null) {
      const text = match[1];
      if (text) {
        texts.push(text);
      }
    }

    if (texts.length === 0) {
      throw new Error("Não foi possível extrair texto do DOCX. O arquivo pode estar vazio.");
    }

    console.log(`DOCX: extracted ${texts.length} text segments`);
    return texts.join("").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("DOCX extraction error:", error);
    if (error instanceof Error && error.message.includes("DOCX")) {
      throw error;
    }
    throw new Error("Erro ao processar arquivo DOCX. Verifique se o arquivo não está corrompido.");
  }
}
