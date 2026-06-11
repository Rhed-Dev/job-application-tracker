import Link from "next/link";
import { BriefcaseIcon } from "@/components/icons";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-dot-grid absolute inset-0" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10rem] h-[22rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[110px]"
        aria-hidden
      />
      <Link href="/" className="relative mb-8 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <BriefcaseIcon width={16} height={16} />
        </span>
        <span className="text-lg font-semibold tracking-tight text-zinc-100">
          Job<span className="text-indigo-400">Trail</span>
        </span>
      </Link>
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
