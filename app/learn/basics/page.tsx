import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Card, CardContent } from "@/components/ui/card";

export default function BasicsPage() {
  return (
    <div className="space-y-6">

      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/learn">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Basics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Basics</h1>
        <p className="text-muted-foreground">
          Learn the fundamental building blocks of MiniScript+.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">Statements</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A program is made of statements executed from top to bottom.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`PRINT "Hello"
PRINT "World"`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Variables</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Variables store values that you can use later.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Math Operations</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You can perform calculations using operators.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 5 + 3
B = A * 2
PRINT B`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Conditions</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Use IF statements to control program flow.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10
IF X > 5 THEN
PRINT "Big"
END`}
            </pre>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}