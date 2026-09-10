import Link from "next/link";
import { QrScanner } from "@/components/member/QrScanner";

export const metadata = { title: "Scan to check in" };

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl">Scan</h1>
        <Link href="/app" className="text-sm text-muted underline underline-offset-4">
          Cancel
        </Link>
      </div>
      <QrScanner />
    </div>
  );
}
