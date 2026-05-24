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
public class SubmissionResponse {

    private UUID id;
    private UUID homeworkId;
    private UUID studentId;
    private String githubUrl;
    private LocalDateTime submittedAt;
    private Boolean isLate;
    private Integer grade;
    private String feedback;
    private LocalDateTime gradedAt;
    private UUID gradedBy;
    private LocalDateTime updatedAt;
}
