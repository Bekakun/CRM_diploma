package kz.iitu.backend.payment.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MarkPaidRequest {
    private LocalDateTime paidAt;
    private String note;
}
