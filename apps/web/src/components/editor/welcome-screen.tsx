"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectStore } from "@/stores/project-store";
import { PlusCircle } from "lucide-react";

export function WelcomeScreen() {
  const { createNewProject } = useProjectStore();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-purple-600 to-blue-500 text-white p-8">
      <Card className="w-full max-w-md text-center bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-white">Welcome to OpenCut!</CardTitle>
          <CardDescription className="text-white/80">
            Start your creative journey here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-white/90">
            It looks like you don&apos;t have an active project. Let&apos;s get you started!
          </p>
          <Button
            onClick={() => createNewProject("My Awesome Project")}
            className="w-full bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700 transition-colors duration-200 text-lg py-6 rounded-lg shadow-md"
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            Create New Project
          </Button>
          <div className="text-white/70 text-sm">
            <p>Need some inspiration?</p>
            <p>Explore templates, tutorials, or import your first media.</p>
            {/* Placeholder for future links/buttons */}
            <div className="mt-4 flex justify-center space-x-4">
              <Button variant="outline" className="text-white border-white/50 hover:bg-white/20">
                Browse Templates
              </Button>
              <Button variant="outline" className="text-white border-white/50 hover:bg-white/20">
                Watch Tutorial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
