package kz.iitu.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminPaymentResponse {
    private UUID id;
    private UUID studentId;
    private String studentFirstName;
    private String studentLastName;
    private String studentEmail;
    private UUID courseId;
    private String courseName;
    private BigDecimal amount;
    private String currency;
    private String status;
    private LocalDate dueDate;
    private LocalDateTime paidAt;
    private Integer periodMonth;
    private Integer periodYear;
    private String note;
}
