import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_JOB_DESC_LENGTH = 15000;
const MAX_RESUME_TEXT_LENGTH = 50000;

function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { resumeId, jobDescription } = body;

    if (!resumeId || typeof resumeId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid or missing resumeId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Job description must be at least 10 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedJobDesc = sanitizeText(jobDescription, MAX_JOB_DESC_LENGTH);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resumeId)) {
      return new Response(JSON.stringify({ error: "Invalid resumeId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .single();
    if (resumeError || !resume) {
      return new Response(JSON.stringify({ error: "Resume not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      console.error("AI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resumeText = sanitizeText(resume.extracted_text || `[Resume file: ${resume.filename}]`, MAX_RESUME_TEXT_LENGTH);

    const prompt = `You are an expert resume analyzer and ATS optimization specialist. Analyze the following resume against the job description and return a JSON object.

Resume filename: ${resume.filename}
Resume content: ${resumeText}

Job Description:
${sanitizedJobDesc}

Return ONLY a valid JSON object with these exact fields:
{
  "match_score": <number 0-100 representing ATS match BEFORE optimization>,
  "optimized_score": <number 0-100 representing estimated ATS match AFTER optimization>,
  "missing_skills": [<array of missing skill strings>],
  "suggested_keywords": [<array of keyword strings to add>],
  "improvements": [<array of improvement suggestion strings>],
  "optimized_resume": "<optimized version of resume text with improvements applied>",
  "original_resume": "<cleaned up version of the original resume text as-is>",
  "ai_insights": [
    {
      "category": "<Skills|Summary|Experience|Projects|Formatting>",
      "change": "<what was changed>",
      "reason": "<why it was changed>",
      "job_alignment": "<which job requirement it aligns with>"
    }
  ]
}

The optimized_score should always be higher than match_score. Be specific and actionable. If resume text is minimal, provide general guidance based on the job description requirements. Provide at least 3 ai_insights entries.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume analysis AI. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "30" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis temporarily unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response. Please retry." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response. Please retry." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = {
      match_score: Math.min(100, Math.max(0, Number(parsed.match_score) || 0)),
      optimized_score: Math.min(100, Math.max(0, Number(parsed.optimized_score) || Math.min(100, (Number(parsed.match_score) || 0) + 20))),
      missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills.slice(0, 50) : [],
      suggested_keywords: Array.isArray(parsed.suggested_keywords) ? parsed.suggested_keywords.slice(0, 50) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 20) : [],
      optimized_resume: typeof parsed.optimized_resume === "string" ? parsed.optimized_resume.slice(0, 10000) : "",
      original_resume: typeof parsed.original_resume === "string" ? parsed.original_resume.slice(0, 10000) : resumeText,
      ai_insights: Array.isArray(parsed.ai_insights) ? parsed.ai_insights.slice(0, 30).map((i: any) => ({
        category: String(i.category || "General"),
        change: String(i.change || ""),
        reason: String(i.reason || ""),
        job_alignment: String(i.job_alignment || ""),
      })) : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
