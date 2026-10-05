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
    'nano',
    'migration',
    'local-models',
  ],
};

export default sidebars;
