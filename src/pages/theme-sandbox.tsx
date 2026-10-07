export default function ThemeSandbox() {
  return <div className="global-header-offset" style={{ paddingInline: 16 }}>
    <iframe title="Isolated theme sandbox" src="/theme-sandbox/preview"
      style={{ display: 'block', width: '100%', height: 'calc(100vh - var(--global-header-height) - 32px)', border: 0 }} />
  </div>;
}
