#pragma once

#include <QMainWindow>
#include "../core/EngineClient.h"
#include "../core/EngineInterface.h"
#include "../core/Configuration.h"

class QToolBar;
class QAction;
class QDockWidget;
class QLabel;
class QThread;
class QTabWidget;
class ConfigPanel;
class EventLogPanel;
class MetricsPanel;
class VisualizationWidget;
class MetricsChartWidget;
class QTimer;

/**
 * @brief The MainWindow is the main application window
 * 
 * This window provides the primary UI for interacting with the EcoSysX engine:
 * - Toolbar with Start/Stop/Step/Reset/Zoom controls
 * - ConfigPanel docked on the left
 * - MetricsPanel docked on the right
 * - VisualizationWidget as central widget
 * - EventLogPanel and MetricsChartWidget in bottom tabbed dock
 * - Status bar showing engine state
 * - Menu bar with File/Edit/View/Help
 * 
 * The EngineClient runs in a worker thread to keep the UI responsive.
 */
class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    /**
     * @brief Construct the MainWindow
     * @param parent Parent widget
     */
    explicit MainWindow(QWidget* parent = nullptr);
    
    /**
     * @brief Destructor
     */
    ~MainWindow() override;

protected:
    /**
     * @brief Handle close event with unsaved changes check
     * @param event Close event
     */
    void closeEvent(QCloseEvent* event) override;

private slots:
    // File menu actions
    void onNewConfig();
    void onOpenConfig();
    void onSaveConfig();
    void onSaveConfigAs();
    void onExit();
    
    // Edit menu actions
    void onPreferences();
    
    // View menu actions
    void onToggleConfigPanel();
    void onToggleLogPanel();
    void onToggleMetricsPanel();
    void onToggleBottomDock();
    
    // Help menu actions
    void onAbout();
    void onDocumentation();
    
    // Toolbar actions
    void onStart();
    void onStop();
    void onStep();
    void onReset();
    void onZoomIn();
    void onZoomOut();
    void onResetZoom();
    void onExportChart();
    
    // EngineClient signals (stdio-based)
    void onEngineStarted();
    void onEngineStopped();
    void onEngineStepped(int currentStep, int totalSteps);
    void onEngineError(const QString& error);
    /**
     * @brief Handle engine state changes
     * @param state New engine state
     */
    void onEngineStateChanged(EngineState state);
    void onEngineSnapshotReceived(const QJsonObject& snapshot);
    void onEngineLogMessage(const QString& message);
    
    // EngineInterface signals (WebSocket-based)
    void onWebSocketConnected();
    void onWebSocketDisconnected();
    void onWebSocketError(const QString& error);
    void onWebSocketStateUpdated(bool running, int tick);
    void onWebSocketSimulationStarted(int tick, const QString& provider);
    void onWebSocketSimulationStopped(int tick);
    void onWebSocketSimulationStepped(int steps, int tick);
    void onWebSocketSnapshotReceived(const QJsonObject& snapshot);
    
    // ConfigPanel signals
    void onConfigurationChanged(const Configuration& config);
    void onConfigDirtyStateChanged(bool dirty);
    
private:
    /**
     * @brief Create actions for menus and toolbar
     */
    void createActions();
    
    /**
     * @brief Create menu bar
     */
    void createMenus();
    
    /**
     * @brief Create toolbar
     */
    void createToolBar();
    
    /**
     * @brief Create dock widgets
     */
    void createDockWidgets();
    
    /**
     * @brief Create status bar
     */
    void createStatusBar();
    
    /**
     * @brief Update UI enabled/disabled state based on engine state
     */
    void updateUIState();
    
    /**
     * @brief Update status bar text
     */
    void updateStatusBar();
    
    /**
     * @brief Get state-appropriate status text
     * @param state Engine state
     * @return Status text
     */
    /**
     * @brief Convert state enum to status text
     * @param state Engine state
     * @return Status text
     */
    QString stateToStatusText(EngineState state) const;
    
    /**
     * @brief Check for unsaved changes
     * @return true if user confirms discard, false if cancelled
     */
    bool confirmDiscardChanges();
    
    /**
     * @brief Load settings from QSettings
     */
    void loadSettings();
    
    /**
     * @brief Save settings to QSettings
     */
    void saveSettings();
    
    /**
     * @brief Request a snapshot from the engine on the worker thread
     * @param kind Snapshot kind ("metrics" or "full")
     */
    void requestSnapshotAsync(const QString& kind);

private:
    // Core components
    EngineClient* m_engineClient;    // stdio-based (legacy)
    EngineInterface* m_engineInterface;  // WebSocket-based (new)
    QThread* m_engineThread;
    Configuration m_currentConfig;
    QString m_currentConfigFile;
    bool m_hasUnsavedChanges;
    int m_currentStep;
    bool m_useWebSocket;  // Toggle between stdio and WebSocket
    
    // UI components
    VisualizationWidget* m_visualizationWidget;
    ConfigPanel* m_configPanel;
    MetricsPanel* m_metricsPanel;
    EventLogPanel* m_logPanel;
    MetricsChartWidget* m_chartWidget;
    QTabWidget* m_bottomTabs;
    
    // Dock widgets
    QDockWidget* m_configDock;
    QDockWidget* m_metricsDock;
    QDockWidget* m_bottomDock;
    
    // Actions
    QAction* m_newAction;
    QAction* m_openAction;
    QAction* m_saveAction;
    QAction* m_saveAsAction;
    QAction* m_exitAction;
    QAction* m_preferencesAction;
    QAction* m_toggleConfigAction;
    QAction* m_toggleLogAction;
    QAction* m_toggleMetricsAction;
    QAction* m_toggleBottomDockAction;
    QAction* m_aboutAction;
    QAction* m_documentationAction;
    QAction* m_startAction;
    QAction* m_stopAction;
    QAction* m_stepAction;
    QAction* m_resetAction;
    QAction* m_zoomInAction;
    QAction* m_zoomOutAction;
    QAction* m_resetZoomAction;
    QAction* m_exportChartAction;
    
    // Status bar
    QLabel* m_statusLabel;
    QLabel* m_stepLabel;
    
    // Timers
    QTimer* m_snapshotTimer;
};
