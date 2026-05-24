package kz.iitu.backend.payment.dto;

import jakarta.validation.constraints.*;
import kz.iitu.backend.payment.PaymentFrequency;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreatePaymentRuleRequest {

    @NotNull(message = "ID курса обязателен")
    private UUID courseId;

    @NotNull(message = "Сумма обязательна")
    @DecimalMin(value = "0.01", message = "Сумма должна быть больше 0")
    private BigDecimal amount;

    @NotNull(message = "Периодичность обязательна")
    private PaymentFrequency frequency;

    private String description;

    @NotNull(message = "День оплаты обязателен")
    @Min(value = 1, message = "День должен быть от 1 до 31")
    @Max(value = 31, message = "День должен быть от 1 до 31")
    private Integer dueDay;
}
