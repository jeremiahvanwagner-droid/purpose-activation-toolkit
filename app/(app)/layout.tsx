import Rail from "@/components/Rail";

/**
 * Layout for the signed-in / product surface — modules, audit, workbook, toolkit
 * dashboard. Wraps everything in the app shell with the constellation rail.
 * The marketing landing page at "/" bypasses this by living outside the group.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Rail />
      <main className="canvas">{children}</main>
    </div>
  );
}
