#include <QtTest>
#include "configuration_example.h"

class TestConfigurationExample : public QObject {
    Q_OBJECT

private slots:
    void testDefaultConfiguration() {
        ConfigurationExample config;
        QCOMPARE(config.getSetting("exampleSetting"), "defaultValue");
    }

    void testSetConfiguration() {
        ConfigurationExample config;
        config.setSetting("exampleSetting", "newValue");
        QCOMPARE(config.getSetting("exampleSetting"), "newValue");
    }

    void testInvalidSetting() {
        ConfigurationExample config;
        QCOMPARE(config.getSetting("invalidSetting"), QVariant());
    }
};

QTEST_MAIN(TestConfigurationExample)
#include "tst_configuration_example.moc"