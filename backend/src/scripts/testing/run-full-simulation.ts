import { spawn } from 'child_process';
import path from 'path';

async function runScript(scriptName: string) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, scriptName);
        console.log(`\n๐€ Executing: ${scriptName}...`);

        // Use 'bun' to run the script
        const child = spawn('bun', [scriptPath], { stdio: 'inherit', shell: true });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`โ… ${scriptName} finished successfully.`);
                resolve(code);
            } else {
                console.error(`โ ${scriptName} failed with code ${code}`);
                reject(new Error(`Script ${scriptName} failed`));
            }
        });
    });
}

async function main() {
    try {
        console.log('๐ฌ STARTING FULL LOOP SIMULATION ๐ฌ');
        console.log('=======================================');

        // 1. Run Seeder
        await runScript('seed-simulation.ts');

        // 2. Run Export Trigger
        console.log('\nโณ Waiting 2 seconds before trigger...');
        await new Promise(r => setTimeout(r, 2000));
        await runScript('trigger-export.ts');

        console.log('\n=======================================');
        console.log('โจ SIMULATION COMPLETE โจ');
        console.log('๐‘ Check Google Drive for "batch_YYYY-MM-DD.csv"');
        console.log('๐‘ Check Discord for notification');

    } catch (error) {
        console.error('\nโ SIMULATION ABORTED:', error);
        process.exit(1);
    }
}

main();
