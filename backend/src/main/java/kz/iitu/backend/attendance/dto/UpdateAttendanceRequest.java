package kz.iitu.backend.attendance.dto;

import jakarta.validation.constraints.NotNull;
import kz.iitu.backend.attendance.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAttendanceRequest {

    @NotNull(message = "Status is required")
    private AttendanceStatus status;

    private String notes;
}
