#pragma once

#include <QWidget>
#include <QString>
#include <QDateTime>

class QTextEdit;
class QPushButton;
class QComboBox;

/**
 * @brief Message severity levels
 */
enum class LogSeverity {
    Info,
    Warning,
    Error
};

/**
 * @brief The EventLogPanel displays timestamped log messages with severity levels
 * 
 * This panel is typically docked at the bottom of the main window and displays
 * lifecycle events, errors, and diagnostic messages from the engine and GUI.
 * 
 * Features:
 * - Color-coded messages by severity
 * - Timestamps for each entry
 * - Filter by severity
 * - Clear and export functionality
 * - Auto-scroll to latest messages
 * 
 * Usage:
 * @code
 * EventLogPanel* log = new EventLogPanel();
 * connect(engineClient, &EngineClient::logMessage, log, &EventLogPanel::logInfo);
 * connect(engineClient, &EngineClient::errorOccurred, log, &EventLogPanel::logError);
 * @endcode
 */
class EventLogPanel : public QWidget {
    Q_OBJECT

public:
    /**
     * @brief Construct an EventLogPanel
     * @param parent Parent widget
     */
    explicit EventLogPanel(QWidget* parent = nullptr);
    
    /**
     * @brief Get the number of log entries
     * @return Number of entries
     */
    int entryCount() const { return m_entryCount; }
    
    /**
     * @brief Check if auto-scroll is enabled
     * @return true if auto-scrolling to latest messages
     */
    bool autoScroll() const { return m_autoScroll; }
    
    /**
     * @brief Set auto-scroll behavior
     * @param enabled true to auto-scroll to latest
     */
    void setAutoScroll(bool enabled);

public slots:
    /**
     * @brief Log an informational message
     * @param message Message text
     */
    void logInfo(const QString& message);
    
    /**
     * @brief Log a warning message
     * @param message Message text
     */
    void logWarning(const QString& message);
    
    /**
     * @brief Log an error message
     * @param message Message text
     */
    void logError(const QString& message);
    
    /**
     * @brief Log a message with specified severity
     * @param severity Message severity
     * @param message Message text
     */
    void log(LogSeverity severity, const QString& message);
    
    /**
     * @brief Clear all log entries
     */
    void clear();
    
    /**
     * @brief Export log to a text file
     * @param filePath Path to save log file
     * @return true if export succeeded
     */
    bool exportToFile(const QString& filePath);
    
    /**
     * @brief Show file dialog and export log
     * @return true if exported
     */
    bool exportWithDialog();

signals:
    /**
     * @brief Emitted when the log is cleared
     */
    void logCleared();
    
    /**
     * @brief Emitted when a message is added
     * @param severity Message severity
     * @param message Message text
     */
    void messageAdded(LogSeverity severity, const QString& message);

private slots:
    /**
     * @brief Handle clear button click
     */
    void onClearClicked();
    
    /**
     * @brief Handle export button click
     */
    void onExportClicked();
    
    /**
     * @brief Handle severity filter change
     */
    void onFilterChanged(int index);

private:
    /**
     * @brief Append a formatted log entry
     * @param severity Message severity
     * @param message Message text
     */
    void appendEntry(LogSeverity severity, const QString& message);
    
    /**
     * @brief Get HTML color for severity level
     * @param severity Severity level
     * @return HTML color string
     */
    QString severityColor(LogSeverity severity) const;
    
    /**
     * @brief Get text label for severity level
     * @param severity Severity level
     * @return Severity label (INFO, WARN, ERROR)
     */
    QString severityLabel(LogSeverity severity) const;
    
    /**
     * @brief Format a log entry as HTML
     * @param severity Message severity
     * @param message Message text
     * @param timestamp Entry timestamp
     * @return Formatted HTML string
     */
    QString formatEntry(LogSeverity severity, const QString& message, const QDateTime& timestamp) const;

private:
    QTextEdit* m_textEdit;        ///< Log display widget
    QPushButton* m_clearButton;   ///< Clear log button
    QPushButton* m_exportButton;  ///< Export log button
    QComboBox* m_filterCombo;     ///< Severity filter
    int m_entryCount;             ///< Number of entries
    bool m_autoScroll;            ///< Auto-scroll to latest
    LogSeverity m_filterLevel;    ///< Current filter level
};
