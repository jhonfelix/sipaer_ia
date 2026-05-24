import { Header } from "@/components/layout";
import { mockUser } from "@/lib/mocks/report-data";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <Header user={mockUser} />
      <main className="flex-1 flex min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
