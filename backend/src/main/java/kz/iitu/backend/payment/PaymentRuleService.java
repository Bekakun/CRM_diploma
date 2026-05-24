package kz.iitu.backend.payment;

import kz.iitu.backend.course.Course;
import kz.iitu.backend.course.CourseRepository;
import kz.iitu.backend.payment.dto.CourseOption;
import kz.iitu.backend.payment.dto.CreatePaymentRuleRequest;
import kz.iitu.backend.payment.dto.PaymentRuleResponse;
import kz.iitu.backend.payment.dto.UpdatePaymentRuleRequest;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentRuleService {

    private final PaymentRuleRepository paymentRuleRepository;
    private final CourseRepository courseRepository;
    private final PaymentGenerationService paymentGenerationService;

    @Transactional(readOnly = true)
    public List<CourseOption> getAllCourses() {
        log.info("Fetching all courses for payment rule dropdown");
        return courseRepository.findAll().stream()
                .map(c -> new CourseOption(c.getId(), c.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentRuleResponse> getAllRules() {
        log.info("Fetching all payment rules");
        return paymentRuleRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PaymentRuleResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentRuleResponse createRule(CreatePaymentRuleRequest request) {
        log.info("Creating payment rule for course {}", request.getCourseId());

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Курс не найден"));

        PaymentRule rule = PaymentRule.builder()
                .course(course)
                .amount(request.getAmount())
                .frequency(request.getFrequency())
                .description(request.getDescription())
                .dueDay(request.getDueDay())
                .build();

        rule = paymentRuleRepository.save(rule);
        log.info("Payment rule created with id {}", rule.getId());

        // Generate payments for all currently enrolled students
        paymentGenerationService.generatePaymentsForRule(rule);

        return PaymentRuleResponse.fromEntity(rule);
    }

    @Transactional
    public PaymentRuleResponse updateRule(UUID id, UpdatePaymentRuleRequest request) {
        log.info("Updating payment rule {}", id);

        PaymentRule rule = paymentRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Правило оплаты не найдено"));

        if (request.getAmount() != null) rule.setAmount(request.getAmount());
        if (request.getFrequency() != null) rule.setFrequency(request.getFrequency());
        if (request.getDescription() != null) rule.setDescription(request.getDescription());
        if (request.getIsActive() != null) rule.setIsActive(request.getIsActive());
        if (request.getDueDay() != null) rule.setDueDay(request.getDueDay());

        rule = paymentRuleRepository.save(rule);
        return PaymentRuleResponse.fromEntity(rule);
    }

    @Transactional
    public void generatePaymentsForRule(UUID id) {
        log.info("Manually generating payments for rule {}", id);
        PaymentRule rule = paymentRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Правило оплаты не найдено"));
        paymentGenerationService.generatePaymentsForRule(rule);
    }

    @Transactional
    public void deleteRule(UUID id) {
        log.info("Deleting payment rule {}", id);
        if (!paymentRuleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Правило оплаты не найдено");
        }
        paymentRuleRepository.deleteById(id);
    }
}
