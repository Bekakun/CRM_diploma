package kz.iitu.backend.payment;

import kz.iitu.backend.payment.dto.StudentPaymentResponse;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
public class StudentPaymentController {

    private final StudentPaymentRepository paymentRepository;

    /**
     * GET /api/v1/student/payments — все платежи текущего студента
     */
    @GetMapping("/payments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<StudentPaymentResponse>> getMyPayments(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/payments - student {}", userDetails.getId());

        List<StudentPaymentResponse> payments = paymentRepository
                .findByStudentIdOrderByDueDateDesc(userDetails.getId())
                .stream()
                .map(p -> StudentPaymentResponse.builder()
                        .id(p.getId())
                        .courseId(p.getCourse().getId())
                        .courseName(p.getCourse().getName())
                        .amount(p.getAmount())
                        .currency(p.getCurrency())
                        .status(p.getStatus().name())
                        .dueDate(p.getDueDate())
                        .paidAt(p.getPaidAt())
                        .periodMonth(p.getPeriodMonth())
                        .periodYear(p.getPeriodYear())
                        .build())
                .toList();

        return ResponseEntity.ok(payments);
    }
}
