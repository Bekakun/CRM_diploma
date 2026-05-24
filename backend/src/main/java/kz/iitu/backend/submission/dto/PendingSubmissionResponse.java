package kz.iitu.backend.submission.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingSubmissionResponse {
    private UUID submissionId;
    private UUID homeworkId;
    private UUID lessonId;
    private UUID courseId;
    private String homeworkTitle;
    private String lessonTitle;
    private String courseName;
    private String studentFirstName;
    private String studentLastName;
    private String githubUrl;
    private LocalDateTime submittedAt;
    private Boolean isLate;
}
