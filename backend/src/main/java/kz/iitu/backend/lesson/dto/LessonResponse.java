package kz.iitu.backend.lesson.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import kz.iitu.backend.lesson.LessonStatus;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LessonResponse {

    private UUID id;
    private UUID courseId;
    private String courseName;
    private String title;
    private String description;

    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private String location;
    private String onlineMeetingUrl;
    private String recordingUrl;
    private LessonStatus status;

    private Integer materialsCount;
    private Boolean hasHomework;
    private Integer attendanceCount;
    private Integer totalStudents;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
