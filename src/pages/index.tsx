import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import FerrusLogo from '@site/src/components/FerrusLogo';
import InstallTabs from '@site/src/components/InstallTabs';
import IsoGrid from '@site/src/components/IsoGrid';

import styles from './index.module.css';

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx(styles.hero)}>
      <IsoGrid />
      <div className={styles.heroInner}>
        <div className={styles.logoHolder}>
          <FerrusLogo />
        </div>
        <p className={styles.tagline}>{siteConfig.tagline}</p>
        <p className={styles.subTagline}>
          <span className={styles.dim}>// </span>
          A Supervisor → Executor → Reviewer state machine for coding agents.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/quickstart">
            Get started
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/ferrus-dev/ferrus">
            GitHub →
          </Link>
        </div>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>alpha · v0.5.0</span>
          <span className={styles.badge}>Apache-2.0</span>
          <span className={styles.badge}>Rust 1.95+</span>
        </div>
      </div>
    </header>
  );
}

function Install() {
  return (
  <section className={styles.section}>
    <div className="container">
      <Heading as="h2" className={styles.sectionTitle}>
        <span className={styles.prompt}>$</span> Install
      </Heading>

      <p className={styles.sectionLead}>
        ferrus ships as a single Rust crate. Install it with a single command, from crates.io or build from source.
      </p>

      <div className={styles.installPrimary}>
        <h3 className={styles.colTitle}>Quick install</h3>
        <InstallTabs />
      </div>

      <div className={styles.twoCol}>
        <div>
          <h3 className={styles.colTitle}>From crates.io</h3>
          <CodeBlock language="bash">{`# stable — published on crates.io
cargo install ferrus
# or pin an exact version:
cargo install --locked ferrus@0.5.0-alpha.1
# with the experimental Nano executor:
cargo install --locked ferrus@0.5.0-alpha.1 --features nano-openai,nano-mcp`}</CodeBlock>
        </div>

        <div>
          <h3 className={styles.colTitle}>From source</h3>
          <CodeBlock language="bash">{`# latest main — tracks the repo
git clone https://github.com/ferrus-dev/ferrus
cd ferrus
cargo install --path .`}</CodeBlock>
        </div>
      </div>
    </div>
  </section>
  );
}

function QuickStart() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Quick start
        </Heading>
        <p className={styles.sectionLead}>
          From any project directory, scaffold ferrus, register your agents,
          and drop into HQ.
        </p>
        <CodeBlock language="bash">{`ferrus init                                                  # scaffold ferrus.toml + .ferrus/
ferrus register --supervisor claude-code --executor codex    # write agent configs
ferrus                                                       # enter HQ`}</CodeBlock>
        <p className={styles.sectionLead}>
          Inside HQ, type <code>/spec</code> to draft a written spec first,
          or <code>/task</code> to go straight in. A supervisor spawns, you describe
          what you want, and the Executor → Reviewer loop runs automatically
          until the task is <strong style={{color: 'var(--ferrus-green)'}}>Complete</strong>.
        </p>
      </div>
    </section>
  );
}

function Nano() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Nano
        </Heading>
        <p className={styles.sectionLead}>
          New in 0.5: ferrus's own native agent harness. Nano runs as a
          headless Executor against a local OpenAI-compatible model such as
          LM Studio. It calls ferrus operations (check, submit, the repository
          graph, project memory) directly in Rust, with no MCP round-trip.
        </p>
        <CodeBlock language="bash">{`ferrus register --supervisor claude-code \\
  --executor nano --executor-model <loaded-model-id>   # creates ~/.ferrus/nano.toml
ferrus                                                 # then /task as usual`}</CodeBlock>
        <p className={styles.sectionLead}>
          It ships with digest-checked patches, bounded shell sessions, a
          token-budgeted working set with compaction, opt-in stdio MCP tools,
          and crash recovery that reconciles every in-flight effect.
          Experimental: Executor-only and headless for now.
        </p>
        <p className={styles.sectionLead}>
          <Link to="/docs/nano">Read the Nano docs →</Link>
        </p>
      </div>
    </section>
  );
}

function RepositoryGraph() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Repository graph
        </Heading>
        <p className={styles.sectionLead}>
          New in 0.4: an optional, machine-local structural index of your
          repository. Agents query it by symbol, path, and relationship instead
          of re-grepping the codebase on every spawn — and every fact comes back
          with its evidence location, extractor, and confidence.
        </p>
        <CodeBlock language="bash">{`ferrus graph index                        # build the snapshot (incremental)
ferrus graph status                       # availability, freshness, fact counts
ferrus graph search RuntimeTaskContext    # ranked, evidence-backed lookup
ferrus graph context --symbol <key>       # bounded context packet`}</CodeBlock>
        <p className={styles.sectionLead}>
          Snapshots are immutable and atomically published. Executors query
          their own worktree view — a pinned baseline plus a changed-file
          overlay — so parallel tasks never see each other's work in progress.
          The index is opt-in, entirely local, rebuildable, and safe to delete:
          an absent graph never blocks the task loop.
        </p>
        <p className={styles.sectionLead}>
          <Link to="/docs/repository-graph">Read the repository graph docs →</Link>
        </p>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: 'Deterministic',
      body: 'Not a chat. A real state machine with explicit transitions, retries, and review cycles.',
    },
    {
      title: 'Agent-agnostic',
      body: 'Claude Code, Codex, Qwen Code, goose, opencode, and the native Nano executor are interchangeable workers — including local models.',
    },
    {
      title: 'Crash-safe',
      body: 'Runtime state lives in SQLite. Agents are stateless between runs — restarts resume exactly where you left off.',
    },
    {
      title: 'No hidden context',
      body: 'Everything the agents see lives in plain files you can read, scoped per task under .ferrus/tasks/ and .ferrus/runs/.',
    },
    {
      title: 'Repository-aware',
      body: 'An optional local graph indexes structure, symbols, and relationships so agents navigate instead of rediscovering — every fact evidence-backed and snapshot-pinned.',
    },
    {
      title: 'Remembers decisions',
      body: 'Project memory keeps approved outcomes, milestones, and deviations queryable, so settled questions stay settled across specs.',
    },
  ];
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Why ferrus
        </Heading>
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureTitle}>&gt; {f.title}</div>
              <div className={styles.featureBody}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <Hero />
      <main>
        <Install />
        <QuickStart />
        <Nano />
        <RepositoryGraph />
        <Features />
      </main>
    </Layout>
  );
}
