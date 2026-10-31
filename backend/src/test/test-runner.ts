import { spawn } from 'child_process';
import path from 'path';

const testDir = path.resolve(process.cwd(), 'src/test');

const runScript = (scriptName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(testDir, scriptName);
    console.log(`\n>>> Executing Test Suite: ${scriptName}...\n`);
    const proc = spawn('npx', ['tsx', scriptPath], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, CLOUDINARY_TEST_MOCK: '1' },
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test script ${scriptName} failed with exit code ${code}`));
      }
    });
  });
};

const runAllTests = async () => {
  try {
    await runScript('tenant-isolation.test.ts');
    await runScript('phase2-case-client.test.ts');
    await runScript('phase3-diary-hearing.test.ts');
    await runScript('phase3.1-calendar.test.ts');
    await runScript('phase4-reminders-tasks.test.ts');
    await runScript('settings.test.ts');
    await runScript('phase5-documents-reports.test.ts');
    await runScript('marathi-i18n.test.ts');
    await runScript('cloudinary-avatar.test.ts');
    console.log('\n======================================================');
    console.log('   ALL BACKEND TEST SUITES COMPLETED SUCCESSFULLY!    ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\nTest runner execution failed:', err.message);
    process.exit(1);
  }
};

runAllTests();
