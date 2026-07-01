"use client";

import { useState, useRef } from "react";

export default function MaterialUpload({
  programmeId,
  programmeCode,
  currentUrl,
}: {
  programmeId: string;
  programmeCode: string;
  currentUrl?: string | null;
}) {
  const [url, setUrl] = useState(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "training-material");
    fd.append("programmeId", programmeId);
    fd.append("programmeCode", programmeCode);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      setUrl(data.url);
      setMsg("Uploaded");
    } else {
      setMsg(data.error || "Failed");
    }
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-2">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-xs underline" style={{ color: "var(--brand-600)" }}>
          View
        </a>
      )}
      <input ref={ref} type="file" accept=".pptx,.docx,.pdf" className="hidden" onChange={handleUpload} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="sc-btn-secondary text-xs !py-1"
      >
        {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
      </button>
      {msg && <span className="text-xs" style={{ color: msg === "Uploaded" ? "var(--status-green-text)" : "var(--status-red-text)" }}>{msg}</span>}
    </div>
  );
}
