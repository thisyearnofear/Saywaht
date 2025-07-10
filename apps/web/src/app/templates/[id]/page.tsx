import { Metadata } from "next";
import TemplateDetailsClient from "./template-details-client";

export const metadata: Metadata = {
  title: "Template Details",
  description: "View and use this template for your project",
};

// Using a generic approach to accommodate Next.js App Router type constraints
export default async function TemplateDetailPage(props: any) {
  // Wait for params to be available before destructuring
  const params = await props.params;
  const id = params.id;

  // Server component that renders the client component
  return <TemplateDetailsClient id={id} />;
}
