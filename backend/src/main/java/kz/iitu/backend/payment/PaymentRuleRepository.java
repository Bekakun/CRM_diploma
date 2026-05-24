package kz.iitu.backend.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRuleRepository extends JpaRepository<PaymentRule, UUID> {

    List<PaymentRule> findAllByOrderByCreatedAtDesc();

    boolean existsByCourseId(UUID courseId);

    List<PaymentRule> findAllByCourseIdAndIsActiveTrue(UUID courseId);
}
