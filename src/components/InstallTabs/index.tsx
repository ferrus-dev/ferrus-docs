import {useEffect, useState} from 'react';
import CodeBlock from '@theme/CodeBlock';

import styles from './styles.module.css';

type InstallTarget = 'windows' | 'unix';
type InstallComponent = 'all' | 'nano' | 'ferrus';

const INSTALL_TARGETS: Array<{
  id: InstallTarget;
  label: string;
  language: string;
}> = [
  {id: 'windows', label: 'Windows', language: 'powershell'},
  {id: 'unix', label: 'Linux/macOS', language: 'bash'},
];

const INSTALL_COMPONENTS: Array<{
  id: InstallComponent;
  label: string;
  summary: string;
  commands: Record<InstallTarget, string>;
}> = [
  {
    id: 'all',
    label: 'Full bundle',
    summary: 'ferrus and ferrus-nano: HQ, orchestration, and the standalone agent.',
    commands: {
      windows: 'irm https://ferrus.dev/cli/install.ps1 | iex',
      unix: 'curl -fsSL https://ferrus.dev/cli/install.sh | sh',
    },
  },
  {
    id: 'nano',
    label: 'Standalone Nano',
    summary: 'ferrus-nano only: a coding agent for any directory, no HQ needed.',
    commands: {
      windows: 'irm https://ferrus.dev/nano/install.ps1 | iex',
      unix: 'curl -fsSL https://ferrus.dev/nano/install.sh | sh',
    },
  },
  {
    id: 'ferrus',
    label: 'Ferrus only',
    summary: 'ferrus only: HQ and orchestration. Nano still runs inside HQ.',
    commands: {
      windows:
        '& ([scriptblock]::Create((irm https://ferrus.dev/cli/install.ps1))) -Components ferrus',
      unix: 'curl -fsSL https://ferrus.dev/cli/install.sh | sh -s -- --components ferrus',
    },
  },
];

function detectInstallTarget(): InstallTarget {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  const osText = `${platform} ${userAgent}`;

  if (
    osText.includes('mac') ||
    osText.includes('linux') ||
    osText.includes('x11')
  ) {
    return 'unix';
  }

  return 'windows';
}

function Selector<Id extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{id: Id; label: string}>;
  selected: Id;
  onSelect: (id: Id) => void;
}) {
  return (
    <div className={styles.selector} role="group" aria-label={label}>
      {options.map((option, index) => (
        <span key={option.id} className={styles.tabItem}>
          {index > 0 && <span className={styles.separator}>|</span>}
          <button
            className={styles.tab}
            type="button"
            aria-pressed={option.id === selected}
            onClick={() => onSelect(option.id)}>
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}

export default function InstallTabs({
  defaultComponent = 'all',
}: {
  defaultComponent?: InstallComponent;
}) {
  const [activeTarget, setActiveTarget] = useState<InstallTarget>('windows');
  const [activeComponent, setActiveComponent] = useState(defaultComponent);
  const target =
    INSTALL_TARGETS.find((option) => option.id === activeTarget) ??
    INSTALL_TARGETS[0];
  const component =
    INSTALL_COMPONENTS.find((option) => option.id === activeComponent) ??
    INSTALL_COMPONENTS[0];

  useEffect(() => {
    setActiveTarget(detectInstallTarget());
  }, []);

  return (
    <div className={styles.installTabs}>
      <div className={styles.tabList}>
        <Selector
          label="What to install"
          options={INSTALL_COMPONENTS}
          selected={activeComponent}
          onSelect={setActiveComponent}
        />
        <Selector
          label="Operating system"
          options={INSTALL_TARGETS}
          selected={activeTarget}
          onSelect={setActiveTarget}
        />
      </div>

      <CodeBlock language={target.language}>
        {component.commands[activeTarget]}
      </CodeBlock>

      <p className={styles.summary}>
        <span className={styles.prompt}>// </span>
        {component.summary}
      </p>
    </div>
  );
}
