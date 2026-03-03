import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import ScoreCircle from "./ScoreCircle";

interface ATSScoreImpactProps {
  beforeScore: number;
  afterScore: number;
}

const ATSScoreImpact = ({ beforeScore, afterScore }: ATSScoreImpactProps) => {
  const improvement = afterScore - beforeScore;

  return (
    <Card className="shadow-elevated overflow-hidden">
      <div className="gradient-primary p-4">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-primary-foreground">
          <TrendingUp className="h-5 w-5" /> Optimization Impact
        </h3>
        <p className="mt-1 text-sm text-primary-foreground/70">
          See how AI optimization improves your ATS compatibility score
        </p>
      </div>
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-around">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Before</span>
            <ScoreCircle score={beforeScore} size={140} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="rounded-xl bg-score-excellent/10 px-5 py-3 text-center">
              <span className="font-display text-3xl font-bold text-score-excellent">
                +{improvement}%
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Improvement</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">After</span>
            <ScoreCircle score={afterScore} size={140} />
          </motion.div>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            <strong>ATS Score</strong> measures how well your resume matches the job description based on keywords, skills, and formatting. Most companies use Applicant Tracking Systems to filter resumes before human review.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ATSScoreImpact;
