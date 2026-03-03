"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMobileOnboarding } from "./mobile-onboarding-overlay";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { addHapticFeedback } from "@/lib/mobile-utils";
import {
  X,
  RotateCcw,
  Save,
  ChevronRight,
  Sparkles,
  Moon,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MobileSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSettingsPanel({
  isOpen,
  onClose,
}: MobileSettingsPanelProps) {
  const { preferences, updatePreferences } = useUserPreferencesStore();
  const { resetOnboarding } = useMobileOnboarding();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleResetOnboarding = () => {
    addHapticFeedback("medium");
    resetOnboarding();
    setShowResetConfirm(false);
    toast.success("Onboarding reset", {
      description: "Tutorial will show next time you open the editor",
    });
  };

  const handleToggleAutoSave = (value: boolean) => {
    addHapticFeedback("light");
    updatePreferences({ autoSave: value });
    toast.success(value ? "Auto-save enabled" : "Auto-save disabled");
  };

  const handleToggleSnapToGrid = (value: boolean) => {
    addHapticFeedback("light");
    updatePreferences({ snapToGrid: value });
  };

  const handleToggleWaveforms = (value: boolean) => {
    addHapticFeedback("light");
    updatePreferences({ showWaveforms: value });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-bold">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => {
              addHapticFeedback("light");
              onClose();
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Editor Settings */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Editor
            </h3>
            <div className="space-y-4">
              <SettingRow
                icon={<Save className="h-5 w-5" />}
                title="Auto-save"
                description="Automatically save your progress"
              >
                <Switch
                  checked={preferences.autoSave}
                  onCheckedChange={handleToggleAutoSave}
                />
              </SettingRow>

              <SettingRow
                icon={<Sparkles className="h-5 w-5" />}
                title="Snap to grid"
                description="Align clips to timeline grid"
              >
                <Switch
                  checked={preferences.snapToGrid}
                  onCheckedChange={handleToggleSnapToGrid}
                />
              </SettingRow>

              <SettingRow
                icon={<Bell className="h-5 w-5" />}
                title="Show waveforms"
                description="Display audio waveforms on clips"
              >
                <Switch
                  checked={preferences.showWaveforms}
                  onCheckedChange={handleToggleWaveforms}
                />
              </SettingRow>
            </div>
          </section>

          {/* Onboarding */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Onboarding
            </h3>
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <RotateCcw className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Reset Tutorial</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Show the welcome tutorial again when you next open the editor
                  </p>
                </div>
              </div>
              
              {!showResetConfirm ? (
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  onClick={() => {
                    addHapticFeedback("light");
                    setShowResetConfirm(true);
                  }}
                >
                  Reset Onboarding
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary"
                    onClick={handleResetOnboarding}
                  >
                    Confirm
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Theme */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(["dark", "light", "system"] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => {
                    addHapticFeedback("light");
                    updatePreferences({ theme });
                    toast.success(`Theme: ${theme}`);
                  }}
                  className={cn(
                    "h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                    preferences.theme === theme
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <Moon className={cn(
                    "h-5 w-5",
                    preferences.theme === theme ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    preferences.theme === theme ? "text-primary" : "text-muted-foreground"
                  )}>
                    {theme}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-4">
          <Button
            variant="default"
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
            onClick={() => {
              addHapticFeedback("medium");
              onClose();
              toast.success("Settings saved");
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Setting Row Component ───────────────────────────────────────────────────

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ icon, title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-muted/30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <div className="shrink-0">
        {children}
      </div>
    </div>
  );
}
