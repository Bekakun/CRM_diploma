package kz.iitu.backend.payment;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PaymentFrequency {
    ONE_TIME,
    MONTHLY,
    QUARTERLY;

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
