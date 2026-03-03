import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, Sparkles } from "lucide-react";

interface ResumeComparisonProps {
  originalResume: string;
  optimizedResume: string;
  suggestedKeywords: string[];
}

const ResumeComparison = ({ originalResume, optimizedResume, suggestedKeywords }: ResumeComparisonProps) => {
  const [showImprovementsOnly, setShowImprovementsOnly] = useState(false);

  const highlightText = (text: string) => {
    if (!text) return text;
    let highlighted = text;

    // Highlight suggested keywords in green
    suggestedKeywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      highlighted = highlighted.replace(
        regex,
        `<mark class="rounded bg-score-excellent/20 px-0.5 text-foreground font-medium">$1</mark>`
      );
    });

    return highlighted;
  };

  const getImprovementLines = () => {
    const originalLines = originalResume.split("\n");
    const optimizedLines = optimizedResume.split("\n");
    const originalSet = new Set(originalLines.map((l) => l.trim().toLowerCase()));

    return optimizedLines
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        return !originalSet.has(trimmed.toLowerCase());
      })
      .join("\n");
  };

  const displayedOptimized = showImprovementsOnly ? getImprovementLines() : optimizedResume;

  return (
    <Card className="shadow-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Sparkles className="h-5 w-5 text-primary" /> Side-by-Side Comparison
        </CardTitle>
        <div className="flex items-center gap-2">
          <Switch
            id="improvements-toggle"
            checked={showImprovementsOnly}
            onCheckedChange={setShowImprovementsOnly}
          />
          <Label htmlFor="improvements-toggle" className="text-sm cursor-pointer">
            Show Improvements Only
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Original */}
          <div className="flex flex-col rounded-xl border border-border bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Original Resume</span>
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {originalResume || "Original resume text not available."}
            </div>
          </div>

          {/* Optimized */}
          <div className="flex flex-col rounded-xl border-2 border-primary/20 bg-primary/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-primary/20 gradient-primary px-4 py-3">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground">Optimized Resume</span>
            </div>
            <div
              className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: highlightText(displayedOptimized) }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-score-excellent/30" /> Added Keywords
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResumeComparison;
