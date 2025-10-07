#pragma once

#include <QWidget>
#include <QJsonObject>

class QLabel;
class QGridLayout;

/**
 * @brief The MetricsPanel displays real-time simulation statistics
 * 
 * This panel shows key metrics extracted from engine snapshots:
 * - Total population (Susceptible + Infected + Recovered)
 * - Susceptible count
 * - Infected count
 * - Recovered count
 * - Dead count
 * - Infection rate (Infected / Total)
 * - Current simulation step
 * 
 * Metrics are color-coded based on thresholds:
 * - Infection rate < 10%: Green
 * - Infection rate 10-30%: Yellow
 * - Infection rate > 30%: Red
 * 
 * Usage:
 * @code
 * MetricsPanel* panel = new MetricsPanel();
 * connect(engineClient, &EngineClient::snapshotReceived,
 *         panel, &MetricsPanel::updateMetrics);
 * @endcode
 */
class MetricsPanel : public QWidget {
    Q_OBJECT

public:
    /**
     * @brief Construct a MetricsPanel
     * @param parent Parent widget
     */
    explicit MetricsPanel(QWidget* parent = nullptr);
    
    /**
     * @brief Get current total population
     * @return Total living agents
     */
    int totalPopulation() const { return m_currentMetrics.totalPopulation; }
    
    /**
     * @brief Get current infection rate
     * @return Infection rate as decimal (0.0 - 1.0)
     */
    double infectionRate() const { return m_currentMetrics.infectionRate; }
    
    /**
     * @brief Get current simulation step
     * @return Step number
     */
    int currentStep() const { return m_currentMetrics.currentStep; }

public slots:
    /**
     * @brief Update metrics from snapshot data
     * @param snapshot JSON snapshot from engine
     * 
     * Expected snapshot format:
     * {
     *   "step": 123,
     *   "agents": [
     *     { "id": 1, "state": "susceptible", ... },
     *     { "id": 2, "state": "infected", ... },
     *     ...
     *   ]
     * }
     */
    void updateMetrics(const QJsonObject& snapshot);
    
    /**
     * @brief Reset all metrics to zero
     */
    void reset();

signals:
    /**
     * @brief Emitted when metrics are updated
     */
    void metricsUpdated();
    
    /**
     * @brief Emitted when infection rate crosses threshold
     * @param rate Current infection rate (0.0 - 1.0)
     * @param severity Severity level ("low", "medium", "high")
     */
    void infectionThresholdCrossed(double rate, const QString& severity);

private:
    /**
     * @brief Simulation metrics data
     */
    struct Metrics {
        int totalPopulation;
        int susceptible;
        int infected;
        int recovered;
        int dead;
        double infectionRate;
        int currentStep;
        
        Metrics()
            : totalPopulation(0)
            , susceptible(0)
            , infected(0)
            , recovered(0)
            , dead(0)
            , infectionRate(0.0)
            , currentStep(0)
        {}
    };
    
    /**
     * @brief Extract metrics from JSON snapshot
     * @param snapshot JSON snapshot data
     * @return Extracted metrics
     */
    Metrics extractMetrics(const QJsonObject& snapshot);
    
    /**
     * @brief Update display labels with current metrics
     */
    void updateDisplay();
    
    /**
     * @brief Format a number with thousand separators
     * @param value Number to format
     * @return Formatted string (e.g., "1,234")
     */
    QString formatNumber(int value) const;
    
    /**
     * @brief Get color for infection rate
     * @param rate Infection rate (0.0 - 1.0)
     * @return HTML color string
     */
    QString getInfectionRateColor(double rate) const;
    
    /**
     * @brief Get severity level for infection rate
     * @param rate Infection rate (0.0 - 1.0)
     * @return Severity ("low", "medium", "high")
     */
    QString getInfectionRateSeverity(double rate) const;
    
    /**
     * @brief Create a metric row in the layout
     * @param layout Grid layout
     * @param row Row index
     * @param labelText Label text
     * @param valueLabel Output: created value label
     */
    void addMetricRow(QGridLayout* layout, int row,
                      const QString& labelText, QLabel** valueLabel);

private:
    // Display labels
    QLabel* m_populationValueLabel;
    QLabel* m_susceptibleValueLabel;
    QLabel* m_infectedValueLabel;
    QLabel* m_recoveredValueLabel;
    QLabel* m_deadValueLabel;
    QLabel* m_infectionRateValueLabel;
    QLabel* m_stepValueLabel;
    
    // Current metrics
    Metrics m_currentMetrics;
    
    // Previous infection rate for threshold detection
    double m_previousInfectionRate;
};
