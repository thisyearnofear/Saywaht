"use client";

import { ChangeEvent, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MintWizardData } from "../mint-wizard";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { Info, Layers, Tag } from "@/lib/icons";

interface CoinDetailsStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function CoinDetailsStep({ data, updateData }: CoinDetailsStepProps) {
  const { preferences } = useUserPreferencesStore();
  
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateData({ coinName: e.target.value });
  };

  const handleSymbolChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateData({ coinSymbol: e.target.value.toUpperCase().slice(0, 6) });
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateData({ coinDescription: e.target.value });
  };

  const suggestedTags = useMemo(
    () => ["#commentary", "#meme", "#ai", "#base", "#zora", "#viral", "#insight"],
    []
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Name & Symbol Group */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="coinName" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">
              Coin Name *
            </Label>
            <Input
              id="coinName"
              value={data.coinName}
              onChange={handleNameChange}
              placeholder="e.g. My Epic Commentary"
              className="h-14 rounded-2xl text-lg font-bold bg-card border-border/50 focus:border-primary/50 shadow-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="coinSymbol" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">
              Symbol *
            </Label>
            <Input
              id="coinSymbol"
              value={data.coinSymbol}
              onChange={handleSymbolChange}
              placeholder="TICKER"
              maxLength={6}
              className="h-14 rounded-2xl text-lg font-black font-mono bg-card border-border/50 focus:border-primary/50 text-center shadow-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="coinDescription" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">
            Description
          </Label>
          <Textarea
            id="coinDescription"
            value={data.coinDescription}
            onChange={handleDescriptionChange}
            placeholder="Tell the world about your video coin..."
            className="min-h-[120px] rounded-[2rem] bg-card border-border/50 focus:border-primary/50 p-6 resize-none shadow-sm"
          />
          
          <div className="flex flex-wrap gap-2 pt-3 px-1">
            <div className="flex items-center gap-1.5 mr-2 text-[10px] font-black uppercase text-muted-foreground/50">
              <Tag className="h-3 w-3" />
              Quick Tags:
            </div>
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const next = (data.coinDescription || "").trim();
                  const appended = next ? `${next} ${tag}` : tag;
                  updateData({ coinDescription: appended });
                }}
                className="text-[10px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all font-bold uppercase tracking-wider"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="glass rounded-3xl p-6 border-border/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-bold text-sm">Deployment Tips</h4>
          </div>
          <ul className="space-y-3 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              Use a ticker symbol that&apos;s easy to remember (3-6 chars)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              Add relevant hashtags to help people discover your coin
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              Your metadata will be stored permanently on IPFS via Grove
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
