import { Suspense } from "react";
import ValincBypassPage from "./page-content";

export function generateStaticParams() {
  return [{ uuid: 'default' }];
}

export default function ValincBypassPageWrapper() {
  return (
    <Suspense>
      <ValincBypassPage />
    </Suspense>
  );
}
