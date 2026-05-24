package kz.iitu.backend.payment.dto;

import kz.iitu.backend.payment.PaymentFrequency;
import kz.iitu.backend.payment.PaymentRule;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class PaymentRuleResponse {

    private UUID id;
    private UUID courseId;
    private String courseName;
    private BigDecimal amount;
    private String currency;
    private PaymentFrequency frequency;
    private String description;
    private Boolean isActive;
    private Integer dueDay;

    public static PaymentRuleResponse fromEntity(PaymentRule rule) {
        return PaymentRuleResponse.builder()
                .id(rule.getId())
                .courseId(rule.getCourse().getId())
                .courseName(rule.getCourse().getName())
                .amount(rule.getAmount())
                .currency(rule.getCurrency())
                .frequency(rule.getFrequency())
                .description(rule.getDescription())
                .isActive(rule.getIsActive())
                .dueDay(rule.getDueDay())
                .build();
    }
}
