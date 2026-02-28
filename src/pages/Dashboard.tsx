import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ScoreCircle from "@/components/ScoreCircle";
import SkillBadge from "@/components/SkillBadge";
import { Target, Upload, LogOut, Loader2, FileText, Sparkles, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisResult {
  match_score: number;
  missing_skills: string[];
  suggested_keywords: string[];
  improvements: string[];
  optimized_resume: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or DOCX file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setResumeFile(file);
    setLoading(true);

    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: resumeData, error: insertError } = await supabase
        .from("resumes")
        .insert({ user_id: user.id, filename: file.name, file_path: filePath, extracted_text: `[Resume file: ${file.name}]` })
        .select()
        .single();
      
      if (insertError) throw insertError;
      setCurrentResumeId(resumeData.id);
      setResumeText(`Uploaded: ${file.name}`);
      toast({ title: "Resume uploaded", description: "Your resume has been uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const handleAnalyze = async () => {
    if (!currentResumeId || !jobDescription.trim()) {
      toast({ title: "Missing info", description: "Please upload a resume and paste a job description.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeId: currentResumeId, jobDescription: jobDescription.trim() },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data);

      await supabase.from("analyses").insert({
        user_id: user.id,
        resume_id: currentResumeId,
        job_description: jobDescription.trim(),
        match_score: data.match_score,
        missing_skills: data.missing_skills,
        suggested_keywords: data.suggested_keywords,
        improvements: data.improvements,
        optimized_resume: data.optimized_resume,
      });
    } catch (error: any) {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xl font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Target className="h-4 w-4 text-primary-foreground" />
            </div>
            ResuMatch
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Upload your resume and compare it with a job description.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Upload className="h-5 w-5 text-primary" /> Upload Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="mb-1 text-sm font-medium">
                  {resumeFile ? resumeFile.name : "Click to upload PDF or DOCX"}
                </span>
                <span className="text-xs text-muted-foreground">Max 10MB</span>
                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} />
              </label>
              {resumeText && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/10 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {resumeText}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <FileText className="h-5 w-5 text-primary" /> Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <Button
                onClick={handleAnalyze}
                className="mt-4 w-full gradient-primary text-primary-foreground border-0"
                disabled={loading || !currentResumeId || !jobDescription.trim()}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Analyze Match</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 space-y-6"
            >
              <Card className="shadow-elevated">
                <CardContent className="flex flex-col items-center py-10">
                  <ScoreCircle score={analysis.match_score} />
                  <p className="mt-4 text-center text-sm text-muted-foreground max-w-md">
                    Your resume matches <strong>{analysis.match_score}%</strong> of the job requirements.
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive" /> Missing Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missing_skills.length > 0 ? (
                        analysis.missing_skills.map((s) => <SkillBadge key={s} skill={s} variant="missing" />)
                      ) : (
                        <p className="text-sm text-muted-foreground">No missing skills found!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <Sparkles className="h-5 w-5 text-primary" /> Suggested Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.suggested_keywords.map((k) => <SkillBadge key={k} skill={k} variant="suggested" />)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <Zap className="h-5 w-5 text-accent" /> Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analysis.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full gradient-primary text-[10px] font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {analysis.optimized_resume && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <CheckCircle2 className="h-5 w-5 text-score-excellent" /> Optimized Resume Output
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {analysis.optimized_resume}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;
