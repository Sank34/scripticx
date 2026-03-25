import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const problems = [
  {
    id: 1,
    title: "Sum of two numbers",
    difficulty: "Easy",
  },
  {
    id: 2,
    title: "Print numbers from 1 to N",
    difficulty: "Easy",
  },
];

export default function ProblemsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Problems</h1>

      <div className="grid gap-4">
        {problems.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.title}</CardTitle>
            </CardHeader>

            <CardContent className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {p.difficulty}
              </span>

              <Link href={`/problems/${p.id}`}>
                <Button>Open</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}