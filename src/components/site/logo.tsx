import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="Daily Holidays home">
      <span className={`font-script text-3xl leading-none ${light ? "text-white" : "text-navy-800"}`}>Daily</span>
      <span className="flex flex-col leading-tight">
        <span className={`text-sm font-bold tracking-wide ${light ? "text-white" : "text-navy-800"}`}>
          HOLIDAYS
        </span>
        <span className="text-[10px] font-medium tracking-[0.3em] text-sun-500">鑫天旅游</span>
      </span>
    </Link>
  );
}
