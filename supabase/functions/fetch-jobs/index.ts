import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock job providers
interface JobListing {
  provider: string;
  title: string;
  company: string;
  location: string;
  work_type: "remote" | "onsite" | "hybrid";
  experience_level: "entry" | "mid" | "senior" | "lead" | "executive";
  required_skills: string[];
  description: string;
  apply_url: string;
  source_tag: string;
}

function fetchLinkedInJobs(): JobListing[] {
  return [
    { provider: "linkedin", title: "Senior Frontend Engineer", company: "Google", location: "Mountain View, CA", work_type: "hybrid", experience_level: "senior", required_skills: ["React", "TypeScript", "GraphQL", "CSS", "Testing", "Performance Optimization"], description: "Join Google's frontend team to build next-generation web applications. You'll work on products used by billions.", apply_url: "https://linkedin.com/jobs/1", source_tag: "LinkedIn" },
    { provider: "linkedin", title: "Full Stack Developer", company: "Stripe", location: "San Francisco, CA", work_type: "remote", experience_level: "mid", required_skills: ["Node.js", "React", "PostgreSQL", "REST APIs", "Docker", "CI/CD"], description: "Build payment infrastructure at scale. Work on APIs that power millions of businesses worldwide.", apply_url: "https://linkedin.com/jobs/2", source_tag: "LinkedIn" },
    { provider: "linkedin", title: "Machine Learning Engineer", company: "OpenAI", location: "San Francisco, CA", work_type: "onsite", experience_level: "senior", required_skills: ["Python", "PyTorch", "TensorFlow", "NLP", "Deep Learning", "MLOps"], description: "Research and deploy cutting-edge AI models. Push the boundaries of artificial intelligence.", apply_url: "https://linkedin.com/jobs/3", source_tag: "LinkedIn" },
    { provider: "linkedin", title: "DevOps Engineer", company: "Netflix", location: "Los Gatos, CA", work_type: "remote", experience_level: "senior", required_skills: ["AWS", "Kubernetes", "Terraform", "CI/CD", "Python", "Monitoring"], description: "Scale the world's leading streaming platform. Manage infrastructure serving 200M+ subscribers.", apply_url: "https://linkedin.com/jobs/4", source_tag: "LinkedIn" },
  ];
}

function fetchInstahyreJobs(): JobListing[] {
  return [
    { provider: "instahyre", title: "React Developer", company: "Razorpay", location: "Bangalore, India", work_type: "hybrid", experience_level: "mid", required_skills: ["React", "JavaScript", "Redux", "REST APIs", "CSS", "Git"], description: "Build fintech solutions for India's fastest-growing payment gateway.", apply_url: "https://instahyre.com/jobs/1", source_tag: "Instahyre" },
    { provider: "instahyre", title: "Backend Engineer", company: "Flipkart", location: "Bangalore, India", work_type: "onsite", experience_level: "mid", required_skills: ["Java", "Spring Boot", "Microservices", "Kafka", "MySQL", "Redis"], description: "Build scalable e-commerce backend systems handling millions of transactions daily.", apply_url: "https://instahyre.com/jobs/2", source_tag: "Instahyre" },
    { provider: "instahyre", title: "Data Scientist", company: "Swiggy", location: "Bangalore, India", work_type: "hybrid", experience_level: "mid", required_skills: ["Python", "SQL", "Machine Learning", "Pandas", "Scikit-learn", "Statistics"], description: "Drive data-driven decisions for food delivery optimization and demand forecasting.", apply_url: "https://instahyre.com/jobs/3", source_tag: "Instahyre" },
  ];
}

function fetchNaukriJobs(): JobListing[] {
  return [
    { provider: "naukri", title: "Software Engineer", company: "TCS", location: "Mumbai, India", work_type: "onsite", experience_level: "entry", required_skills: ["Java", "SQL", "Spring", "HTML", "CSS", "JavaScript"], description: "Join India's largest IT services company. Work on enterprise projects for global clients.", apply_url: "https://naukri.com/jobs/1", source_tag: "Naukri" },
    { provider: "naukri", title: "Cloud Architect", company: "Infosys", location: "Hyderabad, India", work_type: "hybrid", experience_level: "lead", required_skills: ["AWS", "Azure", "GCP", "Kubernetes", "Terraform", "Architecture"], description: "Design cloud-native solutions for Fortune 500 companies.", apply_url: "https://naukri.com/jobs/2", source_tag: "Naukri" },
    { provider: "naukri", title: "Python Developer", company: "Wipro", location: "Pune, India", work_type: "onsite", experience_level: "mid", required_skills: ["Python", "Django", "REST APIs", "PostgreSQL", "Docker", "Linux"], description: "Develop enterprise applications using Python and modern frameworks.", apply_url: "https://naukri.com/jobs/3", source_tag: "Naukri" },
  ];
}

function fetchWellfoundJobs(): JobListing[] {
  return [
    { provider: "wellfound", title: "Founding Engineer", company: "Stealth AI Startup", location: "Remote", work_type: "remote", experience_level: "senior", required_skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AI/ML", "System Design"], description: "Be the first engineer at a well-funded AI startup. Shape the product from scratch.", apply_url: "https://wellfound.com/jobs/1", source_tag: "Wellfound" },
    { provider: "wellfound", title: "Mobile Developer", company: "HealthTech Co", location: "New York, NY", work_type: "hybrid", experience_level: "mid", required_skills: ["React Native", "TypeScript", "Firebase", "REST APIs", "iOS", "Android"], description: "Build health-tracking mobile apps used by thousands of patients and doctors.", apply_url: "https://wellfound.com/jobs/2", source_tag: "Wellfound" },
    { provider: "wellfound", title: "Product Designer", company: "EdTech Startup", location: "Remote", work_type: "remote", experience_level: "mid", required_skills: ["Figma", "User Research", "Prototyping", "Design Systems", "HTML/CSS", "Accessibility"], description: "Design intuitive learning experiences for the next generation of students.", apply_url: "https://wellfound.com/jobs/3", source_tag: "Wellfound" },
    { provider: "wellfound", title: "Infrastructure Engineer", company: "FinTech Startup", location: "Austin, TX", work_type: "remote", experience_level: "senior", required_skills: ["Go", "Kubernetes", "AWS", "Terraform", "PostgreSQL", "Security"], description: "Build secure, compliant infrastructure for a rapidly growing fintech company.", apply_url: "https://wellfound.com/jobs/4", source_tag: "Wellfound" },
  ];
}

function calculateMatchScore(resumeSkills: string[], jobSkills: string[]): { score: number; matched: string[]; missing: string[] } {
  const normalizedResume = resumeSkills.map(s => s.toLowerCase().trim());
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    const normalizedSkill = skill.toLowerCase().trim();
    const isMatch = normalizedResume.some(rs =>
      rs.includes(normalizedSkill) || normalizedSkill.includes(rs) ||
      // Fuzzy: check partial overlap
      rs.split(/[\s/]+/).some(part => normalizedSkill.includes(part) && part.length > 2)
    );
    if (isMatch) matched.push(skill);
    else missing.push(skill);
  }

  const score = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 0;
  return { score, matched, missing };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's latest resume skills
    const { data: latestResume } = await supabase
      .from("resumes")
      .select("extracted_text, filename")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Extract skills from resume text (basic keyword extraction)
    const resumeText = latestResume?.extracted_text || latestResume?.filename || "";
    const commonSkills = [
      "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++", "Go", "Rust",
      "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST APIs",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
      "HTML", "CSS", "Tailwind", "Redux", "Next.js", "Vue", "Angular", "Svelte",
      "Git", "Linux", "Testing", "Agile", "Scrum", "Figma", "Design Systems",
      "Machine Learning", "Deep Learning", "NLP", "PyTorch", "TensorFlow",
      "Spring Boot", "Django", "Flask", "Express", "FastAPI",
      "Microservices", "System Design", "Architecture", "Security",
      "React Native", "iOS", "Android", "Firebase", "Kafka",
      "Pandas", "Scikit-learn", "Statistics", "Data Science",
      "Performance Optimization", "Accessibility", "SEO",
    ];
    const resumeSkills = commonSkills.filter(skill =>
      resumeText.toLowerCase().includes(skill.toLowerCase())
    );

    // Fetch from all providers
    const allJobs = [
      ...fetchLinkedInJobs(),
      ...fetchInstahyreJobs(),
      ...fetchNaukriJobs(),
      ...fetchWellfoundJobs(),
    ];

    // Upsert jobs into database
    for (const job of allJobs) {
      await supabase.from("jobs").upsert({
        provider: job.provider,
        title: job.title,
        company: job.company,
        location: job.location,
        work_type: job.work_type,
        experience_level: job.experience_level,
        required_skills: job.required_skills,
        description: job.description,
        apply_url: job.apply_url,
        source_tag: job.source_tag,
      }, { onConflict: "id" });
    }

    // Calculate match scores
    const jobsWithScores = allJobs.map(job => {
      const { score, matched, missing } = calculateMatchScore(resumeSkills, job.required_skills);
      return { ...job, match_score: score, matched_skills: matched, missing_skills: missing };
    });

    // Sort by match score descending
    jobsWithScores.sort((a, b) => b.match_score - a.match_score);

    // Get saved job IDs for this user
    const { data: savedJobs } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", user.id);
    const savedJobIds = new Set((savedJobs || []).map(s => s.job_id));

    return new Response(JSON.stringify({
      jobs: jobsWithScores,
      resume_skills: resumeSkills,
      total: jobsWithScores.length,
      providers: ["LinkedIn", "Instahyre", "Naukri", "Wellfound"],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-jobs error:", e);
    return new Response(JSON.stringify({ error: "Failed to fetch jobs" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
