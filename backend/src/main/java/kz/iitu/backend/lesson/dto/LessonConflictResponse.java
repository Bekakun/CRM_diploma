package kz.iitu.backend.lesson.dto;

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
public class LessonConflictResponse {

    private UUID id;
    private String title;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
}
