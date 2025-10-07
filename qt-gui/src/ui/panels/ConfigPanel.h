#pragma once

#include <QWidget>
#include "../../core/Configuration.h"

class QLineEdit;
class QSpinBox;
class QDoubleSpinBox;
class QCheckBox;
class QPushButton;
class QLabel;
class QFormLayout;

/**
 * @brief The ConfigPanel provides a form UI for editing EngineConfigV1
 * 
 * This panel displays all configuration sections (simulation, agents, disease,
 * environment, RNG) with appropriate input widgets and inline validation.
 * 
 * Features:
 * - Form fields for all Configuration properties
 * - Inline validation with visual feedback
 * - Load/Save/Reset functionality
 * - Dirty state tracking
 * - Validation error display
 * 
 * Usage:
 * @code
 * ConfigPanel* panel = new ConfigPanel();
 * panel->setConfiguration(config);
 * connect(panel, &ConfigPanel::configurationChanged, this, &MainWindow::onConfigChanged);
 * @endcode
 */
class ConfigPanel : public QWidget {
    Q_OBJECT

public:
    /**
     * @brief Construct a ConfigPanel
     * @param parent Parent widget
     */
    explicit ConfigPanel(QWidget* parent = nullptr);
    
    /**
     * @brief Get the current configuration
     * @return Current configuration state
     */
    Configuration configuration() const;
    
    /**
     * @brief Set the configuration and update UI
     * @param config Configuration to display
     */
    void setConfiguration(const Configuration& config);
    
    /**
     * @brief Check if configuration has been modified
     * @return true if configuration differs from last setConfiguration() call
     */
    bool isDirty() const { return m_isDirty; }
    
    /**
     * @brief Validate current form values
     * @param errors Output parameter for validation error messages
     * @return true if valid
     */
    bool validate(QStringList* errors = nullptr);

public slots:
    /**
     * @brief Load configuration from file with dialog
     * @return true if loaded successfully
     */
    bool loadFromFile();
    
    /**
     * @brief Load configuration from specified file
     * @param filePath Path to JSON config file
     * @return true if loaded successfully
     */
    bool loadFromFile(const QString& filePath);
    
    /**
     * @brief Save configuration to file with dialog
     * @return true if saved successfully
     */
    bool saveToFile();
    
    /**
     * @brief Save configuration to specified file
     * @param filePath Path to save JSON config file
     * @return true if saved successfully
     */
    bool saveToFile(const QString& filePath);
    
    /**
     * @brief Reset to default configuration
     */
    void reset();
    
    /**
     * @brief Apply current form values (validates and emits configurationChanged)
     * @return true if valid and applied
     */
    bool apply();

signals:
    /**
     * @brief Emitted when configuration is changed and validated
     * @param config New configuration
     */
    void configurationChanged(const Configuration& config);
    
    /**
     * @brief Emitted when dirty state changes
     * @param dirty true if modified
     */
    void dirtyStateChanged(bool dirty);
    
    /**
     * @brief Emitted when validation state changes
     * @param valid true if current values are valid
     */
    void validationStateChanged(bool valid);

private slots:
    /**
     * @brief Handle any form field change
     */
    void onFieldChanged();
    
    /**
     * @brief Handle load button click
     */
    void onLoadClicked();
    
    /**
     * @brief Handle save button click
     */
    void onSaveClicked();
    
    /**
     * @brief Handle reset button click
     */
    void onResetClicked();
    
    /**
     * @brief Handle apply button click
     */
    void onApplyClicked();

private:
    /**
     * @brief Create the UI layout
     */
    void createUI();
    
    /**
     * @brief Update form fields from configuration
     */
    void updateUI();
    
    /**
     * @brief Update configuration from form fields
     */
    void updateConfiguration();
    
    /**
     * @brief Set dirty flag and emit signal if changed
     * @param dirty New dirty state
     */
    void setDirty(bool dirty);
    
    /**
     * @brief Add a section header to the form
     * @param layout Form layout
     * @param title Section title
     */
    void addSectionHeader(QFormLayout* layout, const QString& title);

private:
    // Configuration state
    Configuration m_config;
    Configuration m_originalConfig;
    bool m_isDirty;
    
    // Simulation section
    QSpinBox* m_stepsPerTickSpin;
    QSpinBox* m_gridWidthSpin;
    QSpinBox* m_gridHeightSpin;
    
    // Agents section
    QSpinBox* m_initialCountSpin;
    QDoubleSpinBox* m_initialInfectedRateSpin;
    QDoubleSpinBox* m_moveProbabilitySpin;
    QDoubleSpinBox* m_interactionRadiusSpin;
    
    // Disease section
    QDoubleSpinBox* m_transmissionRateSpin;
    QDoubleSpinBox* m_recoveryRateSpin;
    QDoubleSpinBox* m_mortalityRateSpin;
    QSpinBox* m_incubationStepsSpin;
    
    // Environment section
    QDoubleSpinBox* m_resourceRegenerationSpin;
    QDoubleSpinBox* m_carryingCapacitySpin;
    
    // RNG section
    QSpinBox* m_seedSpin;
    QLineEdit* m_algorithmEdit;
    
    // Buttons
    QPushButton* m_loadButton;
    QPushButton* m_saveButton;
    QPushButton* m_resetButton;
    QPushButton* m_applyButton;
    
    // Validation feedback
    QLabel* m_validationLabel;
};
