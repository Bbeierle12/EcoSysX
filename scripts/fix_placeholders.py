from pathlib import Path

path = Path(r"c:\\Users\\Bbeie\\EcoSysX\\src\\EcosystemSimulator.jsx")
text = path.read_text(encoding="utf-8")

replacements = {
    "      console.log([EcoSysX] Analytics directory ready at );": "      console.log(`[EcoSysX] Analytics directory ready at ${this.exportDirectoryLabel}`);",
    "    console.log([EcoSysX] Auto-exporting EcoSysX logs at step );": "    console.log(`[EcoSysX] Auto-exporting EcoSysX logs at step ${this.currentStep}`);",
    "    const filename = EcoSysX-AutoLog-Step-.json;": "    const filename = `EcoSysX-AutoLog-Step${this.currentStep}-${timestamp}.json`;",
    "        console.log([EcoSysX] Auto-exported to \\);": "        console.log(`[EcoSysX] Auto-exported to ${this.exportDirectoryLabel}\\\\${filename}`);",
    "        console.log([EcoSysX] Auto-exported via browser download: );": "        console.log(`[EcoSysX] Auto-exported via browser download: ${filename}`);",
    "    console.log([EcoSysX] Target: );": "    console.log(`[EcoSysX] Target: ${this.exportDirectoryLabel}`);",
    "    console.log([EcoSysX] Session: );": "    console.log(`[EcoSysX] Session: ${export_data.metadata.session_id}`);",
    "    console.log([EcoSysX] Steps:  | Windows:  | Checkpoints: );": "    console.log(`[EcoSysX] Steps: ${this.currentStep} | Windows: ${this.windowHistory.length} | Checkpoints: ${this.checkpoints.length}`);",
    "    const filename = EcoSysX-Analytics-Step-.json;": "    const filename = `EcoSysX-Analytics-Step${this.currentStep}-${timestamp}.json`;",
    "      console.log([EcoSysX] Exported analytics to \\);": "      console.log(`[EcoSysX] Exported analytics to ${this.exportDirectoryLabel}\\\\${filename}`);",
    "      console.log([EcoSysX] Exported analytics via browser download: );": "      console.log(`[EcoSysX] Exported analytics via browser download: ${filename}`);",
    "        console.log([EcoSysX] Exported detailed reports to );": "        console.log(`[EcoSysX] Exported detailed reports to ${this.exportDirectoryLabel}`);",
    "    this.exportDirectoryLabel = 'C\\\\Users\\\\Bbeie\\\\Downloads\\\\EcoSysX Analytics';": "    this.exportDirectoryLabel = 'C:\\Users\\Bbeie\\Downloads\\EcoSysX Analytics';"
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"Missing expected snippet: {old}")
    text = text.replace(old, new)

path.write_text(text, encoding="utf-8")
