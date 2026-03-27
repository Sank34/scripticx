import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Card, CardContent } from "@/components/ui/card";

export default function InputOutputPage() {
  return (
    <div className="space-y-6">

      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/learn">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Input / Output</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Input / Output</h1>
        <p className="text-muted-foreground">
          Programs interact with users through input and output.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">Output (PRINT)</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Use PRINT to display values or text.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`PRINT "Hello"
PRINT 10`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Using Variables in Output</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Input (INPUT)</h2>
            <p className="text-sm text-muted-foreground mt-2">
              INPUT allows the program to receive a value from the user.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`INPUT X
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Example</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`INPUT A
INPUT B
PRINT A + B`}
            </pre>

            <p className="text-sm text-muted-foreground mt-2">
              The program asks for two values and prints their sum.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">How INPUT works</h2>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              <li>The program pauses and waits for input</li>
              <li>The value is stored in a variable</li>
              <li>Execution continues after input is provided</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Types of Input</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The input value can be:
            </p>

            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              <li>Number → 10</li>
              <li>Text → Hello</li>
              <li>Boolean → true / false</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Common Mistake</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`INPUT X
PRINT X + 1`}
            </pre>

            <p className="text-xs text-muted-foreground mt-2">
              Make sure the input is a number if you want to perform math.
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}