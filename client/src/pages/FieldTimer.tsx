/**
 * Field Timer — Crew-facing page for GPS check-in/check-out
 *
 * Accessed at /field or /field/:visitId
 * Works standalone (no sidebar) so crews can bookmark it on their phone.
 * Uses the browser Geolocation API to capture coordinates on check-in/out.
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  Loader2,
  Navigation,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ─── GPS Hook ─────────────────────────────────────────────────────────────────
function useGps() {
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function acquire(): Promise<GeolocationCoordinates | null> {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device");
      return null;
    }
    setLoading(true);
    setError(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition(pos.coords);
          setLoading(false);
          resolve(pos.coords);
        },
        (err) => {
          const msg =
            err.code === 1
              ? "Location access denied — please allow location in your browser settings"
              : err.code === 2
              ? "Location unavailable — check your GPS signal"
              : "Location request timed out";
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  return { position, error, loading, acquire };
}

// ─── Reverse Geocode ──────────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.display_name) {
      // Shorten to street + city
      const parts = data.display_name.split(", ");
      return parts.slice(0, 3).join(", ");
    }
  } catch {}
  return undefined;
}

// ─── Live Elapsed Timer ───────────────────────────────────────────────────────
function ElapsedTimer({ checkInAt }: { checkInAt: string | Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(checkInAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [checkInAt]);

  return (
    <div className="text-center">
      <div className="text-6xl font-mono font-bold tracking-tight tabular-nums text-white drop-shadow">
        {formatDuration(elapsed)}
      </div>
      <p className="text-white/70 text-sm mt-1">time on site</p>
    </div>
  );
}

// ─── Visit Selector (when no visitId in URL) ──────────────────────────────────
function VisitSelector({ onSelect }: { onSelect: (visitId: number, jobId: number) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: visits = [], isLoading } = trpc.jobs.fieldVisits.useQuery({
    from: today.toISOString(),
    to: tomorrow.toISOString(),
  });

  const upcoming = (visits as any[]).filter(
    (v: any) => v.status === "scheduled" || v.status === "in_progress"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="text-center mb-6">
        <Clock className="h-12 w-12 mx-auto text-white/80 mb-2" />
        <h1 className="text-2xl font-bold text-white">Field Timer</h1>
        <p className="text-white/60 text-sm mt-1">Select a visit to clock in</p>
      </div>

      {upcoming.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-white/40 mb-3" />
          <p className="text-white/70">No scheduled visits for today</p>
          <p className="text-white/40 text-sm mt-1">Visits are assigned from the Jobs page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((v: any) => (
            <button
              key={v.id}
              onClick={() => onSelect(v.id, v.jobId)}
              className="w-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors rounded-2xl p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{v.jobTitle ?? `Job #${v.jobNumber}`}</p>
                  {v.customerName && (
                    <p className="text-white/60 text-sm mt-0.5">{v.customerName}</p>
                  )}
                  {v.address && (
                    <div className="flex items-center gap-1 mt-1 text-white/50 text-xs">
                      <MapPin className="h-3 w-3" />
                      <span>{v.address}</span>
                    </div>
                  )}
                  {v.scheduledAt && (
                    <div className="flex items-center gap-1 mt-1 text-white/50 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDate(v.scheduledAt)} at {formatTime(v.scheduledAt)}
                      </span>
                    </div>
                  )}
                </div>
                <Badge
                  className={
                    v.status === "in_progress"
                      ? "bg-green-500 text-white border-0"
                      : "bg-white/20 text-white border-0"
                  }
                >
                  {v.status === "in_progress" ? "Active" : "Scheduled"}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Active Timer View ────────────────────────────────────────────────────────
function ActiveTimerView({
  visitId,
  jobId,
  onDone,
}: {
  visitId: number;
  jobId: number;
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const gps = useGps();
  const [checkInCoords, setCheckInCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [phase, setPhase] = useState<"checking_in" | "active" | "checking_out" | "done">("checking_in");

  const { data: visit } = trpc.jobs.getVisit.useQuery({ visitId });
  // no need for job visits list - we use getVisit directly

  const checkInMutation = trpc.jobs.checkIn.useMutation({
    onSuccess: () => {
      utils.jobs.getVisit.invalidate({ visitId });
      setPhase("active");
    },
    onError: (e) => toast.error(e.message),
  });

  const checkOutMutation = trpc.jobs.checkOut.useMutation({
    onSuccess: () => {
      setPhase("done");
      toast.success("Checked out successfully!");
      setTimeout(onDone, 2500);
    },
    onError: (e) => {
      setPhase("active");
      toast.error(e.message);
    },
  });

  // If visit is already in_progress on load, jump to active phase
  useEffect(() => {
    if (visit?.status === "in_progress" && phase === "checking_in") {
      setPhase("active");
      if (visit.checkInLat && visit.checkInLng) {
        setCheckInCoords({
          lat: parseFloat(String(visit.checkInLat)),
          lng: parseFloat(String(visit.checkInLng)),
          address: visit.checkInAddress ?? undefined,
        });
      }
    }
  }, [visit]);

  async function handleCheckIn() {
    setPhase("checking_in");
    const coords = await gps.acquire();
    let address: string | undefined;
    if (coords) {
      address = await reverseGeocode(coords.latitude, coords.longitude);
      setCheckInCoords({ lat: coords.latitude, lng: coords.longitude, address });
    }
    checkInMutation.mutate({
      visitId,
      lat: coords?.latitude,
      lng: coords?.longitude,
      address,
    });
  }

  async function handleCheckOut() {
    setPhase("checking_out");
    const coords = await gps.acquire();
    let address: string | undefined;
    if (coords) {
      address = await reverseGeocode(coords.latitude, coords.longitude);
    }
    const checkInTime = visit?.checkInAt ? new Date(visit.checkInAt).getTime() : Date.now();
    const durationMinutes = Math.round((Date.now() - checkInTime) / 60000);

    checkOutMutation.mutate({
      visitId,
      jobId,
      notes: notes.trim() || undefined,
      lat: coords?.latitude,
      lng: coords?.longitude,
      address,
      durationMinutes,
    });
  }

  // Done screen
  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <CheckCircle className="h-20 w-20 text-green-400" />
        <h2 className="text-3xl font-bold text-white">Checked Out!</h2>
        <p className="text-white/60">Visit recorded successfully</p>
      </div>
    );
  }

  // Initial check-in screen
  if (phase === "checking_in" && !visit?.checkInAt) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 p-6 text-center">
        <div className="bg-white/10 rounded-full p-6">
          <Navigation className="h-12 w-12 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Ready to start?</h2>
          <p className="text-white/60 mt-1 text-sm">
            We'll capture your GPS location when you check in
          </p>
        </div>

        {gps.error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 flex items-start gap-2 text-left max-w-sm">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-200 text-sm">{gps.error}</p>
          </div>
        )}

        <Button
          size="lg"
          onClick={handleCheckIn}
          disabled={checkInMutation.isPending || gps.loading}
          className="bg-green-500 hover:bg-green-400 text-white rounded-2xl px-10 py-6 text-xl font-bold shadow-lg h-auto"
        >
          {gps.loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Getting location...
            </>
          ) : checkInMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Checking in...
            </>
          ) : (
            <>
              <LogIn className="h-6 w-6 mr-2" />
              Check In
            </>
          )}
        </Button>
      </div>
    );
  }

  // Active timer screen
  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-6">
        <Badge className="bg-green-500 text-white border-0 px-3 py-1 text-sm">
          <span className="w-2 h-2 bg-white rounded-full inline-block mr-2 animate-pulse" />
          On Site
        </Badge>
        {visit?.scheduledAt && (
          <p className="text-white/50 text-sm">{formatDate(visit.scheduledAt)}</p>
        )}
      </div>

      {/* Big timer */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {visit?.checkInAt && <ElapsedTimer checkInAt={visit.checkInAt} />}

        {/* Check-in info */}
        <div className="text-center space-y-1">
          {visit?.checkInAt && (
            <p className="text-white/60 text-sm">
              <Clock className="h-3.5 w-3.5 inline mr-1" />
              Checked in at {formatTime(visit.checkInAt)}
            </p>
          )}
          {(checkInCoords?.address || visit?.checkInAddress) && (
            <p className="text-white/40 text-xs flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3" />
              {checkInCoords?.address ?? visit?.checkInAddress}
            </p>
          )}
        </div>

        {/* Notes section */}
        {showNotesInput ? (
          <div className="w-full max-w-sm space-y-2">
            <Textarea
              placeholder="Job notes, issues found, materials used..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 resize-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowNotesInput(true)}
            className="text-white/40 text-sm flex items-center gap-1 hover:text-white/60 transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Add notes before checking out
          </button>
        )}
      </div>

      {/* Check out button */}
      <div className="space-y-3 pb-safe">
        {gps.error && (
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-yellow-200 text-xs">{gps.error} — check-out will still be recorded without location</p>
          </div>
        )}

        <Button
          size="lg"
          onClick={handleCheckOut}
          disabled={checkOutMutation.isPending || gps.loading || phase === "checking_out"}
          className="w-full bg-red-500 hover:bg-red-400 text-white rounded-2xl py-6 text-xl font-bold shadow-lg h-auto"
        >
          {gps.loading || phase === "checking_out" ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {gps.loading ? "Getting location..." : "Checking out..."}
            </>
          ) : (
            <>
              <LogOut className="h-6 w-6 mr-2" />
              Check Out
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FieldTimer() {
  const params = useParams<{ visitId?: string }>();
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(
    params.visitId ? parseInt(params.visitId) : null
  );
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Get jobId from visit when visitId is in URL
  const { data: visit } = trpc.jobs.getVisit.useQuery(
    { visitId: selectedVisitId! },
    { enabled: !!selectedVisitId && !selectedJobId }
  );

  useEffect(() => {
    if (visit && !selectedJobId) {
      setSelectedJobId(visit.jobId);
    }
  }, [visit]);

  return (
    // Full-screen gradient background, no CRM shell
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
      }}
    >
      {!selectedVisitId ? (
        <VisitSelector
          onSelect={(visitId, jobId) => {
            setSelectedVisitId(visitId);
            setSelectedJobId(jobId);
          }}
        />
      ) : selectedVisitId && selectedJobId ? (
        <ActiveTimerView
          visitId={selectedVisitId}
          jobId={selectedJobId}
          onDone={() => {
            setSelectedVisitId(null);
            setSelectedJobId(null);
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      )}
    </div>
  );
}
