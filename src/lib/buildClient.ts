export function decodeBase64ToText(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function filenameFromContentDisposition(cd: string | null) {
  if (!cd) return "watchface.pbw";
  const m = cd.match(/filename="([^\"]+)"/i);
  return m?.[1] ?? "watchface.pbw";
}

export async function compileAndDownload(params: {
  zip: File | Blob;
  zipName?: string;
  target?: string;
  timeoutSec?: number;
  maxZipBytes?: number;
  maxUnzipBytes?: number;
  onStatus?: (s: string) => void;
  onLog?: (logText: string) => void;
  onJob?: (jobId: string) => void;
}) {
  const {
    zip,
    zipName = "watchface.zip",
    target,
    timeoutSec,
    maxZipBytes,
    maxUnzipBytes,
    onStatus,
    onLog,
    onJob,
  } = params;

  const file = zip instanceof File ? zip : new File([zip], zipName, { type: "application/zip" });

  const fd = new FormData();
  fd.append("bundle", file, file.name);
  if (target) fd.append("target", target);
  if (timeoutSec != null) fd.append("timeoutSec", String(timeoutSec));
  if (maxZipBytes != null) fd.append("maxZipBytes", String(maxZipBytes));
  if (maxUnzipBytes != null) fd.append("maxUnzipBytes", String(maxUnzipBytes));

  onStatus?.("Building…");

  const resp = await fetch("/api/build", { method: "POST", body: fd });

  if (resp.status === 429) {
    const retryAfter = resp.headers.get("retry-after");
    const text = await resp.text().catch(() => "");
    throw new Error(`Queue full. Retry-After=${retryAfter ?? "?"}\n${text}`);
  }

  if (!resp.ok) {
    // Runner 错误一般是 JSON，但也可能是纯文本
    const text = await resp.text().catch(() => "");
    throw new Error(text || `Build failed: ${resp.status}`);
  }

  const jobId = resp.headers.get("x-job-id") || "";
  if (jobId) onJob?.(jobId);

  const logB64 = resp.headers.get("x-build-log-base64");
  if (logB64) onLog?.(decodeBase64ToText(logB64));

  const blob = await resp.blob();
  const filename = filenameFromContentDisposition(resp.headers.get("content-disposition"));

  // 触发下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  onStatus?.("Downloaded.");
}
