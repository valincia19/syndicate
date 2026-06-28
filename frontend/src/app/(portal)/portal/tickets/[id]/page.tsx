import { Suspense } from "react";
import TicketDetailPage from "./page-content";

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function TicketDetailPageWrapper() {
  return (
    <Suspense>
      <TicketDetailPage />
    </Suspense>
  );
}
