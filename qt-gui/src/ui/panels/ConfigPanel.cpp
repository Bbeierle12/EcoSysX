#include "ConfigPanel.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QGroupBox>
#include <QLineEdit>
#include <QSpinBox>
#include <QDoubleSpinBox>
#include <QPushButton>
#include <QLabel>
#include <QFileDialog>
#include <QMessageBox>
#include <QScrollArea>

ConfigPanel::ConfigPanel(QWidget* parent)
    : QWidget(parent)
    , m_isDirty(false)
{
    createUI();
    reset();  // Initialize with defaults
}

Configuration ConfigPanel::configuration() const {
    return m_config;
}

void ConfigPanel::setConfiguration(const Configuration& config) {
    m_config = config;
    m_originalConfig = config;
    updateUI();
    setDirty(false);
}

bool ConfigPanel::validate(QStringList* errors) {
    updateConfiguration();
    
    QStringList validationErrors;
    bool valid = m_config.validate(&validationErrors);
    
    if (errors) {
        *errors = validationErrors;
    }
    
    // Update validation UI
    if (valid) {
        m_validationLabel->setText("<span style='color: green;'>✓ Configuration valid</span>");
    } else {
        QString errorHtml = "<span style='color: red;'>✗ Validation errors:<br/>";
        for (const QString& error : validationErrors) {
            errorHtml += "  • " + error.toHtmlEscaped() + "<br/>";
        }
        errorHtml += "</span>";
        m_validationLabel->setText(errorHtml);
    }
    
    emit validationStateChanged(valid);
    return valid;
}

bool ConfigPanel::loadFromFile() {
    QString fileName = QFileDialog::getOpenFileName(
        this,
        "Load Configuration",
        QString(),
        "JSON Files (*.json);;All Files (*)"
    );
    
    if (fileName.isEmpty()) {
        return false;
    }
    
    return loadFromFile(fileName);
}

bool ConfigPanel::loadFromFile(const QString& filePath) {
    Configuration config;
    QStringList errors;
    
    if (!config.loadFromFile(filePath, &errors)) {
        QMessageBox::critical(this, "Load Error", 
            QString("Failed to load configuration:\n%1").arg(errors.join("\n")));
        return false;
    }
    
    setConfiguration(config);
    QMessageBox::information(this, "Success", 
        QString("Configuration loaded from:\n%1").arg(filePath));
    return true;
}

bool ConfigPanel::saveToFile() {
    QString fileName = QFileDialog::getSaveFileName(
        this,
        "Save Configuration",
        "config.json",
        "JSON Files (*.json);;All Files (*)"
    );
    
    if (fileName.isEmpty()) {
        return false;
    }
    
    return saveToFile(fileName);
}

bool ConfigPanel::saveToFile(const QString& filePath) {
    if (!validate()) {
        QMessageBox::warning(this, "Validation Error",
            "Cannot save invalid configuration. Please fix validation errors.");
        return false;
    }
    
    QString error;
    if (!m_config.saveToFile(filePath, &error)) {
        QMessageBox::critical(this, "Save Error",
            QString("Failed to save configuration:\n%1").arg(error));
        return false;
    }
    
    setDirty(false);
    QMessageBox::information(this, "Success",
        QString("Configuration saved to:\n%1").arg(filePath));
    return true;
}

void ConfigPanel::reset() {
    setConfiguration(Configuration());  // Default configuration
}

bool ConfigPanel::apply() {
    if (!validate()) {
        return false;
    }
    
    m_originalConfig = m_config;
    setDirty(false);
    emit configurationChanged(m_config);
    return true;
}

void ConfigPanel::onFieldChanged() {
    setDirty(true);
    validate();  // Live validation
}

void ConfigPanel::onLoadClicked() {
    loadFromFile();
}

void ConfigPanel::onSaveClicked() {
    saveToFile();
}

void ConfigPanel::onResetClicked() {
    if (m_isDirty) {
        auto reply = QMessageBox::question(this, "Reset Configuration",
            "Discard unsaved changes and reset to defaults?",
            QMessageBox::Yes | QMessageBox::No);
        
        if (reply != QMessageBox::Yes) {
            return;
        }
    }
    
    reset();
}

void ConfigPanel::onApplyClicked() {
    apply();
}

void ConfigPanel::createUI() {
    // Main layout with scroll area
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    
    QScrollArea* scrollArea = new QScrollArea();
    scrollArea->setWidgetResizable(true);
    scrollArea->setFrameShape(QFrame::NoFrame);
    
    QWidget* scrollWidget = new QWidget();
    QVBoxLayout* scrollLayout = new QVBoxLayout(scrollWidget);
    
    // Create form layout
    QFormLayout* formLayout = new QFormLayout();
    formLayout->setFieldGrowthPolicy(QFormLayout::ExpandingFieldsGrow);
    
    // Simulation section
    addSectionHeader(formLayout, "Simulation");
    m_stepsPerTickSpin = new QSpinBox();
    m_stepsPerTickSpin->setRange(1, 10000);
    formLayout->addRow("Steps per Tick:", m_stepsPerTickSpin);
    
    m_gridWidthSpin = new QSpinBox();
    m_gridWidthSpin->setRange(10, 10000);
    formLayout->addRow("Grid Width:", m_gridWidthSpin);
    
    m_gridHeightSpin = new QSpinBox();
    m_gridHeightSpin->setRange(10, 10000);
    formLayout->addRow("Grid Height:", m_gridHeightSpin);
    
    // Agents section
    addSectionHeader(formLayout, "Agents");
    m_initialCountSpin = new QSpinBox();
    m_initialCountSpin->setRange(1, 1000000);
    formLayout->addRow("Initial Count:", m_initialCountSpin);
    
    m_initialInfectedRateSpin = new QDoubleSpinBox();
    m_initialInfectedRateSpin->setRange(0.0, 1.0);
    m_initialInfectedRateSpin->setSingleStep(0.01);
    m_initialInfectedRateSpin->setDecimals(3);
    formLayout->addRow("Initial Infected Rate:", m_initialInfectedRateSpin);
    
    m_moveProbabilitySpin = new QDoubleSpinBox();
    m_moveProbabilitySpin->setRange(0.0, 1.0);
    m_moveProbabilitySpin->setSingleStep(0.01);
    m_moveProbabilitySpin->setDecimals(3);
    formLayout->addRow("Move Probability:", m_moveProbabilitySpin);
    
    m_interactionRadiusSpin = new QDoubleSpinBox();
    m_interactionRadiusSpin->setRange(0.0, 100.0);
    m_interactionRadiusSpin->setSingleStep(0.1);
    m_interactionRadiusSpin->setDecimals(2);
    formLayout->addRow("Interaction Radius:", m_interactionRadiusSpin);
    
    // Disease section
    addSectionHeader(formLayout, "Disease");
    m_transmissionRateSpin = new QDoubleSpinBox();
    m_transmissionRateSpin->setRange(0.0, 1.0);
    m_transmissionRateSpin->setSingleStep(0.01);
    m_transmissionRateSpin->setDecimals(3);
    formLayout->addRow("Transmission Rate:", m_transmissionRateSpin);
    
    m_recoveryRateSpin = new QDoubleSpinBox();
    m_recoveryRateSpin->setRange(0.0, 1.0);
    m_recoveryRateSpin->setSingleStep(0.01);
    m_recoveryRateSpin->setDecimals(3);
    formLayout->addRow("Recovery Rate:", m_recoveryRateSpin);
    
    m_mortalityRateSpin = new QDoubleSpinBox();
    m_mortalityRateSpin->setRange(0.0, 1.0);
    m_mortalityRateSpin->setSingleStep(0.01);
    m_mortalityRateSpin->setDecimals(3);
    formLayout->addRow("Mortality Rate:", m_mortalityRateSpin);
    
    m_incubationStepsSpin = new QSpinBox();
    m_incubationStepsSpin->setRange(0, 10000);
    formLayout->addRow("Incubation Steps:", m_incubationStepsSpin);
    
    // Environment section
    addSectionHeader(formLayout, "Environment");
    m_resourceRegenerationSpin = new QDoubleSpinBox();
    m_resourceRegenerationSpin->setRange(0.0, 1.0);
    m_resourceRegenerationSpin->setSingleStep(0.01);
    m_resourceRegenerationSpin->setDecimals(3);
    formLayout->addRow("Resource Regeneration:", m_resourceRegenerationSpin);
    
    m_carryingCapacitySpin = new QDoubleSpinBox();
    m_carryingCapacitySpin->setRange(0.0, 1000000.0);
    m_carryingCapacitySpin->setSingleStep(100.0);
    m_carryingCapacitySpin->setDecimals(0);
    formLayout->addRow("Carrying Capacity:", m_carryingCapacitySpin);
    
    // RNG section
    addSectionHeader(formLayout, "Random Number Generator");
    m_seedSpin = new QSpinBox();
    m_seedSpin->setRange(0, 2147483647);
    formLayout->addRow("Seed:", m_seedSpin);
    
    m_algorithmEdit = new QLineEdit();
    formLayout->addRow("Algorithm:", m_algorithmEdit);
    
    scrollLayout->addLayout(formLayout);
    
    // Validation label
    m_validationLabel = new QLabel();
    m_validationLabel->setWordWrap(true);
    m_validationLabel->setTextFormat(Qt::RichText);
    scrollLayout->addWidget(m_validationLabel);
    
    scrollLayout->addStretch();
    scrollArea->setWidget(scrollWidget);
    mainLayout->addWidget(scrollArea);
    
    // Button bar
    QHBoxLayout* buttonLayout = new QHBoxLayout();
    m_loadButton = new QPushButton("Load...");
    m_saveButton = new QPushButton("Save...");
    m_resetButton = new QPushButton("Reset");
    m_applyButton = new QPushButton("Apply");
    m_applyButton->setDefault(true);
    
    buttonLayout->addWidget(m_loadButton);
    buttonLayout->addWidget(m_saveButton);
    buttonLayout->addStretch();
    buttonLayout->addWidget(m_resetButton);
    buttonLayout->addWidget(m_applyButton);
    
    mainLayout->addLayout(buttonLayout);
    
    // Connect all field change signals
    connect(m_stepsPerTickSpin, QOverload<int>::of(&QSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_gridWidthSpin, QOverload<int>::of(&QSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_gridHeightSpin, QOverload<int>::of(&QSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_initialCountSpin, QOverload<int>::of(&QSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_initialInfectedRateSpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_moveProbabilitySpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_interactionRadiusSpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_transmissionRateSpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_recoveryRateSpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_mortalityRateSpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_incubationStepsSpin, QOverload<int>::of(&QSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_resourceRegenerationSpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_carryingCapacitySpin, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_seedSpin, QOverload<int>::of(&QSpinBox::valueChanged),
            this, &ConfigPanel::onFieldChanged);
    connect(m_algorithmEdit, &QLineEdit::textChanged,
            this, &ConfigPanel::onFieldChanged);
    
    // Connect button signals
    connect(m_loadButton, &QPushButton::clicked, this, &ConfigPanel::onLoadClicked);
    connect(m_saveButton, &QPushButton::clicked, this, &ConfigPanel::onSaveClicked);
    connect(m_resetButton, &QPushButton::clicked, this, &ConfigPanel::onResetClicked);
    connect(m_applyButton, &QPushButton::clicked, this, &ConfigPanel::onApplyClicked);
}

void ConfigPanel::updateUI() {
    // Block signals during update to prevent onFieldChanged
    bool oldState = blockSignals(true);
    
    // Simulation - use available fields
    m_stepsPerTickSpin->setValue(m_config.simulation.maxSteps); // Mapped to maxSteps
    m_gridWidthSpin->setValue(static_cast<int>(m_config.simulation.worldSize));
    m_gridHeightSpin->setValue(static_cast<int>(m_config.simulation.worldSize));
    
    // Agents - use available fields
    m_initialCountSpin->setValue(m_config.agents.initialPopulation);
    m_initialInfectedRateSpin->setValue(0.1); // Default, not in struct
    m_moveProbabilitySpin->setValue(m_config.agents.movementSpeed.max);
    m_interactionRadiusSpin->setValue(5.0); // Default, not in struct
    
    // Disease
    m_transmissionRateSpin->setValue(m_config.disease.transmissionRate);
    m_recoveryRateSpin->setValue(m_config.disease.recoveryRate);
    m_mortalityRateSpin->setValue(m_config.disease.mortalityRate);
    m_incubationStepsSpin->setValue(10); // Default, not in struct
    
    // Environment
    m_resourceRegenerationSpin->setValue(m_config.environment.resourceDensity);
    m_carryingCapacitySpin->setValue(1000); // Default, not in struct
    
    // RNG
    m_seedSpin->setValue(m_config.rng.seed);
    m_algorithmEdit->setText("xoshiro256**"); // Default, not in struct
    
    blockSignals(oldState);
    
    validate();
}

void ConfigPanel::updateConfiguration() {
    // Simulation - map to available fields
    m_config.simulation.maxSteps = m_stepsPerTickSpin->value();
    m_config.simulation.worldSize = m_gridWidthSpin->value();
    
    // Agents - map to available fields
    m_config.agents.initialPopulation = m_initialCountSpin->value();
    m_config.agents.movementSpeed.max = m_moveProbabilitySpin->value();
    m_config.agents.movementSpeed.min = m_moveProbabilitySpin->value() * 0.5;
    
    // Disease
    m_config.disease.transmissionRate = m_transmissionRateSpin->value();
    m_config.disease.recoveryRate = m_recoveryRateSpin->value();
    m_config.disease.mortalityRate = m_mortalityRateSpin->value();
    
    // Environment
    m_config.environment.resourceDensity = m_resourceRegenerationSpin->value();
    
    // RNG
    m_config.rng.seed = m_seedSpin->value();
}

void ConfigPanel::setDirty(bool dirty) {
    if (m_isDirty != dirty) {
        m_isDirty = dirty;
        emit dirtyStateChanged(dirty);
    }
}

void ConfigPanel::addSectionHeader(QFormLayout* layout, const QString& title) {
    QLabel* header = new QLabel(QString("<b>%1</b>").arg(title));
    header->setStyleSheet("QLabel { margin-top: 10px; margin-bottom: 5px; }");
    layout->addRow(header);
}
