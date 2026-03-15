import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'node:fs';
import path from 'node:path';

function copyDirIfExists(from: string, to: string) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    force: true
  });
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: false,
    prune: true,
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
    new VitePlugin({
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