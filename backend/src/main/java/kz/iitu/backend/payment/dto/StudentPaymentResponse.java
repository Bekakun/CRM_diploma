package kz.iitu.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentPaymentResponse {
    private UUID id;
    private UUID courseId;
    private String courseName;
    private BigDecimal amount;
    private String currency;
    private String status;
    private LocalDate dueDate;
    private LocalDateTime paidAt;
    private Integer periodMonth;
    private Integer periodYear;
}
