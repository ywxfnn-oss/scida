import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { namedHookWithTaskFn } from '@electron-forge/plugin-base';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const macEntitlementsPath = path.join(process.cwd(), 'assets', 'macos', 'entitlements.plist');
const macEntitlementsInheritPath = path.join(
  process.cwd(),
  'assets',
  'macos',
  'entitlements.inherit.plist'
);

function copyDirIfExists(from: string, to: string) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    force: true
  });
}

function findBundleRoots(appPath: string): string[] {
  const bundleRoots = new Set<string>([appPath]);
  const stack = [appPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    if (!currentPath) continue;

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(currentPath, entry.name);
      if (entry.name.endsWith('.app') || entry.name.endsWith('.framework')) {
        bundleRoots.add(entryPath);
      }

      stack.push(entryPath);
    }
  }

  return [...bundleRoots];
}

function isMacSigningConfigured() {
  return process.platform === 'darwin' && !!process.env.SCIDA_APPLE_TEAM_ID;
}

function buildMacOsxSignConfig() {
  if (!isMacSigningConfigured()) return undefined;

  return {
    identity: process.env.SCIDA_APPLE_SIGNING_IDENTITY || undefined,
    keychain: process.env.SCIDA_MACOS_KEYCHAIN || undefined,
    hardenedRuntime: true,
    preAutoEntitlements: false,
    optionsForFile: (filePath: string) => ({
      entitlements:
        filePath.endsWith('.app') && !filePath.includes(`${path.sep}Contents${path.sep}Frameworks${path.sep}`)
          ? macEntitlementsPath
          : macEntitlementsInheritPath,
      hardenedRuntime: true
    })
  };
}

function buildMacOsxNotarizeConfig() {
  if (!isMacSigningConfigured()) return undefined;

  if (
    process.env.SCIDA_APPLE_NOTARY_API_KEY_PATH &&
    process.env.SCIDA_APPLE_NOTARY_API_KEY_ID &&
    process.env.SCIDA_APPLE_NOTARY_API_ISSUER
  ) {
    return {
      tool: 'notarytool' as const,
      appleApiKey: process.env.SCIDA_APPLE_NOTARY_API_KEY_PATH,
      appleApiKeyId: process.env.SCIDA_APPLE_NOTARY_API_KEY_ID,
      appleApiIssuer: process.env.SCIDA_APPLE_NOTARY_API_ISSUER
    };
  }

  if (
    process.env.SCIDA_APPLE_ID &&
    process.env.SCIDA_APPLE_APP_SPECIFIC_PASSWORD &&
    process.env.SCIDA_APPLE_TEAM_ID
  ) {
    return {
      tool: 'notarytool' as const,
      appleId: process.env.SCIDA_APPLE_ID,
      appleIdPassword: process.env.SCIDA_APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.SCIDA_APPLE_TEAM_ID
    };
  }

  return undefined;
}

function normalizeMacAppBundle(appPath: string, shouldAdhocSign: boolean) {
  const removableRootAttributes = [
    'com.apple.FinderInfo',
    'com.apple.fileprovider.fpfs#P',
    'com.apple.ResourceFork'
  ];
  const bundleRoots = findBundleRoots(appPath);

  execFileSync('xattr', ['-cr', appPath]);
  for (const bundleRoot of bundleRoots) {
    for (const attribute of removableRootAttributes) {
      try {
        execFileSync('xattr', ['-d', attribute, bundleRoot]);
      } catch {
        // Ignore missing xattrs; cleanup is best-effort.
      }
    }
  }

  if (shouldAdhocSign) {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath]);
    for (const bundleRoot of bundleRoots) {
      for (const attribute of removableRootAttributes) {
        try {
          execFileSync('xattr', ['-d', attribute, bundleRoot]);
        } catch {
          // Ignore missing xattrs; cleanup is best-effort.
        }
      }
    }
  }

  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath]);
}

function createCleanMacDistributionZip(appPath: string, artifactPath: string, shouldAdhocSign: boolean) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scida-mac-dist-'));
  const stagedAppPath = path.join(tempDir, path.basename(appPath));

  try {
    execFileSync('ditto', [appPath, stagedAppPath]);
    normalizeMacAppBundle(stagedAppPath, shouldAdhocSign);
    execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', stagedAppPath, artifactPath]);
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
}

function createScidataVitePlugin(config: ConstructorParameters<typeof VitePlugin>[0]) {
  const plugin = new VitePlugin(config);
  const pluginState = plugin as unknown as { baseDir: string };
  const originalGetHooks = plugin.getHooks;
  let alreadyStarted = false;

  plugin.getHooks = () => {
    const hooks = originalGetHooks();

    return {
      ...hooks,
      preStart: [
        namedHookWithTaskFn<'preStart'>(async (task) => {
          if (alreadyStarted) return;
          alreadyStarted = true;

          await fs.promises.rm(pluginState.baseDir, {
            force: true,
            recursive: true
          });

          return task?.newListr(
            [
              {
                title: 'Building main process and preload bundles...',
                task: async (_ctx, subtask) => {
                  const result = await plugin.build(subtask);
                  subtask.title = 'Built main process and preload bundles';
                  return result;
                }
              },
              {
                title: 'Building renderer bundles...',
                task: async (_ctx, subtask) => {
                  const result = await plugin.buildRenderer(subtask);
                  subtask.title = 'Built renderer bundles';
                  return result;
                }
              }
            ],
            { concurrent: false }
          );
        }, 'Preparing Vite bundles')
      ]
    };
  };

  return plugin;
}

const config: ForgeConfig = {
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      const shouldAdhocSign = !isMacSigningConfigured();

      for (const makeResult of makeResults) {
        if (makeResult.platform !== 'darwin') continue;

        const productName = makeResult.packageJSON.productName;
        const appPath = path.join(
          process.cwd(),
          'out',
          `${productName}-darwin-${makeResult.arch}`,
          `${productName}.app`
        );

        if (!fs.existsSync(appPath)) continue;

        for (const artifactPath of makeResult.artifacts) {
          if (!artifactPath.endsWith('.zip')) continue;
          createCleanMacDistributionZip(appPath, artifactPath, shouldAdhocSign);
        }
      }
    }
  },

  packagerConfig: {
    asar: false,
    prune: true,
    appBundleId: 'io.github.ywxfnn-oss.scida',
    icon: path.join(process.cwd(), 'assets', 'icons', 'scida'),
    osxSign: buildMacOsxSignConfig(),
    osxNotarize: buildMacOsxNotarizeConfig(),
    afterPrune: [
      (
        buildPath: string,
        _electronVersion: string,
        _platform: string,
        _arch: string,
        done: (error?: Error | null) => void
      ) => {
        try {
          const projectRoot = process.cwd();
          const targetNodeModules = path.join(buildPath, 'node_modules');

          fs.mkdirSync(targetNodeModules, { recursive: true });

          // Prisma 运行时
          copyDirIfExists(
            path.join(projectRoot, 'node_modules', '@prisma'),
            path.join(targetNodeModules, '@prisma')
          );

          copyDirIfExists(
            path.join(projectRoot, 'node_modules', '.prisma'),
            path.join(targetNodeModules, '.prisma')
          );

          // SQLite native 模块
          copyDirIfExists(
            path.join(projectRoot, 'node_modules', 'better-sqlite3'),
            path.join(targetNodeModules, 'better-sqlite3')
          );

          // better-sqlite3 常见运行时依赖
          copyDirIfExists(
            path.join(projectRoot, 'node_modules', 'bindings'),
            path.join(targetNodeModules, 'bindings')
          );

          copyDirIfExists(
            path.join(projectRoot, 'node_modules', 'file-uri-to-path'),
            path.join(targetNodeModules, 'file-uri-to-path')
          );

          // 运行时数据库与迁移资源
          copyDirIfExists(
            path.join(projectRoot, 'prisma'),
            path.join(buildPath, 'prisma')
          );

          const devDbSourcePath = path.join(projectRoot, 'dev.db');
          const devDbTargetPath = path.join(buildPath, 'dev.db');
          if (fs.existsSync(devDbSourcePath)) {
            fs.copyFileSync(devDbSourcePath, devDbTargetPath);
          }

          done();
        } catch (error) {
          done(error as Error);
        }
      }
    ]
  },

  rebuildConfig: {},

  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({})
  ],

  plugins: [
    createScidataVitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    }),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false
    })
  ]
};

export default config;
