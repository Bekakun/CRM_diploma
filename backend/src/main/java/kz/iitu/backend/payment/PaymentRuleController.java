package kz.iitu.backend.payment;

import jakarta.validation.Valid;
import kz.iitu.backend.payment.dto.CourseOption;
import kz.iitu.backend.payment.dto.CreatePaymentRuleRequest;
import kz.iitu.backend.payment.dto.PaymentRuleResponse;
import kz.iitu.backend.payment.dto.UpdatePaymentRuleRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Slf4j
public class PaymentRuleController {

    private final PaymentRuleService paymentRuleService;
    private final PaymentGenerationService paymentGenerationService;

    @GetMapping("/api/v1/admin/courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<CourseOption>> getAllCourses() {
        log.info("GET /api/v1/admin/courses");
        return ResponseEntity.ok(paymentRuleService.getAllCourses());
    }

    @GetMapping("/api/v1/admin/payment-rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PaymentRuleResponse>> getAllRules() {
        log.info("GET /api/v1/admin/payment-rules");
        return ResponseEntity.ok(paymentRuleService.getAllRules());
    }

    @PostMapping("/api/v1/admin/payment-rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentRuleResponse> createRule(@Valid @RequestBody CreatePaymentRuleRequest request) {
        log.info("POST /api/v1/admin/payment-rules - courseId: {}", request.getCourseId());
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentRuleService.createRule(request));
    }

    @PatchMapping("/api/v1/admin/payment-rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentRuleResponse> updateRule(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePaymentRuleRequest request) {
        log.info("PATCH /api/v1/admin/payment-rules/{}", id);
        return ResponseEntity.ok(paymentRuleService.updateRule(id, request));
    }

    @DeleteMapping("/api/v1/admin/payment-rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        log.info("DELETE /api/v1/admin/payment-rules/{}", id);
        paymentRuleService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/payment-rules/{id}/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> generatePayments(@PathVariable UUID id) {
        log.info("POST /api/v1/admin/payment-rules/{}/generate", id);
        paymentRuleService.generatePaymentsForRule(id);
        return ResponseEntity.ok().build();
    }
}
