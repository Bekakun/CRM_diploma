package kz.iitu.backend.student.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
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
public class StudentResponse {

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
}
