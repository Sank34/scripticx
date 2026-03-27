import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Card, CardContent } from "@/components/ui/card";

export default function LoopsPage() {
  return (
    <div className="space-y-6">

      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/learn">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Loops</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Loops</h1>
        <p className="text-muted-foreground">
          Loops allow you to repeat a block of code multiple times.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">WHILE Loop</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A WHILE loop runs as long as a condition is true.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0
WHILE X < 3
PRINT X
X = X + 1
END`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">How it works</h2>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              <li>The condition is checked before each iteration</li>
              <li>If true → the loop runs</li>
              <li>If false → the loop stops</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Example Explained</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0        // start
WHILE X < 3   // check condition
PRINT X       // output
X = X + 1     // update
END`}
            </pre>

            <p className="text-sm text-muted-foreground mt-2">
              Output will be:
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-2">
{`0
1
2`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Infinite Loops</h2>
            <p className="text-sm text-muted-foreground mt-2">
              If the condition never becomes false, the loop will run forever.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`WHILE true
PRINT "Hello"
END`}
            </pre>

            <p className="text-xs text-muted-foreground mt-2">
               Be careful — this will never stop unless manually interrupted.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Common Mistake</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Forgetting to update the variable inside the loop.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0
WHILE X < 5
PRINT X
END`}
            </pre>

            <p className="text-xs text-red-500 mt-2">
               This will cause an infinite loop
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}