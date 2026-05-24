package kz.iitu.backend.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudentPaymentRepository extends JpaRepository<StudentPayment, UUID> {

    @Query("SELECT p FROM StudentPayment p JOIN FETCH p.course WHERE p.student.id = :studentId ORDER BY p.dueDate DESC")
    List<StudentPayment> findByStudentIdOrderByDueDateDesc(@Param("studentId") UUID studentId);

    boolean existsByStudentIdAndCourseIdAndPeriodMonthAndPeriodYear(
            UUID studentId, UUID courseId, Integer periodMonth, Integer periodYear);

    long countByStatus(PaymentStatus status);

    long countByStatusNot(PaymentStatus status);

    @Query("SELECT p FROM StudentPayment p JOIN FETCH p.student JOIN FETCH p.course c WHERE c.id = :courseId ORDER BY p.dueDate DESC")
    Page<StudentPayment> findAllByCourseIdWithDetails(@Param("courseId") UUID courseId, Pageable pageable);

    @Query("SELECT p FROM StudentPayment p JOIN FETCH p.student JOIN FETCH p.course ORDER BY p.dueDate DESC")
    Page<StudentPayment> findAllWithDetails(Pageable pageable);

}
