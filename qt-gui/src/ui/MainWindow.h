#pragma once

#include <QMainWindow>
#include "../core/EngineClient.h"

class QToolBar;
class QAction;
class QDockWidget;
class QLabel;
class QThread;
class ConfigPanel;
class EventLogPanel;

/**
 * @brief The MainWindow is the main application window
 * 
 * This window provides the primary UI for interacting with the EcoSysX engine:
 * - Toolbar with Start/Stop/Step controls
 * - ConfigPanel docked on the left
 * - EventLogPanel docked on the bottom
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
    
    // Help menu actions
    void onAbout();
    void onDocumentation();
    
    // Toolbar actions
    void onStart();
    void onStop();
    void onStep();
    void onReset();
    
    // EngineClient signals
    void onEngineStarted();
    void onEngineStopped();
    void onEngineStepped(int currentStep, int totalSteps);
    void onEngineError(const QString& error);
    void onEngineStateChanged(EngineClient::State state);
    void onEngineSnapshotReceived(const QJsonObject& snapshot);
    void onEngineLogMessage(const QString& message);
    
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
    QString stateToStatusText(EngineClient::State state) const;
    
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

private:
    // Core components
    EngineClient* m_engineClient;
    QThread* m_engineThread;
    Configuration m_currentConfig;
    QString m_currentConfigFile;
    bool m_hasUnsavedChanges;
    int m_currentStep;
    
    // UI components
    ConfigPanel* m_configPanel;
    EventLogPanel* m_logPanel;
    QDockWidget* m_configDock;
    QDockWidget* m_logDock;
    
    // Actions
    QAction* m_newAction;
    QAction* m_openAction;
    QAction* m_saveAction;
    QAction* m_saveAsAction;
    QAction* m_exitAction;
    QAction* m_preferencesAction;
    QAction* m_toggleConfigAction;
    QAction* m_toggleLogAction;
    QAction* m_aboutAction;
    QAction* m_documentationAction;
    QAction* m_startAction;
    QAction* m_stopAction;
    QAction* m_stepAction;
    QAction* m_resetAction;
    
    // Status bar
    QLabel* m_statusLabel;
    QLabel* m_stepLabel;
};
