#pragma once

#include <QJsonObject>
#include <QString>
#include <QStringList>

/**
 * @brief Range structure for min/max values
 */
template<typename T>
struct Range {
    T min;
    T max;
    
    Range() : min(T()), max(T()) {}
    Range(T minVal, T maxVal) : min(minVal), max(maxVal) {}
    
    bool isValid() const { return min <= max; }
};

/**
 * @brief Simulation configuration section
 */
struct SimulationConfig {
    int maxSteps;
    double worldSize;
    
    SimulationConfig() : maxSteps(10000), worldSize(100.0) {}
};

/**
 * @brief Agent configuration section
 */
struct AgentsConfig {
    int initialPopulation;
    Range<double> movementSpeed;
    Range<double> energyRange;
    bool reproductionEnabled;
    
    AgentsConfig()
        : initialPopulation(100)
        , movementSpeed(0.5, 2.0)
        , energyRange(50.0, 100.0)
        , reproductionEnabled(true) {}
};

/**
 * @brief Disease configuration section
 */
struct DiseaseConfig {
    bool enabled;
    double transmissionRate;
    double recoveryRate;
    double mortalityRate;
    
    DiseaseConfig()
        : enabled(true)
        , transmissionRate(0.3)
        , recoveryRate(0.1)
        , mortalityRate(0.05) {}
};

/**
 * @brief Environment configuration section
 */
struct EnvironmentConfig {
    bool resourceRegeneration;
    double resourceDensity;
    
    EnvironmentConfig()
        : resourceRegeneration(true)
        , resourceDensity(1.0) {}
};

/**
 * @brief RNG configuration section
 */
struct RngConfig {
    int seed;
    bool independentStreams;
    
    RngConfig()
        : seed(42)
        , independentStreams(true) {}
};

/**
 * @brief Complete engine configuration matching EngineConfigV1 schema
 * 
 * This class encapsulates all configuration parameters for the EcoSysX engine.
 * It provides validation, JSON serialization/deserialization, and default values.
 * 
 * Usage:
 * @code
 * Configuration config = Configuration::defaults();
 * config.agents.initialPopulation = 200;
 * 
 * if (config.validate()) {
 *     QJsonObject json = config.toJson();
 *     // Send to engine...
 * }
 * @endcode
 */
class Configuration {
public:
    SimulationConfig simulation;
    AgentsConfig agents;
    DiseaseConfig disease;
    EnvironmentConfig environment;
    RngConfig rng;
    
    /**
     * @brief Construct with default values
     */
    Configuration();
    
    /**
     * @brief Create a configuration with default values
     * @return Configuration with defaults
     */
    static Configuration defaults();
    
    /**
     * @brief Validate the configuration
     * @param errors Output list of validation errors (optional)
     * @return true if configuration is valid
     */
    bool validate(QStringList* errors = nullptr) const;
    
    /**
     * @brief Convert configuration to JSON
     * @return JSON object matching EngineConfigV1 schema
     */
    QJsonObject toJson() const;
    
    /**
     * @brief Load configuration from JSON
     * @param json JSON object to parse
     * @param errors Output list of parsing errors (optional)
     * @return true if JSON was parsed successfully
     */
    bool fromJson(const QJsonObject& json, QStringList* errors = nullptr);
    
    /**
     * @brief Load configuration from JSON file
     * @param filePath Path to JSON file
     * @param errors Output list of errors (optional)
     * @return true if file was loaded successfully
     */
    bool loadFromFile(const QString& filePath, QStringList* errors = nullptr);
    
    /**
     * @brief Save configuration to JSON file
     * @param filePath Path to save to
     * @param error Output error message (optional)
     * @return true if saved successfully
     */
    bool saveToFile(const QString& filePath, QString* error = nullptr) const;
    
    /**
     * @brief Reset to default values
     */
    void reset();
    
    /**
     * @brief Compare configurations
     * @param other Configuration to compare with
     * @return true if configurations are equal
     */
    bool operator==(const Configuration& other) const;
    bool operator!=(const Configuration& other) const { return !(*this == other); }

private:
    /**
     * @brief Parse simulation section from JSON
     */
    bool parseSimulation(const QJsonObject& json, QStringList* errors);
    
    /**
     * @brief Parse agents section from JSON
     */
    bool parseAgents(const QJsonObject& json, QStringList* errors);
    
    /**
     * @brief Parse disease section from JSON
     */
    bool parseDisease(const QJsonObject& json, QStringList* errors);
    
    /**
     * @brief Parse environment section from JSON
     */
    bool parseEnvironment(const QJsonObject& json, QStringList* errors);
    
    /**
     * @brief Parse RNG section from JSON
     */
    bool parseRng(const QJsonObject& json, QStringList* errors);
};
