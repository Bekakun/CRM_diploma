package kz.iitu.backend.homework;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HomeworkRepository extends JpaRepository<Homework, UUID> {

    @Query("SELECT h FROM Homework h WHERE h.lesson.id = :lessonId")
    Optional<Homework> findByLessonId(@Param("lessonId") UUID lessonId);

    @Query("SELECT h FROM Homework h JOIN FETCH h.lesson l JOIN FETCH l.course WHERE h.id = :id")
    Optional<Homework> findByIdWithLessonAndCourse(@Param("id") UUID id);

    @Query("SELECT COUNT(h) > 0 FROM Homework h WHERE h.lesson.id = :lessonId")
    boolean existsByLessonId(@Param("lessonId") UUID lessonId);

    /**
     * Все homework для студента (по всем курсам, на которые он записан),
     * включая lesson и course для формирования дедлайнов.
     */
    @Query("SELECT h FROM Homework h " +
           "JOIN FETCH h.lesson l " +
           "JOIN FETCH l.course c " +
           "WHERE c.id IN (SELECT s.course.id FROM Student s WHERE s.user.id = :userId) " +
           "ORDER BY h.dueDate ASC")
    List<Homework> findAllByStudentUserId(@Param("userId") UUID userId);

    /**
     * Все homework уроков конкретного курса.
     */
    @Query("SELECT h FROM Homework h " +
           "JOIN FETCH h.lesson l " +
           "WHERE l.course.id = :courseId")
    List<Homework> findAllByCourseId(@Param("courseId") UUID courseId);

    /**
     * Количество уроков с домашними заданиями в курсе.
     */
    @Query("SELECT COUNT(h) FROM Homework h JOIN h.lesson l WHERE l.course.id = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);

    /**
     * Количество уроков в курсе (для расчёта посещаемости).
     */
    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.course.id = :courseId")
    long countLessonsByCourseId(@Param("courseId") UUID courseId);
}
