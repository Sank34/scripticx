import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Card, CardContent } from "@/components/ui/card";

export default function VariablesPage() {
  return (
    <div className="space-y-6">
{/* 
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/learn">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Variables</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Variables</h1>
        <p className="text-muted-foreground">
          Variables store values that can be used and modified throughout your program.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">What is a Variable?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A variable is a named container that holds a value.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Using Variables</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Once a variable is created, you can use it in expressions.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Updating Variables</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You can change the value of a variable anytime.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
X = X + 2
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Variable Types</h2>
            <p className="text-sm text-muted-foreground mt-2">
              MiniScript+ supports different types of values:
            </p>

            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              <li>Numbers → 10, 3.14</li>
              <li>Strings → "Hello"</li>
              <li>Booleans → true, false</li>
            </ul>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 10
B = "Hello"
C = true`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Naming Variables</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Variable names should be clear and meaningful.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`score = 100
name = "Alex"`}
            </pre>

            <p className="text-xs text-muted-foreground mt-2">
              Avoid using spaces or special characters.
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}