import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Camera, Upload, X, ChevronLeft, ChevronRight,
  MoreVertical, Trash2, Tag, Sparkles, Share2, Copy,
  Link2, SplitSquareHorizontal, Plus, Check, Download,
  CheckSquare, Square, FileVideo, Clipboard,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const LABEL_COLORS: Record<string, string> = {
  before:   "bg-orange-100 text-orange-800 border-orange-200",
  after:    "bg-green-100 text-green-800 border-green-200",
  document: "bg-blue-100 text-blue-800 border-blue-200",
  other:    "bg-gray-100 text-gray-700 border-gray-200",
};
const LABEL_OPTS = ["before", "after", "document", "other"] as const;
const TAG_COLORS = ["blue","green","orange","red","purple","pink","yellow","gray"] as const;
type TagColor = (typeof TAG_COLORS)[number];
const TAG_DOT: Record<TagColor, string> = {
  blue:"bg-blue-500", green:"bg-green-500", orange:"bg-orange-500", red:"bg-red-500",
  purple:"bg-purple-500", pink:"bg-pink-500", yellow:"bg-yellow-400", gray:"bg-gray-400",
};

interface Photo {
  id: number; url: string; filename: string | null;
  label: string | null; caption: string | null;
  mimeType: string | null; createdAt: Date | string;
}
interface MediaTag { id: number; name: string; color: string | null; }

// ── Video thumbnail ───────────────────────────────────────────────────────────
function MediaThumb({ photo, onClick, selected, selectMode }: {
  photo: Photo; onClick: () => void; selected: boolean; selectMode: boolean;
}) {
  const isVideo = photo.mimeType?.startsWith("video/");
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
      {isVideo ? (
        <video src={photo.url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
      ) : (
        <img src={photo.url} alt={photo.caption ?? photo.filename ?? "Photo"}
          className="w-full h-full object-cover" loading="lazy" />
      )}
      {/* Overlay for click */}
      <div className={`absolute inset-0 cursor-pointer transition-opacity ${selected ? "bg-primary/20" : "group-hover:bg-black/10"}`}
        onClick={onClick} />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <FileVideo className="h-8 w-8 text-white drop-shadow" />
        </div>
      )}
      {photo.label && photo.label !== "other" && (
        <span className={`absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border pointer-events-none ${LABEL_COLORS[photo.label] ?? LABEL_COLORS.other}`}>
          {photo.label}
        </span>
      )}
      {/* Select checkbox */}
      {selectMode && (
        <div className="absolute top-1.5 right-1.5 pointer-events-none">
          {selected
            ? <CheckSquare className="h-5 w-5 text-primary drop-shadow" />
            : <Square className="h-5 w-5 text-white/80 drop-shadow" />}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JobPhotosTab({ jobId, jobTitle }: { jobId: number; jobTitle?: string }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: photos = [], isLoading } = trpc.attachments.list.useQuery(
    { attachableType: "job", attachableId: jobId }, { enabled: jobId > 0 }
  );
  const { data: tags = [] } = trpc.expertCam.tags.list.useQuery();
  const { data: shareLinks = [] } = trpc.expertCam.shareLinks.list.useQuery({ jobId });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => utils.attachments.list.invalidate({ attachableType: "job", attachableId: jobId });
  const uploadMutation = trpc.attachments.upload.useMutation({
    onSuccess: () => { invalidate(); toast.success("Photo uploaded"); },
    onError: () => toast.error("Upload failed"),
  });
  const deleteMutation = trpc.attachments.delete.useMutation({
    onSuccess: () => { invalidate(); setLightboxIdx(null); },
  });
  const updateMutation = trpc.attachments.update.useMutation({ onSuccess: invalidate });
  const createShareMutation = trpc.expertCam.shareLinks.create.useMutation({
    onSuccess: ({ token }) => {
      utils.expertCam.shareLinks.list.invalidate({ jobId });
      copyText(`${window.location.origin}/share/${token}`);
      toast.success("Share link copied");
    },
  });
  const aiCaptionMutation = trpc.expertCam.aiCaption.useMutation({
    onSuccess: ({ caption }) => {
      if (caption && lightboxPhoto) { updateMutation.mutate({ id: lightboxPhoto.id, caption }); toast.success("Caption generated"); }
    },
    onError: () => toast.error("Caption failed"),
  });
  const aiSummaryMutation = trpc.expertCam.aiJobSummary.useMutation({
    onSuccess: ({ summary }) => { setSummaryText(summary); setShowSummary(true); },
    onError: () => toast.error("Summary failed"),
  });
  const createTagMutation = trpc.expertCam.tags.create.useMutation({
    onSuccess: () => { utils.expertCam.tags.list.invalidate(); setNewTagName(""); setShowTagCreate(false); },
  });
  const deleteTagMutation = trpc.expertCam.tags.delete.useMutation({
    onSuccess: () => utils.expertCam.tags.list.invalidate(),
  });
  const assignTagMutation = trpc.expertCam.photoTags.assign.useMutation({
    onSuccess: () => utils.expertCam.photoTags.get.invalidate(),
  });
  const removeTagMutation = trpc.expertCam.photoTags.remove.useMutation({
    onSuccess: () => utils.expertCam.photoTags.get.invalidate(),
  });

  // ── State ─────────────────────────────────────────────────────────────────
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showTagCreate, setShowTagCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<TagColor>("blue");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────
  const allMedia = photos as Photo[];
  const imgPhotos = allMedia.filter(p => !p.mimeType || p.mimeType.startsWith("image/") || p.mimeType.startsWith("video/"));
  const imgOnlyUrls = allMedia.filter(p => !p.mimeType || p.mimeType.startsWith("image/")).map(p => p.url);
  const lightboxPhoto = lightboxIdx !== null ? imgPhotos[lightboxIdx] : null;

  const beforePhotos = imgPhotos.filter(p => p.label === "before");
  const afterPhotos  = imgPhotos.filter(p => p.label === "after");
  const canCompare   = beforePhotos.length > 0 && afterPhotos.length > 0;
  const compareIdx   = Math.min(lightboxIdx ?? 0, Math.min(beforePhotos.length, afterPhotos.length) - 1);

  const { data: photoTagData = [] } = trpc.expertCam.photoTags.get.useQuery(
    { attachmentId: lightboxPhoto?.id ?? 0 }, { enabled: !!lightboxPhoto }
  );
  const photoTagIds = new Set((photoTagData as MediaTag[]).map(t => t.id));

  // ── Helpers ───────────────────────────────────────────────────────────────
  function copyText(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} exceeds 20 MB`); continue; }
      const base64: string = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res((e.target?.result as string).split(",")[1]);
        r.readAsDataURL(file);
      });
      await uploadMutation.mutateAsync({
        attachableType: "job", attachableId: jobId,
        filename: file.name, mimeType: file.type, base64, label: "other",
      });
    }
    setUploading(false);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files);
  }, [jobId]);

  function nav(dir: 1 | -1) {
    if (lightboxIdx === null) return;
    const next = lightboxIdx + dir;
    if (next >= 0 && next < imgPhotos.length) { setLightboxIdx(next); setCompareMode(false); }
  }

  function toggleSelect(id: number) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function clickPhoto(i: number) {
    if (selectMode) { toggleSelect(imgPhotos[i].id); }
    else { setLightboxIdx(i); setCompareMode(false); }
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

  function toggleTag(tagId: number) {
    if (!lightboxPhoto) return;
    if (photoTagIds.has(tagId)) removeTagMutation.mutate({ attachmentId: lightboxPhoto.id, tagId });
    else assignTagMutation.mutate({ attachmentId: lightboxPhoto.id, tagId });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-1.5" />{uploading ? "Uploading…" : "Upload"}
        </Button>
        <Button size="sm" variant="outline" className="lg:hidden" disabled={uploading}
          onClick={() => { fileRef.current?.setAttribute("capture","environment"); fileRef.current?.click(); }}>
          <Camera className="h-4 w-4 mr-1.5" />Capture
        </Button>
        {canCompare && (
          <Button size="sm" variant="outline"
            onClick={() => { setCompareMode(true); setLightboxIdx(0); setSelectMode(false); }}>
            <SplitSquareHorizontal className="h-4 w-4 mr-1.5" />Before / After
          </Button>
        )}
        {imgOnlyUrls.length > 0 && (
          <Button size="sm" variant="outline"
            disabled={aiSummaryMutation.isPending}
            onClick={() => aiSummaryMutation.mutate({ jobId, photoUrls: imgOnlyUrls, jobContext: jobTitle })}>
            <Sparkles className="h-4 w-4 mr-1.5" />{aiSummaryMutation.isPending ? "Generating…" : "AI Summary"}
          </Button>
        )}
        {imgPhotos.length > 0 && (
          <Button size="sm" variant="outline"
            onClick={() => createShareMutation.mutate({ jobId, type: "gallery", title: jobTitle ?? `Job #${jobId} Gallery` })}
            disabled={createShareMutation.isPending}>
            <Share2 className="h-4 w-4 mr-1.5" />Share
          </Button>
        )}
        {imgPhotos.length > 0 && (
          <Button size="sm" variant={selectMode ? "default" : "outline"}
            onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}>
            <CheckSquare className="h-4 w-4 mr-1.5" />{selectMode ? "Done" : "Select"}
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {imgPhotos.length} file{imgPhotos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />

      {/* ── Share links ── */}
      {(shareLinks as any[]).length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Share Links</p>
          {(shareLinks as any[]).map(link => {
            const url = `${window.location.origin}/share/${link.token}`;
            return (
              <div key={link.id} className="flex items-center gap-2 text-sm">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground flex-1 text-xs">{url}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2"
                  onClick={() => { copyText(url); toast.success("Copied"); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tags manager ── */}
      <div className="flex items-center gap-2 flex-wrap min-h-[1.75rem]">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</span>
        {(tags as MediaTag[]).map(tag => (
          <span key={tag.id} className="flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5 border">
            <span className={`h-2 w-2 rounded-full shrink-0 ${TAG_DOT[(tag.color as TagColor) ?? "gray"] ?? "bg-gray-400"}`} />
            {tag.name}
            <button onClick={() => deleteTagMutation.mutate({ id: tag.id })}
              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {!showTagCreate ? (
          <button onClick={() => setShowTagCreate(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="h-3 w-3" />New Tag
          </button>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {TAG_COLORS.map(c => (
              <button key={c} onClick={() => setNewTagColor(c)}
                className={`h-4 w-4 rounded-full ${TAG_DOT[c]} ring-offset-1 ${newTagColor === c ? "ring-2 ring-foreground" : ""}`} />
            ))}
            <Input value={newTagName} onChange={e => setNewTagName(e.target.value)}
              placeholder="Name" className="h-6 text-xs w-24 px-2"
              onKeyDown={e => { if (e.key === "Enter" && newTagName.trim()) createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor }); }} />
            <Button size="sm" className="h-6 px-2 text-xs" disabled={!newTagName.trim()}
              onClick={() => createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor })}>Add</Button>
            <Button size="sm" variant="ghost" className="h-6 px-1"
              onClick={() => { setShowTagCreate(false); setNewTagName(""); }}><X className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      {/* ── Drop zone + grid ── */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl transition-colors ${isDragging ? "ring-2 ring-primary bg-primary/5" : ""}`}
      >
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : imgPhotos.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}>
            <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Drop photos here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Images & video up to 20 MB each</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {imgPhotos.map((photo, i) => (
              <div key={photo.id} className="relative group">
                <MediaThumb photo={photo} onClick={() => clickPhoto(i)}
                  selected={selected.has(photo.id)} selectMode={selectMode} />
                {/* Hover menu (hidden in select mode) */}
                {!selectMode && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-6 w-6 shadow"><MoreVertical className="h-3 w-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {LABEL_OPTS.map(l => (
                          <DropdownMenuItem key={l} onClick={() => updateMutation.mutate({ id: photo.id, label: l })}
                            className={photo.label === l ? "font-semibold" : ""}>Label: {l}</DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => downloadPhoto(photo.url, photo.filename)}>
                          <Download className="h-3.5 w-3.5 mr-1.5" />Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: photo.id })}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
              {LABEL_OPTS.map(l => (
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

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <Dialog open onOpenChange={() => { setLightboxIdx(null); setCompareMode(false); }}>
          <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-0">
            {compareMode ? (
              /* ── Compare view ── */
              <div>
                <div className="grid grid-cols-2 divide-x divide-white/10 min-h-[55vh]">
                  {[{ photo: beforePhotos[compareIdx] ?? beforePhotos[0], label: "Before" },
                    { photo: afterPhotos[compareIdx]  ?? afterPhotos[0],  label: "After"  }].map(({ photo, label }) => (
                    <div key={label} className="relative flex items-center justify-center bg-black min-h-[55vh]">
                      {photo ? (
                        <>
                          <img src={photo.url} alt={label} className="max-w-full max-h-[55vh] object-contain" />
                          <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full border ${label === "Before" ? LABEL_COLORS.before : LABEL_COLORS.after}`}>
                            {label}
                          </span>
                        </>
                      ) : <p className="text-white/40 text-sm">No {label.toLowerCase()} photo</p>}
                    </div>
                  ))}
                </div>
                <div className="bg-neutral-900 px-4 py-3 flex items-center justify-between">
                  <span className="text-white/50 text-xs">{Math.min(beforePhotos.length, afterPhotos.length)} pair{Math.min(beforePhotos.length, afterPhotos.length) !== 1 ? "s" : ""}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                      onClick={() => setCompareMode(false)}>
                      <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1.5" />Single View
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Normal lightbox ── */
              <div>
                <div className="relative flex items-center justify-center min-h-[58vh] bg-black">
                  {lightboxPhoto && (
                    lightboxPhoto.mimeType?.startsWith("video/") ? (
                      <video src={lightboxPhoto.url} controls className="max-w-full max-h-[65vh]" />
                    ) : (
                      <img src={lightboxPhoto.url} alt={lightboxPhoto.caption ?? ""}
                        className="max-w-full max-h-[65vh] object-contain" />
                    )
                  )}
                  {lightboxIdx > 0 && (
                    <button onClick={() => nav(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {lightboxIdx < imgPhotos.length - 1 && (
                    <button onClick={() => nav(1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  <button onClick={() => { setLightboxIdx(null); setCompareMode(false); }}
                    className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
                    <X className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                    {lightboxIdx + 1} / {imgPhotos.length}
                  </span>
                </div>

                {/* Meta + actions bar */}
                {lightboxPhoto && (
                  <div className="bg-neutral-900 text-white p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-300">
                          {lightboxPhoto.caption || <span className="italic text-neutral-500">No caption</span>}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          {lightboxPhoto.label && (
                            <Badge variant="outline" className={`text-xs border ${LABEL_COLORS[lightboxPhoto.label] ?? ""}`}>
                              {lightboxPhoto.label}
                            </Badge>
                          )}
                          {(photoTagData as MediaTag[]).map(t => (
                            <span key={t.id} className="flex items-center gap-1 text-xs bg-neutral-800 rounded-full px-2 py-0.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOT[(t.color as TagColor) ?? "gray"] ?? "bg-gray-400"}`} />
                              {t.name}
                            </span>
                          ))}
                          <span className="text-xs text-neutral-500">
                            {new Date(lightboxPhoto.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        {!lightboxPhoto.mimeType?.startsWith("video/") && (
                          <Button size="sm" variant="outline"
                            className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                            disabled={aiCaptionMutation.isPending}
                            onClick={() => aiCaptionMutation.mutate({ photoUrl: lightboxPhoto.url, jobContext: jobTitle })}>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />{aiCaptionMutation.isPending ? "Writing…" : "AI Caption"}
                          </Button>
                        )}
                        {/* Label */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white">
                              <Tag className="h-3.5 w-3.5 mr-1.5" />Label
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {LABEL_OPTS.map(l => (
                              <DropdownMenuItem key={l} onClick={() => updateMutation.mutate({ id: lightboxPhoto.id, label: l })}
                                className={lightboxPhoto.label === l ? "font-semibold" : ""}>{l}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Tags */}
                        {(tags as MediaTag[]).length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white">
                                <Tag className="h-3.5 w-3.5 mr-1.5" />Tags
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(tags as MediaTag[]).map(tag => (
                                <DropdownMenuItem key={tag.id} onClick={() => toggleTag(tag.id)}>
                                  <span className={`h-2.5 w-2.5 rounded-full mr-2 ${TAG_DOT[(tag.color as TagColor) ?? "gray"] ?? "bg-gray-400"}`} />
                                  {tag.name}
                                  {photoTagIds.has(tag.id) && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {/* Compare */}
                        {canCompare && (lightboxPhoto.label === "before" || lightboxPhoto.label === "after") && (
                          <Button size="sm" variant="outline"
                            className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                            onClick={() => setCompareMode(true)}>
                            <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1.5" />Compare
                          </Button>
                        )}
                        {/* Download */}
                        <Button size="sm" variant="outline"
                          className="text-white border-neutral-600 hover:bg-neutral-700 hover:text-white"
                          onClick={() => downloadPhoto(lightboxPhoto.url, lightboxPhoto.filename)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {/* Delete */}
                        <Button size="sm" variant="outline"
                          className="text-red-400 border-neutral-600 hover:bg-neutral-700 hover:text-red-400"
                          onClick={() => deleteMutation.mutate({ id: lightboxPhoto.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── AI Summary dialog ── */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />AI Job Summary
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summaryText}</p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => { copyText(summaryText); toast.success("Copied"); }}>
              <Clipboard className="h-3.5 w-3.5 mr-1.5" />Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSummary(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
