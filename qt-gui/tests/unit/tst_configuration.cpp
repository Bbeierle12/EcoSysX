#include <QtTest/QtTest>
#include "../src/core/Configuration.h"
#include <QJsonDocument>
#include <QTemporaryFile>

/**
 * @brief Unit tests for Configuration
 */
class TestConfiguration : public QObject {
    Q_OBJECT
    
private slots:
    /**
     * Test default configuration values
     */
    void testDefaults() {
        Configuration config;
        
        // Simulation defaults
        QCOMPARE(config.simulation.maxSteps, 10000);
        QCOMPARE(config.simulation.worldSize, 100.0);
        
        // Agents defaults
        QCOMPARE(config.agents.initialPopulation, 100);
        QCOMPARE(config.agents.movementSpeed.min, 0.5);
        QCOMPARE(config.agents.movementSpeed.max, 2.0);
        QCOMPARE(config.agents.energyRange.min, 50.0);
        QCOMPARE(config.agents.energyRange.max, 100.0);
        QVERIFY(config.agents.reproductionEnabled);
        
        // Disease defaults
        QVERIFY(config.disease.enabled);
        QCOMPARE(config.disease.transmissionRate, 0.3);
        QCOMPARE(config.disease.recoveryRate, 0.1);
        QCOMPARE(config.disease.mortalityRate, 0.05);
        
        // Environment defaults
        QVERIFY(config.environment.resourceRegeneration);
        QCOMPARE(config.environment.resourceDensity, 1.0);
        
        // RNG defaults
        QCOMPARE(config.rng.seed, 42);
        QVERIFY(config.rng.independentStreams);
    }
    
    /**
     * Test JSON serialization
     */
    void testToJson() {
        Configuration config;
        config.simulation.maxSteps = 5000;
        config.agents.initialPopulation = 200;
        
        QJsonObject json = config.toJson();
        
        QVERIFY(json.contains("simulation"));
        QVERIFY(json.contains("agents"));
        QVERIFY(json.contains("disease"));
        QVERIFY(json.contains("environment"));
        QVERIFY(json.contains("rng"));
        
        QJsonObject sim = json["simulation"].toObject();
        QCOMPARE(sim["maxSteps"].toInt(), 5000);
        
        QJsonObject agents = json["agents"].toObject();
        QCOMPARE(agents["initialPopulation"].toInt(), 200);
    }
    
    /**
     * Test JSON deserialization
     */
    void testFromJson() {
        QJsonObject json;
        
        QJsonObject sim;
        sim["maxSteps"] = 15000;
        sim["worldSize"] = 200.0;
        json["simulation"] = sim;
        
        QJsonObject agents;
        agents["initialPopulation"] = 500;
        QJsonObject movementSpeed;
        movementSpeed["min"] = 0.3;
        movementSpeed["max"] = 3.0;
        agents["movementSpeed"] = movementSpeed;
        QJsonObject energyRange;
        energyRange["min"] = 30.0;
        energyRange["max"] = 150.0;
        agents["energyRange"] = energyRange;
        agents["reproductionEnabled"] = false;
        json["agents"] = agents;
        
        QJsonObject disease;
        disease["enabled"] = true;
        disease["transmissionRate"] = 0.4;
        disease["recoveryRate"] = 0.15;
        disease["mortalityRate"] = 0.02;
        json["disease"] = disease;
        
        QJsonObject env;
        env["resourceRegeneration"] = true;
        env["resourceDensity"] = 2.0;
        json["environment"] = env;
        
        QJsonObject rng;
        rng["seed"] = 12345;
        rng["independentStreams"] = false;
        json["rng"] = rng;
        
        Configuration config;
        config.fromJson(json);
        
        QCOMPARE(config.simulation.maxSteps, 15000);
        QCOMPARE(config.simulation.worldSize, 200.0);
        QCOMPARE(config.agents.initialPopulation, 500);
        QCOMPARE(config.agents.movementSpeed.min, 0.3);
        QCOMPARE(config.agents.movementSpeed.max, 3.0);
        QVERIFY(!config.agents.reproductionEnabled);
        QCOMPARE(config.disease.transmissionRate, 0.4);
        QCOMPARE(config.environment.resourceDensity, 2.0);
        QCOMPARE(config.rng.seed, 12345);
        QVERIFY(!config.rng.independentStreams);
    }
    
    /**
     * Test roundtrip serialization
     */
    void testRoundtrip() {
        Configuration original;
        original.simulation.maxSteps = 20000;
        original.agents.initialPopulation = 300;
        original.disease.transmissionRate = 0.5;
        
        QJsonObject json = original.toJson();
        
        Configuration restored;
        restored.fromJson(json);
        
        QCOMPARE(restored.simulation.maxSteps, original.simulation.maxSteps);
        QCOMPARE(restored.agents.initialPopulation, original.agents.initialPopulation);
        QCOMPARE(restored.disease.transmissionRate, original.disease.transmissionRate);
    }
    
    /**
     * Test validation - valid configuration
     */
    void testValidationSuccess() {
        Configuration config;
        
        QStringList errors;
        bool valid = config.validate(&errors);
        
        QVERIFY(valid);
        QVERIFY(errors.isEmpty());
    }
    
    /**
     * Test validation - invalid values
     */
    void testValidationFailures() {
        Configuration config;
        
        // Invalid simulation
        config.simulation.maxSteps = 0;
        config.simulation.worldSize = -100.0;
        
        QStringList errors;
        bool valid = config.validate(&errors);
        
        QVERIFY(!valid);
        QVERIFY(errors.size() >= 2);
        QVERIFY(errors.join(" ").contains("Max Steps"));
        QVERIFY(errors.join(" ").contains("World Size"));
    }
    
    /**
     * Test validation - rate constraints
     */
    void testValidationRates() {
        Configuration config;
        
        // Invalid rates (outside 0-1 range)
        config.disease.transmissionRate = -0.1;
        config.disease.recoveryRate = 2.0;
        config.disease.mortalityRate = 1.5;
        
        QStringList errors;
        bool valid = config.validate(&errors);
        
        QVERIFY(!valid);
        QVERIFY(errors.size() >= 3);
    }
    
    /**
     * Test file I/O - save and load
     */
    void testFileIO() {
        Configuration original;
        original.simulation.maxSteps = 25000;
        original.agents.initialPopulation = 400;
        original.disease.mortalityRate = 0.05;
        
        QTemporaryFile tempFile;
        QVERIFY(tempFile.open());
        QString filePath = tempFile.fileName();
        tempFile.close();
        
        // Save
        QString saveError;
        bool saved = original.saveToFile(filePath, &saveError);
        QVERIFY2(saved, qPrintable(saveError));
        
        // Load
        Configuration loaded;
        QStringList loadErrors;
        bool loadSucceeded = loaded.loadFromFile(filePath, &loadErrors);
        QVERIFY2(loadSucceeded, qPrintable(loadErrors.join("; ")));
        
        // Verify
        QCOMPARE(loaded.simulation.maxSteps, original.simulation.maxSteps);
        QCOMPARE(loaded.agents.initialPopulation, original.agents.initialPopulation);
        QCOMPARE(loaded.disease.mortalityRate, original.disease.mortalityRate);
    }
    
    /**
     * Test file load error handling
     */
    void testFileLoadErrors() {
        Configuration config;
        QStringList errors;
        
        // Non-existent file
        bool loaded = config.loadFromFile("/nonexistent/path/config.json", &errors);
        QVERIFY(!loaded);
        QVERIFY(!errors.isEmpty());
    }
    
    /**
     * Test invalid JSON handling
     */
    void testInvalidJson() {
        QTemporaryFile tempFile;
        QVERIFY(tempFile.open());
        tempFile.write("{ invalid json content }");
        tempFile.close();
        
        Configuration config;
        QStringList errors;
        bool loaded = config.loadFromFile(tempFile.fileName(), &errors);
        
        QVERIFY(!loaded);
        QVERIFY(!errors.isEmpty());
    }
    
    /**
     * Test partial JSON (missing fields use defaults)
     */
    void testPartialJson() {
        QJsonObject json;
        
        QJsonObject sim;
        sim["maxSteps"] = 30000;
        // Missing worldSize
        json["simulation"] = sim;
        
        // Missing other sections entirely
        
        Configuration config;
        config.fromJson(json);
        
        // Should use custom value
        QCOMPARE(config.simulation.maxSteps, 30000);
        
        // Should use defaults
        QCOMPARE(config.simulation.worldSize, 100.0);
        QCOMPARE(config.agents.initialPopulation, 100);
        QCOMPARE(config.disease.transmissionRate, 0.3);
    }
    
    /**
     * Test copy construction
     */
    void testCopyConstruction() {
        Configuration original;
        original.simulation.maxSteps = 35000;
        original.agents.initialPopulation = 600;
        
        Configuration copy = original;
        
        QCOMPARE(copy.simulation.maxSteps, 35000);
        QCOMPARE(copy.agents.initialPopulation, 600);
        
        // Modify copy shouldn't affect original
        copy.simulation.maxSteps = 40000;
        QCOMPARE(original.simulation.maxSteps, 35000);
    }
    
    /**
     * Test assignment operator
     */
    void testAssignment() {
        Configuration original;
        original.simulation.maxSteps = 45000;
        
        Configuration copy;
        copy = original;
        
        QCOMPARE(copy.simulation.maxSteps, 45000);
    }
};

QTEST_MAIN(TestConfiguration)
#include "tst_configuration.moc"
