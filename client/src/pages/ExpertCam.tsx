import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  Camera,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Trash2,
  LayoutGrid,
  Layers,
  SplitSquareHorizontal,
  Download,
  CheckSquare,
  Square,
  FileVideo,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

const LABEL_COLORS: Record<string, string> = {
  before:   "bg-orange-100 text-orange-800 border-orange-200",
  after:    "bg-green-100 text-green-800 border-green-200",
  document: "bg-blue-100 text-blue-800 border-blue-200",
  other:    "bg-gray-100 text-gray-700 border-gray-200",
};
const LABEL_OPTS = ["all", "before", "after", "document", "other"] as const;
type ViewMode = "grid" | "timeline";

interface PhotoRow {
  id: number; url: string; label: string | null; caption: string | null;
  mimeType: string | null; filename: string | null; createdAt: Date | string;
  attachableType: string; attachableId: number;
  jobNumber: number | null; jobTitle: string | null;
  customerFirstName: string | null; customerLastName: string | null;
}

export default function ExpertCam() {
  const utils = trpc.useUtils();
  const [labelFilter, setLabelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [lightboxList, setLightboxList] = useState<PhotoRow[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: rawPhotos = [], isLoading } = trpc.attachments.listAllWithJob.useQuery();

  const deleteMutation = trpc.attachments.delete.useMutation({
    onSuccess: () => { utils.attachments.listAllWithJob.invalidate(); setLightboxIdx(null); toast.success("Deleted"); },
  });
  const updateMutation = trpc.attachments.update.useMutation({
    onSuccess: () => utils.attachments.listAllWithJob.invalidate(),
  });

  // Filter
  const filtered = (rawPhotos as PhotoRow[])
    .filter(p => !p.mimeType || p.mimeType.startsWith("image/"))
    .filter(p => labelFilter === "all" || p.label === labelFilter)
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.filename?.toLowerCase().includes(q) ||
        p.caption?.toLowerCase().includes(q) ||
        p.jobTitle?.toLowerCase().includes(q) ||
        String(p.jobNumber ?? "").includes(q) ||
        `${p.customerFirstName ?? ""} ${p.customerLastName ?? ""}`.toLowerCase().includes(q)
      );
    });

  // Group by job for timeline
  const jobGroups = (() => {
    const map = new Map<number, { jobId: number; jobNumber: number | null; jobTitle: string | null; customer: string; photos: PhotoRow[] }>();
    for (const p of filtered) {
      const key = p.attachableId;
      if (!map.has(key)) {
        map.set(key, {
          jobId: p.attachableId,
          jobNumber: p.jobNumber,
          jobTitle: p.jobTitle,
          customer: [p.customerFirstName, p.customerLastName].filter(Boolean).join(" ") || "Unknown",
          photos: [],
        });
      }
      map.get(key)!.photos.push(p);
    }
    return Array.from(map.values());
  })();

  const lightboxPhoto = lightboxIdx !== null ? lightboxList[lightboxIdx] : null;

  // Before/after compare for lightbox context
  const contextJob = lightboxPhoto ? jobGroups.find(g => g.jobId === lightboxPhoto.attachableId) : null;
  const beforePhotos = contextJob?.photos.filter(p => p.label === "before") ?? [];
  const afterPhotos  = contextJob?.photos.filter(p => p.label === "after")  ?? [];
  const canCompare   = beforePhotos.length > 0 && afterPhotos.length > 0;
  const compareBefore = beforePhotos[0];
  const compareAfter  = afterPhotos[0];

  function openLightbox(photo: PhotoRow, list: PhotoRow[]) {
    if (selectMode) { toggleSelect(photo.id); return; }
    setLightboxList(list);
    setLightboxIdx(list.findIndex(p => p.id === photo.id));
    setCompareMode(false);
  }

  function nav(dir: 1 | -1) {
    if (lightboxIdx === null) return;
    const next = lightboxIdx + dir;
    if (next >= 0 && next < lightboxList.length) { setLightboxIdx(next); setCompareMode(false); }
  }

  function toggleSelect(id: number) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    for (const id of ids) await deleteMutation.mutateAsync({ id });
    setSelected(new Set());
    toast.success(`Deleted ${ids.length} photo${ids.length !== 1 ? "s" : ""}`);
  }

  async function bulkLabel(label: string) {
    for (const id of selected) await updateMutation.mutateAsync({ id, label });
    setSelected(new Set());
    toast.success(`Labeled ${selected.size} photo${selected.size !== 1 ? "s" : ""}`);
  }

  function downloadPhoto(url: string, filename: string | null) {
    const a = document.createElement("a");
    a.href = url; a.download = filename ?? "photo"; a.target = "_blank"; a.click();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Feature Status */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Feature Status: Stubbed</strong> — Photo documentation module is not production-ready. This feature is available for testing but not yet recommended for regular use. Full integration into field workflows is planned for a future release.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />Expert Cam
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Photo documentation across all jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={viewMode === "grid" ? "default" : "outline"} onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />Grid
          </Button>
          <Button size="sm" variant={viewMode === "timeline" ? "default" : "outline"} onClick={() => setViewMode("timeline")}>
            <Layers className="h-3.5 w-3.5 mr-1.5" />By Job
          </Button>
          {filtered.length > 0 && (
            <Button size="sm" variant={selectMode ? "default" : "outline"}
              onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}>
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />{selectMode ? "Done" : "Select"}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, clients, captions…" className="pl-9 h-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="All labels" />
          </SelectTrigger>
          <SelectContent>
            {LABEL_OPTS.map(l => (
              <SelectItem key={l} value={l}>{l === "all" ? "All labels" : l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} photo{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
          <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No photos found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload photos from any{" "}
            <Link href="/admin/jobs"><span className="text-primary hover:underline cursor-pointer">job</span></Link>{" "}
            to see them here.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Flat grid ── */
        <PhotoGrid photos={filtered} onOpen={p => openLightbox(p, filtered)}
          onDelete={id => deleteMutation.mutate({ id })}
          onLabel={(id, label) => updateMutation.mutate({ id, label })}
          selectMode={selectMode} selected={selected} onToggleSelect={toggleSelect} />
      ) : (
        /* ── Timeline: grouped by job ── */
        <div className="space-y-8">
          {jobGroups.map(group => (
            <div key={group.jobId}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/jobs/${group.jobId}`}>
                      <span className="font-semibold text-foreground hover:underline cursor-pointer">
                        Job #{group.jobNumber ?? group.jobId}
                      </span>
                    </Link>
                    {group.jobTitle && <span className="text-sm text-muted-foreground truncate">— {group.jobTitle}</span>}
                    <span className="text-xs text-muted-foreground">{group.customer}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.photos.length} photo{group.photos.length !== 1 ? "s" : ""}</p>
                </div>
                {/* Before/after indicator */}
                {group.photos.some(p => p.label === "before") && group.photos.some(p => p.label === "after") && (
                  <Badge variant="outline" className="text-xs gap-1 shrink-0">
                    <SplitSquareHorizontal className="h-3 w-3" />Before/After
                  </Badge>
                )}
                <Link href={`/admin/jobs/${group.jobId}`}>
                  <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2 text-xs">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />Open Job
                  </Button>
                </Link>
              </div>
              <PhotoGrid photos={group.photos} onOpen={p => openLightbox(p, group.photos)}
                onDelete={id => deleteMutation.mutate({ id })}
                onLabel={(id, label) => updateMutation.mutate({ id, label })}
                selectMode={selectMode} selected={selected} onToggleSelect={toggleSelect} />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && lightboxPhoto && (
        <Dialog open onOpenChange={() => { setLightboxIdx(null); setCompareMode(false); }}>
          <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-0">

            {compareMode ? (
              /* ── Compare view ── */
              <div>
                <div className="grid grid-cols-2 divide-x divide-white/10 min-h-[55vh]">
                  {[{ photo: compareBefore, label: "Before" }, { photo: compareAfter, label: "After" }].map(({ photo, label }) => (
                    <div key={label} className="relative flex items-center justify-center bg-black">
                      {photo ? (
                        <>
                          <img src={photo.url} alt={label} className="max-w-full max-h-[55vh] object-contain" />
                          <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full border ${label === "Before" ? LABEL_COLORS.before : LABEL_COLORS.after}`}>
                            {label}
                          </span>
                        </>
                      ) : (
                        <p className="text-white/40 text-sm">No {label.toLowerCase()} photo</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-neutral-900 px-4 py-3 flex items-center justify-between">
                  <span className="text-white/50 text-xs">
                    Job #{lightboxPhoto.jobNumber} — {[lightboxPhoto.customerFirstName, lightboxPhoto.customerLastName].filter(Boolean).join(" ")}
                  </span>
                  <Button size="sm" variant="outline"
                    className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                    onClick={() => setCompareMode(false)}
                  ><SplitSquareHorizontal className="h-3.5 w-3.5 mr-1.5" />Single View</Button>
                </div>
              </div>
            ) : (
              /* ── Normal lightbox ── */
              <div>
                <div className="relative flex items-center justify-center min-h-[58vh] bg-black">
                  <img src={lightboxPhoto.url} alt={lightboxPhoto.caption ?? ""}
                    className="max-w-full max-h-[65vh] object-contain" />
                  {lightboxIdx > 0 && (
                    <button onClick={() => nav(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {lightboxIdx < lightboxList.length - 1 && (
                    <button onClick={() => nav(1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  <button onClick={() => { setLightboxIdx(null); setCompareMode(false); }}
                    className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
                    <X className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                    {lightboxIdx + 1} / {lightboxList.length}
                  </span>
                </div>
                <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-300 truncate">
                      {lightboxPhoto.caption || <span className="italic text-neutral-500">No caption</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {lightboxPhoto.label && lightboxPhoto.label !== "other" && (
                        <Badge variant="outline" className={`text-xs border ${LABEL_COLORS[lightboxPhoto.label] ?? ""}`}>
                          {lightboxPhoto.label}
                        </Badge>
                      )}
                      <span className="text-xs text-neutral-500">
                        {new Date(lightboxPhoto.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <Link href={`/admin/jobs/${lightboxPhoto.attachableId}`}>
                        <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                          <ExternalLink className="h-3 w-3" />Job #{lightboxPhoto.jobNumber}
                        </span>
                      </Link>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canCompare && (lightboxPhoto.label === "before" || lightboxPhoto.label === "after") && (
                      <Button size="sm" variant="outline"
                        className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                        onClick={() => setCompareMode(true)}
                      ><SplitSquareHorizontal className="h-3.5 w-3.5 mr-1.5" />Compare</Button>
                    )}
                    <Button size="sm" variant="outline"
                      className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                      onClick={() => { const a = document.createElement("a"); a.href = lightboxPhoto.url; a.download = lightboxPhoto.filename ?? "photo"; a.target = "_blank"; a.click(); }}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline"
                      className="text-red-400 border-neutral-600 hover:bg-neutral-700 hover:text-red-400"
                      onClick={() => deleteMutation.mutate({ id: lightboxPhoto.id })}
                    ><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Bulk action bar ── */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background rounded-xl shadow-2xl px-5 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="bg-background/20 text-background hover:bg-background/30 border-0">
                <Tag className="h-3.5 w-3.5 mr-1.5" />Label
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(["before","after","document","other"] as const).map(l => (
                <DropdownMenuItem key={l} onClick={() => bulkLabel(l)}>Mark as {l}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-background/60 hover:text-background text-xs underline">
            Deselect all
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared photo grid component ───────────────────────────────────────────────
function PhotoGrid({ photos, onOpen, onDelete, onLabel, selectMode = false, selected = new Set<number>(), onToggleSelect }: {
  photos: PhotoRow[];
  onOpen: (p: PhotoRow) => void;
  onDelete: (id: number) => void;
  onLabel: (id: number, label: string) => void;
  selectMode?: boolean;
  selected?: Set<number>;
  onToggleSelect?: (id: number) => void;
}) {
  function downloadPhoto(url: string, filename: string | null) {
    const a = document.createElement("a"); a.href = url; a.download = filename ?? "photo"; a.target = "_blank"; a.click();
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {photos.map(photo => {
        const isVideo = photo.mimeType?.startsWith("video/");
        const isSel = selected.has(photo.id);
        return (
          <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
            {isVideo ? (
              <video src={photo.url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
            ) : (
              <img src={photo.url} alt={photo.caption ?? photo.filename ?? ""}
                className="w-full h-full object-cover" loading="lazy" />
            )}
            {/* Click overlay */}
            <div className={`absolute inset-0 cursor-pointer transition-opacity ${isSel ? "bg-primary/20" : "group-hover:bg-black/10"}`}
              onClick={() => selectMode && onToggleSelect ? onToggleSelect(photo.id) : onOpen(photo)} />
            {isVideo && !selectMode && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <FileVideo className="h-8 w-8 text-white drop-shadow" />
              </div>
            )}
            {photo.label && photo.label !== "other" && (
              <span className={`absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border pointer-events-none ${LABEL_COLORS[photo.label] ?? ""}`}>
                {photo.label}
              </span>
            )}
            {/* Select checkbox */}
            {selectMode && (
              <div className="absolute top-1.5 right-1.5 pointer-events-none">
                {isSel
                  ? <CheckSquare className="h-5 w-5 text-primary drop-shadow" />
                  : <Square className="h-5 w-5 text-white/80 drop-shadow" />}
              </div>
            )}
            {/* Hover menu */}
            {!selectMode && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="secondary" className="h-6 w-6 shadow"><MoreVertical className="h-3 w-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/jobs/${photo.attachableId}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Go to Job
                      </Link>
                    </DropdownMenuItem>
                    {(["before","after","document","other"] as const).map(l => (
                      <DropdownMenuItem key={l} onClick={() => onLabel(photo.id, l)}
                        className={photo.label === l ? "font-semibold" : ""}
                      >Label: {l}</DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => downloadPhoto(photo.url, photo.filename)}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />Download
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(photo.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
