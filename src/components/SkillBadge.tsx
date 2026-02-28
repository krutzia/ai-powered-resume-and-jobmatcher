import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  skill: string;
  variant?: "missing" | "suggested" | "matched";
}

const SkillBadge = ({ skill, variant = "missing" }: SkillBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variant === "missing" && "bg-destructive/10 text-destructive",
        variant === "suggested" && "bg-primary/10 text-primary",
        variant === "matched" && "bg-accent/10 text-accent-foreground"
      )}
    >
      {skill}
    </span>
  );
};

export default SkillBadge;
