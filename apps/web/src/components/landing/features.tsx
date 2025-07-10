"use client";

import { motion } from "motion/react";
import {
  Video,
  Scissors,
  Coins,
  Zap,
  Shield,
  Palette,
  Users,
  Sparkles,
  ArrowRight,
} from "@/lib/icons-provider";
import { Button } from "../ui/button";
import Link from "next/link";

const features = [
  {
    icon: Video,
    title: "Timeline-Based Editing",
    description:
      "Professional video editing with multi-track support, real-time preview, and intuitive drag-and-drop interface.",
    color: "text-blue-500",
  },
  {
    icon: Coins,
    title: "Deploy as Zora Coins",
    description:
      "Transform your creative content into tradeable ERC-20 coins on the Zora network. Own your content.",
    color: "text-purple-500",
  },
  {
    icon: Zap,
    title: "No Watermarks",
    description:
      "Export clean, professional videos without any branding or watermarks. Your content, your way.",
    color: "text-yellow-500",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "All processing happens locally in your browser. Your videos never leave your device.",
    color: "text-green-500",
  },
  {
    icon: Palette,
    title: "Creative Tools",
    description:
      "Add effects, transitions, text overlays, and audio tracks to make your content stand out.",
    color: "text-pink-500",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "Open source project built by creators, for creators. Join our growing community.",
    color: "text-orange-500",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need to create
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful video editing tools combined with Web3 capabilities.
            Create, edit, and monetize your content all in one place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group p-6 bg-card border border-border rounded-xl hover:shadow-lg transition-all duration-300 hover:border-primary/20"
            >
              <div
                className={`w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
              >
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link href="/editor">
            <Button size="lg" className="px-8 h-12 text-base font-medium">
              Try It Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
