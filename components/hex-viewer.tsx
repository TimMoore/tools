"use client";

import { FileUp, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
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
import { Spinner } from "./ui/spinner";

interface FileState {
  filename: string;
  data: Array<{
    byte: number;
    hex: string;
    ascii: string | undefined;
  }>;
}

export function HexViewer() {
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<FileState>();

  // Handle file input change
  const handleFile = async (file: File) => {
    startTransition(async () => {
      const fileState = await loadFileAction(file);
      setFile(fileState);
    });
  };

  if (isPending) {
    return (
      <Empty className="flex-none border border-dashed">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner className="size-9" />
          </EmptyMedia>
          <EmptyTitle>Loading&hellip;</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (file) {
    return <HexContents file={file} onClearFile={() => setFile(undefined)} />;
  }

  return <FileChooser onFileChosen={handleFile} />;
}

interface HexContentsProps {
  file: FileState;
  onClearFile: () => void;
}

function HexContents({ file, onClearFile }: HexContentsProps) {
  const [hoverOffset, setHoverOffset] = useState<number>();

  const hoverInfo = useMemo(() => {
    if (hoverOffset === undefined) return undefined;

    const { hex, ascii } = file.data[hoverOffset];

    return { offset: hoverOffset, hex, ascii };
  }, [hoverOffset, file.data]);

  return (
    <section className="grow flex flex-col gap-4 overflow-hidden max-w-7xl">
      <header className="flex-none flex items-center gap-2 font-bold text-lg">
        Hex Viewer: <span>{file.filename}</span>
        <Button
          variant="outline"
          size="icon"
          className="ml-auto"
          onClick={onClearFile}
        >
          <X />
        </Button>
      </header>
      <div className="grid grid-cols-[3fr_1fr] gap-5 text-center text-sm font-mono overflow-x-hidden overflow-y-auto">
        {/* Hex values */}
        <div
          className="flex flex-wrap gap-x-2.5"
          onMouseLeave={() => {
            setHoverOffset(undefined);
          }}
        >
          {file.data.map(({ hex }, offset) => (
            <div
              key={offset}
              className={cn(
                "w-5",
                hoverOffset === offset && "bg-primary text-background"
              )}
              onMouseEnter={() => setHoverOffset(offset)}
            >
              {hex}
            </div>
          ))}
        </div>
        {/* ASCII representation */}
        <div
          className="flex flex-wrap"
          onMouseLeave={() => {
            setHoverOffset(undefined);
          }}
        >
          {file.data.map(({ ascii }, offset) => (
            <div
              key={offset}
              className={cn(
                "w-2.5",
                hoverOffset === offset && "bg-primary text-background"
              )}
              onMouseEnter={() => setHoverOffset(offset)}
            >
              {ascii ?? (
                <span
                  className={cn(
                    hoverOffset === offset
                      ? "text-muted"
                      : "text-muted-foreground"
                  )}
                >
                  &bull;
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <footer className="flex-none flex items-center gap-2 text-xs text-muted-foreground">
        {hoverInfo !== undefined && (
          <>
            <strong>Offset</strong>
            <span>
              {hoverInfo.offset} (0x{toHex(hoverInfo.offset)})
            </span>
            <strong>Hex</strong>
            <span>{hoverInfo.hex}</span>
            {hoverInfo.ascii !== undefined && (
              <>
                <strong>ASCII</strong>
                <span>{hoverInfo.ascii}</span>
              </>
            )}
          </>
        )}
        <span className="ml-auto">{file.data.length} bytes</span>
      </footer>
    </section>
  );
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

async function loadFileAction(file: File): Promise<FileState> {
  const data = Array.from(new Uint8Array(await file.arrayBuffer())).map(
    (byte) => ({
      byte,
      hex: toHex(byte),
      ascii: toASCII(byte),
    })
  );
  return { filename: file.name, data };
}

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

function toASCII(byte: number): string | undefined {
  // Display printable ASCII characters: 32 (space) to 126 (~)
  if (byte >= 32 && byte <= 126) {
    return String.fromCharCode(byte);
  }
}
