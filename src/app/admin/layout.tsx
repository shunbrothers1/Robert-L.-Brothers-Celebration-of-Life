import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Family Admin", template: "%s · Family Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
