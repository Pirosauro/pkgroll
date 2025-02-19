import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { pkgroll } from '../../utils';

export default testSuite(({ describe }, nodePath: string) => {
	describe('TypeScript', ({ test }) => {
		test('resolves .jsx -> .tsx', async () => {
			const fixture = await createFixture({
				src: {
					'index.ts': 'import "./file.jsx"',
					'file.tsx': 'console.log(1)',
				},
				'package.json': JSON.stringify({
					main: './dist/index.js',
					type: 'module',
				}),
			});

			const pkgrollProcess = await pkgroll(['--env.NODE_ENV=development'], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/index.js', 'utf8');
			expect(content).toBe('console.log(1);\n');

			await fixture.rm();
		});

		test('resolves .jsx from .js', async () => {
			const fixture = await createFixture({
				src: {
					'index.js': 'import "./file.jsx"',
					'file.jsx': 'console.log(1)',
				},
				'package.json': JSON.stringify({
					main: './dist/index.js',
					type: 'module',
				}),
			});

			const pkgrollProcess = await pkgroll(['--env.NODE_ENV=development'], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/index.js', 'utf8');
			expect(content).toBe('console.log(1);\n');

			await fixture.rm();
		});
	});
});
