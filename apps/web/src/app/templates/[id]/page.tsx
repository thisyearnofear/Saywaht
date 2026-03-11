import { Metadata } from "next";
import TemplateDetailsClient from "./template-details-client";
import { fetchTemplateCategories } from "@/lib/template-service";

export const metadata: Metadata = {
  title: "Template Details",
  description: "View and use this template for your project",
};

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

// Generate static params for popular templates at build time
export async function generateStaticParams() {
  try {
    const categories = await fetchTemplateCategories();
    // Pre-render first template from each category
    const paths = categories.flatMap((category) =>
      category.templates.slice(0, 1).map((template) => ({
        id: template.id,
      }))
    );
    return paths;
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// Using a generic approach to accommodate Next.js App Router type constraints
export default async function TemplateDetailPage(props: any) {
  // Wait for params to be available before destructuring
  const params = await props.params;
  const id = params.id;

  // Server component that renders the client component
  return <TemplateDetailsClient id={id} />;
}
