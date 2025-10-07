#include "Configuration.h"
#include "../utils/ValidationUtils.h"
#include <QFile>
#include <QJsonDocument>
#include <QJsonParseError>
#include <QDebug>

Configuration::Configuration() {
    reset();
}

Configuration Configuration::defaults() {
    return Configuration();
}

void Configuration::reset() {
    simulation = SimulationConfig();
    agents = AgentsConfig();
    disease = DiseaseConfig();
    environment = EnvironmentConfig();
    rng = RngConfig();
}

bool Configuration::validate(QStringList* errors) const {
    QStringList localErrors;
    bool valid = true;
    
    // Simulation validation
    if (!ValidationUtils::validatePositive(simulation.maxSteps, "Max Steps")) {
        localErrors << "Max Steps must be positive";
        valid = false;
    }
    
    if (!ValidationUtils::validatePositive(simulation.worldSize, "World Size")) {
        localErrors << "World Size must be positive";
        valid = false;
    }
    
    // Agents validation
    if (!ValidationUtils::validatePositive(agents.initialPopulation, "Initial Population")) {
        localErrors << "Initial Population must be positive";
        valid = false;
    }
    
    if (!agents.movementSpeed.isValid()) {
        localErrors << "Movement Speed: min must be <= max";
        valid = false;
    }
    
    if (!ValidationUtils::validatePositive(agents.movementSpeed.min, "Movement Speed Min")) {
        localErrors << "Movement Speed Min must be positive";
        valid = false;
    }
    
    if (!agents.energyRange.isValid()) {
        localErrors << "Energy Range: min must be <= max";
        valid = false;
    }
    
    if (!ValidationUtils::validatePositive(agents.energyRange.min, "Energy Range Min")) {
        localErrors << "Energy Range Min must be positive";
        valid = false;
    }
    
    // Disease validation
    if (disease.enabled) {
        if (!ValidationUtils::validateRate(disease.transmissionRate, "Transmission Rate")) {
            localErrors << "Transmission Rate must be between 0 and 1";
            valid = false;
        }
        
        if (!ValidationUtils::validateRate(disease.recoveryRate, "Recovery Rate")) {
            localErrors << "Recovery Rate must be between 0 and 1";
            valid = false;
        }
        
        if (!ValidationUtils::validateRate(disease.mortalityRate, "Mortality Rate")) {
            localErrors << "Mortality Rate must be between 0 and 1";
            valid = false;
        }
    }
    
    // Environment validation
    if (!ValidationUtils::validatePositive(environment.resourceDensity, "Resource Density")) {
        localErrors << "Resource Density must be positive";
        valid = false;
    }
    
    if (errors) {
        *errors = localErrors;
    }
    
    return valid;
}

QJsonObject Configuration::toJson() const {
    QJsonObject root;
    
    // Simulation section
    QJsonObject sim;
    sim["maxSteps"] = simulation.maxSteps;
    sim["worldSize"] = simulation.worldSize;
    root["simulation"] = sim;
    
    // Agents section
    QJsonObject agts;
    agts["initialPopulation"] = agents.initialPopulation;
    
    QJsonObject moveSpeed;
    moveSpeed["min"] = agents.movementSpeed.min;
    moveSpeed["max"] = agents.movementSpeed.max;
    agts["movementSpeed"] = moveSpeed;
    
    QJsonObject energy;
    energy["min"] = agents.energyRange.min;
    energy["max"] = agents.energyRange.max;
    agts["energyRange"] = energy;
    
    agts["reproductionEnabled"] = agents.reproductionEnabled;
    root["agents"] = agts;
    
    // Disease section
    QJsonObject dis;
    dis["enabled"] = disease.enabled;
    dis["transmissionRate"] = disease.transmissionRate;
    dis["recoveryRate"] = disease.recoveryRate;
    dis["mortalityRate"] = disease.mortalityRate;
    root["disease"] = dis;
    
    // Environment section
    QJsonObject env;
    env["resourceRegeneration"] = environment.resourceRegeneration;
    env["resourceDensity"] = environment.resourceDensity;
    root["environment"] = env;
    
    // RNG section
    QJsonObject rngObj;
    rngObj["seed"] = rng.seed;
    rngObj["independentStreams"] = rng.independentStreams;
    root["rng"] = rngObj;
    
    return root;
}

bool Configuration::fromJson(const QJsonObject& json, QStringList* errors) {
    QStringList localErrors;
    bool success = true;
    
    // Parse each section
    if (json.contains("simulation")) {
        if (!parseSimulation(json["simulation"].toObject(), &localErrors)) {
            success = false;
        }
    }
    
    if (json.contains("agents")) {
        if (!parseAgents(json["agents"].toObject(), &localErrors)) {
            success = false;
        }
    }
    
    if (json.contains("disease")) {
        if (!parseDisease(json["disease"].toObject(), &localErrors)) {
            success = false;
        }
    }
    
    if (json.contains("environment")) {
        if (!parseEnvironment(json["environment"].toObject(), &localErrors)) {
            success = false;
        }
    }
    
    if (json.contains("rng")) {
        if (!parseRng(json["rng"].toObject(), &localErrors)) {
            success = false;
        }
    }
    
    if (errors) {
        *errors = localErrors;
    }
    
    return success;
}

bool Configuration::loadFromFile(const QString& filePath, QStringList* errors) {
    QFile file(filePath);
    if (!file.open(QIODevice::ReadOnly)) {
        if (errors) {
            *errors << QString("Failed to open file: %1").arg(file.errorString());
        }
        return false;
    }
    
    QByteArray data = file.readAll();
    file.close();
    
    QJsonParseError parseError;
    QJsonDocument doc = QJsonDocument::fromJson(data, &parseError);
    
    if (parseError.error != QJsonParseError::NoError) {
        if (errors) {
            *errors << QString("JSON parse error: %1").arg(parseError.errorString());
        }
        return false;
    }
    
    if (!doc.isObject()) {
        if (errors) {
            *errors << "JSON root must be an object";
        }
        return false;
    }
    
    return fromJson(doc.object(), errors);
}

bool Configuration::saveToFile(const QString& filePath, QString* error) const {
    QJsonDocument doc(toJson());
    QByteArray data = doc.toJson(QJsonDocument::Indented);
    
    QFile file(filePath);
    if (!file.open(QIODevice::WriteOnly)) {
        if (error) {
            *error = QString("Failed to open file: %1").arg(file.errorString());
        }
        return false;
    }
    
    qint64 written = file.write(data);
    file.close();
    
    if (written != data.size()) {
        if (error) {
            *error = "Failed to write complete data to file";
        }
        return false;
    }
    
    return true;
}

bool Configuration::operator==(const Configuration& other) const {
    return simulation.maxSteps == other.simulation.maxSteps &&
           qFuzzyCompare(simulation.worldSize, other.simulation.worldSize) &&
           agents.initialPopulation == other.agents.initialPopulation &&
           qFuzzyCompare(agents.movementSpeed.min, other.agents.movementSpeed.min) &&
           qFuzzyCompare(agents.movementSpeed.max, other.agents.movementSpeed.max) &&
           qFuzzyCompare(agents.energyRange.min, other.agents.energyRange.min) &&
           qFuzzyCompare(agents.energyRange.max, other.agents.energyRange.max) &&
           agents.reproductionEnabled == other.agents.reproductionEnabled &&
           disease.enabled == other.disease.enabled &&
           qFuzzyCompare(disease.transmissionRate, other.disease.transmissionRate) &&
           qFuzzyCompare(disease.recoveryRate, other.disease.recoveryRate) &&
           qFuzzyCompare(disease.mortalityRate, other.disease.mortalityRate) &&
           environment.resourceRegeneration == other.environment.resourceRegeneration &&
           qFuzzyCompare(environment.resourceDensity, other.environment.resourceDensity) &&
           rng.seed == other.rng.seed &&
           rng.independentStreams == other.rng.independentStreams;
}

bool Configuration::parseSimulation(const QJsonObject& json, QStringList* errors) {
    bool success = true;
    
    if (json.contains("maxSteps")) {
        simulation.maxSteps = json["maxSteps"].toInt();
    }
    
    if (json.contains("worldSize")) {
        simulation.worldSize = json["worldSize"].toDouble();
    }
    
    return success;
}

bool Configuration::parseAgents(const QJsonObject& json, QStringList* errors) {
    bool success = true;
    
    if (json.contains("initialPopulation")) {
        agents.initialPopulation = json["initialPopulation"].toInt();
    }
    
    if (json.contains("movementSpeed")) {
        QJsonObject range = json["movementSpeed"].toObject();
        if (range.contains("min")) agents.movementSpeed.min = range["min"].toDouble();
        if (range.contains("max")) agents.movementSpeed.max = range["max"].toDouble();
    }
    
    if (json.contains("energyRange")) {
        QJsonObject range = json["energyRange"].toObject();
        if (range.contains("min")) agents.energyRange.min = range["min"].toDouble();
        if (range.contains("max")) agents.energyRange.max = range["max"].toDouble();
    }
    
    if (json.contains("reproductionEnabled")) {
        agents.reproductionEnabled = json["reproductionEnabled"].toBool();
    }
    
    return success;
}

bool Configuration::parseDisease(const QJsonObject& json, QStringList* errors) {
    bool success = true;
    
    if (json.contains("enabled")) {
        disease.enabled = json["enabled"].toBool();
    }
    
    if (json.contains("transmissionRate")) {
        disease.transmissionRate = json["transmissionRate"].toDouble();
    }
    
    if (json.contains("recoveryRate")) {
        disease.recoveryRate = json["recoveryRate"].toDouble();
    }
    
    if (json.contains("mortalityRate")) {
        disease.mortalityRate = json["mortalityRate"].toDouble();
    }
    
    return success;
}

bool Configuration::parseEnvironment(const QJsonObject& json, QStringList* errors) {
    bool success = true;
    
    if (json.contains("resourceRegeneration")) {
        environment.resourceRegeneration = json["resourceRegeneration"].toBool();
    }
    
    if (json.contains("resourceDensity")) {
        environment.resourceDensity = json["resourceDensity"].toDouble();
    }
    
    return success;
}

bool Configuration::parseRng(const QJsonObject& json, QStringList* errors) {
    bool success = true;
    
    if (json.contains("seed")) {
        rng.seed = json["seed"].toInt();
    }
    
    if (json.contains("independentStreams")) {
        rng.independentStreams = json["independentStreams"].toBool();
    }
    
    return success;
}
