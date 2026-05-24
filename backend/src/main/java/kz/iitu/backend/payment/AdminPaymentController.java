package kz.iitu.backend.payment;

import kz.iitu.backend.payment.dto.AdminPaymentPageResponse;
import kz.iitu.backend.payment.dto.AdminPaymentResponse;
import kz.iitu.backend.payment.dto.MarkPaidRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminPaymentController {

    private final AdminPaymentService adminPaymentService;

    @GetMapping
    public ResponseEntity<AdminPaymentPageResponse> getPayments(
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "asc") String sort) {
        return ResponseEntity.ok(adminPaymentService.getPayments(courseId, search, dateFrom, dateTo, page, size, sort));
    }

    @PatchMapping("/{paymentId}/mark-paid")
    public ResponseEntity<AdminPaymentResponse> markPaid(
            @PathVariable UUID paymentId,
            @RequestBody(required = false) MarkPaidRequest request) {
        return ResponseEntity.ok(adminPaymentService.markPaid(paymentId, request != null ? request : new MarkPaidRequest()));
    }

    @PatchMapping("/{paymentId}/mark-unpaid")
    public ResponseEntity<AdminPaymentResponse> markUnpaid(@PathVariable UUID paymentId) {
        return ResponseEntity.ok(adminPaymentService.markUnpaid(paymentId));
    }
}
