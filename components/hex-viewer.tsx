"use client";

import { FileUp, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "./ui/empty";

interface FileState {
  filename: string;
  bytes: Uint8Array;
}

export function HexViewer() {
  const [file, setFile] = useState<FileState | "pending">();

  // Handle file input change
  const handleFile = async (file: File) => {
    setFile("pending");
    const arrayBuffer = await file.arrayBuffer();
    setFile({ filename: file.name, bytes: new Uint8Array(arrayBuffer) });
  };

  if (file) {
    if (file === "pending") {
      return <p>Loading…</p>;
    }

    return (
      <section className="grow flex flex-col gap-2 overflow-hidden">
        <header className="flex-none flex items-center font-bold text-lg gap-2">
          Hex Viewer: <span>{file.filename}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setFile(undefined)}
          >
            <X />
          </Button>
        </header>
        <pre className="text-sm font-mono whitespace-pre-wrap max-w-7xl text-center overflow-x-hidden overflow-y-auto">
          {Array.from(file.bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")}
        </pre>
        <footer className="flex-none ml-auto p-2 text-xs text-muted-foreground">
          {file.bytes.length} bytes
        </footer>
      </section>
    );
  }

  return <FileChooser onFileChosen={handleFile} />;
}

interface FileChooserProps {
  onFileChosen: (file: File) => void;
}

function FileChooser({ onFileChosen }: FileChooserProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  // Handle file input element
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileChosen(file);
  };

  // Drag and drop handlers for visual feedback
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChosen(file);
  };

  return (
    <Empty
      className={cn(
        "flex-none border border-dashed transition-colors",
        isDragActive && "border-primary bg-accent"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileUp />
        </EmptyMedia>
        <EmptyTitle>Choose a File</EmptyTitle>
        <EmptyDescription>
          Choose a file or drag and drop it here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <label>
          <input type="file" className="hidden" onChange={handleInputChange} />
          <Button variant="outline" size="sm" asChild>
            <span>Choose File</span>
          </Button>
        </label>
      </EmptyContent>
    </Empty>
  );
}
