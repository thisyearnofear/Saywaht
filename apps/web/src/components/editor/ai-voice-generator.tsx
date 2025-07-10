"use client";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useMediaStore } from "@/stores/media-store";
import { toast } from "sonner";
import { useState } from "@/lib/hooks-provider";

export function AiVoiceGenerator() {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { addMediaItem } = useMediaStore();

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to generate audio.");
      return;
    }

    setIsGenerating(true);
    toast.info("Generating AI voiceover...");

    try {
      const response = await fetch("/api/ai/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const audioBlob = await response.blob();
      const audioURL = URL.createObjectURL(audioBlob);
      const audioFile = new File(
        [audioBlob],
        `ai-voiceover-${Date.now()}.mp3`,
        {
          type: "audio/mpeg",
        }
      );

      addMediaItem({
        name: audioFile.name,
        type: "audio",
        file: audioFile,
        url: audioURL,
        duration: 0, // Duration will be calculated by the media processing library
        aspectRatio: 1,
      });

      toast.success("AI voiceover added to your library.");
    } catch (error) {
      console.error("AI generation failed:", error);
      toast.error("Failed to generate AI voiceover. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(e: { target: { value: string } }) => setText(e.target.value)}
        placeholder="Enter your script here..."
        rows={4}
      />
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? "Generating..." : "Generate AI Voiceover"}
      </Button>
    </div>
  );
}
