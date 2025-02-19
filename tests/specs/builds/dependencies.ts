import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { pkgroll, installTypeScript } from '../../utils';

export default testSuite(({ describe }, nodePath: string) => {
	describe('dependencies', ({ test }) => {
		test('externalize dependencies', async () => {
			const fixture = await createFixture('./tests/fixture-package');

			await fixture.writeJson('package.json', {
				main: './dist/dependency-external.js',
				dependencies: {
					'@org/name': '*',
				},
			});

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/dependency-external.js', 'utf8');
			expect(content).toMatch('require(\'@org/name/path\')');

			await fixture.rm();
		});

		test('externalize types', async () => {
			const fixture = await createFixture({
				'package.json': JSON.stringify({
					types: 'dist/index.d.ts',
					dependencies: {
						'@types/pkg': '*',
						'@types/square-icons__react': '*',
					},
				}),
				'node_modules/@types': {
					'pkg/index.d.ts': 'export type typeA = {}',
					'square-icons__react/index.d.ts': 'export type typeB = {}',
				},
				'src/index.d.ts': `
				import type { typeA } from 'pkg';
				import type { typeB } from '@square-icons/react';
				export const a: typeA;
				export const b: typeB;
				`,
			});

			installTypeScript(fixture.path);

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });
			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/index.d.ts', 'utf8');
			expect(content).toMatch('from \'pkg\'');
			expect(content).toMatch('from \'@square-icons/react\'');

			await fixture.rm();
		});

		test('bundle in types if only in devDependency', async () => {
			const fixture = await createFixture({
				'package.json': JSON.stringify({
					types: 'dist/index.d.ts',
					devDependencies: {
						'@types/react': '*',
					},
				}),
				'node_modules/@types/react': {
					'index.d.ts': 'declare const A: { b: number }; export { A }',
				},
				'src/index.d.ts': 'export { A } from "react"',
			});

			installTypeScript(fixture.path);

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });
			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/index.d.ts', 'utf8');
			expect(content).toBe('declare const A: { b: number };\n\nexport { A };\n');

			await fixture.rm();
		});

		test('externalize dependency & type despite devDependency type', async () => {
			const fixture = await createFixture({
				'package.json': JSON.stringify({
					main: 'dist/index.js',
					types: 'dist/index.d.ts',
					dependencies: {
						react: '*',
					},
					devDependencies: {
						'@types/react': '*',
					},
				}),
				node_modules: {
					'@types/react': {
						'index.d.ts': 'declare const A: { b: number }; export { A }',
					},
					react: {
						'index.js': 'export const A = {}',
					},
				},
				'src/index.ts': 'export { A } from "react"',
			});

			installTypeScript(fixture.path);

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });
			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe(
				'Recommendation: "@types/react" is externalized because "react" is in "dependencies". Place "@types/react" in "dependencies" as well so users don\'t have missing types.',
			);

			const contentJs = await fixture.readFile('dist/index.js', 'utf8');
			expect(contentJs).toMatch('require(\'react\')');

			// Types externalized despite @types/react being a devDependency
			const contentTypes = await fixture.readFile('dist/index.d.ts', 'utf8');
			expect(contentTypes).toBe('export { A } from \'react\';\n');

			await fixture.rm();
		});

		test('dual package - require', async () => {
			const fixture = await createFixture('./tests/fixture-package');

			await fixture.writeJson('package.json', {
				main: './dist/dependency-exports-require.js',
			});

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/dependency-exports-require.js', 'utf8');
			expect(content).toMatch('cjs');

			await fixture.rm();
		});

		test('dual package - import', async () => {
			const fixture = await createFixture('./tests/fixture-package');

			await fixture.writeJson('package.json', {
				main: './dist/dependency-exports-import.js',
			});

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/dependency-exports-import.js', 'utf8');
			expect(content).toMatch('esm');

			await fixture.rm();
		});

		test('imports map - default', async () => {
			const fixture = await createFixture('./tests/fixture-package');

			await fixture.writeJson('package.json', {
				main: './dist/dependency-imports-map.js',
			});

			const pkgrollProcess = await pkgroll([], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/dependency-imports-map.js', 'utf8');
			expect(content).toMatch('default');

			await fixture.rm();
		});

		test('imports map - node', async () => {
			const fixture = await createFixture('./tests/fixture-package');

			await fixture.writeJson('package.json', {
				main: './dist/dependency-imports-map.js',
			});

			const pkgrollProcess = await pkgroll(['--export-condition=node'], { cwd: fixture.path, nodePath });

			expect(pkgrollProcess.exitCode).toBe(0);
			expect(pkgrollProcess.stderr).toBe('');

			const content = await fixture.readFile('dist/dependency-imports-map.js', 'utf8');
			expect(content).toMatch('node');

			await fixture.rm();
		});
	});
});
