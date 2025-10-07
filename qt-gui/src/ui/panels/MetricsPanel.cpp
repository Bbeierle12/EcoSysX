#include "MetricsPanel.h"
#include <QVBoxLayout>
#include <QGridLayout>
#include <QLabel>
#include <QFrame>
#include <QJsonArray>
#include <QLocale>

MetricsPanel::MetricsPanel(QWidget* parent)
    : QWidget(parent)
    , m_previousInfectionRate(0.0)
{
    // Create main layout
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(10, 10, 10, 10);
    mainLayout->setSpacing(5);
    
    // Title
    QLabel* titleLabel = new QLabel("<h3>Simulation Metrics</h3>");
    titleLabel->setAlignment(Qt::AlignCenter);
    mainLayout->addWidget(titleLabel);
    
    // Separator
    QFrame* separator = new QFrame();
    separator->setFrameShape(QFrame::HLine);
    separator->setFrameShadow(QFrame::Sunken);
    mainLayout->addWidget(separator);
    
    // Metrics grid
    QGridLayout* gridLayout = new QGridLayout();
    gridLayout->setColumnStretch(0, 1);
    gridLayout->setColumnStretch(1, 1);
    gridLayout->setVerticalSpacing(8);
    gridLayout->setHorizontalSpacing(10);
    
    int row = 0;
    addMetricRow(gridLayout, row++, "Population:", &m_populationValueLabel);
    addMetricRow(gridLayout, row++, "Susceptible:", &m_susceptibleValueLabel);
    addMetricRow(gridLayout, row++, "Infected:", &m_infectedValueLabel);
    addMetricRow(gridLayout, row++, "Recovered:", &m_recoveredValueLabel);
    addMetricRow(gridLayout, row++, "Dead:", &m_deadValueLabel);
    addMetricRow(gridLayout, row++, "Infection Rate:", &m_infectionRateValueLabel);
    
    mainLayout->addLayout(gridLayout);
    
    // Another separator
    QFrame* separator2 = new QFrame();
    separator2->setFrameShape(QFrame::HLine);
    separator2->setFrameShadow(QFrame::Sunken);
    mainLayout->addWidget(separator2);
    
    // Step counter (larger, centered)
    QVBoxLayout* stepLayout = new QVBoxLayout();
    QLabel* stepLabel = new QLabel("Current Step:");
    stepLabel->setAlignment(Qt::AlignCenter);
    m_stepValueLabel = new QLabel("0");
    m_stepValueLabel->setAlignment(Qt::AlignCenter);
    m_stepValueLabel->setStyleSheet("font-size: 20pt; font-weight: bold;");
    stepLayout->addWidget(stepLabel);
    stepLayout->addWidget(m_stepValueLabel);
    mainLayout->addLayout(stepLayout);
    
    // Spacer to push content to top
    mainLayout->addStretch();
    
    // Initialize display
    reset();
}

void MetricsPanel::updateMetrics(const QJsonObject& snapshot) {
    Metrics newMetrics = extractMetrics(snapshot);
    
    // Check for threshold crossing
    QString oldSeverity = getInfectionRateSeverity(m_previousInfectionRate);
    QString newSeverity = getInfectionRateSeverity(newMetrics.infectionRate);
    
    if (oldSeverity != newSeverity) {
        emit infectionThresholdCrossed(newMetrics.infectionRate, newSeverity);
    }
    
    m_previousInfectionRate = newMetrics.infectionRate;
    m_currentMetrics = newMetrics;
    
    updateDisplay();
    emit metricsUpdated();
}

void MetricsPanel::reset() {
    m_currentMetrics = Metrics();
    m_previousInfectionRate = 0.0;
    updateDisplay();
}

MetricsPanel::Metrics MetricsPanel::extractMetrics(const QJsonObject& snapshot) {
    Metrics metrics;
    
    // Extract step
    metrics.currentStep = snapshot["step"].toInt(0);
    
    // Count agents by state
    QJsonArray agents = snapshot["agents"].toArray();
    
    for (const QJsonValue& agentValue : agents) {
        QJsonObject agent = agentValue.toObject();
        QString state = agent["state"].toString().toLower();
        
        if (state == "susceptible") {
            metrics.susceptible++;
        } else if (state == "infected") {
            metrics.infected++;
        } else if (state == "recovered") {
            metrics.recovered++;
        } else if (state == "dead") {
            metrics.dead++;
        }
    }
    
    // Calculate totals
    metrics.totalPopulation = metrics.susceptible + metrics.infected + metrics.recovered;
    
    // Calculate infection rate
    if (metrics.totalPopulation > 0) {
        metrics.infectionRate = static_cast<double>(metrics.infected) / metrics.totalPopulation;
    } else {
        metrics.infectionRate = 0.0;
    }
    
    return metrics;
}

void MetricsPanel::updateDisplay() {
    // Update value labels
    m_populationValueLabel->setText(formatNumber(m_currentMetrics.totalPopulation));
    m_susceptibleValueLabel->setText(formatNumber(m_currentMetrics.susceptible));
    m_infectedValueLabel->setText(formatNumber(m_currentMetrics.infected));
    m_recoveredValueLabel->setText(formatNumber(m_currentMetrics.recovered));
    m_deadValueLabel->setText(formatNumber(m_currentMetrics.dead));
    
    // Format infection rate with color
    QString rateText = QString::number(m_currentMetrics.infectionRate * 100.0, 'f', 1) + "%";
    QString color = getInfectionRateColor(m_currentMetrics.infectionRate);
    m_infectionRateValueLabel->setText(
        QString("<span style='color: %1; font-weight: bold;'>%2</span>")
        .arg(color)
        .arg(rateText)
    );
    
    // Update step
    m_stepValueLabel->setText(formatNumber(m_currentMetrics.currentStep));
}

QString MetricsPanel::formatNumber(int value) const {
    QLocale locale;
    return locale.toString(value);
}

QString MetricsPanel::getInfectionRateColor(double rate) const {
    if (rate < 0.10) {
        return "#28a745";  // Green - low
    } else if (rate < 0.30) {
        return "#ffc107";  // Yellow - medium
    } else {
        return "#dc3545";  // Red - high
    }
}

QString MetricsPanel::getInfectionRateSeverity(double rate) const {
    if (rate < 0.10) {
        return "low";
    } else if (rate < 0.30) {
        return "medium";
    } else {
        return "high";
    }
}

void MetricsPanel::addMetricRow(QGridLayout* layout, int row,
                                 const QString& labelText, QLabel** valueLabel) {
    QLabel* label = new QLabel(labelText);
    label->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
    
    *valueLabel = new QLabel("0");
    (*valueLabel)->setAlignment(Qt::AlignLeft | Qt::AlignVCenter);
    (*valueLabel)->setStyleSheet("font-weight: bold;");
    
    layout->addWidget(label, row, 0);
    layout->addWidget(*valueLabel, row, 1);
}
