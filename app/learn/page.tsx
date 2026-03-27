import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Card, CardContent } from "@/components/ui/card";

export default function LearnPage() {
  return (
    <div className="space-y-6">

      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/learn">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Introduction</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">MiniScript+ Documentation</h1>
        <p className="text-muted-foreground">
          Learn how to use MiniScript+ step by step with examples and explanations.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">

          <div>
            <h2 className="text-xl font-semibold">What is MiniScript+?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              MiniScript+ is a simple interpreted language designed to help you learn programming logic.
              It focuses on clarity and step-by-step execution.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Example</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono overflow-auto">
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
              <li>Code is executed line by line</li>
              <li>Variables store values</li>
              <li>Loops repeat logic</li>
              <li>Input/Output lets you interact with programs</li>
            </ul>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}