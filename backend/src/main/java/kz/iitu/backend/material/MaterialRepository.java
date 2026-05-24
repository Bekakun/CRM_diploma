package kz.iitu.backend.material;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaterialRepository extends JpaRepository<Material, UUID> {

    @Query("SELECT m FROM Material m WHERE m.lesson.id = :lessonId ORDER BY m.uploadedAt DESC")
    List<Material> findByLessonId(@Param("lessonId") UUID lessonId);

    @Query("SELECT m FROM Material m JOIN FETCH m.lesson l JOIN FETCH l.course c LEFT JOIN FETCH c.instructor WHERE m.id = :id")
    Optional<Material> findByIdWithLesson(@Param("id") UUID id);

    @Query("SELECT COUNT(m) FROM Material m WHERE m.lesson.id = :lessonId")
    long countByLessonId(@Param("lessonId") UUID lessonId);
}
