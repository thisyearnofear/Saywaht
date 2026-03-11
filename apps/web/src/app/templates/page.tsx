import { TemplatesPageClient } from "@/components/templates/templates-page-client";
import { fetchTemplateCategories } from "@/lib/template-service";

export default async function TemplatesPage() {
  // Server-side data fetching
  const categories = await fetchTemplateCategories();

  return <TemplatesPageClient initialCategories={categories} />;
}
