import { BrandForm } from "@/components/BrandForm";
import { getBrand } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          The AI uses this profile every time it writes for you, so posts sound like your business.
        </p>
      </div>
      <BrandForm brand={getBrand()} />
    </div>
  );
}
