import { TopBar } from "@/components/TopBar";

// Demo chrome lives here (not the root layout) so the root can later host the
// real marketing surface without the persona switcher.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </>
  );
}
