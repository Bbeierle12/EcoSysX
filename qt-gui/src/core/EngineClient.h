#pragma once

#include <QObject>
#include <QProcess>
#include <QJsonObject>
#include <QString>
#include <QTimer>

/**
 * @brief Engine states during lifecycle
 */
enum class EngineState {
    Idle,       ///< Not started
    Starting,   ///< Process launching
    Running,    ///< Ready and operational
    Stepping,   ///< Executing simulation steps
    Stopping,   ///< Shutting down
    Stopped,    ///< Cleanly stopped
    Error       ///< Error state, requires restart
};

/**
 * @brief The EngineClient class manages communication with the Node.js sidecar process
 * 
 * This class runs on a worker thread and handles JSON-RPC communication with the
 * EcoSysX simulation engine via stdio. It manages the sidecar process lifecycle,
 * sends commands, parses responses, and emits signals for state changes.
 * 
 * Protocol:
 * - Line-delimited JSON over stdio
 * - Request: {"op": "init|step|snapshot|stop|ping", "data": {...}}
 * - Response: {"success": true|false, "op": "...", "data": {...}, "error": "..."}
 * 
 * Threading:
 * - Should be moved to a QThread worker
 * - All signals are thread-safe (use Qt::QueuedConnection)
 * 
 * Usage:
 * @code
 * EngineClient* client = new EngineClient();
 * connect(client, &EngineClient::started, this, &MyClass::onEngineStarted);
 * client->start();
 * client->sendInit(config);
 * @endcode
 */
class EngineClient : public QObject {
    Q_OBJECT

public:
    /**
     * @brief Construct an EngineClient
     * @param parent Parent QObject
     */
    explicit EngineClient(QObject* parent = nullptr);
    
    /**
     * @brief Destructor - ensures clean shutdown
     */
    ~EngineClient() override;

    /**
     * @brief Get current engine state
     * @return Current EngineState
     */
    EngineState state() const { return m_state; }
    
    /**
     * @brief Check if engine is running
     * @return true if state is Running or Stepping
     */
    bool isRunning() const;
    
    /**
     * @brief Get current simulation tick
     * @return Current tick number, or 0 if not started
     */
    int currentTick() const { return m_currentTick; }
    
    /**
     * @brief Get path to Node.js executable
     * @return Path to node executable
     */
    QString nodePath() const { return m_nodePath; }
    
    /**
     * @brief Set path to Node.js executable
     * @param path Path to node (default: "node" in PATH)
     */
    void setNodePath(const QString& path);
    
    /**
     * @brief Get path to sidecar script
     * @return Path to engine_sidecar.js
     */
    QString sidecarScript() const { return m_sidecarScript; }
    
    /**
     * @brief Set path to sidecar script
     * @param path Path to engine_sidecar.js
     */
    void setSidecarScript(const QString& path);

public slots:
    /**
     * @brief Start the sidecar process
     * 
     * Launches Node.js with the sidecar script. Emits started() on success,
     * errorOccurred() on failure.
     */
    void start();
    
    /**
     * @brief Stop the sidecar process
     * 
     * Sends stop command, waits for graceful shutdown, then terminates.
     * Emits stopped() when complete.
     */
    void stop();
    
    /**
     * @brief Send initialization command with configuration
     * @param config Configuration JSON matching EngineConfigV1
     */
    void sendInit(const QJsonObject& config);
    
    /**
     * @brief Send step command to advance simulation
     * @param steps Number of steps to execute (default: 1)
     */
    void sendStep(int steps = 1);
    
    /**
     * @brief Request a snapshot from the engine
     * @param type Snapshot type: "metrics" or "full"
     */
    void requestSnapshot(const QString& type = "metrics");
    
    /**
     * @brief Send stop command to engine
     * 
     * This is a graceful stop that lets the engine clean up.
     * Use stop() to forcefully terminate the process.
     */
    void sendStop();

signals:
    /**
     * @brief Emitted when sidecar process starts successfully
     */
    void started();
    
    /**
     * @brief Emitted when sidecar process stops
     */
    void stopped();
    
    /**
     * @brief Emitted after successful step operation
     * @param tick Current simulation tick after step
     */
    void stepped(int tick);
    
    /**
     * @brief Emitted when a snapshot is received
     * @param snapshot Complete snapshot JSON object
     */
    void snapshotReceived(const QJsonObject& snapshot);
    
    /**
     * @brief Emitted when an error occurs
     * @param message Error message for display
     */
    void errorOccurred(const QString& message);
    
    /**
     * @brief Emitted when engine state changes
     * @param state New engine state
     */
    void stateChanged(EngineState state);
    
    /**
     * @brief Emitted for diagnostic/log messages
     * @param message Log message
     */
    void logMessage(const QString& message);

private slots:
    /**
     * @brief Handle process start
     */
    void onProcessStarted();
    
    /**
     * @brief Handle process finish
     * @param exitCode Process exit code
     * @param exitStatus Exit status
     */
    void onProcessFinished(int exitCode, QProcess::ExitStatus exitStatus);
    
    /**
     * @brief Handle process errors
     * @param error Process error type
     */
    void onProcessError(QProcess::ProcessError error);
    
    /**
     * @brief Handle incoming data from sidecar stdout
     */
    void onReadyReadStdOut();
    
    /**
     * @brief Handle diagnostic output from sidecar stderr
     */
    void onReadyReadStdErr();
    
    /**
     * @brief Handle startup timeout
     */
    void onStartupTimeout();

protected:
    /**
     * @brief Send a JSON-RPC message to the sidecar
     * @param message JSON object to send
     *
     * Protected for unit testing/mocking.
     */
    virtual void sendMessage(const QJsonObject& message);
    
    /**
     * @brief Process a complete JSON line from sidecar
     * @param line JSON string
     *
     * Protected for unit testing.
     */
    void processLine(const QString& line);
    
    /**
     * @brief Parse and handle a JSON response
     * @param json Response JSON object
     *
     * Protected for unit testing.
     */
    void handleResponse(const QJsonObject& json);
    
    /**
     * @brief Change engine state and emit signal
     * @param newState New state
     *
     * Protected so tests can simulate state transitions.
     */
    void setState(EngineState newState);
    
private:
    /**
     * @brief Format error message from process error
     * @param error Process error
     * @return Human-readable error message
     */
    QString formatProcessError(QProcess::ProcessError error) const;

private:
    QProcess* m_process;              ///< Sidecar process
    EngineState m_state;              ///< Current engine state
    QString m_nodePath;               ///< Path to node executable
    QString m_sidecarScript;          ///< Path to sidecar script
    QString m_lineBuffer;             ///< Buffer for incomplete lines
    int m_currentTick;                ///< Current simulation tick
    QTimer* m_startupTimer;           ///< Startup timeout timer
    QString m_defaultProvider = QStringLiteral("mesa"); ///< Default engine provider
    
    static constexpr int STARTUP_TIMEOUT_MS = 5000;  ///< 5 second startup timeout
};
