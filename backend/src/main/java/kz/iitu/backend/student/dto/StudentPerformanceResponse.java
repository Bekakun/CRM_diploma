package kz.iitu.backend.student.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentPerformanceResponse {

    private UUID id;
    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String profilePhotoUrl;

    private UUID courseId;
    private String courseName;

    private Double averageGrade;
    private Double attendanceRate;
    private Double homeworkCompletionRate;

    private LocalDateTime enrolledAt;

    private List<LessonPerformance> performance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class LessonPerformance {
        private UUID lessonId;
        private String lessonTitle;
        private String lessonDate;

        private AttendanceInfo attendance;
        private HomeworkInfo homework;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AttendanceInfo {
            private String status;
        }

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public static class HomeworkInfo {
            private UUID id;
            private String title;
            private String deadline;
            private SubmissionInfo submission;

            @Data
            @Builder
            @NoArgsConstructor
            @AllArgsConstructor
            @JsonInclude(JsonInclude.Include.NON_NULL)
            public static class SubmissionInfo {
                private UUID id;
                private String githubUrl;
                private String submittedAt;
                private Boolean isLate;
                private Integer grade;
                private String feedback;
                private String gradedAt;
            }
        }
    }
}
