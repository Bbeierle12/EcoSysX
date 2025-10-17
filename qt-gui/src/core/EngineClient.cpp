#include "EngineClient.h"
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>
#include <QDir>
#include <QDebug>
#include <QStringList>

EngineClient::EngineClient(QObject* parent)
    : QObject(parent)
    , m_process(new QProcess(this))
    , m_state(EngineState::Idle)
    , m_nodePath("node")  // Assume node is in PATH
    , m_currentTick(0)
    , m_startupTimer(new QTimer(this))
{
    // Configure process
    m_process->setProcessChannelMode(QProcess::SeparateChannels);
    
    // Connect process signals
    connect(m_process, &QProcess::started,
            this, &EngineClient::onProcessStarted);
    connect(m_process, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
            this, &EngineClient::onProcessFinished);
    connect(m_process, &QProcess::errorOccurred,
            this, &EngineClient::onProcessError);
    connect(m_process, &QProcess::readyReadStandardOutput,
            this, &EngineClient::onReadyReadStdOut);
    connect(m_process, &QProcess::readyReadStandardError,
            this, &EngineClient::onReadyReadStdErr);
    
    // Configure startup timer
    m_startupTimer->setSingleShot(true);
    m_startupTimer->setInterval(STARTUP_TIMEOUT_MS);
    connect(m_startupTimer, &QTimer::timeout,
            this, &EngineClient::onStartupTimeout);
    
    // Try to find sidecar script in project directory
    // When running from qt-gui/build/bin, we need to navigate to project root
    QDir projectDir = QDir::current();
    
    // Navigate up to project root from various possible locations:
    // - qt-gui/build/bin -> up 3 levels
    // - qt-gui/build -> up 2 levels  
    // - qt-gui -> up 1 level
    // We'll try multiple levels to be robust
    QStringList possiblePaths;
    
    for (int levelsUp = 0; levelsUp <= 4; ++levelsUp) {
        QDir testDir = QDir::current();
        for (int i = 0; i < levelsUp; ++i) {
            testDir.cdUp();
        }
        
        // Try engine-sidecar and services/engine-sidecar in this directory
        possiblePaths << testDir.filePath("services/engine-sidecar/main.js");
        possiblePaths << testDir.filePath("engine-sidecar/main.js");
        possiblePaths << testDir.filePath("services/engine-sidecar/engine_sidecar.js");
    }
    
    for (const QString& path : possiblePaths) {
        if (QFile::exists(path)) {
            m_sidecarScript = path;
            qDebug() << "Found sidecar script:" << path;
            break;
        }
    }
    
    if (m_sidecarScript.isEmpty()) {
        qWarning() << "Sidecar script not found. Searched paths:";
        for (const QString& path : possiblePaths) {
            qWarning() << "  -" << path;
        }
        qWarning() << "Use setSidecarScript() to set path manually.";
    }
}

EngineClient::~EngineClient() {
    if (isRunning()) {
        stop();
        m_process->waitForFinished(3000);
    }
}

bool EngineClient::isRunning() const {
    return m_state == EngineState::Running || m_state == EngineState::Stepping;
}

void EngineClient::setNodePath(const QString& path) {
    if (m_state != EngineState::Idle) {
        qWarning() << "Cannot change node path while engine is running";
        return;
    }
    m_nodePath = path;
}

void EngineClient::setSidecarScript(const QString& path) {
    if (m_state != EngineState::Idle) {
        qWarning() << "Cannot change sidecar script while engine is running";
        return;
    }
    
    if (!QFile::exists(path)) {
        qWarning() << "Sidecar script does not exist:" << path;
        return;
    }
    
    m_sidecarScript = path;
}

void EngineClient::start() {
    if (m_state != EngineState::Idle && m_state != EngineState::Stopped && m_state != EngineState::Error) {
        qWarning() << "Engine already running or starting";
        return;
    }
    
    if (m_sidecarScript.isEmpty()) {
        emit errorOccurred("Sidecar script path not set");
        setState(EngineState::Error);
        return;
    }
    
    if (!QFile::exists(m_sidecarScript)) {
        emit errorOccurred(QString("Sidecar script not found: %1").arg(m_sidecarScript));
        setState(EngineState::Error);
        return;
    }
    
    setState(EngineState::Starting);
    emit logMessage(QString("Starting engine: %1 %2").arg(m_nodePath, m_sidecarScript));
    
    // Start the process
    m_lineBuffer.clear();
    m_currentTick = 0;
    m_process->start(m_nodePath, QStringList() << m_sidecarScript);
    
    // Start timeout timer
    m_startupTimer->start();
}

void EngineClient::stop() {
    if (m_state == EngineState::Idle || m_state == EngineState::Stopped) {
        return;
    }
    
    setState(EngineState::Stopping);
    emit logMessage("Stopping engine...");
    
    // Try graceful shutdown first
    if (isRunning()) {
        sendStop();
    }
    
    // Wait a bit for graceful shutdown
    if (!m_process->waitForFinished(2000)) {
        // Force termination
        emit logMessage("Force terminating engine process");
        m_process->terminate();
        
        if (!m_process->waitForFinished(1000)) {
            m_process->kill();
        }
    }
    
    setState(EngineState::Stopped);
}

void EngineClient::sendInit(const QJsonObject& config) {
    if (m_state == EngineState::Idle || m_state == EngineState::Stopped) {
        emit errorOccurred("Cannot send init: engine not started");
        return;
    }
    
    QJsonObject message;
    message["op"] = "init";
    
    QJsonObject data;
    data["provider"] = m_defaultProvider;
    data["config"] = config;
    message["data"] = data;
    
    emit logMessage("Sending init command");
    sendMessage(message);
}

void EngineClient::sendStep(int steps) {
    if (!isRunning()) {
        emit errorOccurred("Cannot send step: engine not running");
        return;
    }
    
    QJsonObject message;
    message["op"] = "step";
    message["data"] = QJsonObject{{"steps", steps}};
    
    setState(EngineState::Stepping);
    sendMessage(message);
}

void EngineClient::requestSnapshot(const QString& type) {
    if (!isRunning()) {
        emit errorOccurred("Cannot request snapshot: engine not running");
        return;
    }
    
    QJsonObject message;
    message["op"] = "snapshot";
    message["data"] = QJsonObject{{"kind", type}};
    
    sendMessage(message);
}

void EngineClient::sendStop() {
    QJsonObject message;
    message["op"] = "stop";
    message["data"] = QJsonObject();
    
    emit logMessage("Sending stop command");
    sendMessage(message);
}

void EngineClient::onProcessStarted() {
    m_startupTimer->stop();
    setState(EngineState::Running);
    emit logMessage("Engine process started");
    emit started();
}

void EngineClient::onProcessFinished(int exitCode, QProcess::ExitStatus exitStatus) {
    m_startupTimer->stop();
    
    QString message;
    if (exitStatus == QProcess::CrashExit) {
        message = QString("Engine crashed (exit code: %1)").arg(exitCode);
        emit errorOccurred(message);
        setState(EngineState::Error);
    } else if (exitCode != 0) {
        message = QString("Engine exited with code: %1").arg(exitCode);
        emit errorOccurred(message);
        setState(EngineState::Error);
    } else {
        message = "Engine stopped normally";
        setState(EngineState::Stopped);
    }
    
    emit logMessage(message);
    emit stopped();
}

void EngineClient::onProcessError(QProcess::ProcessError error) {
    m_startupTimer->stop();
    
    QString errorMsg = formatProcessError(error);
    emit errorOccurred(errorMsg);
    emit logMessage(QString("Process error: %1").arg(errorMsg));
    setState(EngineState::Error);
}

void EngineClient::onReadyReadStdOut() {
    // Read all available data
    QByteArray data = m_process->readAllStandardOutput();
    m_lineBuffer.append(QString::fromUtf8(data));
    
    // Process complete lines
    int pos;
    while ((pos = m_lineBuffer.indexOf('\n')) != -1) {
        QString line = m_lineBuffer.left(pos).trimmed();
        m_lineBuffer = m_lineBuffer.mid(pos + 1);
        
        if (!line.isEmpty()) {
            processLine(line);
        }
    }
    
    // Prevent buffer from growing too large
    if (m_lineBuffer.size() > 1024 * 1024) {  // 1MB limit
        emit errorOccurred("Line buffer overflow - possible protocol error");
        m_lineBuffer.clear();
    }
}

void EngineClient::onReadyReadStdErr() {
    QByteArray data = m_process->readAllStandardError();
    if (data.isEmpty()) {
        return;
    }
    
    const QStringList lines = QString::fromUtf8(data).split('\n');
    for (const QString& rawLine : lines) {
        const QString line = rawLine.trimmed();
        if (!line.isEmpty()) {
            emit logMessage(QString("[sidecar] %1").arg(line));
        }
    }
}

void EngineClient::onStartupTimeout() {
    if (m_state == EngineState::Starting) {
        emit errorOccurred("Engine startup timeout");
        m_process->kill();
        setState(EngineState::Error);
    }
}

void EngineClient::sendMessage(const QJsonObject& message) {
    // Check if process is running and ready
    if (!m_process || m_process->state() != QProcess::Running) {
        emit errorOccurred("Cannot send message: engine process not running");
        return;
    }
    
    QJsonDocument doc(message);
    QByteArray json = doc.toJson(QJsonDocument::Compact);
    json.append('\n');
    
    qint64 written = m_process->write(json);
    m_process->waitForBytesWritten(1000);  // Wait up to 1 second for write
    
    if (written != json.size()) {
        emit errorOccurred(QString("Failed to write complete message to engine (wrote %1 of %2 bytes)")
                          .arg(written).arg(json.size()));
    }
}

void EngineClient::processLine(const QString& line) {
    // Parse JSON
    QJsonParseError parseError;
    QJsonDocument doc = QJsonDocument::fromJson(line.toUtf8(), &parseError);
    
    if (parseError.error != QJsonParseError::NoError) {
        emit errorOccurred(QString("JSON parse error: %1").arg(parseError.errorString()));
        return;
    }
    
    if (!doc.isObject()) {
        emit errorOccurred("Expected JSON object from engine");
        return;
    }
    
    handleResponse(doc.object());
}

void EngineClient::handleResponse(const QJsonObject& json) {
    const bool success = json.value("success").toBool(false);
    const QString op = json.value("op").toString();
    const QJsonObject data = json.value("data").toObject();
    
    if (!success) {
        const QString error = json.value("error").toString("Unknown engine error");
        const QString stack = json.value("stack").toString();
        emit logMessage(QString("Engine error (%1): %2").arg(op.isEmpty() ? QStringLiteral("unknown") : op, error));
        if (!stack.isEmpty()) {
            emit logMessage(stack);
        }
        emit errorOccurred(error);
        setState(EngineState::Error);
        return;
    }
    
    if (op == "ping") {
        m_currentTick = data.value("tick").toInt(m_currentTick);
        if (m_state == EngineState::Starting) {
            setState(EngineState::Running);
        }
        emit stepped(m_currentTick);
        return;
    }
    
    if (op == "init") {
        m_currentTick = data.value("tick").toInt(0);
        setState(EngineState::Running);
        emit stepped(m_currentTick);
        emit logMessage("Engine initialized");
        return;
    }
    
    if (op == "step") {
        m_currentTick = data.value("tick").toInt(m_currentTick);
        setState(EngineState::Running);
        emit stepped(m_currentTick);
        return;
    }
    
    if (op == "snapshot") {
        const QJsonObject snapshot = data.value("snapshot").toObject();
        if (!snapshot.isEmpty()) {
            emit snapshotReceived(snapshot);
        }
        return;
    }
    
    if (op == "stop") {
        setState(EngineState::Stopped);
        emit logMessage("Engine reported stop");
        return;
    }
    
    // Unknown operation - log for diagnostics
    emit logMessage(QString("Unhandled response op: %1").arg(op));
}

void EngineClient::setState(EngineState newState) {
    if (m_state != newState) {
        m_state = newState;
        emit stateChanged(newState);
    }
}

QString EngineClient::formatProcessError(QProcess::ProcessError error) const {
    switch (error) {
        case QProcess::FailedToStart:
            return QString("Failed to start engine (check Node.js path: %1)").arg(m_nodePath);
        case QProcess::Crashed:
            return "Engine crashed";
        case QProcess::Timedout:
            return "Engine operation timed out";
        case QProcess::WriteError:
            return "Failed to write to engine";
        case QProcess::ReadError:
            return "Failed to read from engine";
        default:
            return "Unknown process error";
    }
}
