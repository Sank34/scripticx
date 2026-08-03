export type LessonLocale = "en" | "ro";

export type LocalizedText = {
  en: string;
  ro: string;
};

export type LessonQuizQuestion = {
  question: LocalizedText;
  options: LocalizedText[];
  answerIndex: number;
};

export type LearnLessonKind =
  | "interactive"
  | "theory"
  | "video"
  | "challenge"
  | "assessment";

export type LessonRuleKind = "required" | "bonus" | "challenge";

export type LearnLessonUnlockRule = {
  kind?: LessonRuleKind;
  locked?: boolean;
  requiredProblemCodes?: number[];
  requiresCorrectQuiz?: boolean;
};

export type LearnTheoryBlock = {
  heading: LocalizedText;
  body: LocalizedText;
  bullets?: LocalizedText[];
};

export type RecommendedProblem = {
  title: LocalizedText;
  topic: string;
  href: string;
  difficulty?: "easy" | "medium" | "hard";
  code?: number;
};

export type LearnChallenge = {
  prompt: LocalizedText;
  problem?: RecommendedProblem;
};

export type LearnLesson = {
  id: string;
  order: number;
  unit: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  transcript: LocalizedText;
  videoUrl?: string;
  tags: string[];
  level: "beginner" | "practice" | "challenge";
  minutes: number;
  sampleInput: string;
  code: string;
  quiz: LessonQuizQuestion[];
  recommendedProblems: RecommendedProblem[];
  kind?: LearnLessonKind;
  theory?: LearnTheoryBlock[];
  challenge?: LearnChallenge;
  unlockRule?: LearnLessonUnlockRule;
};

export type LearnSection = {
  id: string;
  order: number;
  label: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  lessonIds: string[];
};

export function text(value: LocalizedText, locale: LessonLocale) {
  return value[locale] ?? value.en;
}

export function youtubeEmbedUrl(url?: string) {
  if (!url) return null;

  const match =
    url.match(/youtu\.be\/([^?]+)/) ??
    url.match(/[?&]v=([^&]+)/) ??
    url.match(/youtube\.com\/embed\/([^?]+)/);

  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getLessonKind(lesson: LearnLesson): LearnLessonKind {
  if (lesson.kind) return lesson.kind;

  return lesson.level === "challenge" ? "challenge" : "video";
}

const problem = (
  code: number,
  href: string,
  title: LocalizedText,
  topic: string,
  difficulty: RecommendedProblem["difficulty"],
): RecommendedProblem => ({ code, href, title, topic, difficulty });

const problems = {
  sumTwo: problem(1, "/problems/235ccbb5-e7a6-4b59-b6b5-9597f37fbdaa", { en: "Sum of two numbers", ro: "Suma a două numere" }, "input-output", "easy"),
  printNumbers: problem(2, "/problems/44dc4d65-8b42-4337-9075-92c563522d5b", { en: "Print numbers", ro: "Afișează numere" }, "loops", "easy"),
  nextNumbers: problem(3, "/problems/4b2f9bfb-c6a4-48ea-8881-737b3894245c", { en: "Print n+1 numbers", ro: "Afișează n+1 numere" }, "loops", "medium"),
  primeNumbers: problem(4, "/problems/e40b9d99-42dd-4b6e-b972-d0095e378a0f", { en: "Prime numbers", ro: "Numere Prime" }, "divisibility", "hard"),
  maximum: problem(5, "/problems/cffac95d-3a99-453d-8c04-83a754d8fb41", { en: "Maximum", ro: "Maxim" }, "conditions", "medium"),
  digitSum: problem(6, "/problems/edc94e99-d0b3-4c8e-adc0-c365c2c32f59", { en: "Sum of digits", ro: "Suma cifrelor" }, "digits", "easy"),
  countdown: problem(7, "/problems/520f1d08-805a-43f9-8a0d-a8f35ebee008", { en: "Countdown", ro: "Numărare descrescătoare" }, "loops", "easy"),
  absolute: problem(8, "/problems/5ebb8e10-3902-46cc-950e-496e986701e3", { en: "Absolute value", ro: "Valoarea absolută" }, "conditions", "easy"),
  subtraction: problem(10, "/problems/02354eee-9b9a-4343-b274-0f373f54a97d", { en: "Subtractions", ro: "Scăderi" }, "variables", "easy"),
  leapYear: problem(13, "/problems/52dcd0c5-c841-436e-b221-bb5d0ff0cce7", { en: "Leap year", ro: "An Bisect" }, "conditions", "easy"),
  factorial: problem(14, "/problems/49ab556a-a17f-4c3a-940c-48523c6a1a67", { en: "Factorial", ro: "Factorial" }, "algorithms", "easy"),
  sumToN: problem(15, "/problems/41bfd990-cdc3-4614-a290-151780bef879", { en: "Sum from 1 to N", ro: "Suma de la 1 la N" }, "loops", "easy"),
  divisorCount: problem(16, "/problems/70fed27a-0829-40a0-8444-cd85c3381bc8", { en: "Number of divisors", ro: "Număr divizori" }, "divisibility", "hard"),
  reverseNumber: problem(17, "/problems/eb086fd3-4ba0-48ea-a342-f62d69f84679", { en: "Reverse the number", ro: "Inversează numărul" }, "digits", "hard"),
  area: problem(20, "/problems/5c039369-d082-4fbe-a030-f1f17d3a7167", { en: "Area", ro: "Arie" }, "variables", "easy"),
  perimeter: problem(21, "/problems/c8827f29-bb1e-4bcd-a7de-a315de0239c5", { en: "Perimeter", ro: "Perimetru" }, "variables", "easy"),
  neighbors: problem(22, "/problems/38da88f2-4436-42d3-a95f-62b1218d7c16", { en: "Neighbors", ro: "Vecini" }, "variables", "easy"),
  average: problem(23, "/problems/c2fcb4c5-f5ac-462a-b3bb-6502a04b6c5f", { en: "Average", ro: "Media" }, "variables", "easy"),
  exam: problem(24, "/problems/f6028962-c1d1-4823-8f55-8018744d2011", { en: "Exam", ro: "Examen" }, "conditions", "easy"),
  parityOps: problem(26, "/problems/33bd8d26-796a-4f29-b39c-e346a57dd1b5", { en: "Parity and operations", ro: "Parități și Operații" }, "conditions", "medium"),
  powerOfTwo: problem(29, "/problems/7e9844b2-5b12-475e-8ea8-5532011019e9", { en: "Largest power of 2", ro: "Cea Mai Mare Putere a lui 2" }, "divisibility", "medium"),
  maxDigit: problem(31, "/problems/419440b4-437e-4b55-803b-96aa7f45e04d", { en: "Largest digit", ro: "Cea mai mare Cifră" }, "digits", "easy"),
  rearrangeDigits: problem(32, "/problems/3c216ebd-5cd3-4d1a-86a9-beae3a62cbd1", { en: "Rearrange digits", ro: "Rearanjarea Cifrelor" }, "digits", "easy"),
  divisorsDigits: problem(33, "/problems/2b0d2d83-0ee0-411d-b82a-2afb4e030cdf", { en: "Divisors and digits", ro: "Divizori și Cifre" }, "divisibility", "medium"),
  fibonacci: problem(34, "/problems/a7e5d46a-7913-47fd-adcc-9654445a764a", { en: "Fibonacci", ro: "Fibonacci" }, "algorithms", "hard"),
};

export const learnLessons: LearnLesson[] = [
  {
    id: "swap-variables",
    order: 1,
    unit: { en: "Variables", ro: "Variabile" },
    title: { en: "Swapping two variables", ro: "Interchimbarea a două variabile" },
    summary: {
      en: "Learn why a temporary variable is needed when two values must exchange places.",
      ro: "Învață de ce este necesară o variabilă auxiliară atunci când două valori își schimbă locul.",
    },
    transcript: {
      en: "The assignment operation overwrites the old value. To avoid losing one of the values, the program stores it first in AUX, then performs the exchange safely.",
      ro: "Operația de atribuire suprascrie valoarea veche. Pentru a nu pierde una dintre valori, programul o salvează mai întâi în AUX, apoi face interschimbarea în siguranță.",
    },
    tags: ["beginner", "variables"],
    level: "beginner",
    minutes: 7,
    sampleInput: "3\n9",
    code: `INPUT A
INPUT B
AUX = A
A = B
B = AUX
PRINT "A = " + A
PRINT "B = " + B`,
    quiz: [
      {
        question: {
          en: "Why do we use AUX?",
          ro: "De ce folosim AUX?",
        },
        options: [
          { en: "To preserve one value before overwriting it", ro: "Pentru a păstra o valoare înainte să fie suprascrisă" },
          { en: "To print the final answer", ro: "Pentru a afișa răspunsul final" },
          { en: "To stop the program", ro: "Pentru a opri programul" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.sumTwo, problems.subtraction, problems.neighbors],
  },
  {
    id: "maximum-two-numbers",
    order: 2,
    unit: { en: "Conditions", ro: "Condiții" },
    title: { en: "Maximum of two numbers", ro: "Maximul dintre două numere" },
    summary: {
      en: "Use IF/ELSE to compare two values and keep the larger one.",
      ro: "Folosește IF/ELSE pentru a compara două valori și a păstra valoarea mai mare.",
    },
    transcript: {
      en: "The condition A > B decides which branch is executed. Only one branch assigns MAX, then the final value is printed.",
      ro: "Condiția A > B decide ce ramură se execută. Doar una dintre ramuri atribuie MAX, apoi valoarea finală este afișată.",
    },
    tags: ["beginner", "conditions"],
    level: "practice",
    minutes: 10,
    sampleInput: "12\n8",
    code: `INPUT A
INPUT B
IF A > B THEN
  MAX = A
ELSE
  MAX = B
END
PRINT "MAXIM: " + MAX`,
    quiz: [
      {
        question: { en: "Which branch runs when A = 12 and B = 8?", ro: "Ce ramură se execută când A = 12 și B = 8?" },
        options: [
          { en: "The IF branch", ro: "Ramura IF" },
          { en: "The ELSE branch", ro: "Ramura ELSE" },
          { en: "Both branches", ro: "Ambele ramuri" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.maximum, problems.absolute, problems.exam],
  },
  {
    id: "digits",
    order: 3,
    unit: { en: "Loops", ro: "Bucle" },
    title: { en: "Separating digits", ro: "Separarea cifrelor" },
    summary: {
      en: "Process a number digit by digit using modulo and integer division.",
      ro: "Procesează un număr cifră cu cifră folosind modulo și împărțire întreagă.",
    },
    transcript: {
      en: "The last digit is N % 10. After printing it, INT(N / 10) removes the last digit, and the loop continues until the number becomes 0.",
      ro: "Ultima cifră este N % 10. După afișare, INT(N / 10) elimină ultima cifră, iar bucla continuă până când numărul devine 0.",
    },
    tags: ["loops", "digits", "math"],
    level: "practice",
    minutes: 12,
    sampleInput: "472",
    code: `INPUT N
WHILE N > 0
  CIFRA = N % 10
  PRINT CIFRA
  N = INT(N / 10)
END`,
    quiz: [
      {
        question: { en: "What does N % 10 return?", ro: "Ce returnează N % 10?" },
        options: [
          { en: "The last digit of N", ro: "Ultima cifră a lui N" },
          { en: "The first digit of N", ro: "Prima cifră a lui N" },
          { en: "The number without the last digit", ro: "Numărul fără ultima cifră" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.digitSum, problems.sumToN, problems.nextNumbers],
  },
  {
    id: "sum-of-digits",
    order: 4,
    unit: { en: "Loops", ro: "Bucle" },
    title: { en: "Sum of digits", ro: "Suma cifrelor" },
    summary: {
      en: "Accumulate partial results while reducing the number at every step.",
      ro: "Adună rezultate parțiale în timp ce reduci numărul la fiecare pas.",
    },
    transcript: {
      en: "SUMA starts from 0. Each loop adds the current last digit, then removes it from N. The final value is the sum of all digits.",
      ro: "SUMA pornește de la 0. Fiecare pas adaugă ultima cifră curentă, apoi o elimină din N. Valoarea finală este suma tuturor cifrelor.",
    },
    tags: ["loops", "digits", "accumulator"],
    level: "challenge",
    minutes: 12,
    sampleInput: "1234",
    code: `INPUT N
SUMA = 0
WHILE N > 0
  SUMA = SUMA + (N % 10)
  N = INT(N / 10)
END
PRINT "SUMA CIFRELOR: " + SUMA`,
    quiz: [
      {
        question: { en: "What is an accumulator?", ro: "Ce este un acumulator?" },
        options: [
          { en: "A variable that gathers a result step by step", ro: "O variabilă care strânge rezultatul pas cu pas" },
          { en: "A condition that stops the loop", ro: "O condiție care oprește bucla" },
          { en: "A printed string", ro: "Un text afișat" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.digitSum, problems.sumToN, problems.nextNumbers],
  },
  {
    id: "reverse-number",
    order: 5,
    unit: { en: "Digits", ro: "Cifre" },
    title: { en: "Reversing a number", ro: "Oglinditul unui număr" },
    summary: {
      en: "Build a new number by moving digits from the original number into the result.",
      ro: "Construiește un număr nou mutând cifrele din numărul inițial în rezultat.",
    },
    transcript: {
      en: "OGL is multiplied by 10 before adding the next digit. This shifts the existing digits left and makes room for the new digit.",
      ro: "OGL se înmulțește cu 10 înainte de adăugarea următoarei cifre. Astfel, cifrele existente sunt mutate la stânga și se face loc pentru cifra nouă.",
    },
    tags: ["digits", "loops"],
    level: "practice",
    minutes: 12,
    sampleInput: "4021",
    code: `INPUT N
OGL = 0
WHILE N > 0
  OGL = OGL * 10 + (N % 10)
  N = INT(N / 10)
END
PRINT "OGLINDIT: " + OGL`,
    quiz: [
      {
        question: { en: "Why do we multiply OGL by 10?", ro: "De ce înmulțim OGL cu 10?" },
        options: [
          { en: "To shift existing digits left", ro: "Pentru a muta cifrele existente la stânga" },
          { en: "To remove the last digit", ro: "Pentru a elimina ultima cifră" },
          { en: "To stop the loop", ro: "Pentru a opri bucla" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.reverseNumber, problems.maxDigit, problems.rearrangeDigits],
  },
  {
    id: "palindrome",
    order: 6,
    unit: { en: "Digits", ro: "Cifre" },
    title: { en: "Palindrome check", ro: "Verificarea palindromului" },
    summary: {
      en: "Compare a number with its reverse to decide whether it reads the same both ways.",
      ro: "Compară un număr cu oglinditul său pentru a verifica dacă se citește la fel în ambele sensuri.",
    },
    transcript: {
      en: "The original value is kept in N, while COPIE is consumed by the loop. At the end, N is compared with OGL.",
      ro: "Valoarea originală rămâne în N, iar COPIE este redusă în buclă. La final, N este comparat cu OGL.",
    },
    tags: ["digits", "conditions", "loops"],
    level: "challenge",
    minutes: 15,
    sampleInput: "1221",
    code: `INPUT N
COPIE = N
OGL = 0
WHILE COPIE > 0
  OGL = OGL * 10 + (COPIE % 10)
  COPIE = INT(COPIE / 10)
END
IF N == OGL THEN
  PRINT "ESTE PALINDROM"
ELSE
  PRINT "NU ESTE PALINDROM"
END`,
    quiz: [
      {
        question: { en: "Why do we use COPIE?", ro: "De ce folosim COPIE?" },
        options: [
          { en: "To keep N unchanged for the final comparison", ro: "Pentru a păstra N neschimbat pentru comparația finală" },
          { en: "To print all digits twice", ro: "Pentru a afișa toate cifrele de două ori" },
          { en: "To avoid IF", ro: "Pentru a evita IF" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.reverseNumber, problems.maxDigit, problems.rearrangeDigits],
  },
  {
    id: "divisors",
    order: 7,
    unit: { en: "Divisibility", ro: "Divizibilitate" },
    title: { en: "Divisors of a number", ro: "Divizorii unui număr" },
    summary: {
      en: "Scan possible divisors and print the values that divide N exactly.",
      ro: "Parcurge posibilii divizori și afișează valorile care îl divid exact pe N.",
    },
    transcript: {
      en: "The loop tests every D from 1 to N. When N % D is 0, D is a divisor and gets printed.",
      ro: "Bucla testează fiecare D de la 1 la N. Când N % D este 0, D este divizor și este afișat.",
    },
    tags: ["math", "loops"],
    level: "practice",
    minutes: 12,
    sampleInput: "12",
    code: `INPUT N
D = 1
WHILE D <= N
  IF N % D == 0 THEN
    PRINT D
  END
  D = D + 1
END`,
    quiz: [
      {
        question: { en: "When is D a divisor of N?", ro: "Când este D divizor al lui N?" },
        options: [
          { en: "When N % D == 0", ro: "Când N % D == 0" },
          { en: "When D > N", ro: "Când D > N" },
          { en: "When N == 0", ro: "Când N == 0" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.divisorCount, problems.divisorsDigits, problems.powerOfTwo],
  },
  {
    id: "prime",
    order: 8,
    unit: { en: "Divisibility", ro: "Divizibilitate" },
    title: { en: "Prime number", ro: "Număr prim" },
    summary: {
      en: "Check whether a number has divisors other than 1 and itself.",
      ro: "Verifică dacă un număr are divizori diferiți de 1 și de el însuși.",
    },
    transcript: {
      en: "It is enough to test divisors while D * D <= N. If one exact divisor is found, the number is not prime.",
      ro: "Este suficient să testăm divizori cât timp D * D <= N. Dacă găsim un divizor exact, numărul nu este prim.",
    },
    tags: ["math", "loops", "complexity"],
    level: "challenge",
    minutes: 15,
    sampleInput: "17",
    code: `INPUT N
ESTE_PRIM = 1
IF N < 2 THEN
  ESTE_PRIM = 0
ELSE
  D = 2
  WHILE D * D <= N
    IF N % D == 0 THEN
      ESTE_PRIM = 0
    END
    D = D + 1
  END
END
IF ESTE_PRIM == 1 THEN
  PRINT "ESTE PRIM"
ELSE
  PRINT "NU ESTE PRIM"
END`,
    quiz: [
      {
        question: { en: "Why can the loop stop at D * D <= N?", ro: "De ce se poate opri bucla la D * D <= N?" },
        options: [
          { en: "Because larger factor pairs already have a smaller pair", ro: "Pentru că perechile de factori mai mari au deja un corespondent mai mic" },
          { en: "Because primes always end in 7", ro: "Pentru că numerele prime se termină mereu în 7" },
          { en: "Because modulo stops working after that", ro: "Pentru că modulo nu mai funcționează după aceea" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.divisorCount, problems.divisorsDigits, problems.powerOfTwo],
  },
  {
    id: "gcd",
    order: 9,
    unit: { en: "Algorithms", ro: "Algoritmi" },
    title: { en: "GCD with Euclid", ro: "CMMDC prin Euclid" },
    summary: {
      en: "Repeatedly reduce the larger number until both values become equal.",
      ro: "Redu repetat numărul mai mare până când cele două valori devin egale.",
    },
    transcript: {
      en: "The subtraction version keeps the common divisors unchanged. When A and B become equal, that value is the greatest common divisor.",
      ro: "Varianta prin scăderi păstrează divizorii comuni. Când A și B devin egale, acea valoare este cel mai mare divizor comun.",
    },
    tags: ["algorithms", "loops"],
    level: "challenge",
    minutes: 14,
    sampleInput: "20\n8",
    code: `INPUT A
INPUT B
WHILE A != B
  IF A > B THEN
    A = A - B
  ELSE
    B = B - A
  END
END
PRINT "CMMDC: " + A`,
    quiz: [
      {
        question: { en: "What remains true after each subtraction?", ro: "Ce rămâne adevărat după fiecare scădere?" },
        options: [
          { en: "The common divisors are preserved", ro: "Divizorii comuni se păstrează" },
          { en: "Both numbers always grow", ro: "Ambele numere cresc mereu" },
          { en: "The loop runs once", ro: "Bucla rulează o singură dată" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.factorial, problems.fibonacci, problems.sumToN],
  },
  {
    id: "factorial",
    order: 10,
    unit: { en: "Algorithms", ro: "Algoritmi" },
    title: { en: "Factorial", ro: "Factorial" },
    summary: {
      en: "Use a loop to multiply all values from 1 to N.",
      ro: "Folosește o buclă pentru a înmulți toate valorile de la 1 la N.",
    },
    transcript: {
      en: "FACT starts at 1 because it is a multiplication accumulator. Each step multiplies it by I, then I advances.",
      ro: "FACT pornește de la 1 deoarece este un acumulator pentru înmulțire. La fiecare pas este înmulțit cu I, apoi I avansează.",
    },
    tags: ["algorithms", "loops"],
    level: "challenge",
    minutes: 10,
    sampleInput: "5",
    code: `INPUT N
FACT = 1
I = 1
WHILE I <= N
  FACT = FACT * I
  I = I + 1
END
PRINT "FACTORIAL: " + FACT`,
    quiz: [
      {
        question: { en: "Why does FACT start from 1?", ro: "De ce FACT pornește de la 1?" },
        options: [
          { en: "Because 1 is neutral for multiplication", ro: "Pentru că 1 este element neutru la înmulțire" },
          { en: "Because 0 is always printed", ro: "Pentru că 0 este mereu afișat" },
          { en: "Because loops require it", ro: "Pentru că buclele cer acest lucru" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.factorial, problems.fibonacci, problems.sumToN],
  },
  {
    id: "euclidean-gcd",
    order: 11,
    unit: { en: "Advanced algorithms", ro: "Algoritmi avansați" },
    title: { en: "Fast GCD with modulo", ro: "CMMDC rapid cu modulo" },
    summary: {
      en: "Use Euclid's algorithm to compute the greatest common divisor with fewer steps than repeated subtraction.",
      ro: "Folosește algoritmul lui Euclid pentru a calcula cel mai mare divizor comun în mai puțini pași decât prin scăderi repetate.",
    },
    transcript: {
      en: "The key observation is that gcd(A, B) stays the same after replacing A with B and B with A % B. The remainder removes a whole block of repeated subtractions at once, so the program becomes shorter and faster.",
      ro: "Observația principală este că cmmdc(A, B) rămâne același dacă înlocuim A cu B și B cu A % B. Restul elimină dintr-un singur pas mai multe scăderi repetate, deci programul devine mai scurt și mai rapid.",
    },
    tags: ["advanced", "gcd", "modulo"],
    level: "challenge",
    minutes: 13,
    sampleInput: "48\n18",
    code: `INPUT A
INPUT B
WHILE B != 0
  R = A % B
  A = B
  B = R
END
PRINT "CMMDC: " + A`,
    quiz: [
      {
        question: { en: "What does R = A % B store?", ro: "Ce salvează instrucțiunea R = A % B?" },
        options: [
          { en: "The remainder used in Euclid's algorithm", ro: "Restul folosit în algoritmul lui Euclid" },
          { en: "The final answer immediately", ro: "Răspunsul final imediat" },
          { en: "The number of loop iterations", ro: "Numărul de iterații ale buclei" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.divisorCount, problems.primeNumbers, problems.factorial],
  },
  {
    id: "fibonacci-iterative",
    order: 12,
    unit: { en: "Advanced algorithms", ro: "Algoritmi avansați" },
    title: { en: "Iterative Fibonacci", ro: "Fibonacci iterativ" },
    summary: {
      en: "Generate a sequence by keeping only the last two values instead of storing the entire history.",
      ro: "Generează un șir păstrând doar ultimele două valori, fără să memorezi tot istoricul.",
    },
    transcript: {
      en: "Fibonacci is useful for learning compact state. A and B hold two consecutive terms, C computes the next one, then the window moves forward. This pattern appears often in dynamic programming and sequence problems.",
      ro: "Fibonacci este util pentru înțelegerea stării compacte. A și B păstrează doi termeni consecutivi, C calculează următorul termen, apoi fereastra se mută înainte. Acest tipar apare des în programare dinamică și probleme cu șiruri.",
    },
    tags: ["advanced", "sequences", "loops"],
    level: "challenge",
    minutes: 12,
    sampleInput: "7",
    code: `INPUT N
A = 0
B = 1
I = 1
WHILE I <= N
  PRINT A
  C = A + B
  A = B
  B = C
  I = I + 1
END`,
    quiz: [
      {
        question: { en: "Why are A and B enough?", ro: "De ce sunt suficiente A și B?" },
        options: [
          { en: "The next term depends only on the previous two", ro: "Următorul termen depinde doar de cei doi anteriori" },
          { en: "The sequence never changes", ro: "Șirul nu se schimbă niciodată" },
          { en: "The input is ignored", ro: "Inputul este ignorat" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.fibonacci, problems.sumToN, problems.factorial],
  },
  {
    id: "largest-power-of-two",
    order: 13,
    unit: { en: "Advanced algorithms", ro: "Algoritmi avansați" },
    title: { en: "Largest power of two", ro: "Cea mai mare putere a lui 2" },
    summary: {
      en: "Build an answer by doubling while the next value still satisfies the condition.",
      ro: "Construiește răspunsul prin dublare cât timp următoarea valoare respectă condiția.",
    },
    transcript: {
      en: "The variable P always stores a valid power of two. Before each update, the program checks whether P * 2 is still at most N. When the condition becomes false, P is the largest valid value.",
      ro: "Variabila P păstrează mereu o putere validă a lui 2. Înainte de fiecare actualizare, programul verifică dacă P * 2 este încă cel mult N. Când condiția devine falsă, P este cea mai mare valoare validă.",
    },
    tags: ["advanced", "invariant", "powers"],
    level: "practice",
    minutes: 10,
    sampleInput: "100",
    code: `INPUT N
P = 1
WHILE P * 2 <= N
  P = P * 2
END
PRINT P`,
    quiz: [
      {
        question: { en: "Why does the loop stop?", ro: "De ce se oprește bucla?" },
        options: [
          { en: "Because doubling again would pass N", ro: "Pentru că o nouă dublare ar depăși N" },
          { en: "Because P becomes zero", ro: "Pentru că P devine zero" },
          { en: "Because powers of two are negative", ro: "Pentru că puterile lui 2 sunt negative" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.powerOfTwo, problems.divisorCount, problems.primeNumbers],
  },
  {
    id: "digit-frequency",
    order: 14,
    unit: { en: "Advanced algorithms", ro: "Algoritmi avansați" },
    title: { en: "Counting digit frequencies", ro: "Frecvența unei cifre" },
    summary: {
      en: "Count how many times a digit appears by scanning the number from right to left.",
      ro: "Numără de câte ori apare o cifră parcurgând numărul de la dreapta la stânga.",
    },
    transcript: {
      en: "This lesson introduces frequency thinking. Each loop step extracts the last digit with %, compares it with TARGET, then removes the digit using integer division. The counter grows only when the searched digit is found.",
      ro: "Această lecție introduce gândirea pe frecvențe. La fiecare pas, bucla extrage ultima cifră cu %, o compară cu TARGET, apoi elimină cifra prin împărțire întreagă. Contorul crește doar când cifra căutată este găsită.",
    },
    tags: ["advanced", "digits", "frequency"],
    level: "challenge",
    minutes: 12,
    sampleInput: "725227",
    code: `INPUT N
TARGET = 2
COUNT = 0
WHILE N > 0
  CIF = N % 10
  IF CIF == TARGET THEN
    COUNT = COUNT + 1
  END
  N = INT(N / 10)
END
PRINT COUNT`,
    quiz: [
      {
        question: { en: "When does COUNT increase?", ro: "Când crește COUNT?" },
        options: [
          { en: "When the extracted digit equals TARGET", ro: "Când cifra extrasă este egală cu TARGET" },
          { en: "At every line of the program", ro: "La fiecare linie a programului" },
          { en: "Only before the loop starts", ro: "Doar înainte să înceapă bucla" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.maxDigit, problems.rearrangeDigits, problems.divisorsDigits],
  },
  {
    id: "complexity-intro",
    order: 15,
    unit: { en: "Complexity Analysis", ro: "Analiza complexității" },
    title: { en: "Big-O intuition", ro: "Intuiția Big-O" },
    summary: {
      en: "Understand Big-O as a way to describe how work grows when input grows.",
      ro: "Înțelege Big-O ca metodă de a descrie cum crește munca atunci când crește input-ul.",
    },
    transcript: {
      en: "Complexity does not measure exact seconds. It estimates growth. If a loop runs once for every value from 1 to N, the number of executed steps grows roughly together with N, so the time complexity is O(n).",
      ro: "Complexitatea nu măsoară secunde exacte. Ea estimează creșterea. Dacă o buclă rulează o dată pentru fiecare valoare de la 1 la N, numărul de pași executați crește aproximativ odată cu N, deci complexitatea în timp este O(n).",
    },
    tags: ["complexity", "big-o", "loops"],
    level: "beginner",
    minutes: 8,
    sampleInput: "5",
    code: `INPUT N
I = 1
WHILE I <= N
  PRINT I
  I = I + 1
END`,
    quiz: [
      {
        question: { en: "What does O(n) mean here?", ro: "Ce înseamnă O(n) aici?" },
        options: [
          { en: "The work grows linearly with N", ro: "Munca crește liniar cu N" },
          { en: "The program always runs one step", ro: "Programul rulează mereu un singur pas" },
          { en: "The program stores N lists", ro: "Programul stochează N liste" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.printNumbers, problems.sumToN, problems.countdown],
  },
  {
    id: "linear-complexity",
    order: 16,
    unit: { en: "Complexity Analysis", ro: "Analiza complexității" },
    title: { en: "Single loops and O(n)", ro: "Bucle simple și O(n)" },
    summary: {
      en: "Estimate programs where one loop scans the input once.",
      ro: "Estimează programele în care o singură buclă parcurge input-ul o dată.",
    },
    transcript: {
      en: "A single loop that moves toward a stopping condition usually has linear time. In this example, I grows from 1 to N and each iteration performs a constant amount of work: one addition and one increment.",
      ro: "O buclă simplă care avansează spre o condiție de oprire are de obicei timp liniar. În exemplu, I crește de la 1 la N, iar fiecare iterație face o cantitate constantă de lucru: o adunare și o incrementare.",
    },
    tags: ["complexity", "loops", "linear"],
    level: "practice",
    minutes: 9,
    sampleInput: "10",
    code: `INPUT N
SUM = 0
I = 1
WHILE I <= N
  SUM = SUM + I
  I = I + 1
END
PRINT SUM`,
    quiz: [
      {
        question: { en: "Why is this algorithm linear?", ro: "De ce este algoritmul liniar?" },
        options: [
          { en: "Because the loop runs about N times", ro: "Pentru că bucla rulează aproximativ de N ori" },
          { en: "Because it has two variables", ro: "Pentru că are două variabile" },
          { en: "Because PRINT is used once", ro: "Pentru că PRINT este folosit o dată" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.sumToN, problems.digitSum, problems.printNumbers],
  },
  {
    id: "nested-loop-complexity",
    order: 17,
    unit: { en: "Complexity Analysis", ro: "Analiza complexității" },
    title: { en: "Nested loops and O(n^2)", ro: "Bucle imbricate și O(n^2)" },
    summary: {
      en: "See why a loop inside another loop can multiply the amount of work.",
      ro: "Vezi de ce o buclă în interiorul altei bucle poate înmulți cantitatea de lucru.",
    },
    transcript: {
      en: "When the outer loop runs N times and the inner loop also runs N times for each outer step, the total number of inner executions is N * N. This is why nested independent loops often lead to O(n^2).",
      ro: "Când bucla exterioară rulează de N ori, iar bucla interioară rulează tot de N ori pentru fiecare pas exterior, numărul total de execuții interioare este N * N. De aceea buclele imbricate independente duc adesea la O(n^2).",
    },
    tags: ["complexity", "nested loops", "quadratic"],
    level: "challenge",
    minutes: 10,
    sampleInput: "4",
    code: `INPUT N
I = 1
WHILE I <= N
  J = 1
  WHILE J <= N
    PRINT I * J
    J = J + 1
  END
  I = I + 1
END`,
    quiz: [
      {
        question: { en: "What causes O(n^2)?", ro: "Ce produce O(n^2)?" },
        options: [
          { en: "The inner loop repeats for every outer iteration", ro: "Bucla interioară se repetă pentru fiecare iterație exterioară" },
          { en: "The variable names are short", ro: "Numele variabilelor sunt scurte" },
          { en: "The program prints numbers", ro: "Programul afișează numere" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.divisorCount, problems.primeNumbers, problems.factorial],
  },
  {
    id: "space-complexity",
    order: 18,
    unit: { en: "Complexity Analysis", ro: "Analiza complexității" },
    title: { en: "Space complexity", ro: "Complexitatea în spațiu" },
    summary: {
      en: "Separate the number of executed steps from the amount of memory used.",
      ro: "Separă numărul de pași executați de cantitatea de memorie folosită.",
    },
    transcript: {
      en: "Space complexity estimates extra memory. If a program keeps only a fixed number of variables, such as A, B, C and MAX, the memory does not grow with the input size. That is constant extra space, written O(1).",
      ro: "Complexitatea în spațiu estimează memoria suplimentară. Dacă un program păstrează doar un număr fix de variabile, precum A, B, C și MAX, memoria nu crește odată cu input-ul. Aceasta este memorie suplimentară constantă, notată O(1).",
    },
    tags: ["complexity", "memory", "space"],
    level: "practice",
    minutes: 8,
    sampleInput: "3\n9\n5",
    code: `INPUT A
INPUT B
INPUT C
MAX = A
IF B > MAX THEN
  MAX = B
END
IF C > MAX THEN
  MAX = C
END
PRINT MAX`,
    quiz: [
      {
        question: { en: "Why is the extra space O(1)?", ro: "De ce spațiul suplimentar este O(1)?" },
        options: [
          { en: "Because the program stores a fixed number of variables", ro: "Pentru că programul stochează un număr fix de variabile" },
          { en: "Because it has IF statements", ro: "Pentru că are instrucțiuni IF" },
          { en: "Because MAX can be large", ro: "Pentru că MAX poate fi mare" },
        ],
        answerIndex: 0,
      },
    ],
    recommendedProblems: [problems.maximum, problems.area, problems.perimeter],
  },
];

export const learnSections: LearnSection[] = [
  {
    id: "fundamentals",
    order: 1,
    label: { en: "Section 1", ro: "Secțiunea 1" },
    title: { en: "Programming fundamentals", ro: "Fundamente de programare" },
    description: {
      en: "Start with variables, assignments and decisions. These lessons build the mental model for every later algorithm.",
      ro: "Începe cu variabile, atribuiri și decizii. Lecțiile construiesc modelul mental pentru algoritmii următori.",
    },
    lessonIds: ["swap-variables", "maximum-two-numbers"],
  },
  {
    id: "digits",
    order: 2,
    label: { en: "Section 2", ro: "Secțiunea 2" },
    title: { en: "Working with digits", ro: "Lucrul cu cifre" },
    description: {
      en: "Practice extracting, transforming and rebuilding numbers digit by digit.",
      ro: "Exersează extragerea, transformarea și reconstruirea numerelor cifră cu cifră.",
    },
    lessonIds: ["digits", "sum-of-digits", "reverse-number", "palindrome"],
  },
  {
    id: "classic-algorithms",
    order: 3,
    label: { en: "Section 3", ro: "Secțiunea 3" },
    title: { en: "Classic algorithms", ro: "Algoritmi clasici" },
    description: {
      en: "Move from simple loops to divisibility, primality and repeated multiplication.",
      ro: "Treci de la bucle simple la divizibilitate, primalitate și înmulțire repetată.",
    },
    lessonIds: ["divisors", "prime", "gcd", "factorial"],
  },
  {
    id: "advanced-algorithms",
    order: 4,
    label: { en: "Section 4", ro: "Secțiunea 4" },
    title: {
      en: "Advanced algorithms in MiniScript+",
      ro: "Algoritmi avansați în MiniScript+",
    },
    description: {
      en: "Use invariants, counters and compact state to write faster, cleaner algorithms.",
      ro: "Folosește invarianți, contoare și stare compactă pentru algoritmi mai rapizi și mai clari.",
    },
    lessonIds: [
      "euclidean-gcd",
      "fibonacci-iterative",
      "largest-power-of-two",
      "digit-frequency",
    ],
  },
  {
    id: "complexity-basics",
    order: 5,
    label: { en: "Section 1", ro: "Secțiunea 1" },
    title: { en: "Complexity basics", ro: "Bazele complexității" },
    description: {
      en: "Learn how to estimate growth using loops, input size and Big-O notation.",
      ro: "Învață cum estimezi creșterea folosind bucle, dimensiunea input-ului și notația Big-O.",
    },
    lessonIds: ["complexity-intro", "linear-complexity"],
  },
  {
    id: "complexity-ast",
    order: 6,
    label: { en: "Section 2", ro: "Secțiunea 2" },
    title: {
      en: "AST-based complexity analysis",
      ro: "Analiză de complexitate prin AST",
    },
    description: {
      en: "Connect nested control structures and memory usage with the analyzer used in ScripticX.",
      ro: "Leagă structurile de control imbricate și memoria folosită de analizatorul din ScripticX.",
    },
    lessonIds: ["nested-loop-complexity", "space-complexity"],
  },
];

export function getLessonById(id: string) {
  return learnLessons.find((lesson) => lesson.id === id) ?? null;
}

export type LessonRule = {
  kind: LessonRuleKind;
  requiresCorrectQuiz: boolean;
  requiredProblemCodes: number[];
};

const bonusLessonIds = new Set(["reverse-number", "space-complexity"]);

const sectionChallengeLessonIds = new Set(
  learnSections
    .map((section) => section.lessonIds[section.lessonIds.length - 1])
    .filter((lessonId): lessonId is string => Boolean(lessonId))
);

export function getLessonRule(lesson: LearnLesson): LessonRule {
  const kind = getLessonKind(lesson);
  const firstRecommendedProblemCode = lesson.recommendedProblems[0]?.code;
  const isChallenge =
    kind === "challenge" ||
    lesson.level === "challenge" ||
    sectionChallengeLessonIds.has(lesson.id);

  let rule: LessonRule;

  if (kind === "theory") {
    rule = {
      kind: "required",
      requiresCorrectQuiz: false,
      requiredProblemCodes: [],
    };
  } else if (kind === "assessment") {
    rule = {
      kind: "challenge",
      requiresCorrectQuiz: true,
      requiredProblemCodes: [],
    };
  } else if (bonusLessonIds.has(lesson.id)) {
    rule = {
      kind: "bonus",
      requiresCorrectQuiz: false,
      requiredProblemCodes: [],
    };
  } else {
    rule = {
      kind: isChallenge ? "challenge" : "required",
      requiresCorrectQuiz: true,
      requiredProblemCodes:
        isChallenge && typeof firstRecommendedProblemCode === "number"
          ? [firstRecommendedProblemCode]
          : [],
    };
  }

  if (!lesson.unlockRule) return rule;

  if (lesson.unlockRule.locked === false) {
    return {
      kind: lesson.unlockRule.kind ?? rule.kind,
      requiresCorrectQuiz: false,
      requiredProblemCodes: [],
    };
  }

  return {
    kind: lesson.unlockRule.kind ?? rule.kind,
    requiresCorrectQuiz:
      lesson.unlockRule.requiresCorrectQuiz ?? rule.requiresCorrectQuiz,
    requiredProblemCodes:
      lesson.unlockRule.requiredProblemCodes ?? rule.requiredProblemCodes,
  };
}
