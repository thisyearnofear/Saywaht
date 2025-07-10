"use client";

import React from '@/lib/hooks-provider';
import { TemplateBrowser } from "@/components/templates/template-browser";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TemplatesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 text-white">
      {/* Background Visual Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute top-60 -left-20 w-60 h-60 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Header */}
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </Button>
          </div>

          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Choose a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Template
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Start with a pexels video and make it your own
            </p>
          </div>

          {/* Stats Bar */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-300">3</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">
                    Templates
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-300">1</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">
                    Category
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-300">HD</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">
                    Quality
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Browser */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8">
            <TemplateBrowser />
          </div>
        </div>
      </div>
    </div>
  );
}
