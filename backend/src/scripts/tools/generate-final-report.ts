import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

async function generateFinalReport(): Promise<void> {
    const rootDir = process.cwd();
    const analysisDir = join(rootDir, "backend", "ANALYSIS");

    // Read JSON Sources
    const categorization = JSON.parse(readFileSync(join(analysisDir, "SCRIPT_CATEGORIZATION.json"), "utf-8"));
    const quality = JSON.parse(readFileSync(join(analysisDir, "SCRIPT_QUALITY_REPORT.json"), "utf-8"));
    const inventory = JSON.parse(readFileSync(join(analysisDir, "FOLDER_INVENTORY.json"), "utf-8"));

    // calculate Logic
    const totalScripts = categorization.length;
    const totalLoc = categorization.reduce((sum: number, s: any) => sum + s.lines_of_code, 0);
    const avgScore = Math.round(quality.reduce((sum: number, s: any) => sum + s.quality_score, 0) / quality.length);
    const perfectScripts = quality.filter((s: any) => s.quality_score === 100).length;

    // Group by Category
    const cats: Record<string, number> = {};
    categorization.forEach((s: any) => {
        cats[s.category] = (cats[s.category] || 0) + 1;
    });

    // Top Refactor Candidates (Bottom 5 Quality)
    const refactorCandidates = quality
        .sort((a: any, b: any) => a.quality_score - b.quality_score)
        .slice(0, 5);

    let content = `# ๐“‘ Auto-Acct Code Audit Report (Final)

**Date:** ${new Date().toISOString().split('T')[0]}
**Total Scripts:** ${totalScripts}
**Total Lines of Code:** ${totalLoc}
**Overall Quality Score:** ${avgScore}/100

## 1. ๐—๏ธ Architecture Overview

### Distribution by Category
| Category | Scripts | % of Codebase |
|:---|:---:|:---:|
${Object.entries(cats).map(([cat, count]) => `| ${cat} | ${count} | ${Math.round((count as number / totalScripts) * 100)}% |`).join('\n')}

### Folder Structure
${inventory.map((f: any) => `- **${f.path}**: ${f.file_count} files`).join('\n')}

## 2. ๐ก๏ธ Quality Assurance

### Key Metrics
- **Perfect Scripts (100/100):** ${perfectScripts}
- **Scripts Needing Review (<70):** ${quality.filter((s: any) => s.quality_score < 70).length}

### โ ๏ธ Top 5 Refactoring Candidates
These scripts have the lowest quality scores and should be prioritized for refactoring.

| Score | Script | Key Issues |
|:---:|:---|:---|
${refactorCandidates.map((s: any) => {
        const issues = [];
        if (s.checks.typescript.status !== 'PASS') issues.push(s.checks.typescript.notes);
        if (s.checks.error_handling.status !== 'PASS') issues.push('Missing error handling');
        return `| **${s.quality_score}** | \`${s.script}\` | ${issues.join('<br>')} |`;
    }).join('\n')}

## 3. ๐” Detailed Inventory & Analysis

### ๐“ฆ Dependencies
- **External Packages:** ${[...new Set(categorization.flatMap((s: any) => s.dependencies_external))].length} unique packages used.
- **Internal Modules:** ${[...new Set(categorization.flatMap((s: any) => s.dependencies_internal))].length} internal import paths.

### Full Script List
See [SCRIPT_CATEGORIZATION.json](backend/ANALYSIS/SCRIPT_CATEGORIZATION.json) for raw data.

---
**Report Generated via Auto-Acct Code Scanner**
`;

    const outputPath = join(rootDir, "FINAL_CODE_AUDIT_REPORT.md");
    writeFileSync(outputPath, content);

    console.log(`โ… Final Report Generated: ${outputPath}`);
}

generateFinalReport().catch(console.error);
