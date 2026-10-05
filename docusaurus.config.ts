import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'ferrus',
  tagline: 'Deterministic orchestration of AI agents for real software work.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://ferrus.dev',
  baseUrl: '/',
  // Set the production url of your site here
  //url: 'https://ferrus.dev',
  // For GitHub pages deployment under /<projectName>/
  //baseUrl: '/ferrus-docs/',

  // GitHub pages deployment config.
  organizationName: 'ferrus-dev',
  projectName: 'ferrus-docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl:
            'https://github.com/ferrus-dev/ferrus-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/ferrus-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'FERRUS',
      logo: {
        alt: 'ferrus',
        src: 'img/favicon.svg',
      },
      items: [
        {
          to: '/docs/quickstart',
          label: 'Quickstart',
          position: 'left',
        },
        {
          to: '/docs/repository-graph',
          label: 'Repository graph',
          position: 'left',
          className: 'navbar__link--accent',
        },
        {
          to: '/docs/migration',
          label: 'Migrating from 0.2.x',
          position: 'left',
        },
        {
          href: 'https://github.com/ferrus-dev/ferrus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Quickstart', to: '/docs/quickstart'},
            {label: 'Configuration', to: '/docs/configuration'},
            {label: 'HQ Commands', to: '/docs/hq'},
            {label: 'State Machine', to: '/docs/state-machine'},
            {label: 'Repository Graph', to: '/docs/repository-graph'},
            {label: 'Project Memory', to: '/docs/project-memory'},
            {label: 'Nano', to: '/docs/nano'},
            {label: 'Migrating from 0.2.x', to: '/docs/migration'},
            {label: 'Local Models', to: '/docs/local-models'},
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ferrus-dev/ferrus',
            },
            {
              label: 'crates.io',
              href: 'https://crates.io/crates/ferrus',
            },
            {
              label: 'Issues',
              href: 'https://github.com/ferrus-dev/ferrus/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'License (Apache 2.0)',
              href: 'https://github.com/ferrus-dev/ferrus/blob/main/LICENSE',
            },
            {
              label: 'Contributing',
              href: 'https://github.com/ferrus-dev/ferrus/blob/main/CONTRIBUTING.md',
            },
            {label: 'About', to: '/about'},
            {label: 'Contact', to: '/contact'},
            {label: 'Privacy', to: '/privacy'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ferrus · Apache-2.0 · <a href="/security">Security</a>`,
    },
    prism: {
      theme: prismThemes.vsDark,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['rust', 'toml', 'bash', 'powershell'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
