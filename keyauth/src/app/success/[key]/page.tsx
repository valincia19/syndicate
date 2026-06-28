import { Suspense } from "react";
import SuccessKeyPage from "./page-content";

export function generateStaticParams() {
  return [{ key: 'default' }];
}

export default function SuccessKeyPageWrapper() {
  return (
    <Suspense>
      <SuccessKeyPage />
    </Suspense>
  );
}
