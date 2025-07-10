"use client";

import { TemplateDetails } from "@/components/templates/template-details";

interface TemplateDetailsClientProps {
  id: string;
}

export default function TemplateDetailsClient({
  id,
}: TemplateDetailsClientProps) {
  // Extract id from params safely
  const templateId = Array.isArray(id) ? id[0] : id;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <TemplateDetails templateId={templateId} />
    </div>
  );
}
