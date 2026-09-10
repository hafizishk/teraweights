"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Textarea } from "@/components/admin/Field";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { confirmResults, previewResults, type ImportPreview } from "@/lib/actions/results";
import { formatMmSs } from "@/lib/format";

const EXAMPLE = [
  "name,email,division,time,splits",
  "Aisyah Rahman,aisyah@example.com,open,48:12,1km run 5:12; sled 2:40",
  "Wei Ling Tan,,doubles,52:03,",
].join("\n");

const matchLabels: Record<"email" | "name", string> = { email: "Email", name: "Name" };

/**
 * Results CSV import (brief section 9): upload or paste, preview every row and
 * how it matched, then confirm. Confirming replaces the event's results.
 */
export function ResultsImport({ eventId }: { eventId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeUnmatched, setIncludeUnmatched] = useState(false);
  const [previewing, startPreview] = useTransition();
  const [importing, startImport] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setPreview(null);
  }

  function runPreview() {
    if (!csv.trim()) {
      toast.show("Choose a file or paste the CSV first.", "error");
      return;
    }
    startPreview(async () => {
      const result = await previewResults(eventId, csv);
      if ("error" in result) {
        setPreview(null);
        toast.show(result.error, "error");
        return;
      }
      setPreview(result);
    });
  }

  function runImport() {
    startImport(async () => {
      const result = await confirmResults(eventId, csv, includeUnmatched);
      toast.show(result.ok ? result.message : result.error, result.ok ? "ok" : "error");
      if (result.ok) {
        setPreview(null);
        setCsv("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Header: name, email, division, time (mm:ss), splits. Division is open, doubles, relay or family — blank
        counts as open. Splits read like &ldquo;1km run 5:12; sled 2:40&rdquo;.
      </p>
      <pre className="overflow-x-auto rounded-lg border border-ink-3 bg-ink-2 p-3 text-xs text-muted">{EXAMPLE}</pre>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="CSV file">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className="w-full rounded-md border border-ink-3 bg-ink px-3 py-2 text-sm text-paper file:mr-3 file:rounded file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-xs file:text-paper"
          />
        </Field>
        <Field label="Or paste the rows">
          <Textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(null);
            }}
            placeholder={EXAMPLE}
          />
        </Field>
      </div>

      <div>
        <button
          type="button"
          onClick={runPreview}
          disabled={previewing}
          className="inline-flex h-10 items-center rounded-md border border-ink-3 px-4 text-xs text-paper transition-colors hover:border-muted disabled:opacity-50"
        >
          {previewing ? "Reading…" : "Preview"}
        </button>
      </div>

      {preview ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <span className="text-paper">{preview.matched} matched</span>
            <span className="text-muted"> · </span>
            <span className={preview.unmatched > 0 ? "text-brand" : "text-muted"}>
              {preview.unmatched} unmatched
            </span>
          </p>

          {preview.errors.length > 0 ? (
            <div className="rounded-lg border border-brand/50 bg-brand/10 p-3">
              <p className="text-sm text-paper">Rows that could not be read:</p>
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted">
                {preview.errors.map((e) => (
                  <li key={`${e.line}-${e.message}`}>
                    Line {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Table>
            <thead>
              <tr>
                <Th>Line</Th>
                <Th>Name</Th>
                <Th>Time</Th>
                <Th>Division</Th>
                <Th>Rank</Th>
                <Th>Match</Th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.length === 0 ? (
                <EmptyRow colSpan={6}>Nothing in that file could be read.</EmptyRow>
              ) : (
                preview.rows.map((r) => (
                  <Tr key={`${r.line}-${r.displayName}`}>
                    <Td className="text-muted">{r.line}</Td>
                    <Td>{r.displayName}</Td>
                    <Td>{formatMmSs(r.totalSeconds)}</Td>
                    <Td className="text-muted">{r.division}</Td>
                    <Td>{r.rank}</Td>
                    <Td>
                      {r.matchedOn ? (
                        <Badge>{matchLabels[r.matchedOn]}</Badge>
                      ) : (
                        <Badge className="bg-brand text-paper">Unmatched</Badge>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>

          <label className="flex items-center gap-3 text-sm text-paper">
            <input
              type="checkbox"
              checked={includeUnmatched}
              onChange={(e) => setIncludeUnmatched(e.target.checked)}
              className="h-5 w-5 accent-[#b11226]"
            />
            Also import unmatched rows (they will have no member attached)
          </label>

          <p className="rounded-lg border border-brand/50 bg-brand/10 p-3 text-sm text-paper">
            Importing replaces this event&rsquo;s existing results. Everything already on the leaderboard is deleted
            and rewritten from this file.
          </p>

          <div>
            <button
              type="button"
              onClick={runImport}
              disabled={importing}
              className="display inline-flex h-11 items-center rounded-md bg-brand px-6 text-lg tracking-wide text-paper transition-colors hover:bg-brand-2 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Confirm import"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
