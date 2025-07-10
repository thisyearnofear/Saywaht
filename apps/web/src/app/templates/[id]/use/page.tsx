import { Metadata } from "next";
import TemplateUseClient from "./use-client";

export const metadata: Metadata = {
  title: "Use Template",
  description: "Configure your project settings and use this template",
};

// Using a generic approach to accommodate Next.js App Router type constraints
export default async function TemplateUsePage(props: any) {
  const { id } = props.params;

  // Server component that renders the client component
  return <TemplateUseClient id={id} />;
}
