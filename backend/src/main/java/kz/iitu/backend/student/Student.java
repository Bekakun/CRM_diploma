package kz.iitu.backend.student;

import jakarta.persistence.*;
import kz.iitu.backend.course.Course;
import kz.iitu.backend.user.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "students", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "course_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "enrolled_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime enrolledAt;

    @Column(name = "average_grade")
    private Double averageGrade;

    @Column(name = "attendance_rate")
    private Double attendanceRate;

    @Column(name = "homework_completion_rate")
    private Double homeworkCompletionRate;
}
