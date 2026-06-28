import { Suspense } from "react";
import AdminLicenseDetailPage from "./page-content";

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function AdminLicenseDetailPageWrapper() {
  return (
    <Suspense>
      <AdminLicenseDetailPage />
    </Suspense>
  );
}
