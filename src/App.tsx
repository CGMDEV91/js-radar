import { useState, useCallback, useRef } from 'react';
import type { View, ProviderConfig, Finding, LogMessage, ScanProgress, FileResult } from './types';
import { HomeView } from './components/views/HomeView';
import { ScanningView } from './components/views/ScanningView';
import { ResultsView } from './components/views/ResultsView';
import { runScan } from './scanners/index';

const INITIAL_PROGRESS: ScanProgress = { pct: 0, phase: '' };

export default function App() {
  const [view, setView] = useState<View>('home');
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [progress, setProgress] = useState<ScanProgress>(INITIAL_PROGRESS);
  const [filesScanned, setFilesScanned] = useState(0);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [cancelled, setCancelled] = useState(false);
  const cancelledRef = useRef(false);

  function resetAll() {
    cancelledRef.current = false;
    setCancelled(false);
    setView('home');
    setConfig(null);
    setFindings([]);
    setLogs([]);
    setProgress(INITIAL_PROGRESS);
    setFilesScanned(0);
    setFileResults([]);
  }

  function handleStop() {
    cancelledRef.current = true;
  }

  const handleStartScan = useCallback(async (cfg: ProviderConfig) => {
    cancelledRef.current = false;
    setCancelled(false);
    setConfig(cfg);
    setLogs([]);
    setFindings([]);
    setProgress(INITIAL_PROGRESS);
    setFilesScanned(0);
    setFileResults([]);
    setView('scanning');

    const emit = (msg: LogMessage) => setLogs((prev) => [...prev, msg]);
    const onProgress = (p: ScanProgress) => setProgress(p);

    try {
      const result = await runScan(cfg, emit, onProgress, () => cancelledRef.current);
      setFindings(result.findings);
      setFilesScanned(result.filesScanned);
      setFileResults(result.fileResults);
      if (result.cancelled) {
        setCancelled(true);
        setProgress({ pct: result.pct ?? 50, phase: 'Scan cancelled' });
      }
    } catch (e) {
      emit({ text: `❌ Scan failed: ${(e as Error).message}`, type: 'error' });
      setProgress({ pct: 100, phase: 'Scan failed' });
    }
  }, []);

  if (view === 'home') {
    return <HomeView onStartScan={handleStartScan} />;
  }

  if (view === 'scanning' && config) {
    return (
      <ScanningView
        config={config}
        logs={logs}
        progress={progress}
        onStartOver={resetAll}
        onViewResults={() => setView('results')}
        onStop={handleStop}
      />
    );
  }

  if (view === 'results' && config) {
    return (
      <ResultsView
        config={config}
        findings={findings}
        filesScanned={filesScanned}
        fileResults={fileResults}
        logs={logs}
        cancelled={cancelled}
        onScanAnother={resetAll}
        onRetry={handleStartScan}
      />
    );
  }

  return <HomeView onStartScan={handleStartScan} />;
}
