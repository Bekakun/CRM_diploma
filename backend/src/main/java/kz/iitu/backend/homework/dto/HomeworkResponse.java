package kz.iitu.backend.homework.dto;

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
public class HomeworkResponse {

    private UUID id;
    private UUID lessonId;
    private String title;
    private String description;
    private String taskFileUrl;
    private LocalDateTime deadline;
    private Integer submissionsCount;
    private Integer gradedCount;
    private Integer pendingCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
