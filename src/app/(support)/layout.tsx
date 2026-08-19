import { SupportNav } from './_components/SupportNav';

/* ==========================================================================
   Support layout — a document, not a dashboard.

   A pinned rail on the left, a measured column on the right, and nothing in
   between. The rail is the index of everything in this section, so a reader
   who lands on Returns from a search result can see the rest of the shelf
   without going back to the footer.
   ========================================================================== */

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell section-tight">
      <div className="grid-12 gap-y-14">
        <SupportNav className="col-span-4 lg:col-span-3" />

        <div className="col-span-4 lg:col-span-8 lg:col-start-5">{children}</div>
      </div>
    </div>
  );
}
