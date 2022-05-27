import { installedCypressVersion } from '@nrwl/cypress/src/utils/cypress-version';
import type { Tree } from '@nrwl/devkit';
import * as devkit from '@nrwl/devkit';
import { wrapAngularDevkitSchematic } from '@nrwl/devkit/ngcli-adapter';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { applicationGenerator } from '../application/application';
import * as storybookUtils from '../utils/storybook';
import { componentCypressSpecGenerator } from './component-cypress-spec';
// need to mock cypress otherwise it'll use the nx installed version from package.json
//  which is v9 while we are testing for the new v10 version
jest.mock('@nrwl/cypress/src/utils/cypress-version');
describe('componentCypressSpec generator', () => {
  let tree: Tree;
  const appName = 'ng-app1';
  const specFile = `apps/${appName}-e2e/src/e2e/test-button/test-button.component.cy.ts`;
  let mockedInstalledCypressVersion: jest.Mock<
    ReturnType<typeof installedCypressVersion>
  > = installedCypressVersion as never;
  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();

    const componentGenerator = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );

    await applicationGenerator(tree, { name: appName });
    await componentGenerator(tree, {
      name: 'test-button',
      project: appName,
    });

    tree.write(
      `apps/${appName}/src/app/test-button/test-button.component.ts`,
      `import { Component, Input } from '@angular/core';

export type ButtonStyle = 'default' | 'primary' | 'accent';

@Component({
  selector: 'proj-test-button',
  templateUrl: './test-button.component.html',
  styleUrls: ['./test-button.component.css']
})
export class TestButtonComponent {
  @Input('buttonType') type = 'button';
  @Input() style: ButtonStyle = 'default';
  @Input() age?: number;
  @Input() isOn = false;      
}`
    );
  });

  it('should not generate the component spec file when it already exists', () => {
    mockedInstalledCypressVersion.mockReturnValue(10);
    jest.spyOn(storybookUtils, 'getComponentProps');
    jest.spyOn(devkit, 'generateFiles');
    tree.write(specFile, '');

    componentCypressSpecGenerator(tree, {
      componentFileName: 'test-button.component',
      componentName: 'TestButtonComponent',
      componentPath: `test-button`,
      projectPath: `apps/${appName}/src/app`,
      projectName: appName,
    });

    expect(storybookUtils.getComponentProps).not.toHaveBeenCalled();
    expect(devkit.generateFiles).not.toHaveBeenCalled();
    expect(tree.read(specFile).toString()).toBe('');
  });

  it('should generate the component spec file', () => {
    mockedInstalledCypressVersion.mockReturnValue(10);
    componentCypressSpecGenerator(tree, {
      componentFileName: 'test-button.component',
      componentName: 'TestButtonComponent',
      componentPath: `test-button`,
      projectPath: `apps/${appName}/src/app`,
      projectName: appName,
    });

    expect(tree.exists(specFile)).toBe(true);
    const specFileContent = tree.read(specFile).toString();
    expect(specFileContent).toMatchSnapshot();
  });

  it('should generate .spec.ts when using cypress.json', () => {
    mockedInstalledCypressVersion.mockReturnValue(9);
    const v9SpecFile = `apps/${appName}-e2e/src/integration/test-button/test-button.component.spec.ts`;
    tree.delete(`apps/${appName}-e2e/cypress.config.ts`);
    tree.write(`apps/${appName}-e2e/cypress.json`, `{}`);

    componentCypressSpecGenerator(tree, {
      componentFileName: 'test-button.component',
      componentName: 'TestButtonComponent',
      componentPath: `test-button`,
      projectPath: `apps/${appName}/src/app`,
      projectName: appName,
    });

    expect(tree.exists(v9SpecFile)).toBe(true);
    const specFileContent = tree.read(v9SpecFile).toString();
    expect(specFileContent).toMatchSnapshot();
  });
});
