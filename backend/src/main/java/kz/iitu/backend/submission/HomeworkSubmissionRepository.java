package kz.iitu.backend.submission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HomeworkSubmissionRepository extends JpaRepository<HomeworkSubmission, UUID> {

    @Query("SELECT hs FROM HomeworkSubmission hs " +
           "JOIN FETCH hs.student " +
           "WHERE hs.homework.id = :homeworkId " +
           "ORDER BY hs.submittedAt DESC")
    List<HomeworkSubmission> findByHomeworkId(@Param("homeworkId") UUID homeworkId);

    @Query("SELECT hs FROM HomeworkSubmission hs " +
           "WHERE hs.homework.id = :homeworkId " +
           "AND hs.student.id = :studentId")
    Optional<HomeworkSubmission> findByHomeworkIdAndStudentId(
            @Param("homeworkId") UUID homeworkId,
            @Param("studentId") UUID studentId);

    @Query("SELECT hs FROM HomeworkSubmission hs " +
           "JOIN FETCH hs.student " +
           "JOIN FETCH hs.homework h " +
           "JOIN FETCH h.lesson l " +
           "JOIN FETCH l.course c " +
           "JOIN FETCH c.instructor " +
           "WHERE hs.id = :id")
    Optional<HomeworkSubmission> findByIdWithHomeworkAndLesson(@Param("id") UUID id);

    @Query("SELECT COUNT(hs) FROM HomeworkSubmission hs WHERE hs.homework.id = :homeworkId")
    long countByHomeworkId(@Param("homeworkId") UUID homeworkId);

    @Query("SELECT COUNT(hs) FROM HomeworkSubmission hs " +
           "WHERE hs.homework.id = :homeworkId AND hs.grade IS NOT NULL")
    long countGradedByHomeworkId(@Param("homeworkId") UUID homeworkId);

    @Query("SELECT COUNT(hs) FROM HomeworkSubmission hs " +
           "WHERE hs.homework.id = :homeworkId AND hs.grade IS NULL")
    long countPendingByHomeworkId(@Param("homeworkId") UUID homeworkId);

    boolean existsByHomeworkIdAndStudentId(UUID homeworkId, UUID studentId);

    @Query("SELECT hs FROM HomeworkSubmission hs " +
           "JOIN FETCH hs.student " +
           "JOIN FETCH hs.homework h " +
           "JOIN FETCH h.lesson l " +
           "JOIN FETCH l.course c " +
           "WHERE c.instructor.id = :instructorId AND hs.grade IS NULL " +
           "ORDER BY hs.submittedAt DESC")
    List<HomeworkSubmission> findPendingByInstructorId(@Param("instructorId") UUID instructorId);

    /**
     * Все сабмиты по курсу (для аналитики инструктора).
     */
    @Query("SELECT hs FROM HomeworkSubmission hs " +
           "JOIN FETCH hs.student " +
           "JOIN FETCH hs.homework h " +
           "JOIN FETCH h.lesson l " +
           "WHERE l.course.id = :courseId")
    List<HomeworkSubmission> findAllByCourseId(@Param("courseId") UUID courseId);

    /**
     * Все сабмиты студента (для дедлайнов).
     */
    @Query("SELECT hs FROM HomeworkSubmission hs " +
           "JOIN FETCH hs.homework h " +
           "JOIN FETCH h.lesson l " +
           "JOIN FETCH l.course " +
           "WHERE hs.student.id = :studentId")
    List<HomeworkSubmission> findAllByStudentId(@Param("studentId") UUID studentId);

    /**
     * Количество сданных ДЗ студента в курсе.
     */
    @Query("SELECT COUNT(hs) FROM HomeworkSubmission hs " +
           "JOIN hs.homework h JOIN h.lesson l " +
           "WHERE l.course.id = :courseId AND hs.student.id = :studentUserId")
    long countSubmittedByStudentAndCourse(@Param("studentUserId") UUID studentUserId,
                                          @Param("courseId") UUID courseId);

    /**
     * Средняя оценка студента в курсе.
     */
    @Query("SELECT AVG(hs.grade) FROM HomeworkSubmission hs " +
           "JOIN hs.homework h JOIN h.lesson l " +
           "WHERE l.course.id = :courseId AND hs.student.id = :studentUserId AND hs.grade IS NOT NULL")
    Double findAverageGradeByStudentAndCourse(@Param("studentUserId") UUID studentUserId,
                                              @Param("courseId") UUID courseId);
}
