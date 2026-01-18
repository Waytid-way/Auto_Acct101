import { readFileSync } from "fs";
import { join } from "path";

interface QualityCheck {
    status: "PASS" | "WARN" | "FAIL" | "N/A";
    notes: string;
}

interface ScriptQuality {
    script: string;
    path: string;
    quality_score: number;
    checks: {
        error_handling: QualityCheck;
        typescript: QualityCheck;
        financial_safety: QualityCheck;
        security: QualityCheck;
    };
    recommendations: string[];
}

async function analyzeScriptQuality(): Promise<void> {
    const rootDir = process.cwd();

    // Read Inventory to get list of files
    const inventoryPath = join(rootDir, "backend", "ANALYSIS", "FOLDER_INVENTORY.json");
    let inventory: any[] = [];

    try {
        inventory = JSON.parse(readFileSync(inventoryPath, "utf-8"));
    } catch (err) {
        console.error("โ Could not read FOLDER_INVENTORY.json. Run list-folders.ts first.");
        return;
    }

    const allQualityReports: ScriptQuality[] = [];

    for (const folder of inventory) {
        for (const filename of folder.files) {
            if (!filename.endsWith(".ts")) continue;

            const filePath = join(folder.absolutePath, filename);
            const content = readFileSync(filePath, "utf-8");

            // --- CHECKS ---

            // 1. Error Handling
            const hasTryCatch = content.includes("try") && content.includes("catch");
            const errorHandlingCheck: QualityCheck = {
                status: hasTryCatch ? "PASS" : "WARN",
                notes: hasTryCatch
                    ? "Basic try-catch blocks found."
                    : "No try-catch blocks detected. Ensure top-level error handling."
            };

            // 2. TypeScript Quality (ANY check)
            const anyCount = (content.match(/: any/g) || []).length + (content.match(/as any/g) || []).length;
            const tsCheck: QualityCheck = {
                status: anyCount === 0 ? "PASS" : (anyCount < 5 ? "WARN" : "FAIL"),
                notes: anyCount === 0
                    ? "No explicit 'any' types found."
                    : `Found ${anyCount} usage(s) of 'any'.`
            };

            // 3. Financial Safety (Floats vs Integers for Money)
            // Heuristic: Check for 'Number' type on fields that look like money
            const hasMoneyFloat = /amount.*:.*number/i.test(content) || /price.*:.*number/i.test(content);
            const usesSatang = /satang/i.test(content) || /integer/i.test(content); // Naive check for "satang" concept

            let financialStatus: "PASS" | "WARN" | "N/A" = "N/A";
            let financialNotes = "Not a financial script.";

            if (hasMoneyFloat) {
                financialStatus = usesSatang ? "PASS" : "WARN";
                financialNotes = usesSatang
                    ? "Money fields detected, likely using Satang/Integers."
                    : "Money fields detected. Verify if using floats (unsafe) or integers.";
            }

            // 4. Security (Credentials in valid locations?)
            // Check for hardcoded secrets (Basic heuristics)
            const hasHardcodedSecret = /['"`](sk_live | rk_live | mongodb:| postgres:)/.test(content);
            const securityCheck: QualityCheck = {
                status: hasHardcodedSecret ? "FAIL" : "PASS",
                notes: hasHardcodedSecret
                    ? "Potential hardcoded secret detected!"
                    : "No obvious hardcoded secrets found."
            };

            // --- SCORING ---
            let score = 100;
            if (errorHandlingCheck.status === "WARN") score -= 20;
            if (tsCheck.status === "WARN") score -= 15;
            if (tsCheck.status === "FAIL") score -= 40;
            if (financialStatus === "WARN") score -= 20;
            if (securityCheck.status === "FAIL") score -= 50;

            const recs: string[] = [];
            if (errorHandlingCheck.status !== "PASS") recs.push("Add try-catch blocks for error safety.");
            if (tsCheck.status !== "PASS") recs.push(`Refactor ${anyCount} 'any' types to specific interfaces.`);
            if (financialStatus === "WARN") recs.push("Ensure money calculations use integers (Satang).");
            if (securityCheck.status === "FAIL") recs.push("REMOVE HARDCODED SECRETS IMMEDIATELY.");

            allQualityReports.push({
                script: filename,
                path: join(folder.path, filename),
                quality_score: Math.max(0, score),
                checks: {
                    error_handling: errorHandlingCheck,
                    typescript: tsCheck,
                    financial_safety: { status: financialStatus, notes: financialNotes },
                    security: securityCheck
                },
                recommendations: recs
            });

            console.log(`๐” Analyzed Quality: ${filename} (Score: ${Math.max(0, score)})`);
        }
    }

    // Sort by lowest score first (to highlight issues)
    allQualityReports.sort((a, b) => a.quality_score - b.quality_score);

    // Output
    const outputPath = join(rootDir, "backend", "ANALYSIS", "SCRIPT_QUALITY_REPORT.json");
    const fs = await import("fs/promises");
    await fs.mkdir(join(rootDir, "backend", "ANALYSIS"), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(allQualityReports, null, 2));

    console.log(`\nโ… Quality Analysis Complete! Report saved to: ${outputPath}`);

    // Summary Log
    const perfect = allQualityReports.filter(r => r.quality_score === 100).length;
    const critical = allQualityReports.filter(r => r.quality_score < 50).length;

    console.log(`\n๐“ Quality Summary:`);
    console.log(`   - Perfect Scores (100): ${perfect}`);
    console.log(`   - Critical Issues (<50): ${critical}`);
    console.log(`   - Average Score: ${Math.round(allQualityReports.reduce((s, r) => s + r.quality_score, 0) / allQualityReports.length)}`);

    if (critical > 0) {
        console.log(`\nโ ๏ธ  Top Critical Files:`);
        allQualityReports.slice(0, 5).forEach(r => {
            if (r.quality_score < 60) console.log(`   - ${r.script}: ${r.quality_score}`);
        });
    }
}

analyzeScriptQuality().catch(console.error);
