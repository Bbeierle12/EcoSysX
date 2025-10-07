#pragma once

#include <QWidget>
#include <QJsonObject>
#include <QChart>
#include <QLineSeries>
#include <QValueAxis>

QT_CHARTS_USE_NAMESPACE

class QChartView;

/**
 * @brief The MetricsChartWidget displays time-series plots of simulation metrics
 * 
 * This widget shows historical trends for:
 * - Susceptible population (green line)
 * - Infected population (red line)
 * - Recovered population (blue line)
 * - Dead count (gray line)
 * 
 * Features:
 * - Real-time updating as simulation progresses
 * - Auto-scaling Y-axis
 * - Interactive legend (click to show/hide series)
 * - Configurable max data points (circular buffer)
 * - Export chart as PNG image
 * 
 * Usage:
 * @code
 * MetricsChartWidget* chart = new MetricsChartWidget();
 * chart->setMaxDataPoints(1000);
 * connect(engineClient, &EngineClient::snapshotReceived,
 *         this, [chart](const QJsonObject& snapshot) {
 *     int step = snapshot["step"].toInt();
 *     chart->addDataPoint(step, snapshot);
 * });
 * @endcode
 */
class MetricsChartWidget : public QWidget {
    Q_OBJECT

public:
    /**
     * @brief Construct a MetricsChartWidget
     * @param parent Parent widget
     */
    explicit MetricsChartWidget(QWidget* parent = nullptr);
    
    /**
     * @brief Get maximum number of data points retained
     * @return Max data points
     */
    int maxDataPoints() const { return m_maxDataPoints; }
    
    /**
     * @brief Set maximum number of data points
     * @param max Maximum points (older points are removed)
     */
    void setMaxDataPoints(int max);
    
    /**
     * @brief Check if a series is visible
     * @param seriesName Series name ("susceptible", "infected", "recovered", "dead")
     * @return true if visible
     */
    bool isSeriesVisible(const QString& seriesName) const;
    
    /**
     * @brief Get current data point count
     * @return Number of data points
     */
    int dataPointCount() const { return m_dataPointCount; }

public slots:
    /**
     * @brief Add a data point from snapshot
     * @param step Simulation step (X-axis value)
     * @param snapshot JSON snapshot containing agent data
     */
    void addDataPoint(int step, const QJsonObject& snapshot);
    
    /**
     * @brief Clear all data points
     */
    void clear();
    
    /**
     * @brief Toggle series visibility
     * @param seriesName Series name
     * @param visible true to show, false to hide
     */
    void setSeriesVisible(const QString& seriesName, bool visible);
    
    /**
     * @brief Export chart to PNG file
     * @param filePath Output file path
     * @return true if export succeeded
     */
    bool exportToPng(const QString& filePath);
    
    /**
     * @brief Show file dialog and export chart
     * @return true if exported
     */
    bool exportWithDialog();

signals:
    /**
     * @brief Emitted when a series visibility changes
     * @param seriesName Series name
     * @param visible New visibility state
     */
    void seriesToggled(const QString& seriesName, bool visible);
    
    /**
     * @brief Emitted when data is added
     * @param step Step number
     */
    void dataAdded(int step);
    
    /**
     * @brief Emitted when chart is cleared
     */
    void chartCleared();

private:
    /**
     * @brief Extract metric counts from snapshot
     * @param snapshot JSON snapshot
     * @return Struct with counts
     */
    struct Metrics {
        int susceptible;
        int infected;
        int recovered;
        int dead;
    };
    Metrics extractMetrics(const QJsonObject& snapshot);
    
    /**
     * @brief Update Y-axis range based on current data
     */
    void updateYAxisRange();
    
    /**
     * @brief Setup chart appearance
     */
    void setupChart();
    
    /**
     * @brief Create series with color and name
     * @param name Series name
     * @param color Line color
     * @return Created series
     */
    QLineSeries* createSeries(const QString& name, const QColor& color);

private:
    QChart* m_chart;
    QChartView* m_chartView;
    
    // Series
    QLineSeries* m_susceptibleSeries;
    QLineSeries* m_infectedSeries;
    QLineSeries* m_recoveredSeries;
    QLineSeries* m_deadSeries;
    
    // Axes
    QValueAxis* m_axisX;
    QValueAxis* m_axisY;
    
    // Configuration
    int m_maxDataPoints;
    int m_dataPointCount;
    
    // Track min/max for auto-scaling
    int m_minStep;
    int m_maxStep;
    int m_maxValue;
};
