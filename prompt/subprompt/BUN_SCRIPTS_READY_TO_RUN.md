# 🔍 Bun Scripts for Auto-Acct Code Scanning (Ready-to-Run)

This document contains 4 production-ready Bun scripts. Copy each one to the specified path and run sequentially.

---

## 1️⃣ Script: `list-folders.ts`

**File Path:** `backend/src/scripts/list-folders.ts`

**Purpose:** Discover all script folders and create inventory

```typescript
// backend/src/scripts/list-folders.ts

import { readdirSync, statSync } from "fs";
import { join } from "path";

interface FolderInfo {
  path: string;
  absolutePath: string;
  file_count: number;
  files: string[];
  ts_files: number;
  js_files: number;
}

async function listScriptFolders(): Promise<void> {
  const rootDir = process.cwd();
  const folderPaths = [
    "scripts",
    "backend/scripts",
    "backend/src/scripts",
  ];

  const inventory: FolderInfo[] = [];

  for (const folderPath of folderPaths) {
    const absolutePath = join(rootDir, folderPath);

    try {
      const stats = statSync(absolutePath);
      if (!stats.isDirectory()) {
        console.warn(`❌ ${folderPath} is not a directory`);
        continue;
      }

      const files = readdirSync(absolutePath);
      const tsFiles = files.filter((f) => f.endsWith(".ts"));
      const jsFiles = files.filter((f) => f.endsWith(".js"));

      inventory.push({
        path: folderPath,
        absolutePath,
        file_count: tsFiles.length + jsFiles.length,
        files: tsFiles.concat(jsFiles),
        ts_files: tsFiles.length,
        js_files: jsFiles.length,
      });

      console.log(`✅ Found ${folderPath}:`);
      console.log(`   - TS Files: ${tsFiles.length}`);
      console.log(`   - JS Files: ${jsFiles.length}`);
      console.log(`   - Total: ${tsFiles.length + jsFiles.length}\n`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(`⚠️  Folder not found: ${folderPath}`);
      } else {
        console.error(`❌ Error reading ${folderPath}:`, err);
      }
    }
  }

  // Write inventory to JSON
  const outputPath = join(rootDir, "backend", "ANALYSIS", "FOLDER_INVENTORY.json");
  const fs = await import("fs/promises");

  // Create ANALYSIS directory if it doesn't exist
  await fs.mkdir(join(rootDir, "backend", "ANALYSIS"), { recursive: true });

  await fs.writeFile(outputPath, JSON.stringify(inventory, null, 2));

  console.log(`📝 Inventory saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total folders scanned: ${inventory.length}`);
  console.log(
    `   - Total scripts found: ${inventory.reduce((sum, f) => sum + f.file_count, 0)}`
  );
}

listScriptFolders().catch(console.error);
```

**Run:**
```bash
cd backend
bun run src/scripts/list-folders.ts
```

---

## 2️⃣ Script: `analyze-scripts.ts`

**File Path:** `backend/src/scripts/analyze-scripts.ts`

**Purpose:** Extract metadata from all scripts

```typescript
// backend/src/scripts/analyze-scripts.ts

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

interface FunctionInfo {
  name: string;
  type: "function" | "class" | "interface" | "type" | "const";
  line: number;
}

interface ScriptMetadata {
  path: string;
  filename: string;
  lines_of_code: number;
  first_comment: string | null;
  imports: string[];
  exports: FunctionInfo[];
  has_main_call: boolean;
  has_error_handling: boolean;
  purpose_guess: string;
}

function extractImports(content: string): string[] {
  const importRegex = /^import\s+(?:{[^}]*}|[\w\s,*]+)\s+from\s+['"]([^'"]+)['"]/gm;
  const imports: string[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function extractExports(content: string): FunctionInfo[] {
  const exportRegex = /^export\s+(function|class|interface|type|const)\s+(\w+)/gm;
  const exports: FunctionInfo[] = [];
  let match;
  let line = 1;

  for (const lineContent of content.split("\n")) {
    const exportMatch = /^export\s+(function|class|interface|type|const)\s+(\w+)/.exec(
      lineContent
    );
    if (exportMatch) {
      exports.push({
        name: exportMatch[2],
        type: exportMatch[1] as any,
        line,
      });
    }
    line++;
  }

  return exports;
}

function extractFirstComment(content: string): string | null {
  const lines = content.split("\n");
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith("//")) {
      return line.replace(/^\/\/\s*/, "");
    }
  }
  return null;
}

function guessScriptPurpose(filename: string, content: string): string {
  if (filename.startsWith("test-")) return "Testing";
  if (filename.startsWith("setup-")) return "Configuration";
  if (filename.startsWith("generate-")) return "Configuration";
  if (filename.startsWith("check-")) return "Maintenance";
  if (filename.startsWith("list-")) return "Maintenance";
  if (filename.startsWith("verify-")) return "Verification";
  if (filename.includes("cron")) return "Maintenance (Scheduled)";
  return "Unknown";
}

async function analyzeScripts(): Promise<void> {
  const rootDir = process.cwd();
  const folderPaths = [
    "scripts",
    "backend/scripts",
    "backend/src/scripts",
  ];

  const allMetadata: ScriptMetadata[] = [];

  for (const folderPath of folderPaths) {
    const absolutePath = join(rootDir, folderPath);

    try {
      const stats = statSync(absolutePath);
      if (!stats.isDirectory()) continue;

      const files = readdirSync(absolutePath).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js")
      );

      for (const filename of files) {
        const filePath = join(absolutePath, filename);
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        const metadata: ScriptMetadata = {
          path: join(folderPath, filename),
          filename,
          lines_of_code: lines.length,
          first_comment: extractFirstComment(content),
          imports: extractImports(content),
          exports: extractExports(content),
          has_main_call:
            content.includes(".catch(") || content.includes("main()"),
          has_error_handling: content.includes("try") && content.includes("catch"),
          purpose_guess: guessScriptPurpose(filename, content),
        };

        allMetadata.push(metadata);
        console.log(`✅ Analyzed: ${filename}`);
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`❌ Error processing ${folderPath}:`, err);
      }
    }
  }

  // Write metadata to JSON
  const outputPath = join(
    rootDir,
    "backend",
    "ANALYSIS",
    "SCRIPT_METADATA.json"
  );
  const fs = await import("fs/promises");

  await fs.mkdir(join(rootDir, "backend", "ANALYSIS"), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(allMetadata, null, 2));

  console.log(`\n📝 Metadata saved to: ${outputPath}`);
  console.log(`\n📊 Analysis Summary:`);
  console.log(`   - Total scripts: ${allMetadata.length}`);

  const purposes = [
    ...new Set(allMetadata.map((m) => m.purpose_guess)),
  ];
  for (const purpose of purposes) {
    const count = allMetadata.filter((m) => m.purpose_guess === purpose)
      .length;
    console.log(`   - ${purpose}: ${count}`);
  }
}

analyzeScripts().catch(console.error);
```

**Run:**
```bash
cd backend
bun run src/scripts/analyze-scripts.ts
```

---

## 3️⃣ Script: `categorize-scripts.ts`

**File Path:** `backend/src/scripts/categorize-scripts.ts`

**Purpose:** Categorize each script and create classification

```typescript
// backend/src/scripts/categorize-scripts.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Category = "TESTING" | "CONFIGURATION" | "MAINTENANCE" | "VERIFICATION";
type Subcategory =
  | "API Tests"
  | "Integration Tests"
  | "AI/ML Tests"
  | "Connectivity Tests"
  | "Setup Scripts"
  | "Data Generation"
  | "Health Checks"
  | "Queries"
  | "Scheduled Tasks"
  | "Phase Readiness"
  | "Unknown";

interface CategorizedScript {
  path: string;
  filename: string;
  category: Category;
  subcategory: Subcategory;
  purpose_description: string;
  key_functions: string[];
  dependencies_external: string[];
  dependencies_internal: string[];
  has_error_handling: boolean;
  lines_of_code: number;
}

const CATEGORY_RULES: Record<
  string,
  { category: Category; subcategory: Subcategory }
> = {
  "test-rest-api": {
    category: "TESTING",
    subcategory: "API Tests",
  },
  "test-teable": { category: "TESTING", subcategory: "API Tests" },
  "test-discord-webhooks": {
    category: "TESTING",
    subcategory: "Integration Tests",
  },
  "test-gemini-classification": {
    category: "TESTING",
    subcategory: "AI/ML Tests",
  },
  "test-groq-classification": {
    category: "TESTING",
    subcategory: "AI/ML Tests",
  },
  "test-groq-connection": {
    category: "TESTING",
    subcategory: "Connectivity Tests",
  },
  "test-hybrid-logic": {
    category: "TESTING",
    subcategory: "Integration Tests",
  },
  "setup-teable": {
    category: "CONFIGURATION",
    subcategory: "Setup Scripts",
  },
  "generate-accounting-request-doc": {
    category: "CONFIGURATION",
    subcategory: "Data Generation",
  },
  "check-approved-entries": {
    category: "MAINTENANCE",
    subcategory: "Health Checks",
  },
  "list-gemini-models": {
    category: "MAINTENANCE",
    subcategory: "Queries",
  },
  "sync-flowaccount-cron": {
    category: "MAINTENANCE",
    subcategory: "Scheduled Tasks",
  },
  "verify-phase3-ready": {
    category: "VERIFICATION",
    subcategory: "Phase Readiness",
  },
};

const PURPOSE_DESCRIPTIONS: Record<string, string> = {
  "test-rest-api": "Validates REST API endpoints and health checks",
  "test-teable": "Tests Teable API integration and webhook handling",
  "test-discord-webhooks":
    "Validates Discord webhook alerts for accounting events",
  "test-gemini-classification": "Tests Gemini AI classification model",
  "test-groq-classification":
    "Tests Groq AI (Llama 3.3) classification for Thai accounting categories",
  "test-groq-connection": "Tests connectivity to Groq API",
  "test-hybrid-logic":
    "Tests hybrid OCR logic (PaddleOCR + Google Vision) for receipt processing",
  "setup-teable": "Initializes Teable database schema and configuration",
  "generate-accounting-request-doc":
    "Generates accounting team request forms with examples",
  "check-approved-entries": "Verifies and counts approved ledger entries",
  "list-gemini-models": "Lists available Gemini AI models",
  "sync-flowaccount-cron": "Scheduled sync job with FlowAccount API",
  "verify-phase3-ready": "Verifies Phase 3 readiness before deployment",
};

function categorizeScript(
  filename: string,
  metadata: any
): Partial<CategorizedScript> {
  const basename = filename.replace(/\.(ts|js)$/, "");
  const rules = CATEGORY_RULES[basename];

  if (rules) {
    return {
      category: rules.category,
      subcategory: rules.subcategory,
      purpose_description:
        PURPOSE_DESCRIPTIONS[basename] || "Purpose not documented",
      key_functions: metadata.exports.map((e: any) => e.name),
      dependencies_external: metadata.imports
        .filter((imp: string) => !imp.startsWith("."))
        .slice(0, 3),
      dependencies_internal: metadata.imports.filter((imp: string) =>
        imp.startsWith(".")
      ),
      has_error_handling: metadata.has_error_handling,
      lines_of_code: metadata.lines_of_code,
    };
  }

  // Fallback inference
  if (filename.startsWith("test-")) {
    return {
      category: "TESTING",
      subcategory: "API Tests",
      purpose_description: "Test script",
      key_functions: metadata.exports.map((e: any) => e.name),
      dependencies_external: metadata.imports
        .filter((imp: string) => !imp.startsWith("."))
        .slice(0, 3),
      dependencies_internal: metadata.imports.filter((imp: string) =>
        imp.startsWith(".")
      ),
      has_error_handling: metadata.has_error_handling,
      lines_of_code: metadata.lines_of_code,
    };
  }

  return {
    category: "VERIFICATION",
    subcategory: "Unknown",
    purpose_description: "Purpose unknown - requires manual review",
    key_functions: metadata.exports.map((e: any) => e.name),
    dependencies_external: metadata.imports
      .filter((imp: string) => !imp.startsWith("."))
      .slice(0, 3),
    dependencies_internal: metadata.imports.filter((imp: string) =>
      imp.startsWith(".")
    ),
    has_error_handling: metadata.has_error_handling,
    lines_of_code: metadata.lines_of_code,
  };
}

async function categorizeScripts(): Promise<void> {
  const rootDir = process.cwd();
  const metadataPath = join(
    rootDir,
    "backend",
    "ANALYSIS",
    "SCRIPT_METADATA.json"
  );

  try {
    const metadataContent = readFileSync(metadataPath, "utf-8");
    const allMetadata = JSON.parse(metadataContent);

    const categorized: CategorizedScript[] = allMetadata.map(
      (metadata: any) => ({
        path: metadata.path,
        filename: metadata.filename,
        ...categorizeScript(metadata.filename, metadata),
      })
    );

    const outputPath = join(
      rootDir,
      "backend",
      "ANALYSIS",
      "SCRIPT_CATEGORIZATION.json"
    );
    writeFileSync(outputPath, JSON.stringify(categorized, null, 2));

    console.log(`✅ Categorization complete!`);
    console.log(`📝 Output saved to: ${outputPath}`);

    // Print summary
    const categories = [...new Set(categorized.map((s) => s.category))];
    console.log(`\n📊 Categorization Summary:`);
    for (const cat of categories) {
      const count = categorized.filter((s) => s.category === cat).length;
      console.log(`   - ${cat}: ${count}`);
    }

    // Flag unknown scripts
    const unknown = categorized.filter(
      (s) => s.subcategory === "Unknown"
    );
    if (unknown.length > 0) {
      console.log(`\n⚠️  Scripts requiring manual review:`);
      for (const script of unknown) {
        console.log(`   - ${script.filename}`);
      }
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

categorizeScripts().catch(console.error);
```

**Run:**
```bash
cd backend
bun run src/scripts/categorize-scripts.ts
```

---

## 4️⃣ Script: `generate-docs.ts`

**File Path:** `backend/src/scripts/generate-docs.ts`

**Purpose:** Generate markdown documentation for each folder

```typescript
// backend/src/scripts/generate-docs.ts

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

interface CategorizedScript {
  path: string;
  filename: string;
  category: string;
  subcategory: string;
  purpose_description: string;
  key_functions: string[];
  dependencies_external: string[];
  dependencies_internal: string[];
  has_error_handling: boolean;
  lines_of_code: number;
}

function generateScriptEntry(script: CategorizedScript): string {
  const runCommand = script.path.includes("backend/src")
    ? `bun run backend/src/scripts/${script.filename}`
    : script.path.includes("backend")
      ? `bun run backend/scripts/${script.filename}`
      : `bun run scripts/${script.filename}`;

  return `
### ⚙️ ${script.filename}
**File Path:** \`${script.path}\`  
**Category:** ${script.category} → ${script.subcategory}  
**Lines:** ${script.lines_of_code} | **Error Handling:** ${script.has_error_handling ? "✅ Yes" : "⚠️ No"}

**Purpose:**  
${script.purpose_description}

**Key Functions:**
${script.key_functions.length > 0 ? script.key_functions.map((fn) => `- \`${fn}()\``).join("\n") : "- N/A"}

**Dependencies:**
- External: ${script.dependencies_external.length > 0 ? script.dependencies_external.join(", ") : "None"}
- Internal: ${script.dependencies_internal.length > 0 ? script.dependencies_internal.join(", ") : "None"}

**Usage:**
\`\`\`bash
${runCommand}
\`\`\`

---
`;
}

function generateFolderReadme(
  folderPath: string,
  scripts: CategorizedScript[]
): string {
  const totalLoc = scripts.reduce((sum, s) => sum + s.lines_of_code, 0);
  const categories = [...new Set(scripts.map((s) => s.category))];

  let content = `# 📂 Scripts: ${folderPath}

**Last Updated:** ${new Date().toISOString().split("T")[0]}  
**Total Scripts:** ${scripts.length}  
**Total Lines of Code:** ${totalLoc}  
**Categories:** ${categories.join(", ")}

## 📋 Contents

`;

  for (const category of categories) {
    const categoryScripts = scripts.filter((s) => s.category === category);
    content += `
### ${category}
- **Count:** ${categoryScripts.length}
${categoryScripts.map((s) => `- ${s.filename}`).join("\n")}

`;
  }

  content += `## 📝 Detailed Scripts

`;

  for (const script of scripts) {
    content += generateScriptEntry(script);
  }

  content += `
---
**Generated by Auto-Acct Code Scanner**  
**For:** Auto-Acct-001 (Bun + TypeScript)
`;

  return content;
}

async function generateDocs(): Promise<void> {
  const rootDir = process.cwd();
  const categPath = join(
    rootDir,
    "backend",
    "ANALYSIS",
    "SCRIPT_CATEGORIZATION.json"
  );

  try {
    const categContent = readFileSync(categPath, "utf-8");
    const allScripts: CategorizedScript[] = JSON.parse(categContent);

    // Group by folder
    const folders = [
      "scripts",
      "backend/scripts",
      "backend/src/scripts",
    ];

    for (const folderName of folders) {
      const folderScripts = allScripts.filter((s) =>
        s.path.startsWith(folderName)
      );

      if (folderScripts.length === 0) continue;

      const readmePath = join(rootDir, folderName, "README_SCRIPTS.md");
      mkdirSync(join(rootDir, folderName), { recursive: true });

      const readme = generateFolderReadme(folderName, folderScripts);
      writeFileSync(readmePath, readme);

      console.log(`✅ Generated: ${readmePath}`);
    }

    // Generate master summary
    const summaryPath = join(rootDir, "SCRIPTS_SUMMARY.md");
    let summary = `# 📚 Auto-Acct Scripts Summary

**Generated:** ${new Date().toISOString()}  
**Total Scripts:** ${allScripts.length}

## 📊 Statistics

| Category | Count | Subcategories |
|----------|-------|----------------|
`;

    const categories = [...new Set(allScripts.map((s) => s.category))];
    for (const cat of categories) {
      const catScripts = allScripts.filter((s) => s.category === cat);
      const subcats = [
        ...new Set(catScripts.map((s) => s.subcategory)),
      ];
      summary += `| ${cat} | ${catScripts.length} | ${subcats.join(", ")} |\n`;
    }

    summary += `
## 🗂️ By Folder

`;

    for (const folder of folders) {
      const folderScripts = allScripts.filter((s) =>
        s.path.startsWith(folder)
      );
      if (folderScripts.length === 0) continue;

      summary += `### ${folder}\n`;
      summary += `- **Scripts:** ${folderScripts.length}\n`;
      summary += folderScripts.map((s) => `- ${s.filename}`).join("\n");
      summary += `\n\n`;
    }

    writeFileSync(summaryPath, summary);
    console.log(`\n✅ Master summary generated: ${summaryPath}`);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

generateDocs().catch(console.error);
```

**Run:**
```bash
cd backend
bun run src/scripts/generate-docs.ts
```

---

## 🚀 FULL EXECUTION SEQUENCE

```bash
# Step 1: List all folders
cd backend
bun run src/scripts/list-folders.ts

# Step 2: Analyze all scripts
bun run src/scripts/analyze-scripts.ts

# Step 3: Categorize scripts
bun run src/scripts/categorize-scripts.ts

# Step 4: Generate documentation
bun run src/scripts/generate-docs.ts

# Verify output
ls -la ANALYSIS/
cat SCRIPTS_SUMMARY.md
```

---

## 📦 Expected Output Files

```
backend/ANALYSIS/
├── FOLDER_INVENTORY.json          # List of all folders & files
├── SCRIPT_METADATA.json           # Raw metadata from parsing
└── SCRIPT_CATEGORIZATION.json     # Categorized with purposes

Root:
├── SCRIPTS_SUMMARY.md             # Master summary

Folders (Updated):
├── scripts/README_SCRIPTS.md
├── backend/scripts/README_SCRIPTS.md
└── backend/src/scripts/README_SCRIPTS.md
```

---

**Ready to use with Antigravity IDE! Copy & run step-by-step.**