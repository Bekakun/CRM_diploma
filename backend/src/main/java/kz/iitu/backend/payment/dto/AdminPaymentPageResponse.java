package kz.iitu.backend.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminPaymentPageResponse {
    private List<AdminPaymentResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
