import { Suspense } from "react";
import StaffTicketDetailPage from "./page-content";

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function StaffTicketDetailPageWrapper() {
  return (
    <Suspense>
      <StaffTicketDetailPage />
    </Suspense>
  );
}
