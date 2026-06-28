import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Enforce @/ path alias usage - prevent relative imports for shared code
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../**/components/*", "../**/lib/*", "../**/hooks/*", "../**/services/*", "../**/context/*"],
              message: "Use @/ path alias instead of relative imports for shared code (e.g., @/components/ui/button instead of ../../components/ui/button)",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
