"use client";

import { TemplateDetails } from "@/components/templates/template-details";
import { Header } from "@/components/header";

interface TemplateDetailsClientProps {
  id: string;
}

export default function TemplateDetailsClient({
  id,
}: TemplateDetailsClientProps) {
  // Extract id from params safely
  const templateId = Array.isArray(id) ? id[0] : id;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 container max-w-6xl mx-auto py-4 md:py-8 px-4 overflow-y-auto">
        <TemplateDetails templateId={templateId} />
      </div>
    </div>
  );
}
