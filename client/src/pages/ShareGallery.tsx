import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, X, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const LABEL_COLORS: Record<string, string> = {
  before: "bg-orange-100 text-orange-800 border-orange-200",
  after: "bg-green-100 text-green-800 border-green-200",
  document: "bg-blue-100 text-blue-800 border-blue-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function ShareGallery() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data, isLoading } = trpc.expertCam.publicGallery.useQuery(
    { token },
    { enabled: !!token }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading gallery…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3 max-w-md px-6">
          <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Gallery not found</h1>
          <p className="text-sm text-muted-foreground">
            This link may have expired or been removed.
          </p>
        </div>
      </div>
    );
  }

  const photos = data.photos ?? [];
  const lightboxPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  function navigateLightbox(dir: 1 | -1) {
    if (lightboxIdx === null) return;
    const next = lightboxIdx + dir;
    if (next >= 0 && next < photos.length) setLightboxIdx(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-foreground truncate">
              {data.title ?? "Project Photos"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(data.createdAt).toLocaleDateString(undefined, {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No photos in this gallery yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo: any, i: number) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setLightboxIdx(i)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Project photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {photo.label && photo.label !== "other" && (
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${LABEL_COLORS[photo.label] ?? ""}`}>
                    {photo.label}
                  </span>
                )}
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs leading-tight line-clamp-2">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <div className="relative flex flex-col max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="relative flex items-center justify-center">
              <img
                src={(lightboxPhoto as any).url}
                alt={(lightboxPhoto as any).caption ?? ""}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              {lightboxIdx! > 0 && (
                <button
                  onClick={() => navigateLightbox(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {lightboxIdx! < photos.length - 1 && (
                <button
                  onClick={() => navigateLightbox(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setLightboxIdx(null)}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {((lightboxPhoto as any).caption || (lightboxPhoto as any).label) && (
              <div className="mt-3 text-center">
                {(lightboxPhoto as any).label && (lightboxPhoto as any).label !== "other" && (
                  <Badge variant="outline" className={`text-xs border mb-2 ${LABEL_COLORS[(lightboxPhoto as any).label] ?? ""}`}>
                    {(lightboxPhoto as any).label}
                  </Badge>
                )}
                {(lightboxPhoto as any).caption && (
                  <p className="text-white/80 text-sm">{(lightboxPhoto as any).caption}</p>
                )}
              </div>
            )}
            <p className="text-center text-white/40 text-xs mt-2">
              {lightboxIdx! + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border mt-8 py-6 text-center">
        <p className="text-xs text-muted-foreground">Powered by Expert Cam</p>
      </div>
    </div>
  );
}
