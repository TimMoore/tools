"use client";

import { FileUp, X } from "lucide-react";
import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

const CELL_WIDTH_PX = 20;
const CELL_GAP_PX = 10;

function HexContents({ file, onClearFile }: HexContentsProps) {
  const [hoverOffset, setHoverOffset] = useState<number>();
  const [columns, setColumns] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const hoverInfo = useMemo(() => {
    if (hoverOffset === undefined) return undefined;

    const { hex, ascii } = file.data[hoverOffset];

    return { offset: hoverOffset, hex, ascii };
  }, [hoverOffset, file.data]);

  // Use fixed cell width for column calculation
  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const nextCols = Math.max(
        1,
        Math.floor(width / (CELL_WIDTH_PX + CELL_GAP_PX))
      );
      setColumns(nextCols);
    }
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Row count for virtualization
  const rowCount = columns > 0 ? Math.ceil(file.data.length / columns) : 0;

  // Virtualizer (each row has fixed height ~24px)
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 24,
    overscan: 8,
  });

  // Grid template columns style (shared by both grids per row)
  const gridTemplate =
    columns > 0
      ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
      : {};

  return (
    <section className="grow flex flex-col gap-4 overflow-hidden max-w-7xl min-w-0 w-full">
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
      <div
        ref={containerRef}
        className="w-full min-w-0 overflow-x-hidden overflow-y-auto text-center text-sm font-mono"
        style={{ height: rowCount * 24 }}
        onMouseLeave={() => setHoverOffset(undefined)}
      >
        {columns === 0 && (
          <div className="py-4 text-muted-foreground">Measuring…</div>
        )}
        {columns > 0 && (
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const startOffset = rowIndex * columns;
              const slice = file.data.slice(startOffset, startOffset + columns);
              return (
                <div
                  key={virtualRow.key}
                  className={cn("absolute left-0 w-full flex gap-5")}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="grid gap-x-2.5" style={gridTemplate}>
                    {slice.map(({ hex }, i) => {
                      const offset = startOffset + i;
                      return (
                        <div
                          key={offset}
                          className={cn(
                            "w-5",
                            hoverOffset === offset &&
                              "bg-primary text-background"
                          )}
                          onMouseEnter={() => setHoverOffset(offset)}
                        >
                          {hex}
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid" style={gridTemplate}>
                    {slice.map(({ ascii }, i) => {
                      const offset = startOffset + i;
                      return (
                        <div
                          key={offset}
                          className={cn(
                            "w-2.5 text-center",
                            hoverOffset === offset &&
                              "bg-primary text-background"
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <span>{columns} columns</span>
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
