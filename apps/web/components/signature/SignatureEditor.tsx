"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, X, Mail } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Signature Editor                                                   */
/*                                                                     */
/*  Rich signature editor with:                                        */
/*   - Plain / HTML mode toggle                                        */
/*   - Structured fields (auto-composed template) OR "Custom" free     */
/*     text edit of the raw signature                                  */
/*   - Live preview panel                                              */
/*   - Save via POST /api/user/signature                               */
/* ------------------------------------------------------------------ */

type Mode = "plain" | "html";

interface StructuredFields {
  signOff: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  website: string;
}

const emptyFields: StructuredFields = {
  signOff: "Best",
  fullName: "",
  jobTitle: "",
  companyName: "",
  website: "",
};

/** Original template — auto-composes a plain-text signature from the fields. */
function composePlainText(f: StructuredFields): string {
  const lines: string[] = [];
  if (f.signOff.trim()) lines.push(`${f.signOff.trim()},`);
  lines.push("");
  if (f.fullName.trim()) lines.push(f.fullName.trim());

  const titleCompany = [f.jobTitle.trim(), f.companyName.trim()]
    .filter(Boolean)
    .join(" · ");
  if (titleCompany) lines.push(titleCompany);

  if (f.website.trim()) lines.push(f.website.trim());
  return lines.join("\n");
}

/** Compose an HTML version by wrapping the same template in light markup. */
function composeHtml(f: StructuredFields): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const lines: string[] = [];
  if (f.signOff.trim()) lines.push(`<div>${esc(f.signOff.trim())},</div>`);
  lines.push("<div>&nbsp;</div>");
  if (f.fullName.trim())
    lines.push(`<div><strong>${esc(f.fullName.trim())}</strong></div>`);
  const titleCompany = [f.jobTitle.trim(), f.companyName.trim()]
    .filter(Boolean)
    .join(" &middot; ");
  if (titleCompany)
    lines.push(`<div style="color:#4b5563">${titleCompany}</div>`);
  if (f.website.trim()) {
    const href = f.website.trim().match(/^https?:\/\//)
      ? f.website.trim()
      : `https://${f.website.trim()}`;
    lines.push(
      `<div><a href="${esc(href)}" style="color:#6C47FF">${esc(
        f.website.trim()
      )}</a></div>`
    );
  }
  return lines.join("\n");
}

export interface SignatureEditorProps {
  onClose: () => void;
  onSaved?: (signature: string) => void;
}

export default function SignatureEditor({ onClose, onSaved }: SignatureEditorProps) {
  const [mode, setMode] = useState<Mode>("plain");
  const [useCustom, setUseCustom] = useState(false);
  const [fields, setFields] = useState<StructuredFields>(emptyFields);
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing signature. We can't reliably tell whether the stored signature
  // was auto-composed or custom, so we drop the user into "Custom" mode if
  // anything is already there — safest behavior.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/signature", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const existing: string =
          typeof json?.signature === "string" ? json.signature : "";
        if (existing.trim()) {
          setUseCustom(true);
          setCustomText(existing);
          // Detect HTML-ish content and flip mode.
          if (/<[a-z][\s\S]*>/i.test(existing)) setMode("html");
        }
      })
      .catch(() => {
        // silent — treat as no existing signature
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const composed = useMemo(() => {
    if (mode === "plain") return composePlainText(fields);
    return composeHtml(fields);
  }, [mode, fields]);

  const renderedSignature = useCustom ? customText : composed;

  const handleFieldChange = <K extends keyof StructuredFields>(
    key: K,
    value: string
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: renderedSignature }),
      });
      if (!res.ok) {
        toast.error("Failed to save signature");
        return;
      }
      toast.success("Signature saved");
      onSaved?.(renderedSignature);
      onClose();
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#6C47FF]" />
            <h2 className="text-lg font-bold text-gray-900">Email signature</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden">
            {/* Left: editor controls */}
            <div className="p-6 space-y-5 overflow-y-auto border-r border-gray-100">
              {/* Mode toggle */}
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  <button
                    onClick={() => setMode("plain")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      mode === "plain"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Plain text
                  </button>
                  <button
                    onClick={() => setMode("html")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      mode === "html"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    HTML
                  </button>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (next) setCustomText(composed);
                      setUseCustom(next);
                    }}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                  />
                  Custom (edit raw)
                </label>
              </div>

              {useCustom ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {mode === "html" ? "Signature HTML" : "Signature text"}
                  </label>
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={14}
                    placeholder={
                      mode === "html"
                        ? "<div>Best,</div>..."
                        : "Best,\n\nJane Doe\nHead of Sales · Acme"
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Editing the raw signature — structured fields are ignored.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <StructuredInput
                    label="Sign-off"
                    value={fields.signOff}
                    placeholder="Best"
                    onChange={(v) => handleFieldChange("signOff", v)}
                  />
                  <StructuredInput
                    label="Full name"
                    value={fields.fullName}
                    placeholder="Jane Doe"
                    onChange={(v) => handleFieldChange("fullName", v)}
                  />
                  <StructuredInput
                    label="Job title"
                    value={fields.jobTitle}
                    placeholder="Head of Sales"
                    onChange={(v) => handleFieldChange("jobTitle", v)}
                  />
                  <StructuredInput
                    label="Company"
                    value={fields.companyName}
                    placeholder="Acme Inc."
                    onChange={(v) => handleFieldChange("companyName", v)}
                  />
                  <StructuredInput
                    label="Website"
                    value={fields.website}
                    placeholder="acme.com"
                    onChange={(v) => handleFieldChange("website", v)}
                  />
                </div>
              )}
            </div>

            {/* Right: live preview */}
            <div className="p-6 bg-gray-50 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Live preview
                </span>
                <span className="text-[10px] text-gray-400">
                  {mode === "html" ? "rendered HTML" : "plain text"}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[280px] text-sm text-gray-800">
                {renderedSignature.trim() ? (
                  mode === "html" ? (
                    // NOTE: dangerouslySetInnerHTML is intentional here — this
                    // is the user's OWN signature content, only ever rendered
                    // back to themselves in this local preview. It never
                    // renders untrusted HTML from another user or the network.
                    <div
                      dangerouslySetInnerHTML={{ __html: renderedSignature }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {renderedSignature}
                    </div>
                  )
                ) : (
                  <div className="text-gray-400 text-sm italic">
                    Your signature preview will appear here.
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                This is exactly how your signature will be saved and appended to
                sent emails.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save signature
          </button>
        </div>
      </div>
    </div>
  );
}

function StructuredInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
  );
}
