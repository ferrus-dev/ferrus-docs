import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'quickstart',
    'configuration',
    'hq',
    'spec-and-milestones',
    'state-machine',
    {
      type: 'category',
      label: 'Repository intelligence',
      collapsed: false,
      items: ['repository-graph', 'project-memory'],
    },
    'agents',
    {
      type: 'category',
      label: 'Nano',
      collapsed: false,
      link: {type: 'doc', id: 'nano'},
      items: ['nano-standalone', 'nano-hq'],
    },
    'migration',
    'local-models',
  ],
};

export default sidebars;
