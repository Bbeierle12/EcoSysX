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
        QCOMPARE(config.simulation.stepsPerTick, 1);
        QCOMPARE(config.simulation.gridWidth, 100);
        QCOMPARE(config.simulation.gridHeight, 100);
        
        // Agents defaults
        QCOMPARE(config.agents.initialCount, 100);
        QCOMPARE(config.agents.initialInfectedRate, 0.05);
        QCOMPARE(config.agents.moveProbability, 0.5);
        QCOMPARE(config.agents.interactionRadius, 1.5);
        
        // Disease defaults
        QCOMPARE(config.disease.transmissionRate, 0.3);
        QCOMPARE(config.disease.recoveryRate, 0.1);
        QCOMPARE(config.disease.mortalityRate, 0.01);
        QCOMPARE(config.disease.incubationSteps, 5);
        
        // Environment defaults
        QCOMPARE(config.environment.resourceRegeneration, 0.1);
        QCOMPARE(config.environment.carryingCapacity, 1000.0);
        
        // RNG defaults
        QCOMPARE(config.rng.seed, 42);
        QCOMPARE(config.rng.algorithm, QString("mt19937"));
    }
    
    /**
     * Test JSON serialization
     */
    void testToJson() {
        Configuration config;
        config.simulation.stepsPerTick = 10;
        config.agents.initialCount = 200;
        
        QJsonObject json = config.toJson();
        
        QVERIFY(json.contains("simulation"));
        QVERIFY(json.contains("agents"));
        QVERIFY(json.contains("disease"));
        QVERIFY(json.contains("environment"));
        QVERIFY(json.contains("rng"));
        
        QJsonObject sim = json["simulation"].toObject();
        QCOMPARE(sim["stepsPerTick"].toInt(), 10);
        
        QJsonObject agents = json["agents"].toObject();
        QCOMPARE(agents["initialCount"].toInt(), 200);
    }
    
    /**
     * Test JSON deserialization
     */
    void testFromJson() {
        QJsonObject json;
        
        QJsonObject sim;
        sim["stepsPerTick"] = 15;
        sim["gridWidth"] = 200;
        sim["gridHeight"] = 150;
        json["simulation"] = sim;
        
        QJsonObject agents;
        agents["initialCount"] = 500;
        agents["initialInfectedRate"] = 0.1;
        agents["moveProbability"] = 0.7;
        agents["interactionRadius"] = 2.0;
        json["agents"] = agents;
        
        QJsonObject disease;
        disease["transmissionRate"] = 0.4;
        disease["recoveryRate"] = 0.15;
        disease["mortalityRate"] = 0.02;
        disease["incubationSteps"] = 10;
        json["disease"] = disease;
        
        QJsonObject env;
        env["resourceRegeneration"] = 0.2;
        env["carryingCapacity"] = 2000.0;
        json["environment"] = env;
        
        QJsonObject rng;
        rng["seed"] = 12345;
        rng["algorithm"] = "xorshift";
        json["rng"] = rng;
        
        Configuration config;
        config.fromJson(json);
        
        QCOMPARE(config.simulation.stepsPerTick, 15);
        QCOMPARE(config.simulation.gridWidth, 200);
        QCOMPARE(config.simulation.gridHeight, 150);
        QCOMPARE(config.agents.initialCount, 500);
        QCOMPARE(config.agents.initialInfectedRate, 0.1);
        QCOMPARE(config.disease.transmissionRate, 0.4);
        QCOMPARE(config.environment.carryingCapacity, 2000.0);
        QCOMPARE(config.rng.seed, 12345);
        QCOMPARE(config.rng.algorithm, QString("xorshift"));
    }
    
    /**
     * Test roundtrip serialization
     */
    void testRoundtrip() {
        Configuration original;
        original.simulation.stepsPerTick = 20;
        original.agents.initialCount = 300;
        original.disease.transmissionRate = 0.5;
        
        QJsonObject json = original.toJson();
        
        Configuration restored;
        restored.fromJson(json);
        
        QCOMPARE(restored.simulation.stepsPerTick, original.simulation.stepsPerTick);
        QCOMPARE(restored.agents.initialCount, original.agents.initialCount);
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
        config.simulation.stepsPerTick = 0;
        config.simulation.gridWidth = -100;
        
        QStringList errors;
        bool valid = config.validate(&errors);
        
        QVERIFY(!valid);
        QVERIFY(errors.size() >= 2);
        QVERIFY(errors.join(" ").contains("stepsPerTick"));
        QVERIFY(errors.join(" ").contains("gridWidth"));
    }
    
    /**
     * Test validation - rate constraints
     */
    void testValidationRates() {
        Configuration config;
        
        // Invalid rates (outside 0-1 range)
        config.agents.initialInfectedRate = 1.5;
        config.disease.transmissionRate = -0.1;
        config.disease.recoveryRate = 2.0;
        
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
        original.simulation.stepsPerTick = 25;
        original.agents.initialCount = 400;
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
        QString loadError;
        bool loadSucceeded = loaded.loadFromFile(filePath, &loadError);
        QVERIFY2(loadSucceeded, qPrintable(loadError));
        
        // Verify
        QCOMPARE(loaded.simulation.stepsPerTick, original.simulation.stepsPerTick);
        QCOMPARE(loaded.agents.initialCount, original.agents.initialCount);
        QCOMPARE(loaded.disease.mortalityRate, original.disease.mortalityRate);
    }
    
    /**
     * Test file load error handling
     */
    void testFileLoadErrors() {
        Configuration config;
        QString error;
        
        // Non-existent file
        bool loaded = config.loadFromFile("/nonexistent/path/config.json", &error);
        QVERIFY(!loaded);
        QVERIFY(!error.isEmpty());
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
        QString error;
        bool loaded = config.loadFromFile(tempFile.fileName(), &error);
        
        QVERIFY(!loaded);
        QVERIFY(!error.isEmpty());
    }
    
    /**
     * Test partial JSON (missing fields use defaults)
     */
    void testPartialJson() {
        QJsonObject json;
        
        QJsonObject sim;
        sim["stepsPerTick"] = 30;
        // Missing gridWidth and gridHeight
        json["simulation"] = sim;
        
        // Missing other sections entirely
        
        Configuration config;
        config.fromJson(json);
        
        // Should use custom value
        QCOMPARE(config.simulation.stepsPerTick, 30);
        
        // Should use defaults
        QCOMPARE(config.simulation.gridWidth, 100);
        QCOMPARE(config.agents.initialCount, 100);
        QCOMPARE(config.disease.transmissionRate, 0.3);
    }
    
    /**
     * Test copy construction
     */
    void testCopyConstruction() {
        Configuration original;
        original.simulation.stepsPerTick = 35;
        original.agents.initialCount = 600;
        
        Configuration copy = original;
        
        QCOMPARE(copy.simulation.stepsPerTick, 35);
        QCOMPARE(copy.agents.initialCount, 600);
        
        // Modify copy shouldn't affect original
        copy.simulation.stepsPerTick = 40;
        QCOMPARE(original.simulation.stepsPerTick, 35);
    }
    
    /**
     * Test assignment operator
     */
    void testAssignment() {
        Configuration original;
        original.simulation.stepsPerTick = 45;
        
        Configuration copy;
        copy = original;
        
        QCOMPARE(copy.simulation.stepsPerTick, 45);
    }
};

QTEST_MAIN(TestConfiguration)
#include "tst_configuration.moc"
