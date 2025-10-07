#include "EventLogPanel.h"
#include <QTextEdit>
#include <QPushButton>
#include <QComboBox>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFileDialog>
#include <QFile>
#include <QTextStream>
#include <QScrollBar>
#include <QDateTime>

EventLogPanel::EventLogPanel(QWidget* parent)
    : QWidget(parent)
    , m_textEdit(new QTextEdit(this))
    , m_clearButton(new QPushButton("Clear", this))
    , m_exportButton(new QPushButton("Export...", this))
    , m_filterCombo(new QComboBox(this))
    , m_entryCount(0)
    , m_autoScroll(true)
    , m_filterLevel(LogSeverity::Info)
{
    // Configure text edit
    m_textEdit->setReadOnly(true);
    m_textEdit->setLineWrapMode(QTextEdit::WidgetWidth);
    
    // Configure filter combo
    m_filterCombo->addItem("All Messages", static_cast<int>(LogSeverity::Info));
    m_filterCombo->addItem("Warnings & Errors", static_cast<int>(LogSeverity::Warning));
    m_filterCombo->addItem("Errors Only", static_cast<int>(LogSeverity::Error));
    
    // Create toolbar layout
    QHBoxLayout* toolbarLayout = new QHBoxLayout();
    toolbarLayout->addWidget(m_filterCombo);
    toolbarLayout->addStretch();
    toolbarLayout->addWidget(m_clearButton);
    toolbarLayout->addWidget(m_exportButton);
    
    // Create main layout
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    mainLayout->addLayout(toolbarLayout);
    mainLayout->addWidget(m_textEdit);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    
    // Connect signals
    connect(m_clearButton, &QPushButton::clicked,
            this, &EventLogPanel::onClearClicked);
    connect(m_exportButton, &QPushButton::clicked,
            this, &EventLogPanel::onExportClicked);
    connect(m_filterCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
            this, &EventLogPanel::onFilterChanged);
    
    // Initial message
    logInfo("Event log initialized");
}

void EventLogPanel::setAutoScroll(bool enabled) {
    m_autoScroll = enabled;
}

void EventLogPanel::logInfo(const QString& message) {
    log(LogSeverity::Info, message);
}

void EventLogPanel::logWarning(const QString& message) {
    log(LogSeverity::Warning, message);
}

void EventLogPanel::logError(const QString& message) {
    log(LogSeverity::Error, message);
}

void EventLogPanel::log(LogSeverity severity, const QString& message) {
    // Check filter
    if (static_cast<int>(severity) < static_cast<int>(m_filterLevel)) {
        return;
    }
    
    appendEntry(severity, message);
    emit messageAdded(severity, message);
}

void EventLogPanel::clear() {
    m_textEdit->clear();
    m_entryCount = 0;
    emit logCleared();
    logInfo("Log cleared");
}

bool EventLogPanel::exportToFile(const QString& filePath) {
    QFile file(filePath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) {
        logError(QString("Failed to export log: %1").arg(file.errorString()));
        return false;
    }
    
    QTextStream out(&file);
    out << m_textEdit->toPlainText();
    file.close();
    
    logInfo(QString("Log exported to: %1").arg(filePath));
    return true;
}

bool EventLogPanel::exportWithDialog() {
    QString fileName = QFileDialog::getSaveFileName(
        this,
        "Export Event Log",
        QString("ecosysx-log-%1.txt").arg(QDateTime::currentDateTime().toString("yyyyMMdd-HHmmss")),
        "Text Files (*.txt);;All Files (*)"
    );
    
    if (fileName.isEmpty()) {
        return false;
    }
    
    return exportToFile(fileName);
}

void EventLogPanel::onClearClicked() {
    clear();
}

void EventLogPanel::onExportClicked() {
    exportWithDialog();
}

void EventLogPanel::onFilterChanged(int index) {
    m_filterLevel = static_cast<LogSeverity>(m_filterCombo->itemData(index).toInt());
    // Note: Filter only affects new messages, doesn't hide existing ones
    logInfo(QString("Filter changed to: %1").arg(m_filterCombo->currentText()));
}

void EventLogPanel::appendEntry(LogSeverity severity, const QString& message) {
    QDateTime timestamp = QDateTime::currentDateTime();
    QString entry = formatEntry(severity, message, timestamp);
    
    // Append to text edit
    m_textEdit->append(entry);
    m_entryCount++;
    
    // Auto-scroll to bottom
    if (m_autoScroll) {
        QScrollBar* scrollBar = m_textEdit->verticalScrollBar();
        scrollBar->setValue(scrollBar->maximum());
    }
}

QString EventLogPanel::severityColor(LogSeverity severity) const {
    switch (severity) {
        case LogSeverity::Info:
            return "#000000";  // Black
        case LogSeverity::Warning:
            return "#FF8C00";  // Dark orange
        case LogSeverity::Error:
            return "#DC143C";  // Crimson
        default:
            return "#000000";
    }
}

QString EventLogPanel::severityLabel(LogSeverity severity) const {
    switch (severity) {
        case LogSeverity::Info:
            return "INFO ";
        case LogSeverity::Warning:
            return "WARN ";
        case LogSeverity::Error:
            return "ERROR";
        default:
            return "?????";
    }
}

QString EventLogPanel::formatEntry(LogSeverity severity, const QString& message, const QDateTime& timestamp) const {
    QString timeStr = timestamp.toString("HH:mm:ss");
    QString severityStr = severityLabel(severity);
    QString color = severityColor(severity);
    
    return QString("<span style='color: gray;'>%1</span> "
                   "<span style='color: %2; font-weight: bold;'>[%3]</span> "
                   "<span style='color: %2;'>%4</span>")
        .arg(timeStr)
        .arg(color)
        .arg(severityStr)
        .arg(message.toHtmlEscaped());
}
