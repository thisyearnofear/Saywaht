"use client";

import { useState, ChangeEvent } from "@/lib/hooks-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Share2,
  Copy,
  Download,
  Upload,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "@/lib/icons-provider";
import { useProjectIPFSStore } from "@/stores/project-ipfs-store";
import { toast } from "sonner";

export function ProjectSharing() {
  const {
    currentProject,
    saveToIPFS,
    loadFromIPFS,
    isSaving,
    isLoadingFromIPFS,
  } = useProjectIPFSStore();
  const [shareUrl, setShareUrl] = useState("");
  const [loadUrl, setLoadUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSaveAndShare = async () => {
    if (!currentProject) return;

    try {
      await saveToIPFS();

      if (currentProject.ipfsUri) {
        // Create shareable URL
        const shareableUrl = `${window.location.origin}/project/share?ipfs=${encodeURIComponent(currentProject.ipfsUri)}`;
        setShareUrl(shareableUrl);
        toast.success("Project saved to IPFS and ready to share!");
      }
    } catch (error) {
      toast.error("Failed to save project to IPFS");
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share URL copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleLoadFromUrl = async () => {
    if (!loadUrl.trim()) return;

    try {
      // Extract IPFS URI from URL or use directly
      let ipfsUri = loadUrl.trim();

      if (loadUrl.includes("ipfs=")) {
        const urlParams = new URLSearchParams(loadUrl.split("?")[1]);
        ipfsUri = urlParams.get("ipfs") || "";
      }

      if (!ipfsUri.startsWith("ipfs://") && !ipfsUri.startsWith("lens://")) {
        throw new Error("Invalid IPFS URI format");
      }

      await loadFromIPFS(ipfsUri);
      setIsOpen(false);
      setLoadUrl("");
      toast.success("Project loaded from IPFS!");
    } catch (error) {
      toast.error(
        `Failed to load project: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleCopyIPFSUri = async () => {
    if (!currentProject?.ipfsUri) return;

    try {
      await navigator.clipboard.writeText(currentProject.ipfsUri);
      toast.success("IPFS URI copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy IPFS URI");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share Project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project via IPFS</DialogTitle>
          <DialogDescription>
            Save your project to IPFS and share it with others, or load a shared
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Save and Share Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Save & Share Current Project
            </Label>

            {currentProject ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium">
                    {currentProject.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last updated:{" "}
                    {new Date(currentProject.updatedAt).toLocaleString()}
                  </div>
                  {currentProject.isDirty && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSaveAndShare}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Saving to IPFS...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Save to IPFS & Generate Share Link
                    </>
                  )}
                </Button>

                {shareUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs">Shareable URL:</Label>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly className="text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyUrl}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentProject.ipfsUri && (
                  <div className="space-y-2">
                    <Label className="text-xs">IPFS URI:</Label>
                    <div className="flex gap-2">
                      <Input
                        value={currentProject.ipfsUri}
                        readOnly
                        className="text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyIPFSUri}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Stored on IPFS</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No project loaded. Create or open a project first.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Load Section */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium">Load Shared Project</Label>

            <div className="space-y-2">
              <Label className="text-xs">Share URL or IPFS URI:</Label>
              <Input
                placeholder="https://saywhat.app/project/share?ipfs=... or ipfs://..."
                value={loadUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setLoadUrl(e.target.value)
                }
                className="text-xs"
              />
            </div>

            <Button
              onClick={handleLoadFromUrl}
              disabled={!loadUrl.trim() || isLoadingFromIPFS}
              className="w-full"
              variant="outline"
            >
              {isLoadingFromIPFS ? (
                <>
                  <Download className="h-4 w-4 mr-2 animate-pulse" />
                  Loading from IPFS...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Load Project
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Projects are stored permanently on IPFS</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Share links work across all devices</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span>No accounts needed to access shared projects</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
