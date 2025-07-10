"use client";

import { ChangeEvent } from "@/lib/hooks-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MintWizardData } from "../mint-wizard";

interface CoinDetailsStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function CoinDetailsStep({ data, updateData }: CoinDetailsStepProps) {
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateData({ coinName: e.target.value });
  };

  const handleSymbolChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateData({ coinSymbol: e.target.value.toUpperCase().slice(0, 6) });
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateData({ coinDescription: e.target.value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coin Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set up the basic information for your video coin
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="coinName">Coin Name *</Label>
          <Input
            id="coinName"
            value={data.coinName}
            onChange={handleNameChange}
            placeholder="My Awesome Commentary"
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            Choose a memorable name that represents your video content
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coinSymbol">Coin Symbol *</Label>
          <Input
            id="coinSymbol"
            value={data.coinSymbol}
            onChange={handleSymbolChange}
            placeholder="MAC"
            maxLength={6}
            className="text-lg font-mono"
          />
          <p className="text-xs text-muted-foreground">
            3-6 characters, will be converted to uppercase (e.g., BTC, ETH,
            DOGE)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coinDescription">Description (Optional)</Label>
          <Textarea
            id="coinDescription"
            value={data.coinDescription}
            onChange={handleDescriptionChange}
            placeholder="A brief description of your video coin..."
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            Describe what makes your video coin special or unique
          </p>
        </div>

        {/* Validation Messages */}
        {data.coinName.trim() === "" && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            💡 Coin name is required to proceed to the next step
          </div>
        )}

        {data.coinSymbol.trim() === "" && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            💡 Coin symbol is required to proceed to the next step
          </div>
        )}
      </CardContent>
    </Card>
  );
}
