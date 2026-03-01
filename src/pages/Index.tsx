import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Target, Zap, BarChart3, FileText, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: FileText, title: "Smart Resume Parsing", desc: "Upload PDF or DOCX and we extract skills, experience, and keywords instantly." },
  { icon: Target, title: "Job Matching", desc: "Get a precise match score comparing your resume to any job description." },
  { icon: Sparkles, title: "AI Suggestions", desc: "Receive AI-powered improvements, keyword additions, and ATS optimization tips." },
  { icon: BarChart3, title: "Gap Analysis", desc: "See exactly which skills are missing and how to add them effectively." },
  { icon: Zap, title: "Instant Results", desc: "Analysis completes in seconds, not hours. Iterate quickly on your resume." },
  { icon: Shield, title: "Private & Secure", desc: "Your resume data is encrypted and never shared with third parties." },
];

const Index = () => {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header>
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl" aria-label="Main navigation">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold" aria-label="ResuMatch home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Target className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              ResuMatch
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/auth?signup=true">
                <Button size="sm" className="gradient-primary text-primary-foreground border-0">Get Started</Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden pt-32 pb-24">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(230 80% 56% / 0.3), transparent 50%), radial-gradient(circle at 70% 30%, hsl(172 66% 50% / 0.2), transparent 50%)' }} />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary-foreground/80">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Resume Analysis
            </div>
            <h1 className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
              Land Your Dream Job{" "}
              <span className="text-gradient-accent">Faster</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-primary-foreground/70 md:text-xl">
              Upload your resume, paste a job description, and get an instant match score with AI-powered suggestions to optimize your application.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth?signup=true">
                <Button size="lg" className="gradient-primary text-primary-foreground border-0 px-8 text-base shadow-glow">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Everything You Need to <span className="text-gradient">Stand Out</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Our AI analyzes every detail to help you craft the perfect resume for any role.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl gradient-primary">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-3xl gradient-hero p-12 text-center shadow-glow">
            <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground">
              Ready to Optimize Your Resume?
            </h2>
            <p className="mb-8 text-primary-foreground/70">
              Join thousands of job seekers using AI to land interviews faster.
            </p>
            <Link to="/auth?signup=true">
              <Button size="lg" className="gradient-accent text-accent-foreground border-0 px-8 text-base">
                Get Started — It's Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
              <Target className="h-3 w-3 text-primary-foreground" />
            </div>
            ResuMatch
          </div>
          <p>© 2026 ResuMatch. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
