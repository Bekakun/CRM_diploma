package kz.iitu.backend.payment;

import kz.iitu.backend.student.Student;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentGenerationService {

    private final StudentPaymentRepository paymentRepository;
    private final PaymentRuleRepository paymentRuleRepository;
    private final StudentRepository studentRepository;

    /**
     * Generate payments for all enrolled students when a new payment rule is created.
     */
    @Transactional
    public void generatePaymentsForRule(PaymentRule rule) {
        List<Student> students = studentRepository.findAllByCourseId(rule.getCourse().getId(), Pageable.unpaged()).getContent();
        log.info("Generating payments for rule {} (course {}), {} students",
                rule.getId(), rule.getCourse().getId(), students.size());

        for (Student student : students) {
            generatePaymentsForStudentAndRule(student.getUser(), rule);
        }
    }

    /**
     * Generate payments for a newly enrolled student based on all active rules of the course.
     */
    @Transactional
    public void generatePaymentsForEnrollment(User student, UUID courseId) {
        List<PaymentRule> rules = paymentRuleRepository.findAllByCourseIdAndIsActiveTrue(courseId);
        log.info("Generating payments for student {} in course {}, {} rules",
                student.getId(), courseId, rules.size());

        for (PaymentRule rule : rules) {
            generatePaymentsForStudentAndRule(student, rule);
        }
    }

    private void generatePaymentsForStudentAndRule(User student, PaymentRule rule) {
        switch (rule.getFrequency()) {
            case ONE_TIME -> generateOneTimePayment(student, rule);
            case MONTHLY -> generateMonthlyPayments(student, rule);
            case QUARTERLY -> generateQuarterlyPayments(student, rule);
        }
    }

    private void generateOneTimePayment(User student, PaymentRule rule) {
        LocalDate today = LocalDate.now();
        LocalDate dueDate = today.withDayOfMonth(Math.min(rule.getDueDay(), today.lengthOfMonth()));

        if (paymentRepository.existsByStudentIdAndCourseIdAndPeriodMonthAndPeriodYear(
                student.getId(), rule.getCourse().getId(), null, null)) {
            log.debug("ONE_TIME payment already exists for student {} course {}", student.getId(), rule.getCourse().getId());
            return;
        }

        StudentPayment payment = StudentPayment.builder()
                .student(student)
                .course(rule.getCourse())
                .amount(rule.getAmount())
                .currency(rule.getCurrency())
                .status(PaymentStatus.PENDING)
                .dueDate(dueDate)
                .build();

        paymentRepository.save(payment);
        log.info("Created ONE_TIME payment for student {} course {}", student.getId(), rule.getCourse().getId());
    }

    private void generateMonthlyPayments(User student, PaymentRule rule) {
        LocalDate today = LocalDate.now();
        // Generate payments for current month through 12 months ahead
        for (int i = 0; i < 12; i++) {
            LocalDate month = today.plusMonths(i);
            int periodMonth = month.getMonthValue();
            int periodYear = month.getYear();

            if (paymentRepository.existsByStudentIdAndCourseIdAndPeriodMonthAndPeriodYear(
                    student.getId(), rule.getCourse().getId(), periodMonth, periodYear)) {
                continue;
            }

            int maxDay = month.lengthOfMonth();
            int day = Math.min(rule.getDueDay(), maxDay);
            LocalDate dueDate = month.withDayOfMonth(day);

            StudentPayment payment = StudentPayment.builder()
                    .student(student)
                    .course(rule.getCourse())
                    .amount(rule.getAmount())
                    .currency(rule.getCurrency())
                    .status(PaymentStatus.PENDING)
                    .dueDate(dueDate)
                    .periodMonth(periodMonth)
                    .periodYear(periodYear)
                    .build();

            paymentRepository.save(payment);
            log.info("Created MONTHLY payment for student {} course {} period {}/{}",
                    student.getId(), rule.getCourse().getId(), periodMonth, periodYear);
        }
    }

    private void generateQuarterlyPayments(User student, PaymentRule rule) {
        LocalDate today = LocalDate.now();
        // Generate payments for current quarter through 4 quarters (12 months) ahead
        for (int i = 0; i < 4; i++) {
            LocalDate month = today.plusMonths((long) i * 3);
            int periodMonth = month.getMonthValue();
            int periodYear = month.getYear();

            if (paymentRepository.existsByStudentIdAndCourseIdAndPeriodMonthAndPeriodYear(
                    student.getId(), rule.getCourse().getId(), periodMonth, periodYear)) {
                continue;
            }

            int maxDay = month.lengthOfMonth();
            int day = Math.min(rule.getDueDay(), maxDay);
            LocalDate dueDate = month.withDayOfMonth(day);

            StudentPayment payment = StudentPayment.builder()
                    .student(student)
                    .course(rule.getCourse())
                    .amount(rule.getAmount())
                    .currency(rule.getCurrency())
                    .status(PaymentStatus.PENDING)
                    .dueDate(dueDate)
                    .periodMonth(periodMonth)
                    .periodYear(periodYear)
                    .build();

            paymentRepository.save(payment);
            log.info("Created QUARTERLY payment for student {} course {} period {}/{}",
                    student.getId(), rule.getCourse().getId(), periodMonth, periodYear);
        }
    }
}
