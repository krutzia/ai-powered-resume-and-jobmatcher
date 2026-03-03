import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, Code2, User, FolderKanban, Layout, Lightbulb } from "lucide-react";

interface AIInsight {
  category: string;
  change: string;
  reason: string;
  job_alignment: string;
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  Skills: <Code2 className="h-4 w-4 text-primary" />,
  Summary: <User className="h-4 w-4 text-accent" />,
  Experience: <FolderKanban className="h-4 w-4 text-score-good" />,
  Projects: <Layout className="h-4 w-4 text-score-excellent" />,
  Formatting: <Lightbulb className="h-4 w-4 text-muted-foreground" />,
};

const AIInsightsPanel = ({ insights }: AIInsightsPanelProps) => {
  if (!insights.length) return null;

  const grouped = insights.reduce<Record<string, AIInsight[]>>((acc, insight) => {
    const cat = insight.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(insight);
    return acc;
  }, {});

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Brain className="h-5 w-5 text-primary" /> AI Optimization Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Understand every change made to your resume and why it matters.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {Object.entries(grouped).map(([category, items]) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {categoryIcons[category] || <Lightbulb className="h-4 w-4 text-muted-foreground" />}
                  {category}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {items.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-4">
                  {items.map((item, i) => (
                    <li key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-foreground">{item.change}</p>
                      <p className="mt-1 text-muted-foreground">
                        <strong className="text-foreground/80">Why:</strong> {item.reason}
                      </p>
                      {item.job_alignment && (
                        <p className="mt-1 text-xs text-primary">
                          ↳ Aligns with: {item.job_alignment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default AIInsightsPanel;
