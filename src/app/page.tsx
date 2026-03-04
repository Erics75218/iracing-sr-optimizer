import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <h1 className="text-3xl font-bold">iRacing SR Optimizer</h1>
      <p className="text-center text-muted-foreground max-w-md">
        Get race recommendations to maximize your Safety Rating based on track
        corner density and race length.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Enter iRacing ID</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
