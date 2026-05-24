package kz.iitu.backend.course.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CourseAnalyticsResponse {

    private UUID courseId;
    private String courseName;

    private Double avgGrade;
    private Long totalStudents;
    private Double submissionRate;
    private Double attendanceRate;

    private List<GradeDistributionItem> gradeDistribution;
    private List<AttendanceTrendItem> attendanceTrend;

    private List<StudentRankItem> topStudents;
    private List<StudentRankItem> bottomStudents;

    @Data
    @Builder
    public static class GradeDistributionItem {
        private String label;
        private long count;
    }

    @Data
    @Builder
    public static class AttendanceTrendItem {
        private UUID lessonId;
        private String lesson;
        private double rate;
        private LocalDateTime scheduledAt;
    }

    @Data
    @Builder
    public static class StudentRankItem {
        private UUID userId;
        private String firstName;
        private String lastName;
        private double avg;
    }
}
