package kz.iitu.backend.course;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

    @Query("SELECT c FROM Course c WHERE c.instructor.id = :instructorId")
    Page<Course> findByInstructorId(@Param("instructorId") UUID instructorId, Pageable pageable);

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.instructor WHERE c.id = :id")
    Optional<Course> findByIdWithInstructor(@Param("id") UUID id);

    @Query("SELECT COUNT(c) > 0 FROM Course c WHERE c.name = :name AND c.instructor.id = :instructorId")
    boolean existsByNameAndInstructorId(@Param("name") String name, @Param("instructorId") UUID instructorId);

    @Query("SELECT COUNT(c) > 0 FROM Course c WHERE c.name = :name AND c.instructor.id = :instructorId AND c.id <> :courseId")
    boolean existsByNameAndInstructorIdAndIdNot(@Param("name") String name, @Param("instructorId") UUID instructorId, @Param("courseId") UUID courseId);
}
