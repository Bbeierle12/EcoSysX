from pathlib import Path
import re

path = Path(r"c:\\Users\\Bbeie\\EcoSysX\\src\\EcosystemSimulator.jsx")
text = path.read_text(encoding="utf-8")

marker = 'this.captureConsoleLogs();'
if marker not in text:
    raise SystemExit('marker not found')
idx = text.index(marker) + len(marker)
insertion = "\n\n    this.exportDirectoryHandle = null;\n    this.requestingDirectoryHandle = false;\n    this.exportDirectoryLabel = 'C\\\\Users\\\\Bbeie\\\\Downloads\\\\EcoSysX Analytics';"
text = text[:idx] + insertion + text[idx:]

replacement = """  }

  async promptForExportDirectory() {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) {
      console.warn('[EcoSysX] File System Access API not available; using browser downloads.');
      return false;
    }

    if (this.requestingDirectoryHandle) {
      console.warn('[EcoSysX] Directory request already in progress.');
      return false;
    }

    this.requestingDirectoryHandle = true;

    try {
      const directoryHandle = await window.showDirectoryPicker({
        id: 'ecosysx-analytics',
        mode: 'readwrite',
        startIn: 'downloads'
      });

      let targetHandle = directoryHandle;

      try {
        if (directoryHandle.name && directoryHandle.name.toLowerCase() !== 'ecosysx analytics') {
          targetHandle = await directoryHandle.getDirectoryHandle('EcoSysX Analytics', { create: true });
        }
      } catch (error) {
        console.warn('[EcoSysX] Unable to create EcoSysX Analytics subdirectory; using the selected folder.', error);
      }

      this.exportDirectoryHandle = targetHandle;
      console.log(`[EcoSysX] Analytics directory ready at ${this.exportDirectoryLabel}`);
      return true;
    } catch (error) {
      console.warn('[EcoSysX] Directory selection was cancelled or failed.', error);
      return false;
    } finally {
      this.requestingDirectoryHandle = false;
    }
  }

  hasExportDirectory() {
    return !!this.exportDirectoryHandle;
  }

  async saveFile({ contents, filename, type }) {
    if (this.exportDirectoryHandle) {
      try {
        const fileHandle = await this.exportDirectoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();
        return { saved: true, method: 'filesystem' };
      } catch (error) {
        console.error('[EcoSysX] Failed to write to analytics directory; falling back to browser download.', error);
      }
    }

    this.triggerBrowserDownload(contents, filename, type);
    return { saved: false, method: 'download' };
  }

  triggerBrowserDownload(contents, filename, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  addLogEntry"""

if "  }\n\n  addLogEntry" not in text:
    raise SystemExit('addLogEntry marker missing')
text = text.replace("  }\n\n  addLogEntry", replacement, 1)

auto_export_pattern = r"  autoExportLogs\(\) {\n.*?\n  }\n\n"
auto_export_replacement = """  autoExportLogs() {
    console.log(`[EcoSysX] Auto-exporting EcoSysX logs at step ${this.currentStep}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const quickExport = {
      metadata: {
        auto_export: true,
        step: this.currentStep,
        timestamp: new Date().toISOString(),
        target_folder: this.exportDirectoryLabel
      },
      console_logs: this.consoleLogs.slice(-200),
      recent_windows: this.windowHistory.slice(-5),
      summary: {
        total_logs: this.consoleLogs.length,
        total_windows: this.windowHistory.length,
        panel_size: this.panelSample.size
      }
    };

    const filename = `EcoSysX-AutoLog-Step${this.currentStep}-${timestamp}.json`;
    const content = JSON.stringify(quickExport, null, 2);

    this.saveFile({
      contents: content,
      filename,
      type: 'application/json'
    }).then(result => {
      if (result && result.saved) {
        console.log(`[EcoSysX] Auto-exported to ${this.exportDirectoryLabel}\\\\${filename}`);
      } else {
        console.log(`[EcoSysX] Auto-exported via browser download: ${filename}`);
      }
    }).catch(error => {
      console.error('[EcoSysX] Auto-export failed.', error);
    });
  }

"""
text, count = re.subn(auto_export_pattern, auto_export_replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit('autoExportLogs replacement failed')

export_analytics_pattern = r"  exportAnalytics\(\) {\n.*?\n  }\n\n"
export_analytics_replacement = """  async exportAnalytics() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const export_data = {
      metadata: {
        current_step: this.currentStep,
        window_size: this.windowSize,
        checkpoint_interval: this.checkpointInterval,
        export_timestamp: new Date().toISOString(),
        session_id: `ecosysx_${timestamp}`,
        export_location: this.exportDirectoryLabel
      },
      simulation_summary: {
        total_steps: this.currentStep,
        total_windows: this.windowHistory.length,
        total_checkpoints: this.checkpoints.length,
        panel_agents: this.panelSample.size,
        contact_matrix_entries: this.contactMatrix.size
      },
      recent_windows: this.windowHistory,
      checkpoints: this.checkpoints,
      panel_sample: Array.from(this.panelSample.values()),
      contact_matrix: Array.from(this.contactMatrix.entries()),
      console_logs: this.consoleLogs || []
    };

    console.log('=== ECOSYSX ANALYTICS EXPORT ===');
    console.log(`[EcoSysX] Target: ${this.exportDirectoryLabel}`);
    console.log(`[EcoSysX] Session: ${export_data.metadata.session_id}`);
    console.log(`[EcoSysX] Steps: ${this.currentStep} | Windows: ${this.windowHistory.length} | Checkpoints: ${this.checkpoints.length}`);
    console.log(JSON.stringify(export_data, null, 2));
    console.log('=== END ECOSYSX ANALYTICS EXPORT ===');

    const filename = `EcoSysX-Analytics-Step${this.currentStep}-${timestamp}.json`;
    const content = JSON.stringify(export_data, null, 2);

    const result = await this.saveFile({
      contents: content,
      filename,
      type: 'application/json'
    });

    if (result && result.saved) {
      console.log(`[EcoSysX] Exported analytics to ${this.exportDirectoryLabel}\\\\${filename}`);
    } else {
      console.log(`[EcoSysX] Exported analytics via browser download: ${filename}`);
    }

    await this.exportDetailedReports(timestamp);

    return export_data;
  }

"""
text, count = re.subn(export_analytics_pattern, export_analytics_replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit('exportAnalytics replacement failed')

export_reports_pattern = r"  exportDetailedReports\(timestamp\) {\n.*?\n  }\n\n"
export_reports_replacement = """  async exportDetailedReports(timestamp) {
    const results = [];

    if (this.panelSample.size > 0) {
      const agents_csv = this.generateAgentLifecycleCSV();
      results.push(await this.downloadFile(agents_csv, `EcoSysX-Agents-${timestamp}.csv`, 'text/csv'));
    }

    if (this.windowHistory.length > 0) {
      const population_csv = this.generatePopulationDynamicsCSV();
      results.push(await this.downloadFile(population_csv, `EcoSysX-Population-${timestamp}.csv`, 'text/csv'));
    }

    const epi_csv = this.generateEpidemiologicalCSV();
    results.push(await this.downloadFile(epi_csv, `EcoSysX-Epidemiology-${timestamp}.csv`, 'text/csv'));

    const savedToDirectory = results.some(result => result && result.saved);
    if (results.length) {
      if (savedToDirectory) {
        console.log(`[EcoSysX] Exported detailed reports to ${this.exportDirectoryLabel}`);
      } else {
        console.log('[EcoSysX] Exported detailed reports via browser download.');
      }
    }

    return results;
  }

"""
text, count = re.subn(export_reports_pattern, export_reports_replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit('exportDetailedReports replacement failed')

download_pattern = r"  downloadFile\(content, filename, type\) {\n.*?\n  }\n\n"
download_replacement = """  async downloadFile(content, filename, type) {
    return this.saveFile({
      contents: content,
      filename,
      type
    });
  }

"""
text, count = re.subn(download_pattern, download_replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit('downloadFile replacement failed')

path.write_text(text, encoding="utf-8")
