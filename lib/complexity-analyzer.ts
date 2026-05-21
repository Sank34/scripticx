import {
  parseMiniScriptProgram,
  type MspParseWarning,
  type MspStatement,
} from "@/lib/msp-parser";

export type ComplexityLevel = "excellent" | "good" | "average" | "poor";

export type ComplexityAnalysis = {
  timeComplexity: string;
  spaceComplexity: string;
  score: number;
  level: ComplexityLevel;
  loopCount: number;
  maxNestedLoops: number;
  hasRecursion: boolean;
  hasInputDependentLoop: boolean;
  warnings: string[];
  suggestions: string[];
};

type AnalyzerLocale = "en" | "ro";

type ComplexityValue = {
  degree: number;
  logFactors: number;
  exponential: boolean;
  unknownLoop: boolean;
};

type LoopBound = "linear" | "logarithmic" | "unknown";

type VisitResult = ComplexityValue & {
  loopCount: number;
  maxNestedLoops: number;
  hasInputDependentLoop: boolean;
  hasRecursion: boolean;
};

const constantComplexity: ComplexityValue = {
  degree: 0,
  logFactors: 0,
  exponential: false,
  unknownLoop: false,
};

const messages = {
  en: {
    suggestions: {
      noLoops:
        "The AST does not contain loops, so the estimated complexity is very good.",
      singleLoop:
        "The AST contains one main loop. The solution looks efficient for simple traversals.",
      nestedLoops:
        "The AST contains nested loops. Try reducing repeated traversals with helper variables or a suitable data structure.",
      highComplexity:
        "The AST visitor found high nesting. Check whether some loops can become preprocessing steps or direct calculations.",
      logarithmic:
        "At least one loop updates its control variable multiplicatively, so it was estimated as logarithmic.",
      manyLoops:
        "The program contains many loops. Try splitting the logic into simpler steps that are easier to verify.",
      recursion:
        "The code appears to use recursion. Make sure it has a clear stopping case and avoids repeated recalculation.",
      warnings:
        "I found incomplete or ambiguous structures. Fix them for a more accurate AST estimate.",
      unknownLoop:
        "At least one loop has an unknown bound. I treated it as input-dependent to avoid underestimating it.",
      estimate: (timeComplexity: string) =>
        `Estimated complexity is ${timeComplexity}. This is an AST-based approximation, not a mathematical proof.`,
    },
    warnings: {
      elseWithoutIf: (line: number) => `Line ${line}: ELSE without a matching IF.`,
      endWithoutBlock: (line: number) => `Line ${line}: END without a matching block.`,
      loopWithoutEnd: (line: number) => `Line ${line}: loop without a matching END.`,
      ifWithoutEnd: (line: number) => `Line ${line}: IF without a matching END.`,
      functionWithoutEnd: (line: number) =>
        `Line ${line}: FUNCTION without a matching END.`,
      missingThen: (line: number) => `Line ${line}: IF is missing THEN.`,
      emptyVariable: (line: number) => `Line ${line}: missing variable name.`,
      unknownStatement: (line: number, raw: string) =>
        `Line ${line}: unknown statement "${raw}".`,
    },
  },
  ro: {
    suggestions: {
      noLoops:
        "AST-ul nu contine bucle, deci complexitatea estimata este foarte buna.",
      singleLoop:
        "AST-ul contine o singura bucla principala. Solutia pare eficienta pentru parcurgeri simple.",
      nestedLoops:
        "AST-ul contine bucle imbricate. Incearca sa reduci parcurgerile repetate folosind variabile auxiliare sau o structura de date potrivita.",
      highComplexity:
        "Visitor-ul AST a gasit imbricare ridicata. Verifica daca unele bucle pot deveni preprocesari sau calcule directe.",
      logarithmic:
        "Cel putin o bucla isi modifica variabila de control multiplicativ, deci a fost estimata ca logaritmica.",
      manyLoops:
        "Programul contine multe bucle. Incearca sa imparti logica in pasi mai simpli si mai usor de verificat.",
      recursion:
        "Codul pare sa foloseasca recursivitate. Verifica existenta unui caz de oprire clar si evita recalcularile repetate.",
      warnings:
        "Am gasit structuri incomplete sau ambigue. Corecteaza-le pentru o estimare AST mai precisa.",
      unknownLoop:
        "Cel putin o bucla are limita necunoscuta. Am tratat-o ca dependenta de input ca sa nu o subestimez.",
      estimate: (timeComplexity: string) =>
        `Complexitatea estimata este ${timeComplexity}. Este o aproximare bazata pe AST, nu o dovada matematica.`,
    },
    warnings: {
      elseWithoutIf: (line: number) => `Linia ${line}: ELSE fara IF corespunzator.`,
      endWithoutBlock: (line: number) => `Linia ${line}: END fara bloc corespunzator.`,
      loopWithoutEnd: (line: number) => `Linia ${line}: bucla fara END corespunzator.`,
      ifWithoutEnd: (line: number) => `Linia ${line}: IF fara END corespunzator.`,
      functionWithoutEnd: (line: number) =>
        `Linia ${line}: FUNCTION fara END corespunzator.`,
      missingThen: (line: number) => `Linia ${line}: IF nu contine THEN.`,
      emptyVariable: (line: number) => `Linia ${line}: numele variabilei lipseste.`,
      unknownStatement: (line: number, raw: string) =>
        `Linia ${line}: instructiune necunoscuta "${raw}".`,
    },
  },
};

function maxComplexity(left: ComplexityValue, right: ComplexityValue): ComplexityValue {
  if (left.exponential !== right.exponential) {
    return left.exponential ? left : right;
  }

  if (left.degree !== right.degree) {
    return left.degree > right.degree ? left : right;
  }

  if (left.logFactors !== right.logFactors) {
    return left.logFactors > right.logFactors ? left : right;
  }

  return {
    degree: left.degree,
    logFactors: left.logFactors,
    exponential: left.exponential || right.exponential,
    unknownLoop: left.unknownLoop || right.unknownLoop,
  };
}

function addLoopBound(body: ComplexityValue, bound: LoopBound): ComplexityValue {
  if (bound === "logarithmic") {
    return {
      ...body,
      logFactors: body.logFactors + 1,
    };
  }

  return {
    ...body,
    degree: body.degree + 1,
    unknownLoop: body.unknownLoop || bound === "unknown",
  };
}

function formatComplexity(value: ComplexityValue) {
  if (value.exponential && value.degree > 0) {
    return `O(2^n + n^${value.degree})`;
  }

  if (value.exponential) return "O(2^n)";

  const parts: string[] = [];

  if (value.degree === 1) {
    parts.push("n");
  } else if (value.degree > 1) {
    parts.push(`n^${value.degree}`);
  }

  if (value.logFactors === 1) {
    parts.push("log n");
  } else if (value.logFactors > 1) {
    parts.push(`(log n)^${value.logFactors}`);
  }

  if (parts.length === 0) return "O(1)";

  return `O(${parts.join(" * ")})`;
}

function getScore(params: {
  complexity: ComplexityValue;
  hasRecursion: boolean;
  loopCount: number;
  maxNestedLoops: number;
  warningCount: number;
}) {
  let score = 100;

  if (params.loopCount > 0) score -= Math.min(18, params.loopCount * 4);
  if (params.maxNestedLoops > 1) score -= Math.min(24, (params.maxNestedLoops - 1) * 8);
  if (params.complexity.degree === 1) score -= 12;
  if (params.complexity.degree === 2) score -= 32;
  if (params.complexity.degree === 3) score -= 52;
  if (params.complexity.degree >= 4) score -= 68;
  if (params.complexity.logFactors > 0) score -= 8 * params.complexity.logFactors;
  if (params.complexity.unknownLoop) score -= 12;
  if (params.hasRecursion) score -= 35;
  if (params.loopCount > 4) score -= 10;
  if (params.loopCount > 8) score -= 20;
  score -= Math.min(20, params.warningCount * 5);

  return Math.max(5, Math.min(100, score));
}

function getLevel(score: number): ComplexityLevel {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "average";
  return "poor";
}

function getLoopCondition(condition: string) {
  const match = condition
    .toUpperCase()
    .match(/^\s*([A-Z_][A-Z0-9_]*)\s*(<|<=|>|>=|!=|==)\s*(.+?)\s*$/);

  if (!match) return null;

  return {
    variable: match[1],
    operator: match[2],
    limit: match[3].trim(),
  };
}

function findControlUpdate(variable: string, body: MspStatement[]): "linear" | "logarithmic" | null {
  for (const statement of body) {
    if (statement.type === "assignment" && statement.variable.toUpperCase() === variable) {
      const expression = statement.expression.raw.toUpperCase().replace(/\s+/g, "");

      if (
        expression.match(new RegExp(`^${variable}[+-]-?\\d+(?:\\.\\d+)?$`)) ||
        expression.match(new RegExp(`^-?\\d+(?:\\.\\d+)?[+]${variable}$`))
      ) {
        return "linear";
      }

      if (
        expression.match(new RegExp(`^${variable}[*/]-?\\d+(?:\\.\\d+)?$`)) ||
        expression.match(new RegExp(`^-?\\d+(?:\\.\\d+)?[*]${variable}$`))
      ) {
        return "logarithmic";
      }
    }

    if (statement.type === "if") {
      return (
        findControlUpdate(variable, statement.thenBody) ??
        findControlUpdate(variable, statement.elseBody)
      );
    }
  }

  return null;
}

function inferLoopBound(statement: Extract<MspStatement, { type: "while" }>): LoopBound {
  const condition = getLoopCondition(statement.condition.raw);

  if (!condition) return "unknown";

  const update = findControlUpdate(condition.variable, statement.body);

  if (update === "logarithmic") {
    return "logarithmic";
  }

  if (update === "linear") {
    return "linear";
  }

  return "linear";
}

function isFunctionCallTo(expression: string, fnName: string) {
  const upper = expression.toUpperCase();

  return upper.includes(`${fnName.toUpperCase()}(`) || upper.includes(`CALL ${fnName.toUpperCase()}`);
}

function visitStatements(
  statements: MspStatement[],
  depth: number,
  activeFunction: string | null
): VisitResult {
  let complexity = constantComplexity;
  let loopCount = 0;
  let maxNestedLoops = depth;
  let hasInputDependentLoop = false;
  let hasRecursion = false;

  for (const statement of statements) {
    const result = visitStatement(statement, depth, activeFunction);
    complexity = maxComplexity(complexity, result);
    loopCount += result.loopCount;
    maxNestedLoops = Math.max(maxNestedLoops, result.maxNestedLoops);
    hasInputDependentLoop ||= result.hasInputDependentLoop;
    hasRecursion ||= result.hasRecursion;
  }

  return {
    ...complexity,
    loopCount,
    maxNestedLoops,
    hasInputDependentLoop,
    hasRecursion,
  };
}

function visitStatement(
  statement: MspStatement,
  depth: number,
  activeFunction: string | null
): VisitResult {
  if (statement.type === "while") {
    const body = visitStatements(statement.body, depth + 1, activeFunction);
    const bound = inferLoopBound(statement);
    const complexity = addLoopBound(body, bound);

    return {
      ...complexity,
      loopCount: body.loopCount + 1,
      maxNestedLoops: Math.max(depth + 1, body.maxNestedLoops),
      hasInputDependentLoop: true,
      hasRecursion: body.hasRecursion,
    };
  }

  if (statement.type === "if") {
    const thenResult = visitStatements(statement.thenBody, depth, activeFunction);
    const elseResult = visitStatements(statement.elseBody, depth, activeFunction);
    const complexity = maxComplexity(thenResult, elseResult);

    return {
      ...complexity,
      loopCount: thenResult.loopCount + elseResult.loopCount,
      maxNestedLoops: Math.max(thenResult.maxNestedLoops, elseResult.maxNestedLoops),
      hasInputDependentLoop:
        thenResult.hasInputDependentLoop || elseResult.hasInputDependentLoop,
      hasRecursion: thenResult.hasRecursion || elseResult.hasRecursion,
    };
  }

  if (statement.type === "function") {
    const result = visitStatements(statement.body, depth, statement.name);

    return {
      ...result,
      hasRecursion: result.hasRecursion,
    };
  }

  if (
    activeFunction &&
    statement.type === "assignment" &&
    isFunctionCallTo(statement.expression.raw, activeFunction)
  ) {
    return {
      ...constantComplexity,
      exponential: true,
      loopCount: 0,
      maxNestedLoops: depth,
      hasInputDependentLoop: false,
      hasRecursion: true,
    };
  }

  return {
    ...constantComplexity,
    loopCount: 0,
    maxNestedLoops: depth,
    hasInputDependentLoop: false,
    hasRecursion: false,
  };
}

function translateWarning(warning: MspParseWarning, locale: AnalyzerLocale) {
  const copy = messages[locale].warnings;

  if (warning.type === "unknownStatement") {
    return copy.unknownStatement(warning.line, warning.raw);
  }

  return copy[warning.type](warning.line);
}

function buildSuggestions(params: {
  complexity: ComplexityValue;
  loopCount: number;
  maxNestedLoops: number;
  hasRecursion: boolean;
  hasInputDependentLoop: boolean;
  locale: AnalyzerLocale;
  timeComplexity: string;
  warnings: string[];
}) {
  const suggestions: string[] = [];
  const copy = messages[params.locale].suggestions;

  if (params.loopCount === 0) {
    suggestions.push(copy.noLoops);
  }

  if (params.loopCount === 1) {
    suggestions.push(copy.singleLoop);
  }

  if (params.maxNestedLoops >= 2) {
    suggestions.push(copy.nestedLoops);
  }

  if (params.maxNestedLoops >= 3 || params.complexity.degree >= 3) {
    suggestions.push(copy.highComplexity);
  }

  if (params.complexity.logFactors > 0) {
    suggestions.push(copy.logarithmic);
  }

  if (params.loopCount > 4) {
    suggestions.push(copy.manyLoops);
  }

  if (params.hasRecursion) {
    suggestions.push(copy.recursion);
  }

  if (params.complexity.unknownLoop) {
    suggestions.push(copy.unknownLoop);
  }

  if (params.warnings.length > 0) {
    suggestions.push(copy.warnings);
  }

  suggestions.push(copy.estimate(params.timeComplexity));

  return suggestions;
}

function countLoopLikeLines(code: string) {
  return code
    .split("\n")
    .filter((line) => /^\s*(WHILE|FOR|REPEAT)\b/i.test(line))
    .length;
}

export function analyzeMiniScriptComplexity(
  code: string,
  locale: AnalyzerLocale = "en"
): ComplexityAnalysis {
  const program = parseMiniScriptProgram(code);
  const result = visitStatements(program.body, 0, null);
  const fallbackLoopCount = countLoopLikeLines(code);
  const parserMissedLoops = result.loopCount === 0 && fallbackLoopCount > 0;
  const complexity: ComplexityValue = {
    degree: parserMissedLoops ? 1 : result.degree,
    logFactors: result.logFactors,
    exponential: result.exponential || result.hasRecursion,
    unknownLoop: result.unknownLoop || parserMissedLoops,
  };
  const warnings = program.warnings.map((warning) =>
    translateWarning(warning, locale)
  );
  const timeComplexity = formatComplexity(complexity);
  const spaceComplexity = result.hasRecursion ? "O(n)" : "O(1)";
  const loopCount = parserMissedLoops ? fallbackLoopCount : result.loopCount;
  const maxNestedLoops = parserMissedLoops ? 1 : result.maxNestedLoops;
  const hasInputDependentLoop = result.hasInputDependentLoop || parserMissedLoops;
  const score = getScore({
    complexity,
    hasRecursion: result.hasRecursion,
    loopCount,
    maxNestedLoops,
    warningCount: warnings.length,
  });
  const level = getLevel(score);

  return {
    timeComplexity,
    spaceComplexity,
    score,
    level,
    loopCount,
    maxNestedLoops,
    hasRecursion: result.hasRecursion,
    hasInputDependentLoop,
    warnings,
    suggestions: buildSuggestions({
      complexity,
      loopCount,
      maxNestedLoops,
      hasRecursion: result.hasRecursion,
      hasInputDependentLoop,
      locale,
      timeComplexity,
      warnings,
    }),
  };
}
