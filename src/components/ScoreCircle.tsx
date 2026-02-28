import { motion } from "framer-motion";

interface ScoreCircleProps {
  score: number;
  size?: number;
}

const ScoreCircle = ({ score, size = 180 }: ScoreCircleProps) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 75) return "hsl(var(--score-excellent))";
    if (score >= 50) return "hsl(var(--score-good))";
    return "hsl(var(--score-poor))";
  };

  const getLabel = () => {
    if (score >= 75) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Work";
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-display text-4xl font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}%
        </motion.span>
        <span className="text-xs font-medium text-muted-foreground">{getLabel()}</span>
      </div>
    </div>
  );
};

export default ScoreCircle;
