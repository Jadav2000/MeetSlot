import { Card } from "@/components/ui/card";

export function LoaderCard({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="flex items-center gap-3 text-sm text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </Card>
  );
}

export function ErrorCard({ message = "Something went wrong." }: { message?: string }) {
  return <Card className="border-red-200 bg-red-50 text-sm text-red-700">{message}</Card>;
}
