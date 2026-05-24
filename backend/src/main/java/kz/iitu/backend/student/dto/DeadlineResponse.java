package kz.iitu.backend.student.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DeadlineResponse {

    private UUID homeworkId;
    private UUID lessonId;
    private String courseTitle;
    private String homeworkTitle;
    private LocalDateTime dueDate;
    private String status; // pending, submitted, graded, overdue
    private Integer grade;
    private Integer maxGrade;
    private String feedback;
    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;
}
