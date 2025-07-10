"use client";

import { useState } from "@/lib/hooks-provider";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import {
  Plus,
  Upload,
  Mic,
  Type,
  Palette,
  Zap,
  X,
  ChevronUp,
} from "@/lib/icons-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const quickActions = [
  {
    icon: Upload,
    label: "Import Media",
    description: "Add videos, images, or audio",
    action: () => console.log("Import media"),
    color: "text-blue-500",
  },
  {
    icon: Mic,
    label: "Record Audio",
    description: "Record voiceover or commentary",
    action: () => console.log("Record audio"),
    color: "text-red-500",
  },
  {
    icon: Type,
    label: "Add Text",
    description: "Insert text overlay",
    action: () => console.log("Add text"),
    color: "text-green-500",
  },
  {
    icon: Palette,
    label: "Effects",
    description: "Apply visual effects",
    action: () => console.log("Add effects"),
    color: "text-purple-500",
  },
  {
    icon: Zap,
    label: "Auto-Edit",
    description: "AI-powered editing suggestions",
    action: () => console.log("Auto-edit"),
    color: "text-yellow-500",
  },
];

export function QuickActions() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-4 space-y-2"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={action.action}
                      className="w-full justify-start gap-3 bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <action.icon className={`w-4 h-4 ${action.color}`} />
                      <div className="text-left">
                        <div className="text-sm font-medium">
                          {action.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{action.description}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        size="lg"
        className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </motion.div>
      </Button>
    </div>
  );
}
