package kz.iitu.backend.payment;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import kz.iitu.backend.notification.NotificationService;
import kz.iitu.backend.payment.dto.AdminPaymentPageResponse;
import kz.iitu.backend.payment.dto.AdminPaymentResponse;
import kz.iitu.backend.payment.dto.MarkPaidRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminPaymentService {

    private final StudentPaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final EntityManager em;

    @Transactional(readOnly = true)
    public AdminPaymentPageResponse getPayments(UUID courseId, String search, LocalDate dateFrom, LocalDate dateTo, int page, int size, String sortDir) {
        String searchParam = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;

        CriteriaBuilder cb = em.getCriteriaBuilder();

        // ── Count query ──────────────────────────────────────────
        CriteriaQuery<Long> countQ = cb.createQuery(Long.class);
        Root<StudentPayment> countRoot = countQ.from(StudentPayment.class);
        countQ.select(cb.count(countRoot));
        countQ.where(buildPredicates(cb, countRoot, courseId, searchParam, dateFrom, dateTo));
        long total = em.createQuery(countQ).getSingleResult();

        // ── Data query ───────────────────────────────────────────
        CriteriaQuery<StudentPayment> dataQ = cb.createQuery(StudentPayment.class);
        Root<StudentPayment> root = dataQ.from(StudentPayment.class);
        root.fetch("student", JoinType.LEFT);
        root.fetch("course", JoinType.LEFT);
        dataQ.select(root).distinct(true);
        dataQ.where(buildPredicates(cb, root, courseId, searchParam, dateFrom, dateTo));
        if ("desc".equalsIgnoreCase(sortDir)) {
            dataQ.orderBy(cb.desc(root.get("dueDate")));
        } else {
            dataQ.orderBy(cb.asc(root.get("dueDate")));
        }

        TypedQuery<StudentPayment> query = em.createQuery(dataQ);
        query.setFirstResult(page * size);
        query.setMaxResults(size);
        List<StudentPayment> content = query.getResultList();

        int totalPages = size == 0 ? 1 : (int) Math.ceil((double) total / size);

        return AdminPaymentPageResponse.builder()
                .content(content.stream().map(this::toAdminPaymentResponse).toList())
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .build();
    }

    private Predicate[] buildPredicates(CriteriaBuilder cb, Root<StudentPayment> root,
                                        UUID courseId, String search, LocalDate dateFrom, LocalDate dateTo) {
        List<Predicate> predicates = new ArrayList<>();

        if (courseId != null) {
            predicates.add(cb.equal(root.get("course").get("id"), courseId));
        }
        if (search != null) {
            Expression<String> fullName = cb.lower(cb.concat(cb.concat(root.get("student").get("firstName"), " "), root.get("student").get("lastName")));
            Expression<String> email = cb.lower(root.get("student").get("email"));
            String pattern = "%" + search + "%";
            predicates.add(cb.or(cb.like(fullName, pattern), cb.like(email, pattern)));
        }
        if (dateFrom != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), dateFrom));
        }
        if (dateTo != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), dateTo));
        }

        return predicates.toArray(new Predicate[0]);
    }

    @Transactional
    public AdminPaymentResponse markPaid(UUID paymentId, MarkPaidRequest request) {
        StudentPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Платёж не найден"));

        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaidAt(request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now());
        payment.setNote(request.getNote());

        StudentPayment saved = paymentRepository.save(payment);

        String period = buildPeriodLabel(saved.getPeriodMonth(), saved.getPeriodYear());
        notificationService.notifyPaymentMarkedPaid(saved.getStudent(), saved.getCourse().getName(), period);

        return toAdminPaymentResponse(saved);
    }

    @Transactional
    public AdminPaymentResponse markUnpaid(UUID paymentId) {
        StudentPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Платёж не найден"));

        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaidAt(null);
        payment.setNote(null);

        return toAdminPaymentResponse(paymentRepository.save(payment));
    }

    private static final String[] MONTH_NAMES = {
        "", "январь", "февраль", "март", "апрель", "май", "июнь",
        "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
    };

    private String buildPeriodLabel(Integer month, Integer year) {
        if (month != null && year != null && month >= 1 && month <= 12) {
            return MONTH_NAMES[month] + " " + year;
        }
        return year != null ? String.valueOf(year) : "";
    }

    private AdminPaymentResponse toAdminPaymentResponse(StudentPayment p) {
        return AdminPaymentResponse.builder()
                .id(p.getId())
                .studentId(p.getStudent().getId())
                .studentFirstName(p.getStudent().getFirstName())
                .studentLastName(p.getStudent().getLastName())
                .studentEmail(p.getStudent().getEmail())
                .courseId(p.getCourse().getId())
                .courseName(p.getCourse().getName())
                .amount(p.getAmount())
                .currency(p.getCurrency())
                .status(p.getStatus().name())
                .dueDate(p.getDueDate())
                .paidAt(p.getPaidAt())
                .periodMonth(p.getPeriodMonth())
                .periodYear(p.getPeriodYear())
                .note(p.getNote())
                .build();
    }
}
