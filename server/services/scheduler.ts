type PushScheduleParams = {
  visitId: number;
  jobId: number;
  companyId: number;
  start: Date;
  end: Date;
  address?: string | null;
};

/**
 * Optional external scheduler push. Uses SCHEDULER_URL + SCHEDULER_KEY.
 */
export async function pushExternalSchedule(params: PushScheduleParams) {
  const url = process.env.SCHEDULER_URL;
  const apiKey = process.env.SCHEDULER_KEY;
  if (!url || !apiKey) return null;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      visitId: params.visitId,
      jobId: params.jobId,
      companyId: params.companyId,
      start: params.start.toISOString(),
      end: params.end.toISOString(),
      address: params.address ?? null,
    }),
  });

  if (!resp.ok) {
    throw new Error(`External scheduler responded ${resp.status}`);
  }

  return resp.json().catch(() => ({}));
}
