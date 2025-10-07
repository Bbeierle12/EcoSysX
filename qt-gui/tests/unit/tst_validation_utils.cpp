#include <QtTest/QtTest>
#include "../src/utils/ValidationUtils.h"

/**
 * @brief Unit tests for ValidationUtils
 */
class TestValidationUtils : public QObject {
    Q_OBJECT
    
private slots:
    /**
     * Test validatePositive with valid values
     */
    void testValidatePositiveSuccess() {
        QVERIFY(ValidationUtils::validatePositive(1, "value"));
        QVERIFY(ValidationUtils::validatePositive(100, "value"));
        QVERIFY(ValidationUtils::validatePositive(0.01, "value"));
        QVERIFY(ValidationUtils::validatePositive(1000000, "value"));
    }
    
    /**
     * Test validatePositive with invalid values
     */
    void testValidatePositiveFailure() {
        QVERIFY(!ValidationUtils::validatePositive(0, "value"));
        QVERIFY(!ValidationUtils::validatePositive(-1, "value"));
        QVERIFY(!ValidationUtils::validatePositive(-0.5, "value"));
        QVERIFY(!ValidationUtils::validatePositive(-1000, "value"));
    }
    
    /**
     * Test validateRate with valid values
     */
    void testValidateRateSuccess() {
        QVERIFY(ValidationUtils::validateRate(0.0, "rate"));
        QVERIFY(ValidationUtils::validateRate(0.5, "rate"));
        QVERIFY(ValidationUtils::validateRate(1.0, "rate"));
        QVERIFY(ValidationUtils::validateRate(0.001, "rate"));
        QVERIFY(ValidationUtils::validateRate(0.999, "rate"));
    }
    
    /**
     * Test validateRate with invalid values
     */
    void testValidateRateFailure() {
        QVERIFY(!ValidationUtils::validateRate(-0.1, "rate"));
        QVERIFY(!ValidationUtils::validateRate(1.1, "rate"));
        QVERIFY(!ValidationUtils::validateRate(-1.0, "rate"));
        QVERIFY(!ValidationUtils::validateRate(2.0, "rate"));
    }
    
    /**
     * Test validateRange with valid values
     */
    void testValidateRangeSuccess() {
        QVERIFY(ValidationUtils::validateRange(5, 0, 10, "value"));
        QVERIFY(ValidationUtils::validateRange(0, 0, 10, "value"));
        QVERIFY(ValidationUtils::validateRange(10, 0, 10, "value"));
        QVERIFY(ValidationUtils::validateRange(0.5, 0.0, 1.0, "value"));
    }
    
    /**
     * Test validateRange with invalid values
     */
    void testValidateRangeFailure() {
        QVERIFY(!ValidationUtils::validateRange(-1, 0, 10, "value"));
        QVERIFY(!ValidationUtils::validateRange(11, 0, 10, "value"));
        QVERIFY(!ValidationUtils::validateRange(1.5, 0.0, 1.0, "value"));
        QVERIFY(!ValidationUtils::validateRange(-0.5, 0.0, 1.0, "value"));
    }
    
    /**
     * Test clamp with values in range
     */
    void testClampInRange() {
        QCOMPARE(ValidationUtils::clamp(5, 0, 10), 5);
        QCOMPARE(ValidationUtils::clamp(0.5, 0.0, 1.0), 0.5);
        QCOMPARE(ValidationUtils::clamp(50, 0, 100), 50);
    }
    
    /**
     * Test clamp with values below range
     */
    void testClampBelowRange() {
        QCOMPARE(ValidationUtils::clamp(-5, 0, 10), 0);
        QCOMPARE(ValidationUtils::clamp(-0.5, 0.0, 1.0), 0.0);
        QCOMPARE(ValidationUtils::clamp(-100, 0, 100), 0);
    }
    
    /**
     * Test clamp with values above range
     */
    void testClampAboveRange() {
        QCOMPARE(ValidationUtils::clamp(15, 0, 10), 10);
        QCOMPARE(ValidationUtils::clamp(1.5, 0.0, 1.0), 1.0);
        QCOMPARE(ValidationUtils::clamp(200, 0, 100), 100);
    }
    
    /**
     * Test clamp at boundaries
     */
    void testClampBoundaries() {
        QCOMPARE(ValidationUtils::clamp(0, 0, 10), 0);
        QCOMPARE(ValidationUtils::clamp(10, 0, 10), 10);
        QCOMPARE(ValidationUtils::clamp(0.0, 0.0, 1.0), 0.0);
        QCOMPARE(ValidationUtils::clamp(1.0, 0.0, 1.0), 1.0);
    }
    
    /**
     * Test clamp with negative ranges
     */
    void testClampNegativeRange() {
        QCOMPARE(ValidationUtils::clamp(-5, -10, 0), -5);
        QCOMPARE(ValidationUtils::clamp(-15, -10, 0), -10);
        QCOMPARE(ValidationUtils::clamp(5, -10, 0), 0);
    }
    
    /**
     * Test clamp with single point range
     */
    void testClampSinglePoint() {
        QCOMPARE(ValidationUtils::clamp(5, 10, 10), 10);
        QCOMPARE(ValidationUtils::clamp(15, 10, 10), 10);
        QCOMPARE(ValidationUtils::clamp(10, 10, 10), 10);
    }
};

QTEST_MAIN(TestValidationUtils)
#include "tst_validation_utils.moc"
