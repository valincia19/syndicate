import { Suspense } from "react";
import DeveloperReleaseDetailPage from "./page-content";

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function DeveloperReleaseDetailPageWrapper() {
  return (
    <Suspense>
      <DeveloperReleaseDetailPage />
    </Suspense>
  );
}
