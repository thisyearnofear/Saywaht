"use client";

import { useTextStore, AVAILABLE_FONTS } from "@/stores/text-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "@/lib/icons";

/**
 * Text Properties Panel - Edit selected text element
 * 
 * Simplified from upstream - only essential controls.
 * Following Core Principles: minimal, DRY, no bloat.
 */

export function TextPropertiesPanel() {
  const { textElements, selectedTextId, updateTextElement, deleteTextElement, selectText } = useTextStore();
  
  const selectedText = textElements.find(t => t.id === selectedTextId);

  if (!selectedText) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a text element to edit
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Content */}
      <div>
        <Label className="text-xs">Content</Label>
        <textarea
          value={selectedText.content}
          onChange={(e) => updateTextElement(selectedText.id, { content: e.target.value })}
          className="w-full mt-1 px-3 py-2 text-sm border rounded-md resize-none"
          rows={3}
          placeholder="Enter text..."
        />
      </div>

      {/* Font Family */}
      <div>
        <Label className="text-xs">Font</Label>
        <select
          value={selectedText.fontFamily}
          onChange={(e) => updateTextElement(selectedText.id, { fontFamily: e.target.value })}
          className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
        >
          {AVAILABLE_FONTS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <Label className="text-xs">Size: {selectedText.fontSize}px</Label>
        <input
          type="range"
          min="12"
          max="120"
          value={selectedText.fontSize}
          onChange={(e) => updateTextElement(selectedText.id, { fontSize: Number(e.target.value) })}
          className="w-full mt-1"
        />
      </div>

      {/* Color */}
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1">
          <input
            type="color"
            value={selectedText.color}
            onChange={(e) => updateTextElement(selectedText.id, { color: e.target.value })}
            className="w-12 h-10 rounded border cursor-pointer"
          />
          <Input
            type="text"
            value={selectedText.color}
            onChange={(e) => updateTextElement(selectedText.id, { color: e.target.value })}
            className="flex-1 text-sm"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <Label className="text-xs">Weight</Label>
        <select
          value={selectedText.fontWeight || "normal"}
          onChange={(e) => updateTextElement(selectedText.id, { fontWeight: e.target.value as "normal" | "bold" })}
          className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>

      {/* Text Align */}
      <div>
        <Label className="text-xs">Align</Label>
        <select
          value={selectedText.textAlign || "center"}
          onChange={(e) => updateTextElement(selectedText.id, { textAlign: e.target.value as "left" | "center" | "right" })}
          className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X: {Math.round(selectedText.x * 100)}%</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedText.x}
            onChange={(e) => updateTextElement(selectedText.id, { x: Number(e.target.value) })}
            className="w-full mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Y: {Math.round(selectedText.y * 100)}%</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedText.y}
            onChange={(e) => updateTextElement(selectedText.id, { y: Number(e.target.value) })}
            className="w-full mt-1"
          />
        </div>
      </div>

      {/* Opacity */}
      <div>
        <Label className="text-xs">Opacity: {Math.round((selectedText.opacity || 1) * 100)}%</Label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={selectedText.opacity || 1}
          onChange={(e) => updateTextElement(selectedText.id, { opacity: Number(e.target.value) })}
          className="w-full mt-1"
        />
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          deleteTextElement(selectedText.id);
          selectText(null);
        }}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Text
      </Button>
    </div>
  );
}
