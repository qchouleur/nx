import { installedCypressVersion } from '@nrwl/cypress/src/utils/cypress-version';
import { readJson } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Linter } from '@nrwl/linter';
import libraryGenerator from './library';
import { Schema } from './schema';
// need to mock cypress otherwise it'll use the nx installed version from package.json
//  which is v9 while we are testing for the new v10 version
jest.mock('@nrwl/cypress/src/utils/cypress-version');
describe('next library', () => {
  let mockedInstalledCypressVersion: jest.Mock<
    ReturnType<typeof installedCypressVersion>
  > = installedCypressVersion as never;
  it('should use "@nrwl/next/babel" preset in babelrc', async () => {
    const baseOptions: Schema = {
      name: '',
      linter: Linter.EsLint,
      skipFormat: false,
      skipTsConfig: false,
      unitTestRunner: 'jest',
      style: 'css',
      component: true,
    };

    const appTree = createTreeWithEmptyWorkspace();

    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib',
    });
    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib2',
      style: '@emotion/styled',
    });
    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib-styled-jsx',
      style: 'styled-jsx',
    });
    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib3',
      directory: 'myDir',
    });

    expect(readJson(appTree, 'libs/my-lib/.babelrc')).toEqual({
      presets: ['@nrwl/next/babel'],
      plugins: [],
    });
    expect(readJson(appTree, 'libs/my-lib2/.babelrc')).toEqual({
      presets: [
        [
          '@nrwl/next/babel',
          {
            'preset-react': {
              runtime: 'automatic',
              importSource: '@emotion/react',
            },
          },
        ],
      ],
      plugins: ['@emotion/babel-plugin'],
    });
    expect(readJson(appTree, 'libs/my-lib-styled-jsx/.babelrc')).toEqual({
      presets: ['@nrwl/next/babel'],
      plugins: [],
    });
    expect(readJson(appTree, 'libs/my-dir/my-lib3/.babelrc')).toEqual({
      presets: ['@nrwl/next/babel'],
      plugins: [],
    });
  });

  it('should use @nrwl/next images.d.ts file', async () => {
    const baseOptions: Schema = {
      name: '',
      linter: Linter.EsLint,
      skipFormat: false,
      skipTsConfig: false,
      unitTestRunner: 'jest',
      style: 'css',
      component: true,
    };
    const appTree = createTreeWithEmptyWorkspace();

    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib',
    });
    const tsconfigFiles = readJson(
      appTree,
      'libs/my-lib/tsconfig.lib.json'
    ).files;

    expect(tsconfigFiles).toContain(
      '../../node_modules/@nrwl/next/typings/image.d.ts'
    );
    expect(tsconfigFiles).not.toContain(
      '../../node_modules/@nrwl/react/typings/image.d.ts'
    );
  });

  it('should add jsxImportSource in tsconfig.json for @emotion/styled', async () => {
    const baseOptions: Schema = {
      name: '',
      linter: Linter.EsLint,
      skipFormat: false,
      skipTsConfig: false,
      unitTestRunner: 'jest',
      style: 'css',
      component: true,
    };

    const appTree = createTreeWithEmptyWorkspace();

    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib',
    });
    await libraryGenerator(appTree, {
      ...baseOptions,
      name: 'myLib2',
      style: '@emotion/styled',
    });

    expect(
      readJson(appTree, 'libs/my-lib/tsconfig.json').compilerOptions
        .jsxImportSource
    ).not.toBeDefined();
    expect(
      readJson(appTree, 'libs/my-lib2/tsconfig.json').compilerOptions
        .jsxImportSource
    ).toEqual('@emotion/react');
  });

  it('should add component testing with addCypress option', async () => {
    mockedInstalledCypressVersion.mockReturnValue(10);
    const baseOptions: Schema = {
      name: '',
      linter: Linter.EsLint,
      skipFormat: false,
      skipTsConfig: false,
      unitTestRunner: 'jest',
      style: 'css',
      component: true,
      addCypress: true,
    };
    const tree = createTreeWithEmptyWorkspace();

    await libraryGenerator(tree, {
      ...baseOptions,
      name: 'myLib',
    });

    expect(tree.exists('libs/my-lib/cypress.config.ts')).toBeTruthy();
    expect(
      tree.exists('libs/my-lib/cypress/component/index.html')
    ).toBeTruthy();
    expect(
      tree.exists('libs/my-lib/cypress/fixtures/example.json')
    ).toBeTruthy();
    expect(tree.exists('libs/my-lib/cypress/support/commands.ts')).toBeTruthy();
    expect(
      tree.exists('libs/my-lib/cypress/support/component.ts')
    ).toBeTruthy();
    expect(tree.exists('libs/my-lib/src/lib/my-lib.cy.ts'));
  });
});
