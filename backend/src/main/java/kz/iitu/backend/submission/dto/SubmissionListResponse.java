package kz.iitu.backend.submission.dto;

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
public class SubmissionListResponse {

    private HomeworkInfo homework;
    private List<SubmissionWithStudent> submissions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HomeworkInfo {
        private UUID id;
        private String title;
        private LocalDateTime deadline;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmissionWithStudent {
        private UUID id;
        private UUID homeworkId;
        private StudentInfo student;
        private String githubUrl;
        private LocalDateTime submittedAt;
        private Boolean isLate;
        private Integer grade;
        private String feedback;
        private LocalDateTime gradedAt;
        private UUID gradedBy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentInfo {
        private UUID id;
        private UUID userId;
        private String firstName;
        private String lastName;
        private String email;
    }
}
