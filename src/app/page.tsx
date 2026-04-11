import { Suspense } from "react";
import { CifrasApp } from "@/components/cifras-app";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <CifrasApp />
    </Suspense>
  );
}
