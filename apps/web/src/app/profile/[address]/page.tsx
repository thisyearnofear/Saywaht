"use client";

import { Header } from "@/components/header";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const { address } = useParams();

  return (
    <div>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">My Collection</h1>
        <p className="text-muted-foreground">
          Commentaries created by: {address}
        </p>
        {/* Gallery of minted commentaries will go here */}
      </div>
    </div>
  );
}
