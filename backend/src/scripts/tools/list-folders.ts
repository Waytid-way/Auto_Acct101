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
    const foldersToScan = [
        "scripts",
        "backend/scripts",
        "backend/src/scripts",
        "backend/src/scripts/testing",
        "backend/src/scripts/maintenance",
        "backend/src/scripts/setup",
        "backend/src/scripts/tools",
        "backend/src/scripts/legacy"
    ];

    const inventory: FolderInfo[] = [];

    for (const folderPath of foldersToScan) {
        const absolutePath = join(rootDir, folderPath);

        try {
            const stats = statSync(absolutePath);
            if (!stats.isDirectory()) {
                console.warn(`โ ${folderPath} is not a directory`);
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

            console.log(`โ… Found ${folderPath}:`);
            console.log(`   - TS Files: ${tsFiles.length}`);
            console.log(`   - JS Files: ${jsFiles.length}`);
            console.log(`   - Total: ${tsFiles.length + jsFiles.length}\n`);
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                console.warn(`โ ๏ธ  Folder not found: ${folderPath}`);
            } else {
                console.error(`โ Error reading ${folderPath}:`, err);
            }
        }
    }

    // Write inventory to JSON
    const outputPath = join(rootDir, "backend", "ANALYSIS", "FOLDER_INVENTORY.json");
    const fs = await import("fs/promises");

    // Create ANALYSIS directory if it doesn't exist
    await fs.mkdir(join(rootDir, "backend", "ANALYSIS"), { recursive: true });

    await fs.writeFile(outputPath, JSON.stringify(inventory, null, 2));

    console.log(`๐“ Inventory saved to: ${outputPath}`);
    console.log(`\n๐“ Summary:`);
    console.log(`   - Total folders scanned: ${inventory.length}`);
    console.log(
        `   - Total scripts found: ${inventory.reduce((sum, f) => sum + f.file_count, 0)}`
    );
}

listScriptFolders().catch(console.error);
