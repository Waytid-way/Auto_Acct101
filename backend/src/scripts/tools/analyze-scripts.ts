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
    const exports: FunctionInfo[] = [];
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

function guessScriptPurpose(filename: string): string {
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
    const inventoryPath = join(
        rootDir,
        "backend",
        "ANALYSIS",
        "FOLDER_INVENTORY.json"
    );
    let folderPaths: string[] = [];

    try {
        const inventoryContent = readFileSync(inventoryPath, "utf-8");
        const inventory = JSON.parse(inventoryContent);
        folderPaths = inventory.map((f: any) => f.path);
    } catch (e) {
        console.error("โ Could not read FOLDER_INVENTORY.json. Falling back to default.");
        folderPaths = [
            "scripts",
            "backend/scripts",
            "backend/src/scripts",
            "backend/src/scripts/testing",
            "backend/src/scripts/maintenance",
            "backend/src/scripts/setup",
            "backend/src/scripts/tools",
            "backend/src/scripts/legacy"
        ];
    }

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
                    purpose_guess: guessScriptPurpose(filename),
                };

                allMetadata.push(metadata);
                console.log(`โ… Analyzed: ${filename}`);
            }
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
                console.error(`โ Error processing ${folderPath}:`, err);
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

    console.log(`\n๐“ Metadata saved to: ${outputPath}`);
    console.log(`\n๐“ Analysis Summary:`);
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
