import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DownloadResumeButtonProps {
  optimizedResume: string;
}

const DownloadResumeButton = ({ optimizedResume }: DownloadResumeButtonProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // Build a clean HTML resume for PDF generation
      const sections = parseResumeSections(optimizedResume);

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a2e; line-height: 1.6; }
  h1 { font-size: 24px; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin-bottom: 16px; color: #1e1b4b; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #4338ca; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  p, li { font-size: 13px; margin: 4px 0; }
  ul { padding-left: 20px; }
  .section { margin-bottom: 16px; }
</style>
</head>
<body>
${sections}
</body>
</html>`;

      // Use browser print-to-PDF via a hidden iframe
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");

      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            URL.revokeObjectURL(url);
          }, 500);
        };
      } else {
        // Fallback: download as HTML
        const a = document.createElement("a");
        a.href = url;
        a.download = "optimized-resume.html";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Popup blocked", description: "Downloaded as HTML. Open and print to PDF from your browser." });
      }
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={generating || !optimizedResume}
      className="gradient-primary text-primary-foreground border-0 shadow-elevated"
      size="lg"
    >
      {generating ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...</>
      ) : (
        <><Download className="mr-2 h-4 w-4" /> Download Optimized Resume (PDF)</>
      )}
    </Button>
  );
};

function parseResumeSections(text: string): string {
  const lines = text.split("\n");
  let html = "";
  const sectionKeywords = ["summary", "skills", "experience", "projects", "education", "certifications", "objective", "profile"];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      html += "<br/>";
      continue;
    }

    const lower = trimmed.toLowerCase().replace(/[:#\-*]/g, "").trim();
    if (sectionKeywords.some((k) => lower === k || lower.startsWith(k + " "))) {
      html += `<h2>${trimmed.replace(/^[#\-*]+\s*/, "")}</h2>`;
    } else if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      html += `<li>${trimmed.replace(/^[•\-*]\s*/, "")}</li>`;
    } else if (lines.indexOf(line) === 0) {
      html += `<h1>${trimmed}</h1>`;
    } else {
      html += `<p>${trimmed}</p>`;
    }
  }

  return html;
}

export default DownloadResumeButton;
