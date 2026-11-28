import React from 'react';
import { Annotation } from '../types/sketchfab';
import { Target } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnnotationsPanelProps {
  annotations: Annotation[];
  goToAnnotation: (index: number) => void;
  isLoading?: boolean;
}

export function AnnotationsPanel({ annotations, goToAnnotation, isLoading }: AnnotationsPanelProps) {
  // Utility to strip HTML tags from annotation content
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-l border-sidebar-border w-80">
      <div className="p-4 border-b border-sidebar-border bg-sidebar flex-shrink-0">
        <h2 className="text-sm font-semibold tracking-wide text-sidebar-foreground uppercase">
          Annotations {annotations.length > 0 && <span className="text-muted-foreground font-normal normal-case">({annotations.length})</span>}
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1.5">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-8 animate-pulse">
              Loading annotations...
            </p>
          ) : annotations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No annotations found.
            </p>
          ) : (
            annotations.map((annotation, i) => (
              <button
                key={i}
                onClick={() => goToAnnotation(i)}
                className="flex flex-col text-left group p-3 rounded-md border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent transition-colors w-full focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <div className="flex items-center gap-2 mb-1 w-full">
                  <div className="bg-primary/10 text-primary p-1 rounded">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-sidebar-foreground truncate flex-1">
                    {annotation.name}
                  </span>
                </div>
                {annotation.content?.raw && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {stripHtml(annotation.content.raw)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
