#pragma once

#include <QString>
#include <QtMath>

/**
 * @brief Utility functions for validating configuration values
 */
class ValidationUtils {
public:
    /**
     * @brief Validate that a value is positive
     * @param value Value to check
     * @param fieldName Name of field for error messages
     * @return true if value > 0
     */
    template<typename T>
    static bool validatePositive(T value, const QString& fieldName = QString()) {
        return value > T(0);
    }
    
    /**
     * @brief Validate that a value is between 0 and 1 (inclusive)
     * @param value Value to check
     * @param fieldName Name of field for error messages
     * @return true if 0 <= value <= 1
     */
    static bool validateRate(double value, const QString& fieldName = QString()) {
        return value >= 0.0 && value <= 1.0;
    }
    
    /**
     * @brief Validate that a range is valid (min <= max)
     * @param min Minimum value
     * @param max Maximum value
     * @param fieldName Name of field for error messages
     * @return true if min <= max
     */
    template<typename T>
    static bool validateRange(T min, T max, const QString& fieldName = QString()) {
        return min <= max;
    }
    
    /**
     * @brief Validate that a value is within a range
     * @param value Value to check
     * @param min Minimum allowed value
     * @param max Maximum allowed value
     * @param fieldName Name of field for error messages
     * @return true if min <= value <= max
     */
    template<typename T>
    static bool validateWithinRange(T value, T min, T max, const QString& fieldName = QString()) {
        return value >= min && value <= max;
    }
    
    /**
     * @brief Validate that a string is not empty
     * @param value String to check
     * @param fieldName Name of field for error messages
     * @return true if string is not empty
     */
    static bool validateNotEmpty(const QString& value, const QString& fieldName = QString()) {
        return !value.trimmed().isEmpty();
    }
    
    /**
     * @brief Compare two doubles for approximate equality
     * @param a First value
     * @param b Second value
     * @param epsilon Tolerance (default: 1e-9)
     * @return true if |a - b| < epsilon
     */
    static bool approximatelyEqual(double a, double b, double epsilon = 1e-9) {
        return qAbs(a - b) < epsilon;
    }
    
    /**
     * @brief Clamp a value to a range
     * @param value Value to clamp
     * @param min Minimum value
     * @param max Maximum value
     * @return Clamped value
     */
    template<typename T>
    static T clamp(T value, T min, T max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
    
private:
    ValidationUtils() = delete;  // Utility class, no instances
};
