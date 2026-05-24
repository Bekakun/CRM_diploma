package kz.iitu.backend.lesson.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import kz.iitu.backend.lesson.LessonStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLessonRequest {

    @Size(min = 3, max = 255, message = "Title must be between 3 and 255 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    private LocalDateTime scheduledAt;

    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;

    @Size(max = 255, message = "Location must not exceed 255 characters")
    private String location;

    @Size(max = 1000, message = "Online meeting URL must not exceed 1000 characters")
    private String onlineMeetingUrl;

    @Size(max = 1000, message = "Recording URL must not exceed 1000 characters")
    private String recordingUrl;

    private LessonStatus status;
}
