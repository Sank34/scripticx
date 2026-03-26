export type Problem = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  starterCode: string;
  testCases: { input: any[]; output: string }[];
};

export const problems: Problem[] = [
  {
    id: "1",
    title: "Sum of two numbers",
    description: "Read X and Y and print their sum",
    difficulty: "easy",
    starterCode: `INPUT X
INPUT Y
PRINT X + Y`,
    testCases: [
      { input: [3, 4], output: "7" },
      { input: [10, 2], output: "12" }
    ]
  },
  {
    id: "2",
    title: "Print numbers",
    description: "Print numbers from 1 to 3",
    difficulty: "easy",
    starterCode: `X = 1
WHILE X <= 3
PRINT X
X = X + 1
END`,
    testCases: [
      { input: [], output: "1\n2\n3" }
    ]
  }
];