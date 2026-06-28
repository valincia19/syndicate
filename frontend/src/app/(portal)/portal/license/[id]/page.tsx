import { Suspense } from "react";
import LicenseDetailPage from "./page-content";

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function LicenseDetailPageWrapper() {
  return (
    <Suspense>
      <LicenseDetailPage />
    </Suspense>
  );
}
