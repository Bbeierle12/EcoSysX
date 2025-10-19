#pragma once

#include <QObject>
#include <QWebSocket>
#include <QJsonObject>
#include <QJsonArray>
#include <QTimer>
#include <memory>

/**
 * @brief Bridge between Qt GUI and Genesis Engine via WebSocket
 * 
 * Implements the integration protocol defined in AGENTS.md for real-time
 * communication with the Genesis Engine server. Provides a Qt-friendly
 * interface for starting simulations, stepping, and receiving updates.
 * 
 * Protocol:
 * - WebSocket connection to engine server (default: ws://localhost:8765)
 * - JSON message format: {type: string, data: object, timestamp: number}
 * - Events: engine:*, state:*, snapshot:*, error
 * 
 * Features:
 * - Automatic reconnection on connection loss
 * - Heartbeat/ping mechanism to detect disconnects
 * - Thread-safe signals for UI updates
 * - Buffered messages during connection
 * 
 * Usage:
 * @code
 * EngineInterface* engine = new EngineInterface(this);
 * connect(engine, &EngineInterface::connected, this, &MyClass::onConnected);
 * connect(engine, &EngineInterface::snapshotReceived, this, &MyClass::onSnapshot);
 * engine->connectToEngine("ws://localhost:8765");
 * @endcode
 * 
 * @see AGENTS.md for integration conventions
 */
class EngineInterface : public QObject {
    Q_OBJECT
    
public:
    /**
     * @brief Construct an EngineInterface
     * @param parent Parent QObject for memory management
     */
    explicit EngineInterface(QObject *parent = nullptr);
    
    /**
     * @brief Destructor - ensures clean disconnection
     */
    ~EngineInterface() override;
    
    /**
     * @brief Connect to the Genesis engine WebSocket server
     * @param url WebSocket URL (default: ws://localhost:8765)
     * @return true if connection initiated successfully
     */
    bool connectToEngine(const QString &url = "ws://localhost:8765");
    
    /**
     * @brief Disconnect from engine
     */
    void disconnect();
    
    /**
     * @brief Check if connected to engine
     * @return true if connected
     */
    bool isConnected() const;
    
    /**
     * @brief Get current simulation tick
     * @return Current tick, or 0 if not running
     */
    int currentTick() const { return m_currentTick; }
    
    /**
     * @brief Enable/disable automatic reconnection
     * @param enabled true to enable auto-reconnect
     */
    void setAutoReconnect(bool enabled) { m_autoReconnect = enabled; }
    
    /**
     * @brief Check if auto-reconnect is enabled
     * @return true if auto-reconnect is enabled
     */
    bool autoReconnect() const { return m_autoReconnect; }

public slots:
    /**
     * @brief Request current engine state
     */
    void requestState();
    
    /**
     * @brief Start simulation with configuration
     * @param config Configuration JSON matching EngineConfigV1 schema
     * @param options Engine options (provider, etc.)
     * @param autoRun If true, simulation starts stepping automatically
     */
    void startSimulation(const QJsonObject &config, 
                        const QJsonObject &options = QJsonObject(),
                        bool autoRun = false);
    
    /**
     * @brief Stop simulation
     */
    void stopSimulation();
    
    /**
     * @brief Step simulation forward
     * @param steps Number of steps to execute (default: 1)
     */
    void stepSimulation(int steps = 1);
    
    /**
     * @brief Request a snapshot from the engine
     * @param kind Snapshot kind: "metrics" or "full"
     */
    void requestSnapshot(const QString &kind = "metrics");
    
    /**
     * @brief Send ping to check connection
     */
    void sendPing();

signals:
    /**
     * @brief Emitted when connected to engine
     */
    void connected();
    
    /**
     * @brief Emitted when disconnected from engine
     */
    void disconnected();
    
    /**
     * @brief Emitted when engine state is updated
     * @param running true if simulation is running
     * @param tick Current simulation tick
     */
    void stateUpdated(bool running, int tick);
    
    /**
     * @brief Emitted when simulation starts
     * @param tick Current tick (should be 0)
     * @param provider Provider name (mesa, agentsjl, mock, etc.)
     */
    void simulationStarted(int tick, const QString &provider);
    
    /**
     * @brief Emitted when simulation stops
     * @param tick Final tick
     */
    void simulationStopped(int tick);
    
    /**
     * @brief Emitted when simulation steps forward
     * @param steps Number of steps executed
     * @param tick New simulation tick
     */
    void simulationStepped(int steps, int tick);
    
    /**
     * @brief Emitted when a snapshot is received
     * @param snapshot Complete snapshot JSON object
     */
    void snapshotReceived(const QJsonObject &snapshot);
    
    /**
     * @brief Emitted on error
     * @param error Error message
     */
    void errorOccurred(const QString &error);
    
    /**
     * @brief Emitted for diagnostic messages
     * @param message Log message
     */
    void logMessage(const QString &message);
    
    /**
     * @brief Emitted when connection attempt fails
     * @param reason Reason for connection failure
     */
    void connectionFailed(const QString &reason);

private slots:
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(const QString &message);
    void onError(QAbstractSocket::SocketError error);
    void onPingTimeout();
    void onReconnectTimeout();

private:
    /**
     * @brief Send a JSON message to the engine
     * @param type Message type
     * @param data Message data (optional)
     */
    void sendMessage(const QString &type, const QJsonObject &data = QJsonObject());
    
    /**
     * @brief Handle incoming message from engine
     * @param event Event name
     * @param data Event data
     * @param timestamp Message timestamp
     */
    void handleMessage(const QString &event, const QJsonValue &data, qint64 timestamp);
    
    /**
     * @brief Schedule reconnection attempt
     */
    void scheduleReconnect();
    
    /**
     * @brief Attempt to reconnect to engine
     */
    void attemptReconnect();

private:
    QWebSocket *m_socket;              ///< WebSocket connection
    QString m_url;                     ///< Server URL
    bool m_connected;                  ///< Connection state
    int m_currentTick;                 ///< Current simulation tick
    bool m_autoReconnect;              ///< Auto-reconnect flag
    int m_reconnectAttempts;           ///< Number of reconnection attempts
    QTimer *m_pingTimer;               ///< Heartbeat timer
    QTimer *m_reconnectTimer;          ///< Reconnection timer
    QList<QPair<QString, QJsonObject>> m_messageBuffer; ///< Messages buffered while connecting
    
    static constexpr int PING_INTERVAL_MS = 5000;      ///< Ping every 5 seconds
    static constexpr int RECONNECT_DELAY_MS = 2000;    ///< Reconnect after 2 seconds
    static constexpr int MAX_RECONNECT_ATTEMPTS = 5;   ///< Max reconnection attempts
};
