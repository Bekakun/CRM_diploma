package kz.iitu.backend.attendance.dto;

import kz.iitu.backend.attendance.AttendanceStatus;
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
public class AttendanceResponse {

    private UUID id;
    private UUID lessonId;
    private UUID studentId;
    private AttendanceStatus status;
    private String notes;
    private LocalDateTime markedAt;
    private UUID markedBy;
}
