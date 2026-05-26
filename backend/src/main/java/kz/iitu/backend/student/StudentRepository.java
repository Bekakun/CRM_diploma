package kz.iitu.backend.student;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    @Query("SELECT s FROM Student s WHERE s.user.id = :userId AND s.course.id = :courseId")
    Optional<Student> findByUserIdAndCourseId(@Param("userId") UUID userId, @Param("courseId") UUID courseId);

    @Query("SELECT COUNT(s) > 0 FROM Student s WHERE s.user.id = :userId AND s.course.id = :courseId")
    boolean existsByUserIdAndCourseId(@Param("userId") UUID userId, @Param("courseId") UUID courseId);

    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.user LEFT JOIN FETCH s.course c LEFT JOIN FETCH c.instructor WHERE s.id = :id")
    Optional<Student> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.user LEFT JOIN FETCH s.course WHERE s.user.id = :userId")
    List<Student> findAllByUserId(@Param("userId") UUID userId);

    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.user LEFT JOIN FETCH s.course " +
            "WHERE s.course.instructor.id = :instructorId")
    Page<Student> findAllByInstructorId(@Param("instructorId") UUID instructorId, Pageable pageable);

    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.user LEFT JOIN FETCH s.course " +
            "WHERE s.course.id = :courseId")
    Page<Student> findAllByCourseId(@Param("courseId") UUID courseId, Pageable pageable);

    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.user LEFT JOIN FETCH s.course " +
            "WHERE s.course.instructor.id = :instructorId AND s.course.id = :courseId")
    Page<Student> findAllByInstructorIdAndCourseId(@Param("instructorId") UUID instructorId,
                                                     @Param("courseId") UUID courseId,
                                                     Pageable pageable);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.course.id = :courseId")
    Long countByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT s FROM Student s JOIN FETCH s.user WHERE s.course.id = :courseId")
    List<Student> findAllByCourseIdWithUser(@Param("courseId") UUID courseId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Student s WHERE s.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
