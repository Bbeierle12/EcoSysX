#include "EngineInterface.h"
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QDateTime>
#include <QDebug>

EngineInterface::EngineInterface(QObject *parent)
    : QObject(parent)
    , m_socket(new QWebSocket())
    , m_connected(false)
    , m_currentTick(0)
    , m_autoReconnect(true)
    , m_reconnectAttempts(0)
    , m_pingTimer(new QTimer(this))
    , m_reconnectTimer(new QTimer(this))
{
    // Connect WebSocket signals
    connect(m_socket, &QWebSocket::connected,
            this, &EngineInterface::onConnected);
    connect(m_socket, &QWebSocket::disconnected,
            this, &EngineInterface::onDisconnected);
    connect(m_socket, &QWebSocket::textMessageReceived,
            this, &EngineInterface::onTextMessageReceived);
    connect(m_socket, QOverload<QAbstractSocket::SocketError>::of(&QWebSocket::error),
            this, &EngineInterface::onError);
    
    // Configure ping timer
    m_pingTimer->setInterval(PING_INTERVAL_MS);
    connect(m_pingTimer, &QTimer::timeout,
            this, &EngineInterface::onPingTimeout);
    
    // Configure reconnect timer
    m_reconnectTimer->setSingleShot(true);
    m_reconnectTimer->setInterval(RECONNECT_DELAY_MS);
    connect(m_reconnectTimer, &QTimer::timeout,
            this, &EngineInterface::onReconnectTimeout);
}

EngineInterface::~EngineInterface()
{
    disconnect();
    delete m_socket;
}

bool EngineInterface::connectToEngine(const QString &url)
{
    if (m_connected) {
        qWarning() << "Already connected to engine";
        return false;
    }
    
    m_url = url;
    m_reconnectAttempts = 0;
    
    qInfo() << "Connecting to Genesis Engine at" << url;
    emit logMessage(QString("Connecting to %1...").arg(url));
    
    m_socket->open(QUrl(url));
    return true;
}

void EngineInterface::disconnect()
{
    // Stop timers
    m_pingTimer->stop();
    m_reconnectTimer->stop();
    
    // Close socket
    if (m_socket->state() == QAbstractSocket::ConnectedState) {
        m_socket->close();
    }
    
    m_connected = false;
    m_reconnectAttempts = 0;
}

bool EngineInterface::isConnected() const
{
    return m_connected;
}

void EngineInterface::requestState()
{
    if (!m_connected) {
        emit errorOccurred("Not connected to engine");
        return;
    }
    
    sendMessage("getState");
}

void EngineInterface::startSimulation(const QJsonObject &config, 
                                     const QJsonObject &options,
                                     bool autoRun)
{
    if (!m_connected) {
        emit errorOccurred("Not connected to engine");
        return;
    }
    
    QJsonObject data;
    data["config"] = config;
    data["options"] = options;
    data["autoRun"] = autoRun;
    
    sendMessage("start", data);
}

void EngineInterface::stopSimulation()
{
    if (!m_connected) {
        emit errorOccurred("Not connected to engine");
        return;
    }
    
    sendMessage("stop");
}

void EngineInterface::stepSimulation(int steps)
{
    if (!m_connected) {
        emit errorOccurred("Not connected to engine");
        return;
    }
    
    QJsonObject data;
    data["steps"] = steps;
    
    sendMessage("step", data);
}

void EngineInterface::requestSnapshot(const QString &kind)
{
    if (!m_connected) {
        emit errorOccurred("Not connected to engine");
        return;
    }
    
    QJsonObject data;
    data["kind"] = kind;
    
    sendMessage("snapshot", data);
}

void EngineInterface::sendPing()
{
    if (!m_connected) {
        return;
    }
    
    sendMessage("ping");
}

void EngineInterface::onConnected()
{
    m_connected = true;
    m_reconnectAttempts = 0;
    
    qInfo() << "Connected to Genesis Engine";
    emit logMessage("Connected to Genesis Engine");
    emit connected();
    
    // Start ping timer
    m_pingTimer->start();
    
    // Send buffered messages
    for (const auto &msg : m_messageBuffer) {
        sendMessage(msg.first, msg.second);
    }
    m_messageBuffer.clear();
}

void EngineInterface::onDisconnected()
{
    m_connected = false;
    m_pingTimer->stop();
    
    qInfo() << "Disconnected from Genesis Engine";
    emit logMessage("Disconnected from Genesis Engine");
    emit disconnected();
    
    // Attempt to reconnect if enabled
    if (m_autoReconnect && m_reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect();
    } else if (m_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        emit connectionFailed("Max reconnection attempts reached");
    }
}

void EngineInterface::onTextMessageReceived(const QString &message)
{
    // Parse JSON message
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (!doc.isObject()) {
        qWarning() << "Invalid message format received:" << message;
        return;
    }
    
    QJsonObject obj = doc.object();
    QString event = obj["event"].toString();
    QJsonValue data = obj["data"];
    qint64 timestamp = obj["timestamp"].toVariant().toLongLong();
    
    // Handle message
    handleMessage(event, data, timestamp);
}

void EngineInterface::onError(QAbstractSocket::SocketError error)
{
    QString errorString = m_socket->errorString();
    qWarning() << "WebSocket error:" << error << errorString;
    emit errorOccurred(errorString);
    
    // Attempt to reconnect on connection errors
    if (error == QAbstractSocket::RemoteHostClosedError ||
        error == QAbstractSocket::NetworkError) {
        if (m_autoReconnect && m_reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            scheduleReconnect();
        }
    }
}

void EngineInterface::onPingTimeout()
{
    sendPing();
}

void EngineInterface::onReconnectTimeout()
{
    attemptReconnect();
}

void EngineInterface::sendMessage(const QString &type, const QJsonObject &data)
{
    if (!m_connected) {
        // Buffer message for later if not critical
        if (type != "ping") {
            m_messageBuffer.append(qMakePair(type, data));
        }
        return;
    }
    
    QJsonObject message;
    message["type"] = type;
    if (!data.isEmpty()) {
        message["data"] = data;
    }
    message["timestamp"] = QDateTime::currentMSecsSinceEpoch();
    
    QJsonDocument doc(message);
    QString jsonString = doc.toJson(QJsonDocument::Compact);
    
    m_socket->sendTextMessage(jsonString);
}

void EngineInterface::handleMessage(const QString &event, 
                                   const QJsonValue &data, 
                                   qint64 timestamp)
{
    Q_UNUSED(timestamp);
    
    if (event == "engine:connected") {
        // Initial connection message
        QJsonObject obj = data.toObject();
        bool running = obj["running"].toBool();
        int tick = obj["tick"].toInt();
        
        m_currentTick = tick;
        emit stateUpdated(running, tick);
        
        qInfo() << "Engine ready - Running:" << running << "Tick:" << tick;
    }
    else if (event == "state:update") {
        // State update message
        QJsonObject obj = data.toObject();
        bool running = obj["running"].toBool();
        int tick = obj["tick"].toInt();
        
        m_currentTick = tick;
        emit stateUpdated(running, tick);
        
        // If snapshot is included, emit it
        if (obj.contains("snapshot") && !obj["snapshot"].isNull()) {
            QJsonObject snapshot = obj["snapshot"].toObject();
            emit snapshotReceived(snapshot);
        }
    }
    else if (event == "engine:started") {
        // Simulation started
        QJsonObject obj = data.toObject();
        int tick = obj["tick"].toInt();
        QString provider = obj["provider"].toString();
        
        m_currentTick = tick;
        emit simulationStarted(tick, provider);
        
        qInfo() << "Simulation started with provider:" << provider;
        emit logMessage(QString("Simulation started (provider: %1)").arg(provider));
    }
    else if (event == "engine:stopped") {
        // Simulation stopped
        QJsonObject obj = data.toObject();
        int tick = obj["tick"].toInt();
        
        m_currentTick = tick;
        emit simulationStopped(tick);
        
        qInfo() << "Simulation stopped at tick:" << tick;
        emit logMessage(QString("Simulation stopped (tick: %1)").arg(tick));
    }
    else if (event == "engine:step" || event == "engine:stepped") {
        // Simulation stepped
        QJsonObject obj = data.toObject();
        int steps = obj["steps"].toInt(1);
        int tick = obj["tick"].toInt();
        
        m_currentTick = tick;
        emit simulationStepped(steps, tick);
    }
    else if (event == "snapshot:update") {
        // Snapshot received
        QJsonObject snapshot = data.toObject();
        
        // Update tick if included in snapshot
        if (snapshot.contains("tick")) {
            m_currentTick = snapshot["tick"].toInt();
        }
        
        emit snapshotReceived(snapshot);
    }
    else if (event == "error") {
        // Error message
        QJsonObject obj = data.toObject();
        QString errorMsg = obj["message"].toString();
        
        qWarning() << "Engine error:" << errorMsg;
        emit errorOccurred(errorMsg);
    }
    else if (event == "pong") {
        // Pong response to ping
        // Connection is alive, no action needed
    }
    else if (event == "server:shutdown") {
        // Server is shutting down
        QJsonObject obj = data.toObject();
        QString msg = obj["message"].toString();
        
        qInfo() << "Server shutting down:" << msg;
        emit logMessage(msg);
        
        // Don't attempt to reconnect on intentional shutdown
        m_autoReconnect = false;
    }
    else {
        qWarning() << "Unknown event:" << event;
    }
}

void EngineInterface::scheduleReconnect()
{
    m_reconnectAttempts++;
    
    qInfo() << "Scheduling reconnect attempt" << m_reconnectAttempts 
            << "of" << MAX_RECONNECT_ATTEMPTS;
    emit logMessage(QString("Reconnecting in %1ms (attempt %2/%3)...")
                   .arg(RECONNECT_DELAY_MS)
                   .arg(m_reconnectAttempts)
                   .arg(MAX_RECONNECT_ATTEMPTS));
    
    m_reconnectTimer->start();
}

void EngineInterface::attemptReconnect()
{
    qInfo() << "Attempting to reconnect...";
    m_socket->open(QUrl(m_url));
}
