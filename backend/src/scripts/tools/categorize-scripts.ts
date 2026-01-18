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
    // --- TESTING ---
    "test-rest-api": { category: "TESTING", subcategory: "API Tests" },
    "test-teable": { category: "TESTING", subcategory: "API Tests" },
    "test-teable-update": { category: "TESTING", subcategory: "API Tests" },
    "test-discord-webhooks": { category: "TESTING", subcategory: "Integration Tests" },
    "test-hybrid-logic": { category: "TESTING", subcategory: "Integration Tests" },
    "simulate-webhook": { category: "TESTING", subcategory: "Integration Tests" },
    "test-gemini-classification": { category: "TESTING", subcategory: "AI/ML Tests" },
    "test-groq-classification": { category: "TESTING", subcategory: "AI/ML Tests" },
    "simple-gemini-test": { category: "TESTING", subcategory: "AI/ML Tests" },
    "test-groq-connection": { category: "TESTING", subcategory: "Connectivity Tests" },
    "run-full-simulation": { category: "TESTING", subcategory: "Integration Tests" }, // E2E
    "simulate-bulk-data": { category: "TESTING", subcategory: "Data Generation" },
    "simulate-realworld-flow": { category: "TESTING", subcategory: "Integration Tests" },
    "simulate-realworld-with-ai": { category: "TESTING", subcategory: "Integration Tests" },
    "seed-simulation": { category: "TESTING", subcategory: "Data Generation" },
    "stress-test-discord": { category: "TESTING", subcategory: "Integration Tests" }, // Load Test
    "manual-full-loop-test": { category: "TESTING", subcategory: "Integration Tests" }, // Manual E2E

    // --- CONFIGURATION ---
    "setup-teable": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "setup-teable-schema": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "setup-google-oauth": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "deploy-commands": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "register-discord-commands": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "register-teable-webhook": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "update-teable-options": { category: "CONFIGURATION", subcategory: "Setup Scripts" },
    "generate-accounting-request-doc": { category: "CONFIGURATION", subcategory: "Data Generation" },
    "add-drcr-columns": { category: "CONFIGURATION", subcategory: "Setup Scripts" }, // Migration
    "add-export-path-column": { category: "CONFIGURATION", subcategory: "Setup Scripts" }, // Migration

    // --- MAINTENANCE ---
    "check-approved-entries": { category: "MAINTENANCE", subcategory: "Health Checks" },
    "analyze-state": { category: "MAINTENANCE", subcategory: "Health Checks" },
    "check-queue": { category: "MAINTENANCE", subcategory: "Health Checks" },
    "list-gemini-models": { category: "MAINTENANCE", subcategory: "Queries" },
    "sync-flowaccount-cron": { category: "MAINTENANCE", subcategory: "Scheduled Tasks" },
    "trigger-export": { category: "MAINTENANCE", subcategory: "Scheduled Tasks" }, // Manual Trigger
    "force-poll": { category: "MAINTENANCE", subcategory: "Scheduled Tasks" }, // Manual Trigger
    "clear-queue": { category: "MAINTENANCE", subcategory: "Health Checks" }, // Ops
    "clear-teable": { category: "MAINTENANCE", subcategory: "Health Checks" }, // Ops
    "wipe-data": { category: "MAINTENANCE", subcategory: "Health Checks" }, // Ops
    "debug-status": { category: "MAINTENANCE", subcategory: "Health Checks" }, // Debug
    "debug-teable": { category: "MAINTENANCE", subcategory: "Health Checks" }, // Debug

    // --- CODE ANALYSIS (Self) ---
    "list-folders": { category: "MAINTENANCE", subcategory: "Health Checks" },
    "analyze-scripts": { category: "MAINTENANCE", subcategory: "Health Checks" },
    "categorize-scripts": { category: "MAINTENANCE", subcategory: "Health Checks" },
    "generate-docs": { category: "MAINTENANCE", subcategory: "Health Checks" },

    // --- VERIFICATION ---
    "verify-phase3-ready": { category: "VERIFICATION", subcategory: "Phase Readiness" },
};

const PURPOSE_DESCRIPTIONS: Record<string, string> = {
    "test-rest-api": "Validates REST API endpoints and health checks",
    "test-teable": "Tests Teable API integration and webhook handling",
    "test-teable-update": "Tests Teable record update functionality",
    "test-discord-webhooks": "Validates Discord webhook alerts for accounting events",
    "test-hybrid-logic": "Tests hybrid OCR logic (PaddleOCR + Google Vision)",
    "test-gemini-classification": "Tests Gemini AI classification model",
    "test-groq-classification": "Tests Groq AI (Llama 3.3) classification",
    "test-groq-connection": "Tests connectivity to Groq API",
    "simple-gemini-test": "Simple connectivity test for Gemini API",
    "setup-teable": "Initializes Teable database schema and configuration",
    "setup-teable-schema": "Full schema initialization for Teable tables",
    "setup-google-oauth": "Interactive setup for Google Drive OAuth2",
    "generate-accounting-request-doc": "Generates accounting team request forms",
    "check-approved-entries": "Verifies approved ledger entries",
    "list-gemini-models": "Lists available Gemini AI models",
    "sync-flowaccount-cron": "Scheduled sync job with FlowAccount API",
    "verify-phase3-ready": "Verifies Phase 3 readiness before deployment",
    "analyze-state": "Analyzes current system state (Journal Entries & Export Queue)",
    "check-queue": "Inspects items currently in the export queue",
    "clear-queue": "Clears all items from the export queue",
    "clear-teable": "Deletes all records from Teable (Cleanup)",
    "debug-status": "Detailed debugging of record status and linking",
    "debug-teable": "Debug script for raw Teable API interactions",
    "deploy-commands": "Deploys Discord slash commands to the server",
    "force-poll": "Manually triggers the Teable Polling Job",
    "register-discord-commands": "Registers Discord slash commands (alternative)",
    "register-teable-webhook": "Registers webhook URL with Teable",
    "run-full-simulation": "Orchestrates a full end-to-end system simulation",
    "seed-simulation": "Seeds database with test data for simulation",
    "simulate-bulk-data": "Generates bulk transaction data for load testing",
    "simulate-realworld-flow": "Simulates a user flow from upload to approval",
    "simulate-realworld-with-ai": "Simulates flow including AI classification step",
    "simulate-webhook": "Simulates incoming webhook payloads from Teable",
    "stress-test-discord": "Stress tests Discord notification system",
    "trigger-export": "Manually triggers the Daily Export Job",
    "update-teable-options": "Updates Select field options in Teable",
    "wipe-data": "Wipes local MongoDB data for clean slate testing",
    "add-drcr-columns": "Migration: Adds DR/CR columns to Teable schema",
    "add-export-path-column": "Migration: Adds Export Path column to Teable",
    "manual-full-loop-test": "Manual trigger script for verifying full loop",
    "list-folders": "Inventories script folders for code scanning",
    "analyze-scripts": "Extracts metadata from script files",
    "categorize-scripts": "Categorizes scripts based on metadata and rules",
    "generate-docs": "Generates markdown documentation for scripts",
};

interface ScriptMetadata {
    path: string;
    filename: string;
    lines_of_code: number;
    first_comment: string | null;
    imports: string[];
    exports: { name: string; type: string; line: number }[];
    has_main_call: boolean;
    has_error_handling: boolean;
    purpose_guess: string;
}

function categorizeScript(
    filename: string,
    metadata: ScriptMetadata
): Partial<CategorizedScript> {
    const basename = filename.replace(/\.(ts|js)$/, "");
    const rules = CATEGORY_RULES[basename];

    if (rules) {
        return {
            category: rules.category,
            subcategory: rules.subcategory,
            purpose_description:
                PURPOSE_DESCRIPTIONS[basename] || "Purpose not documented",
            key_functions: metadata.exports.map((e) => e.name),
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
            key_functions: metadata.exports.map((e) => e.name),
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
        key_functions: metadata.exports.map((e) => e.name),
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
        const allMetadata: ScriptMetadata[] = JSON.parse(metadataContent);

        const categorized: CategorizedScript[] = allMetadata.map(
            (metadata) => ({
                path: metadata.path,
                filename: metadata.filename,
                ...categorizeScript(metadata.filename, metadata),
            }) as CategorizedScript
        );

        const outputPath = join(
            rootDir,
            "backend",
            "ANALYSIS",
            "SCRIPT_CATEGORIZATION.json"
        );
        writeFileSync(outputPath, JSON.stringify(categorized, null, 2));

        console.log(`โ… Categorization complete!`);
        console.log(`๐“ Output saved to: ${outputPath}`);

        // Print summary
        const categories = [...new Set(categorized.map((s) => s.category))];
        console.log(`\n๐“ Categorization Summary:`);
        for (const cat of categories) {
            const count = categorized.filter((s) => s.category === cat).length;
            console.log(`   - ${cat}: ${count}`);
        }

        // Flag unknown scripts
        const unknown = categorized.filter(
            (s) => s.subcategory === "Unknown"
        );
        if (unknown.length > 0) {
            console.log(`\nโ ๏ธ  Scripts requiring manual review:`);
            for (const script of unknown) {
                console.log(`   - ${script.filename}`);
            }
        }
    } catch (err) {
        console.error("โ Error:", err);
    }
}

categorizeScripts().catch(console.error);
