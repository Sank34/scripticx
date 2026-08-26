import { common, createLowlight, type LanguageFn } from "lowlight";

const miniScriptLanguage: LanguageFn = (hljs) => ({
  aliases: ["msp"],
  case_insensitive: true,
  contains: [
    hljs.HASH_COMMENT_MODE,
    hljs.QUOTE_STRING_MODE,
    hljs.APOS_STRING_MODE,
    hljs.NUMBER_MODE,
  ],
  keywords: {
    built_in:
      "ABS CEIL FLOOR INT MAX MIN ROUND SQRT TRUNC LENGTH RANDOM SUBSTRING",
    keyword:
      "AND DIV ELSE END FOR IF INPUT MOD NOT OR PRINT STEP THEN TO WHILE",
    literal: "FALSE TRUE",
  },
  name: "MiniScript+",
});

/** Shared, client-safe highlighter for editable note code blocks. */
export const noteCodeLowlight = createLowlight(common);

noteCodeLowlight.register("miniscript", miniScriptLanguage);
