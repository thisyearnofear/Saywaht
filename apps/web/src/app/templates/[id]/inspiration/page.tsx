import { Metadata } from "next";
import InspirationPageClient from "./inspiration-client";

export const metadata: Metadata = {
  title: "Template Inspiration",
  description: "Get inspired by examples from other creators",
};

// Using a more generic approach to accommodate Next.js App Router
export default async function InspirationPage(props: any) {
  const { id } = props.params;

  // Server component that renders the client component
  return <InspirationPageClient id={id} />;
}
