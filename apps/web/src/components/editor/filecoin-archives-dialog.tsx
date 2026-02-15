"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, HardDrive, Trash2 } from "@/lib/icons";
import {
  clearFilecoinArchives,
  loadFilecoinArchives,
  type FilecoinArchiveRecord,
} from "@/lib/filecoin-archives";
import { toast } from "sonner";

function ArchiveRow({ item }: { item: FilecoinArchiveRecord }) {
  const createdAtLabel = useMemo(() => {
    try {
      return new Date(item.createdAt).toLocaleString();
    } catch {
      return item.createdAt;
    }
  }, [item.createdAt]);

  const copyManifest = async () => {
    try {
      await navigator.clipboard.writeText(item.manifestUrl);
      toast.success("Manifest URL copied");
    } catch {
      toast.error("Failed to copy manifest URL");
    }
  };

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.projectName}</p>
          <p className="text-xs text-muted-foreground">{createdAtLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px]">
            Filecoin
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => window.open(item.videoUrl, "_blank")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Video
        </Button>
        {item.transcriptUrl && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => window.open(item.transcriptUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Captions
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => window.open(item.manifestUrl, "_blank")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Manifest
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={copyManifest}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy URL
        </Button>
      </div>
    </div>
  );
}

export function FilecoinArchivesDialog() {
  const [open, setOpen] = useState(false);
  const [archives, setArchives] = useState<FilecoinArchiveRecord[]>([]);

  const refresh = () => setArchives(loadFilecoinArchives().slice().reverse());

  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) refresh();
  };

  const clearAll = () => {
    clearFilecoinArchives();
    setArchives([]);
    toast.success("Cleared local archive history");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="text" size="sm" className="text-xs font-medium">
          <HardDrive className="h-4 w-4 mr-1" />
          Archives
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Filecoin Archives</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {archives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No archived exports found yet.
            </p>
          ) : (
            archives.map((item) => (
              <ArchiveRow
                key={`${item.projectId}-${item.manifestUrl}`}
                item={item}
              />
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={clearAll}
            disabled={archives.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear Local History
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
