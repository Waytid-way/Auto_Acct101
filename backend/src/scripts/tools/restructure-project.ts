import { readFileSync, renameSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

async function restructureScripts() {
    const rootDir = process.cwd();
    const analysisPath = join(rootDir, "backend", "ANALYSIS", "SCRIPT_CATEGORIZATION.json");

    if (!existsSync(analysisPath)) {
        console.error("โ Analysis file not found!");
        return;
    }

    const categorized = JSON.parse(readFileSync(analysisPath, "utf-8"));

    // Define mapping
    const categoryMap: Record<string, string> = {
        "TESTING": "testing",
        "MAINTENANCE": "maintenance",
        "CONFIGURATION": "setup",
        "VERIFICATION": "testing", // Merge verification into testing
    };

    // Specific overrides
    const specificOverrides: Record<string, string> = {
        "list-folders": "tools",
        "analyze-scripts": "tools",
        "categorize-scripts": "tools",
        "generate-docs": "tools",
        "generate-final-report": "tools",
        "analyze-script-quality": "tools",

        "add-drcr-columns": "legacy",
        "add-export-path-column": "legacy",
        "list-gemini-models": "tools"
    };

    let movedCount = 0;

    for (const script of categorized) {
        const fileName = script.filename;
        const oldPath = join(rootDir, script.path); // script.path is relative from root

        if (!existsSync(oldPath)) {
            console.warn(`โ ๏ธ File not found (skipping): ${oldPath}`);
            continue;
        }

        // Determine new folder
        const baseNameNoExt = fileName.replace(/\.ts$/, "");
        let targetSubfolder = specificOverrides[baseNameNoExt];

        if (!targetSubfolder) {
            targetSubfolder = categoryMap[script.category] || "misc";
        }

        const targetDir = join(rootDir, "backend", "src", "scripts", targetSubfolder);
        const newPath = join(targetDir, fileName);

        // skip if already there
        if (oldPath === newPath) continue;

        // Ensure dir exists
        mkdirSync(targetDir, { recursive: true });

        // Move File
        try {
            renameSync(oldPath, newPath);
            console.log(`โ… Moved: ${fileName} -> ${targetSubfolder}`);
            movedCount++;

            // UPDATE CONTENT (Simple ../ replacement)
            // Legacy path depth: 
            // backend/scripts (depth 2)
            // backend/src/scripts (depth 3)
            // New path depth:
            // backend/src/scripts/subdir (depth 4)

            // So imports that were `../src` (from backend/scripts) need to become `../../../src`
            // Imports that were `../config` (from backend/src/scripts) need to become `../../config`

            let content = readFileSync(newPath, "utf-8");

            // Heuristic replacement for common internal imports
            // 1. imports from `backend/scripts` (often use `../src/...`)
            if (script.path.startsWith("backend/scripts") || script.path.startsWith("backend\\scripts")) {
                content = content.replace(/\.\.\/src\//g, "../../");
            }

            // 2. imports from `backend/src/scripts` (often use `../...`)
            // e.g., `../config/env` becomes `../../config/env`
            if (script.path.startsWith("backend/src/scripts") || script.path.startsWith("backend\\src\\scripts")) {
                content = content.replace(/from ['"]\.\.\//g, 'from "../../');
                content = content.replace(/require\(['"]\.\.\//g, 'require("../../');
            }

            // 3. imports from root `scripts` (often use `../backend/src/...`)
            if (script.path.startsWith("scripts/") || script.path.startsWith("scripts\\")) {
                content = content.replace(/\.\.\/backend\/src\//g, "../../");
            }

            writeFileSync(newPath, content);

        } catch (err) {
            console.error(`โ Failed to move ${fileName}:`, err);
        }
    }

    console.log(`\n๐ Restructuring Complete. Moved ${movedCount} files.`);
}

restructureScripts();
