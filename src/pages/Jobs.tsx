import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import ScoreCircle from "@/components/ScoreCircle";
import SkillBadge from "@/components/SkillBadge";
import { Target, LogOut, Loader2, Briefcase, MapPin, ExternalLink, Bookmark, BookmarkCheck, Filter, Search, Globe, Building, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JobWithScore {
  provider: string;
  title: string;
  company: string;
  location: string;
  work_type: "remote" | "onsite" | "hybrid";
  experience_level: string;
  required_skills: string[];
  description: string;
  apply_url: string;
  source_tag: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

const providerColors: Record<string, string> = {
  LinkedIn: "bg-[hsl(210,80%,50%)]/10 text-[hsl(210,80%,50%)]",
  Instahyre: "bg-primary/10 text-primary",
  Naukri: "bg-[hsl(260,70%,55%)]/10 text-[hsl(260,70%,55%)]",
  Wellfound: "bg-accent/10 text-accent",
};

const Jobs = () => {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobUrls, setSavedJobUrls] = useState<Set<string>>(new Set());
  const [savingJob, setSavingJob] = useState<string | null>(null);

  // Filters
  const [minMatch, setMinMatch] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

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

  useEffect(() => {
    if (user) fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-jobs");
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setJobs(data.jobs || []);
      setResumeSkills(data.resume_skills || []);
    } catch (err: any) {
      toast({ title: "Failed to load jobs", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (job: JobWithScore) => {
    setSavingJob(job.apply_url);
    try {
      if (savedJobUrls.has(job.apply_url)) {
        setSavedJobUrls(prev => { const next = new Set(prev); next.delete(job.apply_url); return next; });
        toast({ title: "Job removed from saved" });
      } else {
        setSavedJobUrls(prev => new Set(prev).add(job.apply_url));
        toast({ title: "Job saved!" });
      }
    } finally {
      setSavingJob(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (minMatch !== "all" && job.match_score < parseInt(minMatch)) return false;
      if (locationFilter && !job.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (workTypeFilter !== "all" && job.work_type !== workTypeFilter) return false;
      if (experienceFilter !== "all" && job.experience_level !== experienceFilter) return false;
      if (providerFilter !== "all" && job.source_tag !== providerFilter) return false;
      return true;
    });
  }, [jobs, minMatch, locationFilter, workTypeFilter, experienceFilter, providerFilter]);

  const uniqueLocations = useMemo(() => [...new Set(jobs.map(j => j.location))], [jobs]);

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Recommended Jobs For You
          </h1>
          <p className="text-muted-foreground mt-1">
            Jobs matched against your resume skills across multiple platforms.
          </p>
          {resumeSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 self-center">Your skills:</span>
              {resumeSkills.slice(0, 12).map(s => (
                <SkillBadge key={s} skill={s} variant="matched" />
              ))}
              {resumeSkills.length > 12 && (
                <span className="text-xs text-muted-foreground self-center">+{resumeSkills.length - 12} more</span>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="shadow-card mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Smart Filters
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <Select value={minMatch} onValueChange={setMinMatch}>
                <SelectTrigger><SelectValue placeholder="Min Match %" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scores</SelectItem>
                  <SelectItem value="50">≥ 50%</SelectItem>
                  <SelectItem value="70">≥ 70%</SelectItem>
                  <SelectItem value="85">≥ 85%</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter location..."
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Work type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger><SelectValue placeholder="Experience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Instahyre">Instahyre</SelectItem>
                  <SelectItem value="Naukri">Naukri</SelectItem>
                  <SelectItem value="Wellfound">Wellfound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>

        {/* Job listings */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Fetching jobs from all portals...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No jobs match your filters. Try adjusting them.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job, i) => (
                <motion.div
                  key={`${job.provider}-${job.apply_url}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <JobCard
                    job={job}
                    isSaved={savedJobUrls.has(job.apply_url)}
                    isSaving={savingJob === job.apply_url}
                    onSave={() => handleSaveJob(job)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

function JobCard({ job, isSaved, isSaving, onSave }: {
  job: JobWithScore;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = job.match_score >= 70 ? "text-[hsl(var(--score-excellent))]" : job.match_score >= 40 ? "text-[hsl(var(--score-good))]" : "text-[hsl(var(--score-poor))]";

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Score */}
          <div className="flex sm:flex-col items-center gap-2 sm:min-w-[60px]">
            <span className={`text-2xl font-bold font-display ${scoreColor}`}>{job.match_score}%</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">match</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-lg leading-tight">{job.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{job.company}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {job.work_type === "remote" ? "Remote" : job.work_type === "hybrid" ? "Hybrid" : "Onsite"}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${providerColors[job.source_tag] || "bg-muted text-muted-foreground"}`}>
                {job.source_tag}
              </span>
            </div>

            {/* Skills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.matched_skills.map(s => <SkillBadge key={s} skill={s} variant="matched" />)}
              {job.missing_skills.map(s => <SkillBadge key={s} skill={s} variant="missing" />)}
            </div>

            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 text-sm text-muted-foreground leading-relaxed"
              >
                {job.description}
              </motion.p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0" asChild>
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Quick Apply
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={onSave} disabled={isSaving}>
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 mr-1" /> : <Bookmark className="h-3.5 w-3.5 mr-1" />}
                {isSaved ? "Saved" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Less" : "More"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Jobs;
