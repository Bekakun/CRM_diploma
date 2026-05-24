package kz.iitu.backend.lesson;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    @Query("SELECT l FROM Lesson l LEFT JOIN FETCH l.course WHERE l.id = :id")
    Optional<Lesson> findByIdWithCourse(@Param("id") UUID id);

    @Query("SELECT l FROM Lesson l WHERE l.course.id = :courseId ORDER BY l.scheduledAt ASC")
    Page<Lesson> findByCourseId(@Param("courseId") UUID courseId, Pageable pageable);

    /**
     * Проверка пересечения уроков одного курса по времени.
     * Конфликт = новый урок [newStart, newEnd) пересекается с существующим [l.scheduledAt, l.scheduledAt + duration).
     * Условие пересечения: newStart < existingEnd AND newEnd > existingStart
     */
    @Query("SELECT l FROM Lesson l WHERE l.course.id = :courseId " +
            "AND (:excludeLessonId IS NULL OR l.id <> :excludeLessonId) " +
            "AND l.status <> 'CANCELLED' " +
            "AND :newStart < FUNCTION('TIMESTAMPADD', MINUTE, l.durationMinutes, l.scheduledAt) " +
            "AND :newEnd > l.scheduledAt")
    List<Lesson> findConflictingLessons(
            @Param("courseId") UUID courseId,
            @Param("newStart") LocalDateTime newStart,
            @Param("newEnd") LocalDateTime newEnd,
            @Param("excludeLessonId") UUID excludeLessonId
    );

    /**
     * Проверка пересечения уроков по преподавателю (все его курсы).
     * Используется при создании/редактировании урока для предотвращения конфликтов расписания.
     */
    @Query("SELECT l FROM Lesson l JOIN FETCH l.course WHERE l.course.instructor.id = :instructorId " +
            "AND (:excludeLessonId IS NULL OR l.id <> :excludeLessonId) " +
            "AND l.status <> 'CANCELLED' " +
            "AND :newStart < FUNCTION('TIMESTAMPADD', MINUTE, l.durationMinutes, l.scheduledAt) " +
            "AND :newEnd > l.scheduledAt")
    List<Lesson> findConflictingLessonsByInstructor(
            @Param("instructorId") UUID instructorId,
            @Param("newStart") LocalDateTime newStart,
            @Param("newEnd") LocalDateTime newEnd,
            @Param("excludeLessonId") UUID excludeLessonId
    );

    @Query("SELECT l FROM Lesson l " +
            "WHERE l.course.instructor.id = :instructorId " +
            "ORDER BY l.scheduledAt DESC")
    Page<Lesson> findByInstructorId(@Param("instructorId") UUID instructorId, Pageable pageable);

    @Query("SELECT l FROM Lesson l " +
            "WHERE l.course.instructor.id = :instructorId " +
            "AND l.course.id = :courseId " +
            "ORDER BY l.scheduledAt ASC")
    Page<Lesson> findByInstructorIdAndCourseId(
            @Param("instructorId") UUID instructorId,
            @Param("courseId") UUID courseId,
            Pageable pageable
    );

    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.course.id = :courseId")
    Long countByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT l FROM Lesson l " +
            "WHERE l.course.id IN (" +
            "  SELECT s.course.id FROM Student s WHERE s.user.id = :userId" +
            ") " +
            "ORDER BY l.scheduledAt ASC")
    List<Lesson> findAllByStudentUserId(@Param("userId") UUID userId);
}
