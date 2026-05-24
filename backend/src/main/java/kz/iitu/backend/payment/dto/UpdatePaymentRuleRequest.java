package kz.iitu.backend.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import kz.iitu.backend.payment.PaymentFrequency;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdatePaymentRuleRequest {

    @DecimalMin(value = "0.01", message = "Сумма должна быть больше 0")
    private BigDecimal amount;

    private PaymentFrequency frequency;

    private String description;

    private Boolean isActive;

    @Min(value = 1, message = "День должен быть от 1 до 31")
    @Max(value = 31, message = "День должен быть от 1 до 31")
    private Integer dueDay;
}
